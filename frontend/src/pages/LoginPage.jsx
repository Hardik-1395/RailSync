import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../store/auth.store';
import { authApi } from '../api/auth.api';
import { useToast } from '../components/ui/Toast';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';

const OTP_RESEND_DELAY_MS = 30_000;

export default function LoginPage() {
  const [tab, setTab] = useState('login'); // login | register | otp
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const setUser = useAuthStore((s) => s.setUser);
  const showToast = useToast();

  // Login form
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Register form
  const [regData, setRegData] = useState({ firstName: '', lastName: '', email: '', password: '', confirmPassword: '' });

  // OTP form
  const [otp, setOtp] = useState('');
  const [resendAvailableAt, setResendAvailableAt] = useState(0);
  const [resendSeconds, setResendSeconds] = useState(0);
  const [resending, setResending] = useState(false);
  const otpRequestInFlight = useRef(false);

  const redirect = searchParams.get('redirect') || '/';

  useEffect(() => {
    if (!resendAvailableAt) {
      setResendSeconds(0);
      return undefined;
    }

    const updateCountdown = () => {
      const remaining = Math.max(0, Math.ceil((resendAvailableAt - Date.now()) / 1000));
      setResendSeconds(remaining);
      if (remaining === 0) {
        setResendAvailableAt(0);
      }
    };

    updateCountdown();
    const intervalId = window.setInterval(updateCountdown, 1000);
    return () => window.clearInterval(intervalId);
  }, [resendAvailableAt]);

  const startResendCountdown = () => {
    const deadline = Date.now() + OTP_RESEND_DELAY_MS;
    setResendAvailableAt(deadline);
    setResendSeconds(Math.ceil(OTP_RESEND_DELAY_MS / 1000));
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await authApi.login(email, password);
      const user = res.loggedInUser || res.data?.user || res.data;
      setUser(user);
      showToast('Login successful!', 'success');
      navigate(redirect, { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (otpRequestInFlight.current) return;
    setError('');
    if (regData.password !== regData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    otpRequestInFlight.current = true;
    setLoading(true);
    try {
      await authApi.sendOtp(regData);
      startResendCountdown();
      showToast('OTP sent to your email!', 'success');
      setTab('otp');
    } catch (err) {
      setError(err.message);
    } finally {
      otpRequestInFlight.current = false;
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await authApi.verifyOtp(otp);
      setResendAvailableAt(0);
      setResendSeconds(0);
      showToast('Email verified! Please log in.', 'success');
      setEmail(regData.email);
      setTab('login');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendSeconds > 0 || otpRequestInFlight.current) return;

    otpRequestInFlight.current = true;
    setResending(true);
    setError('');
    try {
      await authApi.sendOtp(regData);
      startResendCountdown();
      showToast('A new OTP has been sent to your email.', 'success');
    } catch (err) {
      setError(err.message);
    } finally {
      otpRequestInFlight.current = false;
      setResending(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-primary-900">Welcome to IRCTC</h1>
          <p className="text-gray-500 mt-2">Book train tickets seamlessly</p>
        </div>

        <div className="card">
          {/* Tabs */}
          {tab !== 'otp' && (
            <div className="flex mb-6 border-b">
              <button
                onClick={() => { setTab('login'); setError(''); }}
                className={`flex-1 pb-3 text-sm font-semibold border-b-2 transition-colors ${
                  tab === 'login' ? 'border-primary-900 text-primary-900' : 'border-transparent text-gray-400 hover:text-gray-600'
                }`}
              >
                Login
              </button>
              <button
                onClick={() => { setTab('register'); setError(''); }}
                className={`flex-1 pb-3 text-sm font-semibold border-b-2 transition-colors ${
                  tab === 'register' ? 'border-primary-900 text-primary-900' : 'border-transparent text-gray-400 hover:text-gray-600'
                }`}
              >
                Register
              </button>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3 mb-4">
              {error}
            </div>
          )}

          {/* Login Form */}
          {tab === 'login' && (
            <form onSubmit={handleLogin} className="space-y-4">
              <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Enter your email" required />
              <Input label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter your password" required autoComplete="current-password" />
              <Button type="submit" loading={loading} className="w-full">Sign In</Button>
            </form>
          )}

          {/* Register Form */}
          {tab === 'register' && (
            <form onSubmit={handleRegister} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <Input label="First Name" value={regData.firstName} onChange={(e) => setRegData({ ...regData, firstName: e.target.value })} required />
                <Input label="Last Name" value={regData.lastName} onChange={(e) => setRegData({ ...regData, lastName: e.target.value })} required />
              </div>
              <Input label="Email" type="email" value={regData.email} onChange={(e) => setRegData({ ...regData, email: e.target.value })} required />
              <Input label="Password" type="password" value={regData.password} onChange={(e) => setRegData({ ...regData, password: e.target.value })} required autoComplete="new-password" />
              <Input label="Confirm Password" type="password" value={regData.confirmPassword} onChange={(e) => setRegData({ ...regData, confirmPassword: e.target.value })} required autoComplete="new-password" />
              <Button type="submit" loading={loading} className="w-full">Create Account</Button>
            </form>
          )}

          {/* OTP Form */}
          {tab === 'otp' && (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <p className="text-sm text-gray-600 mb-2">
                We've sent a verification code to <strong>{regData.email}</strong>
              </p>
              <Input label="OTP Code" value={otp} onChange={(e) => setOtp(e.target.value)} placeholder="Enter 6-digit OTP" maxLength={6} required />
              <Button type="submit" loading={loading} className="w-full">Verify OTP</Button>
              <div className="flex flex-col items-center gap-2 text-sm sm:flex-row sm:justify-center sm:gap-3">
                <Button
                  type="button"
                  variant="secondary"
                  loading={resending}
                  disabled={resendSeconds > 0 || loading || resending}
                  onClick={handleResendOtp}
                  className="w-full sm:w-auto"
                >
                  Resend OTP
                </Button>
                {resendSeconds > 0 ? (
                  <span role="status" aria-live="polite" className="text-gray-500">
                    Available in 00:{String(resendSeconds).padStart(2, '0')}
                  </span>
                ) : (
                  <span className="text-gray-500">You can request a new code.</span>
                )}
              </div>
              <button type="button" onClick={() => setTab('register')} className="text-sm text-primary-700 hover:underline w-full text-center">
                Back to register
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
