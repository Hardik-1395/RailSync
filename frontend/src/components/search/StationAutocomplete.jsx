import { useState, useEffect, useRef } from 'react';
import { useDebounce } from '../../hooks/useDebounce';
import { searchApi } from '../../api/search.api';

export default function StationAutocomplete({ label, value, displayValue, onChange, placeholder, hero = false }) {
  const [query, setQuery] = useState(displayValue || value || '');
  const [suggestions, setSuggestions] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searchActive, setSearchActive] = useState(false);
  const debouncedQuery = useDebounce(query, 300);
  const wrapperRef = useRef(null);

  useEffect(() => {
    if (!searchActive || debouncedQuery.trim().length < 2) {
      setSuggestions([]);
      setOpen(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    searchApi.autocomplete(debouncedQuery).then((res) => {
      if (!cancelled) {
        setSuggestions(res.data || []);
        setOpen(true);
      }
    }).catch(() => {
      if (!cancelled) setSuggestions([]);
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; };
  }, [debouncedQuery, searchActive]);

  useEffect(() => {
    function handleClickOutside(e) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Sync external selection changes (including a From/To swap).
  useEffect(() => {
    const nextQuery = displayValue || value || '';
    if (value !== undefined && nextQuery !== query) setQuery(nextQuery);
  }, [value, displayValue]);

  const handleSelect = (station) => {
    setQuery(`${station.name} (${station.code})`);
    setSearchActive(false);
    setSuggestions([]);
    onChange(station.code, station.name);
    setOpen(false);
  };

  return (
    <div className={`relative ${hero ? 'rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm transition focus-within:border-primary-500 focus-within:ring-2 focus-within:ring-primary-100' : ''}`} ref={wrapperRef}>
      {label && <label className={`block text-sm font-medium text-gray-700 ${hero ? 'mb-1' : 'mb-1'}`}>{label}</label>}
      <div className={hero ? 'flex items-center gap-3' : ''}>
        {hero && (
          <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5 shrink-0 text-gray-500">
            <path d="M19 10.2c0 5.1-7 11-7 11s-7-5.9-7-11a7 7 0 1114 0z" />
            <circle cx="12" cy="10" r="2.2" />
          </svg>
        )}
        <input
          type="text"
          spellCheck={false}
          value={query}
          onChange={(e) => {
            const nextQuery = e.target.value;
            const canSearch = nextQuery.trim().length >= 2;
            setQuery(nextQuery);
            setSearchActive(canSearch);
            setSuggestions([]);
            setOpen(canSearch);
            if (!canSearch) onChange('', '');
          }}
          onFocus={() => { if (searchActive && suggestions.length > 0) setOpen(true); }}
          placeholder={placeholder}
          className={hero ? 'w-full border-0 bg-transparent p-0 text-base text-gray-900 placeholder:text-gray-400 focus:border-0 focus:outline-none focus:ring-0' : 'input-field'}
        />
      </div>
      {loading && (
        <div className={`absolute ${hero ? 'right-4 top-10' : 'right-3 top-[38px]'}`}>
          <div className="animate-spin h-4 w-4 border-b-2 border-primary-900 rounded-full" />
        </div>
      )}
      {open && (suggestions.length > 0 || loading) && (
        <ul className="absolute left-0 z-40 mt-1 max-h-72 w-full overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-xl">
          {suggestions.map((s) => (
            <li
              key={s.stationId || s.code}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => handleSelect(s)}
              className="flex cursor-pointer items-center justify-between gap-3 border-b border-slate-100 px-4 py-3 text-left last:border-b-0 hover:bg-primary-50"
            >
              <span className="min-w-0">
                <span className="block truncate text-xs font-bold uppercase tracking-wide text-slate-800">{s.name}</span>
                {s.city && <span className="mt-0.5 block truncate text-xs text-slate-500">{s.city}</span>}
              </span>
              <span className="shrink-0 text-xs font-medium text-slate-500">{s.code}</span>
            </li>
          ))}
          {loading && <li className="px-4 py-3 text-sm text-slate-500">Loading stations…</li>}
          {!loading && suggestions.length === 0 && <li className="px-4 py-3 text-sm text-slate-500">No stations found</li>}
        </ul>
      )}
    </div>
  );
}
