import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import StationAutocomplete from './StationAutocomplete';
import Button from '../ui/Button';
import { searchApi } from '../../api/search.api';
import { useSearchStore } from '../../store/search.store';
import { useToast } from '../ui/Toast';

export default function SearchForm({ compact, hero = false, submitLabel = 'Search Trains' }) {
  const { from, to, date, setSearchParams, setResults, setSearching, isSearching } = useSearchStore();
  const [fromCode, setFromCode] = useState(from);
  const [toCode, setToCode] = useState(to);
  const [fromLabel, setFromLabel] = useState(from);
  const [toLabel, setToLabel] = useState(to);
  const [travelDate, setTravelDate] = useState(date);
  const [swapDirection, setSwapDirection] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [visibleMonth, setVisibleMonth] = useState(() => {
    const initial = travelDate ? new Date(`${travelDate}T00:00:00`) : new Date();
    return new Date(initial.getFullYear(), initial.getMonth(), 1);
  });
  const calendarRef = useRef(null);
  const navigate = useNavigate();
  const showToast = useToast();

  useEffect(() => {
    if (!calendarOpen) return undefined;
    const closeOnOutsideClick = (event) => {
      if (calendarRef.current && !calendarRef.current.contains(event.target)) setCalendarOpen(false);
    };
    document.addEventListener('mousedown', closeOnOutsideClick);
    return () => document.removeEventListener('mousedown', closeOnOutsideClick);
  }, [calendarOpen]);

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

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const minDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const selectedDate = travelDate ? new Date(`${travelDate}T00:00:00`) : null;
  const monthStart = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), 1);
  const calendarStart = new Date(monthStart);
  calendarStart.setDate(1 - monthStart.getDay());
  const calendarDays = Array.from({ length: 42 }, (_, index) => {
    const day = new Date(calendarStart);
    day.setDate(calendarStart.getDate() + index);
    return day;
  });
  const monthLabel = visibleMonth.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
  const formatDate = (value) => value
    ? new Date(`${value}T00:00:00`).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })
    : '';
  const selectCalendarDay = (day) => {
    const value = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`;
    if (value < minDate) return;
    setTravelDate(value);
    setCalendarOpen(false);
  };
  const fieldGridClass = hero
    ? 'grid grid-cols-1 gap-3 sm:grid-cols-2'
    : compact
      ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3'
      : 'grid grid-cols-1 md:grid-cols-4 gap-4';

  return (
    <form onSubmit={handleSearch} className={hero || compact ? 'space-y-4' : ''}>
      <div className={fieldGridClass}>
        <div className={`grid grid-cols-[minmax(0,1fr)_2.5rem_minmax(0,1fr)] gap-2 ${hero ? 'items-stretch sm:col-span-2' : `items-end ${compact ? 'sm:col-span-2 lg:col-span-2' : 'md:col-span-2'}`} ${hero ? '[&>*:first-child]:min-w-0 [&>*:last-child]:min-w-0' : ''}`}>
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
        <div className={hero ? 'relative' : ''} ref={hero ? calendarRef : undefined}>
          {hero ? (
            <>
              <button
                type="button"
                aria-label="Choose journey date"
                aria-expanded={calendarOpen}
                onClick={() => {
                  setVisibleMonth(selectedDate ? new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1) : new Date(today.getFullYear(), today.getMonth(), 1));
                  setCalendarOpen((open) => !open);
                }}
                className="flex min-h-[76px] w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 text-left shadow-sm transition hover:border-primary-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-100"
              >
                <span>
                  <span className="block text-sm font-medium text-gray-700">Date</span>
                  <span className={`mt-0.5 block text-base ${travelDate ? 'text-gray-900' : 'text-gray-400'}`}>{travelDate ? formatDate(travelDate) : 'dd/mm/yyyy'}</span>
                </span>
                <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5 text-primary-800">
                  <rect x="3.5" y="5" width="17" height="16" rx="2" />
                  <path d="M7.5 3v4M16.5 3v4M3.5 9.5h17M8 13h.01M12 13h.01M16 13h.01M8 17h.01M12 17h.01" />
                </svg>
              </button>
              {calendarOpen && (
                <div className="absolute left-0 top-[calc(100%+8px)] z-40 w-[min(340px,calc(100vw-2rem))] rounded-xl border border-slate-200 bg-white p-4 shadow-xl" role="dialog" aria-label="Choose journey date">
                  <div className="mb-3 flex items-center justify-between">
                    <button type="button" aria-label="Previous month" onClick={() => setVisibleMonth(new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() - 1, 1))} className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-primary-900">
                      <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5"><path d="m15 18-6-6 6-6" /></svg>
                    </button>
                    <span className="text-sm font-medium text-slate-800">{monthLabel}</span>
                    <button type="button" aria-label="Next month" onClick={() => setVisibleMonth(new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 1))} className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-primary-900">
                      <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5"><path d="m9 18 6-6-6-6" /></svg>
                    </button>
                  </div>
                  <div className="grid grid-cols-7 text-center text-xs font-semibold text-slate-700">
                    {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((day) => <span key={day} className="py-2">{day}</span>)}
                  </div>
                  <div className="grid grid-cols-7 text-center">
                    {calendarDays.map((day) => {
                      const iso = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`;
                      const isSelected = selectedDate && day.toDateString() === selectedDate.toDateString();
                      const isCurrentMonth = day.getMonth() === visibleMonth.getMonth();
                      const disabled = iso < minDate;
                      return (
                        <button
                          key={iso}
                          type="button"
                          disabled={disabled}
                          onClick={() => selectCalendarDay(day)}
                          className={`mx-auto my-0.5 flex h-9 w-9 items-center justify-center rounded-md text-sm transition ${isSelected ? 'bg-primary-800 text-white' : isCurrentMonth ? 'text-slate-800 hover:bg-primary-50 hover:text-primary-900' : 'text-slate-400 hover:bg-slate-50'} disabled:cursor-not-allowed disabled:text-slate-300 disabled:hover:bg-transparent`}
                        >{day.getDate()}</button>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          ) : (
            <>
          <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
          <input
            type="date"
            value={travelDate}
            onChange={(e) => setTravelDate(e.target.value)}
            min={minDate}
            className="input-field"
          />
            </>
          )}
        </div>
        <div className={hero ? 'flex items-end' : 'flex items-end'}>
          <Button type="submit" loading={isSearching} className={hero ? 'min-h-[76px] w-full rounded-full py-3 text-base sm:min-w-64' : compact ? 'w-full rounded-full bg-blue-700 px-5 hover:bg-blue-800' : 'w-full'}>
            {submitLabel}
            {(hero || compact) && (
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
