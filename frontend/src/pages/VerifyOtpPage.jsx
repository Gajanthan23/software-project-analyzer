/**
 * pages/VerifyOtpPage.jsx
 * 
 * OTP Email verification component.
 * Accepts 6-digit verification code, supports resend with cooldown timer,
 * and handles login transition on successful verification.
 */
import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, useLocation, Link } from 'react-router-dom';
import { authService } from '../services/authService';

export default function VerifyOtpPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  // Get email from location state or search params query (?email=...)
  const emailParam = location.state?.email || searchParams.get('email') || '';
  const initialMessage = location.state?.message || '';

  const [email, setEmail] = useState(emailParam);
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState(null);
  const [infoMessage, setInfoMessage] = useState(initialMessage);
  const [cooldown, setCooldown] = useState(0);

  // Cooldown countdown timer
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const handleOtpChange = (e) => {
    // Only allow numeric 6-digit code input
    const val = e.target.value.replace(/\D/g, '').slice(0, 6);
    setOtp(val);
    setError(null);
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    if (!email) {
      setError('Missing email address. Please register or sign in again.');
      return;
    }
    if (otp.length !== 6) {
      setError('Please enter a valid 6-digit verification code.');
      return;
    }

    setError(null);
    setInfoMessage(null);
    setLoading(true);

    try {
      await authService.verifyOtp({ email, otp });
      navigate('/dashboard');
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data?.errors?.[0] || 'Verification failed. Please check the code and try again.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (cooldown > 0 || resending) return;
    if (!email) {
      setError('Please enter your email address to resend the code.');
      return;
    }

    setError(null);
    setInfoMessage(null);
    setResending(true);

    try {
      const res = await authService.resendOtp({ email });
      setInfoMessage(res.message || 'Verification code resent successfully!');
      setCooldown(60); // 60 seconds cooldown timer
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data?.errors?.[0] || 'Failed to resend code. Please try again later.';
      setError(msg);
    } finally {
      setResending(false);
    }
  };

  return (
    <>
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold text-slate-100">Verify your email</h1>
        <p className="mt-1.5 text-sm text-slate-400">
          We sent a 6-digit verification code to
        </p>
        <p className="font-semibold text-indigo-400 text-sm mt-0.5 break-all">
          {email || 'your email address'}
        </p>
      </div>

      {infoMessage && (
        <div className="mb-6 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-xs text-emerald-300">
          ✓ {infoMessage}
        </div>
      )}

      {error && (
        <div className="mb-6 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-xs text-red-300">
          ⚠ {error}
        </div>
      )}

      <form className="space-y-5" onSubmit={handleVerify}>
        {!emailParam && (
          <div>
            <label htmlFor="verify-email" className="mb-1.5 block text-sm font-medium text-slate-300">
              Email address
            </label>
            <input
              id="verify-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="input"
              required
            />
          </div>
        )}

        <div>
          <label htmlFor="otp-input" className="mb-1.5 block text-sm font-medium text-slate-300">
            6-Digit Verification Code
          </label>
          <input
            id="otp-input"
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={6}
            value={otp}
            onChange={handleOtpChange}
            placeholder="000000"
            className="input text-center text-2xl tracking-[0.5em] font-mono py-3"
            required
            autoComplete="one-time-code"
            autoFocus
          />
        </div>

        <button
          type="submit"
          disabled={loading || otp.length !== 6}
          className="btn-primary w-full justify-center text-base py-2.5"
        >
          {loading ? 'Verifying...' : 'Verify Code'}
        </button>
      </form>

      <div className="mt-6 text-center text-sm text-slate-400 space-y-3">
        <p>
          Didn&apos;t receive a code?{' '}
          <button
            type="button"
            onClick={handleResend}
            disabled={cooldown > 0 || resending}
            className={`font-medium transition-colors ${
              cooldown > 0 || resending
                ? 'text-slate-600 cursor-not-allowed'
                : 'text-indigo-400 hover:text-indigo-300 underline underline-offset-4'
            }`}
          >
            {resending
              ? 'Sending...'
              : cooldown > 0
              ? `Resend code in ${cooldown}s`
              : 'Resend code'}
          </button>
        </p>

        <p className="text-xs text-slate-500">
          Wrong email?{' '}
          <Link to="/register" className="text-slate-400 hover:text-slate-300 underline">
            Register with a different address
          </Link>
        </p>
      </div>
    </>
  );
}
