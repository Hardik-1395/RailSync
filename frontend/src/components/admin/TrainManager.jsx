import { useState, useEffect } from 'react';
import { adminApi } from '../../api/admin.api';
import { useToast } from '../ui/Toast';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Select from '../ui/Select';
import { SEAT_TYPES } from '../../utils/constants';

const seatTypeOptions = SEAT_TYPES.map((t) => ({ value: t, label: t.replace('_', ' ') }));

export default function TrainManager() {
  const [trains, setTrains] = useState([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ trainNumber: '', trainName: '', coachName: '' });
  const [seatRows, setSeatRows] = useState([{ seatNumber: '', seatType: 'LOWER', price: '' }]);
  const showToast = useToast();

  const fetchTrains = async () => {
    setLoading(true);
    try {
      const res = await adminApi.getTrains();
      setTrains(res.data || []);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTrains(); }, []);

  const addSeatRow = () => setSeatRows([...seatRows, { seatNumber: '', seatType: 'LOWER', price: '' }]);
  const removeSeatRow = (i) => setSeatRows(seatRows.filter((_, idx) => idx !== i));
  const updateSeatRow = (i, field, value) => {
    const updated = [...seatRows];
    updated[i] = { ...updated[i], [field]: value };
    setSeatRows(updated);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setCreating(true);
    try {
      const seats = seatRows.map((r) => ({
        seatNumber: parseInt(r.seatNumber, 10),
        seatType: r.seatType,
        price: parseFloat(r.price),
      }));
      await adminApi.createTrain({ ...form, seats });
      showToast('Train created!', 'success');
      setForm({ trainNumber: '', trainName: '', coachName: '' });
      setSeatRows([{ seatNumber: '', seatType: 'LOWER', price: '' }]);
      fetchTrains();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div>
      <form onSubmit={handleCreate} className="mb-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="mb-4">
          <h2 className="text-lg font-bold text-slate-900">Add a train</h2>
          <p className="mt-1 text-sm text-slate-500">Enter train details and configure the seats available for booking.</p>
        </div>
        <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <Input label="Train Number" value={form.trainNumber} onChange={(e) => setForm({ ...form, trainNumber: e.target.value })} required />
          <Input label="Train Name" value={form.trainName} onChange={(e) => setForm({ ...form, trainName: e.target.value })} required />
          <Input label="Coach Name" value={form.coachName} onChange={(e) => setForm({ ...form, coachName: e.target.value })} required />
        </div>

        <h3 className="mb-2 text-sm font-semibold text-slate-800">Seat inventory</h3>
        <div className="mb-4 space-y-2">
          {seatRows.map((row, i) => (
            <div key={i} className="flex flex-wrap items-end gap-2 rounded-xl border border-slate-100 bg-slate-50 p-3">
              <Input label={i === 0 ? 'Seat #' : undefined} type="number" value={row.seatNumber} onChange={(e) => updateSeatRow(i, 'seatNumber', e.target.value)} placeholder="#" required className="w-24" />
              <Select label={i === 0 ? 'Type' : undefined} value={row.seatType} onChange={(e) => updateSeatRow(i, 'seatType', e.target.value)} options={seatTypeOptions} className="w-36" />
              <Input label={i === 0 ? 'Price' : undefined} type="number" value={row.price} onChange={(e) => updateSeatRow(i, 'price', e.target.value)} placeholder="Price" required className="w-28" />
              {seatRows.length > 1 && (
                <button type="button" onClick={() => removeSeatRow(i)} className="text-red-500 hover:text-red-700 text-xl pb-1">&times;</button>
              )}
            </div>
          ))}
        </div>
        <div className="flex flex-wrap gap-3">
          <Button type="button" variant="secondary" onClick={addSeatRow} className="rounded-full">+ Add Seat</Button>
          <Button type="submit" loading={creating} className="rounded-full bg-blue-700 px-5 hover:bg-blue-800">Create Train</Button>
        </div>
      </form>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="mb-4">
          <h2 className="text-lg font-bold text-slate-900">Train directory</h2>
          <p className="mt-1 text-sm text-slate-500">Configured trains and their seat counts.</p>
        </div>
        {loading ? <p className="text-center py-4 text-gray-400">Loading...</p> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr className="border-b border-slate-200">
                  <th className="px-3 py-3 text-left font-semibold">Number</th>
                  <th className="px-3 py-3 text-left font-semibold">Name</th>
                  <th className="px-3 py-3 text-left font-semibold">Coach</th>
                  <th className="px-3 py-3 text-left font-semibold">Seats</th>
                </tr>
              </thead>
              <tbody>
                {trains.map((t) => (
                  <tr key={t.id} className="border-b border-slate-100 text-slate-700 transition hover:bg-blue-50/50">
                    <td className="px-3 py-3 font-mono text-xs">{t.trainNumber}</td>
                    <td className="px-3 py-3 font-medium">{t.trainName}</td>
                    <td className="px-3 py-3">{t.coachName}</td>
                    <td className="px-3 py-3"><span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-800">{t.totalSeats || t.seats?.length || '—'}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!loading && trains.length === 0 && <p className="py-8 text-center text-sm text-slate-500">No trains have been created yet.</p>}
          </div>
        )}
      </div>
    </div>
  );
}
