import React, { useState, useEffect, useRef, useCallback } from 'react';
import { CaptchaTask, CaptchaType } from '../types';
import { generateCaptcha, solveCaptcha } from '../data/captchas';
import {
  RefreshCw, CheckCircle, XCircle, Zap, Clock, Trophy,
  Star, TrendingUp, Shield, ChevronRight, AlertCircle, Info,
} from 'lucide-react';

interface CaptchaPageProps {
  onEarn: (amount: number, source: string) => void;
}

const DAILY_LIMIT = 30;

const TYPE_META: Record<CaptchaType, { label: string; icon: string; color: string; bg: string; border: string }> = {
  alphanumeric: { label: 'Alphanumeric', icon: '🔤', color: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-200' },
  math_add:     { label: 'Addition',     icon: '➕', color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200' },
  math_sub:     { label: 'Subtraction',  icon: '➖', color: 'text-rose-700', bg: 'bg-rose-50', border: 'border-rose-200' },
  math_mul:     { label: 'Multiplication', icon: '✖️', color: 'text-violet-700', bg: 'bg-violet-50', border: 'border-violet-200' },
  math_div:     { label: 'Division',     icon: '➗', color: 'text-orange-700', bg: 'bg-orange-50', border: 'border-orange-200' },
  math_complex: { label: 'Complex Math', icon: '🧮', color: 'text-red-700', bg: 'bg-red-50', border: 'border-red-200' },
  word:         { label: 'Word Typing',  icon: '📝', color: 'text-teal-700', bg: 'bg-teal-50', border: 'border-teal-200' },
  sequence:     { label: 'Sequence',     icon: '🔢', color: 'text-indigo-700', bg: 'bg-indigo-50', border: 'border-indigo-200' },
  roman:        { label: 'Roman Numeral', icon: '🏛️', color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200' },
  pattern:      { label: 'Pattern',      icon: '🧩', color: 'text-fuchsia-700', bg: 'bg-fuchsia-50', border: 'border-fuchsia-200' },
  emoji_count:  { label: 'Emoji Count',  icon: '😀', color: 'text-yellow-700', bg: 'bg-yellow-50', border: 'border-yellow-200' },
  missing_number: { label: 'Missing No.', icon: '🔍', color: 'text-cyan-700', bg: 'bg-cyan-50', border: 'border-cyan-200' },
  reverse:      { label: 'Reverse Word', icon: '🔄', color: 'text-pink-700', bg: 'bg-pink-50', border: 'border-pink-200' },
  case_mix:     { label: 'Case Sensitive', icon: '🅰️', color: 'text-slate-700', bg: 'bg-slate-50', border: 'border-slate-200' },
};

const DIFF_META = {
  easy:   { label: 'Easy',   stars: 1, color: 'text-emerald-600', bg: 'bg-emerald-100' },
  medium: { label: 'Medium', stars: 2, color: 'text-amber-600',   bg: 'bg-amber-100' },
  hard:   { label: 'Hard',   stars: 3, color: 'text-red-600',     bg: 'bg-red-100' },
};

// Noise seed for captcha visual — stable per task
function useNoiseSeed(taskId: number) {
  return useRef({ id: taskId, lines: Array.from({length:6}, (_,i) => ({
    x1: ((taskId*17+i*31)%100), y1: ((taskId*23+i*47)%100),
    x2: ((taskId*13+i*53)%100), y2: ((taskId*37+i*29)%100),
    color: ['#93c5fd','#f9a8d4','#86efac','#fcd34d','#c4b5fd','#fb7185'][i%6],
  })), dots: Array.from({length:30}, (_,i) => ({
    x: ((taskId*11+i*41)%100), y: ((taskId*43+i*17)%100),
  })) }).current;
}

const COLORS = ['#1d4ed8','#dc2626','#16a34a','#7c3aed','#ea580c','#db2777','#0d9488','#0369a1'];
const ROTATIONS = [-12,-6,0,6,12,-8,8,-4,4,-10,10,-14,14,-3,3];
const FONTS = [
  "'Georgia', serif",
  "'Courier New', monospace",
  "'Arial Black', sans-serif",
  "'Times New Roman', serif",
  "'Verdana', sans-serif",
];

export const CaptchaPage: React.FC<CaptchaPageProps> = ({ onEarn }) => {
  const [task, setTask] = useState<CaptchaTask>(() => generateCaptcha());
  const [answer, setAnswer] = useState('');
  const [status, setStatus] = useState<'idle' | 'correct' | 'wrong' | 'timeout'>('idle');
  const [solved, setSolved] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [totalEarned, setTotalEarned] = useState(0);
  const [animCoins, setAnimCoins] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(30);
  const [timerActive, setTimerActive] = useState(false);
  const [started, setStarted] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [history, setHistory] = useState<Array<{ type: CaptchaType; earned: number; correct: boolean }>>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const noise = useNoiseSeed(task.id);

  const dailyLeft = Math.max(0, DAILY_LIMIT - solved);
  const meta = TYPE_META[task.type];
  const diff = DIFF_META[task.difficulty];
  // Harder streak requirements — higher threshold for bonus
  const streakMult = streak >= 20 ? 2 : streak >= 10 ? 1.5 : 1;
  const streakLabel = streak >= 20 ? '🔥 2× Bonus!' : streak >= 10 ? '⚡ 1.5×!' : null;

  const clearTimer = () => { if (timerRef.current) clearInterval(timerRef.current); };

  const handleTimeout = useCallback(() => {
    setTimerActive(false);
    setStatus('timeout');
    setStreak(0);
    setHistory(h => [...h, { type: task.type, earned: 0, correct: false }]);
    setTimeout(() => loadNext(), 1800);
  }, [task.type]);

  useEffect(() => {
    if (!timerActive) return;
    clearTimer();
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) { clearTimer(); handleTimeout(); return 0; }
        return t - 1;
      });
    }, 1000);
    return clearTimer;
  }, [timerActive, handleTimeout]);

  const loadNext = () => {
    setTask(generateCaptcha());
    setAnswer('');
    setStatus('idle');
    setShowHint(false);
    setTimeout(() => { setTimerActive(true); setTimeLeft(task.timeLimit); inputRef.current?.focus(); }, 100);
  };

  const startSession = () => {
    setStarted(true);
    setTimerActive(true);
    setTimeLeft(task.timeLimit);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const handleRefresh = () => {
    clearTimer();
    setTask(generateCaptcha());
    setAnswer('');
    setStatus('idle');
    setShowHint(false);
    if (started) { setTimeout(() => { setTimerActive(true); setTimeLeft(task.timeLimit); }, 80); }
  };

  const handleSubmit = () => {
    if (!answer.trim() || solved >= DAILY_LIMIT || status !== 'idle') return;
    clearTimer();
    setTimerActive(false);
    const correct = solveCaptcha(task, answer);
    if (correct) {
      const earned = Math.round(task.reward * streakMult);
      const newStreak = streak + 1;
      setStreak(newStreak);
      setBestStreak(s => Math.max(s, newStreak));
      setSolved(s => s + 1);
      setTotalEarned(t => t + earned);
      setStatus('correct');
      setAnimCoins(earned);
      setHistory(h => [...h, { type: task.type, earned, correct: true }]);
      onEarn(earned, `CAPTCHA – ${meta.label} #${solved + 1}`);
      setTimeout(() => { setAnimCoins(null); loadNext(); }, 1400);
    } else {
      setStreak(0);
      setStatus('wrong');
      setHistory(h => [...h, { type: task.type, earned: 0, correct: false }]);
      setTimeout(() => loadNext(), 1400);
    }
  };

  // Render the visual captcha area
  const renderCaptchaVisual = () => {
    const isMath = task.type.startsWith('math_');
    const isEmoji = task.type === 'emoji_count';

    if (isEmoji) {
      return (
        <div className="flex flex-col items-center gap-3 py-4">
          <p className="text-xs uppercase tracking-widest font-semibold text-slate-400">Count the emojis</p>
          <div className="relative bg-gradient-to-br from-slate-50 to-slate-100 rounded-2xl border-2 border-dashed border-slate-200 p-5 select-none overflow-hidden w-full min-h-[80px] flex items-center justify-center">
            <NoiseSVG noise={noise} />
            <p className="text-4xl leading-tight tracking-wide text-center z-10 relative select-none">{task.text}</p>
          </div>
        </div>
      );
    }

    if (isMath) {
      return (
        <div className="flex flex-col items-center gap-3 py-4">
          <p className="text-xs uppercase tracking-widest font-semibold text-slate-400">Solve the equation</p>
          <div className="relative bg-gradient-to-br from-slate-50 via-white to-slate-100 rounded-2xl border-2 border-dashed border-slate-200 p-6 select-none overflow-hidden w-full min-h-[80px] flex items-center justify-center">
            <NoiseSVG noise={noise} />
            <span className="relative z-10 text-4xl font-black tracking-wider text-slate-800 select-none" style={{ fontFamily: "'Georgia', serif" }}>
              {task.displayText || task.text}
            </span>
          </div>
        </div>
      );
    }

    if (task.type === 'sequence' || task.type === 'pattern' || task.type === 'missing_number') {
      return (
        <div className="flex flex-col items-center gap-3 py-4">
          <p className="text-xs uppercase tracking-widest font-semibold text-slate-400">
            {task.type === 'missing_number' ? 'Find the missing number' : 'Complete the sequence'}
          </p>
          <div className="relative bg-gradient-to-br from-slate-50 to-white rounded-2xl border-2 border-dashed border-slate-200 p-6 select-none overflow-hidden w-full min-h-[80px] flex items-center justify-center">
            <NoiseSVG noise={noise} />
            <span className="relative z-10 text-3xl font-black text-slate-800 tracking-wide text-center" style={{ fontFamily: "'Courier New', monospace" }}>
              {task.text}
            </span>
          </div>
        </div>
      );
    }

    if (task.type === 'roman') {
      return (
        <div className="flex flex-col items-center gap-3 py-4">
          <p className="text-xs uppercase tracking-widest font-semibold text-slate-400">Convert Roman to Arabic</p>
          <div className="relative bg-gradient-to-br from-amber-50 to-amber-100 rounded-2xl border-2 border-dashed border-amber-200 p-6 select-none overflow-hidden w-full min-h-[80px] flex items-center justify-center">
            <NoiseSVG noise={noise} />
            <span className="relative z-10 text-5xl font-black tracking-widest text-amber-800 select-none" style={{ fontFamily: "'Times New Roman', serif" }}>
              {task.text}
            </span>
          </div>
        </div>
      );
    }

    if (task.type === 'reverse') {
      return (
        <div className="flex flex-col items-center gap-3 py-4">
          <p className="text-xs uppercase tracking-widest font-semibold text-slate-400">Type this word in reverse</p>
          <DistortedText text={task.text} noise={noise} />
        </div>
      );
    }

    // Default: distorted text (alphanumeric, word, case_mix)
    return (
      <div className="flex flex-col items-center gap-3 py-4">
        <p className="text-xs uppercase tracking-widest font-semibold text-slate-400">
          {task.type === 'case_mix' ? 'Type EXACTLY as shown' : 'Type the characters above'}
        </p>
        <DistortedText text={task.displayText || task.text} noise={noise} />
      </div>
    );
  };

  const timerPct = (timeLeft / task.timeLimit) * 100;
  const timerColor = timeLeft <= 5 ? '#ef4444' : timeLeft <= 10 ? '#f97316' : '#3b82f6';

  return (
    <div className="max-w-2xl mx-auto space-y-5 pb-6">

      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">CAPTCHA Earn</h1>
          <p className="text-sm text-slate-500 mt-0.5">Solve challenges · Earn coins · Build streaks</p>
        </div>
        <div className="flex items-center gap-1.5 bg-amber-50 border border-amber-200 rounded-xl px-3 py-1.5">
          <Trophy size={14} className="text-amber-500" />
          <span className="text-sm font-black text-amber-700">{totalEarned} 🪙</span>
        </div>
      </div>

      {/* ── Stats Row ──────────────────────────────────────────── */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { label: 'Solved', value: solved, icon: <CheckCircle size={15} className="text-emerald-500" />, bg: 'bg-emerald-50 border-emerald-100' },
          { label: 'Streak', value: `🔥 ${streak}`, icon: <Zap size={15} className="text-orange-500" />, bg: 'bg-orange-50 border-orange-100' },
          { label: 'Best', value: `🏆 ${bestStreak}`, icon: <Star size={15} className="text-violet-500" />, bg: 'bg-violet-50 border-violet-100' },
          { label: 'Left', value: dailyLeft, icon: <TrendingUp size={15} className="text-blue-500" />, bg: 'bg-blue-50 border-blue-100' },
        ].map((s) => (
          <div key={s.label} className={`${s.bg} border rounded-xl p-3 text-center`}>
            <div className="flex justify-center mb-1">{s.icon}</div>
            <p className="text-lg font-black text-slate-800 leading-none">{s.value}</p>
            <p className="text-xs text-slate-500 mt-0.5 font-medium">{s.label}</p>
          </div>
        ))}
      </div>

      {/* ── Daily Progress ─────────────────────────────────────── */}
      <div className="bg-white border border-slate-200 rounded-xl px-4 py-3">
        <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
          <span className="font-semibold">Daily Progress</span>
          <span className="font-bold text-slate-700">{solved} / {DAILY_LIMIT} solved</span>
        </div>
        <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${(solved / DAILY_LIMIT) * 100}%`,
              background: 'linear-gradient(90deg, #f59e0b, #ef4444)',
            }}
          />
        </div>
        <div className="flex justify-between text-xs mt-1.5">
          {streakLabel && <span className="font-bold text-orange-500 animate-pulse">{streakLabel}</span>}
          {!streakLabel && <span className="text-slate-400">Build a streak for bonus coins!</span>}
          <span className="text-slate-400">{dailyLeft} remaining</span>
        </div>
      </div>

      {/* ── Daily Done ─────────────────────────────────────────── */}
      {dailyLeft === 0 ? (
        <div className="bg-white border-2 border-amber-200 rounded-2xl p-10 text-center shadow-sm">
          <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Trophy size={40} className="text-amber-500" />
          </div>
          <h3 className="text-2xl font-black text-slate-800">Daily Goal Complete!</h3>
          <p className="text-slate-500 mt-2 text-sm">You've solved all {DAILY_LIMIT} CAPTCHAs for today.</p>
          <div className="mt-5 inline-flex items-center gap-2 bg-amber-500 text-white px-6 py-3 rounded-xl font-bold text-sm">
            🪙 {totalEarned} coins earned today
          </div>
        </div>
      ) : (

        /* ── Main CAPTCHA Card ─────────────────────────────────── */
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">

          {/* Card Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50">
            <div className="flex items-center gap-2.5">
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold border ${meta.bg} ${meta.color} ${meta.border}`}>
                <span>{meta.icon}</span> {meta.label}
              </span>
              <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold ${diff.bg} ${diff.color}`}>
                {'★'.repeat(diff.stars)}{'☆'.repeat(3 - diff.stars)} {diff.label}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-black text-amber-600">+{Math.round(task.reward * streakMult)} 🪙</span>
              {streakMult > 1 && (
                <span className="text-xs bg-orange-100 text-orange-600 font-bold px-2 py-0.5 rounded-full animate-pulse">
                  {streakMult}×
                </span>
              )}
            </div>
          </div>

          {/* CAPTCHA Visual */}
          <div className="px-5 pt-2 pb-1 relative">
            {renderCaptchaVisual()}
            {/* Overlay states */}
            {status === 'correct' && (
              <div className="absolute inset-0 bg-emerald-400/10 flex flex-col items-center justify-center rounded-xl gap-2">
                <CheckCircle size={52} className="text-emerald-500 drop-shadow" />
                {animCoins !== null && (
                  <span className="text-2xl font-black text-emerald-600 drop-shadow animate-bounce">+{animCoins} 🪙</span>
                )}
              </div>
            )}
            {status === 'wrong' && (
              <div className="absolute inset-0 bg-red-400/10 flex flex-col items-center justify-center rounded-xl gap-2">
                <XCircle size={52} className="text-red-500 drop-shadow" />
                <span className="text-sm font-bold text-red-600 bg-white/80 px-3 py-1 rounded-lg">Wrong answer — try next!</span>
              </div>
            )}
            {status === 'timeout' && (
              <div className="absolute inset-0 bg-orange-400/10 flex flex-col items-center justify-center rounded-xl gap-2">
                <Clock size={52} className="text-orange-500 drop-shadow" />
                <span className="text-sm font-bold text-orange-600 bg-white/80 px-3 py-1 rounded-lg">Time's up!</span>
              </div>
            )}
          </div>

          {/* Hint Row */}
          {task.hint && !task.hint.startsWith('__ans__') && (
            <div className="px-5 pb-2">
              {!showHint ? (
                <button onClick={() => setShowHint(true)} className="flex items-center gap-1 text-xs text-slate-400 hover:text-blue-500 transition">
                  <Info size={12} /> Show hint (−2 🪙 penalty)
                </button>
              ) : (
                <div className="flex items-center gap-2 bg-blue-50 border border-blue-100 rounded-lg px-3 py-1.5 text-xs text-blue-700 font-medium">
                  <Info size={12} /> {task.hint}
                </div>
              )}
            </div>
          )}

          {/* Timer Bar */}
          {started && status === 'idle' && (
            <div className="px-5 pb-3">
              <div className="flex items-center gap-3">
                <Clock size={14} style={{ color: timerColor }} />
                <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-1000"
                    style={{ width: `${timerPct}%`, backgroundColor: timerColor }}
                  />
                </div>
                <span className="text-xs font-black w-7 text-right" style={{ color: timerColor }}>{timeLeft}s</span>
              </div>
              {timeLeft <= 10 && (
                <p className="text-xs text-red-500 font-bold mt-1 animate-pulse text-center">⚠️ Hurry up!</p>
              )}
            </div>
          )}

          {/* Input */}
          <div className="px-5 pb-4">
            <div className="relative">
              <input
                ref={inputRef}
                type="text"
                value={answer}
                onChange={e => setAnswer(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                placeholder={
                  task.type === 'emoji_count' ? 'Enter the count...' :
                  task.type.startsWith('math_') || task.type === 'sequence' || task.type === 'pattern' || task.type === 'missing_number' || task.type === 'roman' ? 'Enter the answer...' :
                  'Type here...'
                }
                disabled={status !== 'idle' || !started}
                autoComplete="off"
                spellCheck={false}
                className={`w-full rounded-xl border-2 px-4 py-3.5 text-center text-xl font-black tracking-widest focus:outline-none transition-all font-mono ${
                  status === 'correct' ? 'border-emerald-400 bg-emerald-50 text-emerald-700' :
                  status === 'wrong' || status === 'timeout' ? 'border-red-400 bg-red-50 text-red-700' :
                  !started ? 'border-slate-200 bg-slate-50 text-slate-400 cursor-not-allowed' :
                  'border-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 bg-white text-slate-800'
                }`}
              />
              {answer && status === 'idle' && started && (
                <button
                  onClick={() => setAnswer('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-lg font-bold"
                >×</button>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="px-5 pb-5 flex gap-2">
            <button
              onClick={handleRefresh}
              title="New CAPTCHA (skip)"
              className="border-2 border-slate-200 text-slate-500 hover:border-slate-300 hover:text-slate-700 rounded-xl px-4 py-3 flex items-center gap-1.5 font-semibold text-sm transition active:scale-95 bg-white"
            >
              <RefreshCw size={15} /> Skip
            </button>

            {!started ? (
              <button
                onClick={startSession}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-xl py-3 flex items-center justify-center gap-2 shadow-md shadow-blue-200 transition active:scale-95 text-sm"
              >
                <Shield size={16} /> Start Solving
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={!answer.trim() || status !== 'idle'}
                className={`flex-1 font-black rounded-xl py-3 flex items-center justify-center gap-2 shadow-md transition active:scale-95 text-sm ${
                  answer.trim() && status === 'idle'
                    ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-amber-200'
                    : 'bg-slate-100 text-slate-400 cursor-not-allowed shadow-none'
                }`}
              >
                Submit & Earn <ChevronRight size={16} />
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── CAPTCHA Types Reference ────────────────────────────── */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5">
        <h3 className="text-sm font-black text-slate-800 mb-3 flex items-center gap-2">
          <AlertCircle size={15} className="text-blue-500" /> CAPTCHA Types & Rewards
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {(Object.entries(TYPE_META) as [CaptchaType, typeof TYPE_META[CaptchaType]][]).map(([k, v]) => (
            <div key={k} className={`flex items-center gap-2 px-3 py-2 rounded-xl border ${v.bg} ${v.border}`}>
              <span className="text-base">{v.icon}</span>
              <div>
                <p className={`text-xs font-bold ${v.color}`}>{v.label}</p>
                <p className="text-xs text-slate-400">1–6 🪙</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Recent Activity ────────────────────────────────────── */}
      {history.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5">
          <h3 className="text-sm font-black text-slate-800 mb-3">Recent Activity</h3>
          <div className="space-y-2 max-h-48 overflow-y-auto scrollbar-hide">
            {[...history].reverse().slice(0, 10).map((h, i) => {
              const m = TYPE_META[h.type];
              return (
                <div key={i} className="flex items-center justify-between py-1.5 border-b border-slate-50 last:border-0">
                  <div className="flex items-center gap-2">
                    {h.correct
                      ? <CheckCircle size={14} className="text-emerald-500" />
                      : <XCircle size={14} className="text-red-400" />}
                    <span className="text-xs text-slate-600 font-medium">{m.icon} {m.label}</span>
                  </div>
                  <span className={`text-xs font-black ${h.correct ? 'text-emerald-600' : 'text-slate-400'}`}>
                    {h.correct ? `+${h.earned} 🪙` : 'Failed'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Streak Bonus Guide ─────────────────────────────────── */}
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-5 text-white">
        <h3 className="text-sm font-black mb-3 flex items-center gap-2">
          <Zap size={15} className="text-amber-400" /> Streak Bonus System
        </h3>
        <div className="grid grid-cols-2 gap-3">
          {[
            { streak: '10+', mult: '1.5×', color: 'from-blue-500 to-cyan-400', icon: '⚡' },
            { streak: '20+', mult: '2×',   color: 'from-orange-500 to-amber-400', icon: '🔥' },
          ].map(b => (
            <div key={b.streak} className={`bg-gradient-to-br ${b.color} rounded-xl p-3 text-center`}>
              <p className="text-2xl">{b.icon}</p>
              <p className="font-black text-lg">{b.mult}</p>
              <p className="text-xs opacity-80">{b.streak} streak</p>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};

/* ── Sub-components ────────────────────────────────────────────── */

const NoiseSVG: React.FC<{ noise: { lines: any[]; dots: any[] } }> = ({ noise }) => (
  <svg className="absolute inset-0 w-full h-full pointer-events-none" xmlns="http://www.w3.org/2000/svg">
    {noise.lines.map((l, i) => (
      <line key={i} x1={`${l.x1}%`} y1={`${l.y1}%`} x2={`${l.x2}%`} y2={`${l.y2}%`}
        stroke={l.color} strokeWidth="1.2" opacity="0.35" />
    ))}
    {noise.dots.map((d, i) => (
      <circle key={i} cx={`${d.x}%`} cy={`${d.y}%`} r="1.5" fill="#94a3b8" opacity="0.3" />
    ))}
  </svg>
);

const DistortedText: React.FC<{ text: string; noise: any }> = ({ text }) => {
  const chars = text.split('');
  return (
    <div
      className="relative flex items-center justify-center bg-gradient-to-br from-slate-100 via-white to-slate-100 rounded-2xl border-2 border-dashed border-slate-300 select-none overflow-hidden w-full"
      style={{ minHeight: 88 }}
    >
      <div className="relative z-10 flex items-center justify-center gap-0.5 px-5 py-4 flex-wrap">
        {chars.map((ch, i) => (
          <span
            key={i}
            className="inline-block font-black text-3xl"
            style={{
              color: COLORS[i % COLORS.length],
              transform: `rotate(${ROTATIONS[i % ROTATIONS.length]}deg) scale(${0.88 + (i * 0.04) % 0.28})`,
              fontFamily: FONTS[i % FONTS.length],
              textShadow: '1px 2px 4px rgba(0,0,0,0.12)',
              marginLeft: i === 0 ? 0 : `${2 + (i % 3)}px`,
            }}
          >
            {ch}
          </span>
        ))}
      </div>
    </div>
  );
};
