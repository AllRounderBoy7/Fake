import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Users, Copy, CheckCircle2, Share2, Gift, Zap, Trophy,
  Clock, TrendingUp, Link2, UserPlus, RefreshCw,
  Wifi, WifiOff, Crown, ChevronRight, QrCode,
  Percent, Coins,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { AuthUser, Referral } from '../types';

interface ReferralPageProps {
  user: AuthUser;
  onEarn: (amount: number, source: string) => void;
  friendCount: number;
  setFriendCount: (n: number) => void;
  onFriendTotalEarned?: (total: number) => void;
  friendCutPct?: number;
}

const COINS_PER_REFERRAL = 200; // joining bonus

const BONUS_MILESTONES = [
  { friends: 1,  bonus: 100,  label: '1 Friend',   color: 'from-blue-400 to-blue-600',     icon: '🎉' },
  { friends: 3,  bonus: 300,  label: '3 Friends',  color: 'from-emerald-400 to-teal-600',  icon: '🚀' },
  { friends: 5,  bonus: 750,  label: '5 Friends',  color: 'from-amber-400 to-orange-500',  icon: '⚡' },
  { friends: 10, bonus: 2000, label: '10 Friends', color: 'from-violet-500 to-purple-700', icon: '👑' },
  { friends: 20, bonus: 5000, label: '20 Friends', color: 'from-rose-500 to-pink-700',     icon: '💎' },
];

function generateReferralCode(userId: string): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = 'CE-';
  const seed = userId.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  for (let i = 0; i < 6; i++) {
    code += chars[(seed * (i + 7) * 31 + i * 13) % chars.length];
  }
  return code;
}

type DbReferralRow = {
  id: string;
  referrer_id: string;
  referred_id: string;
  referred_name: string | null;
  referred_email: string | null;
  status: 'pending' | 'active' | 'rewarded' | null;
  referred_earnings?: number | null;
  referrer_cut?: number | null;
  coins_earned?: number | null;
  your_cut?: number | null;
  created_at?: string | null;
  joined_at?: string | null;
  last_active?: string | null;
};

const toReferral = (row: DbReferralRow): Referral => ({
  id: row.id,
  referrer_id: row.referrer_id,
  referred_id: row.referred_id,
  referred_name: row.referred_name ?? 'Unknown User',
  referred_email: row.referred_email ?? '-',
  status: (row.status as Referral['status']) ?? 'pending',
  coins_earned: row.referred_earnings ?? row.coins_earned ?? 0,
  your_cut: row.referrer_cut ?? row.your_cut ?? 0,
  joined_at: row.created_at ?? row.joined_at ?? new Date().toISOString(),
  last_active: row.last_active ?? undefined,
});

export const ReferralPage: React.FC<ReferralPageProps> = ({
  user, onEarn, friendCount, setFriendCount, onFriendTotalEarned,
}) => {
  const [referrals, setReferrals]               = useState<Referral[]>([]);
  const [loading, setLoading]                   = useState(true);
  const [realtimeOnline, setRealtimeOnline]      = useState(false);
  const [copied, setCopied]                     = useState<'code' | 'link' | null>(null);
  const [claimedMilestones, setClaimedMilestones] = useState<number[]>([]);
  const [claimingId, setClaimingId]             = useState<number | null>(null);
  const [activeTab, setActiveTab]               = useState<'overview' | 'friends' | 'milestones'>('overview');
  const [profileReferralCode, setProfileReferralCode] = useState('');
  const [applyCodeInput, setApplyCodeInput] = useState('');
  const [applyLoading, setApplyLoading] = useState(false);
  const [applyMessage, setApplyMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const referralCode = profileReferralCode || generateReferralCode(user.id);
  const referralLink = `${window.location.origin}?ref=${referralCode}`;

  const totalFriendsEarned = referrals.reduce((s, r) => s + r.coins_earned, 0);
  const totalYourCut       = referrals.reduce((s, r) => s + r.your_cut, 0);
  const activeCount        = referrals.filter(r => r.status === 'active' || r.status === 'rewarded').length;
  const pendingCount       = referrals.filter(r => r.status === 'pending').length;

  // Notify parent of friend total earnings whenever it changes
  useEffect(() => {
    onFriendTotalEarned?.(totalFriendsEarned);
  }, [totalFriendsEarned, onFriendTotalEarned]);

  // ── Load referrals ──
  const loadReferrals = useCallback(async () => {
    setLoading(true);
    try {
      // Load own profile referral code from Supabase (real code, not client generated).
      const profile = await supabase
        .from('user_profiles')
        .select('referral_code')
        .eq('id', user.id)
        .maybeSingle();
      if (!profile.error && profile.data?.referral_code) {
        setProfileReferralCode(profile.data.referral_code);
      }

      const { data, error } = await supabase
        .from('referrals')
        .select('*')
        .eq('referrer_id', user.id)
        .order('created_at', { ascending: false });

      if (!error && data) {
        const rows = (data as DbReferralRow[]).map(toReferral);
        setReferrals(rows);
        const active = rows.filter(r => r.status === 'active' || r.status === 'rewarded').length;
        setFriendCount(active);
      } else {
        setReferrals([]);
        setFriendCount(0);
      }
    } catch {
      setReferrals([]);
      setFriendCount(0);
    } finally {
      setLoading(false);
    }
  }, [user.id, setFriendCount]);

  // ── Supabase Realtime ──
  useEffect(() => {
    loadReferrals();

    const channel = supabase
      .channel(`referrals:${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'referrals', filter: `referrer_id=eq.${user.id}` },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newRef = toReferral(payload.new as DbReferralRow);
            setReferrals(prev => [newRef, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            setReferrals(prev =>
              prev.map(r => r.id === (payload.new as DbReferralRow).id ? toReferral(payload.new as DbReferralRow) : r)
            );
          } else if (payload.eventType === 'DELETE') {
            setReferrals(prev => prev.filter(r => r.id !== (payload.old as DbReferralRow).id));
          }
        }
      )
      .subscribe((status) => {
        setRealtimeOnline(status === 'SUBSCRIBED');
      });

    channelRef.current = channel;
    return () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current);
    };
  }, [user.id]);

  // ── Copy helpers ──
  const copyCode = () => {
    navigator.clipboard.writeText(referralCode).catch(() => {});
    setCopied('code');
    setTimeout(() => setCopied(null), 2000);
  };
  const copyLink = () => {
    navigator.clipboard.writeText(referralLink).catch(() => {});
    setCopied('link');
    setTimeout(() => setCopied(null), 2000);
  };

  const handleShare = async (method: string) => {
    const msg = `🪙 Join GetMe & earn real money! Use my code ${referralCode} or click: ${referralLink}\nEarn coins by watching ads, completing surveys & solving CAPTCHAs!`;
    if (method === 'whatsapp') window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
    if (method === 'telegram') window.open(`https://t.me/share/url?url=${encodeURIComponent(referralLink)}&text=${encodeURIComponent(`🪙 Join GetMe! Use code ${referralCode}`)}`, '_blank');
    if (method === 'twitter') window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(msg)}`, '_blank');
    if (method === 'native' && navigator.share) {
      try { await navigator.share({ title: 'Join GetMe', text: msg, url: referralLink }); } catch {}
    }
  };

  const claimMilestone = async (friends: number, bonus: number) => {
    if (claimedMilestones.includes(friends) || friendCount < friends) return;
    setClaimingId(friends);
    await new Promise(r => setTimeout(r, 800));
    onEarn(bonus, `Referral Milestone: ${friends} Friends`);
    setClaimedMilestones(prev => [...prev, friends]);
    setClaimingId(null);
  };

  const applyReferralCode = async () => {
    const code = applyCodeInput.trim().toUpperCase();
    if (!code) return;
    setApplyLoading(true);
    setApplyMessage(null);

    try {
      // Preferred: server-side function for safe linking + referral row creation.
      const { error } = await supabase.rpc('apply_referral_code', { p_code: code });
      if (error) {
        setApplyMessage({
          type: 'error',
          text: 'Could not apply code. Ask admin to run referral SQL setup (apply_referral_code function).',
        });
      } else {
        setApplyMessage({ type: 'success', text: 'Referral code applied successfully.' });
        setApplyCodeInput('');
        void loadReferrals();
      }
    } catch {
      setApplyMessage({ type: 'error', text: 'Network error while applying referral code.' });
    } finally {
      setApplyLoading(false);
    }
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' });
  };
  const timeAgo = (iso: string) => {
    const diff = Date.now() - new Date(iso).getTime();
    const h = Math.floor(diff / 3600000);
    if (h < 1) return 'Just now';
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
  };

  return (
    <div className="max-w-2xl mx-auto px-1 pb-28 sm:pb-10 space-y-4">

      {/* ── Header ── */}
      <div className="flex items-center justify-between pt-1">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center shadow-lg shadow-rose-200 flex-shrink-0">
            <Users size={22} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Refer & Earn</h1>
            <p className="text-slate-400 text-sm">Get <span className="font-black text-amber-600">10% of every friend's earnings</span></p>
          </div>
        </div>
        {/* Realtime badge */}
        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border ${
          realtimeOnline
            ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
            : 'bg-slate-100 border-slate-200 text-slate-500'
        }`}>
          {realtimeOnline
            ? <><Wifi size={12} className="text-emerald-500" /><span className="hidden sm:inline ml-1">Live</span></>
            : <><WifiOff size={12} /><span className="hidden sm:inline ml-1">Offline</span></>
          }
          <span className="w-1.5 h-1.5 rounded-full animate-pulse ml-0.5" style={{ background: realtimeOnline ? '#22c55e' : '#94a3b8' }} />
        </div>
      </div>

      {/* ── 10% Passive Income Hero ── */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-rose-950 to-slate-900 p-5 shadow-2xl">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-10 -right-10 w-48 h-48 bg-rose-500/20 rounded-full blur-3xl" />
          <div className="absolute -bottom-10 -left-10 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl" />
        </div>
        <div className="relative space-y-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-white/60 text-xs font-bold uppercase tracking-widest">Your Passive Cut</p>
              <div className="flex items-end gap-2 mt-1">
                <p className="text-6xl font-black text-white leading-none">10%</p>
                <div className="mb-1 bg-amber-400/20 border border-amber-400/40 rounded-xl px-2.5 py-1">
                  <p className="text-amber-300 font-black text-xs">LIFETIME</p>
                </div>
              </div>
              <p className="text-white/50 text-xs mt-1">of every coin your friends earn — forever</p>
            </div>
            <div className="space-y-2">
              <div className="bg-white/10 border border-white/20 rounded-2xl px-4 py-2.5 text-center">
                <p className="text-white font-black text-3xl">{friendCount}</p>
                <p className="text-white/50 text-[10px] font-semibold">Active</p>
              </div>
            </div>
          </div>

          {/* Live earnings summary */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white/10 border border-white/20 rounded-2xl p-3 text-center">
              <p className="text-white/60 text-[10px] font-bold uppercase tracking-widest mb-1">Friends Earned</p>
              <p className="text-2xl font-black text-white">{totalFriendsEarned.toLocaleString()}</p>
              <p className="text-white/50 text-[10px]">🪙 total coins</p>
            </div>
            <div className="bg-amber-400/20 border border-amber-400/30 rounded-2xl p-3 text-center">
              <p className="text-amber-300/80 text-[10px] font-bold uppercase tracking-widest mb-1">Your 10% Cut</p>
              <p className="text-2xl font-black text-amber-300">{totalYourCut.toLocaleString()}</p>
              <p className="text-amber-400/60 text-[10px]">🪙 earned by you</p>
            </div>
          </div>

          {activeCount === 0 && (
            <div className="flex items-center gap-2 bg-white/10 border border-white/20 rounded-xl px-3 py-2.5">
              <TrendingUp size={14} className="text-amber-400 flex-shrink-0" />
              <p className="text-white/80 text-xs font-semibold">
                Invite <span className="text-amber-400 font-black">1 friend</span> and earn 10% of everything they earn — for life!
              </p>
            </div>
          )}
          {activeCount > 0 && (
            <div className="flex items-center gap-2 bg-emerald-400/20 border border-emerald-400/30 rounded-xl px-3 py-2.5">
              <ChevronRight size={14} className="text-emerald-400 flex-shrink-0" />
              <p className="text-emerald-300 text-xs font-black">
                🎉 {activeCount} active friend{activeCount !== 1 ? 's' : ''} earning for you right now!
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ── Stats Row ── */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white border border-slate-200 rounded-2xl p-3.5 shadow-sm text-center">
          <p className="text-2xl font-black text-slate-900">{referrals.length}</p>
          <p className="text-[11px] text-slate-400 font-bold mt-0.5">Total Invited</p>
        </div>
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3.5 shadow-sm text-center">
          <p className="text-2xl font-black text-emerald-700">{activeCount}</p>
          <p className="text-[11px] text-emerald-500 font-bold mt-0.5">Active Friends</p>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3.5 shadow-sm text-center">
          <p className="text-2xl font-black text-amber-700">{totalYourCut}</p>
          <p className="text-[11px] text-amber-500 font-bold mt-0.5">Your Bonus 🪙</p>
        </div>
      </div>

      {/* ── Referral Code Card ── */}
      <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
        <div className="bg-gradient-to-r from-rose-50 to-pink-50 px-5 pt-5 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2 mb-3">
            <QrCode size={16} className="text-rose-500" />
            <span className="text-sm font-black text-slate-700">Your Referral Code</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex-1 bg-white border-2 border-rose-200 rounded-2xl px-4 py-3 font-mono font-black text-2xl text-rose-700 tracking-widest text-center select-all shadow-inner">
              {referralCode}
            </div>
            <button
              onClick={copyCode}
              className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all active:scale-95 shadow-sm ${
                copied === 'code'
                  ? 'bg-emerald-500 shadow-emerald-200'
                  : 'bg-rose-600 hover:bg-rose-700 shadow-rose-200'
              }`}
            >
              {copied === 'code'
                ? <CheckCircle2 size={22} className="text-white" />
                : <Copy size={22} className="text-white" />
              }
            </button>
          </div>
        </div>

        <div className="px-5 py-4 space-y-3">
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5">
            <Link2 size={14} className="text-slate-400 flex-shrink-0" />
            <span className="text-xs text-slate-500 font-medium flex-1 truncate">{referralLink}</span>
            <button
              onClick={copyLink}
              className={`text-xs font-black px-3 py-1.5 rounded-lg transition-all active:scale-95 ${
                copied === 'link'
                  ? 'bg-emerald-500 text-white'
                  : 'bg-rose-100 text-rose-700 hover:bg-rose-200'
              }`}
            >
              {copied === 'link' ? 'Copied!' : 'Copy'}
            </button>
          </div>

          {/* Share buttons */}
          <div className="grid grid-cols-4 gap-2">
            <button
              onClick={() => handleShare('whatsapp')}
              className="flex flex-col items-center gap-1.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl py-3 transition-all active:scale-95"
            >
              <span className="text-xl">💬</span>
              <span className="text-[10px] font-bold text-emerald-700">WhatsApp</span>
            </button>
            <button
              onClick={() => handleShare('telegram')}
              className="flex flex-col items-center gap-1.5 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-xl py-3 transition-all active:scale-95"
            >
              <span className="text-xl">✈️</span>
              <span className="text-[10px] font-bold text-blue-700">Telegram</span>
            </button>
            <button
              onClick={() => handleShare('twitter')}
              className="flex flex-col items-center gap-1.5 bg-sky-50 hover:bg-sky-100 border border-sky-200 rounded-xl py-3 transition-all active:scale-95"
            >
              <span className="text-xl">🐦</span>
              <span className="text-[10px] font-bold text-sky-700">Twitter</span>
            </button>
            <button
              onClick={() => handleShare('native')}
              className="flex flex-col items-center gap-1.5 bg-violet-50 hover:bg-violet-100 border border-violet-200 rounded-xl py-3 transition-all active:scale-95"
            >
              <Share2 size={18} className="text-violet-600" />
              <span className="text-[10px] font-bold text-violet-700">More</span>
            </button>
          </div>
        </div>

        <div className="px-5 pb-5 pt-1 space-y-2">
          <p className="text-[11px] font-bold text-slate-500">Have a friend's code?</p>
          <div className="flex items-center gap-2">
            <input
              value={applyCodeInput}
              onChange={(e) => setApplyCodeInput(e.target.value)}
              placeholder="Enter referral code"
              className="flex-1 h-11 rounded-xl border border-slate-200 px-3 text-sm font-semibold outline-none focus:border-rose-300"
            />
            <button
              onClick={applyReferralCode}
              disabled={applyLoading || !applyCodeInput.trim()}
              className="h-11 px-4 rounded-xl bg-rose-600 text-white text-sm font-black disabled:opacity-50"
            >
              {applyLoading ? 'Applying...' : 'Apply'}
            </button>
          </div>
          {applyMessage && (
            <p className={`text-xs font-semibold ${applyMessage.type === 'success' ? 'text-emerald-600' : 'text-rose-600'}`}>
              {applyMessage.text}
            </p>
          )}
        </div>
      </div>

      {/* ── Sub Tabs ── */}
      <div className="flex gap-1.5 bg-slate-100 p-1.5 rounded-2xl">
        {[
          { id: 'overview' as const,   label: 'How It Works', icon: <Zap size={13} /> },
          { id: 'friends' as const,    label: `Friends (${referrals.length})`, icon: <Users size={13} /> },
          { id: 'milestones' as const, label: 'Milestones', icon: <Trophy size={13} /> },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-black transition-all ${
              activeTab === tab.id
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* ════════════ OVERVIEW TAB ════════════ */}
      {activeTab === 'overview' && (
        <div className="space-y-4">
          {/* How 10% works — step by step */}
          <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-4">
            <h3 className="font-black text-slate-900 text-sm flex items-center gap-2">
              <Percent size={16} className="text-rose-500" /> How the 10% System Works
            </h3>
            <div className="space-y-3">
              {[
                { step: '1', icon: '📤', title: 'Share Your Code', desc: `Share code ${referralCode} or your link via WhatsApp, Telegram, etc.`, color: 'bg-blue-500' },
                { step: '2', icon: '👤', title: 'Friend Signs Up', desc: 'Your friend creates an account using your referral code or link.', color: 'bg-emerald-500' },
                { step: '3', icon: '💼', title: 'Friend Earns Coins', desc: 'Every time your friend watches ads, does surveys or CAPTCHAs, they earn coins.', color: 'bg-amber-500' },
                { step: '4', icon: '💸', title: 'You Get 10% Automatically', desc: 'You receive 10% of every coin your friend earns — instantly and forever.', color: 'bg-rose-500' },
                { step: '5', icon: '🔄', title: 'Passive Income Forever', desc: 'As long as your friends keep earning, you keep earning. No cap!', color: 'bg-violet-500' },
              ].map((item) => (
                <div key={item.step} className="flex items-start gap-3">
                  <div className={`w-7 h-7 ${item.color} rounded-full flex items-center justify-center text-white text-xs font-black flex-shrink-0 mt-0.5`}>
                    {item.step}
                  </div>
                  <div>
                    <p className="text-slate-800 font-black text-sm">{item.icon} {item.title}</p>
                    <p className="text-slate-500 text-xs mt-0.5 leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Live example calculator */}
          <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-3xl p-5 shadow-sm">
            <h3 className="font-black text-amber-800 text-sm flex items-center gap-2 mb-4">
              <Coins size={16} className="text-amber-500" /> Earnings Example (10% Cut)
            </h3>
            <div className="space-y-2.5">
              {/* Header */}
              <div className="grid grid-cols-3 gap-2 text-center mb-1">
                <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">Friends</p>
                <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">They Earn/Day</p>
                <p className="text-amber-700 text-[10px] font-bold uppercase tracking-wider">You Get (10%)</p>
              </div>
              {[
                { friends: 1,  theyEarn: 200,   youGet: 20   },
                { friends: 3,  theyEarn: 600,   youGet: 60   },
                { friends: 5,  theyEarn: 1000,  youGet: 100  },
                { friends: 10, theyEarn: 2000,  youGet: 200  },
                { friends: 20, theyEarn: 4000,  youGet: 400  },
              ].map((row) => {
                const isCurrent = friendCount >= row.friends &&
                  (BONUS_MILESTONES.find(m => m.friends > friendCount)?.friends ?? Infinity) > row.friends;
                return (
                  <div
                    key={row.friends}
                    className={`grid grid-cols-3 gap-2 text-center rounded-xl px-3 py-2.5 border ${
                      isCurrent
                        ? 'bg-amber-500 border-amber-500 shadow-md'
                        : 'bg-white border-amber-100'
                    }`}
                  >
                    <p className={`font-black text-sm ${isCurrent ? 'text-white' : 'text-slate-700'}`}>
                      {row.friends} 👥
                    </p>
                    <p className={`font-semibold text-sm ${isCurrent ? 'text-white/80' : 'text-slate-600'}`}>
                      {row.theyEarn} 🪙
                    </p>
                    <p className={`font-black text-sm ${isCurrent ? 'text-white' : 'text-amber-700'}`}>
                      +{row.youGet} 🪙
                    </p>
                  </div>
                );
              })}
              <p className="text-amber-600 text-[10px] text-center font-semibold mt-1">
                * Based on ~200 coins/day per friend avg earnings
              </p>
            </div>
          </div>

          {/* Joining bonus info */}
          <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-3">
            <h3 className="font-black text-slate-900 text-sm flex items-center gap-2">
              <Gift size={16} className="text-emerald-500" /> Joining Bonus
            </h3>
            <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3.5">
              <div>
                <p className="text-slate-700 font-black text-sm">Per active friend joined</p>
                <p className="text-slate-400 text-xs mt-0.5">Credited when friend completes first task</p>
              </div>
              <span className="text-emerald-700 font-black text-xl">+{COINS_PER_REFERRAL} 🪙</span>
            </div>
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5">
              <Zap size={14} className="text-violet-500 flex-shrink-0" />
              <p className="text-slate-600 text-xs font-semibold">
                Plus <span className="text-amber-700 font-black">10% of all their future earnings</span> — no expiry!
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ════════════ FRIENDS TAB ════════════ */}
      {activeTab === 'friends' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-slate-500 text-xs font-semibold">
              {referrals.length} invited · {activeCount} active · {pendingCount} pending
            </p>
            <button
              onClick={loadReferrals}
              className="flex items-center gap-1.5 text-xs font-bold text-rose-600 hover:text-rose-700 active:scale-95 transition-all"
            >
              <RefreshCw size={12} /> Refresh
            </button>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="bg-white border border-slate-200 rounded-2xl p-4 animate-pulse">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 bg-slate-200 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3 bg-slate-200 rounded-full w-1/2" />
                      <div className="h-2 bg-slate-200 rounded-full w-1/3" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : referrals.length === 0 ? (
            <div className="bg-white border-2 border-dashed border-slate-200 rounded-3xl p-10 text-center space-y-3">
              <div className="w-16 h-16 bg-rose-50 rounded-2xl flex items-center justify-center mx-auto">
                <UserPlus size={28} className="text-rose-400" />
              </div>
              <p className="text-slate-700 font-black text-lg">No friends yet</p>
              <p className="text-slate-400 text-sm">Share your code and start earning 10% of their coins!</p>
              <button
                onClick={copyCode}
                className="inline-flex items-center gap-2 bg-rose-600 hover:bg-rose-700 text-white font-black px-5 py-2.5 rounded-xl transition-all active:scale-95"
              >
                <Copy size={14} /> Copy Code: {referralCode}
              </button>
            </div>
          ) : (
            <div className="space-y-2.5">
              {referrals.map((ref) => {
                const initials = ref.referred_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
                const statusConfig = {
                  active:  { bg: 'bg-emerald-50', border: 'border-emerald-200', badge: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-400',            label: 'Active'  },
                  rewarded:{ bg: 'bg-blue-50',    border: 'border-blue-200',    badge: 'bg-blue-100 text-blue-700',       dot: 'bg-blue-400',               label: 'Rewarded'},
                  pending: { bg: 'bg-amber-50',   border: 'border-amber-200',   badge: 'bg-amber-100 text-amber-700',     dot: 'bg-amber-400 animate-pulse', label: 'Pending' },
                }[ref.status];
                const avatarColors = ['from-violet-400 to-purple-500','from-rose-400 to-pink-500','from-emerald-400 to-teal-500','from-amber-400 to-orange-500','from-blue-400 to-indigo-500'];
                const avatarColor = avatarColors[ref.referred_name.charCodeAt(0) % avatarColors.length];

                return (
                  <div key={ref.id} className={`${statusConfig.bg} border ${statusConfig.border} rounded-2xl overflow-hidden shadow-sm`}>
                    <div className="p-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-11 h-11 rounded-full bg-gradient-to-br ${avatarColor} flex items-center justify-center text-white font-black text-sm flex-shrink-0 shadow-sm`}>
                          {initials}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-black text-slate-900 text-sm truncate">{ref.referred_name}</p>
                            <span className={`${statusConfig.badge} text-[10px] font-black px-2 py-0.5 rounded-full flex items-center gap-1 flex-shrink-0`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${statusConfig.dot}`} />
                              {statusConfig.label}
                            </span>
                          </div>
                          <p className="text-slate-400 text-xs truncate mt-0.5">{ref.referred_email}</p>
                          <div className="flex items-center gap-3 mt-1">
                            <span className="text-[11px] text-slate-400 flex items-center gap-1">
                              <Clock size={10} /> Joined {formatDate(ref.joined_at)}
                            </span>
                            {ref.last_active && (
                              <span className="text-[11px] text-slate-400">
                                · Active {timeAgo(ref.last_active)}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Friend earnings breakdown */}
                    {ref.coins_earned > 0 && (
                      <div className="border-t border-current/10 grid grid-cols-2 divide-x divide-current/10">
                        <div className="px-4 py-2.5 text-center">
                          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Friend Earned</p>
                          <p className="font-black text-slate-800 mt-0.5">{ref.coins_earned} 🪙</p>
                        </div>
                        <div className="px-4 py-2.5 text-center bg-amber-50/50">
                          <p className="text-[10px] text-amber-600 font-bold uppercase tracking-wider">Your 10% Cut</p>
                          <p className="font-black text-amber-700 mt-0.5">+{ref.your_cut} 🪙</p>
                        </div>
                      </div>
                    )}
                    {ref.status === 'pending' && (
                      <div className="border-t border-amber-200/50 px-4 py-2 text-center">
                        <p className="text-[11px] text-amber-500 font-semibold">⏳ Waiting for friend to complete first task</p>
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Total summary */}
              <div className="bg-gradient-to-r from-amber-500 to-orange-500 rounded-2xl p-4 grid grid-cols-2 gap-3">
                <div className="text-center">
                  <p className="text-white/70 text-[10px] font-bold uppercase tracking-wider">Friends Earned Total</p>
                  <p className="text-white font-black text-xl mt-1">{totalFriendsEarned} 🪙</p>
                </div>
                <div className="text-center bg-white/20 rounded-xl py-2">
                  <p className="text-white/70 text-[10px] font-bold uppercase tracking-wider">Your 10% Total</p>
                  <p className="text-white font-black text-xl mt-1">+{totalYourCut} 🪙</p>
                </div>
              </div>
            </div>
          )}

          {/* Invite more CTA */}
          <div className="bg-gradient-to-br from-rose-600 to-pink-700 rounded-3xl p-5 text-white shadow-xl shadow-rose-200">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center">
                <UserPlus size={22} className="text-white" />
              </div>
              <div className="flex-1">
                <p className="font-black text-base">Invite More Friends!</p>
                <p className="text-white/70 text-xs mt-0.5">Each friend = +{COINS_PER_REFERRAL} bonus + 10% of all they earn forever</p>
              </div>
              <button
                onClick={copyCode}
                className="bg-white text-rose-700 font-black text-xs px-4 py-2.5 rounded-xl active:scale-95 transition-all flex-shrink-0 flex items-center gap-1.5"
              >
                <Copy size={12} /> Copy
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ════════════ MILESTONES TAB ════════════ */}
      {activeTab === 'milestones' && (
        <div className="space-y-3">
          <p className="text-slate-500 text-xs font-semibold px-1">
            Claim one-time bonus coins as you hit friend count milestones!
          </p>
          <div className="space-y-3">
            {BONUS_MILESTONES.map((m) => {
              const reached   = friendCount >= m.friends;
              const claimed   = claimedMilestones.includes(m.friends);
              const claiming  = claimingId === m.friends;
              const progress  = Math.min(100, (friendCount / m.friends) * 100);
              return (
                <div
                  key={m.friends}
                  className={`bg-white border-2 rounded-3xl overflow-hidden shadow-sm transition-all ${
                    claimed  ? 'border-emerald-200'
                    : reached ? 'border-amber-300 shadow-amber-100'
                    : 'border-slate-200'
                  }`}
                >
                  <div className={`h-1 bg-gradient-to-r ${m.color}`} />
                  <div className="p-4">
                    <div className="flex items-start gap-4">
                      <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${m.color} flex items-center justify-center text-3xl flex-shrink-0 shadow-lg`}>
                        {m.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-black text-slate-900 text-base">{m.label}</p>
                          <span className="font-black text-amber-600 text-sm flex-shrink-0">+{m.bonus} 🪙</span>
                        </div>
                        <p className="text-slate-500 text-xs mt-0.5">
                          {reached
                            ? claimed ? '✅ Bonus already claimed!' : '🎉 Milestone reached! Claim your bonus.'
                            : `${friendCount}/${m.friends} friends — ${m.friends - friendCount} more needed`
                          }
                        </p>
                        {!claimed && (
                          <div className="mt-2.5 space-y-1">
                            <div className="bg-slate-100 rounded-full h-2 overflow-hidden">
                              <div
                                className={`h-full rounded-full bg-gradient-to-r ${m.color} transition-all duration-700`}
                                style={{ width: `${progress}%` }}
                              />
                            </div>
                            <p className="text-[10px] text-slate-400 font-semibold">{Math.round(progress)}% complete</p>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="mt-3">
                      {claimed ? (
                        <div className="flex items-center justify-center gap-2 bg-emerald-50 border border-emerald-200 rounded-xl py-3 text-emerald-700 font-black text-sm">
                          <CheckCircle2 size={16} className="text-emerald-500" /> Claimed!
                        </div>
                      ) : reached ? (
                        <button
                          onClick={() => claimMilestone(m.friends, m.bonus)}
                          disabled={claiming}
                          className={`w-full flex items-center justify-center gap-2 bg-gradient-to-r ${m.color} text-white font-black py-3.5 rounded-xl shadow-md transition-all active:scale-[0.98] text-sm ${claiming ? 'opacity-80' : ''}`}
                        >
                          {claiming
                            ? <><RefreshCw size={15} className="animate-spin" /> Claiming...</>
                            : <><Gift size={15} /> Claim +{m.bonus} Coins</>
                          }
                        </button>
                      ) : (
                        <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">
                          <span className="text-slate-400 text-xs font-semibold">🔒 Locked</span>
                          <div className="flex items-center gap-1.5">
                            <span className="text-slate-500 text-xs font-black">{m.friends - friendCount}</span>
                            <UserPlus size={13} className="text-slate-400" />
                            <span className="text-slate-400 text-xs">more friends needed</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Potential */}
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl p-5 text-white space-y-3">
            <div className="flex items-center gap-2">
              <Crown size={16} className="text-amber-400" />
              <p className="font-black text-sm uppercase tracking-wider">Total Earning Potential</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white/10 border border-white/20 rounded-2xl p-3 text-center">
                <p className="text-2xl font-black text-amber-400">
                  {20 * COINS_PER_REFERRAL + BONUS_MILESTONES.reduce((s, m) => s + m.bonus, 0)}
                </p>
                <p className="text-white/50 text-xs mt-0.5">Bonus coins (20 friends)</p>
              </div>
              <div className="bg-white/10 border border-white/20 rounded-2xl p-3 text-center">
                <p className="text-2xl font-black text-rose-400">∞</p>
                <p className="text-white/50 text-xs mt-0.5">10% passive income</p>
              </div>
            </div>
            <div className="flex items-center gap-2 bg-amber-400/20 border border-amber-400/30 rounded-xl px-3 py-2">
              <ChevronRight size={14} className="text-amber-400" />
              <p className="text-amber-300 text-xs font-semibold">
                Plus unlimited 10% cut from friends' ongoing earnings!
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
