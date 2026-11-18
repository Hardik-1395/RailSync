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
    <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-slate-200 bg-white/95 shadow-[0_-8px_28px_rgba(15,23,42,0.08)] backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
        <div className="min-w-0 text-sm">
          <span className="font-semibold text-slate-900">{count} seat{count !== 1 ? 's' : ''} selected</span>
          <span className="ml-1 hidden text-gray-400 sm:inline">(max {MAX_SEATS_PER_BOOKING})</span>
          <span className="ml-2 block text-lg font-bold text-primary-900 sm:ml-4 sm:inline">{formatCurrency(totalPrice)}</span>
        </div>
        <Button onClick={() => navigate('/booking')} className="shrink-0 rounded-full px-4 sm:px-6">
          Continue to booking
        </Button>
      </div>
    </div>
  );
}
