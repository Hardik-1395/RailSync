import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import SearchForm from '../components/search/SearchForm';
import TrainList from '../components/search/TrainList';
import Spinner from '../components/ui/Spinner';
import Button from '../components/ui/Button';
import { searchApi } from '../api/search.api';
import { useSearchStore } from '../store/search.store';
import { useToast } from '../components/ui/Toast';

function toISODate(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function dateFromISO(value) {
  return value ? new Date(`${value}T00:00:00`) : new Date();
}

export default function SearchPage() {
  const { results, isSearching, from, to, date, setSearchParams, setResults, setSearching } = useSearchStore();
  const [rangeOffset, setRangeOffset] = useState(0);
  const [sortAscending, setSortAscending] = useState(true);
  const navigate = useNavigate();
  const showToast = useToast();

  const dates = useMemo(() => {
    const start = dateFromISO(date);
    start.setDate(start.getDate() + rangeOffset);
    return Array.from({ length: 7 }, (_, index) => {
      const day = new Date(start);
      day.setDate(start.getDate() + index);
      return day;
    });
  }, [date, rangeOffset]);

  const handleDateSelect = async (selectedDate) => {
    const isoDate = toISODate(selectedDate);
    if (isoDate === date || !from || !to) return;
    setRangeOffset(0);
    setSearchParams(from, to, isoDate);
    setSearching(true);
    try {
      const response = await searchApi.search(from, to, isoDate);
      setResults(response.data || response);
    } catch (error) {
      setSearchParams(from, to, date);
      setSearching(false);
      showToast(error.message || 'Could not update train results for this date', 'error');
    }
  };

  const count = results?.count ?? results?.trains?.length ?? 0;
  const sortedTrains = useMemo(() => [...(results?.trains || [])].sort((left, right) => {
    const leftTime = left.from?.departure || '99:99';
    const rightTime = right.from?.departure || '99:99';
    return sortAscending ? leftTime.localeCompare(rightTime) : rightTime.localeCompare(leftTime);
  }), [results?.trains, sortAscending]);

  return (
    <div className="min-h-full bg-gradient-to-br from-rose-50 via-slate-50 to-sky-100 pb-10">
      <section className="border-b border-slate-200 bg-white px-4 py-4 shadow-sm sm:px-6">
        <div className="mx-auto flex max-w-7xl flex-col items-stretch gap-3 sm:flex-row sm:items-start">
          <Button type="button" variant="secondary" onClick={() => navigate(-1)} className="shrink-0 rounded-full border-blue-600 px-5 text-blue-700 hover:bg-blue-50">
            Back
          </Button>
          <div className="min-w-0 flex-1">
            <SearchForm key={`${from}-${to}-${date}`} compact submitLabel="Update" />
          </div>
        </div>
      </section>

      {results && (
        <div className="border-b border-slate-200 bg-white px-3 py-2 sm:px-6">
          <div className="mx-auto flex max-w-7xl items-center gap-2">
            <button type="button" aria-label="Previous dates" onClick={() => setRangeOffset((offset) => offset - 1)} className="shrink-0 rounded-full p-2 text-slate-600 hover:bg-slate-100">
              <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4"><path d="m15 18-6-6 6-6" /></svg>
            </button>
            <div className="flex min-w-0 flex-1 gap-1 overflow-x-auto">
              {dates.map((day) => {
                const isoDate = toISODate(day);
                const active = isoDate === date;
                return (
                  <button
                    key={isoDate}
                    type="button"
                    onClick={() => handleDateSelect(day)}
                    disabled={isSearching}
                    className={`min-w-[88px] flex-1 rounded-lg px-2 py-2 text-center transition disabled:opacity-50 sm:min-w-0 ${active ? 'bg-primary-50 text-primary-900 shadow-sm' : 'text-slate-600 hover:bg-slate-50'}`}
                  >
                    <span className="block text-xs font-semibold sm:text-sm">{day.toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short' })}</span>
                    {active && <span className="mt-0.5 block text-[11px]">{count} train{count === 1 ? '' : 's'}</span>}
                  </button>
                );
              })}
            </div>
            <button type="button" aria-label="Next dates" onClick={() => setRangeOffset((offset) => offset + 1)} className="shrink-0 rounded-full p-2 text-slate-600 hover:bg-slate-100">
              <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4"><path d="m9 18 6-6-6-6" /></svg>
            </button>
          </div>
        </div>
      )}

      <main className="mx-auto max-w-7xl px-4 py-5 sm:px-6 sm:py-6">
        {isSearching ? (
          <div className="flex justify-center rounded-2xl border border-slate-200 bg-white/80 py-16">
            <Spinner size="lg" />
          </div>
        ) : results ? (
          <div>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3 text-sm text-slate-600">
              <p>
                {count} train{count === 1 ? '' : 's'} found
                {results.from?.resolved && ` from ${results.from.resolved}`}
                {results.to?.resolved && ` to ${results.to.resolved}`}
                {results.date && results.date !== 'any' && ` on ${results.date}`}
              </p>
              <button type="button" onClick={() => setSortAscending((ascending) => !ascending)} className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 font-medium text-slate-700 shadow-sm hover:bg-slate-50" aria-label={`Sort by departure time, currently ${sortAscending ? 'earliest first' : 'latest first'}`}>
                <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4"><path d="M4 7h16M7 12h10m-7 5h4" /><path d="M6 4v6m12 4v6" /></svg>
                Sort by departure {sortAscending ? '↑' : '↓'}
              </button>
            </div>
            <TrainList trains={sortedTrains} />
          </div>
        ) : (
          <div className="rounded-2xl border border-slate-200 bg-white/80 py-16 text-center text-slate-500">
            <p className="text-lg">Search for trains to see results</p>
          </div>
        )}
      </main>
    </div>
  );
}
