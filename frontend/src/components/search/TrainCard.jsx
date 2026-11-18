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
    <article className="card hover:shadow-md transition-shadow">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-baseline gap-2 mb-2">
            <h3 className="text-lg font-bold text-primary-900">{train.trainName}</h3>
            <span className="text-sm text-gray-400">#{train.trainNumber}</span>
          </div>

          <div className="flex items-center gap-4 text-sm">
            <div>
              <p className="font-semibold text-lg">{train.from?.departure || '—'}</p>
              <p className="text-gray-500">{train.from?.name}</p>
            </div>
            <div className="flex-1 flex items-center px-2">
              <div className="h-px bg-gray-300 flex-1" />
              <span className="px-2 text-gray-400 text-xs">→</span>
              <div className="h-px bg-gray-300 flex-1" />
            </div>
            <div className="text-right">
              <p className="font-semibold text-lg">{train.to?.arrival || '—'}</p>
              <p className="text-gray-500">{train.to?.name}</p>
            </div>
          </div>

          {train.route?.length > 0 && (
            <details className="mt-4 text-sm">
              <summary className="w-fit cursor-pointer font-medium text-primary-800 hover:text-primary-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-700 rounded">
                View Full Route ({train.route.length} stations)
              </summary>
              <ol className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {train.route.map((stop) => (
                  <li key={`${stop.sequenceNumber}-${stop.code}`} className="rounded-lg bg-gray-50 px-3 py-2">
                    <span className="font-medium text-gray-800">{stop.name}</span>
                    <span className="ml-1 text-gray-400">({stop.code})</span>
                    {(stop.arrival || stop.departure) && (
                      <span className="block mt-1 text-xs text-gray-500">
                        {stop.arrival && `Arr ${stop.arrival}`}
                        {stop.arrival && stop.departure && ' · '}
                        {stop.departure && `Dep ${stop.departure}`}
                      </span>
                    )}
                  </li>
                ))}
              </ol>
            </details>
          )}
        </div>

        {!scheduleIsActive && (
          <span className="text-sm text-gray-400">
            {schedule?.status === 'CANCELLED' ? 'Cancelled' : 'No schedule available'}
          </span>
        )}
      </div>

      {scheduleIsActive && (
        <section
          className="mt-5 border-t border-gray-100 pt-4"
          aria-label={`Seat availability for ${train.trainName} from ${train.from?.name} to ${train.to?.name}`}
        >
          <h4 className="font-semibold text-gray-800 mb-3">Seat availability for this journey</h4>
          {availabilityLoading ? (
            <div className="flex items-center gap-2 py-3 text-sm text-gray-500" role="status">
              <Spinner size="sm" />
              Loading seat availability…
            </div>
          ) : availabilityError ? (
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 rounded-lg bg-red-50 border border-red-100 px-4 py-3">
              <p className="text-sm text-red-700 flex-1" role="alert">{availabilityError}</p>
              <Button type="button" variant="secondary" onClick={loadAvailability} loading={availabilityLoading} className="text-sm">
                Retry
              </Button>
            </div>
          ) : availability?.status !== 'ACTIVE' ? (
            <p className="text-sm text-gray-500 py-2">Availability is not available for this schedule.</p>
          ) : availability?.coachAvailability?.length ? (
            <div className="flex flex-wrap gap-2">
              {availability.coachAvailability.map((coach) => (
                <div
                  key={coach.seatType}
                  className={`flex min-w-28 flex-col items-center justify-center rounded-lg border-2 px-4 py-3 text-center ${coach.available > 0 ? 'border-green-400 bg-green-100 text-green-900' : 'border-gray-300 bg-gray-100 text-gray-500'}`}
                  aria-label={`${formatSeatType(coach.seatType)}: ${coach.available} of ${coach.total} available`}
                >
                  <span className="text-xs text-gray-600">{formatSeatType(coach.seatType)}</span>
                  <strong className="text-sm">AVL {coach.available}/{coach.total}</strong>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500 py-2">No seat availability details are available for this schedule.</p>
          )}
          {availability?.status === 'ACTIVE' && availability?.coachAvailability?.length > 0 && (
            <div className="mt-3">
              {availability.available === 0 ? (
                <p className="text-sm text-amber-700" role="status">No seats are currently available for this journey.</p>
              ) : (
                <Button type="button" onClick={handleProceedToBooking} className="w-full sm:w-auto mt-2">
                  {isAuthenticated ? 'Select Seats & Continue' : 'Log In to Book'}
                </Button>
              )}
            </div>
          )}
        </section>
      )}
    </article>
  );
}
