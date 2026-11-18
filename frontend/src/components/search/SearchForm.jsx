import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import StationAutocomplete from './StationAutocomplete';
import Button from '../ui/Button';
import { searchApi } from '../../api/search.api';
import { useSearchStore } from '../../store/search.store';
import { useToast } from '../ui/Toast';

export default function SearchForm({ compact, hero = false }) {
  const { from, to, date, setSearchParams, setResults, setSearching, isSearching } = useSearchStore();
  const [fromCode, setFromCode] = useState(from);
  const [toCode, setToCode] = useState(to);
  const [fromLabel, setFromLabel] = useState(from);
  const [toLabel, setToLabel] = useState(to);
  const [travelDate, setTravelDate] = useState(date);
  const [swapDirection, setSwapDirection] = useState(false);
  const navigate = useNavigate();
  const showToast = useToast();

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!fromCode || !toCode) {
      showToast('Please select both From and To stations', 'warning');
      return;
    }
    setSearchParams(fromCode, toCode, travelDate);
    setSearching(true);

    try {
      const res = await searchApi.search(fromCode, toCode, travelDate);
      setResults(res.data || res);
      navigate('/search');
    } catch (err) {
      showToast(err.message || 'Search failed', 'error');
      setSearching(false);
    }
  };

  const handleSwapStations = () => {
    setFromCode(toCode);
    setToCode(fromCode);
    setFromLabel(toLabel);
    setToLabel(fromLabel);
    setSwapDirection((direction) => !direction);
  };

  const today = new Date().toISOString().split('T')[0];
  const fieldGridClass = hero
    ? 'grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3'
    : compact
      ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3'
      : 'grid grid-cols-1 md:grid-cols-4 gap-4';

  return (
    <form onSubmit={handleSearch} className={hero || compact ? 'space-y-4' : ''}>
      <div className={fieldGridClass}>
        <div className={`grid grid-cols-[minmax(0,1fr)_2.5rem_minmax(0,1fr)] gap-2 ${hero ? 'items-stretch sm:col-span-2 lg:col-span-2' : `items-end ${compact ? 'sm:col-span-2 lg:col-span-2' : 'md:col-span-2'}`}`}>
          <StationAutocomplete
            label="From"
            value={fromCode}
            displayValue={fromLabel}
            onChange={(code, name = '') => { setFromCode(code); setFromLabel(name || code); }}
            placeholder="Enter city or station"
            hero={hero}
          />
          <button
            type="button"
            onClick={handleSwapStations}
            disabled={!fromCode || !toCode}
            aria-label="Swap from and to stations"
            title="Swap stations"
            className={`flex h-10 w-10 items-center justify-center rounded-full border border-gray-300 text-primary-900 transition-colors hover:bg-primary-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-700 disabled:cursor-not-allowed disabled:opacity-40 ${hero ? 'self-center bg-white shadow-sm' : 'mb-0.5 rounded-lg'}`}
          >
            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={`h-5 w-5 transition-transform duration-300 ${swapDirection ? 'rotate-180' : ''}`}>
              <path d="M7 4v16" />
              <path d="m4 7 3-3 3 3" />
              <path d="M17 20V4" />
              <path d="m14 17 3 3 3-3" />
            </svg>
          </button>
          <StationAutocomplete
            label="To"
            value={toCode}
            displayValue={toLabel}
            onChange={(code, name = '') => { setToCode(code); setToLabel(name || code); }}
            placeholder="Enter city or station"
            hero={hero}
          />
        </div>
        <div className={hero ? 'rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm transition focus-within:border-primary-500 focus-within:ring-2 focus-within:ring-primary-100' : ''}>
          <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
          <input
            type="date"
            value={travelDate}
            onChange={(e) => setTravelDate(e.target.value)}
            min={today}
            className={hero ? 'w-full border-0 bg-transparent p-0 text-base text-gray-900 focus:outline-none focus:ring-0' : 'input-field'}
          />
        </div>
        <div className={hero ? 'flex justify-end sm:col-start-2 lg:col-start-3' : 'flex items-end'}>
          <Button type="submit" loading={isSearching} className={hero ? 'w-full rounded-full py-3 text-base sm:min-w-64' : 'w-full'}>
            Search Trains
            {hero && (
              <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
                <circle cx="10.8" cy="10.8" r="6.3" />
                <path d="m16 16 4.3 4.3" />
              </svg>
            )}
          </Button>
        </div>
      </div>
    </form>
  );
}
