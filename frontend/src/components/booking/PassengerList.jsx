import PassengerForm from './PassengerForm';

export default function PassengerList({ seats, register, errors, savedPassengers, setValue, savedPassengersLoading }) {
  return (
    <div className="space-y-3">
      <h3 className="text-lg font-semibold">Passenger Details</h3>
      {savedPassengersLoading && <p className="text-xs text-gray-500">Loading passenger suggestions…</p>}
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
