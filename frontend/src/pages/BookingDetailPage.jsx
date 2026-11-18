import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useBookingPolling } from '../hooks/useBookingPolling';
import { bookingApi } from '../api/booking.api';
import { useToast } from '../components/ui/Toast';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import Spinner from '../components/ui/Spinner';
import BookingStatusPoller from '../components/booking/BookingStatusPoller';
import { formatDate, formatDateTime, formatCurrency, formatSeatType } from '../utils/format';

export default function BookingDetailPage() {
  const { bookingId } = useParams();
  const { booking, loading, error, refresh } = useBookingPolling(bookingId);
  const [showCancel, setShowCancel] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const showToast = useToast();

  const handleCancel = async () => {
    setCancelling(true);
    try {
      await bookingApi.cancel(bookingId);
      showToast('Booking cancelled successfully', 'success');
      setShowCancel(false);
      refresh();
    } catch (err) {
      showToast(err.message || 'Failed to cancel', 'error');
    } finally {
      setCancelling(false);
    }
  };

  if (loading) {
    return <div className="min-h-[calc(100vh-4rem)] bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 px-4 py-20"><div className="mx-auto flex max-w-4xl justify-center rounded-2xl border border-slate-200 bg-white py-16"><Spinner size="lg" /></div></div>;
  }

  if (error) {
    return (
      <div className="min-h-[calc(100vh-4rem)] bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 px-4 py-8">
        <div className="mx-auto max-w-3xl rounded-2xl border border-red-200 bg-white p-6 text-center text-red-700 shadow-sm">
          <p className="font-semibold">Error loading booking</p>
          <p className="text-sm mt-1">{error}</p>
        </div>
      </div>
    );
  }

  if (!booking) return null;

  const canCancel = ['CONFIRMED', 'PAYMENT_PENDING', 'SEATS_HELD'].includes(booking.status);

  return (
    <div className="min-h-full bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 px-4 py-7 sm:py-9">
      <div className="mx-auto max-w-4xl">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-700">Your ticket</p>
          <h1 className="mt-1 text-3xl font-bold text-slate-900">Booking details</h1>
        </div>
        <Badge status={booking.status} />
      </div>

      <BookingStatusPoller status={booking.status} />

      {booking.status === 'CONFIRMED' && (
        <div className="mb-5 flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 sm:p-5">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-xl font-bold text-white">✓</span>
          <div>
            <p className="font-semibold text-green-800">Booking Confirmed!</p>
            <p className="text-sm text-green-700">Your tickets have been booked successfully</p>
          </div>
        </div>
      )}

      {booking.status === 'FAILED' && (
        <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 p-4">
          <p className="font-semibold text-red-800">Booking Failed</p>
          {booking.failureReason && <p className="text-sm text-red-600 mt-1">{booking.failureReason}</p>}
        </div>
      )}

      {/* Train Info */}
      <div className="mb-4 rounded-2xl border border-blue-100 bg-gradient-to-r from-white to-blue-50 p-5 shadow-sm sm:p-6">
        <h2 className="text-xl font-bold text-primary-900">{booking.trainName}</h2>
        <p className="mb-4 mt-1 text-sm text-gray-500">Train #{booking.trainNumber} · Departure: {formatDate(booking.departureDate)}</p>

        <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
          <div className="rounded-xl bg-white/80 p-3">
            <p className="text-gray-500">Booking ID</p>
            <p className="font-mono text-xs">{booking.id}</p>
          </div>
          <div className="rounded-xl bg-white/80 p-3">
            <p className="text-gray-500">Booked on</p>
            <p>{formatDateTime(booking.createdAt)}</p>
          </div>
          <div className="rounded-xl bg-white/80 p-3">
            <p className="text-gray-500">Total Amount</p>
            <p className="font-bold text-primary-900">{formatCurrency(booking.totalAmount)}</p>
          </div>
          <div className="rounded-xl bg-white/80 p-3">
            <p className="text-gray-500">Seats</p>
            <p>{booking.seatCount}</p>
          </div>
        </div>
      </div>

      {/* Seats */}
      <div className="mb-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <h2 className="mb-3 text-lg font-bold text-slate-900">Seats</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200">
              <th className="py-2 text-left text-gray-500">Seat #</th>
              <th className="py-2 text-left text-gray-500">Type</th>
              <th className="py-2 text-right text-gray-500">Price</th>
            </tr>
          </thead>
          <tbody>
            {booking.seats?.map((s) => (
              <tr key={s.seatId} className="border-b border-slate-100">
                <td className="py-2">{s.seatNumber}</td>
                <td className="py-2">{formatSeatType(s.seatType)}</td>
                <td className="py-2 text-right">{formatCurrency(s.price)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Passengers */}
      {booking.passengers && booking.passengers.length > 0 && (
        <div className="mb-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <h2 className="mb-3 text-lg font-bold text-slate-900">Passengers</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="py-2 text-left text-gray-500">#</th>
                <th className="py-2 text-left text-gray-500">Name</th>
                <th className="py-2 text-left text-gray-500">Age</th>
                <th className="py-2 text-left text-gray-500">Gender</th>
              </tr>
            </thead>
            <tbody>
              {booking.passengers.map((p, i) => (
                <tr key={p.id || i} className="border-b border-slate-100">
                  <td className="py-2">{i + 1}</td>
                  <td className="py-2">{p.name}</td>
                  <td className="py-2">{p.age}</td>
                  <td className="py-2">{p.gender}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {canCancel && (
        <Button variant="danger" onClick={() => setShowCancel(true)} className="w-full rounded-full py-3">
          Cancel Booking
        </Button>
      )}

      <Modal
        open={showCancel}
        onClose={() => setShowCancel(false)}
        title="Cancel Booking?"
        confirmText="Yes, Cancel"
        onConfirm={handleCancel}
        loading={cancelling}
        danger
      >
        Are you sure you want to cancel this booking? This action cannot be undone.
        {booking.status === 'CONFIRMED' && ' A refund will be initiated.'}
      </Modal>
      </div>
    </div>
  );
}
