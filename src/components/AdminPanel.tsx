import React, { useState, useEffect, useCallback } from 'react';
import {
  Shield, Settings, Wallet, ToggleRight,
  Save, RefreshCw, ChevronDown, ChevronUp, AlertTriangle, CheckCircle2,
  Bell, Lock, TrendingDown, DollarSign, Sliders,
  Activity, Database, Radio, Power, X, Info, Trophy, Eye, Users, Clock,
} from 'lucide-react';
import { AdminConfig, DEFAULT_CONFIG, getConfig, saveAdminConfig, loadAdminConfig } from '../lib/adminConfig';
import { supabase } from '../lib/supabase';
import { AuthUser } from '../types';

interface AdminPanelProps {
  user: AuthUser | null;
  isAdmin: boolean;
  onClose: () => void;
}

type AdminSection =
  | 'dashboard'
  | 'earning'
  | 'throttle'
  | 'features'
  | 'withdrawal'
  | 'leaderboard'
  | 'users'
  | 'announcement'
  | 'maintenance'
  | 'realtime';

interface ManagedUser {
  id: string;
  email: string;
  full_name: string;
  is_admin: boolean;
  coins: number;
  total_earned: number;
}

function Toggle({ value, onChange, color = 'emerald' }: { value: boolean; onChange: (v: boolean) => void; color?: string }) {
  const colors: Record<string, string> = {
    emerald: 'bg-emerald-500',
    red: 'bg-red-500',
    amber: 'bg-amber-500',
    blue: 'bg-blue-500',
    violet: 'bg-violet-500',
  };
  return (
    <button
      onClick={() => onChange(!value)}
      className={`relative w-12 h-6 rounded-full transition-all duration-300 flex-shrink-0 ${value ? colors[color] : 'bg-slate-300'}`}
      style={{ touchAction: 'manipulation' }}
    >
      <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-md transition-all duration-300 ${value ? 'left-6' : 'left-0.5'}`} />
    </button>
  );
}

function NumberInput({ label, value, onChange, min = 0, max = 999999, hint, prefix, suffix }: {
  label: string; value: number; onChange: (v: number) => void;
  min?: number; max?: number; hint?: string; prefix?: string; suffix?: string;
}) {
  return (
    <div>
      <label className="block text-xs font-black text-slate-300 mb-1.5 uppercase tracking-wider">{label}</label>
      <div className="flex items-center gap-0">
        {prefix && <span className="bg-slate-700 border border-slate-600 border-r-0 rounded-l-xl px-3 py-2.5 text-slate-400 text-sm font-bold">{prefix}</span>}
        <input
          type="number" min={min} max={max} value={value}
          onChange={e => onChange(Math.max(min, Math.min(max, parseInt(e.target.value) || 0)))}
          className={`flex-1 bg-slate-800 border border-slate-600 text-white font-black text-sm px-3 py-2.5 focus:outline-none focus:border-amber-500 transition-colors ${prefix ? 'rounded-r-none rounded-l-none' : suffix ? 'rounded-l-xl rounded-r-none' : 'rounded-xl'}`}
          style={{ fontSize: '16px' }}
        />
        {suffix && <span className="bg-slate-700 border border-slate-600 border-l-0 rounded-r-xl px-3 py-2.5 text-slate-400 text-sm font-bold">{suffix}</span>}
      </div>
      {hint && <p className="text-slate-500 text-xs mt-1">{hint}</p>}
    </div>
  );
}

function SectionCard({ title, icon, children, accent = 'amber' }: {
  title: string; icon: React.ReactNode; children: React.ReactNode; accent?: string;
}) {
  const [open, setOpen] = useState(true);
  const accents: Record<string, string> = {
    amber: 'from-amber-500 to-orange-500',
    violet: 'from-violet-500 to-purple-500',
    emerald: 'from-emerald-500 to-teal-500',
    red: 'from-red-500 to-rose-500',
    blue: 'from-blue-500 to-indigo-500',
    cyan: 'from-cyan-500 to-blue-500',
    rose: 'from-rose-500 to-pink-500',
  };
  return (
    <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 px-5 py-4 hover:bg-slate-700/30 transition-colors"
      >
        <div className={`w-8 h-8 rounded-xl bg-gradient-to-br ${accents[accent]} flex items-center justify-center flex-shrink-0`}>
          {icon}
        </div>
        <span className="font-black text-white text-sm flex-1 text-left">{title}</span>
        {open ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
      </button>
      {open && (
        <div className="px-5 pb-5 space-y-4 border-t border-slate-700/50 pt-4">
          {children}
        </div>
      )}
    </div>
  );
}

function ToggleRow({ label, value, onChange, hint, color }: {
  label: string; value: boolean; onChange: (v: boolean) => void; hint?: string; color?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-2 border-b border-slate-700/40 last:border-0">
      <div className="flex-1">
        <p className="text-white text-sm font-semibold">{label}</p>
        {hint && <p className="text-slate-500 text-xs mt-0.5">{hint}</p>}
      </div>
      <Toggle value={value} onChange={onChange} color={color} />
    </div>
  );
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ user, isAdmin, onClose }) => {
  const [authenticated, setAuthenticated] = useState(isAdmin);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [config, setConfig] = useState<AdminConfig>({ ...DEFAULT_CONFIG, ...getConfig() });
  const [section, setSection] = useState<AdminSection>('dashboard');
  const [realtimeLogs, setRealtimeLogs] = useState<{ time: string; msg: string; type: 'info' | 'success' | 'warn' }[]>([]);
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);

  useEffect(() => {
    setAuthenticated(isAdmin);
  }, [isAdmin]);


  const addLog = useCallback((msg: string, type: 'info' | 'success' | 'warn' = 'info') => {
    const time = new Date().toLocaleTimeString('en-IN');
    setRealtimeLogs(l => [{ time, msg, type }, ...l].slice(0, 50));
  }, []);

  const loadUsers = useCallback(async () => {
    setUsersLoading(true);
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      addLog(`Failed to load users: ${error.message}`, 'warn');
      setUsersLoading(false);
      return;
    }

    const mapped = ((data ?? []) as Record<string, unknown>[]).map((u) => ({
      id: String(u.id ?? u.user_id ?? ''),
      email: String(u.email ?? ''),
      full_name: String(u.full_name ?? 'User'),
      is_admin: Boolean(u.is_admin),
      coins: Number(u.coins ?? 0),
      total_earned: Number(u.total_earned ?? 0),
    }));

    setUsers(mapped);
    setUsersLoading(false);
  }, [addLog]);

  const setUserAdmin = useCallback(async (uid: string, next: boolean) => {
    let { error } = await supabase
      .from('user_profiles')
      .update({ is_admin: next })
      .eq('id', uid);

    if (error) {
      const fallback = await supabase
        .from('user_profiles')
        .update({ is_admin: next })
        .eq('user_id', uid);
      error = fallback.error;
    }

    if (error) {
      addLog(`Admin update failed: ${error.message}`, 'warn');
      return;
    }

    setUsers((prev) => prev.map((u) => (u.id === uid ? { ...u, is_admin: next } : u)));
    addLog(`User ${uid.slice(0, 8)} admin ${next ? 'enabled' : 'disabled'}`, 'success');
  }, [addLog]);

  // Load config + subscribe to realtime
  useEffect(() => {
    if (!authenticated) return;
    loadAdminConfig().then(() => {
      setConfig({ ...DEFAULT_CONFIG, ...getConfig() });
      addLog('Admin config loaded from Supabase', 'success');
    });

    // Subscribe to realtime config changes
    const ch = supabase
      .channel('admin-panel-watch')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'admin_config' }, (p) => {
        setConfig(prev => ({ ...prev, ...(p.new as Partial<AdminConfig>) }));
        addLog('⚡ Config updated via Supabase realtime', 'success');
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'referrals' }, () => {
        addLog('👥 New referral registered', 'info');
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') addLog('🔴 Realtime connected', 'success');
      });

    return () => { supabase.removeChannel(ch); };
  }, [authenticated, addLog]);

  useEffect(() => {
    if (!authenticated) return;
    if (section !== 'users') return;
    void loadUsers();
  }, [authenticated, section, loadUsers]);

  const handleSave = useCallback(async () => {
    setSaveError(null);
    setSaving(true);
    const result = await saveAdminConfig(config);
    setSaving(false);
    if (result.ok) {
      setSaved(true);
      setDirty(false);
      addLog('✅ Config saved to Supabase', 'success');
      setTimeout(() => setSaved(false), 3000);
    } else {
      const message = result.error || 'Failed to save admin config';
      setSaveError(message);
      setDirty(false);
      addLog(`❌ Save failed: ${message}`, 'warn');
    }
  }, [addLog, config]);

  const update = (key: keyof AdminConfig, val: unknown) => {
    setConfig(prev => ({ ...prev, [key]: val }));
    setDirty(true);
  };

  useEffect(() => {
    if (!authenticated || !dirty) return;
    const timeout = setTimeout(() => {
      void handleSave();
    }, 900);
    return () => clearTimeout(timeout);
  }, [authenticated, dirty, config, handleSave]);

  // Keep admin panel interactions working normally.
  // Do not intercept events at capture phase; that can block tab/button clicks.

  // ── NOT AUTHENTICATED ──────────────────────────────────────────
  if (!authenticated) {
    return (
      <div className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="w-full max-w-sm bg-slate-900 border border-slate-700 rounded-3xl overflow-hidden shadow-2xl">
          {/* Header */}
          <div className="relative bg-gradient-to-br from-slate-800 to-slate-900 p-6 text-center border-b border-slate-700">
            <div className="absolute top-4 right-4">
              <button onClick={onClose} className="w-8 h-8 rounded-xl bg-slate-700 flex items-center justify-center hover:bg-slate-600 transition">
                <X size={15} className="text-slate-300" />
              </button>
            </div>
            <div className="w-16 h-16 bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-2xl shadow-amber-500/30">
              <Shield size={30} className="text-white" />
            </div>
            <h2 className="text-xl font-black text-white">Admin Panel</h2>
            <p className="text-slate-400 text-sm mt-1">Access denied for this account</p>
          </div>

          <div className="p-6 space-y-4">
            <div>
              <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-2">Signed In Email</label>
              <div className="bg-slate-800 border border-slate-600 rounded-xl px-4 py-3 text-slate-400 text-sm font-mono">
                {user?.email || 'Not logged in'}
              </div>
            </div>

            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3.5 flex items-start gap-2.5">
              <AlertTriangle size={13} className="text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-red-200 text-xs leading-relaxed">
                This account is not marked as admin in Supabase. Ask a super admin to set
                <span className="font-mono"> user_profiles.is_admin = true</span>.
              </p>
            </div>

            <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-3.5 flex items-start gap-2.5">
              <Info size={13} className="text-amber-400 flex-shrink-0 mt-0.5" />
              <p className="text-slate-400 text-xs leading-relaxed">
                Admin access is controlled only from Supabase. No hardcoded emails or local passwords.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── ADMIN SECTIONS NAV ──────────────────────────────────────────
  const navItems: { id: AdminSection; label: string; icon: React.ReactNode; color: string }[] = [
    { id: 'dashboard',    label: 'Dashboard',   icon: <Activity size={14} />,    color: 'text-amber-400'  },
    { id: 'earning',      label: 'Earning',      icon: <DollarSign size={14} />,  color: 'text-emerald-400'},
    { id: 'throttle',     label: 'Throttle',     icon: <TrendingDown size={14} />,color: 'text-red-400'    },
    { id: 'features',     label: 'Features',     icon: <Sliders size={14} />,     color: 'text-violet-400' },
    { id: 'withdrawal',   label: 'Withdraw',     icon: <Wallet size={14} />,      color: 'text-blue-400'   },
    { id: 'leaderboard',  label: 'Leaderboard',  icon: <Trophy size={14} />,      color: 'text-yellow-400' },
    { id: 'users',        label: 'Users',        icon: <Users size={14} />,       color: 'text-cyan-400'   },
    { id: 'announcement', label: 'Announce',     icon: <Bell size={14} />,        color: 'text-pink-400'   },
    { id: 'maintenance',  label: 'Maintenance',  icon: <Power size={14} />,       color: 'text-orange-400' },
    { id: 'realtime',     label: 'Realtime',     icon: <Radio size={14} />,       color: 'text-cyan-400'   },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-slate-950 overflow-y-auto">

      {/* ── TOP BAR ── */}
      <div className="sticky top-0 z-10 bg-slate-900/95 backdrop-blur border-b border-slate-700/50">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center flex-shrink-0">
            <Shield size={16} className="text-white" />
          </div>
          <div className="flex-1">
            <h1 className="text-white font-black text-sm leading-none">GetMe Admin</h1>
            <p className="text-slate-500 text-[10px] font-mono mt-0.5">{user?.email}</p>
          </div>
          <div className="flex items-center gap-2">
            {dirty && !saving && !saved && (
              <span className="text-[10px] font-black uppercase tracking-wide px-2 py-1 rounded-md border border-amber-500/40 bg-amber-500/15 text-amber-300">
                Unsaved
              </span>
            )}
            {saved && (
              <span className="flex items-center gap-1 bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-xs font-bold px-2.5 py-1 rounded-lg">
                <CheckCircle2 size={12} /> Saved!
              </span>
            )}
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-1.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-black text-xs px-3.5 py-2 rounded-xl transition-all active:scale-95 disabled:opacity-60"
            >
              {saving ? <RefreshCw size={12} className="animate-spin" /> : <Save size={12} />}
              Save All
            </button>
            <button onClick={onClose} className="w-8 h-8 rounded-xl bg-slate-800 flex items-center justify-center hover:bg-slate-700 transition border border-slate-700">
              <X size={15} className="text-slate-300" />
            </button>
          </div>
        </div>

        {/* Nav tabs */}
        <div className="max-w-5xl mx-auto px-4 pb-3 flex gap-1 overflow-x-auto scrollbar-none">
          {navItems.map(n => (
            <button
              key={n.id}
              onClick={() => setSection(n.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all flex-shrink-0 ${
                section === n.id
                  ? 'bg-slate-700 text-white'
                  : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800'
              }`}
            >
              <span className={section === n.id ? n.color : ''}>{n.icon}</span>
              {n.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── CONTENT ── */}
      <div className="max-w-5xl mx-auto px-4 py-6 space-y-4 pb-20">
        {saveError && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-red-300 text-xs font-semibold">
            Save failed: {saveError}
          </div>
        )}

        {/* ══════════════ DASHBOARD ══════════════ */}
        {section === 'dashboard' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'Survey Reward', val: `${config.survey_reward} 🪙`, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
                { label: 'CAPTCHA Reward', val: `${config.captcha_reward} 🪙`, color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20' },
                { label: 'Ad Reward', val: `${config.ad_reward} 🪙`, color: 'text-violet-400', bg: 'bg-violet-500/10 border-violet-500/20' },
                { label: 'Friend Cut', val: `${config.friend_cut_pct}%`, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
              ].map(s => (
                <div key={s.label} className={`${s.bg} border rounded-2xl p-4 text-center`}>
                  <p className={`text-2xl font-black ${s.color}`}>{s.val}</p>
                  <p className="text-slate-500 text-xs mt-1 font-semibold">{s.label}</p>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {[
                { label: 'Surveys', on: config.surveys_enabled },
                { label: 'CAPTCHA', on: config.captcha_enabled },
                { label: 'Ads', on: config.ads_enabled },
                { label: 'Referral', on: config.referral_enabled },
                { label: 'Wallet', on: config.wallet_enabled },
                { label: 'Maintenance', on: config.maintenance_mode },
              ].map(f => (
                <div key={f.label} className={`border rounded-xl p-3.5 flex items-center gap-3 ${f.on ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-slate-800/40 border-slate-700/40'}`}>
                  <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${f.on ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'}`} />
                  <span className={`text-sm font-bold ${f.on ? 'text-white' : 'text-slate-500'}`}>{f.label}</span>
                  <span className={`ml-auto text-xs font-black ${f.on ? 'text-emerald-400' : 'text-slate-600'}`}>{f.on ? 'ON' : 'OFF'}</span>
                </div>
              ))}
            </div>

            <div className="bg-slate-800/40 border border-slate-700/40 rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <TrendingDown size={15} className="text-red-400" />
                <h3 className="text-white font-black text-sm">Throttle System</h3>
                <span className="ml-auto text-xs bg-red-500/20 border border-red-500/30 text-red-400 px-2 py-0.5 rounded-lg font-bold">
                  Triggers at {config.throttle_threshold.toLocaleString()} 🪙
                </span>
              </div>
              <div className="grid grid-cols-3 gap-3 text-center">
                {[
                  { label: 'Survey', normal: config.survey_reward, throttled: config.throttle_survey_reward },
                  { label: 'CAPTCHA', normal: config.captcha_reward, throttled: config.throttle_captcha_reward },
                  { label: 'Ads', normal: config.ad_reward, throttled: config.throttle_ad_reward },
                ].map(t => (
                  <div key={t.label} className="bg-slate-900/60 rounded-xl p-3">
                    <p className="text-slate-400 text-xs font-bold mb-2">{t.label}</p>
                    <p className="text-emerald-400 text-lg font-black">{t.normal} 🪙</p>
                    <p className="text-slate-500 text-xs">↓ throttled</p>
                    <p className="text-red-400 text-lg font-black">{t.throttled} 🪙</p>
                  </div>
                ))}
              </div>
            </div>

            {config.announcement_enabled && (
              <div className={`border rounded-xl p-4 flex items-start gap-3 ${
                config.announcement_type === 'warning' ? 'bg-amber-500/10 border-amber-500/30' :
                config.announcement_type === 'error' ? 'bg-red-500/10 border-red-500/30' :
                config.announcement_type === 'success' ? 'bg-emerald-500/10 border-emerald-500/30' :
                'bg-blue-500/10 border-blue-500/30'
              }`}>
                <Bell size={15} className={
                  config.announcement_type === 'warning' ? 'text-amber-400' :
                  config.announcement_type === 'error' ? 'text-red-400' :
                  config.announcement_type === 'success' ? 'text-emerald-400' : 'text-blue-400'
                } />
                <p className="text-white text-sm font-semibold">{config.announcement_text || 'No message set'}</p>
              </div>
            )}
          </div>
        )}

        {/* ══════════════ EARNING RATES ══════════════ */}
        {section === 'earning' && (
          <div className="space-y-4">
            <SectionCard title="Task Rewards (Normal)" icon={<DollarSign size={15} className="text-white" />} accent="emerald">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <NumberInput
                  label="Survey Reward (per survey)"
                  value={config.survey_reward}
                  onChange={v => update('survey_reward', v)}
                  suffix="🪙" min={1} max={1000}
                  hint="Coins per completed survey"
                />
                <NumberInput
                  label="CAPTCHA Reward (per solve)"
                  value={config.captcha_reward}
                  onChange={v => update('captcha_reward', v)}
                  suffix="🪙" min={1} max={1000}
                  hint="Coins per CAPTCHA solved"
                />
                <NumberInput
                  label="Ad Reward (per ad)"
                  value={config.ad_reward}
                  onChange={v => update('ad_reward', v)}
                  suffix="🪙" min={1} max={1000}
                  hint="Coins per ad watched"
                />
              </div>
              <NumberInput
                label="Friend Referral Cut (%)"
                value={config.friend_cut_pct}
                onChange={v => update('friend_cut_pct', v)}
                suffix="%" min={0} max={100}
                hint="% of friend's earnings credited to referrer"
              />
            </SectionCard>

            <SectionCard title="Daily Limits" icon={<Sliders size={15} className="text-white" />} accent="blue">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <NumberInput
                  label="Survey Daily Limit"
                  value={config.survey_daily_limit}
                  onChange={v => update('survey_daily_limit', v)}
                  suffix="surveys" min={1} max={1000}
                  hint="Max surveys per user per day"
                />
                <NumberInput
                  label="CAPTCHA Daily Limit"
                  value={config.captcha_daily_limit}
                  onChange={v => update('captcha_daily_limit', v)}
                  suffix="tasks" min={1} max={1000}
                  hint="Max CAPTCHAs per user per day"
                />
                <NumberInput
                  label="Ad Daily Limit"
                  value={config.ad_daily_limit}
                  onChange={v => update('ad_daily_limit', v)}
                  suffix="ads" min={1} max={1000}
                  hint="Max ads per user per day"
                />
              </div>
            </SectionCard>

            <SectionCard title="Countdown Timers (Seconds)" icon={<Clock size={15} className="text-white" />} accent="violet">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <NumberInput
                  label="Survey Claim Wait"
                  value={config.survey_claim_wait_seconds}
                  onChange={v => update('survey_claim_wait_seconds', v)}
                  suffix="sec" min={1} max={120}
                  hint="Wait time before survey reward claim unlock"
                />
                <NumberInput
                  label="CAPTCHA Claim Wait"
                  value={config.captcha_claim_wait_seconds}
                  onChange={v => update('captcha_claim_wait_seconds', v)}
                  suffix="sec" min={1} max={120}
                  hint="Wait time before CAPTCHA claim button unlock"
                />
                <NumberInput
                  label="Ads Min View Time"
                  value={config.ad_view_min_seconds}
                  onChange={v => update('ad_view_min_seconds', v)}
                  suffix="sec" min={1} max={120}
                  hint="Minimum seconds user must stay on ad tab"
                />
              </div>
            </SectionCard>
          </div>
        )}

        {/* ══════════════ THROTTLE ══════════════ */}
        {section === 'throttle' && (
          <div className="space-y-4">
            <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 flex items-start gap-3">
              <AlertTriangle size={18} className="text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-red-300 font-black text-sm">Auto-Throttle System</p>
                <p className="text-red-400/70 text-xs mt-1 leading-relaxed">
                  When a user's total earned coins reach the threshold, their earning rates are automatically reduced to the throttled values. This prevents abuse and overpaying.
                </p>
              </div>
            </div>

            <SectionCard title="Throttle Trigger" icon={<TrendingDown size={15} className="text-white" />} accent="red">
              <NumberInput
                label="Coin Threshold"
                value={config.throttle_threshold}
                onChange={v => update('throttle_threshold', v)}
                suffix="🪙" min={100} max={1000000}
                hint="When user earns this many total coins, throttle kicks in"
              />
            </SectionCard>

            <SectionCard title="Throttled Earning Rates" icon={<TrendingDown size={15} className="text-white" />} accent="red">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <NumberInput
                  label="Survey Reward (throttled)"
                  value={config.throttle_survey_reward}
                  onChange={v => update('throttle_survey_reward', v)}
                  suffix="🪙" min={0} max={1000}
                  hint={`Normal: ${config.survey_reward} → Throttled: this value`}
                />
                <NumberInput
                  label="CAPTCHA Reward (throttled)"
                  value={config.throttle_captcha_reward}
                  onChange={v => update('throttle_captcha_reward', v)}
                  suffix="🪙" min={0} max={1000}
                  hint={`Normal: ${config.captcha_reward} → Throttled: this value`}
                />
                <NumberInput
                  label="Ad Reward (throttled)"
                  value={config.throttle_ad_reward}
                  onChange={v => update('throttle_ad_reward', v)}
                  suffix="🪙" min={0} max={1000}
                  hint={`Normal: ${config.ad_reward} → Throttled: this value`}
                />
                <NumberInput
                  label="Friend Cut % (throttled)"
                  value={config.throttle_friend_cut_pct}
                  onChange={v => update('throttle_friend_cut_pct', v)}
                  suffix="%" min={0} max={100}
                  hint={`Normal: ${config.friend_cut_pct}% → Throttled: this value`}
                />
              </div>
            </SectionCard>

            {/* Preview */}
            <div className="bg-slate-800/40 border border-slate-700/40 rounded-2xl p-5">
              <h3 className="text-white font-black text-sm mb-4">Throttle Preview</h3>
              <div className="space-y-3">
                {[
                  { label: '📋 Survey', normal: config.survey_reward, throttled: config.throttle_survey_reward },
                  { label: '🔐 CAPTCHA', normal: config.captcha_reward, throttled: config.throttle_captcha_reward },
                  { label: '📺 Ads', normal: config.ad_reward, throttled: config.throttle_ad_reward },
                  { label: '👥 Friend Cut', normal: config.friend_cut_pct, throttled: config.throttle_friend_cut_pct, suffix: '%' },
                ].map(r => (
                  <div key={r.label} className="flex items-center gap-4 py-2 border-b border-slate-700/30 last:border-0">
                    <span className="text-slate-400 text-sm w-24 flex-shrink-0">{r.label}</span>
                    <span className="text-emerald-400 font-black">{r.normal}{r.suffix || ' 🪙'}</span>
                    <span className="text-slate-500 text-xs">→ after {config.throttle_threshold.toLocaleString()} 🪙 →</span>
                    <span className="text-red-400 font-black">{r.throttled}{r.suffix || ' 🪙'}</span>
                    <span className="ml-auto text-xs text-red-400 font-bold">
                      -{(((r.normal - r.throttled) / Math.max(r.normal, 1)) * 100).toFixed(0)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ══════════════ FEATURES ══════════════ */}
        {section === 'features' && (
          <div className="space-y-4">
            <SectionCard title="Tab Visibility" icon={<Eye size={15} className="text-white" />} accent="violet">
              <ToggleRow label="📋 Surveys" value={config.surveys_enabled} onChange={v => update('surveys_enabled', v)} hint="Enable/disable survey tasks on Home tab" color="emerald" />
              <ToggleRow label="🔐 CAPTCHA" value={config.captcha_enabled} onChange={v => update('captcha_enabled', v)} hint="Enable/disable CAPTCHA solving on Home tab" color="emerald" />
              <ToggleRow label="📺 Ads" value={config.ads_enabled} onChange={v => update('ads_enabled', v)} hint="Enable/disable Ads tab" color="emerald" />
              <ToggleRow label="👥 Friends/Referral" value={config.referral_enabled} onChange={v => update('referral_enabled', v)} hint="Enable/disable Friends tab" color="emerald" />
              <ToggleRow label="💰 Wallet" value={config.wallet_enabled} onChange={v => update('wallet_enabled', v)} hint="Enable/disable Wallet tab" color="emerald" />
              <ToggleRow label="🏆 Leaderboard" value={config.leaderboard_enabled} onChange={v => update('leaderboard_enabled', v)} hint="Enable/disable Leaderboard tab" color="emerald" />
            </SectionCard>
          </div>
        )}

        {/* ══════════════ WITHDRAWAL ══════════════ */}
        {section === 'withdrawal' && (
          <div className="space-y-4">
            <SectionCard title="Payment Method Toggles" icon={<ToggleRight size={15} className="text-white" />} accent="blue">
              <ToggleRow label="📱 PhonePe" value={config.withdraw_phonepe_enabled} onChange={v => update('withdraw_phonepe_enabled', v)} color="violet" />
              <ToggleRow label="💳 UPI Transfer" value={config.withdraw_upi_enabled} onChange={v => update('withdraw_upi_enabled', v)} color="emerald" />
              <ToggleRow label="💳 Credit / Debit Card" value={config.withdraw_card_enabled} onChange={v => update('withdraw_card_enabled', v)} color="blue" />
              <ToggleRow label="🏛️ Bank Transfer" value={config.withdraw_bank_enabled} onChange={v => update('withdraw_bank_enabled', v)} color="amber" />
              <ToggleRow label="₿ Crypto Wallet" value={config.withdraw_crypto_enabled} onChange={v => update('withdraw_crypto_enabled', v)} color="amber" />
            </SectionCard>

            <SectionCard title="Minimum Withdrawal (Coins)" icon={<Lock size={15} className="text-white" />} accent="cyan">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <NumberInput label="PhonePe Minimum" value={config.withdraw_phonepe_min} onChange={v => update('withdraw_phonepe_min', v)} suffix="🪙" min={100} hint="5000 = ₹1,000" />
                <NumberInput label="UPI Minimum" value={config.withdraw_upi_min} onChange={v => update('withdraw_upi_min', v)} suffix="🪙" min={100} hint="5000 = ₹1,000" />
                <NumberInput label="Card Minimum" value={config.withdraw_card_min} onChange={v => update('withdraw_card_min', v)} suffix="🪙" min={100} hint="10000 = ₹1,000" />
                <NumberInput label="Bank Minimum" value={config.withdraw_bank_min} onChange={v => update('withdraw_bank_min', v)} suffix="🪙" min={100} hint="10000 = ₹1,000" />
                <NumberInput label="Crypto Minimum" value={config.withdraw_crypto_min} onChange={v => update('withdraw_crypto_min', v)} suffix="🪙" min={100} hint="5000 = ₹2,000" />
              </div>
            </SectionCard>
          </div>
        )}

        {/* ══════════════ LEADERBOARD ══════════════ */}
        {section === 'leaderboard' && (
          <div className="space-y-4">

            {/* Title & Subtitle */}
            <SectionCard title="Display Settings" icon={<Trophy size={15} className="text-white" />} accent="amber">
              <div>
                <label className="block text-xs font-black text-slate-300 mb-1.5 uppercase tracking-wider">Leaderboard Title</label>
                <input
                  type="text" value={config.leaderboard_title}
                  onChange={e => update('leaderboard_title', e.target.value)}
                  placeholder="Top Earners 🏆"
                  className="w-full bg-slate-800 border border-slate-600 text-white font-semibold text-sm px-3 py-2.5 rounded-xl focus:outline-none focus:border-amber-500 transition-colors"
                  style={{ fontSize: '16px' }}
                />
              </div>
              <div>
                <label className="block text-xs font-black text-slate-300 mb-1.5 uppercase tracking-wider">Subtitle</label>
                <input
                  type="text" value={config.leaderboard_subtitle}
                  onChange={e => update('leaderboard_subtitle', e.target.value)}
                  placeholder="Compete with other earners worldwide!"
                  className="w-full bg-slate-800 border border-slate-600 text-white font-semibold text-sm px-3 py-2.5 rounded-xl focus:outline-none focus:border-amber-500 transition-colors"
                  style={{ fontSize: '16px' }}
                />
              </div>
            </SectionCard>

            {/* Column Toggles */}
            <SectionCard title="Column Visibility" icon={<Eye size={15} className="text-white" />} accent="violet">
              <ToggleRow label="📋 Show Surveys Column"     value={config.leaderboard_show_surveys}    onChange={v => update('leaderboard_show_surveys', v)}    hint="Show surveys count per user" />
              <ToggleRow label="🔐 Show CAPTCHA Column"     value={config.leaderboard_show_captchas}   onChange={v => update('leaderboard_show_captchas', v)}   hint="Show captchas solved count" />
              <ToggleRow label="🏆 Show Badge Labels"       value={config.leaderboard_show_badges}     onChange={v => update('leaderboard_show_badges', v)}     hint="Show Legend / Diamond / Gold badges" />
              <ToggleRow label="🥇 Show Podium (Top 3)"     value={config.leaderboard_show_podium}     onChange={v => update('leaderboard_show_podium', v)}     hint="Show the Hall of Fame podium" />
              <ToggleRow label="🎯 Show Your Rank Card"     value={config.leaderboard_show_your_rank}  onChange={v => update('leaderboard_show_your_rank', v)}  hint="Show the user's own rank card" />
            </SectionCard>

            <SectionCard title="Data Source Control" icon={<Database size={15} className="text-white" />} accent="blue">
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => update('leaderboard_mode', 'manual')}
                  className={`py-2 rounded-xl text-xs font-black border-2 transition-all ${
                    config.leaderboard_mode === 'manual'
                      ? 'bg-amber-500/30 border-amber-500 text-amber-200'
                      : 'bg-slate-800 border-slate-700 text-slate-400'
                  }`}
                >
                  Manual JSON
                </button>
                <button
                  onClick={() => update('leaderboard_mode', 'live')}
                  className={`py-2 rounded-xl text-xs font-black border-2 transition-all ${
                    config.leaderboard_mode === 'live'
                      ? 'bg-emerald-500/30 border-emerald-500 text-emerald-200'
                      : 'bg-slate-800 border-slate-700 text-slate-400'
                  }`}
                >
                  Live Supabase
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <NumberInput
                  label="Live Rows Limit"
                  value={config.leaderboard_live_limit}
                  onChange={(v) => update('leaderboard_live_limit', v)}
                  min={5}
                  max={200}
                  hint="Max user rows fetched from user_profiles"
                />
                <NumberInput
                  label="Minimum Coins Filter"
                  value={config.leaderboard_min_coins}
                  onChange={(v) => update('leaderboard_min_coins', v)}
                  min={0}
                  max={9999999}
                  suffix="🪙"
                  hint="Hide users below this coin count"
                />
              </div>
            </SectionCard>

            {/* Badge Thresholds */}
            <SectionCard title="Badge Coin Thresholds" icon={<Trophy size={15} className="text-white" />} accent="emerald">
              <p className="text-slate-500 text-xs">Set the minimum coins required for each badge tier.</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <NumberInput label="🔴 Legend"   value={config.leaderboard_badge_legend}   onChange={v => update('leaderboard_badge_legend', v)}   suffix="🪙" min={1000} hint="e.g. 40,000 coins" />
                <NumberInput label="💎 Diamond"  value={config.leaderboard_badge_diamond}  onChange={v => update('leaderboard_badge_diamond', v)}  suffix="🪙" min={500}  hint="e.g. 20,000 coins" />
                <NumberInput label="🔵 Platinum" value={config.leaderboard_badge_platinum} onChange={v => update('leaderboard_badge_platinum', v)} suffix="🪙" min={100}  hint="e.g. 10,000 coins" />
                <NumberInput label="🟡 Gold"     value={config.leaderboard_badge_gold}     onChange={v => update('leaderboard_badge_gold', v)}     suffix="🪙" min={100}  hint="e.g. 5,000 coins"  />
                <NumberInput label="⚪ Silver"   value={config.leaderboard_badge_silver}   onChange={v => update('leaderboard_badge_silver', v)}   suffix="🪙" min={10}   hint="e.g. 2,000 coins"  />
              </div>
              {/* Visual preview */}
              <div className="bg-slate-900/60 rounded-xl p-3 space-y-2">
                <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Tier Preview</p>
                {[
                  { badge: 'Legend',   coins: config.leaderboard_badge_legend,   color: 'text-rose-400'   },
                  { badge: 'Diamond',  coins: config.leaderboard_badge_diamond,  color: 'text-purple-400' },
                  { badge: 'Platinum', coins: config.leaderboard_badge_platinum, color: 'text-cyan-400'   },
                  { badge: 'Gold',     coins: config.leaderboard_badge_gold,     color: 'text-yellow-400' },
                  { badge: 'Silver',   coins: config.leaderboard_badge_silver,   color: 'text-slate-400'  },
                  { badge: 'Bronze',   coins: 0,                                 color: 'text-amber-700'  },
                ].map(t => (
                  <div key={t.badge} className="flex items-center justify-between">
                    <span className={`text-sm font-black ${t.color}`}>{t.badge}</span>
                    <span className="text-slate-500 text-xs">{t.coins > 0 ? `≥ ${t.coins.toLocaleString()} 🪙` : '< Silver'}</span>
                  </div>
                ))}
              </div>
            </SectionCard>

            {/* Edit Leaderboard Entries */}
            <SectionCard title="Edit Leaderboard Entries (JSON)" icon={<Database size={15} className="text-white" />} accent="cyan">
              <p className="text-slate-500 text-xs leading-relaxed">
                Edit the mock leaderboard players below. Must be valid JSON array with fields:{' '}
                <code className="text-amber-400">name, coins, surveys, captchas, avatar, badge</code>
              </p>
              <textarea
                value={config.leaderboard_entries}
                onChange={e => update('leaderboard_entries', e.target.value)}
                rows={12}
                className="w-full bg-slate-900 border border-slate-600 text-slate-300 font-mono text-xs px-4 py-3 rounded-xl focus:outline-none focus:border-amber-500 transition-colors resize-y"
                spellCheck={false}
                style={{ fontSize: '12px', lineHeight: '1.6' }}
              />
              {/* Validate JSON */}
              {(() => {
                try {
                  const parsed = JSON.parse(config.leaderboard_entries);
                  const valid = Array.isArray(parsed) && parsed.length > 0;
                  return valid ? (
                    <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 rounded-xl px-3 py-2">
                      <CheckCircle2 size={13} className="text-emerald-400" />
                      <span className="text-emerald-400 text-xs font-bold">{parsed.length} entries — valid JSON ✓</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-xl px-3 py-2">
                      <AlertTriangle size={13} className="text-red-400" />
                      <span className="text-red-400 text-xs font-bold">Must be a non-empty array</span>
                    </div>
                  );
                } catch {
                  return (
                    <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-xl px-3 py-2">
                      <AlertTriangle size={13} className="text-red-400" />
                      <span className="text-red-400 text-xs font-bold">Invalid JSON — fix before saving</span>
                    </div>
                  );
                }
              })()}
              {/* Quick add template */}
              <div className="bg-slate-900/60 rounded-xl p-3">
                <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-2">Entry Template</p>
                <pre className="text-slate-500 text-[10px] leading-relaxed overflow-x-auto">{`{
  "name": "PlayerName",
  "coins": 25000,
  "surveys": 50,
  "captchas": 400,
  "avatar": "🦁",
  "badge": "Platinum"
}`}</pre>
              </div>
            </SectionCard>
          </div>
        )}

        {/* ══════════════ USERS ══════════════ */}
        {section === 'users' && (
          <div className="space-y-4">
            <SectionCard title="User Access Control (Real Supabase)" icon={<Users size={15} className="text-white" />} accent="cyan">
              <div className="flex items-center justify-between">
                <p className="text-slate-400 text-xs">Manage user admin rights directly from user_profiles.is_admin.</p>
                <button
                  onClick={() => void loadUsers()}
                  className="text-xs font-black bg-slate-700 hover:bg-slate-600 text-white px-3 py-1.5 rounded-lg"
                >
                  Refresh
                </button>
              </div>

              <div className="border border-slate-700/50 rounded-xl overflow-hidden">
                <div className="grid grid-cols-12 bg-slate-900/70 px-3 py-2 text-[10px] font-black uppercase tracking-wide text-slate-400">
                  <div className="col-span-5">User</div>
                  <div className="col-span-2 text-right">Coins</div>
                  <div className="col-span-2 text-right">Earned</div>
                  <div className="col-span-3 text-right">Admin</div>
                </div>

                <div className="max-h-96 overflow-y-auto divide-y divide-slate-800/70">
                  {usersLoading && (
                    <div className="px-3 py-4 text-xs text-slate-500">Loading users...</div>
                  )}

                  {!usersLoading && users.length === 0 && (
                    <div className="px-3 py-4 text-xs text-slate-500">No users found.</div>
                  )}

                  {!usersLoading && users.map((u) => (
                    <div key={u.id} className="grid grid-cols-12 items-center px-3 py-2.5 text-xs">
                      <div className="col-span-5 min-w-0">
                        <p className="text-white font-bold truncate">{u.full_name || 'User'}</p>
                        <p className="text-slate-500 truncate">{u.email || u.id}</p>
                      </div>
                      <div className="col-span-2 text-right text-amber-300 font-black">{u.coins.toLocaleString()}</div>
                      <div className="col-span-2 text-right text-emerald-300 font-black">{u.total_earned.toLocaleString()}</div>
                      <div className="col-span-3 flex justify-end">
                        <button
                          onClick={() => void setUserAdmin(u.id, !u.is_admin)}
                          className={`px-2.5 py-1 rounded-lg font-black text-[10px] border transition-colors ${
                            u.is_admin
                              ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                              : 'bg-slate-800 border-slate-600 text-slate-300 hover:border-amber-500'
                          }`}
                        >
                          {u.is_admin ? 'Admin' : 'Make Admin'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </SectionCard>
          </div>
        )}

        {/* ══════════════ ANNOUNCEMENT ══════════════ */}
        {section === 'announcement' && (
          <div className="space-y-4">
            <SectionCard title="Site Announcement Banner" icon={<Bell size={15} className="text-white" />} accent="rose">
              <ToggleRow
                label="Enable Announcement"
                value={config.announcement_enabled}
                onChange={v => update('announcement_enabled', v)}
                hint="Show a banner at the top for all users"
                color="emerald"
              />

              <div>
                <label className="block text-xs font-black text-slate-300 mb-2 uppercase tracking-wider">Message</label>
                <textarea
                  value={config.announcement_text}
                  onChange={e => update('announcement_text', e.target.value)}
                  rows={3}
                  placeholder="Enter announcement message..."
                  className="w-full bg-slate-800 border border-slate-600 rounded-xl px-4 py-3 text-white text-sm font-semibold focus:outline-none focus:border-amber-500 transition-colors resize-none"
                  style={{ fontSize: '16px' }}
                />
              </div>

              <div>
                <label className="block text-xs font-black text-slate-300 mb-2 uppercase tracking-wider">Type</label>
                <div className="grid grid-cols-4 gap-2">
                  {(['info', 'warning', 'success', 'error'] as const).map(t => (
                    <button
                      key={t}
                      onClick={() => update('announcement_type', t)}
                      className={`py-2 rounded-xl text-xs font-black capitalize border-2 transition-all ${
                        config.announcement_type === t
                          ? t === 'info' ? 'bg-blue-500/30 border-blue-500 text-blue-300'
                          : t === 'warning' ? 'bg-amber-500/30 border-amber-500 text-amber-300'
                          : t === 'success' ? 'bg-emerald-500/30 border-emerald-500 text-emerald-300'
                          : 'bg-red-500/30 border-red-500 text-red-300'
                          : 'bg-slate-800 border-slate-700 text-slate-500 hover:border-slate-500'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {/* Preview */}
              {config.announcement_text && (
                <div className={`rounded-xl p-3.5 flex items-start gap-2.5 border ${
                  config.announcement_type === 'warning' ? 'bg-amber-500/10 border-amber-500/30' :
                  config.announcement_type === 'error' ? 'bg-red-500/10 border-red-500/30' :
                  config.announcement_type === 'success' ? 'bg-emerald-500/10 border-emerald-500/30' :
                  'bg-blue-500/10 border-blue-500/30'
                }`}>
                  <Bell size={13} className={
                    config.announcement_type === 'warning' ? 'text-amber-400' :
                    config.announcement_type === 'error' ? 'text-red-400' :
                    config.announcement_type === 'success' ? 'text-emerald-400' : 'text-blue-400'
                  } />
                  <p className="text-white text-xs font-semibold">Preview: {config.announcement_text}</p>
                </div>
              )}
            </SectionCard>
          </div>
        )}

        {/* ══════════════ MAINTENANCE ══════════════ */}
        {section === 'maintenance' && (
          <div className="space-y-4">
            <div className={`border rounded-2xl p-4 flex items-start gap-3 ${config.maintenance_mode ? 'bg-red-500/10 border-red-500/30' : 'bg-slate-800/40 border-slate-700/40'}`}>
              <Power size={18} className={config.maintenance_mode ? 'text-red-400' : 'text-slate-500'} />
              <div className="flex-1">
                <p className={`font-black text-sm ${config.maintenance_mode ? 'text-red-300' : 'text-slate-400'}`}>
                  Maintenance Mode is {config.maintenance_mode ? 'ON' : 'OFF'}
                </p>
                <p className="text-slate-500 text-xs mt-1">
                  When enabled, all users see a maintenance screen instead of the app.
                </p>
              </div>
              <Toggle value={config.maintenance_mode} onChange={v => update('maintenance_mode', v)} color="red" />
            </div>

            <SectionCard title="Maintenance Settings" icon={<Settings size={15} className="text-white" />} accent="amber">
              <div>
                <label className="block text-xs font-black text-slate-300 mb-2 uppercase tracking-wider">Maintenance Message</label>
                <textarea
                  value={config.maintenance_message}
                  onChange={e => update('maintenance_message', e.target.value)}
                  rows={3}
                  placeholder="Message shown during maintenance..."
                  className="w-full bg-slate-800 border border-slate-600 rounded-xl px-4 py-3 text-white text-sm font-semibold focus:outline-none focus:border-amber-500 transition-colors resize-none"
                  style={{ fontSize: '16px' }}
                />
              </div>

              <div className="bg-slate-900/60 rounded-xl p-4 border border-slate-700/40">
                <p className="text-slate-400 text-xs font-bold mb-2">Preview:</p>
                <p className="text-white text-sm font-semibold">{config.maintenance_message || 'No message set'}</p>
              </div>
            </SectionCard>
          </div>
        )}

        {/* ══════════════ REALTIME LOGS ══════════════ */}
        {section === 'realtime' && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 bg-emerald-500/15 border border-emerald-500/25 rounded-xl px-3 py-2">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-emerald-400 text-xs font-bold">Supabase Realtime Connected</span>
              </div>
              <button onClick={() => setRealtimeLogs([])} className="text-slate-500 hover:text-slate-300 text-xs font-bold transition">Clear</button>
            </div>

            <div className="bg-slate-900 border border-slate-700/50 rounded-2xl overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-700/50 bg-slate-800/40">
                <Database size={13} className="text-cyan-400" />
                <span className="text-white text-xs font-black">Live Event Log</span>
                <span className="ml-auto text-slate-500 text-xs">{realtimeLogs.length} events</span>
              </div>
              <div className="divide-y divide-slate-800/80 max-h-96 overflow-y-auto font-mono text-xs">
                {realtimeLogs.length === 0 ? (
                  <div className="py-10 text-center text-slate-600">No events yet. Interact with the app to see logs.</div>
                ) : (
                  realtimeLogs.map((log, i) => (
                    <div key={i} className="flex items-start gap-3 px-4 py-2.5 hover:bg-slate-800/30">
                      <span className="text-slate-600 flex-shrink-0 w-16">{log.time}</span>
                      <span className={`flex-1 ${
                        log.type === 'success' ? 'text-emerald-400' :
                        log.type === 'warn' ? 'text-amber-400' : 'text-slate-300'
                      }`}>{log.msg}</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            <SectionCard title="Supabase Tables Required" icon={<Database size={15} className="text-white" />} accent="cyan">
              <div className="space-y-3">
                {[
                  { table: 'admin_config', desc: 'All app settings (single row, id=1)', required: true },
                  { table: 'referrals', desc: 'User referral relationships & earnings', required: true },
                  { table: 'users_meta', desc: 'Optional: user stats & metadata', required: false },
                ].map(t => (
                  <div key={t.table} className="flex items-center gap-3 bg-slate-800/60 rounded-xl px-4 py-3">
                    <Database size={13} className={t.required ? 'text-cyan-400' : 'text-slate-500'} />
                    <div className="flex-1">
                      <p className="text-white font-black text-sm font-mono">{t.table}</p>
                      <p className="text-slate-500 text-xs">{t.desc}</p>
                    </div>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-lg ${t.required ? 'bg-red-500/20 text-red-400' : 'bg-slate-700 text-slate-500'}`}>
                      {t.required ? 'Required' : 'Optional'}
                    </span>
                  </div>
                ))}
              </div>

              <div className="bg-slate-900/80 rounded-xl p-4 border border-slate-700/50">
                <p className="text-amber-400 text-xs font-black mb-2">SQL to create admin_config table:</p>
                <pre className="text-slate-400 text-[10px] leading-relaxed overflow-x-auto whitespace-pre-wrap">
{`CREATE TABLE admin_config (
  id INTEGER PRIMARY KEY DEFAULT 1,
  survey_reward INTEGER DEFAULT 15,
  captcha_reward INTEGER DEFAULT 20,
  ad_reward INTEGER DEFAULT 20,
  friend_cut_pct INTEGER DEFAULT 10,
  captcha_daily_limit INTEGER DEFAULT 30,
  ad_daily_limit INTEGER DEFAULT 20,
  throttle_threshold INTEGER DEFAULT 4000,
  throttle_survey_reward INTEGER DEFAULT 5,
  throttle_captcha_reward INTEGER DEFAULT 5,
  throttle_ad_reward INTEGER DEFAULT 5,
  throttle_friend_cut_pct INTEGER DEFAULT 2,
  surveys_enabled BOOLEAN DEFAULT true,
  captcha_enabled BOOLEAN DEFAULT true,
  ads_enabled BOOLEAN DEFAULT true,
  referral_enabled BOOLEAN DEFAULT true,
  wallet_enabled BOOLEAN DEFAULT true,
  leaderboard_enabled BOOLEAN DEFAULT true,
  withdraw_phonepe_enabled BOOLEAN DEFAULT true,
  withdraw_upi_enabled BOOLEAN DEFAULT true,
  withdraw_card_enabled BOOLEAN DEFAULT true,
  withdraw_bank_enabled BOOLEAN DEFAULT true,
  withdraw_crypto_enabled BOOLEAN DEFAULT true,
  withdraw_phonepe_min INTEGER DEFAULT 5000,
  withdraw_upi_min INTEGER DEFAULT 5000,
  withdraw_card_min INTEGER DEFAULT 10000,
  withdraw_bank_min INTEGER DEFAULT 10000,
  withdraw_crypto_min INTEGER DEFAULT 5000,
  maintenance_mode BOOLEAN DEFAULT false,
  maintenance_message TEXT DEFAULT '',
  announcement_enabled BOOLEAN DEFAULT false,
  announcement_text TEXT DEFAULT '',
  announcement_type TEXT DEFAULT 'info',
  admin_email TEXT DEFAULT 'admin@coinearn.app'
);
INSERT INTO admin_config (id) VALUES (1);`}
                </pre>
              </div>
            </SectionCard>
          </div>
        )}

        {/* ── FLOATING SAVE BUTTON ── */}
        <div className="fixed bottom-6 right-4 z-50">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-black px-5 py-3 rounded-2xl shadow-2xl shadow-amber-500/30 transition-all active:scale-95 disabled:opacity-60"
          >
            {saving
              ? <><RefreshCw size={16} className="animate-spin" /> Saving...</>
              : saved
              ? <><CheckCircle2 size={16} /> Saved!</>
              : <><Save size={16} /> Save Changes</>
            }
          </button>
        </div>
      </div>
    </div>
  );
};
