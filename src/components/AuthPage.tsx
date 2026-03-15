import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import {
  Eye, EyeOff, Mail, Lock, User, ArrowRight,
  Loader2, CheckCircle2, AlertCircle, Coins, Trophy, Tv, KeyRound, Gift,
} from 'lucide-react';

type AuthMode = 'login' | 'register' | 'forgot';

interface AuthPageProps {
  onAuth: (user: { id: string; email: string; name: string }) => void;
  initialReferralCode?: string;
  onSetPendingReferralCode?: (code: string) => void;
}

export const AuthPage: React.FC<AuthPageProps> = ({
  onAuth,
  initialReferralCode,
  onSetPendingReferralCode,
}) => {
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [referralCode, setReferralCode] = useState(initialReferralCode ?? '');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (initialReferralCode && !referralCode) {
      setReferralCode(initialReferralCode);
    }
  }, [initialReferralCode, referralCode]);

  const reset = () => { setError(''); setSuccess(''); };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    reset();
    if (!email || !password) { setError('Please fill in all fields.'); return; }
    setLoading(true);
    const { data, error: err } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (err) { setError(err.message); return; }
    const user = data.user!;
    onAuth({
      id: user.id,
      email: user.email ?? '',
      name: user.user_metadata?.full_name ?? user.email?.split('@')[0] ?? 'User',
    });
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    reset();
    if (!name || !email || !password) { setError('Please fill in all fields.'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return; }
    const normalizedRef = referralCode.trim().toUpperCase();
    if (normalizedRef) onSetPendingReferralCode?.(normalizedRef);
    setLoading(true);
    const { data, error: err } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: name,
          referral_code_entered: normalizedRef || null,
        },
      },
    });
    setLoading(false);
    if (err) { setError(err.message); return; }
    if (data.user && !data.session) {
      setSuccess('Account created! Please check your email to confirm, then log in.');
      setMode('login');
      return;
    }
    if (data.user) {
      onAuth({
        id: data.user.id,
        email: data.user.email ?? '',
        name: name,
      });
    }
  };

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    reset();
    if (!email) { setError('Enter your email address.'); return; }
    setLoading(true);
    const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin,
    });
    setLoading(false);
    if (err) { setError(err.message); return; }
    setSuccess('Password reset link sent! Check your email.');
  };

  return (
    <div className="app-shell min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 flex flex-col">

      {/* ── Background blobs ── */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl" />
        <div className="absolute top-1/3 -right-40 w-96 h-96 bg-violet-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 left-1/3 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 flex flex-col min-h-screen">

        {/* ── Hero top ── */}
        <div className="flex-shrink-0 pt-10 pb-6 px-4 text-center">
          {/* Logo */}
          <div className="flex items-center justify-center gap-3 mb-6">
            <div className="w-14 h-14 bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl flex items-center justify-center shadow-2xl shadow-amber-500/30">
              <span className="text-white text-3xl font-black leading-none">G</span>
            </div>
            <div className="text-left">
              <h1 className="text-white font-black text-3xl tracking-tight leading-none">GetMe</h1>
              <p className="text-amber-400 text-xs font-semibold tracking-widest uppercase">Earn · Withdraw · Repeat</p>
            </div>
          </div>

          {/* Feature pills */}
          <div className="flex flex-wrap items-center justify-center gap-2 mb-2">
            {[
              { icon: <Coins size={11} />, label: 'Earn Coins' },
              { icon: <Tv size={11} />, label: 'Watch Ads' },
              { icon: <KeyRound size={11} />, label: 'CAPTCHA Tasks' },
              { icon: <Trophy size={11} />, label: 'Leaderboard' },
            ].map((f) => (
              <span
                key={f.label}
                className="flex items-center gap-1.5 bg-white/5 border border-white/10 text-white/70 text-[10px] font-semibold px-3 py-1 rounded-full"
              >
                {f.icon} {f.label}
              </span>
            ))}
          </div>
        </div>

        {/* ── Auth Card ── */}
        <div className="flex-1 flex items-start justify-center px-4 pb-10">
          <div className="w-full max-w-md">
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl overflow-hidden">

              {/* Tab switcher (login / register) */}
              {mode !== 'forgot' && (
                <div className="grid grid-cols-2 border-b border-white/10">
                  {(['login', 'register'] as const).map((m) => (
                    <button
                      key={m}
                      onClick={() => { setMode(m); reset(); }}
                      className={`py-4 text-sm font-black transition-all duration-200 ${
                        mode === m
                          ? 'text-amber-400 bg-amber-500/10 border-b-2 border-amber-400'
                          : 'text-white/40 hover:text-white/60'
                      }`}
                    >
                      {m === 'login' ? '🔑 Sign In' : '🚀 Create Account'}
                    </button>
                  ))}
                </div>
              )}

              <div className="p-6 sm:p-8 space-y-5">

                {/* Forgot header */}
                {mode === 'forgot' && (
                  <div className="text-center space-y-1 mb-2">
                    <div className="w-12 h-12 bg-amber-500/20 rounded-2xl flex items-center justify-center mx-auto mb-3">
                      <Mail size={22} className="text-amber-400" />
                    </div>
                    <h2 className="text-white font-black text-xl">Reset Password</h2>
                    <p className="text-white/40 text-sm">Enter your email and we'll send a reset link</p>
                  </div>
                )}

                {/* Error / Success banners */}
                {error && (
                  <div className="flex items-start gap-3 bg-red-500/10 border border-red-500/30 rounded-2xl px-4 py-3">
                    <AlertCircle size={16} className="text-red-400 flex-shrink-0 mt-0.5" />
                    <p className="text-red-300 text-sm font-medium leading-snug">{error}</p>
                  </div>
                )}
                {success && (
                  <div className="flex items-start gap-3 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl px-4 py-3">
                    <CheckCircle2 size={16} className="text-emerald-400 flex-shrink-0 mt-0.5" />
                    <p className="text-emerald-300 text-sm font-medium leading-snug">{success}</p>
                  </div>
                )}

                {/* ── Register form ── */}
                {mode === 'register' && (
                  <form onSubmit={handleRegister} className="space-y-4">
                    <InputField
                      icon={<User size={16} />}
                      type="text"
                      placeholder="Full Name"
                      value={name}
                      onChange={setName}
                    />
                    <InputField
                      icon={<Mail size={16} />}
                      type="email"
                      placeholder="Email address"
                      value={email}
                      onChange={setEmail}
                    />
                    <InputField
                      icon={<Lock size={16} />}
                      type={showPass ? 'text' : 'password'}
                      placeholder="Password (min 6 chars)"
                      value={password}
                      onChange={setPassword}
                      right={
                        <button type="button" onClick={() => setShowPass(!showPass)} className="text-white/30 hover:text-white/60 transition-colors">
                          {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      }
                    />
                    <InputField
                      icon={<Gift size={16} />}
                      type="text"
                      placeholder="Referral Code (optional)"
                      value={referralCode}
                      onChange={setReferralCode}
                    />
                    {referralCode.trim() && (
                      <p className="text-emerald-300 text-xs font-semibold px-1">
                        Referral code will be auto-applied after account creation.
                      </p>
                    )}
                    <SubmitButton loading={loading} label="Create Account" />

                    <p className="text-center text-white/40 text-xs">
                      By creating an account, you agree to our{' '}
                      <span className="text-amber-400 cursor-pointer hover:underline">Terms</span> &{' '}
                      <span className="text-amber-400 cursor-pointer hover:underline">Privacy Policy</span>
                    </p>
                  </form>
                )}

                {/* ── Login form ── */}
                {mode === 'login' && (
                  <form onSubmit={handleLogin} className="space-y-4">
                    <InputField
                      icon={<Mail size={16} />}
                      type="email"
                      placeholder="Email address"
                      value={email}
                      onChange={setEmail}
                    />
                    <InputField
                      icon={<Lock size={16} />}
                      type={showPass ? 'text' : 'password'}
                      placeholder="Password"
                      value={password}
                      onChange={setPassword}
                      right={
                        <button type="button" onClick={() => setShowPass(!showPass)} className="text-white/30 hover:text-white/60 transition-colors">
                          {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      }
                    />
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => { setMode('forgot'); reset(); }}
                        className="text-amber-400 text-xs font-semibold hover:underline"
                      >
                        Forgot password?
                      </button>
                    </div>
                    <SubmitButton loading={loading} label="Sign In" />
                  </form>
                )}

                {/* ── Forgot form ── */}
                {mode === 'forgot' && (
                  <form onSubmit={handleForgot} className="space-y-4">
                    <InputField
                      icon={<Mail size={16} />}
                      type="email"
                      placeholder="Your email address"
                      value={email}
                      onChange={setEmail}
                    />
                    <SubmitButton loading={loading} label="Send Reset Link" />
                    <button
                      type="button"
                      onClick={() => { setMode('login'); reset(); }}
                      className="w-full text-center text-white/40 text-sm hover:text-white/70 transition-colors font-semibold"
                    >
                      ← Back to Sign In
                    </button>
                  </form>
                )}
              </div>
            </div>

            {/* ── Stats bar ── */}
            <div className="mt-6 grid grid-cols-3 gap-3">
              {[
                { value: '50K+', label: 'Users Earning' },
                { value: '₹10L+', label: 'Paid Out' },
                { value: '4.8★', label: 'User Rating' },
              ].map((s) => (
                <div key={s.label} className="bg-white/5 border border-white/10 rounded-2xl p-3 text-center">
                  <p className="text-amber-400 font-black text-lg leading-none">{s.value}</p>
                  <p className="text-white/40 text-[10px] font-semibold mt-1">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ── Sub-components ── */

const InputField: React.FC<{
  icon: React.ReactNode;
  type: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  right?: React.ReactNode;
}> = ({ icon, type, placeholder, value, onChange, right }) => (
  <div className="relative flex items-center bg-white/5 border border-white/10 rounded-2xl focus-within:border-amber-400/50 focus-within:bg-white/8 transition-all duration-200">
    <div className="pl-4 text-white/30 flex-shrink-0">{icon}</div>
    <input
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="flex-1 bg-transparent text-white placeholder-white/30 text-sm font-medium px-3 py-4 outline-none"
      style={{ fontSize: '16px' }}
    />
    {right && <div className="pr-4 flex-shrink-0">{right}</div>}
  </div>
);

const SubmitButton: React.FC<{ loading: boolean; label: string }> = ({ loading, label }) => (
  <button
    type="submit"
    disabled={loading}
    className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-500 hover:to-orange-600 disabled:opacity-60 text-white font-black text-sm py-4 rounded-2xl shadow-lg shadow-amber-500/30 transition-all duration-200 active:scale-[0.98]"
  >
    {loading ? (
      <Loader2 size={18} className="animate-spin" />
    ) : (
      <>
        {label}
        <ArrowRight size={16} />
      </>
    )}
  </button>
);
