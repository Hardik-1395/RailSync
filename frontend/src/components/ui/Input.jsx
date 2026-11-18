import { forwardRef, useId, useState } from 'react';

const Input = forwardRef(function Input({ label, error, className = '', type = 'text', id, ...inputProps }, ref) {
  const generatedId = useId();
  const inputId = id || generatedId;
  const isPassword = type === 'password';
  const [passwordVisible, setPasswordVisible] = useState(false);
  const inputType = isPassword && passwordVisible ? 'text' : type;

  return (
    <div className={className}>
      {label && <label htmlFor={inputId} className="block text-sm font-medium text-gray-700 mb-1">{label}</label>}
      <div className={isPassword ? 'relative' : undefined}>
        <input
          {...inputProps}
          ref={ref}
          id={inputId}
          type={inputType}
          className={`input-field ${isPassword ? 'pr-12' : ''} ${error ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}`}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setPasswordVisible((visible) => !visible)}
            aria-label={passwordVisible ? 'Hide password' : 'Show password'}
            aria-pressed={passwordVisible}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-2 text-gray-500 hover:text-primary-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-700"
          >
            {passwordVisible ? (
              <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
                <path d="M3 3l18 18" />
                <path d="M10.6 10.6a2 2 0 002.8 2.8" />
                <path d="M9.9 5.2A10.8 10.8 0 0112 5c5.2 0 8.7 4.3 9.7 6.2a1.7 1.7 0 010 1.6 13.5 13.5 0 01-3.1 3.8" />
                <path d="M6.2 6.2a13.5 13.5 0 00-3.9 5 1.7 1.7 0 000 1.6C3.3 14.7 6.8 19 12 19c1.1 0 2.1-.2 3-.5" />
              </svg>
            ) : (
              <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
                <path d="M2.3 12s3.5-7 9.7-7 9.7 7 9.7 7-3.5 7-9.7 7-9.7-7-9.7-7z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            )}
          </button>
        )}
      </div>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
});

export default Input;
