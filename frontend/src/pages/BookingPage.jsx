import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { passengerApi } from '../api/passenger.api';
import { useBookingStore } from '../store/booking.store';
import { useToast } from '../components/ui/Toast';
import BookingSummary from '../components/booking/BookingSummary';
import PassengerList from '../components/booking/PassengerList';
import PaymentButton from '../components/booking/PaymentButton';

export default function BookingPage() {
  const navigate = useNavigate();
  const selectedTrain = useBookingStore((s) => s.selectedTrain);
  const selectedSeats = useBookingStore((s) => s.selectedSeats);
  const scheduleId = useBookingStore((s) => s.scheduleId);

  const seats = useMemo(() => Array.from(selectedSeats.values()), [selectedSeats]);
  const seatIds = useMemo(() => seats.map((s) => s.seatId), [seats]);
  const totalPrice = useMemo(() => seats.reduce((sum, s) => sum + (s.price || 0), 0), [seats]);
  const [savedPassengers, setSavedPassengers] = useState([]);
  const [savedPassengersLoading, setSavedPassengersLoading] = useState(true);
  const showToast = useToast();

  const { register, handleSubmit, formState: { errors, isValid }, getValues, setValue, watch } = useForm({
    mode: 'onChange',
    defaultValues: {
      passengers: seats.map(() => ({ name: '', age: '', gender: '' })),
    },
  });

  useEffect(() => {
    let active = true;
    passengerApi.list()
      .then((response) => {
        if (active) setSavedPassengers(response.data?.passengers || []);
      })
      .catch((err) => showToast(err.message || 'Could not load saved passengers. You can still enter details manually.', 'warning'))
      .finally(() => { if (active) setSavedPassengersLoading(false); });
    return () => { active = false; };
  }, [showToast]);

  useEffect(() => {
    if (seats.length === 0) {
      navigate('/search');
    }
  }, [seats.length, navigate]);

  if (seats.length === 0) return null;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Complete Your Booking</h1>

      <BookingSummary train={selectedTrain} seats={seats} totalPrice={totalPrice} />

      <div className="card mb-6">
        <form id="passenger-form" onSubmit={handleSubmit(() => {})}>
          <PassengerList
            seats={seats}
            register={register}
            errors={errors}
            savedPassengers={savedPassengers}
            setValue={setValue}
            savedPassengersLoading={savedPassengersLoading}
          />
        </form>
      </div>

      <PaymentButton
        passengers={watch('passengers') || getValues('passengers') || []}
        scheduleId={scheduleId}
        seatIds={seatIds}
        disabled={!isValid}
      />
    </div>
  );
}
