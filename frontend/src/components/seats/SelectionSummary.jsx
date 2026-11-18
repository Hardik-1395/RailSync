import { useNavigate } from 'react-router-dom';
import { useBookingStore } from '../../store/booking.store';
import { formatCurrency } from '../../utils/format';
import { MAX_SEATS_PER_BOOKING } from '../../utils/constants';
import Button from '../ui/Button';

export default function SelectionSummary() {
  const selectedSeats = useBookingStore((s) => s.selectedSeats);
  const navigate = useNavigate();

  const count = selectedSeats.size;
  let totalPrice = 0;
  selectedSeats.forEach((s) => (totalPrice += s.price || 0));

  if (count === 0) return null;

  return (
    <div className="mt-4 flex flex-col items-stretch justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:px-6">
      <div className="min-w-0 text-sm">
        <span className="font-semibold text-slate-900">{count} seat{count !== 1 ? 's' : ''} selected</span>
        <span className="ml-1 hidden text-gray-400 sm:inline">(max {MAX_SEATS_PER_BOOKING})</span>
        <span className="ml-2 text-lg font-bold text-primary-900 sm:ml-4">{formatCurrency(totalPrice)}</span>
      </div>
      <Button onClick={() => navigate('/booking')} className="shrink-0 rounded-full px-4 sm:px-6">
        Continue to booking
      </Button>
    </div>
  );
}
