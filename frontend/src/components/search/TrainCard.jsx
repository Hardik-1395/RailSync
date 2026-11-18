import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { inventoryApi } from '../../api/inventory.api';
import { useBookingStore } from '../../store/booking.store';
import { useAuthStore } from '../../store/auth.store';
import { formatSeatType } from '../../utils/format';
import Button from '../ui/Button';
import Spinner from '../ui/Spinner';

export default function TrainCard({ train }) {
  const navigate = useNavigate();
  const setSelectedTrain = useBookingStore((s) => s.setSelectedTrain);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const [availability, setAvailability] = useState(null);
  const [availabilityError, setAvailabilityError] = useState('');
  const [availabilityLoading, setAvailabilityLoading] = useState(train.schedule?.status === 'ACTIVE');
  const requestInFlight = useRef(false);
  const mounted = useRef(false);

  const schedule = train.schedule;
  const scheduleIsActive = schedule?.status === 'ACTIVE';
  const fromSeq = Number(train.from?.sequenceNumber);
  const toSeq = Number(train.to?.sequenceNumber);

  const loadAvailability = async () => {
    if (!schedule?.scheduleId || requestInFlight.current) return;
    if (!Number.isInteger(fromSeq) || !Number.isInteger(toSeq)) {
      setAvailabilityError('Route details are missing. Search for this train again to view journey availability.');
      return;
    }

    requestInFlight.current = true;
    setAvailabilityLoading(true);
    setAvailabilityError('');
    try {
      const response = await inventoryApi.getAvailability(schedule.scheduleId, { fromSeq, toSeq });
      const data = response.data || response;
      if (mounted.current) setAvailability(data);
    } catch (err) {
      if (mounted.current) setAvailabilityError(err.message || 'Could not load seat availability. Please try again.');
    } finally {
      requestInFlight.current = false;
      if (mounted.current) setAvailabilityLoading(false);
    }
  };

  useEffect(() => {
    mounted.current = true;
    if (scheduleIsActive) loadAvailability();
    return () => { mounted.current = false; };
  }, [schedule?.scheduleId, scheduleIsActive, fromSeq, toSeq]);

  const handleProceedToBooking = () => {
    setSelectedTrain(train, schedule.scheduleId);
    const seatSelectionPath = `/seats/${schedule.scheduleId}`;
    if (!isAuthenticated) {
      navigate(`/login?redirect=${encodeURIComponent(seatSelectionPath)}`);
      return;
    }
    navigate(seatSelectionPath);
  };

  return (
    <article className="rounded-2xl border border-slate-300 bg-gradient-to-r from-rose-50/80 via-slate-50 to-sky-100 shadow-sm transition-shadow hover:shadow-md">
      <div className="grid gap-5 p-5 lg:grid-cols-[minmax(220px,0.95fr)_minmax(0,2fr)_210px] lg:gap-6 lg:p-6">
        <div className="border-b border-slate-300 pb-4 lg:border-b-0 lg:border-r lg:pb-0 lg:pr-5">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="font-semibold text-slate-800">{train.trainNumber}</span>
            <span className="hidden h-5 w-px bg-slate-300 sm:inline-block" aria-hidden="true" />
            {train.route?.length > 0 && (
              <details className="group relative">
                <summary className="cursor-pointer list-none font-medium text-blue-700 hover:text-blue-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">
                  <span className="inline-flex items-center gap-1.5">
                    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4"><path d="M12 21s7-5.9 7-11a7 7 0 1 0-14 0c0 5.1 7 11 7 11Z" /><circle cx="12" cy="10" r="2.2" /></svg>
                    Train Schedule
                  </span>
                </summary>
                <div className="absolute left-0 top-7 z-20 w-[min(460px,calc(100vw-3rem))] rounded-xl border border-slate-200 bg-white p-3 shadow-xl">
                  <ol className="grid max-h-64 grid-cols-1 gap-2 overflow-y-auto sm:grid-cols-2">
                    {train.route.map((stop) => (
                      <li key={`${stop.sequenceNumber}-${stop.code}`} className="rounded-lg bg-slate-50 px-3 py-2 text-sm">
                        <span className="font-medium text-slate-800">{stop.name}</span>
                        <span className="ml-1 text-slate-400">({stop.code})</span>
                        {(stop.arrival || stop.departure) && <span className="mt-1 block text-xs text-slate-500">{stop.arrival && `Arr ${stop.arrival}`}{stop.arrival && stop.departure && ' · '}{stop.departure && `Dep ${stop.departure}`}</span>}
                      </li>
                    ))}
                  </ol>
                </div>
              </details>
            )}
          </div>
          <h2 className="mt-3 text-base font-bold uppercase tracking-wide text-slate-900 sm:text-lg">{train.trainName}</h2>
          <p className="mt-1 text-sm text-slate-500">Train {train.trainNumber}</p>
        </div>

        <div className="flex min-w-0 items-center justify-between gap-3 sm:gap-5">
          <div className="min-w-[100px]">
            <p className="text-xl font-bold text-slate-900">{train.from?.departure || '—'}</p>
            <p className="mt-1 text-sm font-semibold text-slate-700">{train.from?.name || 'Origin'}</p>
            <p className="text-xs text-slate-500">{train.from?.code}</p>
            {schedule?.departureDate && <p className="mt-1 text-xs text-slate-500">{new Date(`${String(schedule.departureDate).slice(0, 10)}T00:00:00`).toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short' })}</p>}
          </div>
          <div className="flex min-w-8 flex-1 items-center px-1" aria-hidden="true">
            <span className="h-2 w-2 rounded-full bg-blue-700" />
            <span className="h-px flex-1 bg-blue-700" />
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4 shrink-0 text-blue-700"><path d="M4 12h15m-5-5 5 5-5 5" /></svg>
            <span className="h-px flex-1 bg-blue-700" />
            <span className="h-2 w-2 rounded-full bg-blue-700" />
          </div>
          <div className="min-w-[100px] text-right">
            <p className="text-xl font-bold text-slate-900">{train.to?.arrival || '—'}</p>
            <p className="mt-1 text-sm font-semibold text-slate-700">{train.to?.name || 'Destination'}</p>
            <p className="text-xs text-slate-500">{train.to?.code}</p>
          </div>
        </div>

        <div className="flex flex-col justify-center border-t border-slate-300 pt-4 lg:border-l lg:border-t-0 lg:pl-5 lg:pt-0">
          {scheduleIsActive ? (
            <>
              <p className="mb-2 text-center text-xs font-medium uppercase tracking-wide text-slate-500">Journey seats</p>
              {availabilityLoading ? (
                <div className="flex items-center justify-center gap-2 py-2 text-sm text-slate-500" role="status"><Spinner size="sm" />Loading…</div>
              ) : availabilityError ? (
                <div className="text-center">
                  <p className="mb-2 text-xs text-red-700" role="alert">{availabilityError}</p>
                  <Button type="button" variant="secondary" onClick={loadAvailability} loading={availabilityLoading} className="w-full text-sm">Retry</Button>
                </div>
              ) : availability?.status === 'ACTIVE' ? (
                <>
                  <p className="text-center text-sm font-semibold text-slate-800">
                    <span className="text-emerald-700">{availability.available ?? 0} available</span>
                    <span className="text-slate-500"> / {availability.total ?? 0}</span>
                  </p>
                  <Button type="button" onClick={handleProceedToBooking} disabled={availability.available === 0} className="mt-2 w-full rounded-full bg-blue-700 text-sm hover:bg-blue-800">
                    {availability.available === 0 ? 'Sold Out' : isAuthenticated ? 'Select Seats' : 'Log In to Book'}
                  </Button>
                </>
              ) : <p className="text-center text-sm text-slate-500">Availability unavailable</p>}
            </>
          ) : (
            <p className="text-center text-sm font-medium text-slate-500">{schedule?.status === 'CANCELLED' ? 'Schedule cancelled' : 'No schedule available'}</p>
          )}
        </div>
      </div>

      {scheduleIsActive && (
        <section className="border-t border-slate-200/80 bg-white/55 px-5 py-4 sm:px-6" aria-label={`Seat availability for ${train.trainName} from ${train.from?.name} to ${train.to?.name}`}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-sm font-semibold text-slate-800">Seat availability for this journey</h3>
            {availability?.coachAvailability?.length > 0 && <p className="text-xs text-slate-500">Select a seat type to continue with booking</p>}
          </div>
          {availabilityLoading ? (
            <div className="flex items-center gap-2 py-3 text-sm text-slate-500" role="status"><Spinner size="sm" />Loading seat availability…</div>
          ) : availabilityError ? (
            <p className="mt-2 text-sm text-red-700" role="alert">Availability could not be loaded. Use Retry above.</p>
          ) : availability?.status !== 'ACTIVE' ? (
            <p className="py-2 text-sm text-slate-500">Availability is not available for this schedule.</p>
          ) : availability?.coachAvailability?.length ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {availability.coachAvailability.map((coach) => (
                <div key={coach.seatType} className={`flex min-w-[110px] flex-col items-center justify-center rounded-lg border px-3 py-2 text-center ${coach.available > 0 ? 'border-emerald-400 bg-emerald-100 text-emerald-900' : 'border-slate-300 bg-slate-100 text-slate-500'}`} aria-label={`${formatSeatType(coach.seatType)}: ${coach.available} of ${coach.total} available`}>
                  <span className="text-xs">{formatSeatType(coach.seatType)}</span>
                  <strong className="text-sm">AVL {coach.available}/{coach.total}</strong>
                </div>
              ))}
            </div>
          ) : <p className="py-2 text-sm text-slate-500">No seat availability details are available for this schedule.</p>}
        </section>
      )}
    </article>
  );
}
