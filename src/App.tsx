import { useState, useCallback, useEffect, memo, useRef } from 'react';
import { Tab, AuthUser, UserStats, Transaction, Survey } from './types';
import { surveysData } from './data/surveys';
import { supabase } from './lib/supabase';
import { loadAdminConfig, getConfig, onConfigChange, AdminConfig, DEFAULT_CONFIG } from './lib/adminConfig';
import { Navbar, MobileNav } from './components/Navbar';
import { Dashboard } from './components/Dashboard';
import { WalletPage } from './components/WalletPage';
import { Leaderboard } from './components/Leaderboard';
import AdsPage from './components/AdsPage';
import { ReferralPage } from './components/ReferralPage';
import { AdminPanel } from './components/AdminPanel';
import { AnnouncementBanner } from './components/AnnouncementBanner';
import { MaintenanceScreen } from './components/MaintenanceScreen';
import { AuthPage } from './components/AuthPage';
import { validateEnvConfig } from './lib/env';


/* ─── LocalStorage Keys ─────────────────────────────── */
const STORAGE_KEYS = {
  USER: 'getme_user',
  STATS: 'getme_stats',
  TRANSACTIONS: 'getme_transactions',
  SURVEYS: 'getme_surveys',
};

const LEGACY_STORAGE_KEYS = {
  USER: 'coinearn_user',
  STATS: 'coinearn_stats',
  TRANSACTIONS: 'coinearn_transactions',
  SURVEYS: 'coinearn_surveys',
};

const REF_PENDING_KEY = 'getme_pending_ref_code';

/* ─── Initial state ─────────────────────────────────── */
const initialStats: UserStats = {
  coins: 0,
  surveysCompleted: 0,
  captchasSolved: 0,
  totalEarned: 0,
  level: 1,
  xp: 0,
  streak: 0,
};

let txId = 100;

/* ─── LocalStorage helpers ─────────────────────────── */
const saveToStorage = (key: string, value: unknown) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.warn('Storage save failed:', e);
  }
};

const loadFromStorage = <T,>(key: string, fallback: T, legacyKey?: string): T => {
  try {
    const stored = localStorage.getItem(key) ?? (legacyKey ? localStorage.getItem(legacyKey) : null);
    return stored ? JSON.parse(stored) : fallback;
  } catch (e) {
    console.warn('Storage load failed:', e);
    return fallback;
  }
};

const formatDate = () =>
  new Date().toLocaleString('en-IN', {
    month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });

const formatDateFromIso = (iso?: string | null) => {
  if (!iso) return formatDate();
  return new Date(iso).toLocaleString('en-IN', {
    month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
};

/* ─── Feature disabled placeholder ─────────────────── */
const FeatureDisabled = memo(({ name, icon }: { name: string; icon: string }) => (
  <div className="flex flex-col items-center justify-center min-h-[55vh] text-center px-4">
    <div className="w-20 h-20 bg-slate-100 rounded-3xl flex items-center justify-center mb-4 text-4xl">
      {icon}
    </div>
    <h2 className="text-xl font-black text-slate-700 mb-2">{name} Unavailable</h2>
    <p className="text-slate-400 text-sm max-w-xs">
      Temporarily disabled by admin. Please check back later.
    </p>
  </div>
));



/* ─── App ───────────────────────────────────────────── */
export function App() {
  const [isOnline, setIsOnline] = useState<boolean>(() =>
    typeof navigator === 'undefined' ? true : navigator.onLine,
  );

  /* Auth — load from localStorage first for instant login */
  const [authUser, setAuthUser] = useState<AuthUser | null>(() => 
    loadFromStorage<AuthUser | null>(STORAGE_KEYS.USER, null, LEGACY_STORAGE_KEYS.USER)
  );
  const [authChecked, setAuthChecked] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [pendingReferralCode, setPendingReferralCode] = useState<string>(() =>
    localStorage.getItem(REF_PENDING_KEY)?.trim().toUpperCase() ?? '',
  );

  /* UI */
  const [activeTab, setActiveTab]   = useState<Tab>('dashboard');
  const [showAdmin, setShowAdmin]   = useState(false);

  /* Game state — load from localStorage */
  const [stats, setStats] = useState<UserStats>(() => 
    loadFromStorage<UserStats>(STORAGE_KEYS.STATS, initialStats, LEGACY_STORAGE_KEYS.STATS)
  );
  const [transactions, setTransactions] = useState<Transaction[]>(() =>
    loadFromStorage<Transaction[]>(STORAGE_KEYS.TRANSACTIONS, [], LEGACY_STORAGE_KEYS.TRANSACTIONS)
  );
  const [surveys, setSurveys] = useState<Survey[]>(() => {
    const saved = loadFromStorage<Survey[] | null>(STORAGE_KEYS.SURVEYS, null, LEGACY_STORAGE_KEYS.SURVEYS);
    return saved ?? surveysData;
  });

  /* Friends */
  const [friendCount, setFriendCount]             = useState(0);
  const [friendTotalEarned, setFriendTotalEarned] = useState(0);

  /* Admin config */
  const [adminConfig, setAdminConfig] = useState<AdminConfig>({ ...DEFAULT_CONFIG });
  const profileLoadedRef = useRef(false);

  /* ── Network status: app works only when internet is available ── */
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const ensureUserProfile = useCallback(async (u: AuthUser) => {
    const basePayload = {
      id: u.id,
      email: u.email,
      full_name: u.name,
      last_active: new Date().toISOString(),
    };

    const { error } = await supabase
      .from('user_profiles')
      .upsert(basePayload, { onConflict: 'id' });

    // Backward compatibility with older schemas that use user_id.
    if (error) {
      await supabase
        .from('user_profiles')
        .upsert({
          user_id: u.id,
          email: u.email,
          full_name: u.name,
          last_active: new Date().toISOString(),
        }, { onConflict: 'user_id' });
    }
  }, []);

  const saveProfileToSupabase = useCallback(async (
    u: AuthUser,
    payload: {
      coins: number;
      total_earned: number;
      surveys_completed: number;
      captchas_solved: number;
      level: number;
      xp: number;
      streak: number;
      friend_count: number;
      friends_total_earned: number;
    },
  ) => {
    const fullPayload = {
      id: u.id,
      email: u.email,
      full_name: u.name,
      ...payload,
      last_active: new Date().toISOString(),
    };

    let { error } = await supabase.from('user_profiles').upsert(fullPayload, { onConflict: 'id' });

    // Retry without optional friend columns if schema does not include them yet.
    if (error) {
      const minimalPayload = {
        id: u.id,
        email: u.email,
        full_name: u.name,
        coins: payload.coins,
        total_earned: payload.total_earned,
        surveys_completed: payload.surveys_completed,
        captchas_solved: payload.captchas_solved,
        level: payload.level,
        xp: payload.xp,
        streak: payload.streak,
        last_active: new Date().toISOString(),
      };
      ({ error } = await supabase.from('user_profiles').upsert(minimalPayload, { onConflict: 'id' }));
    }

    // Legacy schema fallback.
    if (error) {
      const legacyPayload = {
        user_id: u.id,
        email: u.email,
        full_name: u.name,
        coins: payload.coins,
        total_earned: payload.total_earned,
        surveys_completed: payload.surveys_completed,
        captchas_solved: payload.captchas_solved,
        level: payload.level,
        xp: payload.xp,
        streak: payload.streak,
        last_active: new Date().toISOString(),
      };
      await supabase.from('user_profiles').upsert(legacyPayload, { onConflict: 'user_id' });
    }
  }, []);

  const loadUserData = useCallback(async (u: AuthUser) => {
    profileLoadedRef.current = false;

    const profileById = await supabase
      .from('user_profiles')
      .select('coins,total_earned,surveys_completed,captchas_solved,level,xp,streak,friend_count,friends_total_earned')
      .eq('id', u.id)
      .maybeSingle();

    const profile = profileById.data ?? null;

    // Backward compatibility for legacy schemas.
    let legacyProfile: Record<string, number | null> | null = null;
    if (!profile) {
      const byUserId = await supabase
        .from('user_profiles')
        .select('coins,total_earned,surveys_completed,captchas_solved,level,xp,streak,friend_count,friends_total_earned')
        .eq('user_id', u.id)
        .maybeSingle();
      legacyProfile = byUserId.data ?? null;
    }

    const p = profile ?? legacyProfile;
    if (p) {
      setStats({
        coins: p.coins ?? 0,
        totalEarned: p.total_earned ?? 0,
        surveysCompleted: p.surveys_completed ?? 0,
        captchasSolved: p.captchas_solved ?? 0,
        level: p.level ?? 1,
        xp: p.xp ?? 0,
        streak: p.streak ?? 0,
      });
      setFriendCount(p.friend_count ?? 0);
      setFriendTotalEarned(p.friends_total_earned ?? 0);
    }

    // Fallback to compute friend data from referrals table if profile columns are absent.
    const referralsRes = await supabase
      .from('referrals')
      .select('status,referred_earnings', { count: 'exact' })
      .eq('referrer_id', u.id);

    if (!referralsRes.error && referralsRes.data) {
      const active = referralsRes.data.filter((r) => r.status === 'active' || r.status === 'rewarded').length;
      const totalFriendEarned = referralsRes.data.reduce((sum, r) => sum + (r.referred_earnings ?? 0), 0);
      setFriendCount((curr) => (curr > 0 ? curr : active));
      setFriendTotalEarned((curr) => (curr > 0 ? curr : totalFriendEarned));
    }

    const tx = await supabase
      .from('transactions')
      .select('id,type,source,amount,created_at')
      .eq('user_id', u.id)
      .order('created_at', { ascending: false })
      .limit(100);

    if (!tx.error && tx.data) {
      const mapped: Transaction[] = tx.data.map((row, idx) => ({
        id: Number(String(row.id).replace(/[^0-9]/g, '').slice(-8)) || (100000 + idx),
        type: row.type === 'withdraw' ? 'withdraw' : 'earn',
        source: row.source,
        amount: row.amount,
        date: formatDateFromIso(row.created_at),
      }));
      setTransactions(mapped);
    }

    profileLoadedRef.current = true;
  }, []);

  const refreshFriendStats = useCallback(async (userId: string) => {
    const referralsRes = await supabase
      .from('referrals')
      .select('status,referred_earnings')
      .eq('referrer_id', userId);

    if (!referralsRes.error && referralsRes.data) {
      const active = referralsRes.data.filter((r) => r.status === 'active' || r.status === 'rewarded').length;
      const totalFriendEarned = referralsRes.data.reduce((sum, r) => sum + (r.referred_earnings ?? 0), 0);
      setFriendCount(active);
      setFriendTotalEarned(totalFriendEarned);
    }
  }, []);

  /* ── Real authentication with Supabase + localStorage fallback ── */
  useEffect(() => {
    const envErrors = validateEnvConfig();
    if (envErrors.length > 0) {
      console.error('Environment configuration issues:', envErrors.join(' | '));
    }

    const fetchIsAdmin = async (uid: string) => {
      const byUserId = await supabase
        .from('user_profiles')
        .select('is_admin')
        .eq('user_id', uid)
        .maybeSingle();

      if (!byUserId.error && byUserId.data) {
        setIsAdmin(Boolean(byUserId.data.is_admin));
        return;
      }

      // Backward compatibility with older schema using id instead of user_id.
      const byId = await supabase
        .from('user_profiles')
        .select('is_admin')
        .eq('id', uid)
        .maybeSingle();

      setIsAdmin(Boolean(byId.data?.is_admin));
    };

    // Check existing session from Supabase
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        const u = session.user;
        const userData: AuthUser = {
          id: u.id,
          email: u.email ?? '',
          name: u.user_metadata?.full_name ?? u.email?.split('@')[0] ?? 'User',
        };
        setAuthUser(userData);
        saveToStorage(STORAGE_KEYS.USER, userData);
        void ensureUserProfile(userData).then(() => loadUserData(userData));
        void fetchIsAdmin(u.id);
      }
      setAuthChecked(true);
    });

    // Listen for auth changes
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        const u = session.user;
        const userData: AuthUser = {
          id: u.id,
          email: u.email ?? '',
          name: u.user_metadata?.full_name ?? u.email?.split('@')[0] ?? 'User',
        };
        setAuthUser(userData);
        saveToStorage(STORAGE_KEYS.USER, userData);
        void ensureUserProfile(userData).then(() => loadUserData(userData));
        void fetchIsAdmin(u.id);
      } else {
        setAuthUser(null);
        setIsAdmin(false);
        profileLoadedRef.current = false;
        localStorage.removeItem(STORAGE_KEYS.USER);
      }
    });
    return () => listener.subscription.unsubscribe();
  }, [ensureUserProfile, loadUserData]);

  /* ── Realtime sync for account coins/stats + friends (Supabase live) ── */
  useEffect(() => {
    if (!authUser) return;

    const profileChannel = supabase
      .channel(`profile-live:${authUser.id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'user_profiles', filter: `id=eq.${authUser.id}` },
        (payload) => {
          const row = payload.new as Partial<{
            coins: number;
            total_earned: number;
            surveys_completed: number;
            captchas_solved: number;
            level: number;
            xp: number;
            streak: number;
            friend_count: number;
            friends_total_earned: number;
          }>;

          setStats((prev) => ({
            ...prev,
            coins: row.coins ?? prev.coins,
            totalEarned: row.total_earned ?? prev.totalEarned,
            surveysCompleted: row.surveys_completed ?? prev.surveysCompleted,
            captchasSolved: row.captchas_solved ?? prev.captchasSolved,
            level: row.level ?? prev.level,
            xp: row.xp ?? prev.xp,
            streak: row.streak ?? prev.streak,
          }));

          if (typeof row.friend_count === 'number') setFriendCount(row.friend_count);
          if (typeof row.friends_total_earned === 'number') setFriendTotalEarned(row.friends_total_earned);
        },
      )
      .subscribe();

    const profileLegacyChannel = supabase
      .channel(`profile-legacy-live:${authUser.id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'user_profiles', filter: `user_id=eq.${authUser.id}` },
        (payload) => {
          const row = payload.new as Partial<{
            coins: number;
            total_earned: number;
            surveys_completed: number;
            captchas_solved: number;
            level: number;
            xp: number;
            streak: number;
            friend_count: number;
            friends_total_earned: number;
          }>;

          setStats((prev) => ({
            ...prev,
            coins: row.coins ?? prev.coins,
            totalEarned: row.total_earned ?? prev.totalEarned,
            surveysCompleted: row.surveys_completed ?? prev.surveysCompleted,
            captchasSolved: row.captchas_solved ?? prev.captchasSolved,
            level: row.level ?? prev.level,
            xp: row.xp ?? prev.xp,
            streak: row.streak ?? prev.streak,
          }));

          if (typeof row.friend_count === 'number') setFriendCount(row.friend_count);
          if (typeof row.friends_total_earned === 'number') setFriendTotalEarned(row.friends_total_earned);
        },
      )
      .subscribe();

    const referralsChannel = supabase
      .channel(`referrals-live:${authUser.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'referrals', filter: `referrer_id=eq.${authUser.id}` },
        () => {
          void refreshFriendStats(authUser.id);
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(profileChannel);
      void supabase.removeChannel(profileLegacyChannel);
      void supabase.removeChannel(referralsChannel);
    };
  }, [authUser, refreshFriendStats]);

  /* ── Save stats to localStorage whenever they change ── */
  useEffect(() => {
    if (authUser) {
      saveToStorage(STORAGE_KEYS.STATS, stats);
    }
  }, [stats, authUser]);

  // Persist core user data to Supabase account profile.
  useEffect(() => {
    if (!authUser || !profileLoadedRef.current) return;

    const payload = {
      coins: stats.coins,
      total_earned: stats.totalEarned,
      surveys_completed: stats.surveysCompleted,
      captchas_solved: stats.captchasSolved,
      level: stats.level,
      xp: stats.xp,
      streak: stats.streak,
      friend_count: friendCount,
      friends_total_earned: friendTotalEarned,
    };

    const timer = setTimeout(async () => {
      await saveProfileToSupabase(authUser, payload);
    }, 700);

    return () => clearTimeout(timer);
  }, [authUser, stats, friendCount, friendTotalEarned, saveProfileToSupabase]);

  /* ── Save transactions to localStorage ── */
  useEffect(() => {
    if (authUser) {
      saveToStorage(STORAGE_KEYS.TRANSACTIONS, transactions);
    }
  }, [transactions, authUser]);

  /* ── Save surveys completion status ── */
  useEffect(() => {
    if (authUser) {
      saveToStorage(STORAGE_KEYS.SURVEYS, surveys);
    }
  }, [surveys, authUser]);

  /* ── Admin config + real-time ── */
  useEffect(() => {
    loadAdminConfig().then(() => setAdminConfig({ ...getConfig() }));
    return onConfigChange((cfg) => setAdminConfig({ ...cfg }));
  }, []);

  /* ── Store referral code from URL so it survives login/sign-up flow ── */
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const refCode = params.get('ref')?.trim().toUpperCase();
    if (refCode) {
      localStorage.setItem(REF_PENDING_KEY, refCode);
      setPendingReferralCode(refCode);
    }
  }, []);

  const handleSetPendingReferralCode = useCallback((code: string) => {
    const normalized = code.trim().toUpperCase();
    if (!normalized) return;
    localStorage.setItem(REF_PENDING_KEY, normalized);
    setPendingReferralCode(normalized);
  }, []);

  /* ── Auto-apply pending referral after login (real Supabase flow) ── */
  useEffect(() => {
    if (!authUser) return;
    const pendingRef = localStorage.getItem(REF_PENDING_KEY);
    if (!pendingRef) return;

    let cancelled = false;
    const applyPendingReferral = async () => {
      const { error } = await supabase.rpc('apply_referral_code', { p_code: pendingRef });
      if (!error && !cancelled) {
        localStorage.removeItem(REF_PENDING_KEY);
        setPendingReferralCode('');
        const url = new URL(window.location.href);
        url.searchParams.delete('ref');
        window.history.replaceState({}, '', url.toString());
      }
    };

    void applyPendingReferral();
    return () => {
      cancelled = true;
    };
  }, [authUser]);

  // If admin access is removed in Supabase while panel is open, close it immediately.
  useEffect(() => {
    if (!isAdmin && showAdmin) setShowAdmin(false);
  }, [isAdmin, showAdmin]);

  /* ── Sign out ── */
  const handleSignOut = useCallback(async () => {
    await supabase.auth.signOut();
    // Clear all localStorage data
    localStorage.removeItem(STORAGE_KEYS.USER);
    localStorage.removeItem(STORAGE_KEYS.STATS);
    localStorage.removeItem(STORAGE_KEYS.TRANSACTIONS);
    localStorage.removeItem(STORAGE_KEYS.SURVEYS);
    localStorage.removeItem(LEGACY_STORAGE_KEYS.USER);
    localStorage.removeItem(LEGACY_STORAGE_KEYS.STATS);
    localStorage.removeItem(LEGACY_STORAGE_KEYS.TRANSACTIONS);
    localStorage.removeItem(LEGACY_STORAGE_KEYS.SURVEYS);
    // Reset state
    setAuthUser(null);
    setIsAdmin(false);
    setStats(initialStats);
    setTransactions([]);
    setSurveys(surveysData);
    setFriendCount(0);
    setActiveTab('dashboard');
  }, []);

  /* ── Throttle helpers ── */
  const isThrottled = useCallback(
    (earned: number) => earned >= adminConfig.throttle_threshold,
    [adminConfig.throttle_threshold],
  );

  const getReward = useCallback((type: 'survey' | 'captcha' | 'ad', earned: number) => {
    const t = isThrottled(earned);
    if (type === 'survey')  return t ? adminConfig.throttle_survey_reward  : adminConfig.survey_reward;
    if (type === 'captcha') return t ? adminConfig.throttle_captcha_reward : adminConfig.captcha_reward;
    if (type === 'ad')      return t ? adminConfig.throttle_ad_reward      : adminConfig.ad_reward;
    return 0;
  }, [adminConfig, isThrottled]);

  const getFriendCutPct = useCallback(
    (earned: number) => isThrottled(earned)
      ? adminConfig.throttle_friend_cut_pct
      : adminConfig.friend_cut_pct,
    [adminConfig, isThrottled],
  );

  /* ── Coin engine ── */
  const addCoins = useCallback((amount: number, source: string, type: 'earn' | 'withdraw' = 'earn') => {
    setStats((prev) => {
      const newCoins = type === 'earn' ? prev.coins + amount : prev.coins - amount;
      const newTotal = type === 'earn' ? prev.totalEarned + amount : prev.totalEarned;
      const newXp    = prev.xp + (type === 'earn' ? Math.floor(amount / 4) : 0);
      return {
        ...prev,
        coins: Math.max(0, newCoins),
        totalEarned: newTotal,
        xp: newXp,
        level: Math.floor(newXp / 100),
      };
    });
    setTransactions((prev) => [
      ...prev,
      { id: txId++, type, source, amount, date: formatDate() },
    ]);

    if (authUser) {
      void supabase.from('transactions').insert({
        user_id: authUser.id,
        type,
        source,
        amount,
        status: 'completed',
      });
    }
  }, [authUser]);

  /* ── Event handlers ── */
  const handleSurveyComplete = useCallback((surveyId: number, _orig: number) => {
    const title  = surveys.find((s) => s.id === surveyId)?.title ?? 'Survey';
    const reward = getReward('survey', stats.totalEarned);
    setSurveys((prev) => prev.map((s) => s.id === surveyId ? { ...s, completed: true } : s));
    setStats((prev) => ({ ...prev, surveysCompleted: prev.surveysCompleted + 1 }));
    addCoins(reward, `Survey: ${title}`);
  }, [surveys, addCoins, getReward, stats.totalEarned]);

  const handleCaptchaEarn = useCallback((_amt: number, source: string) => {
    const reward = getReward('captcha', stats.totalEarned);
    setStats((prev) => ({ ...prev, captchasSolved: prev.captchasSolved + 1 }));
    addCoins(reward, source);
  }, [addCoins, getReward, stats.totalEarned]);

  const handleAdEarn = useCallback((amt: number, source: string) => {
    addCoins(amt, source);
  }, [addCoins]);

  const handleWithdraw = useCallback((amount: number, method: string) => {
    addCoins(amount, `Withdrawal via ${method}`, 'withdraw');
  }, [addCoins]);

  const handleReferralEarn = useCallback((amount: number, source: string) => {
    const cutPct = getFriendCutPct(stats.totalEarned);
    const actual = Math.floor(amount * cutPct / 100) || amount;
    addCoins(actual, source);
  }, [addCoins, getFriendCutPct, stats.totalEarned]);

  /* ── Derived ── */
  const throttled     = isThrottled(stats.totalEarned);
  const surveyReward  = throttled ? adminConfig.throttle_survey_reward  : adminConfig.survey_reward;
  const captchaReward = throttled ? adminConfig.throttle_captcha_reward : adminConfig.captcha_reward;
  const adReward      = throttled ? adminConfig.throttle_ad_reward      : adminConfig.ad_reward;
  const friendCutPct  = throttled ? adminConfig.throttle_friend_cut_pct : adminConfig.friend_cut_pct;

  /* ── Auth handler ── */
  const handleAuth = useCallback((user: { id: string; email: string; name: string }) => {
    setAuthUser(user);
  }, []);

  /* ── Auth guard — show login page if not authenticated ── */
  /* Wait for auth check to complete to avoid login flash */
  if (!isOnline) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center px-4">
        <div className="w-full max-w-md rounded-2xl border border-rose-500/40 bg-slate-900/90 p-6 text-center shadow-xl">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-500/20 text-3xl">
            📶
          </div>
          <h1 className="text-xl font-black tracking-tight">No Internet Connection</h1>
          <p className="mt-2 text-sm text-slate-300">
            GetMe works only when internet is on. Please connect to mobile data or Wi-Fi and try again.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="mt-5 w-full rounded-xl bg-rose-500 px-4 py-3 text-sm font-bold text-white transition hover:bg-rose-600"
          >
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  if (!authChecked && !authUser) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl flex items-center justify-center mx-auto mb-4 animate-pulse">
            <span className="text-2xl">🪙</span>
          </div>
          <p className="text-slate-400 text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  if (!authUser) {
    return (
      <AuthPage
        onAuth={handleAuth}
        initialReferralCode={pendingReferralCode}
        onSetPendingReferralCode={handleSetPendingReferralCode}
      />
    );
  }

  /* ── Maintenance mode ── */
  if (adminConfig.maintenance_mode) {
    return (
      <>
        {showAdmin && <AdminPanel user={authUser} isAdmin={isAdmin} onClose={() => setShowAdmin(false)} />}
        <MaintenanceScreen message={adminConfig.maintenance_message} />
        {isAdmin && (
          <button
            onClick={() => setShowAdmin(true)}
            className="fixed bottom-6 right-6 z-50 w-12 h-12 bg-amber-500 rounded-full flex items-center justify-center shadow-xl"
          >
            <span className="text-white text-xl">🛡</span>
          </button>
        )}
      </>
    );
  }

  /* ── Main app ── */
  return (
    <div className="app-shell min-h-screen bg-slate-50">

      {/* Announcement banner */}
      <AnnouncementBanner config={adminConfig} />

      {/* Throttle warning */}
      {throttled && (
        <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-2 flex items-center justify-center gap-2 text-white text-xs font-bold">
          <span>⚡</span>
          <span>
            Rate reduced after {adminConfig.throttle_threshold.toLocaleString()}🪙 earned —
            Survey {surveyReward}🪙 · CAPTCHA {captchaReward}🪙 · Ads {adReward}🪙 · Friends {friendCutPct}%
          </span>
        </div>
      )}

      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        stats={stats}
        user={authUser}
        isAdmin={isAdmin}
        onSignOut={handleSignOut}
        friendCount={friendCount}
        onAdminClick={isAdmin ? () => setShowAdmin(true) : undefined}
      />

      <main className="max-w-6xl mx-auto px-3 sm:px-4 py-4 pb-24 md:pb-8">

        {/* ── Dashboard / Home ── */}
        {activeTab === 'dashboard' && (
          <Dashboard
            stats={stats}
            transactions={transactions}
            setActiveTab={setActiveTab}
            user={authUser}
            surveys={surveys}
            onSurveyComplete={handleSurveyComplete}
            onCaptchaEarn={handleCaptchaEarn}
            surveysEnabled={adminConfig.surveys_enabled}
            captchaEnabled={adminConfig.captcha_enabled}
            surveyReward={surveyReward}
            captchaReward={captchaReward}
            surveyDailyLimit={adminConfig.survey_daily_limit}
            captchaDailyLimit={adminConfig.captcha_daily_limit}
            surveyClaimWaitSeconds={adminConfig.survey_claim_wait_seconds}
            captchaClaimWaitSeconds={adminConfig.captcha_claim_wait_seconds}
            throttled={throttled}
            throttleThreshold={adminConfig.throttle_threshold}
          />
        )}

        {/* ── Ads ── */}
        {activeTab === 'ads' && (adminConfig.ads_enabled ? (
          <AdsPage
            onEarn={handleAdEarn}
            friendCount={friendCount}
            friendTotalEarned={friendTotalEarned}
            adReward={adReward}
            friendCut={friendCutPct}
            minAdViewSeconds={adminConfig.ad_view_min_seconds}
          />
        ) : (
          <FeatureDisabled name="Ads" icon="📺" />
        ))}

        {/* ── Friends / Referral ── */}
        {activeTab === 'referral' && (adminConfig.referral_enabled ? (
          <ReferralPage
            user={authUser}
            onEarn={handleReferralEarn}
            friendCount={friendCount}
            setFriendCount={setFriendCount}
            onFriendTotalEarned={setFriendTotalEarned}
            friendCutPct={friendCutPct}
          />
        ) : (
          <FeatureDisabled name="Friends & Referral" icon="👥" />
        ))}

        {/* ── Wallet ── */}
        {activeTab === 'wallet' && (adminConfig.wallet_enabled ? (
          <WalletPage
            stats={stats}
            transactions={transactions}
            onWithdraw={handleWithdraw}
            config={adminConfig}
          />
        ) : (
          <FeatureDisabled name="Wallet" icon="💰" />
        ))}

        {/* ── Leaderboard ── */}
        {activeTab === 'leaderboard' && (adminConfig.leaderboard_enabled ? (
          <Leaderboard userStats={stats} config={adminConfig} />
        ) : (
          <FeatureDisabled name="Leaderboard" icon="🏆" />
        ))}

      </main>

      {/* Admin Panel */}
      {isAdmin && showAdmin && <AdminPanel user={authUser} isAdmin={isAdmin} onClose={() => setShowAdmin(false)} />}

      {/* ── Mobile Bottom Navigation ── */}
      <MobileNav activeTab={activeTab} setActiveTab={setActiveTab} friendCount={friendCount} />

    </div>
  );
}
