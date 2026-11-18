import PassengerForm from './PassengerForm';

export default function PassengerList({ seats, register, errors, savedPassengers, setValue, savedPassengersLoading }) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Passenger details</h2>
          <p className="mt-1 text-sm text-slate-500">Enter details exactly as they should appear on the ticket.</p>
        </div>
        {savedPassengersLoading && <p className="text-xs text-gray-500">Loading saved passengers…</p>}
      </div>
      {seats.map((seat, i) => (
        <PassengerForm
          key={seat.seatId}
          index={i}
          seat={seat}
          register={register}
          errors={errors}
          savedPassengers={savedPassengers}
          setValue={setValue}
        />
      ))}
    </div>
  );
}
