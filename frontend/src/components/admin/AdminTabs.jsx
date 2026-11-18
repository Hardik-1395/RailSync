const TABS = ['Stations', 'Trains', 'Routes', 'Schedules'];

export default function AdminTabs({ active, onChange }) {
  return (
    <div className="flex gap-1 overflow-x-auto" role="group" aria-label="Admin sections">
      {TABS.map((tab) => (
        <button
          key={tab}
          type="button"
          aria-pressed={active === tab}
          onClick={() => onChange(tab)}
          className={`rounded-xl px-4 py-2.5 text-sm font-semibold whitespace-nowrap transition-colors sm:px-5 ${
            active === tab
              ? 'bg-primary-900 text-white shadow-sm'
              : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'
          }`}
        >
          {tab}
        </button>
      ))}
    </div>
  );
}
