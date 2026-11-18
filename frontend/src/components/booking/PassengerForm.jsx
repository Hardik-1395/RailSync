import Input from '../ui/Input';
import Select from '../ui/Select';
import { formatSeatType } from '../../utils/format';
import { useState } from 'react';

const GENDER_OPTIONS = [
  { value: 'MALE', label: 'Male' },
  { value: 'FEMALE', label: 'Female' },
  { value: 'OTHER', label: 'Other' },
];

export default function PassengerForm({ index, seat, register, errors, savedPassengers, setValue }) {
  const [nameQuery, setNameQuery] = useState('');
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const passengerPath = `passengers.${index}`;
  const nameField = register(`${passengerPath}.name`, { required: 'Name is required' });

  const selectSavedPassenger = (passenger) => {
    setNameQuery(passenger.name);
    setValue(`${passengerPath}.name`, passenger.name, { shouldValidate: true, shouldDirty: true });

    setValue(`${passengerPath}.age`, passenger.age, { shouldValidate: true, shouldDirty: true });
    setValue(`${passengerPath}.gender`, passenger.gender, { shouldValidate: true, shouldDirty: true });
    setSuggestionsOpen(false);
  };

  const filteredPassengers = savedPassengers.filter((passenger) =>
    `${passenger.name} ${passenger.age} ${passenger.gender}`.toLowerCase().includes(nameQuery.trim().toLowerCase())
  );

  return (
    <div className="bg-gray-50 rounded-lg p-4">
      <p className="text-sm font-semibold text-primary-900 mb-3">
        Passenger {index + 1} — Seat #{seat.seatNumber} ({formatSeatType(seat.seatType)})
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="relative">
          <Input
            label="Full Name"
            placeholder="Enter name"
            {...nameField}
            onChange={(event) => {
              nameField.onChange(event);
              setNameQuery(event.target.value);
              setSuggestionsOpen(true);
            }}
            onFocus={() => setSuggestionsOpen(true)}
            onBlur={() => setTimeout(() => setSuggestionsOpen(false), 150)}
            error={errors?.passengers?.[index]?.name?.message}
            autoComplete="off"
          />
          {suggestionsOpen && savedPassengers.length > 0 && filteredPassengers.length > 0 && (
            <ul className="absolute z-20 mt-1 max-h-48 w-full overflow-y-auto rounded-lg border border-gray-200 bg-white py-1 shadow-lg" role="listbox" aria-label="Saved passenger suggestions">
              {filteredPassengers.map((passenger) => (
                <li key={passenger.id}>
                  <button
                    type="button"
                    role="option"
                    aria-selected="false"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => selectSavedPassenger(passenger)}
                    className="w-full px-3 py-2 text-left hover:bg-gray-50 focus:bg-gray-50 focus:outline-none"
                  >
                    <span className="block text-sm font-medium text-gray-800">{passenger.name}</span>
                    <span className="block text-xs text-gray-500">Age {passenger.age} · {passenger.gender}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <Input
          label="Age"
          type="number"
          placeholder="Age"
          {...register(`${passengerPath}.age`, {
            required: 'Age is required',
            min: { value: 1, message: 'Min 1' },
            max: { value: 120, message: 'Max 120' },
            valueAsNumber: true,
          })}
          error={errors?.passengers?.[index]?.age?.message}
        />
        <Select
          label="Gender"
          placeholder="Select"
          options={GENDER_OPTIONS}
          {...register(`${passengerPath}.gender`, { required: 'Gender is required' })}
          error={errors?.passengers?.[index]?.gender?.message}
        />
      </div>
      {savedPassengers.length > 0 && <p className="mt-3 text-xs text-gray-500">Choose a saved passenger from the name suggestions, or enter someone new. Details are saved for future bookings when you submit this booking.</p>}
    </div>
  );
}
