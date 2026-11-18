import { useState, useEffect, useRef } from 'react';
import { useDebounce } from '../../hooks/useDebounce';
import { searchApi } from '../../api/search.api';

export default function StationAutocomplete({ label, value, displayValue, onChange, placeholder, hero = false }) {
  const [query, setQuery] = useState(displayValue || value || '');
  const [suggestions, setSuggestions] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const debouncedQuery = useDebounce(query, 300);
  const wrapperRef = useRef(null);

  useEffect(() => {
    if (debouncedQuery.length < 2) {
      setSuggestions([]);
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
  }, [debouncedQuery]);

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
            setQuery(e.target.value);
            if (e.target.value.length < 2) onChange('', '');
          }}
          onFocus={() => suggestions.length > 0 && setOpen(true)}
          placeholder={placeholder}
          className={hero ? 'w-full border-0 bg-transparent p-0 text-base text-gray-900 placeholder:text-gray-400 focus:border-0 focus:outline-none focus:ring-0' : 'input-field'}
        />
      </div>
      {loading && (
        <div className={`absolute ${hero ? 'right-4 top-10' : 'right-3 top-[38px]'}`}>
          <div className="animate-spin h-4 w-4 border-b-2 border-primary-900 rounded-full" />
        </div>
      )}
      {open && suggestions.length > 0 && (
        <ul className="absolute z-30 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {suggestions.map((s) => (
            <li
              key={s.stationId || s.code}
              onClick={() => handleSelect(s)}
              className="px-4 py-2.5 hover:bg-primary-50 cursor-pointer text-sm flex justify-between"
            >
              <span className="font-medium">{s.name}</span>
              <span className="text-gray-400 text-xs">{s.code}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
