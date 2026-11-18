import { useState } from 'react';
import AdminTabs from '../components/admin/AdminTabs';
import StationManager from '../components/admin/StationManager';
import TrainManager from '../components/admin/TrainManager';
import RouteManager from '../components/admin/RouteManager';
import ScheduleManager from '../components/admin/ScheduleManager';

export default function AdminPage() {
  const [tab, setTab] = useState('Stations');

  return (
    <div className="min-h-full bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 px-4 py-7 sm:py-9">
      <div className="mx-auto max-w-7xl">
        <header className="mb-6 rounded-2xl bg-gradient-to-r from-primary-900 via-blue-900 to-blue-700 p-5 text-white shadow-md sm:p-7">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-200">RailSync operations</p>
          <h1 className="mt-1 text-3xl font-bold">Admin workspace</h1>
          <p className="mt-2 max-w-2xl text-sm text-blue-100 sm:text-base">Manage stations, trains, routes and schedules for the booking system.</p>
        </header>
        <div className="mb-5 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
          <AdminTabs active={tab} onChange={setTab} />
        </div>

        {tab === 'Stations' && <StationManager />}
        {tab === 'Trains' && <TrainManager />}
        {tab === 'Routes' && <RouteManager />}
        {tab === 'Schedules' && <ScheduleManager />}
      </div>
    </div>
  );
}
