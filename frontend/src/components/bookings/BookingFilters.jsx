const FILTERS = [
  { label: 'All', value: '' },
  { label: 'Confirmed', value: 'CONFIRMED' },
  { label: 'Pending', value: 'PAYMENT_PENDING' },
  { label: 'Cancelled', value: 'CANCELLED' },
  { label: 'Failed', value: 'FAILED' },
];

export default function BookingFilters({ active, onChange }) {
  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label="Filter bookings by status">
      {FILTERS.map((f) => (
        <button
          key={f.value}
          type="button"
          aria-pressed={active === f.value}
          onClick={() => onChange(f.value)}
          className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
            active === f.value ? 'bg-primary-900 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          {f.label}
        </button>
      ))}
    </div>
  );
}
