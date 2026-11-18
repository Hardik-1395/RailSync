import { Link } from 'react-router-dom';
import Badge from '../ui/Badge';
import { formatDate, formatCurrency } from '../../utils/format';

export default function BookingCard({ booking }) {
  const statusAccent = {
    CONFIRMED: 'border-l-emerald-500',
    PAYMENT_PENDING: 'border-l-amber-500',
    CANCELLED: 'border-l-slate-400',
    FAILED: 'border-l-rose-500',
    EXPIRED: 'border-l-slate-400',
  }[booking.status] || 'border-l-blue-500';

  return (
    <Link to={`/bookings/${booking.id}`} className={`group block rounded-2xl border border-slate-200 border-l-4 ${statusAccent} bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md sm:p-5`}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="mb-2 flex flex-wrap items-center gap-2.5">
            <h2 className="text-base font-bold text-primary-900 sm:text-lg">{booking.trainName}</h2>
            <Badge status={booking.status} />
          </div>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-slate-500">
            <span className="font-medium text-slate-700">Train #{booking.trainNumber}</span>
            <span aria-hidden="true">·</span>
            <span>{formatDate(booking.departureDate)}</span>
            <span aria-hidden="true">·</span>
            <span>{booking.seatCount} seat{booking.seatCount !== 1 ? 's' : ''}</span>
          </div>
          {booking.seats?.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {booking.seats.map((seat) => (
                <span key={seat.seatId || seat.seatNumber} className="rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">Seat #{seat.seatNumber}</span>
              ))}
            </div>
          )}
        </div>
        <div className="flex items-center justify-between border-t border-slate-100 pt-3 sm:flex-col sm:items-end sm:border-0 sm:pt-0">
          <div className="sm:text-right">
            <p className="text-lg font-bold text-primary-900">{formatCurrency(booking.totalAmount)}</p>
            <p className="text-xs text-slate-400">Booked {formatDate(booking.createdAt)}</p>
          </div>
          <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5 text-slate-400 transition group-hover:translate-x-1 group-hover:text-blue-700 sm:mt-2"><path d="M5 12h14m-6-6 6 6-6 6" /></svg>
        </div>
      </div>
    </Link>
  );
}
