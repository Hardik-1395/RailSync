const prisma = require('../config/prisma');
const { BadRequestError, ConflictError, NotFoundError } = require('../utils/error');

const GENDERS = new Set(['MALE', 'FEMALE', 'OTHER']);
const publicFields = {
     id: true,
     name: true,
     age: true,
     gender: true,
     createdAt: true,
     updatedAt: true,
};

function normalizePassenger(input) {
     const name = typeof input?.name === 'string' ? input.name.trim().replace(/\s+/g, ' ') : '';
     const age = Number(input?.age);
     const gender = typeof input?.gender === 'string' ? input.gender.trim().toUpperCase() : '';

     if (name.length < 2 || name.length > 100) {
          throw new BadRequestError('Passenger name must be between 2 and 100 characters');
     }
     if (!Number.isInteger(age) || age < 1 || age > 120) {
          throw new BadRequestError('Passenger age must be a whole number between 1 and 120');
     }
     if (!GENDERS.has(gender)) {
          throw new BadRequestError('Passenger gender must be MALE, FEMALE, or OTHER');
     }

     return { name, normalizedName: name.toLocaleLowerCase('en'), age, gender };
}

async function list(userId) {
     return prisma.savedPassenger.findMany({
          where: { userId },
          orderBy: [{ name: 'asc' }, { createdAt: 'asc' }],
          select: publicFields,
     });
}

async function create(userId, input) {
     const passenger = normalizePassenger(input);
     const duplicateWhere = {
          userId_normalizedName_age_gender: {
               userId,
               normalizedName: passenger.normalizedName,
               age: passenger.age,
               gender: passenger.gender,
          },
     };

     const duplicate = await prisma.savedPassenger.findUnique({ where: duplicateWhere, select: publicFields });
     if (duplicate) return { passenger: duplicate, created: false };

     try {
          const created = await prisma.savedPassenger.create({
               data: { ...passenger, userId },
               select: publicFields,
          });
          return { passenger: created, created: true };
     } catch (error) {
          // The composite unique key closes the race where two identical
          // profiles are submitted at nearly the same time.
          if (error.code === 'P2002') {
               const existing = await prisma.savedPassenger.findUnique({ where: duplicateWhere, select: publicFields });
               if (existing) return { passenger: existing, created: false };
          }
          throw error;
     }
}

async function update(userId, passengerId, input) {
     const data = normalizePassenger(input);
     const owned = await prisma.savedPassenger.findFirst({ where: { id: passengerId, userId }, select: { id: true } });
     if (!owned) throw new NotFoundError('Saved passenger not found');

     try {
          return await prisma.savedPassenger.update({
               where: { id: passengerId },
               data,
               select: publicFields,
          });
     } catch (error) {
          if (error.code === 'P2002') throw new ConflictError('A matching saved passenger already exists');
          throw error;
     }
}

async function remove(userId, passengerId) {
     const result = await prisma.savedPassenger.deleteMany({ where: { id: passengerId, userId } });
     if (result.count === 0) throw new NotFoundError('Saved passenger not found');
}

module.exports = { list, create, update, remove };
