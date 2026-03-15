import React, { useEffect, useMemo, useState } from 'react';
import { UserStats } from '../types';
import { AdminConfig, LeaderboardEntry } from '../lib/adminConfig';
import { Trophy, Star, Medal, Crown, TrendingUp } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface LeaderboardProps {
  userStats: UserStats;
  config?: AdminConfig;
}

const BADGE_COLORS: Record<string, { bg: string; text: string; border: string; gradient: string }> = {
  Legend:   { bg: 'bg-rose-100',   text: 'text-rose-700',   border: 'border-rose-300',   gradient: 'from-rose-500 to-pink-600'     },
  Diamond:  { bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-300', gradient: 'from-purple-500 to-indigo-600'  },
  Platinum: { bg: 'bg-cyan-100',   text: 'text-cyan-700',   border: 'border-cyan-300',   gradient: 'from-cyan-400 to-blue-500'     },
  Gold:     { bg: 'bg-amber-100',  text: 'text-amber-700',  border: 'border-amber-300',  gradient: 'from-yellow-400 to-amber-500'  },
  Silver:   { bg: 'bg-slate-100',  text: 'text-slate-600',  border: 'border-slate-300',  gradient: 'from-slate-400 to-gray-500'   },
  Bronze:   { bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-300', gradient: 'from-amber-600 to-yellow-700' },
  Beginner: { bg: 'bg-gray-100',   text: 'text-gray-600',   border: 'border-gray-200',   gradient: 'from-gray-400 to-gray-500'    },
};

const RANK_ICONS = ['🥇', '🥈', '🥉'];

export const Leaderboard: React.FC<LeaderboardProps> = ({ userStats, config }) => {
  const title    = config?.leaderboard_title    ?? 'Top Earners 🏆';
  const subtitle = config?.leaderboard_subtitle ?? 'Compete with other earners worldwide!';
  const showSurveys   = config?.leaderboard_show_surveys    ?? true;
  const showCaptchas  = config?.leaderboard_show_captchas   ?? true;
  const showBadges    = config?.leaderboard_show_badges     ?? true;
  const showPodium    = config?.leaderboard_show_podium     ?? true;
  const showYourRank  = config?.leaderboard_show_your_rank  ?? true;

  const [liveEntries, setLiveEntries] = useState<LeaderboardEntry[]>([]);
  const [liveError, setLiveError] = useState<string | null>(null);

  const leaderboardMode = config?.leaderboard_mode ?? 'manual';
  const liveLimit = Math.max(5, Math.min(200, config?.leaderboard_live_limit ?? 50));
  const minCoins = Math.max(0, config?.leaderboard_min_coins ?? 0);

  // Parse leaderboard entries from config
  const mockLeaders = useMemo((): LeaderboardEntry[] => {
    try {
      const raw = config?.leaderboard_entries;
      if (raw) return JSON.parse(raw);
    } catch {}
    return [];
  }, [config?.leaderboard_entries]);

  useEffect(() => {
    if (leaderboardMode !== 'live') return;

    let mounted = true;

    const loadLive = async () => {
      setLiveError(null);
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .order('coins', { ascending: false })
        .limit(liveLimit);

      if (error) {
        if (mounted) {
          setLiveError('Live leaderboard unavailable. Showing manual entries.');
          setLiveEntries([]);
        }
        return;
      }

      const rows = (data ?? []) as Record<string, unknown>[];
      const mapped: LeaderboardEntry[] = rows
        .map((r, i) => {
          const coins = Number(r.coins ?? r.total_earned ?? 0);
          return {
            name: String(r.full_name ?? r.email ?? `Player ${i + 1}`),
            coins,
            surveys: Number(r.surveys_completed ?? 0),
            captchas: Number(r.captchas_solved ?? 0),
            avatar: String(r.avatar ?? '🙂'),
            badge: getBadge(coins, config),
          };
        })
        .filter((e) => e.coins >= minCoins);

      if (mounted) setLiveEntries(mapped);
    };

    void loadLive();

    const ch = supabase
      .channel('leaderboard-live-stream')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_profiles' }, () => {
        void loadLive();
      })
      .subscribe();

    return () => {
      mounted = false;
      void supabase.removeChannel(ch);
    };
  }, [leaderboardMode, liveLimit, minCoins, config]);

  // Build user's dynamic badge from coins
  const userBadge = getBadge(userStats.coins, config);

  const userEntry = {
    name: 'You',
    coins: userStats.coins,
    surveys: userStats.surveysCompleted,
    captchas: userStats.captchasSolved,
    avatar: '😊',
    badge: userBadge,
    isUser: true,
  };

  const sourceEntries = leaderboardMode === 'live' && liveEntries.length > 0
    ? liveEntries
    : mockLeaders;

  const allEntries = useMemo(() => [
    ...sourceEntries.map(l => ({ ...l, isUser: false })),
    userEntry,
  ]
    .sort((a, b) => b.coins - a.coins)
    .map((e, i) => ({ ...e, rank: i + 1 })),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  [sourceEntries, userStats.coins, userStats.surveysCompleted, userStats.captchasSolved]);

  const userRank = allEntries.find(e => e.isUser)?.rank ?? 99;
  const top3     = allEntries.slice(0, 3);

  return (
    <div className="max-w-2xl mx-auto space-y-4 pb-24 sm:pb-8 px-1">

      {/* ── HEADER ── */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">{title}</h2>
          <p className="text-slate-400 text-sm mt-0.5">{subtitle}</p>
        </div>
        <div className="flex items-center gap-1.5 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
          <Trophy size={15} className="text-amber-500" />
          <span className="text-xs font-black text-amber-700">{allEntries.length} Players</span>
        </div>
      </div>

      {/* ── YOUR RANK CARD ── */}
      {showYourRank && (
        <div className="relative overflow-hidden bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 rounded-2xl p-5 shadow-xl border border-slate-700/50">
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute -top-8 -right-8 w-40 h-40 bg-amber-500/10 rounded-full blur-2xl" />
            <div className="absolute -bottom-6 -left-6 w-32 h-32 bg-violet-500/10 rounded-full blur-2xl" />
          </div>
          <div className="relative flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-xl shadow-amber-500/20 flex-shrink-0">
              <span className="text-2xl font-black text-white">#{userRank}</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-white font-black text-lg">Your Rank</p>
                {showBadges && (
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full bg-gradient-to-r ${BADGE_COLORS[userBadge]?.gradient ?? 'from-gray-400 to-gray-500'} text-white`}>
                    {userBadge}
                  </span>
                )}
              </div>
              <p className="text-amber-300 font-black text-xl">{userStats.coins.toLocaleString()} 🪙</p>
              <div className="flex items-center gap-3 mt-1">
                {showSurveys && (
                  <span className="text-slate-400 text-xs flex items-center gap-1">
                    📋 {userStats.surveysCompleted} surveys
                  </span>
                )}
                {showCaptchas && (
                  <span className="text-slate-400 text-xs flex items-center gap-1">
                    🔐 {userStats.captchasSolved} captchas
                  </span>
                )}
              </div>
            </div>
            <div className="flex flex-col items-center gap-1">
              <Star size={28} className="text-amber-400" fill="currentColor" />
              {userRank <= 3 && (
                <span className="text-2xl">{RANK_ICONS[userRank - 1]}</span>
              )}
            </div>
          </div>

          {/* Progress to next rank */}
          {userRank > 1 && (
            <div className="relative mt-4 pt-4 border-t border-slate-700/50">
              <div className="flex items-center justify-between text-xs mb-2">
                <span className="text-slate-400 font-semibold">Progress to #{userRank - 1}</span>
                <span className="text-amber-400 font-bold">
                  {Math.max(0, (allEntries[userRank - 2]?.coins ?? 0) - userStats.coins).toLocaleString()} 🪙 needed
                </span>
              </div>
              {(() => {
                const prevCoins = allEntries[userRank - 2]?.coins ?? userStats.coins;
                const nextCoins = allEntries[userRank]?.coins ?? 0;
                const range = prevCoins - nextCoins;
                const progress = range > 0 ? ((userStats.coins - nextCoins) / range) * 100 : 100;
                return (
                  <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-amber-400 to-orange-500 rounded-full transition-all duration-700"
                      style={{ width: `${Math.min(100, Math.max(0, progress))}%` }} />
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      )}

      {/* ── TOP 3 PODIUM ── */}
      {showPodium && top3.length >= 3 && (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 px-5 py-4 border-b border-slate-100">
            <h3 className="font-black text-slate-800 flex items-center gap-2">
              <Crown size={18} className="text-amber-500" /> Hall of Fame
            </h3>
          </div>
          <div className="p-5">
            <div className="flex items-end justify-center gap-4">
              <PodiumCard entry={top3[1]} position={2} config={config} showBadges={showBadges} />
              <PodiumCard entry={top3[0]} position={1} config={config} showBadges={showBadges} />
              <PodiumCard entry={top3[2]} position={3} config={config} showBadges={showBadges} />
            </div>
          </div>
        </div>
      )}

      {/* ── FULL LEADERBOARD ── */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-black text-slate-800 flex items-center gap-2">
            <Medal size={16} className="text-slate-400" /> Full Rankings
          </h3>
          <div className="flex items-center gap-1.5 text-slate-400">
            <TrendingUp size={13} />
            <span className="text-xs font-semibold">Live</span>
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          </div>
        </div>

        {leaderboardMode === 'live' && (
          <div className="px-5 py-2.5 border-b border-slate-100 bg-blue-50/70 flex items-center justify-between">
            <p className="text-[11px] font-bold text-blue-700">Source: Live user_profiles (limit {liveLimit}, min {minCoins}🪙)</p>
            {liveError && <p className="text-[11px] font-bold text-red-500">{liveError}</p>}
          </div>
        )}

        <div className="divide-y divide-slate-50">
          {allEntries.map((entry) => {
            const bc = BADGE_COLORS[entry.badge] ?? BADGE_COLORS['Beginner'];
            const isTop3 = entry.rank <= 3;
            return (
              <div
                key={`${entry.name}-${entry.rank}`}
                className={`flex items-center gap-3 px-4 py-3.5 transition-colors ${
                  entry.isUser
                    ? 'bg-amber-50 border-l-4 border-l-amber-400'
                    : isTop3
                    ? 'bg-gradient-to-r from-amber-50/40 to-transparent hover:from-amber-50 hover:to-transparent'
                    : 'hover:bg-slate-50'
                }`}
              >
                {/* Rank */}
                <div className="w-10 text-center flex-shrink-0">
                  {entry.rank <= 3 ? (
                    <span className="text-xl">{RANK_ICONS[entry.rank - 1]}</span>
                  ) : (
                    <span className={`text-sm font-black ${entry.isUser ? 'text-amber-600' : 'text-slate-400'}`}>
                      #{entry.rank}
                    </span>
                  )}
                </div>

                {/* Avatar */}
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0 ${
                  entry.isUser
                    ? 'bg-amber-100 border-2 border-amber-300'
                    : isTop3
                    ? 'bg-gradient-to-br from-amber-100 to-orange-100 border border-amber-200'
                    : 'bg-slate-100 border border-slate-200'
                }`}>
                  {entry.avatar}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className={`font-black text-sm truncate ${entry.isUser ? 'text-amber-700' : 'text-slate-800'}`}>
                      {entry.name}
                      {entry.isUser && <span className="ml-1 text-amber-500 font-normal text-xs">(You)</span>}
                    </p>
                    {showBadges && (
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${bc.bg} ${bc.text} ${bc.border}`}>
                        {entry.badge}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-0.5">
                    {showSurveys && (
                      <span className="text-[10px] text-slate-400 font-medium">📋 {entry.surveys}</span>
                    )}
                    {showCaptchas && (
                      <span className="text-[10px] text-slate-400 font-medium">🔐 {entry.captchas}</span>
                    )}
                  </div>
                </div>

                {/* Coins */}
                <div className="text-right flex-shrink-0">
                  <p className={`font-black text-sm ${entry.isUser ? 'text-amber-600' : isTop3 ? 'text-amber-600' : 'text-slate-700'}`}>
                    {entry.coins.toLocaleString()}
                  </p>
                  <p className="text-[10px] text-slate-400 font-semibold">🪙 coins</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── BADGE TIERS INFO ── */}
      {showBadges && (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <h3 className="font-black text-slate-800 text-sm">Badge Tiers</h3>
            <p className="text-slate-400 text-xs mt-0.5">Earn more coins to level up your badge</p>
          </div>
          <div className="p-4 grid grid-cols-2 sm:grid-cols-3 gap-2">
            {[
              { badge: 'Legend',   coins: config?.leaderboard_badge_legend   ?? 40000 },
              { badge: 'Diamond',  coins: config?.leaderboard_badge_diamond  ?? 20000 },
              { badge: 'Platinum', coins: config?.leaderboard_badge_platinum ?? 10000 },
              { badge: 'Gold',     coins: config?.leaderboard_badge_gold     ?? 5000  },
              { badge: 'Silver',   coins: config?.leaderboard_badge_silver   ?? 2000  },
              { badge: 'Bronze',   coins: 0 },
            ].map(({ badge, coins }) => {
              const bc = BADGE_COLORS[badge];
              const isCurrentBadge = badge === userBadge;
              return (
                <div key={badge} className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                  isCurrentBadge ? `${bc.bg} ${bc.border} shadow-sm` : 'border-slate-100 bg-slate-50'
                }`}>
                  <div className={`w-8 h-8 rounded-xl bg-gradient-to-br ${bc.gradient} flex items-center justify-center flex-shrink-0`}>
                    <Trophy size={14} className="text-white" />
                  </div>
                  <div>
                    <p className={`text-xs font-black ${isCurrentBadge ? bc.text : 'text-slate-600'}`}>
                      {badge}
                      {isCurrentBadge && <span className="ml-1 text-[9px] opacity-60">(You)</span>}
                    </p>
                    <p className="text-[10px] text-slate-400">{coins > 0 ? `${coins.toLocaleString()}+ 🪙` : 'Any'}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

/* ── PODIUM CARD ── */
const PODIUM_HEIGHTS = ['h-32', 'h-24', 'h-20'];
const PODIUM_GRADIENTS = [
  'from-yellow-400 to-amber-500',
  'from-slate-300 to-gray-400',
  'from-amber-600 to-yellow-700',
];
const PODIUM_CROWNS = ['👑', '🥈', '🥉'];

const PodiumCard: React.FC<{
  entry: any;
  position: number;
  config?: AdminConfig;
  showBadges: boolean;
}> = ({ entry, position, config, showBadges }) => {
  const idx = position - 1;
  const bc  = BADGE_COLORS[entry.badge] ?? BADGE_COLORS['Beginner'];
  const badge = entry.badge ?? getBadge(entry.coins, config);

  return (
    <div className="flex flex-col items-center gap-1.5 flex-1 min-w-0">
      <span className="text-3xl">{entry.avatar}</span>
      <p className="text-xs font-black text-slate-700 text-center leading-tight truncate w-full px-1">{entry.name}</p>
      <p className="text-xs font-black text-amber-600">{entry.coins.toLocaleString()} 🪙</p>
      {showBadges && (
        <span className={`text-[9px] font-black px-2 py-0.5 rounded-full border ${bc.bg} ${bc.text} ${bc.border}`}>
          {badge}
        </span>
      )}
      <div className={`w-full ${PODIUM_HEIGHTS[idx]} bg-gradient-to-t ${PODIUM_GRADIENTS[idx]} rounded-t-xl flex items-start justify-center pt-2 shadow-sm`}>
        <span className="text-2xl">{PODIUM_CROWNS[idx]}</span>
      </div>
    </div>
  );
};

function getBadge(coins: number, config?: AdminConfig): string {
  const l  = config?.leaderboard_badge_legend   ?? 40000;
  const d  = config?.leaderboard_badge_diamond  ?? 20000;
  const pl = config?.leaderboard_badge_platinum ?? 10000;
  const g  = config?.leaderboard_badge_gold     ?? 5000;
  const s  = config?.leaderboard_badge_silver   ?? 2000;
  if (coins >= l)  return 'Legend';
  if (coins >= d)  return 'Diamond';
  if (coins >= pl) return 'Platinum';
  if (coins >= g)  return 'Gold';
  if (coins >= s)  return 'Silver';
  return 'Bronze';
}
