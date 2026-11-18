import { formatCurrency, formatSeatType, formatDate } from '../../utils/format';

export default function BookingSummary({ train, seats, totalPrice, departureDate }) {
  return (
    <div className="mb-5 rounded-2xl border border-blue-100 bg-gradient-to-r from-white via-white to-blue-50 p-5 shadow-sm sm:p-6">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-700">Booking summary</p>
          <p className="mt-1 text-lg font-bold text-primary-900">{train?.trainName}</p>
          <p className="text-sm text-gray-500">Train #{train?.trainNumber}</p>
          {train?.from?.name && train?.to?.name && <p className="mt-1 text-sm text-slate-600">{train.from.name} → {train.to.name}</p>}
        </div>
        {departureDate && (
          <p className="rounded-lg bg-white/80 px-3 py-2 text-sm text-gray-600 shadow-sm">Departure: <strong>{formatDate(departureDate)}</strong></p>
        )}
      </div>

      <div className="overflow-x-auto">
      <table className="w-full min-w-[360px] text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-left">
            <th className="py-2 text-gray-500 font-medium">Seat #</th>
            <th className="py-2 text-gray-500 font-medium">Type</th>
            <th className="py-2 text-right font-medium text-gray-500">Price</th>
          </tr>
        </thead>
        <tbody>
          {seats.map((s) => (
            <tr key={s.seatId} className="border-b border-slate-100">
              <td className="py-2">{s.seatNumber}</td>
              <td className="py-2">{formatSeatType(s.seatType)}</td>
              <td className="py-2 text-right">{formatCurrency(s.price)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={2} className="py-3 text-right font-semibold text-slate-800">Total</td>
            <td className="py-3 text-right text-lg font-bold text-primary-900">{formatCurrency(totalPrice)}</td>
          </tr>
        </tfoot>
      </table>
      </div>
    </div>
  );
}
