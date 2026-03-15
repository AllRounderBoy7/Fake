import React, { useState, useMemo } from 'react';
import { Transaction, UserStats } from '../types';
import {
  Wallet, ArrowDownCircle, ArrowUpCircle,
  ChevronRight, ChevronLeft, CheckCircle2,
  CreditCard, Building2, Bitcoin, ShieldCheck, Clock,
  AlertCircle, Eye, EyeOff, Copy, Check,
  Lock, TrendingUp, TrendingDown,
  BarChart3, Search, X, Zap, Star, Award,
  CircleDollarSign, Info
} from 'lucide-react';

interface WithdrawPageProps {
  stats: UserStats;
  transactions: Transaction[];
  onWithdraw: (amount: number, method: string) => void;
}

type WalletView = 'overview' | 'withdraw' | 'history';
type Step = 'method' | 'details' | 'confirm' | 'success';
type FilterType = 'all' | 'earn' | 'withdraw';

interface PaymentMethod {
  id: string;
  name: string;
  shortName: string;
  icon: React.ReactNode;
  color: string;
  colorLight: string;
  gradient: string;
  bgLight: string;
  borderColor: string;
  minCoins: number;
  inrPerCoin: number;
  tag: string;
  tagColor: string;
  desc: string;
  speed: string;
  fields: FormField[];
}

interface FormField {
  id: string;
  label: string;
  placeholder: string;
  type: string;
  maxLength?: number;
  hint?: string;
}

const PAYMENT_METHODS: PaymentMethod[] = [
  {
    id: 'phonepe',
    name: 'PhonePe',
    shortName: 'PhonePe',
    icon: (
      <svg viewBox="0 0 48 48" className="w-7 h-7" fill="none">
        <path d="M24 4C13.0 4 4 13.0 4 24s9.0 20 20 20 20-9.0 20-20S35.0 4 24 4zm6 23h-4v3a2 2 0 01-2 2h-4v-5h-4v-6c0-3.3 2.7-6 6-6h4c2.2 0 4 1.8 4 4v8z" fill="white" />
      </svg>
    ),
    color: '#5F259F',
    colorLight: '#7c3aed',
    gradient: 'linear-gradient(135deg, #5F259F 0%, #7c3aed 100%)',
    bgLight: 'bg-purple-50',
    borderColor: 'border-purple-200',
    minCoins: 5000,
    inrPerCoin: 0.20,
    tag: '⚡ Instant',
    tagColor: 'bg-emerald-100 text-emerald-700',
    desc: '5,000 coins = ₹1,000',
    speed: 'Instant transfer',
    fields: [
      { id: 'phone', label: 'Registered Mobile Number', placeholder: '9XXXXXXXXX', type: 'tel', maxLength: 10, hint: '10-digit PhonePe registered number' },
      { id: 'name', label: 'Account Holder Name', placeholder: 'Full name on PhonePe', type: 'text', hint: 'Name as registered on PhonePe' },
    ],
  },
  {
    id: 'upi',
    name: 'UPI Transfer',
    shortName: 'UPI',
    icon: (
      <svg viewBox="0 0 48 48" className="w-7 h-7" fill="none">
        <rect width="48" height="48" rx="10" fill="none" />
        <text x="50%" y="58%" dominantBaseline="middle" textAnchor="middle" fill="white" fontSize="13" fontWeight="bold" fontFamily="Arial, sans-serif">UPI</text>
        <path d="M8 32 L24 12 L40 32" stroke="white" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" opacity="0.4" />
      </svg>
    ),
    color: '#097939',
    colorLight: '#16a34a',
    gradient: 'linear-gradient(135deg, #097939 0%, #16a34a 100%)',
    bgLight: 'bg-green-50',
    borderColor: 'border-green-200',
    minCoins: 5000,
    inrPerCoin: 0.20,
    tag: '⚡ Instant',
    tagColor: 'bg-emerald-100 text-emerald-700',
    desc: '5,000 coins = ₹1,000',
    speed: 'Instant transfer',
    fields: [
      { id: 'upiId', label: 'UPI ID', placeholder: 'yourname@upi', type: 'text', hint: 'e.g. name@okaxis · name@ybl · name@paytm' },
      { id: 'name', label: 'Account Holder Name', placeholder: 'Full name linked to UPI', type: 'text' },
    ],
  },
  {
    id: 'creditcard',
    name: 'Credit / Debit Card',
    shortName: 'Card',
    icon: <CreditCard size={24} className="text-white" />,
    color: '#1d4ed8',
    colorLight: '#3b82f6',
    gradient: 'linear-gradient(135deg, #1d4ed8 0%, #6366f1 100%)',
    bgLight: 'bg-blue-50',
    borderColor: 'border-blue-200',
    minCoins: 10000,
    inrPerCoin: 0.10,
    tag: '🏦 1–3 Days',
    tagColor: 'bg-blue-100 text-blue-700',
    desc: '10,000 coins = ₹1,000',
    speed: '1–3 business days',
    fields: [
      { id: 'cardNumber', label: 'Card Number', placeholder: 'XXXX  XXXX  XXXX  XXXX', type: 'text', maxLength: 19, hint: '16-digit card number' },
      { id: 'cardName', label: 'Cardholder Name', placeholder: 'Name printed on card', type: 'text' },
      { id: 'expiry', label: 'Expiry Date', placeholder: 'MM / YY', type: 'text', maxLength: 5, hint: 'Valid through date' },
      { id: 'cvv', label: 'CVV', placeholder: '•••', type: 'password', maxLength: 3, hint: '3-digit code on back of card' },
    ],
  },
  {
    id: 'bank',
    name: 'Bank Transfer',
    shortName: 'Bank',
    icon: <Building2 size={24} className="text-white" />,
    color: '#c2410c',
    colorLight: '#f97316',
    gradient: 'linear-gradient(135deg, #c2410c 0%, #f97316 100%)',
    bgLight: 'bg-orange-50',
    borderColor: 'border-orange-200',
    minCoins: 10000,
    inrPerCoin: 0.10,
    tag: '📅 1–2 Days',
    tagColor: 'bg-orange-100 text-orange-700',
    desc: '10,000 coins = ₹1,000',
    speed: '1–2 business days (NEFT)',
    fields: [
      { id: 'accountNo', label: 'Account Number', placeholder: 'Enter account number', type: 'text', maxLength: 18, hint: 'Savings / Current account number' },
      { id: 'confirmAccountNo', label: 'Confirm Account Number', placeholder: 'Re-enter account number', type: 'text', maxLength: 18 },
      { id: 'ifsc', label: 'IFSC Code', placeholder: 'e.g. HDFC0001234', type: 'text', maxLength: 11, hint: '11-character bank branch code' },
      { id: 'name', label: 'Account Holder Name', placeholder: 'Full name as in bank', type: 'text' },
    ],
  },
  {
    id: 'crypto',
    name: 'Crypto Wallet',
    shortName: 'Crypto',
    icon: <Bitcoin size={24} className="text-white" />,
    color: '#d97706',
    colorLight: '#f59e0b',
    gradient: 'linear-gradient(135deg, #d97706 0%, #f59e0b 100%)',
    bgLight: 'bg-yellow-50',
    borderColor: 'border-yellow-200',
    minCoins: 5000,
    inrPerCoin: 0.40,
    tag: '₿ Up to 24h',
    tagColor: 'bg-yellow-100 text-yellow-700',
    desc: '5,000 coins = ₹2,000',
    speed: 'Up to 24 hours',
    fields: [
      { id: 'wallet', label: 'Wallet Address', placeholder: 'Enter your crypto wallet address', type: 'text', hint: 'BTC / ETH / USDT — double-check address!' },
      { id: 'network', label: 'Network', placeholder: 'e.g. BTC · ETH · TRC20 · BEP20', type: 'text', hint: 'Wrong network = permanent loss of funds' },
    ],
  },
];

const COIN_PRESETS = [5000, 10000, 15000, 20000, 30000];

function formatCardNumber(val: string) {
  return val.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim();
}
function formatExpiry(val: string) {
  const d = val.replace(/\D/g, '').slice(0, 4);
  return d.length >= 2 ? d.slice(0, 2) + '/' + d.slice(2) : d;
}

// Mini sparkline bar chart component
const MiniBarChart: React.FC<{ data: number[]; color: string }> = ({ data, color }) => {
  const max = Math.max(...data, 1);
  return (
    <div className="flex items-end gap-0.5 h-8">
      {data.map((v, i) => (
        <div
          key={i}
          className="flex-1 rounded-sm opacity-80 transition-all"
          style={{ height: `${(v / max) * 100}%`, backgroundColor: color, minHeight: 2 }}
        />
      ))}
    </div>
  );
};

export const WithdrawPage: React.FC<WithdrawPageProps> = ({ stats, transactions, onWithdraw }) => {
  const [view, setView] = useState<WalletView>('overview');
  const [step, setStep] = useState<Step>('method');
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);
  const [coinAmount, setCoinAmount] = useState('');
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showCvv, setShowCvv] = useState(false);
  const [copied, setCopied] = useState(false);
  const [txRef] = useState(() => 'TXN' + Date.now().toString().slice(-9));
  const [filter, setFilter] = useState<FilterType>('all');
  const [searchQ, setSearchQ] = useState('');

  const earnTx = transactions.filter((t) => t.type === 'earn');
  const withdrawTx = transactions.filter((t) => t.type === 'withdraw');
  const totalWithdrawn = withdrawTx.reduce((s, t) => s + t.amount, 0);
  const totalEarned = earnTx.reduce((s, t) => s + t.amount, 0);

  // Last 7 earn totals (mock grouping)
  const last7 = useMemo(() => {
    const arr = Array(7).fill(0);
    const rev = [...earnTx].reverse().slice(0, 7);
    rev.forEach((t, i) => { arr[6 - i] = t.amount; });
    return arr;
  }, [earnTx]);

  const coins = parseInt(coinAmount) || 0;
  const inrValue = selectedMethod ? coins * selectedMethod.inrPerCoin : 0;

  // Filtered history
  const filteredTx = useMemo(() => {
    return [...transactions]
      .reverse()
      .filter((t) => filter === 'all' || t.type === filter)
      .filter((t) => searchQ === '' || t.source.toLowerCase().includes(searchQ.toLowerCase()));
  }, [transactions, filter, searchQ]);

  const validate = () => {
    const e: Record<string, string> = {};
    const c = parseInt(coinAmount);
    if (!coinAmount || isNaN(c)) {
      e.amount = 'Please enter a valid coin amount.';
    } else if (c < (selectedMethod?.minCoins ?? 0)) {
      e.amount = `Minimum ${selectedMethod?.minCoins.toLocaleString()} coins required.`;
    } else if (c > stats.coins) {
      e.amount = `Insufficient balance. You only have ${stats.coins.toLocaleString()} coins.`;
    }
    selectedMethod?.fields.forEach((f) => {
      const val = formData[f.id] || '';
      if (!val.trim()) {
        e[f.id] = `${f.label} is required.`;
      } else if (f.id === 'cardNumber' && val.replace(/\s/g, '').length < 16) {
        e[f.id] = 'Enter valid 16-digit card number.';
      } else if (f.id === 'expiry' && !/^\d{2}\/\d{2}$/.test(val)) {
        e[f.id] = 'Enter valid expiry (MM/YY).';
      } else if (f.id === 'cvv' && val.length < 3) {
        e[f.id] = 'Enter valid 3-digit CVV.';
      } else if (f.id === 'phone' && !/^\d{10}$/.test(val)) {
        e[f.id] = 'Enter valid 10-digit mobile number.';
      } else if (f.id === 'upiId' && !val.includes('@')) {
        e[f.id] = 'Enter valid UPI ID (e.g. name@upi).';
      } else if (f.id === 'ifsc' && val.length !== 11) {
        e[f.id] = 'IFSC must be exactly 11 characters.';
      } else if (f.id === 'confirmAccountNo' && val !== formData['accountNo']) {
        e[f.id] = 'Account numbers do not match.';
      }
    });
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleMethodSelect = (m: PaymentMethod) => {
    setSelectedMethod(m);
    setFormData({});
    setErrors({});
    setCoinAmount('');
    setStep('details');
  };

  const handleDetailsNext = () => { if (validate()) setStep('confirm'); };

  const handleConfirm = () => {
    if (!selectedMethod) return;
    onWithdraw(coins, selectedMethod.name);
    setStep('success');
  };

  const handleReset = () => {
    setStep('method');
    setSelectedMethod(null);
    setFormData({});
    setErrors({});
    setCoinAmount('');
    setView('overview');
  };

  const handleFieldChange = (id: string, value: string) => {
    let v = value;
    if (id === 'cardNumber') v = formatCardNumber(value);
    if (id === 'expiry') v = formatExpiry(value);
    if (id === 'ifsc') v = value.toUpperCase().slice(0, 11);
    if (id === 'phone') v = value.replace(/\D/g, '').slice(0, 10);
    setFormData((p) => ({ ...p, [id]: v }));
    if (errors[id]) setErrors((p) => { const n = { ...p }; delete n[id]; return n; });
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(txRef);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getMaskedDetail = () => {
    if (!selectedMethod) return '';
    if (selectedMethod.id === 'phonepe') {
      const v = formData['phone'] || '';
      return v.slice(0, 2) + '•••••' + v.slice(-3);
    }
    if (selectedMethod.id === 'upi') {
      const v = formData['upiId'] || '';
      const parts = v.split('@');
      return parts[0].slice(0, 3) + '•••@' + (parts[1] || '');
    }
    if (selectedMethod.id === 'creditcard') {
      const cn = (formData['cardNumber'] || '').replace(/\s/g, '');
      return '•••• •••• •••• ' + (cn.slice(-4) || '••••');
    }
    if (selectedMethod.id === 'bank') {
      const an = formData['accountNo'] || '';
      return an.slice(0, 2) + '•'.repeat(Math.max(0, an.length - 4)) + an.slice(-2);
    }
    if (selectedMethod.id === 'crypto') {
      const w = formData['wallet'] || '';
      return w.slice(0, 6) + '....' + w.slice(-4);
    }
    return '';
  };

  const stepIndex = ['method', 'details', 'confirm', 'success'].indexOf(step);

  // ─── Level display ───
  const levels = ['Beginner', 'Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond', 'Legend'];
  const levelName = levels[Math.min(stats.level, levels.length - 1)];
  const xpToNext = ((stats.level + 1) * 100);
  const xpProgress = Math.min((stats.xp % 100) / 100, 1) * 100;

  // ─── INR estimate ───
  const estimatedInr = (stats.coins * 0.20).toFixed(0);

  return (
    <div className="max-w-2xl mx-auto pb-12 space-y-0">

      {/* ══ TOP HEADER ══ */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-black text-gray-900 tracking-tight">My Wallet</h2>
          <p className="text-gray-400 text-sm mt-0.5">Your earnings & withdrawals</p>
        </div>
        <div className="flex items-center gap-2 bg-gradient-to-r from-amber-400 to-orange-400 rounded-2xl px-4 py-2 shadow-lg shadow-amber-200">
          <span className="text-lg">🪙</span>
          <span className="text-xl font-black text-white">{stats.coins.toLocaleString()}</span>
        </div>
      </div>

      {/* ══ TAB SWITCHER ══ */}
      <div className="flex bg-gray-100 rounded-2xl p-1 mb-6 gap-1">
        {([
          { id: 'overview', label: 'Overview', icon: <BarChart3 size={15} /> },
          { id: 'withdraw', label: 'Withdraw', icon: <ArrowUpCircle size={15} /> },
          { id: 'history',  label: 'History',  icon: <Clock size={15} /> },
        ] as { id: WalletView; label: string; icon: React.ReactNode }[]).map((t) => (
          <button
            key={t.id}
            onClick={() => { setView(t.id); if (t.id === 'withdraw') setStep('method'); }}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 ${
              view === t.id
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* ═══════════════════════════════════════════════════════
          VIEW: OVERVIEW
      ═══════════════════════════════════════════════════════ */}
      {view === 'overview' && (
        <div className="space-y-4 animate-slide-up">

          {/* ── Hero Balance Card ── */}
          <div className="relative rounded-3xl overflow-hidden shadow-2xl">
            {/* BG gradient */}
            <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 40%, #0f172a 100%)' }} />
            {/* Decorative glows */}
            <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full opacity-20" style={{ background: 'radial-gradient(circle, #f59e0b, transparent 70%)' }} />
            <div className="absolute -bottom-20 -left-10 w-56 h-56 rounded-full opacity-10" style={{ background: 'radial-gradient(circle, #8b5cf6, transparent 70%)' }} />
            <div className="absolute top-1/2 right-8 w-32 h-32 rounded-full opacity-5" style={{ background: 'radial-gradient(circle, #10b981, transparent 70%)' }} />

            <div className="relative z-10 p-7">
              {/* Top row */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-amber-400/20 flex items-center justify-center">
                    <Wallet size={16} className="text-amber-400" />
                  </div>
                  <span className="text-white/50 text-xs font-semibold uppercase tracking-widest">GetMe Wallet</span>
                </div>
                <div className="bg-white/10 rounded-full px-3 py-1 flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-white/70 text-xs font-semibold">Active</span>
                </div>
              </div>

              {/* Balance */}
              <div className="mb-6">
                <p className="text-white/40 text-xs font-medium uppercase tracking-widest mb-1">Available Balance</p>
                <div className="flex items-end gap-3">
                  <span className="text-6xl font-black text-white tracking-tight">{stats.coins.toLocaleString()}</span>
                  <span className="text-2xl mb-2">🪙</span>
                </div>
                <p className="text-amber-400 font-semibold text-sm mt-1">≈ ₹{estimatedInr} estimated value</p>
              </div>

              {/* Stats row */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-white/8 backdrop-blur border border-white/10 rounded-2xl p-3">
                  <p className="text-white/40 text-xs mb-1 flex items-center gap-1"><TrendingUp size={10} /> Earned</p>
                  <p className="text-white font-black text-base">+{totalEarned.toLocaleString()}</p>
                  <p className="text-white/30 text-xs">🪙 total</p>
                </div>
                <div className="bg-white/8 backdrop-blur border border-white/10 rounded-2xl p-3">
                  <p className="text-white/40 text-xs mb-1 flex items-center gap-1"><TrendingDown size={10} /> Withdrawn</p>
                  <p className="text-white font-black text-base">-{totalWithdrawn.toLocaleString()}</p>
                  <p className="text-white/30 text-xs">🪙 total</p>
                </div>
                <div className="bg-amber-400/15 backdrop-blur border border-amber-400/20 rounded-2xl p-3">
                  <p className="text-amber-300/60 text-xs mb-1 flex items-center gap-1"><CircleDollarSign size={10} /> Value</p>
                  <p className="text-amber-300 font-black text-base">₹{estimatedInr}</p>
                  <p className="text-amber-300/40 text-xs">approx.</p>
                </div>
              </div>
            </div>
          </div>

          {/* ── Level / XP Card ── */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-200">
                  <Award size={18} className="text-white" />
                </div>
                <div>
                  <p className="font-black text-gray-800 text-sm">{levelName}</p>
                  <p className="text-gray-400 text-xs">Level {stats.level}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-400">XP Progress</p>
                <p className="text-sm font-black text-amber-600">{stats.xp % 100} / 100</p>
              </div>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2.5">
              <div
                className="h-2.5 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 transition-all duration-700"
                style={{ width: `${xpProgress}%` }}
              />
            </div>
            <div className="flex justify-between mt-1.5">
              <span className="text-xs text-gray-400">Level {stats.level}</span>
              <span className="text-xs text-gray-400">Level {stats.level + 1} at {xpToNext} XP</span>
            </div>
          </div>

          {/* ── Stats Grid ── */}
          <div className="grid grid-cols-2 gap-3">
            {/* Earnings chart */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 col-span-2">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="font-black text-gray-800 text-sm">Recent Earnings</p>
                  <p className="text-gray-400 text-xs">Last {Math.min(earnTx.length, 7)} transactions</p>
                </div>
                <div className="bg-emerald-50 border border-emerald-100 rounded-xl px-3 py-1.5">
                  <p className="text-emerald-600 text-xs font-bold">+{totalEarned.toLocaleString()} 🪙</p>
                </div>
              </div>
              {earnTx.length === 0 ? (
                <div className="h-8 flex items-center justify-center">
                  <p className="text-gray-300 text-xs">No earnings yet — complete tasks to earn!</p>
                </div>
              ) : (
                <MiniBarChart data={last7} color="#f59e0b" />
              )}
            </div>

            <div className="bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-xl bg-purple-500 flex items-center justify-center">
                  <Zap size={14} className="text-white" />
                </div>
                <p className="text-purple-700 text-xs font-bold uppercase tracking-wide">Surveys</p>
              </div>
              <p className="text-2xl font-black text-purple-800">{stats.surveysCompleted}</p>
              <p className="text-purple-500 text-xs mt-0.5">completed</p>
            </div>

            <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-xl bg-blue-500 flex items-center justify-center">
                  <Star size={14} className="text-white" />
                </div>
                <p className="text-blue-700 text-xs font-bold uppercase tracking-wide">CAPTCHAs</p>
              </div>
              <p className="text-2xl font-black text-blue-800">{stats.captchasSolved}</p>
              <p className="text-blue-500 text-xs mt-0.5">solved</p>
            </div>
          </div>

          {/* ── Withdrawal Methods Preview ── */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <p className="font-black text-gray-800 text-sm">Withdraw Methods</p>
              <button
                onClick={() => setView('withdraw')}
                className="text-xs text-amber-600 font-black flex items-center gap-1 hover:text-amber-700"
              >
                Withdraw <ChevronRight size={12} />
              </button>
            </div>
            <div className="space-y-2">
              {PAYMENT_METHODS.map((m) => {
                const can = stats.coins >= m.minCoins;
                const pct = Math.min((stats.coins / m.minCoins) * 100, 100);
                return (
                  <div key={m.id} className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${can ? 'border-gray-100 bg-gray-50' : 'border-gray-100 bg-gray-50/50 opacity-60'}`}>
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: m.gradient }}>
                      <span className="scale-75">{m.icon}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-gray-700 text-xs font-bold">{m.name}</span>
                        <span className="text-xs font-black" style={{ color: can ? '#10b981' : '#94a3b8' }}>
                          {can ? '✓ Ready' : `${(m.minCoins - stats.coins).toLocaleString()} more`}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-1.5">
                        <div
                          className="h-1.5 rounded-full transition-all duration-700"
                          style={{ width: `${pct}%`, background: m.gradient }}
                        />
                      </div>
                      <div className="flex justify-between mt-0.5">
                        <span className="text-gray-400 text-[10px]">{stats.coins.toLocaleString()}</span>
                        <span className="text-gray-400 text-[10px]">{m.minCoins.toLocaleString()} min → {m.desc.split('=')[1]?.trim()}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── Recent Transactions (mini) ── */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <p className="font-black text-gray-800 text-sm">Recent Activity</p>
              <button onClick={() => setView('history')} className="text-xs text-amber-600 font-black flex items-center gap-1">
                See all <ChevronRight size={12} />
              </button>
            </div>
            {transactions.length === 0 ? (
              <div className="py-6 flex flex-col items-center gap-2">
                <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center">
                  <BarChart3 size={20} className="text-gray-300" />
                </div>
                <p className="text-gray-400 text-sm">No activity yet</p>
                <p className="text-gray-300 text-xs">Complete surveys or CAPTCHAs to earn coins</p>
              </div>
            ) : (
              <div className="space-y-1">
                {[...transactions].reverse().slice(0, 5).map((tx) => (
                  <div key={tx.id} className="flex items-center gap-3 py-2.5 border-b border-gray-50 last:border-0">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${tx.type === 'earn' ? 'bg-emerald-100' : 'bg-red-100'}`}>
                      {tx.type === 'earn'
                        ? <ArrowDownCircle size={17} className="text-emerald-500" />
                        : <ArrowUpCircle size={17} className="text-red-400" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-gray-700 text-sm font-semibold truncate">{tx.source}</p>
                      <p className="text-gray-400 text-xs">{tx.date}</p>
                    </div>
                    <span className={`text-sm font-black flex-shrink-0 ${tx.type === 'earn' ? 'text-emerald-500' : 'text-red-400'}`}>
                      {tx.type === 'earn' ? '+' : '-'}{tx.amount} 🪙
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── Earn More CTA ── */}
          <div className="relative bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl p-5 text-white overflow-hidden shadow-lg shadow-amber-200">
            <div className="absolute -right-8 -top-8 w-32 h-32 bg-white/10 rounded-full" />
            <div className="absolute -left-4 -bottom-8 w-24 h-24 bg-white/10 rounded-full" />
            <div className="relative z-10">
              <p className="text-xs font-bold uppercase tracking-widest text-white/70 mb-1">Want more coins?</p>
              <p className="text-xl font-black mb-1">Complete tasks to earn faster!</p>
              <p className="text-white/70 text-sm">Solve CAPTCHAs & surveys to reach withdrawal thresholds</p>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════
          VIEW: WITHDRAW
      ═══════════════════════════════════════════════════════ */}
      {view === 'withdraw' && (
        <div className="space-y-4 animate-slide-up">

          {/* Step Progress */}
          {step !== 'success' && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <div className="flex items-center">
                {(['method', 'details', 'confirm'] as const).map((s, i) => (
                  <React.Fragment key={s}>
                    <div className="flex items-center gap-2">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black border-2 transition-all duration-300 ${
                        step === s ? 'border-amber-500 bg-amber-500 text-white scale-110 shadow-lg shadow-amber-200'
                        : stepIndex > i ? 'border-emerald-500 bg-emerald-500 text-white'
                        : 'border-gray-200 bg-white text-gray-300'
                      }`}>
                        {stepIndex > i ? <Check size={13} /> : i + 1}
                      </div>
                      <span className={`text-xs font-bold hidden sm:block ${
                        step === s ? 'text-amber-600' : stepIndex > i ? 'text-emerald-600' : 'text-gray-300'
                      }`}>
                        {s === 'method' ? 'Method' : s === 'details' ? 'Details' : 'Confirm'}
                      </span>
                    </div>
                    {i < 2 && (
                      <div className={`flex-1 h-0.5 mx-2 rounded-full transition-all duration-500 ${stepIndex > i ? 'bg-emerald-400' : 'bg-gray-200'}`} />
                    )}
                  </React.Fragment>
                ))}
              </div>
            </div>
          )}

          {/* ── STEP 1: SELECT METHOD ── */}
          {step === 'method' && (
            <div className="space-y-3">
              {/* Balance pill */}
              <div className="flex items-center justify-between bg-slate-900 rounded-2xl px-5 py-4">
                <div>
                  <p className="text-white/40 text-xs">Available to withdraw</p>
                  <p className="text-white font-black text-2xl">{stats.coins.toLocaleString()} <span className="text-lg">🪙</span></p>
                </div>
                <div className="text-right">
                  <p className="text-white/40 text-xs">Est. value</p>
                  <p className="text-amber-400 font-black text-xl">₹{estimatedInr}</p>
                </div>
              </div>

              {/* Rate guide */}
              <div className="bg-blue-50 border border-blue-100 rounded-2xl px-4 py-3 flex items-start gap-2.5">
                <Info size={15} className="text-blue-500 flex-shrink-0 mt-0.5" />
                <div className="text-xs text-blue-700">
                  <span className="font-black">Conversion Rates: </span>
                  PhonePe & UPI: 5k🪙=₹1k &nbsp;·&nbsp; Card & Bank: 10k🪙=₹1k &nbsp;·&nbsp; Crypto: 5k🪙=₹2k
                </div>
              </div>

              <p className="text-xs font-black text-gray-400 uppercase tracking-widest px-1">Choose a withdrawal method</p>

              {/* Method Cards */}
              <div className="space-y-3">
                {PAYMENT_METHODS.map((method) => {
                  const can = stats.coins >= method.minCoins;
                  const need = method.minCoins - stats.coins;
                  const pct = Math.min((stats.coins / method.minCoins) * 100, 100);
                  return (
                    <button
                      key={method.id}
                      onClick={() => can && handleMethodSelect(method)}
                      disabled={!can}
                      className={`w-full text-left rounded-2xl border-2 p-4 transition-all duration-200 group ${
                        can
                          ? 'border-gray-100 bg-white hover:border-amber-300 hover:shadow-xl hover:shadow-amber-50 cursor-pointer active:scale-[.99]'
                          : 'border-gray-100 bg-gray-50/50 cursor-not-allowed'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        {/* Icon */}
                        <div
                          className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg flex-shrink-0 transition-transform group-hover:scale-105"
                          style={{ background: method.gradient }}
                        >
                          {method.icon}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                            <span className={`font-black text-base ${can ? 'text-gray-800' : 'text-gray-400'}`}>{method.name}</span>
                            <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${method.tagColor}`}>{method.tag}</span>
                          </div>
                          <p className={`text-xs font-semibold mb-2 ${can ? 'text-gray-500' : 'text-gray-400'}`}>{method.desc}</p>
                          {/* Progress bar */}
                          <div className="w-full bg-gray-200 rounded-full h-1.5">
                            <div className="h-1.5 rounded-full transition-all" style={{ width: `${pct}%`, background: method.gradient }} />
                          </div>
                          {!can && (
                            <p className="text-xs text-red-400 mt-1 flex items-center gap-1 font-semibold">
                              <Lock size={10} /> Need {need.toLocaleString()} more coins
                            </p>
                          )}
                        </div>

                        {/* Right */}
                        <div className="flex flex-col items-end flex-shrink-0 gap-1">
                          <div className="bg-gray-50 rounded-xl px-3 py-2 text-right">
                            <p className="text-[10px] text-gray-400">Min</p>
                            <p className="text-sm font-black text-gray-700">{method.minCoins.toLocaleString()} 🪙</p>
                            <p className="text-xs font-black text-emerald-600">= ₹{(method.minCoins * method.inrPerCoin).toFixed(0)}</p>
                          </div>
                          <ChevronRight size={15} className={`transition-all ${can ? 'text-gray-300 group-hover:text-amber-400 group-hover:translate-x-0.5' : 'text-gray-200'}`} />
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── STEP 2: DETAILS ── */}
          {step === 'details' && selectedMethod && (
            <div className="space-y-4">
              <button onClick={() => setStep('method')} className="flex items-center gap-1 text-sm text-gray-400 hover:text-gray-700 transition font-bold">
                <ChevronLeft size={16} /> Back to methods
              </button>

              {/* Method Banner */}
              <div className="rounded-2xl p-5 text-white flex items-center gap-4 shadow-xl" style={{ background: selectedMethod.gradient }}>
                <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center flex-shrink-0">
                  {selectedMethod.icon}
                </div>
                <div>
                  <p className="font-black text-xl">{selectedMethod.name}</p>
                  <p className="text-white/70 text-sm">{selectedMethod.desc}</p>
                  <span className="mt-1 inline-block bg-white/20 text-white text-xs px-2.5 py-0.5 rounded-full font-semibold">{selectedMethod.tag}</span>
                </div>
              </div>

              {/* Amount Card */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
                <p className="font-black text-gray-700 text-sm">Coin Amount</p>

                {/* Input */}
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl pointer-events-none select-none">🪙</span>
                  <input
                    type="number"
                    value={coinAmount}
                    onChange={(e) => {
                      setCoinAmount(e.target.value);
                      if (errors.amount) setErrors((p) => { const n = { ...p }; delete n.amount; return n; });
                    }}
                    placeholder={`Min ${selectedMethod.minCoins.toLocaleString()}`}
                    className={`w-full pl-14 pr-4 py-4 border-2 rounded-2xl font-black text-gray-800 text-2xl focus:outline-none transition ${
                      errors.amount ? 'border-red-400 bg-red-50' : 'border-gray-200 focus:border-amber-400 bg-gray-50 focus:bg-white'
                    }`}
                  />
                </div>
                {errors.amount && (
                  <p className="text-red-500 text-xs flex items-center gap-1 font-semibold">
                    <AlertCircle size={12} /> {errors.amount}
                  </p>
                )}

                {/* Presets */}
                <div className="flex gap-2 flex-wrap">
                  {COIN_PRESETS.filter((p) => p >= selectedMethod.minCoins && p <= stats.coins).map((p) => (
                    <button
                      key={p}
                      onClick={() => { setCoinAmount(String(p)); if (errors.amount) setErrors((prev) => { const n = { ...prev }; delete n.amount; return n; }); }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-black border-2 transition-all ${
                        coinAmount === String(p) ? 'border-amber-500 bg-amber-50 text-amber-600' : 'border-gray-200 text-gray-500 hover:border-amber-300 bg-white'
                      }`}
                    >
                      {p.toLocaleString()} 🪙
                    </button>
                  ))}
                  {stats.coins >= selectedMethod.minCoins && (
                    <button
                      onClick={() => setCoinAmount(String(stats.coins))}
                      className="px-3 py-1.5 rounded-xl text-xs font-black border-2 border-gray-200 text-gray-500 hover:border-amber-300 bg-white transition-all"
                    >
                      MAX
                    </button>
                  )}
                </div>

                {/* INR Preview */}
                {coins >= selectedMethod.minCoins && (
                  <div className="rounded-2xl p-4 text-white flex items-center justify-between" style={{ background: selectedMethod.gradient }}>
                    <div>
                      <p className="text-white/60 text-xs font-medium">You will receive</p>
                      <p className="text-4xl font-black">₹{inrValue.toFixed(2)}</p>
                    </div>
                    <div className="text-right opacity-70 text-sm">
                      <p>{coins.toLocaleString()} 🪙</p>
                      <p>@ ₹{selectedMethod.inrPerCoin}/coin</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Payment Details Form */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-5">
                <div className="flex items-center gap-2">
                  <ShieldCheck size={16} className="text-emerald-500" />
                  <h4 className="font-black text-gray-800 text-sm">Payment Details</h4>
                  <span className="ml-auto text-xs text-gray-400 flex items-center gap-1"><ShieldCheck size={10} className="text-emerald-400" /> 256-bit SSL</span>
                </div>

                {/* Credit Card Visual Preview */}
                {selectedMethod.id === 'creditcard' && (
                  <div className="rounded-2xl p-5 text-white relative overflow-hidden select-none" style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #4338ca 60%, #6d28d9 100%)', minHeight: 170 }}>
                    <div className="absolute -right-6 -top-6 w-32 h-32 bg-white/10 rounded-full" />
                    <div className="absolute -left-4 -bottom-10 w-24 h-24 bg-white/10 rounded-full" />
                    <div className="absolute right-10 bottom-6 w-16 h-16 bg-white/5 rounded-full" />
                    <div className="relative z-10 flex flex-col gap-4">
                      <div className="flex justify-between items-start">
                        <div className="w-11 h-8 bg-gradient-to-br from-yellow-300 to-yellow-500 rounded-md shadow" />
                        <div className="flex items-center -space-x-2">
                          <div className="w-8 h-8 rounded-full bg-red-400/80" />
                          <div className="w-8 h-8 rounded-full bg-orange-400/80" />
                        </div>
                      </div>
                      <p className="font-mono text-xl tracking-[4px] text-white/90">
                        {formData['cardNumber'] || '•••• •••• •••• ••••'}
                      </p>
                      <div className="flex justify-between items-end">
                        <div>
                          <p className="text-white/40 text-[10px] uppercase tracking-widest mb-0.5">Card Holder</p>
                          <p className="font-black uppercase tracking-wide text-sm">{formData['cardName'] || 'YOUR NAME'}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-white/40 text-[10px] uppercase tracking-widest mb-0.5">Expires</p>
                          <p className="font-black text-sm">{formData['expiry'] || 'MM/YY'}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* UPI / PhonePe live preview */}
                {(selectedMethod.id === 'upi' || selectedMethod.id === 'phonepe') && (
                  <div className={`rounded-xl px-4 py-3 border flex items-center gap-3 ${selectedMethod.bgLight} ${selectedMethod.borderColor}`}>
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: selectedMethod.gradient }}>
                      {selectedMethod.icon}
                    </div>
                    <div>
                      <p className="font-black text-gray-800 text-sm">{selectedMethod.name}</p>
                      <p className="text-gray-400 text-xs font-mono">
                        {selectedMethod.id === 'phonepe'
                          ? (formData['phone'] ? `+91 ${formData['phone']}` : '+91 __________')
                          : (formData['upiId'] || 'yourname@upi')}
                      </p>
                    </div>
                    <div className="ml-auto">
                      <ShieldCheck size={16} className="text-emerald-500" />
                    </div>
                  </div>
                )}

                {/* Crypto warning */}
                {selectedMethod.id === 'crypto' && (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-start gap-2">
                    <AlertCircle size={15} className="text-red-500 flex-shrink-0 mt-0.5" />
                    <p className="text-red-700 text-xs font-semibold">Double-check your wallet address and network. Incorrect details will result in permanent loss of funds.</p>
                  </div>
                )}

                {/* Fields */}
                {selectedMethod.fields.map((field) => (
                  <div key={field.id}>
                    <label className="block text-sm font-black text-gray-700 mb-1.5">{field.label}</label>
                    <div className="relative">
                      <input
                        type={field.id === 'cvv' ? (showCvv ? 'text' : 'password') : field.type}
                        value={formData[field.id] || ''}
                        onChange={(e) => handleFieldChange(field.id, e.target.value)}
                        placeholder={field.placeholder}
                        maxLength={field.maxLength}
                        className={`w-full px-4 py-3.5 border-2 rounded-xl text-gray-700 font-semibold text-sm focus:outline-none transition ${
                          errors[field.id]
                            ? 'border-red-400 bg-red-50 focus:border-red-500'
                            : 'border-gray-200 focus:border-amber-400 bg-gray-50 focus:bg-white'
                        }`}
                      />
                      {field.id === 'cvv' && (
                        <button
                          type="button"
                          onClick={() => setShowCvv(!showCvv)}
                          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          {showCvv ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      )}
                    </div>
                    {errors[field.id] && (
                      <p className="text-red-500 text-xs mt-1 flex items-center gap-1 font-semibold">
                        <AlertCircle size={11} /> {errors[field.id]}
                      </p>
                    )}
                    {field.hint && !errors[field.id] && (
                      <p className="text-gray-400 text-xs mt-1">{field.hint}</p>
                    )}
                  </div>
                ))}
              </div>

              {/* CTA */}
              <button
                onClick={handleDetailsNext}
                className="w-full text-white font-black py-4 rounded-2xl shadow-xl transition-all active:scale-95 flex items-center justify-center gap-2 text-base"
                style={{ background: selectedMethod.gradient }}
              >
                Review Withdrawal <ChevronRight size={18} />
              </button>
            </div>
          )}

          {/* ── STEP 3: CONFIRM ── */}
          {step === 'confirm' && selectedMethod && (
            <div className="space-y-4">
              <button onClick={() => setStep('details')} className="flex items-center gap-1 text-sm text-gray-400 hover:text-gray-700 transition font-bold">
                <ChevronLeft size={16} /> Edit details
              </button>

              <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 space-y-5">
                <h3 className="font-black text-gray-900 text-xl">Confirm Withdrawal</h3>

                {/* Amount hero */}
                <div className="rounded-2xl p-6 text-white text-center relative overflow-hidden" style={{ background: selectedMethod.gradient }}>
                  <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 20% 80%, white, transparent 60%)' }} />
                  <div className="relative z-10">
                    <div className="flex items-center justify-center gap-3 mb-3">
                      <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center">
                        {selectedMethod.icon}
                      </div>
                      <span className="font-black text-xl">{selectedMethod.name}</span>
                    </div>
                    <p className="text-white/60 text-sm">You will receive</p>
                    <p className="text-6xl font-black tracking-tight my-1">₹{inrValue.toFixed(2)}</p>
                    <p className="text-white/60 text-sm">{coins.toLocaleString()} 🪙 coins</p>
                  </div>
                </div>

                {/* Detail rows */}
                <div className="rounded-2xl border border-gray-100 overflow-hidden">
                  {[
                    { label: 'Payment Method', value: selectedMethod.name, icon: null },
                    { label: 'Account / ID', value: getMaskedDetail(), mono: true },
                    { label: 'Transfer Speed', value: selectedMethod.speed, icon: <Clock size={12} /> },
                    { label: 'Coins Deducted', value: `−${coins.toLocaleString()} 🪙`, color: 'text-red-500' },
                    { label: 'INR Credited', value: `₹${inrValue.toFixed(2)}`, color: 'text-emerald-600 font-black' },
                    { label: 'Balance After', value: `${(stats.coins - coins).toLocaleString()} 🪙`, color: 'text-gray-700' },
                  ].map((row, i) => (
                    <div key={i} className="flex justify-between items-center px-4 py-3.5 border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
                      <span className="text-gray-500 text-sm">{row.label}</span>
                      <span className={`font-black text-sm text-right ${(row as any).color || 'text-gray-800'} ${(row as any).mono ? 'font-mono' : ''}`}>
                        {row.value}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Notice */}
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-2.5">
                  <Info size={15} className="text-amber-500 flex-shrink-0 mt-0.5" />
                  <p className="text-amber-700 text-xs font-semibold">
                    {selectedMethod.id === 'bank' ? 'Bank NEFT transfers take 1–2 business days.' :
                     selectedMethod.id === 'crypto' ? 'Crypto may take up to 24h. Verify address carefully.' :
                     selectedMethod.id === 'creditcard' ? 'Card refunds take 1–3 business days.' :
                     'Instant transfers usually complete within minutes.'}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                  <button
                    onClick={() => setStep('details')}
                    className="flex-1 border-2 border-gray-200 text-gray-600 font-black py-4 rounded-2xl hover:bg-gray-50 transition text-sm"
                  >
                    ← Back
                  </button>
                  <button
                    onClick={handleConfirm}
                    className="flex-1 text-white font-black py-4 rounded-2xl shadow-xl transition-all active:scale-95 flex items-center justify-center gap-2 text-sm"
                    style={{ background: selectedMethod.gradient }}
                  >
                    <ShieldCheck size={16} /> Confirm
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── STEP 4: SUCCESS ── */}
          {step === 'success' && selectedMethod && (
            <div className="space-y-4 animate-bounce-once">
              <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-8 space-y-6 text-center">

                {/* Big checkmark */}
                <div className="flex flex-col items-center gap-4">
                  <div className="relative">
                    <div className="w-28 h-28 rounded-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #d1fae5, #a7f3d0)' }}>
                      <CheckCircle2 size={64} className="text-emerald-500" strokeWidth={1.5} />
                    </div>
                    <div className="absolute -bottom-2 -right-2 w-10 h-10 rounded-full bg-amber-400 flex items-center justify-center shadow-lg text-xl animate-bounce">
                      🪙
                    </div>
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-gray-900">Withdrawal Submitted!</h3>
                    <p className="text-gray-400 text-sm mt-1">Your request is being processed securely</p>
                  </div>
                </div>

                {/* Summary */}
                <div className="rounded-2xl p-5 text-white text-left space-y-3" style={{ background: selectedMethod.gradient }}>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">{selectedMethod.icon}</div>
                    <div>
                      <p className="font-black">{selectedMethod.name}</p>
                      <p className="text-white/60 text-xs font-mono">{getMaskedDetail()}</p>
                    </div>
                    <div className="ml-auto">
                      <span className={`text-xs px-2.5 py-1 rounded-full font-bold ${selectedMethod.tagColor}`}>{selectedMethod.tag}</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-white/15 rounded-xl p-3">
                      <p className="text-white/60 text-xs">Coins</p>
                      <p className="text-white font-black text-xl">{coins.toLocaleString()} 🪙</p>
                    </div>
                    <div className="bg-white/15 rounded-xl p-3">
                      <p className="text-white/60 text-xs">Amount</p>
                      <p className="text-white font-black text-xl">₹{inrValue.toFixed(2)}</p>
                    </div>
                  </div>
                </div>

                {/* Tx Reference */}
                <div className="bg-gray-50 rounded-2xl px-5 py-4 flex items-center justify-between border border-gray-100">
                  <div className="text-left">
                    <p className="text-xs text-gray-400 mb-0.5">Transaction Reference</p>
                    <p className="text-sm font-black font-mono text-gray-800">{txRef}</p>
                  </div>
                  <button
                    onClick={handleCopy}
                    className={`flex items-center gap-1.5 text-xs font-black px-3 py-2 rounded-xl border transition-all ${
                      copied ? 'bg-emerald-50 border-emerald-200 text-emerald-600' : 'bg-amber-50 border-amber-200 text-amber-600 hover:bg-amber-100'
                    }`}
                  >
                    {copied ? <><Check size={13} /> Copied!</> : <><Copy size={13} /> Copy</>}
                  </button>
                </div>

                {/* Info */}
                <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-start gap-3 text-left">
                  <ShieldCheck size={18} className="text-emerald-500 flex-shrink-0 mt-0.5" />
                  <p className="text-emerald-700 text-xs font-semibold leading-relaxed">
                    {coins.toLocaleString()} coins deducted · ₹{inrValue.toFixed(2)} will be credited to your {selectedMethod.name} account {
                      selectedMethod.id === 'bank' ? 'in 1–2 business days' :
                      selectedMethod.id === 'crypto' ? 'within 24 hours' :
                      selectedMethod.id === 'creditcard' ? 'in 1–3 business days' : 'within minutes'
                    }.
                  </p>
                </div>

                <button
                  onClick={handleReset}
                  className="w-full bg-gradient-to-r from-amber-500 to-orange-500 text-white font-black py-4 rounded-2xl shadow-lg hover:from-amber-600 hover:to-orange-600 active:scale-95 transition-all"
                >
                  Back to Wallet
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════
          VIEW: HISTORY
      ═══════════════════════════════════════════════════════ */}
      {view === 'history' && (
        <div className="space-y-4 animate-slide-up">

          {/* Summary bar */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-3.5 text-center">
              <p className="text-emerald-500 text-xs font-semibold mb-1">Total Earned</p>
              <p className="text-emerald-700 font-black text-lg">+{totalEarned.toLocaleString()}</p>
              <p className="text-emerald-400 text-xs">🪙 coins</p>
            </div>
            <div className="bg-red-50 border border-red-100 rounded-2xl p-3.5 text-center">
              <p className="text-red-400 text-xs font-semibold mb-1">Withdrawn</p>
              <p className="text-red-500 font-black text-lg">-{totalWithdrawn.toLocaleString()}</p>
              <p className="text-red-300 text-xs">🪙 coins</p>
            </div>
            <div className="bg-gray-50 border border-gray-100 rounded-2xl p-3.5 text-center">
              <p className="text-gray-400 text-xs font-semibold mb-1">Transactions</p>
              <p className="text-gray-700 font-black text-lg">{transactions.length}</p>
              <p className="text-gray-400 text-xs">total</p>
            </div>
          </div>

          {/* Search + Filter */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
            {/* Search */}
            <div className="relative">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchQ}
                onChange={(e) => setSearchQ(e.target.value)}
                placeholder="Search transactions..."
                className="w-full pl-9 pr-9 py-2.5 border-2 border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:border-amber-400 transition bg-gray-50"
              />
              {searchQ && (
                <button onClick={() => setSearchQ('')} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  <X size={15} />
                </button>
              )}
            </div>

            {/* Filter pills */}
            <div className="flex gap-2">
              {([
                { id: 'all', label: 'All', count: transactions.length },
                { id: 'earn', label: '↓ Earned', count: earnTx.length },
                { id: 'withdraw', label: '↑ Withdrawn', count: withdrawTx.length },
              ] as { id: FilterType; label: string; count: number }[]).map((f) => (
                <button
                  key={f.id}
                  onClick={() => setFilter(f.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black border-2 transition-all ${
                    filter === f.id
                      ? 'border-amber-400 bg-amber-50 text-amber-700'
                      : 'border-gray-200 text-gray-500 bg-white hover:border-gray-300'
                  }`}
                >
                  {f.label}
                  <span className={`rounded-full px-1.5 py-0.5 text-[10px] ${filter === f.id ? 'bg-amber-200 text-amber-700' : 'bg-gray-100 text-gray-500'}`}>
                    {f.count}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Transaction List */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            {filteredTx.length === 0 ? (
              <div className="py-12 flex flex-col items-center gap-3">
                <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center">
                  <BarChart3 size={24} className="text-gray-300" />
                </div>
                <p className="text-gray-500 font-semibold">No transactions found</p>
                <p className="text-gray-400 text-sm text-center">
                  {transactions.length === 0 ? 'Complete tasks to start earning coins' : 'Try adjusting your search or filter'}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {filteredTx.map((tx) => (
                  <div
                    key={tx.id}
                    className="flex items-center gap-3.5 px-4 py-3.5 hover:bg-gray-50/50 transition-colors"
                  >
                    {/* Icon */}
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      tx.type === 'earn' ? 'bg-emerald-100' : 'bg-red-100'
                    }`}>
                      {tx.type === 'earn'
                        ? <ArrowDownCircle size={18} className="text-emerald-500" />
                        : <ArrowUpCircle size={18} className="text-red-400" />}
                    </div>

                    {/* Details */}
                    <div className="flex-1 min-w-0">
                      <p className="text-gray-800 text-sm font-semibold truncate">{tx.source}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                          tx.type === 'earn' ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-500'
                        }`}>
                          {tx.type === 'earn' ? 'EARNED' : 'WITHDRAWN'}
                        </span>
                        <span className="text-gray-400 text-xs">{tx.date}</span>
                      </div>
                    </div>

                    {/* Amount */}
                    <div className="text-right flex-shrink-0">
                      <span className={`text-sm font-black ${tx.type === 'earn' ? 'text-emerald-500' : 'text-red-400'}`}>
                        {tx.type === 'earn' ? '+' : '−'}{tx.amount}
                      </span>
                      <p className="text-xs text-gray-400">🪙</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer note */}
          {filteredTx.length > 0 && (
            <p className="text-center text-gray-400 text-xs py-2">
              Showing {filteredTx.length} of {transactions.length} transactions
            </p>
          )}
        </div>
      )}
    </div>
  );
};
