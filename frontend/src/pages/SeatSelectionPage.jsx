import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { inventoryApi } from '../api/inventory.api';
import { useBookingStore } from '../store/booking.store';
import { useToast } from '../components/ui/Toast';
import AvailabilitySummary from '../components/seats/AvailabilitySummary';
import SeatFilters from '../components/seats/SeatFilters';
import SeatGrid from '../components/seats/SeatGrid';
import SeatLegend from '../components/seats/SeatLegend';
import SelectionSummary from '../components/seats/SelectionSummary';
import Spinner from '../components/ui/Spinner';
import Button from '../components/ui/Button';
import { MAX_SEATS_PER_BOOKING } from '../utils/constants';

export default function SeatSelectionPage() {
  const { scheduleId } = useParams();
  const navigate = useNavigate();
  const showToast = useToast();
  const selectedTrain = useBookingStore((s) => s.selectedTrain);
  const selectedSeats = useBookingStore((s) => s.selectedSeats);
  const toggleSeat = useBookingStore((s) => s.toggleSeat);
  const setSelectedTrain = useBookingStore((s) => s.setSelectedTrain);
  const fromStation = useBookingStore((s) => s.fromStation);  // --- SEGMENT BOOKING
  const toStation = useBookingStore((s) => s.toStation);      // --- SEGMENT BOOKING

  const [availability, setAvailability] = useState(null);
  const [seats, setSeats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState(null);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        // --- SEGMENT BOOKING: Pass segment params to getSeats for segment-aware availability ---
        const seatParams = {};
        if (fromStation?.sequenceNumber && toStation?.sequenceNumber) {
          seatParams.fromSeq = fromStation.sequenceNumber;
          seatParams.toSeq = toStation.sequenceNumber;
        }

        const [availRes, seatsRes] = await Promise.all([
          inventoryApi.getAvailability(scheduleId),
          inventoryApi.getSeats(scheduleId, seatParams),
        ]);
        const rawAvail = availRes.data || availRes;
        const seatList = (seatsRes.data?.seats || seatsRes.seats || []).sort((a, b) => a.seatNumber - b.seatNumber);
        setSeats(seatList);

        // --- SEGMENT BOOKING: Recompute availability counts from segment-aware seat data ---
        if (seatParams.fromSeq && seatParams.toSeq && seatList.some(s => s.segmentStatus)) {
          const segAvail = seatList.filter(s => s.segmentStatus === 'AVAILABLE').length;
          const segUnavail = seatList.filter(s => s.segmentStatus === 'UNAVAILABLE').length;
          setAvailability({
            ...rawAvail,
            available: segAvail,
            booked: segUnavail,
            locked: 0,
          });
        } else {
          setAvailability(rawAvail);
        }

        // If no selectedTrain in store, set from availability data
        if (!selectedTrain) {
          const avail = availRes.data || availRes;
          setSelectedTrain({
            trainName: avail.trainName,
            trainNumber: avail.trainNumber,
            trainId: avail.trainId,
          }, scheduleId);
        }
      } catch (err) {
        showToast(err.message || 'Failed to load seats', 'error');
        navigate('/search');
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [scheduleId]);

  const handleToggleSeat = (seat) => {
    const result = toggleSeat(seat);
    if (result === false) {
      showToast(`Maximum ${MAX_SEATS_PER_BOOKING} seats can be selected`, 'warning');
    }
  };

  const filteredSeats = filter ? seats.filter((s) => s.seatType === filter) : seats;

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-full bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 px-4 py-6 pb-28 sm:py-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-700">Booking step 1 of 2</p>
            <h1 className="mt-1 text-2xl font-bold text-slate-900 sm:text-3xl">Choose your seats</h1>
            <p className="mt-1 text-sm text-slate-600">Select available seats for your journey.</p>
          </div>
          <Button type="button" variant="secondary" onClick={() => navigate('/search')} className="rounded-full border-slate-300 bg-white px-4">
            Back to trains
          </Button>
        </div>

        <AvailabilitySummary availability={availability} train={selectedTrain} />

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
          <div className="mb-5 flex flex-col gap-3 border-b border-slate-100 pb-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Select seats</h2>
              <p className="mt-1 text-sm text-slate-500">Tap a green seat to add it to your booking.</p>
            </div>
            <SeatLegend />
          </div>

          <SeatFilters activeFilter={filter} onChange={setFilter} />
          <SeatGrid seats={filteredSeats} selectedSeats={selectedSeats} onToggleSeat={handleToggleSeat} />
        </div>

        <SelectionSummary />
      </div>
    </div>
  );
}
