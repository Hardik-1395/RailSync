import { useState, useEffect } from 'react';
import { adminApi } from '../../api/admin.api';
import { useToast } from '../ui/Toast';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Pagination from '../ui/Pagination';

export default function StationManager() {
  const [stations, setStations] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1 });
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: '', code: '', city: '', state: '' });
  const [creating, setCreating] = useState(false);
  const showToast = useToast();

  const fetchStations = async (page = 1) => {
    setLoading(true);
    try {
      const res = await adminApi.getStations(page, 20, search);
      setStations(res.data || []);
      setPagination(res.pagination || { page: 1, totalPages: 1 });
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchStations(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setCreating(true);
    try {
      await adminApi.createStation(form);
      showToast('Station created!', 'success');
      setForm({ name: '', code: '', city: '', state: '' });
      fetchStations();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setCreating(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    fetchStations(1);
  };

  return (
    <div>
      <form onSubmit={handleCreate} className="mb-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="mb-4">
          <h2 className="text-lg font-bold text-slate-900">Add a station</h2>
          <p className="mt-1 text-sm text-slate-500">Create a station record for train routes and search.</p>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Input label="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <Input label="Code" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} required maxLength={10} />
          <Input label="City" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} required />
          <Input label="State" value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} required />
        </div>
        <Button type="submit" loading={creating} className="mt-4 rounded-full bg-blue-700 px-5 hover:bg-blue-800">Create Station</Button>
      </form>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Station directory</h2>
            <p className="mt-1 text-sm text-slate-500">Search and review saved stations.</p>
          </div>
          <form onSubmit={handleSearch} className="flex w-full gap-2 sm:w-auto">
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search..." className="input-field max-w-[200px]" />
            <Button type="submit" variant="secondary" className="shrink-0 rounded-full">Search</Button>
          </form>
        </div>

        {loading ? (
          <p className="text-center py-8 text-gray-400">Loading...</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr className="border-b border-slate-200">
                  <th className="px-3 py-3 text-left font-semibold">Name</th>
                  <th className="px-3 py-3 text-left font-semibold">Code</th>
                  <th className="px-3 py-3 text-left font-semibold">City</th>
                  <th className="px-3 py-3 text-left font-semibold">State</th>
                </tr>
              </thead>
              <tbody>
                {stations.map((s) => (
                  <tr key={s.id} className="border-b border-slate-100 text-slate-700 transition hover:bg-blue-50/50">
                    <td className="px-3 py-3 font-medium">{s.name}</td>
                    <td className="px-3 py-3"><span className="rounded bg-slate-100 px-2 py-1 font-mono text-xs">{s.code}</span></td>
                    <td className="px-3 py-3">{s.city}</td>
                    <td className="px-3 py-3">{s.state}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!loading && stations.length === 0 && <p className="py-8 text-center text-sm text-slate-500">No stations found.</p>}
          </div>
        )}
        <Pagination page={pagination.page} totalPages={pagination.totalPages} onPageChange={fetchStations} />
      </div>
    </div>
  );
}
