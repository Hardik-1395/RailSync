import { useState, useEffect } from 'react';
import { bookingApi } from '../api/booking.api';
import BookingCard from '../components/bookings/BookingCard';
import BookingFilters from '../components/bookings/BookingFilters';
import Pagination from '../components/ui/Pagination';
import Spinner from '../components/ui/Spinner';
import EmptyState from '../components/ui/EmptyState';
import { useToast } from '../components/ui/Toast';
import { Link } from 'react-router-dom';

export default function MyBookingsPage() {
  const [bookings, setBookings] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1 });
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const showToast = useToast();

  const fetchBookings = async (status, page) => {
    setLoading(true);
    try {
      const res = await bookingApi.list(status || undefined, page, 10);
      const data = res.data || res;
      setBookings(data.bookings || []);
      setPagination(data.pagination || { page: 1, totalPages: 1 });
    } catch (err) {
      showToast(err.message || 'Failed to load bookings', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings(statusFilter, 1);
  }, [statusFilter]);

  const handlePageChange = (page) => {
    fetchBookings(statusFilter, page);
  };

  return (
    <div className="min-h-full bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 px-4 py-7 sm:py-9">
      <div className="mx-auto max-w-5xl">
        <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-700">Your trips</p>
            <h1 className="mt-1 text-3xl font-bold text-slate-900">My Bookings</h1>
            <p className="mt-1 text-sm text-slate-600">View your tickets and check their booking status.</p>
          </div>
          <Link to="/search" className="inline-flex items-center rounded-full bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2">
            Book a train
          </Link>
        </header>

        <div className="mb-5 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
          <BookingFilters active={statusFilter} onChange={(v) => setStatusFilter(v)} />
        </div>

      {loading ? (
        <div className="flex justify-center rounded-2xl border border-slate-200 bg-white py-16"><Spinner size="lg" /></div>
      ) : bookings.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <EmptyState title="No bookings found" message={statusFilter ? 'Try a different filter' : 'Book your first train ticket!'}>
            <Link to="/search" className="inline-flex rounded-full bg-primary-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-800">Search trains</Link>
          </EmptyState>
        </div>
      ) : (
        <>
          <p className="mb-3 text-sm text-slate-500">{pagination.total} booking{pagination.total === 1 ? '' : 's'}</p>
          <div className="space-y-3">
            {bookings.map((b) => <BookingCard key={b.id} booking={b} />)}
          </div>
          <Pagination page={pagination.page} totalPages={pagination.totalPages} onPageChange={handlePageChange} />
        </>
      )}
      </div>
    </div>
  );
}
