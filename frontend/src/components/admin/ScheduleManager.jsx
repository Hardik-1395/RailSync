import { useState, useEffect, useRef } from 'react';
import { adminApi } from '../../api/admin.api';
import { useToast } from '../ui/Toast';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import { formatDate } from '../../utils/format';
import Modal from '../ui/Modal';

export default function ScheduleManager() {
  const [trains, setTrains] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [selectedTrain, setSelectedTrain] = useState('');
  const [date, setDate] = useState('');
  const [creating, setCreating] = useState(false);
  const [loading, setLoading] = useState(false);
  const [scheduleToDelete, setScheduleToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const deletionInFlight = useRef(false);
  const showToast = useToast();

  useEffect(() => {
    adminApi.getTrains().then((res) => setTrains(res.data || [])).catch(() => {});
    fetchSchedules();
  }, []);

  const fetchSchedules = async () => {
    setLoading(true);
    try {
      const res = await adminApi.getSchedules();
      setSchedules(res.data || []);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!selectedTrain || !date) { showToast('Select train and date', 'warning'); return; }
    setCreating(true);
    try {
      await adminApi.createSchedule({ trainId: selectedTrain, departureDate: date });
      showToast('Schedule created!', 'success');
      setSelectedTrain('');
      setDate('');
      fetchSchedules();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setCreating(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!scheduleToDelete || deletionInFlight.current) return;
    deletionInFlight.current = true;
    setDeleting(true);
    try {
      await adminApi.cancelSchedule(scheduleToDelete.id);
      showToast('Schedule cancelled', 'success');
      setScheduleToDelete(null);
      await fetchSchedules();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      deletionInFlight.current = false;
      setDeleting(false);
    }
  };

  const closeDeleteDialog = () => {
    if (!deletionInFlight.current) setScheduleToDelete(null);
  };

  const today = new Date().toISOString().split('T')[0];

  return (
    <div>
      <form onSubmit={handleCreate} className="mb-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="mb-4">
          <h2 className="text-lg font-bold text-slate-900">Create a schedule</h2>
          <p className="mt-1 text-sm text-slate-500">Set a train departure date to make it available in search.</p>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-end">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Train</label>
            <select value={selectedTrain} onChange={(e) => setSelectedTrain(e.target.value)} className="input-field" required>
              <option value="">Select train</option>
              {trains.map((t) => <option key={t.id} value={t.id}>{t.trainNumber} — {t.trainName}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Departure Date</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} min={today} className="input-field" required />
          </div>
          <Button type="submit" loading={creating} className="rounded-full bg-blue-700 px-5 hover:bg-blue-800">Create Schedule</Button>
        </div>
      </form>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="mb-4">
          <h2 className="text-lg font-bold text-slate-900">Schedule directory</h2>
          <p className="mt-1 text-sm text-slate-500">Review active and cancelled departures.</p>
        </div>
        {loading ? <p className="text-center py-4 text-gray-400">Loading...</p> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr className="border-b border-slate-200">
                  <th className="px-3 py-3 text-left font-semibold">Train</th>
                  <th className="px-3 py-3 text-left font-semibold">Date</th>
                  <th className="px-3 py-3 text-left font-semibold">Status</th>
                  <th className="px-3 py-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {schedules.map((s) => (
                  <tr key={s.id} className="border-b border-slate-100 text-slate-700 transition hover:bg-blue-50/50">
                    <td className="px-3 py-3 font-medium">{s.train?.trainNumber || s.trainId} — {s.train?.trainName || ''}</td>
                    <td className="px-3 py-3">{formatDate(s.departureDate)}</td>
                    <td className="px-3 py-3"><Badge status={s.status} /></td>
                    <td className="px-3 py-3 text-right">
                      {s.status === 'ACTIVE' && (
                        <Button variant="danger" onClick={() => setScheduleToDelete(s)} className="rounded-full px-3 py-1.5 text-xs">Cancel</Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!loading && schedules.length === 0 && <p className="py-8 text-center text-sm text-slate-500">No schedules have been created yet.</p>}
          </div>
        )}
      </div>

      <Modal
        open={Boolean(scheduleToDelete)}
        onClose={closeDeleteDialog}
        title="Delete schedule"
        confirmText="Confirm Delete"
        onConfirm={handleConfirmDelete}
        loading={deleting}
        danger
      >
        Are you sure about deleting this schedule?
      </Modal>
    </div>
  );
}
