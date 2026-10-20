import React, { useState } from 'react';
import { User } from 'firebase/auth';
import {
  X,
  Mail,
  Lock,
  User as UserIcon,
  Eye,
  EyeOff,
  Sparkles,
  ShieldCheck,
  KeyRound,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  Copy,
  Check,
} from 'lucide-react';
import {
  googleSignIn,
  signInWithEmail,
  registerWithEmail,
  sendPasswordReset,
  sendMagicSignInLink,
  resolveMfaTotpSignIn,
  getFriendlyAuthError,
} from '../firebase';
import { MultiFactorResolver } from 'firebase/auth';

export type AuthMode = 'signin' | 'signup' | 'forgot' | 'mfa' | 'magic';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: AuthMode;
  onSuccess?: (user: User) => void;
  isMandatory?: boolean;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  initialMode = 'signin',
  onSuccess,
  isMandatory = false,
}) => {
  const [mode, setMode] = useState<AuthMode>(isMandatory ? 'signup' : initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [totpCode, setTotpCode] = useState('');
  const [mfaResolver, setMfaResolver] = useState<MultiFactorResolver | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [unauthorizedDomain, setUnauthorizedDomain] = useState<string | null>(null);
  const [domainCopied, setDomainCopied] = useState(false);

  if (!isOpen) return null;

  const resetFormState = () => {
    setErrorMsg(null);
    setSuccessMsg(null);
    setUnauthorizedDomain(null);
    setPassword('');
    setConfirmPassword('');
    setTotpCode('');
    setMfaResolver(null);
  };

  const switchMode = (newMode: AuthMode) => {
    resetFormState();
    setMode(newMode);
  };

  // Google OAuth Login
  const handleGoogleSignIn = async () => {
    try {
      setIsLoading(true);
      setErrorMsg(null);
      setUnauthorizedDomain(null);
      const res = await googleSignIn();
      if (res?.user) {
        if (onSuccess) onSuccess(res.user);
        onClose();
      }
    } catch (err: any) {
      if (err?.code === 'auth/unauthorized-domain') {
        const host = typeof window !== 'undefined' && window.location.hostname ? window.location.hostname : 'this domain';
        setUnauthorizedDomain(host);
      } else {
        setErrorMsg(getFriendlyAuthError(err));
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Email Sign In
  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setErrorMsg('Please enter both email and password.');
      return;
    }
    try {
      setIsLoading(true);
      setErrorMsg(null);
      const res = await signInWithEmail(email, password);
      if (res.mfaRequired && res.resolver) {
        setMfaResolver(res.resolver);
        setMode('mfa');
        setIsLoading(false);
        return;
      }
      if (res.user) {
        if (onSuccess) onSuccess(res.user);
        onClose();
      }
    } catch (err: any) {
      setErrorMsg(getFriendlyAuthError(err));
    } finally {
      setIsLoading(false);
    }
  };

  // Resolve MFA TOTP Login
  const handleMfaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mfaResolver || !totpCode.trim()) {
      setErrorMsg('Please enter the 6-digit code from your authenticator app.');
      return;
    }
    try {
      setIsLoading(true);
      setErrorMsg(null);
      const user = await resolveMfaTotpSignIn(mfaResolver, totpCode);
      if (onSuccess) onSuccess(user);
      onClose();
    } catch (err: any) {
      setErrorMsg(getFriendlyAuthError(err));
    } finally {
      setIsLoading(false);
    }
  };

  // Email Sign Up
  const handleEmailSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setErrorMsg('Please enter an email and password.');
      return;
    }
    if (password.length < 6) {
      setErrorMsg('Password must be at least 6 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMsg('Passwords do not match. Please re-enter.');
      return;
    }
    try {
      setIsLoading(true);
      setErrorMsg(null);
      const user = await registerWithEmail(email, password, displayName);
      if (onSuccess) onSuccess(user);
      onClose();
    } catch (err: any) {
      setErrorMsg(getFriendlyAuthError(err));
    } finally {
      setIsLoading(false);
    }
  };

  // Forgot Password / Reset
  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setErrorMsg('Please provide your registered account email.');
      return;
    }
    try {
      setIsLoading(true);
      setErrorMsg(null);
      await sendPasswordReset(email);
      setSuccessMsg(`A password reset link has been sent to ${email.trim()}. Please check your inbox and spam folder.`);
    } catch (err: any) {
      setErrorMsg(getFriendlyAuthError(err));
    } finally {
      setIsLoading(false);
    }
  };

  // Send Magic Sign-In Link (Passwordless)
  const handleMagicLinkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setErrorMsg('Please enter your email address.');
      return;
    }
    try {
      setIsLoading(true);
      setErrorMsg(null);
      await sendMagicSignInLink(email.trim());
      setSuccessMsg(
        `A secure magic sign-in link has been sent to ${email.trim()}. Check your email and click the link to sign in instantly without a password.`
      );
    } catch (err: any) {
      setErrorMsg(getFriendlyAuthError(err));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150"
    >
      <div className="bg-[#212529] text-white w-full max-w-md rounded-xl shadow-2xl border border-neutral-700/80 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header Bar */}
        <div className="px-5 py-4 border-b border-neutral-700/80 flex items-center justify-between bg-gradient-to-r from-neutral-900 via-[#212529] to-neutral-900">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-950/80 border border-emerald-700/60 flex items-center justify-center overflow-hidden shrink-0">
              {mode === 'mfa' ? (
                <KeyRound className="w-4 h-4 text-emerald-400" />
              ) : mode === 'forgot' ? (
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
              ) : (
                <img
                  src="/logo.png"
                  alt="Axiom Wealth"
                  className="w-5 h-5 object-contain"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    const fallback = e.currentTarget.parentElement?.querySelector('.auth-logo-fallback');
                    if (fallback) fallback.classList.remove('hidden');
                  }}
                />
              )}
              <span className="auth-logo-fallback hidden text-emerald-400 font-bold font-mono text-xs">AW</span>
            </div>
            <div>
              <h2 className="text-sm font-extrabold uppercase tracking-wider text-neutral-100">
                {isMandatory && mode === 'signup'
                  ? 'Welcome to Axiom Wealth'
                  : isMandatory && mode === 'signin'
                  ? 'Sign In to Your Account'
                  : mode === 'signin'
                  ? 'Sign In to Axiom'
                  : mode === 'signup'
                  ? 'Create Your Account'
                  : mode === 'forgot'
                  ? 'Reset Password'
                  : mode === 'mfa'
                  ? 'Two-Factor Authentication'
                  : 'Passwordless Magic Link'}
              </h2>
              <p className="text-[11px] text-neutral-400 font-mono">
                {isMandatory && (mode === 'signup' || mode === 'signin')
                  ? 'Sign up or sign in to access your personal dashboard & ledger'
                  : mode === 'signin'
                  ? 'Access cloud sync & professional ledger'
                  : mode === 'signup'
                  ? 'Start tracking your net worth today'
                  : mode === 'forgot'
                  ? 'We will email you a secure recovery link'
                  : mode === 'mfa'
                  ? 'Enter 6-digit TOTP code to verify'
                  : 'Sign in instantly via secure email link'}
              </p>
            </div>
          </div>

          {!isMandatory && (
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition cursor-pointer"
              aria-label="Close modal"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4">
          {/* Domain Authorization Assistance Card */}
          {unauthorizedDomain && (
            <div className="p-3.5 bg-amber-950/70 border border-amber-600/80 rounded-lg text-xs space-y-2.5 shadow-md animate-in fade-in duration-100">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-1.5 text-amber-300 font-bold">
                  <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>Google Sign-In Domain Verification</span>
                </div>
                <button
                  type="button"
                  onClick={() => setUnauthorizedDomain(null)}
                  className="text-amber-400 hover:text-white text-[11px] font-semibold cursor-pointer"
                >
                  Dismiss
                </button>
              </div>
              <p className="text-neutral-300 text-[11px] leading-relaxed">
                Google OAuth is restricted because this Vercel deployment domain has not yet been registered in Firebase Authorized Domains.
              </p>
              <div className="flex items-center justify-between gap-2 p-2 bg-neutral-900/90 rounded border border-neutral-700 font-mono text-[11px] text-amber-200">
                <span className="truncate">{unauthorizedDomain}</span>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(unauthorizedDomain);
                    setDomainCopied(true);
                    setTimeout(() => setDomainCopied(false), 2000);
                  }}
                  className="flex items-center gap-1 px-2.5 py-1 rounded bg-amber-900/60 hover:bg-amber-800 text-amber-200 text-[10px] font-sans font-bold cursor-pointer shrink-0 transition"
                  title="Copy domain to paste into Firebase Console"
                >
                  {domainCopied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{domainCopied ? 'Copied!' : 'Copy Domain'}</span>
                </button>
              </div>
              <p className="text-[11px] text-emerald-400 font-medium pt-1.5 border-t border-amber-800/40">
                👉 You can sign in or register immediately using Email &amp; Password or Magic Link below.
              </p>
            </div>
          )}

          {/* Error Message Alert */}
          {errorMsg && (
            <div className="p-3 bg-red-950/80 border border-red-800 text-red-200 rounded-lg text-xs flex items-start justify-between gap-2 shadow-sm animate-in fade-in duration-100">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <div className="leading-relaxed">{errorMsg}</div>
              </div>
              <button
                type="button"
                onClick={() => setErrorMsg(null)}
                className="text-red-300 hover:text-white text-[11px] font-semibold shrink-0 cursor-pointer ml-1"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Success Message Alert */}
          {successMsg && (
            <div className="p-3 bg-emerald-950/80 border border-emerald-700 text-emerald-200 rounded-lg text-xs flex items-start gap-2 shadow-sm animate-in fade-in duration-100">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div className="leading-relaxed">{successMsg}</div>
            </div>
          )}

          {/* ================= VIEW: SIGN IN ================= */}
          {mode === 'signin' && (
            <div className="space-y-4">
              {/* Google OAuth Button */}
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2.5 py-2.5 px-4 bg-white hover:bg-neutral-100 text-neutral-900 rounded-lg font-bold text-xs shadow-md transition cursor-pointer disabled:opacity-50"
              >
                <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="w-4 h-4">
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                </svg>
                <span>Continue with Google</span>
              </button>

              <div className="relative flex items-center justify-center">
                <div className="border-t border-neutral-700 w-full" />
                <span className="bg-[#212529] px-2.5 text-[10px] text-neutral-400 font-medium uppercase tracking-wider">
                  or sign in with email
                </span>
              </div>

              {/* Email + Password Form */}
              <form onSubmit={handleEmailSignIn} className="space-y-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-neutral-300 flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Email Address</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-xs text-white placeholder-neutral-500 focus:outline-hidden focus:border-emerald-500"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-semibold text-neutral-300 flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Password</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => switchMode('forgot')}
                      className="text-[11px] text-emerald-400 hover:text-emerald-300 transition cursor-pointer"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-neutral-900 border border-neutral-700 rounded-lg pl-3 pr-9 py-2 text-xs text-white placeholder-neutral-500 focus:outline-hidden focus:border-emerald-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-200 cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold text-xs shadow-md transition cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5 mt-2"
                >
                  {isLoading ? 'Signing In...' : 'Sign In'}
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </form>

              <div className="flex items-center justify-center pt-1">
                <button
                  type="button"
                  onClick={() => switchMode('magic')}
                  className="text-[11px] text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1 cursor-pointer transition"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Email me a Passwordless Magic Link</span>
                </button>
              </div>

              <div className="text-center pt-2 border-t border-neutral-700/80 text-xs text-neutral-400">
                Don't have an account?{' '}
                <button
                  type="button"
                  onClick={() => switchMode('signup')}
                  className="text-emerald-400 font-bold hover:underline cursor-pointer"
                >
                  Sign Up
                </button>
              </div>
            </div>
          )}

          {/* ================= VIEW: SIGN UP ================= */}
          {mode === 'signup' && (
            <div className="space-y-4">
              <form onSubmit={handleEmailSignUp} className="space-y-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-neutral-300 flex items-center gap-1.5">
                    <UserIcon className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Full Name / Display Name</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Your full name"
                    className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-xs text-white placeholder-neutral-500 focus:outline-hidden focus:border-emerald-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-neutral-300 flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Email Address</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-xs text-white placeholder-neutral-500 focus:outline-hidden focus:border-emerald-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-neutral-300 flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Password (min. 6 characters)</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-neutral-900 border border-neutral-700 rounded-lg pl-3 pr-9 py-2 text-xs text-white placeholder-neutral-500 focus:outline-hidden focus:border-emerald-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-200 cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-neutral-300 flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Confirm Password</span>
                  </label>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-xs text-white placeholder-neutral-500 focus:outline-hidden focus:border-emerald-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold text-xs shadow-md transition cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5 mt-2"
                >
                  {isLoading ? 'Creating Account...' : 'Create Account'}
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </form>

              <div className="relative flex items-center justify-center">
                <div className="border-t border-neutral-700 w-full" />
                <span className="bg-[#212529] px-2.5 text-[10px] text-neutral-400 font-medium uppercase tracking-wider">
                  or
                </span>
              </div>

              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2.5 py-2.5 px-4 bg-white hover:bg-neutral-100 text-neutral-900 rounded-lg font-bold text-xs shadow-md transition cursor-pointer disabled:opacity-50"
              >
                <span>Continue with Google</span>
              </button>

              <div className="text-center pt-2 border-t border-neutral-700/80 text-xs text-neutral-400">
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => switchMode('signin')}
                  className="text-emerald-400 font-bold hover:underline cursor-pointer"
                >
                  Sign In
                </button>
              </div>
            </div>
          )}

          {/* ================= VIEW: FORGOT PASSWORD ================= */}
          {mode === 'forgot' && (
            <div className="space-y-4">
              <p className="text-xs text-neutral-300 leading-relaxed">
                Enter your registered email address below. We'll send you a password reset email from Firebase Authentication to create a new password.
              </p>

              <form onSubmit={handleForgotPassword} className="space-y-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-neutral-300 flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Registered Email Address</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-xs text-white placeholder-neutral-500 focus:outline-hidden focus:border-emerald-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold text-xs shadow-md transition cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  {isLoading ? 'Sending Link...' : 'Send Password Reset Link'}
                </button>
              </form>

              <div className="text-center pt-2 border-t border-neutral-700/80 text-xs text-neutral-400">
                Remember your password?{' '}
                <button
                  type="button"
                  onClick={() => switchMode('signin')}
                  className="text-emerald-400 font-bold hover:underline cursor-pointer"
                >
                  Back to Sign In
                </button>
              </div>
            </div>
          )}

          {/* ================= VIEW: MFA / 2FA CHALLENGE ================= */}
          {mode === 'mfa' && (
            <div className="space-y-4">
              <div className="p-3 bg-amber-950/70 border border-amber-600/70 text-amber-200 rounded-lg text-xs leading-relaxed">
                Two-factor authentication is active on this account. Open your Authenticator app (e.g. Google Authenticator, Authy) and enter the current 6-digit code.
              </div>

              <form onSubmit={handleMfaSubmit} className="space-y-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-neutral-300 flex items-center gap-1.5">
                    <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                    <span>6-Digit Verification Code</span>
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    pattern="[0-9]{6}"
                    autoFocus
                    value={totpCode}
                    onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="123456"
                    className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2.5 text-center font-mono text-lg tracking-widest text-emerald-400 placeholder-neutral-600 focus:outline-hidden focus:border-emerald-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isLoading || totpCode.length < 6}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold text-xs shadow-md transition cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  {isLoading ? 'Verifying Code...' : 'Verify Code & Sign In'}
                </button>
              </form>

              <div className="text-center pt-2 border-t border-neutral-700/80 text-xs text-neutral-400">
                Having trouble?{' '}
                <button
                  type="button"
                  onClick={() => switchMode('signin')}
                  className="text-emerald-400 font-bold hover:underline cursor-pointer"
                >
                  Back to Sign In
                </button>
              </div>
            </div>
          )}

          {/* ================= VIEW: PASSWORDLESS MAGIC LINK ================= */}
          {mode === 'magic' && (
            <div className="space-y-4">
              <p className="text-xs text-neutral-300 leading-relaxed">
                Enter your email address. We'll send you an authorized Firebase magic link so you can sign in directly with a single click, completely password-free.
              </p>

              <form onSubmit={handleMagicLinkSubmit} className="space-y-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-neutral-300 flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Your Email Address</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-xs text-white placeholder-neutral-500 focus:outline-hidden focus:border-emerald-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold text-xs shadow-md transition cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{isLoading ? 'Sending Magic Link...' : 'Send Magic Sign-In Link'}</span>
                </button>
              </form>

              <div className="text-center pt-2 border-t border-neutral-700/80 text-xs text-neutral-400">
                Prefer using your password?{' '}
                <button
                  type="button"
                  onClick={() => switchMode('signin')}
                  className="text-emerald-400 font-bold hover:underline cursor-pointer"
                >
                  Sign In with Password
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
