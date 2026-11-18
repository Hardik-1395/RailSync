import { formatDate } from '../../utils/format';

export default function AvailabilitySummary({ availability, train }) {
  if (!availability) return null;

  return (
    <div className="mb-5 rounded-2xl border border-blue-100 bg-gradient-to-r from-white via-white to-blue-50 p-5 shadow-sm sm:p-6">
      <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-xl font-bold text-primary-900">{train?.trainName || availability.trainName}</h2>
            <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-800">#{train?.trainNumber || availability.trainNumber}</span>
          </div>
          {train?.from && (
            <p className="mt-2 text-sm font-medium text-gray-600">
              {train.from.name} → {train.to.name}
            </p>
          )}
          <p className="mt-2 text-sm text-gray-500">Departure: <strong className="font-semibold text-gray-700">{formatDate(availability.departureDate)}</strong></p>
        </div>
        <div className="grid grid-cols-4 gap-2 text-center sm:gap-3">
          <div className="min-w-16 rounded-xl bg-emerald-50 px-2 py-2">
            <p className="text-xl font-bold text-green-600 sm:text-2xl">{availability.available}</p>
            <p className="text-[11px] text-gray-500 sm:text-xs">Available</p>
          </div>
          <div className="min-w-16 rounded-xl bg-amber-50 px-2 py-2">
            <p className="text-xl font-bold text-yellow-600 sm:text-2xl">{availability.locked}</p>
            <p className="text-[11px] text-gray-500 sm:text-xs">Locked</p>
          </div>
          <div className="min-w-16 rounded-xl bg-rose-50 px-2 py-2">
            <p className="text-xl font-bold text-red-500 sm:text-2xl">{availability.booked}</p>
            <p className="text-[11px] text-gray-500 sm:text-xs">Booked</p>
          </div>
          <div className="min-w-16 rounded-xl bg-slate-100 px-2 py-2">
            <p className="text-xl font-bold text-gray-600 sm:text-2xl">{availability.totalSeats}</p>
            <p className="text-[11px] text-gray-500 sm:text-xs">Total</p>
          </div>
        </div>
      </div>
    </div>
  );
}
