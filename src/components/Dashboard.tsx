import React, { useState, useEffect, useRef, useCallback } from 'react';
import { UserStats, Transaction, Survey, AuthUser, CaptchaTask, CaptchaType } from '../types';
import { generateCaptcha, solveCaptcha } from '../data/captchas';
import {
  ClipboardCheck, KeyRound, TrendingUp, Flame, Star, Zap,
  ChevronRight, Tv, ArrowLeft, CheckCircle, XCircle,
  RefreshCw, Trophy, AlertCircle, Info, Play, Clock,
  BarChart2, ArrowRight, ExternalLink,
} from 'lucide-react';
import { AllAds, SMART_LINK } from './AdScripts';

interface DashboardProps {
  stats: UserStats;
  transactions: Transaction[];
  setActiveTab: (tab: any) => void;
  user?: AuthUser | null;
  surveys: Survey[];
  onSurveyComplete: (surveyId: number, reward: number) => void;
  onCaptchaEarn: (amount: number, source: string) => void;
  surveysEnabled?: boolean;
  captchaEnabled?: boolean;
  surveyReward?: number;
  captchaReward?: number;
  surveyDailyLimit?: number;
  captchaDailyLimit?: number;
  surveyClaimWaitSeconds?: number;
  captchaClaimWaitSeconds?: number;
  throttled?: boolean;
  throttleThreshold?: number;
}

const LEVEL_NAMES  = ['Beginner','Bronze','Silver','Gold','Platinum','Diamond','Legend'];
const LEVEL_GRADS  = [
  'from-slate-600 to-slate-700',
  'from-amber-600 to-yellow-700',
  'from-slate-400 to-gray-500',
  'from-yellow-500 to-amber-500',
  'from-cyan-500 to-blue-600',
  'from-purple-500 to-indigo-600',
  'from-rose-500 to-pink-600',
];

const CAT_META: Record<string,{color:string;bg:string;border:string;icon:string}> = {
  Lifestyle:     {color:'text-green-700',  bg:'bg-green-50',  border:'border-green-200',  icon:'🌿'},
  Technology:    {color:'text-blue-700',   bg:'bg-blue-50',   border:'border-blue-200',   icon:'💻'},
  Food:          {color:'text-orange-700', bg:'bg-orange-50', border:'border-orange-200', icon:'🍜'},
  Shopping:      {color:'text-purple-700', bg:'bg-purple-50', border:'border-purple-200', icon:'🛍️'},
  Entertainment: {color:'text-pink-700',   bg:'bg-pink-50',   border:'border-pink-200',   icon:'🎬'},
};

const TYPE_META: Record<CaptchaType,{label:string;icon:string;color:string;bg:string;border:string}> = {
  alphanumeric:   {label:'Alpha',       icon:'🔤',color:'text-blue-700',   bg:'bg-blue-50',   border:'border-blue-200'},
  math_add:       {label:'Add',         icon:'➕',color:'text-emerald-700', bg:'bg-emerald-50',border:'border-emerald-200'},
  math_sub:       {label:'Subtract',    icon:'➖',color:'text-rose-700',    bg:'bg-rose-50',   border:'border-rose-200'},
  math_mul:       {label:'Multiply',    icon:'✖️',color:'text-violet-700',  bg:'bg-violet-50', border:'border-violet-200'},
  math_div:       {label:'Division',    icon:'➗',color:'text-orange-700',  bg:'bg-orange-50', border:'border-orange-200'},
  math_complex:   {label:'Complex',     icon:'🧮',color:'text-red-700',     bg:'bg-red-50',    border:'border-red-200'},
  word:           {label:'Word',        icon:'📝',color:'text-teal-700',    bg:'bg-teal-50',   border:'border-teal-200'},
  sequence:       {label:'Sequence',    icon:'🔢',color:'text-indigo-700',  bg:'bg-indigo-50', border:'border-indigo-200'},
  roman:          {label:'Roman',       icon:'🏛️',color:'text-amber-700',   bg:'bg-amber-50',  border:'border-amber-200'},
  pattern:        {label:'Pattern',     icon:'🧩',color:'text-fuchsia-700', bg:'bg-fuchsia-50',border:'border-fuchsia-200'},
  emoji_count:    {label:'Emoji',       icon:'😀',color:'text-yellow-700',  bg:'bg-yellow-50', border:'border-yellow-200'},
  missing_number: {label:'Missing',     icon:'🔍',color:'text-cyan-700',    bg:'bg-cyan-50',   border:'border-cyan-200'},
  reverse:        {label:'Reverse',     icon:'🔄',color:'text-pink-700',    bg:'bg-pink-50',   border:'border-pink-200'},
  case_mix:       {label:'CaseMix',     icon:'🅰️',color:'text-slate-700',   bg:'bg-slate-50',  border:'border-slate-200'},
};

const DIFF_META = {
  easy:   {label:'Easy',   stars:1, color:'text-emerald-600', bg:'bg-emerald-100'},
  medium: {label:'Medium', stars:2, color:'text-amber-600',   bg:'bg-amber-100'},
  hard:   {label:'Hard',   stars:3, color:'text-red-600',     bg:'bg-red-100'},
};

const DEFAULT_SURVEY_CLAIM_WAIT_SECONDS = 10;
const DEFAULT_CAPTCHA_CLAIM_WAIT_SECONDS = 5;



/* ════════════════════════════════════════════════════
   MAIN DASHBOARD
════════════════════════════════════════════════════ */
export const Dashboard: React.FC<DashboardProps> = ({
  stats, transactions, setActiveTab, user, surveys, onSurveyComplete, onCaptchaEarn,
  surveysEnabled = true, captchaEnabled: _ce = true,
  surveyReward = 15, captchaReward = 20,
  surveyDailyLimit = 10, captchaDailyLimit = 30,
  surveyClaimWaitSeconds = DEFAULT_SURVEY_CLAIM_WAIT_SECONDS,
  captchaClaimWaitSeconds = DEFAULT_CAPTCHA_CLAIM_WAIT_SECONDS,
  throttled = false, throttleThreshold = 4000,
}) => {
  const [section, setSection] = useState<'home'|'surveys'|'captcha'>('home');

  const xpForNext   = 100;
  const xpProgress  = stats.xp % xpForNext;
  const lvlIdx      = Math.min(stats.level, LEVEL_NAMES.length - 1);
  const levelName   = LEVEL_NAMES[lvlIdx];
  const levelGrad   = LEVEL_GRADS[lvlIdx];
  const earnTx      = transactions.filter(t => t.type === 'earn');
  const totalEarned = earnTx.reduce((s,t) => s + t.amount, 0);
  const avail       = surveys.filter(s => !s.completed);
  const done        = surveys.filter(s => s.completed);
  const survPct     = (done.length / surveys.length) * 100;

  /* WITHDRAW REQUIREMENTS */
  const withdrawReqs = [
    { label:'PhonePe', min:5000,  color:'bg-purple-500', icon:'📱' },
    { label:'UPI',     min:5000,  color:'bg-green-500',  icon:'💳' },
    { label:'Crypto',  min:5000,  color:'bg-amber-500',  icon:'₿'  },
    { label:'Card',    min:10000, color:'bg-blue-500',   icon:'🔵' },
    { label:'Bank',    min:10000, color:'bg-orange-500', icon:'🏦' },
  ];

  if (section === 'surveys') return (
    <SurveySection
      surveys={surveys} onBack={() => setSection('home')}
      onComplete={onSurveyComplete} reward={surveyReward}
        surveyDailyLimit={surveyDailyLimit}
        surveysCompletedToday={stats.surveysCompleted}
        claimWaitSeconds={surveyClaimWaitSeconds}
      totalEarned={transactions.filter(t=>t.type==='earn'&&t.source.startsWith('Survey')).reduce((s,t)=>s+t.amount,0)}
    />
  );

  if (section === 'captcha') return (
    <CaptchaSection
      onBack={() => setSection('home')} onEarn={onCaptchaEarn}
      reward={captchaReward} totalSolved={stats.captchasSolved}
        dailyLimit={captchaDailyLimit}
        claimWaitSeconds={captchaClaimWaitSeconds}
    />
  );

  /* HOME */
  return (
    <div className="space-y-3 pb-2 animate-fade-in">

      {/* Throttle Warning */}
      {throttled && (
        <div className="bg-amber-500 rounded-2xl px-4 py-3 flex items-start gap-2.5">
          <span className="text-xl flex-shrink-0 mt-0.5">⚡</span>
          <div>
            <p className="text-white font-black text-sm">Earning Rate Reduced</p>
            <p className="text-amber-100 text-xs mt-0.5 leading-relaxed">
              Earned {throttleThreshold.toLocaleString()}+ coins total. Now earning: Survey {surveyReward}🪙 · CAPTCHA {captchaReward}🪙
            </p>
          </div>
        </div>
      )}

      {/* ── HERO WELCOME CARD ── */}
      <div className={`bg-gradient-to-br ${levelGrad} rounded-2xl p-4 text-white shadow-lg relative overflow-hidden`}>
        <div className="absolute -right-8 -top-8 w-32 h-32 bg-white/10 rounded-full pointer-events-none" />
        <div className="absolute -right-4 -bottom-10 w-24 h-24 bg-white/10 rounded-full pointer-events-none" />
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-white/20">⭐ {levelName}</span>
            <div className="flex items-center gap-1.5 bg-white/20 rounded-full px-3 py-1.5">
              <span className="text-sm">🪙</span>
              <span className="text-sm font-black tabular-nums">{stats.coins.toLocaleString()}</span>
            </div>
          </div>
          <h2 className="text-lg font-black leading-tight mb-0.5">
            {user?.name ? `Hey, ${user.name.split(' ')[0]}! 👋` : 'Welcome Back! 👋'}
          </h2>
          <p className="text-white/70 text-xs">Complete tasks · Earn coins · Withdraw cash</p>
          <div className="mt-3">
            <div className="flex items-center justify-between text-xs text-white/60 mb-1">
              <span>Level {stats.level}</span>
              <span>{xpProgress}/{xpForNext} XP → Lv.{stats.level + 1}</span>
            </div>
            <div className="bg-white/20 rounded-full h-2 overflow-hidden">
              <div className="h-full rounded-full bg-white transition-all duration-700"
                style={{ width: `${(xpProgress / xpForNext) * 100}%` }} />
            </div>
          </div>
        </div>
      </div>

      {/* ── STATS ROW ── */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { icon:'🪙', label:'Coins',   value:stats.coins.toLocaleString(), bg:'bg-amber-50 border-amber-200',   val:'text-amber-700'   },
          { icon:'📋', label:'Surveys', value:stats.surveysCompleted,        bg:'bg-emerald-50 border-emerald-200',val:'text-emerald-700' },
          { icon:'🔐', label:'Captcha', value:stats.captchasSolved,          bg:'bg-blue-50 border-blue-200',     val:'text-blue-700'    },
          { icon:'🔥', label:'Streak',  value:`${stats.streak}d`,            bg:'bg-orange-50 border-orange-200', val:'text-orange-700'  },
        ].map(s => (
          <div key={s.label} className={`${s.bg} border rounded-xl p-2 text-center`}>
            <p className="text-base leading-none mb-1">{s.icon}</p>
            <p className={`text-sm font-black ${s.val} leading-none tabular-nums`}>{s.value}</p>
            <p className="text-[9px] text-slate-400 mt-1 font-medium">{s.label}</p>
          </div>
        ))}
      </div>

      {/* ── AD BLOCK TOP ── */}
{/* Ads removed from home - only in survey, captcha, ads tabs */}

      {/* ── QUICK EARN ── */}
      <div>
        <div className="flex items-center justify-between mb-2.5">
          <h3 className="text-sm font-black text-slate-900 flex items-center gap-1.5">
            <Zap size={15} className="text-amber-500" /> Quick Earn
          </h3>
          <span className="text-xs text-slate-400">3 ways to earn</span>
        </div>

        {/* SURVEY CARD */}
        <button
          onClick={() => surveysEnabled && setSection('surveys')}
          disabled={!surveysEnabled}
          className={`w-full mb-3 text-left bg-white border-2 rounded-2xl overflow-hidden shadow-sm transition-all duration-200 ${
            surveysEnabled ? 'border-emerald-100 active:scale-[0.99] cursor-pointer' : 'border-slate-200 opacity-60 cursor-not-allowed'
          }`}>
          <div className="h-1 w-full bg-gradient-to-r from-emerald-400 to-teal-500" />
          <div className="p-3.5">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-xl flex items-center justify-center flex-shrink-0 shadow-md shadow-emerald-200">
                <ClipboardCheck size={20} className="text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="font-black text-slate-900 text-sm">Surveys</h4>
                  <span className="text-xs font-black text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-full px-2.5 py-0.5 flex-shrink-0">
                    {surveyReward} 🪙 {throttled && '⚡'}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">Answer questions · Get paid instantly</p>
                <div className="mt-2">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-slate-400">{done.length}/{surveys.length} done</span>
                    <span className={`font-bold ${avail.length > 0 ? 'text-emerald-600' : 'text-slate-400'}`}>
                      {avail.length > 0 ? `${avail.length} available` : 'All done!'}
                    </span>
                  </div>
                  <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-emerald-400 to-teal-500 rounded-full transition-all duration-500"
                      style={{ width: `${survPct}%` }} />
                  </div>
                </div>
              </div>
            </div>

            {/* Category pills */}
            <div className="flex flex-wrap gap-1 mt-3">
              {Object.entries(CAT_META).map(([cat, meta]) => (
                <span key={cat} className={`text-xs px-2 py-0.5 rounded-full border font-semibold ${meta.bg} ${meta.color} ${meta.border}`}>
                  {meta.icon} {cat}
                </span>
              ))}
            </div>

            {/* Mini list */}
            {avail.length > 0 && (
              <div className="mt-3 space-y-1.5">
                {avail.slice(0, 3).map(s => {
                  const cm = CAT_META[s.category] || CAT_META.Lifestyle;
                  return (
                    <div key={s.id} className="flex items-center gap-2.5 bg-slate-50 rounded-xl px-3 py-2 border border-slate-100">
                      <span className="text-sm">{cm.icon}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-slate-800 truncate">{s.title}</p>
                        <p className="text-xs text-slate-400">{s.duration} · {s.questions.length}Q</p>
                      </div>
                      <span className="text-xs font-black text-emerald-600 flex-shrink-0">+{surveyReward}🪙</span>
                    </div>
                  );
                })}
              </div>
            )}

            {/* CTA */}
            <div className={`mt-3 flex items-center justify-between rounded-xl px-3.5 py-2.5 ${avail.length > 0 ? 'bg-emerald-500' : 'bg-slate-100'}`}>
              <span className={`text-xs font-bold ${avail.length > 0 ? 'text-white' : 'text-slate-500'}`}>
                {avail.length > 0 ? 'Start a Survey' : 'No surveys available'}
              </span>
              <ArrowRight size={14} className={avail.length > 0 ? 'text-white' : 'text-slate-400'} />
            </div>
          </div>
        </button>

        {/* CAPTCHA CARD */}
        <button
          onClick={() => setSection('captcha')}
          className="w-full mb-3 text-left bg-white border-2 border-blue-100 rounded-2xl overflow-hidden shadow-sm transition-all duration-200 active:scale-[0.99]">
          <div className="h-1 w-full bg-gradient-to-r from-blue-500 via-indigo-500 to-violet-500" />
          <div className="p-3.5">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center flex-shrink-0 shadow-md shadow-blue-200">
                <KeyRound size={20} className="text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="font-black text-slate-900 text-sm">CAPTCHA Solve</h4>
                  <span className="text-xs font-black text-blue-600 bg-blue-50 border border-blue-200 rounded-full px-2.5 py-0.5 flex-shrink-0">
                    {captchaReward} 🪙 {throttled && '⚡'}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">Solve challenges · Build streaks · Earn bonuses</p>
                <div className="mt-2">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-slate-400">{stats.captchasSolved} solved today</span>
                    <span className="font-bold text-blue-600">{captchaDailyLimit} limit</span>
                  </div>
                  <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min((stats.captchasSolved / captchaDailyLimit) * 100, 100)}%` }} />
                  </div>
                </div>
              </div>
            </div>

            {/* Type grid */}
            <div className="mt-3 grid grid-cols-4 gap-1.5">
              {[
                {icon:'🔤',label:'Alpha'},{icon:'🧮',label:'Math'},
                {icon:'🔢',label:'Seq'},{icon:'😀',label:'Emoji'},
                {icon:'🏛️',label:'Roman'},{icon:'🧩',label:'Pattern'},
                {icon:'🔄',label:'Reverse'},{icon:'🔍',label:'Missing'},
              ].map(t => (
                <div key={t.label} className="flex flex-col items-center gap-0.5 bg-slate-50 border border-slate-100 rounded-lg py-1.5">
                  <span className="text-sm">{t.icon}</span>
                  <span className="text-slate-500 font-medium" style={{fontSize:'8px'}}>{t.label}</span>
                </div>
              ))}
            </div>

            {/* Streak + bonus */}
            <div className="mt-3 flex gap-2">
              <div className="flex-1 bg-orange-50 border border-orange-100 rounded-xl px-3 py-2 flex items-center gap-2">
                <Flame size={13} className="text-orange-500 flex-shrink-0" />
                <span className="text-xs text-orange-700 font-bold">
                  {stats.streak > 0 ? `🔥 ${stats.streak} streak` : 'Build streak!'}
                </span>
              </div>
              <div className="bg-violet-50 border border-violet-100 rounded-xl px-3 py-2">
                <span className="text-xs text-violet-700 font-black">Up to 2×</span>
              </div>
            </div>

            {/* CTA */}
            <div className="mt-3 flex items-center justify-between bg-blue-600 rounded-xl px-3.5 py-2.5">
              <span className="text-xs font-bold text-white">Solve CAPTCHAs Now</span>
              <ArrowRight size={14} className="text-white" />
            </div>
          </div>
        </button>

        {/* ADS CARD */}
        <button
          onClick={() => setActiveTab('ads')}
          className="w-full text-left bg-white border-2 border-violet-100 rounded-2xl overflow-hidden shadow-sm transition-all duration-200 active:scale-[0.99]">
          <div className="h-1 w-full bg-gradient-to-r from-violet-500 via-purple-500 to-fuchsia-500" />
          <div className="p-3.5">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl flex items-center justify-center flex-shrink-0 shadow-md shadow-violet-200">
                <Tv size={20} className="text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="font-black text-slate-900 text-sm">Watch Ads</h4>
                  <span className="text-xs font-black text-violet-600 bg-violet-50 border border-violet-200 rounded-full px-2.5 py-0.5 flex-shrink-0">
                    20 🪙
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">Watch ads · Earn coins · Get friend bonus</p>
              </div>
            </div>

            {/* Multiplier grid */}
            <div className="mt-3 grid grid-cols-3 gap-2">
              {[
                {friends:'0 friends', mult:'1×',  coins:'20🪙', color:'bg-slate-50 border-slate-200'},
                {friends:'3 friends', mult:'2×',  coins:'40🪙', color:'bg-violet-50 border-violet-200'},
                {friends:'10 friends',mult:'5×',  coins:'100🪙',color:'bg-fuchsia-50 border-fuchsia-200'},
              ].map(m => (
                <div key={m.friends} className={`${m.color} border rounded-xl px-2 py-2 text-center`}>
                  <p className="text-[9px] text-slate-500 font-semibold">{m.friends}</p>
                  <p className="font-black text-slate-800 text-sm">{m.mult}</p>
                  <p className="text-xs font-black text-violet-600">{m.coins}</p>
                </div>
              ))}
            </div>

            {/* CTA */}
            <div className="mt-3 flex items-center justify-between bg-gradient-to-r from-violet-600 to-purple-600 rounded-xl px-3.5 py-2.5">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <Play size={12} fill="white" /> Watch Ads & Earn
              </span>
              <ArrowRight size={14} className="text-white" />
            </div>
          </div>
        </button>
      </div>

      {/* ── WITHDRAWAL REQUIREMENTS ── */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="px-4 py-3 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white flex items-center justify-between">
          <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
            <TrendingUp size={14} className="text-blue-500" /> Withdraw Progress
          </h3>
          <button onClick={() => setActiveTab('wallet')}
            className="text-xs font-bold text-blue-600 hover:text-blue-700">
            Withdraw →
          </button>
        </div>
        <div className="p-3 space-y-2.5">
          {withdrawReqs.map(r => {
            const pct = Math.min(100, (stats.coins / r.min) * 100);
            const unlocked = stats.coins >= r.min;
            return (
              <div key={r.label}>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-bold text-slate-700 flex items-center gap-1">
                    <span>{r.icon}</span> {r.label}
                  </span>
                  <span className={`font-bold ${unlocked ? 'text-emerald-600' : 'text-slate-400'}`}>
                    {unlocked ? '✓ Unlocked!' : `${stats.coins.toLocaleString()}/${r.min.toLocaleString()}`}
                  </span>
                </div>
                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div className={`h-full ${r.color} rounded-full transition-all duration-700`}
                    style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── RECENT ACTIVITY ── */}
      {transactions.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="px-4 py-3 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white flex items-center justify-between">
            <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
              <BarChart2 size={14} className="text-violet-500" /> Recent Activity
            </h3>
            <button onClick={() => setActiveTab('wallet')}
              className="text-xs font-bold text-violet-600">View All →</button>
          </div>
          <div className="divide-y divide-slate-50">
            {[...transactions].reverse().slice(0, 5).map(tx => (
              <div key={tx.id} className="flex items-center gap-3 px-4 py-3">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 text-sm ${
                  tx.type === 'earn' ? 'bg-emerald-50' : 'bg-red-50'
                }`}>
                  {tx.type === 'earn' ? '📥' : '📤'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-slate-800 truncate">{tx.source}</p>
                  <p className="text-xs text-slate-400">{tx.date}</p>
                </div>
                <span className={`text-xs font-black flex-shrink-0 ${tx.type === 'earn' ? 'text-emerald-600' : 'text-red-500'}`}>
                  {tx.type === 'earn' ? '+' : '−'}{tx.amount}🪙
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── TOTAL EARNED BANNER ── */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-2xl p-4 flex items-center justify-between">
        <div>
          <p className="text-slate-400 text-xs font-semibold">Total Earned All Time</p>
          <p className="text-white font-black text-2xl tabular-nums">{totalEarned.toLocaleString()} <span className="text-lg">🪙</span></p>
          <p className="text-slate-400 text-xs mt-0.5">≈ ₹{(totalEarned * 0.10).toFixed(0)} estimated value</p>
        </div>
        <button onClick={() => setActiveTab('wallet')}
          className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-600 text-white font-black text-xs px-3.5 py-2.5 rounded-xl transition-colors active:scale-95 flex-shrink-0">
          Withdraw <ChevronRight size={13} />
        </button>
      </div>

      {/* ── AD BLOCK BOTTOM ── */}
{/* Ads removed from home */}

    </div>
  );
};

/* ════════════════════════════════════════════════════
   SURVEY SECTION
════════════════════════════════════════════════════ */
interface SurveyProps {
  surveys: Survey[];
  onBack: () => void;
  onComplete: (id: number, reward: number) => void;
  reward: number;
  totalEarned: number;
  surveyDailyLimit: number;
  surveysCompletedToday: number;
  claimWaitSeconds: number;
}

const SurveySection: React.FC<SurveyProps> = ({
  surveys,
  onBack,
  onComplete,
  reward,
  totalEarned,
  surveyDailyLimit,
  surveysCompletedToday,
  claimWaitSeconds,
}) => {
  const [activeSurvey, setActiveSurvey] = useState<Survey | null>(null);
  const [step, setStep]                 = useState(0);
  const [answers, setAnswers]           = useState<Record<number, string | string[]>>({});
  const [completed, setCompleted]       = useState(false);
  const [rewardClaimed, setRewardClaimed] = useState(false);
  const [claimWaitLeftSeconds, setClaimWaitLeftSeconds] = useState(claimWaitSeconds);
  const [canClaimReward, setCanClaimReward] = useState(false);
  const surveyTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const avail = surveys.filter(s => !s.completed);
  const done  = surveys.filter(s => s.completed);
  const surveyLimitReached = surveysCompletedToday >= surveyDailyLimit;
  const surveyDailyLeft = Math.max(0, surveyDailyLimit - surveysCompletedToday);

  const startSurvey = (s: Survey) => {
    if (surveyLimitReached) return;
    setActiveSurvey(s);
    setStep(0);
    setAnswers({});
    setCompleted(false);
    setRewardClaimed(false);
    setCanClaimReward(false);
    setClaimWaitLeftSeconds(claimWaitSeconds);
    if (surveyTimerRef.current) {
      clearInterval(surveyTimerRef.current);
      surveyTimerRef.current = null;
    }
  };
  const handleAnswer = (qi: number, val: string, multi?: boolean) => {
    if (multi) {
      setAnswers(p => {
        const arr = (p[qi] as string[] | undefined) || [];
        return { ...p, [qi]: arr.includes(val) ? arr.filter(v => v !== val) : [...arr, val] };
      });
    } else {
      setAnswers(p => ({ ...p, [qi]: val }));
    }
  };
  const nextStep = () => {
    if (!activeSurvey) return;
    if (step < activeSurvey.questions.length - 1) {
      setStep(s => s + 1);
    } else {
      setCompleted(true);
      setCanClaimReward(false);
      setClaimWaitLeftSeconds(claimWaitSeconds);
    }
  };

  useEffect(() => {
    if (!completed || rewardClaimed || !activeSurvey) return;

    let left = claimWaitSeconds;
    setCanClaimReward(false);
    setClaimWaitLeftSeconds(left);

    if (surveyTimerRef.current) {
      clearInterval(surveyTimerRef.current);
      surveyTimerRef.current = null;
    }

    surveyTimerRef.current = setInterval(() => {
      left -= 1;
      setClaimWaitLeftSeconds(left);
      if (left <= 0) {
        setCanClaimReward(true);
        if (surveyTimerRef.current) {
          clearInterval(surveyTimerRef.current);
          surveyTimerRef.current = null;
        }
      }
    }, 1000);

    return () => {
      if (surveyTimerRef.current) {
        clearInterval(surveyTimerRef.current);
        surveyTimerRef.current = null;
      }
    };
  }, [completed, rewardClaimed, activeSurvey, claimWaitSeconds]);

  const claimSurveyReward = () => {
    if (!activeSurvey || rewardClaimed || !canClaimReward) return;
    window.open(SMART_LINK, '_blank', 'noopener,noreferrer');
    onComplete(activeSurvey.id, reward);
    setRewardClaimed(true);
  };

  /* Completion */
  if (completed && activeSurvey) return (
    <div className="max-w-lg mx-auto space-y-4 animate-fade-in">
      <div className="bg-white rounded-2xl border border-emerald-200 shadow-sm overflow-hidden">
        <div className="h-1.5 bg-gradient-to-r from-emerald-400 to-teal-500" />
        <div className="p-6 text-center space-y-4">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle size={36} className="text-emerald-500" />
          </div>
          <div>
            <h3 className="text-xl font-black text-slate-900">Survey Complete!</h3>
            <p className="text-slate-500 text-sm mt-1">{activeSurvey.title}</p>
          </div>
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4">
            <p className="text-emerald-600 text-xs font-semibold mb-1">Coins Earned</p>
            <p className="text-4xl font-black text-emerald-700">{rewardClaimed ? `+${reward} 🪙` : `+${reward} 🪙 (Pending)`}</p>
          </div>

          {!rewardClaimed && (
            <>
              <AllAds prefix={`survey-claim-a-${activeSurvey.id}`} accentColor="from-emerald-50 to-teal-50" label="Survey Sponsor 1" />
              <AllAds prefix={`survey-claim-b-${activeSurvey.id}`} accentColor="from-green-50 to-emerald-50" label="Survey Sponsor 2" />
            </>
          )}

          {!rewardClaimed && (
            <button
              onClick={claimSurveyReward}
              disabled={!canClaimReward}
              className={`w-full font-black py-3 rounded-xl text-sm transition-all ${
                canClaimReward ? 'bg-violet-600 text-white active:scale-95' : 'bg-slate-200 text-slate-500 cursor-not-allowed'
              }`}
            >
              {canClaimReward ? 'Watch Ad & Claim Reward' : `Wait ${claimWaitLeftSeconds}s to unlock claim`}
            </button>
          )}
          <div className="flex gap-2">
            {avail.length > 0 && (
              <button onClick={() => { setActiveSurvey(null); setCompleted(false); }}
                disabled={!rewardClaimed}
                className={`flex-1 font-black py-3 rounded-xl text-sm transition-all ${rewardClaimed ? 'bg-emerald-500 text-white active:scale-95' : 'bg-slate-100 text-slate-400 cursor-not-allowed'}`}>
                Next Survey
              </button>
            )}
            <button onClick={onBack}
              disabled={!rewardClaimed}
              className={`flex-1 border-2 font-black py-3 rounded-xl text-sm transition-all ${rewardClaimed ? 'border-slate-200 text-slate-600 active:scale-95' : 'border-slate-100 text-slate-400 cursor-not-allowed'}`}>
              ← Back Home
            </button>
          </div>
          {!rewardClaimed && (
            <p className="text-xs text-slate-500">Minimum 2 ads are shown for each survey claim. Claim unlocks after {claimWaitSeconds}s.</p>
          )}
        </div>
      </div>
    </div>
  );

  /* Active survey */
  if (activeSurvey) {
    const q = activeSurvey.questions[step];
    const ans = answers[step];
    const hasAns = Array.isArray(ans) ? ans.length > 0 : Boolean(ans);
    const cm = CAT_META[activeSurvey.category] || CAT_META.Lifestyle;
    return (
      <div className="max-w-lg mx-auto space-y-4 animate-fade-in">
        {/* Header */}
        <div className="flex items-center gap-3">
          <button onClick={() => setActiveSurvey(null)}
            className="bg-white border-2 border-slate-200 rounded-xl p-2 active:scale-95 transition-all">
            <ArrowLeft size={16} className="text-slate-600" />
          </button>
          <div className="flex-1">
            <p className="text-xs text-slate-500 font-semibold truncate">{activeSurvey.title}</p>
            <div className="flex items-center gap-2 mt-0.5">
              <span className={`text-xs px-2 py-0.5 rounded-full border font-semibold ${cm.bg} ${cm.color} ${cm.border}`}>
                {cm.icon} {activeSurvey.category}
              </span>
              <span className="text-xs text-slate-400">{step + 1}/{activeSurvey.questions.length}</span>
            </div>
          </div>
          <span className="text-xs font-black text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-xl px-2.5 py-1.5 flex-shrink-0">
            +{reward}🪙
          </span>
        </div>

        {/* Progress */}
        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-emerald-400 to-teal-500 rounded-full transition-all duration-500"
            style={{ width: `${((step + 1) / activeSurvey.questions.length) * 100}%` }} />
        </div>

        {/* Question Card */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-emerald-400 to-teal-500" />
          <div className="p-4 space-y-4">
            <p className="text-sm font-black text-slate-900 leading-relaxed">{q.text}</p>

            {/* Survey option ads (shown while answering) */}
            <AllAds
              prefix={`survey-option-${activeSurvey.id}-${step}`}
              accentColor="from-emerald-50 to-teal-50"
              label="Sponsored"
            />

            {/* Radio */}
            {q.type === 'radio' && q.options?.map(opt => (
              <button key={opt} onClick={() => handleAnswer(step, opt)}
                className={`w-full text-left px-4 py-3 rounded-xl border-2 text-sm font-semibold transition-all active:scale-[0.99] ${
                  ans === opt
                    ? 'border-emerald-400 bg-emerald-50 text-emerald-800'
                    : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-emerald-200'
                }`}>
                <span className={`inline-flex items-center justify-center w-4 h-4 rounded-full border-2 mr-2 flex-shrink-0 ${
                  ans === opt ? 'border-emerald-500 bg-emerald-500' : 'border-slate-300'
                }`}>
                  {ans === opt && <span className="w-2 h-2 bg-white rounded-full block" />}
                </span>
                {opt}
              </button>
            ))}

            {/* Checkbox */}
            {q.type === 'checkbox' && q.options?.map(opt => {
              const checked = Array.isArray(ans) && ans.includes(opt);
              return (
                <button key={opt} onClick={() => handleAnswer(step, opt, true)}
                  className={`w-full text-left px-4 py-3 rounded-xl border-2 text-sm font-semibold transition-all active:scale-[0.99] ${
                    checked
                      ? 'border-emerald-400 bg-emerald-50 text-emerald-800'
                      : 'border-slate-200 bg-slate-50 text-slate-700'
                  }`}>
                  <span className={`inline-flex items-center justify-center w-4 h-4 rounded border-2 mr-2 flex-shrink-0 ${
                    checked ? 'border-emerald-500 bg-emerald-500' : 'border-slate-300'
                  }`}>
                    {checked && <span className="text-white text-xs font-black leading-none">✓</span>}
                  </span>
                  {opt}
                </button>
              );
            })}

            {/* Text */}
            {q.type === 'text' && (
              <textarea
                value={(ans as string) || ''}
                onChange={e => handleAnswer(step, e.target.value)}
                placeholder="Type your answer here..."
                rows={3}
                className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:border-emerald-400 transition-all resize-none bg-slate-50 focus:bg-white"
              />
            )}
          </div>
        </div>

        <button onClick={nextStep} disabled={!hasAns}
          className={`w-full py-3.5 rounded-2xl font-black text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-md ${
            hasAns
              ? 'bg-emerald-500 text-white shadow-emerald-200'
              : 'bg-slate-100 text-slate-400 cursor-not-allowed shadow-none'
          }`}>
          {step === activeSurvey.questions.length - 1 ? 'Submit & Earn 🪙' : 'Next Question →'}
        </button>
      </div>
    );
  }

  /* Survey list */
  return (
    <div className="max-w-lg mx-auto space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="bg-white border-2 border-slate-200 rounded-xl p-2 active:scale-95 transition-all">
          <ArrowLeft size={16} className="text-slate-600" />
        </button>
        <div className="flex-1">
          <h1 className="text-lg font-black text-slate-900">Surveys</h1>
          <p className="text-xs text-slate-500">{done.length} done · {avail.length} available · {reward}🪙 each</p>
        </div>
        <span className="bg-emerald-50 border border-emerald-200 rounded-xl px-2.5 py-1.5 text-xs font-black text-emerald-700">
          {totalEarned}🪙
        </span>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2">
        {[
          {label:'Done',     val:done.length,    bg:'bg-emerald-50 border-emerald-200', color:'text-emerald-700'},
          {label:'Available',val:avail.length,   bg:'bg-blue-50 border-blue-200',       color:'text-blue-700'},
          {label:'Earned',   val:`${totalEarned}🪙`,bg:'bg-amber-50 border-amber-200', color:'text-amber-700'},
        ].map(s => (
          <div key={s.label} className={`${s.bg} border rounded-xl p-3 text-center`}>
            <p className={`text-lg font-black ${s.color}`}>{s.val}</p>
            <p className="text-xs text-slate-400 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      <div className={`border rounded-xl p-3 text-xs font-semibold ${surveyLimitReached ? 'bg-red-50 border-red-200 text-red-700' : 'bg-blue-50 border-blue-200 text-blue-700'}`}>
        {surveyLimitReached
          ? `Daily survey limit reached (${surveyDailyLimit}/${surveyDailyLimit}). Come back tomorrow.`
          : `Daily survey limit: ${surveysCompletedToday}/${surveyDailyLimit} used · ${surveyDailyLeft} left`}
      </div>

      {/* Ad zone */}
      <AllAds prefix="survey-top" accentColor="from-emerald-50 to-teal-50" label="Sponsored" />

      {/* Ad zone */}
      <AllAds prefix="survey-mid" accentColor="from-green-50 to-emerald-50" label="Advertisement" />

      {/* Available surveys */}
      {avail.length > 0 && (
        <div>
          <h3 className="text-sm font-black text-slate-800 mb-2.5 flex items-center gap-2">
            <ClipboardCheck size={14} className="text-emerald-500" /> Available
          </h3>

          <div className="space-y-2.5">
            {avail.map(s => {
              const cm = CAT_META[s.category] || CAT_META.Lifestyle;
              return (
                <button key={s.id} onClick={() => startSurvey(s)}
                  disabled={surveyLimitReached}
                  className={`w-full text-left border-2 rounded-2xl p-4 shadow-sm transition-all ${
                    surveyLimitReached
                      ? 'bg-slate-100 border-slate-200 cursor-not-allowed opacity-60'
                      : 'bg-white border-slate-100 hover:border-emerald-300 active:scale-[0.99]'
                  }`}>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-xl flex items-center justify-center flex-shrink-0 text-xl shadow-sm">
                      {cm.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-black text-slate-900 text-sm truncate">{s.title}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${cm.bg} ${cm.color}`}>
                          {s.category}
                        </span>
                        <span className="text-xs text-slate-400">{s.duration} · {s.questions.length}Q</span>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-black text-emerald-600">+{reward}🪙</p>
                      <p className="text-xs text-slate-400">Tap →</p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Extra ad zone */}
      <AllAds prefix="survey-extra" accentColor="from-emerald-50 to-lime-50" label="Survey Offers" />

      {/* Completed surveys */}
      {done.length > 0 && (
        <div>
          <h3 className="text-sm font-black text-slate-800 mb-2.5 flex items-center gap-2">
            <CheckCircle size={14} className="text-slate-400" /> Completed
          </h3>
          <div className="space-y-2">
            {done.map(s => {
              const cm = CAT_META[s.category] || CAT_META.Lifestyle;
              return (
                <div key={s.id} className="bg-slate-50 border border-slate-100 rounded-2xl p-3.5 flex items-center gap-3 opacity-70">
                  <div className="w-9 h-9 bg-slate-200 rounded-xl flex items-center justify-center flex-shrink-0 text-lg">
                    {cm.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-black text-slate-600 text-sm truncate">{s.title}</p>
                    <p className="text-xs text-slate-400">{s.category}</p>
                  </div>
                  <CheckCircle size={16} className="text-emerald-400 flex-shrink-0" />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Ad zone bottom */}
      <AllAds prefix="survey-bot" accentColor="from-emerald-50 to-teal-50" label="Advertisement" />
    </div>
  );
};

/* ════════════════════════════════════════════════════
   CAPTCHA SECTION
════════════════════════════════════════════════════ */
interface CaptchaProps {
  onBack: () => void;
  onEarn: (amount: number, source: string) => void;
  reward: number;
  totalSolved: number;
  dailyLimit: number;
  claimWaitSeconds: number;
}

const CaptchaSection: React.FC<CaptchaProps> = ({ onBack, onEarn, reward, totalSolved, dailyLimit, claimWaitSeconds }) => {
  const [task, setTask]           = useState<CaptchaTask>(() => generateCaptcha());
  const [answer, setAnswer]       = useState('');
  const [status, setStatus]       = useState<'idle'|'correct'|'wrong'>('idle');
  const [solved, setSolved]       = useState(0);
  const [streak, setStreak]       = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [totalEarned, setTotalEarned] = useState(0);
  const [animCoins, setAnimCoins] = useState<number | null>(null);
  const [showHint, setShowHint]   = useState(false);
  const [history, setHistory]     = useState<{type:CaptchaType;correct:boolean;earned:number}[]>([]);
  const [pendingEarn, setPendingEarn] = useState<number | null>(null);
  const [waitSeconds, setWaitSeconds] = useState(0);
  const [canClaim, setCanClaim] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const waitTimerRef = useRef<NodeJS.Timeout | null>(null);

  const dailyLeft  = Math.max(0, dailyLimit - (totalSolved + solved));
  const streakMult = streak >= 20 ? 2 : streak >= 10 ? 1.5 : 1;
  const streakLabel = streak >= 20 ? '🔥 2× BONUS!' : streak >= 10 ? '⚡ 1.5× BONUS!' : '';
  const meta = TYPE_META[task.type];
  const diff = DIFF_META[task.difficulty];

  const isEmoji = task.type === 'emoji_count';
  const isMath  = task.type.startsWith('math_') || ['sequence','missing_number'].includes(task.type);

  // Auto-focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, [task]);

  // Cleanup wait timer on unmount
  useEffect(() => {
    return () => {
      if (waitTimerRef.current) {
        clearInterval(waitTimerRef.current);
        waitTimerRef.current = null;
      }
    };
  }, []);

  const refreshTask = () => {
    setTask(generateCaptcha());
    setAnswer('');
    setStatus('idle');
    setShowHint(false);
    setAnimCoins(null);
    setPendingEarn(null);
    setWaitSeconds(0);
    setCanClaim(false);
    if (waitTimerRef.current) {
      clearInterval(waitTimerRef.current);
      waitTimerRef.current = null;
    }
  };

  const handleSubmit = useCallback(() => {
    if (!answer.trim() || status !== 'idle') return;
    const correct = solveCaptcha(task, answer.trim());
    if (correct) {
      const earned = Math.round(reward * streakMult);
      setStatus('correct');
      setAnimCoins(earned);
      setPendingEarn(earned);
      setCanClaim(false);
      setWaitSeconds(claimWaitSeconds);
      
      // Start countdown timer before reward claim unlock.
      let countdown = claimWaitSeconds;
      waitTimerRef.current = setInterval(() => {
        countdown--;
        setWaitSeconds(countdown);
        if (countdown <= 0) {
          setCanClaim(true);
          if (waitTimerRef.current) {
            clearInterval(waitTimerRef.current);
            waitTimerRef.current = null;
          }
        }
      }, 1000);
    } else {
      setStatus('wrong');
      setStreak(0);
      setHistory(h => [...h, { type: task.type, correct: false, earned: 0 }]);
      setTimeout(refreshTask, 1000);
    }
  }, [answer, status, task, streakMult, reward, claimWaitSeconds]);

  const claimCaptchaReward = useCallback(() => {
    if (!pendingEarn || status !== 'correct') return;
    window.open(SMART_LINK, '_blank', 'noopener,noreferrer');
    const earned = pendingEarn;
    setSolved(s => s + 1);
    setStreak(s => {
      const ns = s + 1;
      setBestStreak(b => Math.max(b, ns));
      return ns;
    });
    setTotalEarned(t => t + earned);
    setHistory(h => [...h, { type: task.type, correct: true, earned }]);
    onEarn(earned, `CAPTCHA: ${meta.label}`);
    setTimeout(refreshTask, 300);
  }, [pendingEarn, status, task.type, meta.label, onEarn]);

  const renderVisual = () => {
    if (isEmoji) return (
      <div className="flex flex-col items-center gap-3 py-4">
        <p className="text-xs uppercase tracking-widest font-semibold text-slate-400">Count the emojis</p>
        <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl p-4 text-center select-none">
          <p className="text-4xl leading-relaxed">{task.text}</p>
        </div>
      </div>
    );
    if (isMath) return (
      <div className="flex flex-col items-center gap-3 py-4">
        <p className="text-xs uppercase tracking-widest font-semibold text-slate-400">Solve the problem</p>
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl border-2 border-blue-200 p-6 select-none w-full text-center">
          <span className="text-4xl font-black text-blue-700 tracking-wide"
            style={{ fontFamily: "'Courier New', monospace" }}>
            {task.text}
          </span>
        </div>
      </div>
    );
    // Default: word type
    return (
      <div className="flex flex-col items-center gap-3 py-4">
        <p className="text-xs uppercase tracking-widest font-semibold text-slate-400">Type the word below</p>
        <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl border-2 border-emerald-200 p-6 select-none w-full text-center">
          <span className="text-4xl font-black text-emerald-700 tracking-widest">
            {task.text}
          </span>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-lg mx-auto space-y-3 animate-fade-in">

      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={onBack}
          className="bg-white border-2 border-slate-200 rounded-xl p-2 active:scale-95 transition-all">
          <ArrowLeft size={16} className="text-slate-600" />
        </button>
        <div className="flex-1">
          <h1 className="text-lg font-black text-slate-900">CAPTCHA Earn</h1>
          <p className="text-xs text-slate-500">Solve challenges · {reward}🪙 each</p>
        </div>
        <div className="flex items-center gap-1.5 bg-amber-50 border border-amber-200 rounded-xl px-3 py-1.5">
          <Trophy size={13} className="text-amber-500" />
          <span className="text-sm font-black text-amber-700 tabular-nums">{totalEarned}🪙</span>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-4 gap-2">
        {[
          {label:'Solved', value:solved,             icon:<CheckCircle size={13} className="text-emerald-500"/>, bg:'bg-emerald-50 border-emerald-100'},
          {label:'Streak', value:`🔥${streak}`,      icon:<Zap size={13} className="text-orange-500"/>,         bg:'bg-orange-50 border-orange-100'},
          {label:'Best',   value:`🏆${bestStreak}`,  icon:<Star size={13} className="text-violet-500"/>,         bg:'bg-violet-50 border-violet-100'},
          {label:'Left',   value:dailyLeft,           icon:<TrendingUp size={13} className="text-blue-500"/>,    bg:'bg-blue-50 border-blue-100'},
        ].map(s => (
          <div key={s.label} className={`${s.bg} border rounded-xl p-2.5 text-center`}>
            <div className="flex justify-center mb-1">{s.icon}</div>
            <p className="text-sm font-black text-slate-800 leading-none tabular-nums">{s.value}</p>
            <p className="text-xs text-slate-400 mt-0.5 font-medium" style={{fontSize:'9px'}}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Daily Progress */}
      <div className="bg-white border border-slate-200 rounded-xl px-4 py-3">
        <div className="flex items-center justify-between text-xs text-slate-500 mb-1.5">
          <span className="font-semibold">Daily Progress</span>
          <span className="font-bold text-slate-700 tabular-nums">{totalSolved + solved} / {dailyLimit}</span>
        </div>
        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all duration-500"
            style={{ width: `${((totalSolved + solved) / dailyLimit) * 100}%`, background: 'linear-gradient(90deg,#f59e0b,#ef4444)' }} />
        </div>
        <div className="flex justify-between text-xs mt-1">
          {streakLabel
            ? <span className="font-black text-orange-500">{streakLabel}</span>
            : <span className="text-slate-400">Build a streak for bonus!</span>}
          <span className="text-slate-400 tabular-nums">{dailyLeft} left</span>
        </div>
      </div>

      {/* Daily Done */}
      {dailyLeft === 0 ? (
        <div className="bg-white border-2 border-amber-200 rounded-2xl p-8 text-center shadow-sm">
          <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Trophy size={32} className="text-amber-500" />
          </div>
          <h3 className="text-xl font-black text-slate-800">Daily Goal Complete!</h3>
          <p className="text-slate-500 mt-2 text-sm">You've solved all {dailyLimit} CAPTCHAs today.</p>
          <div className="mt-4 inline-flex items-center gap-2 bg-amber-500 text-white px-5 py-2.5 rounded-xl font-bold text-sm">
            🪙 {totalEarned} coins earned today
          </div>
        </div>
      ) : (
        <div className="bg-white border-2 border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          {/* Card Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold border ${meta.bg} ${meta.color} ${meta.border}`}>
                {meta.icon} {meta.label}
              </span>
              <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold ${diff.bg} ${diff.color}`}>
                {'★'.repeat(diff.stars)}{'☆'.repeat(3-diff.stars)} {diff.label}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-black text-amber-600">+{Math.round(reward * streakMult)}🪙</span>
              {streakMult > 1 && (
                <span className="text-xs bg-orange-100 text-orange-600 font-black px-2 py-0.5 rounded-full">
                  {streakMult}×
                </span>
              )}
            </div>
          </div>

          {/* CAPTCHA Visual */}
          <div className="px-4 pt-2 pb-1 relative">
            {renderVisual()}
            {status === 'correct' && (
              <div className="absolute inset-0 bg-emerald-400/10 flex flex-col items-center justify-center rounded-xl gap-2">
                <CheckCircle size={48} className="text-emerald-500" />
                {animCoins !== null && <span className="text-xl font-black text-emerald-600 animate-bounce">+{animCoins}🪙</span>}
              </div>
            )}
            {status === 'wrong' && (
              <div className="absolute inset-0 bg-red-400/10 flex flex-col items-center justify-center rounded-xl gap-2">
                <XCircle size={48} className="text-red-500" />
                <span className="text-sm font-bold text-red-600 bg-white/80 px-3 py-1 rounded-lg">Wrong answer!</span>
              </div>
            )}

          </div>

          {/* Hint */}
          {task.hint && !task.hint.startsWith('__ans__') && (
            <div className="px-4 pb-2">
              {!showHint
                ? <button onClick={() => setShowHint(true)} className="flex items-center gap-1 text-xs text-slate-400 hover:text-blue-500">
                    <Info size={11} /> Show hint
                  </button>
                : <div className="flex items-center gap-2 bg-blue-50 border border-blue-100 rounded-lg px-3 py-1.5 text-xs text-blue-700 font-medium">
                    <Info size={11} /> {task.hint}
                  </div>
              }
            </div>
          )}

          {/* No Timer - Easy Mode */}

          {/* Input */}
          <div className="px-4 pb-4">
            <div className="relative">
              <input
                ref={inputRef}
                type="text"
                value={answer}
                onChange={e => setAnswer(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                placeholder={
                  isEmoji ? 'Enter the count...' :
                  isMath  ? 'Enter the answer...' :
                  'Type the word...'
                }
                disabled={status !== 'idle'}
                autoComplete="off"
                spellCheck={false}
                className={`w-full rounded-xl border-2 px-4 py-3.5 text-center text-lg font-black tracking-widest focus:outline-none transition-all font-mono ${
                  status === 'correct' ? 'border-emerald-400 bg-emerald-50 text-emerald-700' :
                  status === 'wrong' ? 'border-red-400 bg-red-50 text-red-700' :
                  'border-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 bg-white text-slate-800'
                }`}
                style={{ fontSize: '16px' }}
              />
              {answer && status === 'idle' && (
                <button onClick={() => setAnswer('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-xl font-bold">×</button>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="px-4 pb-4 flex gap-2">
            <button onClick={refreshTask}
              className="border-2 border-slate-200 text-slate-500 rounded-xl px-4 py-3 flex items-center gap-1.5 font-semibold text-sm transition active:scale-95 bg-white">
              <RefreshCw size={14} /> Skip
            </button>
            <button 
              onClick={pendingEarn && canClaim ? claimCaptchaReward : handleSubmit} 
              disabled={pendingEarn ? !canClaim : (!answer.trim() || status !== 'idle')}
              className={`flex-1 font-black rounded-xl py-3 flex items-center justify-center gap-2 shadow-md transition active:scale-95 text-sm ${
                (pendingEarn && canClaim) || (!pendingEarn && answer.trim() && status === 'idle')
                  ? 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-emerald-200'
                  : 'bg-slate-100 text-slate-400 cursor-not-allowed shadow-none'
              }`}>
              {pendingEarn ? (
                canClaim ? (
                  <>Watch Ad & Claim <ChevronRight size={15} /></>
                ) : (
                  <><Clock size={14} className="animate-pulse" /> Wait {waitSeconds}s</>
                )
              ) : (
                <>Submit & Earn <ChevronRight size={15} /></>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Ad zone */}
      <AllAds prefix="captcha-mid" accentColor="from-blue-50 to-indigo-50" label="Sponsored" />

      {/* Types grid */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4">
        <h3 className="text-sm font-black text-slate-800 mb-3 flex items-center gap-2">
          <AlertCircle size={14} className="text-blue-500" /> CAPTCHA Types
        </h3>
        <div className="grid grid-cols-2 gap-1.5">
          {(Object.entries(TYPE_META) as [CaptchaType, typeof TYPE_META[CaptchaType]][]).map(([k, v]) => (
            <div key={k} className={`flex items-center gap-2 px-2.5 py-2 rounded-xl border ${v.bg} ${v.border}`}>
              <span className="text-sm">{v.icon}</span>
              <div>
                <p className={`text-xs font-bold ${v.color}`}>{v.label}</p>
                <p className="text-slate-400" style={{fontSize:'9px'}}>{reward}🪙</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent */}
      {history.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl p-4">
          <h3 className="text-sm font-black text-slate-800 mb-3">Recent</h3>
          <div className="space-y-1.5 max-h-40 overflow-y-auto scrollbar-hide">
            {[...history].reverse().slice(0, 8).map((h, i) => {
              const m = TYPE_META[h.type];
              return (
                <div key={i} className="flex items-center justify-between py-1.5 border-b border-slate-50 last:border-0">
                  <div className="flex items-center gap-2">
                    {h.correct
                      ? <CheckCircle size={13} className="text-emerald-500" />
                      : <XCircle size={13} className="text-red-400" />}
                    <span className="text-xs text-slate-600 font-medium">{m.icon} {m.label}</span>
                  </div>
                  <span className={`text-xs font-black ${h.correct ? 'text-emerald-600' : 'text-slate-400'}`}>
                    {h.correct ? `+${h.earned}🪙` : 'Failed'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Streak guide */}
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-4 text-white">
        <h3 className="text-sm font-black mb-3 flex items-center gap-2">
          <Zap size={14} className="text-amber-400" /> Streak Bonuses
        </h3>
        <div className="grid grid-cols-2 gap-3">
          {[
            {streak:'10+', mult:'1.5×', color:'from-blue-500 to-cyan-400', icon:'⚡'},
            {streak:'20+', mult:'2×',   color:'from-orange-500 to-amber-400', icon:'🔥'},
          ].map(b => (
            <div key={b.streak} className={`bg-gradient-to-br ${b.color} rounded-xl p-3 text-center`}>
              <p className="text-2xl">{b.icon}</p>
              <p className="font-black text-lg">{b.mult}</p>
              <p className="text-xs opacity-80">{b.streak} streak</p>
            </div>
          ))}
        </div>
      </div>

      {/* Smart link */}
      <a href={SMART_LINK} target="_blank" rel="noopener noreferrer"
        className="flex items-center justify-between bg-gradient-to-r from-violet-600 to-indigo-600 rounded-2xl px-4 py-3 shadow-md active:scale-[0.98] transition-all">
        <div>
          <p className="text-white font-black text-xs">🎁 Claim Bonus Coins!</p>
          <p className="text-violet-200 text-[10px]">Exclusive reward — tap to unlock</p>
        </div>
        <ExternalLink size={15} className="text-white flex-shrink-0" />
      </a>

      {/* Ad zone bottom */}
      <AllAds prefix="captcha-bot" accentColor="from-violet-50 to-purple-50" label="Advertisement" />

    </div>
  );
};


