const prisma = require('../config/prisma');
const logger = require('../config/logger');
const inventoryProducer = require('../kafka/producer/inventory.producer');
const { retryTransaction } = require('../utils/retryTransaction');
const { withIdempotency, recordIdempotency } = require('../utils/idempotency');
const { BadRequestError, NotFoundError, ConflictError, ForbiddenError } = require('../utils/error');
const { config } = require('../config');

// ── helpers ────────────────────────────────────────────────────────────────

const publish = async (scheduleId, trainId, counts, label) => {
  try {
    await inventoryProducer.publishSeatAvailabilityUpdated(
      scheduleId, trainId, counts.available, counts.locked, counts.booked
    );
  } catch (err) {
    logger.error(`Failed to publish availability ${label}`, { scheduleId, error: err.message });
  }
};

const isDupEvent = async (eventKey) => {
  const existing = await prisma.idempotencyRecord.findUnique({ where: { eventKey } });
  if (existing) logger.info(`Duplicate event skipped: ${eventKey}`);
  return !!existing;
};

// Wraps: idempotency claim → txn retry → txn → record idempotency
const runTxn = (idempotencyKey, fn) =>
  withIdempotency(idempotencyKey, (eventKey) => retryTransaction(() =>
    prisma.$transaction(async (tx) => {
      const out = await fn(tx, eventKey);
      await recordIdempotency(tx, eventKey, out);
      return out;
    }, { timeout: 10000 })
  ));

const lockSeatRows = (tx, scheduleId, seatIds) => tx.$queryRaw`
  SELECT id, "seatId", "seatNumber", status, "lockedBy"
  FROM seat_inventories
  WHERE "scheduleId" = ${scheduleId} AND "seatId" = ANY(${seatIds}::text[])
  FOR UPDATE NOWAIT`;

const assertAllSeatsFound = (seats, seatIds) => {
  if (seats.length === seatIds.length) return;
  const found = new Set(seats.map(s => s.seatId));
  throw new NotFoundError(`Seats not found: ${seatIds.filter(id => !found.has(id)).join(', ')}`);
};

const findOverlappingLocks = (tx, scheduleId, seatIds, fromSeq, toSeq) => tx.$queryRaw`
  SELECT "seatId" FROM seat_segment_locks
  WHERE "scheduleId" = ${scheduleId} AND "seatId" = ANY(${seatIds}::text[])
    AND status IN ('LOCKED','BOOKED')
    AND "fromSeq" < ${toSeq} AND "toSeq" > ${fromSeq}
  FOR UPDATE NOWAIT`;

const recountInTx = async (tx, scheduleId) => {
  const [{ available, locked, booked }] = await tx.$queryRaw`
    SELECT COUNT(*) FILTER (WHERE status='AVAILABLE')::int AS available,
           COUNT(*) FILTER (WHERE status='LOCKED')::int    AS locked,
           COUNT(*) FILTER (WHERE status='BOOKED')::int    AS booked
    FROM seat_inventories WHERE "scheduleId" = ${scheduleId}`;
  await tx.$executeRaw`
    UPDATE schedule_inventories
    SET available=${available}, locked=${locked}, booked=${booked},
        version=version+1, "updatedAt"=NOW()
    WHERE "scheduleId" = ${scheduleId}`;
  return { available, locked, booked };
};

// ── Kafka handlers ─────────────────────────────────────────────────────────

const initializeInventory = async (eventData) => {
  const { scheduleId, trainId, trainNumber, trainName, departureDate, seats } = eventData;
  if (!scheduleId || !seats?.length)
    return logger.warn('Invalid SCHEDULE_CREATED event — missing scheduleId or seats');

  const eventKey = `SCHEDULE_CREATED:${scheduleId}`;
  if (await isDupEvent(eventKey)) return;

  const totalSeats = seats.length;
  await prisma.$transaction(async (tx) => {
    const schedule = await tx.scheduleInventory.create({
      data: { scheduleId, trainId, trainNumber, trainName,
        departureDate: new Date(departureDate),
        totalSeats, available: totalSeats, locked: 0, booked: 0, status: 'ACTIVE' }
    });
    await tx.seatInventory.createMany({
      data: seats.map(s => ({
        scheduleInventoryId: schedule.id, scheduleId,
        seatId: s.seatId, seatNumber: s.seatNumber, seatType: s.seatType,
        price: s.price, status: 'AVAILABLE'
      }))
    });
    if (eventData.route?.length) {
      await tx.routeStop.createMany({
        data: eventData.route.map(rs => ({
          scheduleId, stationId: rs.stationId, stationName: rs.stationName,
          stationCode: rs.stationCode, sequenceNumber: rs.sequenceNumber
        }))
      });
      logger.info(`Persisted ${eventData.route.length} route stops for ${scheduleId}`);
    }
    await tx.idempotencyRecord.create({ data: { eventKey } });
  });
  logger.info(`Inventory initialized for ${scheduleId} with ${totalSeats} seats`);

  await publish(scheduleId, trainId, { available: totalSeats, locked: 0, booked: 0 }, 'after init');
};

const cancelScheduleInventory = async (eventData) => {
  const data = eventData.data || eventData;
  const scheduleId = data.scheduleId || data.id;
  if (!scheduleId)
    return logger.warn('Invalid SCHEDULE_CANCELLED event — missing scheduleId');

  const eventKey = `SCHEDULE_CANCELLED:${scheduleId}`;
  if (await isDupEvent(eventKey)) return;

  const schedule = await prisma.scheduleInventory.findUnique({ where: { scheduleId } });
  if (!schedule)
    return logger.warn(`Schedule ${scheduleId} not found in inventory — skipping cancellation`);

  await prisma.$transaction(async (tx) => {
    await tx.scheduleInventory.update({
      where: { scheduleId },
      data: { status: 'CANCELLED', available: 0, locked: 0, booked: 0, version: { increment: 1 } }
    });
    await tx.seatInventory.updateMany({ where: { scheduleId }, data: { status: 'CANCELLED' } });
    await tx.idempotencyRecord.create({ data: { eventKey } });
  });
  logger.info(`Inventory cancelled for ${scheduleId}`);

  await publish(scheduleId, schedule.trainId, { available: 0, locked: 0, booked: 0 }, 'after cancel');
};

// ── Segment helper ─────────────────────────────────────────────────────────

async function recomputeSegmentSeatStatuses(tx, scheduleId, seatIds) {
  for (const seatId of seatIds) {
    const locks = await tx.seatSegmentLock.findMany({
      where: { scheduleId, seatId, status: { in: ['LOCKED', 'BOOKED'] } },
      select: { status: true }
    });
    const newStatus = locks.length === 0 ? 'AVAILABLE'
      : locks.some(l => l.status === 'LOCKED') ? 'LOCKED' : 'BOOKED';

    const [cur] = await tx.$queryRaw`
      SELECT status FROM seat_inventories
      WHERE "scheduleId" = ${scheduleId} AND "seatId" = ${seatId}
      FOR UPDATE NOWAIT`;
    if (cur?.status === newStatus) continue;

    if (newStatus === 'AVAILABLE') {
      await tx.$executeRaw`
        UPDATE seat_inventories
        SET status='AVAILABLE', "lockedBy"=NULL, "lockedAt"=NULL,
            "lockExpiresAt"=NULL, "bookingId"=NULL,
            version=version+1, "updatedAt"=NOW()
        WHERE "scheduleId" = ${scheduleId} AND "seatId" = ${seatId}`;
    } else {
      await tx.$executeRaw`
        UPDATE seat_inventories
        SET status=${newStatus}::"SeatStatus",
            version=version+1, "updatedAt"=NOW()
        WHERE "scheduleId" = ${scheduleId} AND "seatId" = ${seatId}`;
    }
  }
}

// ── Read APIs ──────────────────────────────────────────────────────────────

const getAvailability = async (scheduleId) => {
  const schedule = await prisma.scheduleInventory.findUnique({ where: { scheduleId } });
  if (!schedule) throw new NotFoundError('Schedule not found in inventory');
  return {
    scheduleId: schedule.scheduleId, trainId: schedule.trainId,
    trainNumber: schedule.trainNumber, trainName: schedule.trainName,
    departureDate: schedule.departureDate, status: schedule.status,
    totalSeats: schedule.totalSeats,
    available: schedule.available, locked: schedule.locked, booked: schedule.booked
  };
};

const getSeats = async (scheduleId, filters = {}) => {
  const schedule = await prisma.scheduleInventory.findUnique({ where: { scheduleId } });
  if (!schedule) throw new NotFoundError('Schedule not found in inventory');

  const where = { scheduleId };
  if (filters.status)   where.status = filters.status;
  if (filters.seatType) where.seatType = filters.seatType;

  let seats = await prisma.seatInventory.findMany({
    where, orderBy: { seatNumber: 'asc' },
    select: {
      seatId: true, seatNumber: true, seatType: true, price: true, status: true,
      lockedBy: true, lockExpiresAt: true, bookingId: true
    }
  });

  if (filters.fromSeq && filters.toSeq) {
    const fromSeq = parseInt(filters.fromSeq);
    const toSeq   = parseInt(filters.toSeq);

    const overlapping = await prisma.seatSegmentLock.findMany({
      where: {
        scheduleId, status: { in: ['LOCKED', 'BOOKED'] },
        fromSeq: { lt: toSeq }, toSeq: { gt: fromSeq }
      },
      select: { seatId: true }
    });
    const blocked = new Set(overlapping.map(l => l.seatId));

    const withAnyLock = await prisma.seatSegmentLock.findMany({
      where: { scheduleId, status: { in: ['LOCKED', 'BOOKED'] } },
      select: { seatId: true }, distinct: ['seatId']
    });
    const hasLock = new Set(withAnyLock.map(l => l.seatId));

    seats = seats.map(seat => ({
      ...seat,
      segmentStatus: (
        blocked.has(seat.seatId) ||
        (['BOOKED', 'LOCKED'].includes(seat.status) && !hasLock.has(seat.seatId))
      ) ? 'UNAVAILABLE' : 'AVAILABLE'
    }));
  }

  return { scheduleId, totalSeats: schedule.totalSeats, seats };
};

// ── Seat mutations ─────────────────────────────────────────────────────────

const lockSeats = async (scheduleId, seatIds, userId, ttlSeconds, fromSeq, toSeq, idempotencyKey) => {
  const ttl = Math.min(Math.max(ttlSeconds || config.LOCK_TTL_SECONDS, 60), 600);
  const lockExpiresAt = new Date(Date.now() + ttl * 1000);

  const result = await runTxn(idempotencyKey, async (tx) => {
    const schedule = await tx.scheduleInventory.findUnique({ where: { scheduleId } });
    if (!schedule) throw new NotFoundError('Schedule not found in inventory');
    if (schedule.status !== 'ACTIVE') throw new BadRequestError('Schedule is not active');

    const seats = await lockSeatRows(tx, scheduleId, seatIds);
    assertAllSeatsFound(seats, seatIds);

    // ── Segment path ──
    if (fromSeq && toSeq) {
      const overlap = await findOverlappingLocks(tx, scheduleId, seatIds, fromSeq, toSeq);
      if (overlap.length > 0) {
        const blockedIds = [...new Set(overlap.map(r => r.seatId))];
        throw new ConflictError(
          `Seats already locked/booked for overlapping segment: ${blockedIds.join(', ')}`,
          'SEATS_UNAVAILABLE'
        );
      }
      for (const seat of seats) {
        await tx.seatSegmentLock.create({
          data: {
            scheduleId, seatId: seat.seatId, fromSeq, toSeq,
            status: 'LOCKED', lockedBy: userId,
            lockedAt: new Date(), lockExpiresAt
          }
        });
      }
      await tx.$executeRaw`
        UPDATE seat_inventories
        SET "lockedBy"       = COALESCE("lockedBy", ${userId}),
            "lockedAt"       = COALESCE("lockedAt", NOW()),
            "lockExpiresAt"  = ${lockExpiresAt}::timestamp,
            "updatedAt"      = NOW()
        WHERE id = ANY(${seats.map(s => s.id)}::text[])`;

      await recomputeSegmentSeatStatuses(tx, scheduleId, seats.map(s => s.seatId));
      const counts = await recountInTx(tx, scheduleId);

      return {
        scheduleId, trainId: schedule.trainId,
        lockedSeats: seats.map(s => ({ seatId: s.seatId, seatNumber: s.seatNumber, lockExpiresAt })),
        lockExpiresAt, counts
      };
    }

    // ── Full-journey path ──
    const unavailable = seats.filter(s => s.status !== 'AVAILABLE');
    if (unavailable.length > 0) {
      throw new ConflictError(
        `Seats not available: ${unavailable.map(s => `seat #${s.seatNumber} is ${s.status}`).join(', ')}`,
        'SEATS_UNAVAILABLE'
      );
    }
    await tx.$executeRaw`
      UPDATE seat_inventories
      SET status='LOCKED', "lockedBy"=${userId},
          "lockedAt"=NOW(), "lockExpiresAt"=${lockExpiresAt}::timestamp,
          version=version+1, "updatedAt"=NOW()
      WHERE id = ANY(${seats.map(s => s.id)}::text[])`;

    await tx.$executeRaw`
      UPDATE schedule_inventories
      SET available = available - ${seats.length},
          locked    = locked    + ${seats.length},
          version   = version + 1, "updatedAt"=NOW()
      WHERE "scheduleId" = ${scheduleId}`;

    return {
      scheduleId, trainId: schedule.trainId,
      lockedSeats: seats.map(s => ({ seatId: s.seatId, seatNumber: s.seatNumber, lockExpiresAt })),
      lockExpiresAt,
      counts: {
        available: schedule.available - seats.length,
        locked:    schedule.locked    + seats.length,
        booked:    schedule.booked
      }
    };
  });

  await publish(result.scheduleId, result.trainId, result.counts, 'after lock');
  return result;
};

const unlockSeats = async (scheduleId, seatIds, userId, fromSeq, toSeq, idempotencyKey) => {
  const result = await runTxn(idempotencyKey, async (tx) => {
    const seats = await lockSeatRows(tx, scheduleId, seatIds);
    assertAllSeatsFound(seats, seatIds);

    // ── Segment path ──
    if (fromSeq && toSeq) {
      await tx.$executeRaw`
        DELETE FROM seat_segment_locks
        WHERE "scheduleId" = ${scheduleId}
          AND "seatId"   = ANY(${seatIds}::text[])
          AND "lockedBy" = ${userId}
          AND "fromSeq"  = ${fromSeq}
          AND "toSeq"    = ${toSeq}
          AND status     = 'LOCKED'`;

      await recomputeSegmentSeatStatuses(tx, scheduleId, seats.map(s => s.seatId));
      const counts = await recountInTx(tx, scheduleId);
      const schedule = await tx.scheduleInventory.findUnique({ where: { scheduleId } });

      return { scheduleId, trainId: schedule.trainId, unlockedSeats: seats.map(s => s.seatId), counts };
    }

    // ── Full-journey path ──
    const notLocked = seats.filter(s => s.status !== 'LOCKED');
    if (notLocked.length > 0) {
      throw new ConflictError(
        `Seats not in LOCKED status: ${notLocked.map(s => `seat #${s.seatNumber} is ${s.status}`).join(', ')}`
      );
    }
    const notOwned = seats.filter(s => s.lockedBy !== userId);
    if (notOwned.length > 0) throw new ForbiddenError('Some seats are not locked by you');

    await tx.$executeRaw`
      UPDATE seat_inventories
      SET status='AVAILABLE', "lockedBy"=NULL, "lockedAt"=NULL, "lockExpiresAt"=NULL,
          version=version+1, "updatedAt"=NOW()
      WHERE id = ANY(${seats.map(s => s.id)}::text[])`;

    const schedule = await tx.scheduleInventory.findUnique({ where: { scheduleId } });
    await tx.$executeRaw`
      UPDATE schedule_inventories
      SET available = available + ${seats.length},
          locked    = locked    - ${seats.length},
          version   = version + 1, "updatedAt"=NOW()
      WHERE "scheduleId" = ${scheduleId}`;

    return {
      scheduleId, trainId: schedule.trainId,
      unlockedSeats: seats.map(s => s.seatId),
      counts: {
        available: schedule.available + seats.length,
        locked:    schedule.locked    - seats.length,
        booked:    schedule.booked
      }
    };
  });

  await publish(result.scheduleId, result.trainId, result.counts, 'after unlock');
  return result;
};

const confirmSeats = async (scheduleId, seatIds, userId, bookingId, fromSeq, toSeq, idempotencyKey) => {
  const result = await runTxn(idempotencyKey, async (tx) => {
    const seats = await lockSeatRows(tx, scheduleId, seatIds);
    assertAllSeatsFound(seats, seatIds);

    // ── Segment path ──
    if (fromSeq && toSeq) {
      const updated = await tx.$executeRaw`
        UPDATE seat_segment_locks
        SET status='BOOKED', "bookingId"=${bookingId},
            "lockExpiresAt"=NULL, version=version+1, "updatedAt"=NOW()
        WHERE "scheduleId" = ${scheduleId}
          AND "seatId"   = ANY(${seatIds}::text[])
          AND "lockedBy" = ${userId}
          AND "fromSeq"  = ${fromSeq}
          AND "toSeq"    = ${toSeq}
          AND status     = 'LOCKED'`;
      if (updated === 0) {
        throw new ConflictError(
          'Segment lock expired or not found. Please lock seats again.',
          'LOCK_EXPIRED'
        );
      }
      await recomputeSegmentSeatStatuses(tx, scheduleId, seats.map(s => s.seatId));
      const counts = await recountInTx(tx, scheduleId);
      const schedule = await tx.scheduleInventory.findUnique({ where: { scheduleId } });

      return {
        scheduleId, trainId: schedule.trainId, bookingId,
        confirmedSeats: seats.map(s => ({ seatId: s.seatId, seatNumber: s.seatNumber, status: 'BOOKED' })),
        counts
      };
    }

    // ── Full-journey path ──
    const notLocked = seats.filter(s => s.status !== 'LOCKED');
    if (notLocked.length > 0) {
      throw new ConflictError(
        'Lock expired or seats not in LOCKED status. Please lock seats again.',
        'LOCK_EXPIRED'
      );
    }
    const notOwned = seats.filter(s => s.lockedBy !== userId);
    if (notOwned.length > 0) throw new ForbiddenError('Some seats are not locked by you');

    await tx.$executeRaw`
      UPDATE seat_inventories
      SET status='BOOKED', "bookingId"=${bookingId}, "lockExpiresAt"=NULL,
          version=version+1, "updatedAt"=NOW()
      WHERE id = ANY(${seats.map(s => s.id)}::text[])`;

    const schedule = await tx.scheduleInventory.findUnique({ where: { scheduleId } });
    await tx.$executeRaw`
      UPDATE schedule_inventories
      SET locked = locked - ${seats.length},
          booked = booked + ${seats.length},
          version=version+1, "updatedAt"=NOW()
      WHERE "scheduleId" = ${scheduleId}`;

    return {
      scheduleId, trainId: schedule.trainId, bookingId,
      confirmedSeats: seats.map(s => ({ seatId: s.seatId, seatNumber: s.seatNumber, status: 'BOOKED' })),
      counts: {
        available: schedule.available,
        locked:    schedule.locked - seats.length,
        booked:    schedule.booked + seats.length
      }
    };
  });

  await publish(result.scheduleId, result.trainId, result.counts, 'after confirm');
  return result;
};

const cancelBooking = async (scheduleId, bookingId, userId, idempotencyKey) => {
  const result = await runTxn(idempotencyKey, async (tx) => {
    // ── Segment path first (bookingId lives on segment locks, not seat rows) ──
    const segLocks = await tx.seatSegmentLock.findMany({
      where: { scheduleId, bookingId, status: 'BOOKED' }
    });
    if (segLocks.length > 0) {
      await tx.$executeRaw`
        DELETE FROM seat_segment_locks
        WHERE "scheduleId" = ${scheduleId} AND "bookingId" = ${bookingId}`;

      const affectedSeatIds = [...new Set(segLocks.map(l => l.seatId))];
      await recomputeSegmentSeatStatuses(tx, scheduleId, affectedSeatIds);
      const counts = await recountInTx(tx, scheduleId);
      const schedule = await tx.scheduleInventory.findUnique({ where: { scheduleId } });

      return {
        scheduleId, trainId: schedule.trainId, bookingId,
        releasedSeats: affectedSeatIds, counts
      };
    }

    // ── Full-journey path ──
    const seats = await tx.$queryRaw`
      SELECT id, "seatId", "seatNumber", status, "lockedBy"
      FROM seat_inventories
      WHERE "scheduleId" = ${scheduleId}
        AND "bookingId" = ${bookingId}
        AND status      = 'BOOKED'
      FOR UPDATE NOWAIT`;
    if (seats.length === 0) throw new NotFoundError('No booked seats found for this booking');

    await tx.$executeRaw`
      UPDATE seat_inventories
      SET status='AVAILABLE', "lockedBy"=NULL, "lockedAt"=NULL,
          "lockExpiresAt"=NULL, "bookingId"=NULL,
          version=version+1, "updatedAt"=NOW()
      WHERE id = ANY(${seats.map(s => s.id)}::text[])`;

    const schedule = await tx.scheduleInventory.findUnique({ where: { scheduleId } });
    await tx.$executeRaw`
      UPDATE schedule_inventories
      SET available = available + ${seats.length},
          booked    = booked    - ${seats.length},
          version   = version + 1, "updatedAt"=NOW()
      WHERE "scheduleId" = ${scheduleId}`;

    return {
      scheduleId, trainId: schedule.trainId, bookingId,
      releasedSeats: seats.map(s => s.seatId),
      counts: {
        available: schedule.available + seats.length,
        locked:    schedule.locked,
        booked:    schedule.booked - seats.length
      }
    };
  });

  await publish(result.scheduleId, result.trainId, result.counts, 'after cancel-booking');
  return result;
};

// ── Lock expiry helper ─────────────────────────────────────────────────────

const recountAndPublish = async (scheduleId) => {
  const [{ available, locked, booked }] = await prisma.$queryRaw`
    SELECT COUNT(*) FILTER (WHERE status='AVAILABLE')::int AS available,
           COUNT(*) FILTER (WHERE status='LOCKED')::int    AS locked,
           COUNT(*) FILTER (WHERE status='BOOKED')::int    AS booked
    FROM seat_inventories WHERE "scheduleId" = ${scheduleId}`;

  const schedule = await prisma.scheduleInventory.update({
    where: { scheduleId },
    data: { available, locked, booked, version: { increment: 1 } }
  });
  await publish(scheduleId, schedule.trainId, { available, locked, booked }, 'after recount');
  return { available, locked, booked };
};

module.exports = {
  initializeInventory, cancelScheduleInventory,
  getAvailability, getSeats,
  lockSeats, unlockSeats, confirmSeats, cancelBooking,
  recountAndPublish, recomputeSegmentSeatStatuses
};