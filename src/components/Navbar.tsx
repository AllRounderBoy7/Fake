import React, { useState, useRef, useEffect } from 'react';
import { Tab, UserStats, AuthUser } from '../types';
import { LayoutDashboard, Wallet, Trophy, Tv, LogOut, ChevronDown, Users, Shield } from 'lucide-react';

interface NavbarProps {
  activeTab: Tab;
  setActiveTab: (tab: Tab) => void;
  stats: UserStats;
  user?: AuthUser | null;
  isAdmin?: boolean;
  onSignOut?: () => void;
  friendCount?: number;
  onAdminClick?: () => void;
}

const TABS: { id: Tab; label: string; icon: React.ReactNode; color: string; bar: string }[] = [
  { id: 'dashboard',   label: 'Home',        icon: <LayoutDashboard size={14} />, color: 'text-amber-600',   bar: 'bg-amber-500'   },
  { id: 'ads',         label: 'Watch Ads',   icon: <Tv size={14} />,              color: 'text-violet-600',  bar: 'bg-violet-500'  },
  { id: 'referral',    label: 'Friends',     icon: <Users size={14} />,           color: 'text-rose-600',    bar: 'bg-rose-500'    },
  { id: 'wallet',      label: 'Wallet',      icon: <Wallet size={14} />,          color: 'text-blue-600',    bar: 'bg-blue-500'    },
  { id: 'leaderboard', label: 'Leaderboard', icon: <Trophy size={14} />,          color: 'text-emerald-600', bar: 'bg-emerald-500' },
];

const LEVELS = ['Beginner','Bronze','Silver','Gold','Platinum','Diamond','Legend'];

export const Navbar: React.FC<NavbarProps> = ({
  activeTab, setActiveTab, stats, user, isAdmin = false, onSignOut, friendCount = 0, onAdminClick,
}) => {
  const levelName = LEVELS[Math.min(stats.level, LEVELS.length - 1)];
  const xpPct     = Math.min(100, stats.xp % 100);
  const [dropOpen, setDropOpen] = useState(false);
  const dropRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) setDropOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const initials = user?.name
    ? user.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : 'U';

  const handleTabSwitch = (e: React.MouseEvent<HTMLButtonElement>, tab: Tab) => {
    // Prevent global ad click scripts from hijacking tab-switch clicks.
    e.preventDefault();
    e.stopPropagation();
    (e.nativeEvent as Event).stopImmediatePropagation?.();
    setActiveTab(tab);
  };

  return (
    <nav className="bg-white border-b border-slate-200 shadow-sm sticky top-0 z-40">
      <div className="max-w-5xl mx-auto px-3 sm:px-4">

        {/* Top row */}
        <div className="flex items-center justify-between h-13 gap-2 py-2">

          {/* Brand */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="w-8 h-8 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl flex items-center justify-center shadow-md shadow-orange-200">
              <span className="text-white font-black text-sm leading-none">G</span>
            </div>
            <div className="hidden sm:block leading-tight">
              <p className="font-black text-slate-900 text-base leading-none">GetMe</p>
              <p className="text-slate-400 text-[10px] mt-0.5">{levelName} · Lv.{stats.level}</p>
            </div>
            <p className="sm:hidden font-black text-slate-900 text-base">GetMe</p>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-1.5">

            {/* XP bar desktop */}
            <div className="hidden md:flex flex-col items-end gap-1 mr-1">
              <span className="text-[10px] text-slate-400 font-medium">{stats.xp} XP</span>
              <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-violet-400 to-purple-500 rounded-full transition-all duration-500"
                  style={{ width: `${xpPct}%` }} />
              </div>
            </div>

            {/* Admin button (admin only) */}
            {isAdmin && onAdminClick && (
              <button onClick={onAdminClick}
                className="hidden md:flex items-center gap-1 bg-amber-50 border border-amber-200 text-amber-700 text-xs font-black px-2.5 py-1.5 rounded-xl hover:bg-amber-100 transition-colors">
                <Shield size={12} /> Admin
              </button>
            )}

            {/* Coin badge */}
            <div className="flex items-center gap-1 bg-amber-50 border-2 border-amber-200 rounded-xl px-2.5 py-1.5">
              <span className="text-sm leading-none">🪙</span>
              <span className="font-black text-amber-700 text-sm tabular-nums">{stats.coins.toLocaleString()}</span>
            </div>

            {/* User dropdown */}
            {user && (
              <div className="relative" ref={dropRef}>
                <button onClick={() => setDropOpen(o => !o)}
                  className="flex items-center gap-1 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl px-2 py-1.5 transition-colors">
                  <div className="w-6 h-6 bg-gradient-to-br from-violet-500 to-indigo-600 rounded-lg flex items-center justify-center">
                    <span className="text-white text-[9px] font-black">{initials}</span>
                  </div>
                  <span className="hidden sm:block text-slate-700 font-semibold text-xs max-w-[70px] truncate">{user.name}</span>
                  <ChevronDown size={11} className={`text-slate-400 transition-transform ${dropOpen ? 'rotate-180' : ''}`} />
                </button>

                {dropOpen && (
                  <div className="absolute right-0 top-full mt-2 w-52 bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden z-50 animate-slide-up">
                    <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 bg-gradient-to-br from-violet-500 to-indigo-600 rounded-xl flex items-center justify-center flex-shrink-0">
                          <span className="text-white text-sm font-black">{initials}</span>
                        </div>
                        <div className="min-w-0">
                          <p className="font-black text-slate-800 text-sm truncate">{user.name}</p>
                          <p className="text-slate-400 text-xs truncate">{user.email}</p>
                        </div>
                      </div>
                      <div className="mt-2 bg-white border border-slate-200 rounded-xl px-3 py-2 flex items-center justify-between">
                        <span className="text-xs text-slate-500 font-semibold">⭐ {levelName}</span>
                        <span className="text-xs font-black text-amber-600">{stats.coins.toLocaleString()} 🪙</span>
                      </div>
                    </div>

                    {(isAdmin && onAdminClick) && (
                      <button onClick={() => { setDropOpen(false); onAdminClick(); }}
                        className="w-full flex items-center gap-3 px-4 py-3 text-amber-600 hover:bg-amber-50 transition-colors text-sm font-bold border-b border-slate-100">
                        <Shield size={14} /> Admin Panel
                      </button>
                    )}

                    <button onClick={() => { setDropOpen(false); onSignOut?.(); }}
                      className="w-full flex items-center gap-3 px-4 py-3 text-red-500 hover:bg-red-50 transition-colors text-sm font-bold">
                      <LogOut size={14} /> Sign Out
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Desktop tab bar */}
        <div className="hidden md:flex items-center gap-0.5 border-t border-slate-100">
          {TABS.map(tab => {
            const isActive = activeTab === tab.id;
            return (
              <button key={tab.id} onClick={(e) => handleTabSwitch(e, tab.id)}
                className={`relative flex items-center gap-1.5 px-3 py-2.5 text-xs font-bold whitespace-nowrap transition-colors ${
                  isActive ? tab.color : 'text-slate-500 hover:text-slate-700'
                }`}>
                {tab.icon} {tab.label}
                {tab.id === 'referral' && friendCount > 0 && (
                  <span className="min-w-[16px] h-4 bg-rose-500 text-white rounded-full text-[9px] font-black flex items-center justify-center px-1">
                    {friendCount}
                  </span>
                )}
                {isActive && <span className={`absolute bottom-0 left-0 right-0 h-[2px] rounded-t-full ${tab.bar}`} />}
              </button>
            );
          })}
        </div>

      </div>
    </nav>
  );
};

/* ── Mobile Bottom Navigation ── */
const MOBILE_TABS = [
  { id: 'dashboard'   as Tab, label: 'Home',    emoji: '🏠', color: 'text-amber-600',   bar: 'bg-amber-500',   bg: 'bg-amber-50'   },
  { id: 'ads'         as Tab, label: 'Ads',     emoji: '📺', color: 'text-violet-600',  bar: 'bg-violet-500',  bg: 'bg-violet-50'  },
  { id: 'referral'    as Tab, label: 'Friends', emoji: '👥', color: 'text-rose-600',    bar: 'bg-rose-500',    bg: 'bg-rose-50'    },
  { id: 'wallet'      as Tab, label: 'Wallet',  emoji: '💰', color: 'text-blue-600',    bar: 'bg-blue-500',    bg: 'bg-blue-50'    },
  { id: 'leaderboard' as Tab, label: 'Top',     emoji: '🏆', color: 'text-emerald-600', bar: 'bg-emerald-500', bg: 'bg-emerald-50' },
];

export const MobileNav: React.FC<{
  activeTab: Tab;
  setActiveTab: (t: Tab) => void;
  friendCount?: number;
}> = ({ activeTab, setActiveTab, friendCount = 0 }) => {
  const handleTabSwitch = (e: React.MouseEvent<HTMLButtonElement>, tab: Tab) => {
    // Block global ad click scripts on mobile tab bar interactions.
    e.preventDefault();
    e.stopPropagation();
    (e.nativeEvent as Event).stopImmediatePropagation?.();
    setActiveTab(tab);
  };

  return (
  <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/96 backdrop-blur border-t border-slate-200 shadow-[0_-1px_12px_rgba(0,0,0,0.07)]">
    <div className="flex items-stretch">
      {MOBILE_TABS.map(tab => {
        const isActive = activeTab === tab.id;
        return (
          <button key={tab.id} onClick={(e) => handleTabSwitch(e, tab.id)}
            className="relative flex-1 flex flex-col items-center justify-center gap-0.5 py-2 min-h-[52px]"
            style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' } as React.CSSProperties}>
            {isActive && <span className={`absolute top-0 left-1/2 -translate-x-1/2 w-6 h-[2px] rounded-b-full ${tab.bar}`} />}
            {isActive && <span className={`absolute inset-x-1 inset-y-0.5 rounded-xl ${tab.bg} opacity-60`} />}
            {tab.id === 'referral' && friendCount > 0 && (
              <span className="absolute top-1 right-[12%] min-w-[14px] h-3.5 bg-rose-500 text-white rounded-full text-[8px] font-black flex items-center justify-center px-0.5 z-10">
                {friendCount}
              </span>
            )}
            <span className={`relative z-10 text-base leading-none transition-transform ${isActive ? 'scale-110' : 'scale-100'}`}>
              {tab.emoji}
            </span>
            <span className={`relative z-10 text-[9px] font-bold leading-none ${isActive ? tab.color : 'text-slate-400'}`}>
              {tab.label}
            </span>
          </button>
        );
      })}
    </div>
    <div style={{ height: 'env(safe-area-inset-bottom, 0px)' }} />
  </nav>
  );
};
