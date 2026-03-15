import React, { useState, useMemo } from 'react';
import { Transaction, UserStats } from '../types';
import { AdminConfig } from '../lib/adminConfig';
import {
  ArrowDownCircle, ArrowUpCircle, ChevronRight, ChevronLeft,
  CheckCircle2, ShieldCheck,
  Eye, EyeOff, Copy, Check, TrendingUp, TrendingDown,
  Search, X, Info, Smartphone, Zap,
  Clock, AlertCircle, Lock, Wallet, BarChart3,
  History, Star, ArrowRight, RefreshCw, BadgeCheck,
} from 'lucide-react';

interface WalletPageProps {
  stats: UserStats;
  transactions: Transaction[];
  onWithdraw: (amount: number, method: string) => void;
  config?: AdminConfig;
}

type WalletTab = 'overview' | 'withdraw' | 'history';
type Step = 'method' | 'details' | 'confirm' | 'success';
type FilterType = 'all' | 'earn' | 'withdraw';

interface PaymentMethod {
  id: string;
  name: string;
  shortName: string;
  tagline: string;
  logo: React.ReactNode;
  accentColor: string;
  accentLight: string;
  gradient: string;
  bgCard: string;
  borderAccent: string;
  textAccent: string;
  minCoins: number;
  inrPerCoin: number;
  speedLabel: string;
  speedIcon: React.ReactNode;
  rateLabel: string;
  fields: FormField[];
}

interface FormField {
  id: string;
  label: string;
  placeholder: string;
  type: string;
  maxLength?: number;
  hint?: string;
  prefix?: string;
}

/* ─── Payment Methods ─────────────────────────────────────── */
const METHODS: PaymentMethod[] = [
  {
    id: 'phonepe',
    name: 'PhonePe',
    shortName: 'PhonePe',
    tagline: 'India\'s #1 Payments App',
    logo: (
      <svg viewBox="0 0 56 56" className="w-full h-full" fill="none">
        <circle cx="28" cy="28" r="28" fill="#5F259F"/>
        <path d="M28 10C18.06 10 10 18.06 10 28s8.06 18 18 18 18-8.06 18-18S37.94 10 28 10zm7 22.5h-4.5v3.5a1.5 1.5 0 01-1.5 1.5H25v-5h-4V26c0-3.87 3.13-7 7-7h4c2.21 0 4 1.79 4 4v9.5z" fill="white"/>
      </svg>
    ),
    accentColor: '#5F259F',
    accentLight: '#f3e8ff',
    gradient: 'linear-gradient(135deg, #5F259F 0%, #7c3aed 50%, #9333ea 100%)',
    bgCard: 'bg-purple-50',
    borderAccent: 'border-purple-300',
    textAccent: 'text-purple-700',
    minCoins: 5000,
    inrPerCoin: 0.20,
    speedLabel: 'Instant',
    speedIcon: <Zap size={11} className="text-emerald-500" />,
    rateLabel: '5,000 🪙 = ₹1,000',
    fields: [
      { id: 'phone', label: 'Registered Mobile Number', placeholder: '9876543210', type: 'tel', maxLength: 10, hint: '10-digit PhonePe registered number', prefix: '+91' },
      { id: 'name', label: 'Account Holder Name', placeholder: 'Full name on PhonePe', type: 'text' },
    ],
  },
  {
    id: 'upi',
    name: 'UPI Transfer',
    shortName: 'UPI',
    tagline: 'Universal Payments Interface',
    logo: (
      <svg viewBox="0 0 56 56" className="w-full h-full" fill="none">
        <circle cx="28" cy="28" r="28" fill="#097939"/>
        <text x="50%" y="48%" dominantBaseline="middle" textAnchor="middle" fill="white" fontSize="12" fontWeight="900" fontFamily="Arial, sans-serif">UPI</text>
        <path d="M14 40 L28 18 L42 40" stroke="white" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" opacity="0.5"/>
      </svg>
    ),
    accentColor: '#097939',
    accentLight: '#f0fdf4',
    gradient: 'linear-gradient(135deg, #064e2a 0%, #097939 50%, #16a34a 100%)',
    bgCard: 'bg-green-50',
    borderAccent: 'border-green-300',
    textAccent: 'text-green-700',
    minCoins: 5000,
    inrPerCoin: 0.20,
    speedLabel: 'Instant',
    speedIcon: <Zap size={11} className="text-emerald-500" />,
    rateLabel: '5,000 🪙 = ₹1,000',
    fields: [
      { id: 'upiId', label: 'UPI ID', placeholder: 'yourname@okaxis', type: 'text', hint: 'e.g. name@okaxis · name@ybl · name@paytm' },
      { id: 'name', label: 'Account Holder Name', placeholder: 'Full name linked to UPI', type: 'text' },
    ],
  },
  {
    id: 'creditcard',
    name: 'Credit / Debit Card',
    shortName: 'Card',
    tagline: 'Visa · Mastercard · RuPay',
    logo: (
      <svg viewBox="0 0 56 56" className="w-full h-full" fill="none">
        <circle cx="28" cy="28" r="28" fill="#1d4ed8"/>
        <rect x="12" y="18" width="32" height="20" rx="3" stroke="white" strokeWidth="2" fill="none"/>
        <path d="M12 23h32" stroke="white" strokeWidth="2"/>
        <rect x="16" y="27" width="8" height="2" rx="1" fill="white" opacity="0.7"/>
        <rect x="16" y="31" width="12" height="2" rx="1" fill="white" opacity="0.4"/>
        <circle cx="39" cy="29" r="4" fill="#ef4444" opacity="0.9"/>
        <circle cx="35" cy="29" r="4" fill="#fbbf24" opacity="0.9"/>
      </svg>
    ),
    accentColor: '#1d4ed8',
    accentLight: '#eff6ff',
    gradient: 'linear-gradient(135deg, #1e3a8a 0%, #1d4ed8 50%, #6366f1 100%)',
    bgCard: 'bg-blue-50',
    borderAccent: 'border-blue-300',
    textAccent: 'text-blue-700',
    minCoins: 10000,
    inrPerCoin: 0.10,
    speedLabel: '1–3 Days',
    speedIcon: <Clock size={11} className="text-blue-500" />,
    rateLabel: '10,000 🪙 = ₹1,000',
    fields: [
      { id: 'cardNumber', label: 'Card Number', placeholder: 'XXXX  XXXX  XXXX  XXXX', type: 'text', maxLength: 19 },
      { id: 'cardName', label: 'Cardholder Name', placeholder: 'Name on card', type: 'text' },
      { id: 'expiry', label: 'Expiry', placeholder: 'MM/YY', type: 'text', maxLength: 5 },
      { id: 'cvv', label: 'CVV', placeholder: '•••', type: 'password', maxLength: 3, hint: '3-digit code on back' },
    ],
  },
  {
    id: 'bank',
    name: 'Bank Transfer',
    shortName: 'Bank',
    tagline: 'NEFT · IMPS · RTGS',
    logo: (
      <svg viewBox="0 0 56 56" className="w-full h-full" fill="none">
        <circle cx="28" cy="28" r="28" fill="#ea580c"/>
        <path d="M14 38h28M14 26h28M16 26V38M22 26V38M28 26V38M34 26V38M40 26V38M11 26l17-10 17 10" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    accentColor: '#ea580c',
    accentLight: '#fff7ed',
    gradient: 'linear-gradient(135deg, #9a3412 0%, #ea580c 50%, #f97316 100%)',
    bgCard: 'bg-orange-50',
    borderAccent: 'border-orange-300',
    textAccent: 'text-orange-700',
    minCoins: 10000,
    inrPerCoin: 0.10,
    speedLabel: '1–2 Days',
    speedIcon: <Clock size={11} className="text-orange-500" />,
    rateLabel: '10,000 🪙 = ₹1,000',
    fields: [
      { id: 'accountNo', label: 'Account Number', placeholder: 'Enter account number', type: 'text', maxLength: 18 },
      { id: 'confirmAccountNo', label: 'Confirm Account Number', placeholder: 'Re-enter account number', type: 'text', maxLength: 18 },
      { id: 'ifsc', label: 'IFSC Code', placeholder: 'HDFC0001234', type: 'text', maxLength: 11, hint: '11-character branch code' },
      { id: 'name', label: 'Account Holder Name', placeholder: 'Name as per bank records', type: 'text' },
    ],
  },
  {
    id: 'crypto',
    name: 'Crypto Wallet',
    shortName: 'Crypto',
    tagline: 'BTC · ETH · USDT · BNB',
    logo: (
      <svg viewBox="0 0 56 56" className="w-full h-full" fill="none">
        <circle cx="28" cy="28" r="28" fill="#d97706"/>
        <path d="M34 22c0-2.2-1.8-4-4-4h-6v8h6c2.2 0 4-1.8 4-4zM34 30c0-2.2-1.8-4-4-4h-6v8h6c2.2 0 4-1.8 4-4z" fill="white"/>
        <path d="M22 18v2M22 34v2M25 16v3M25 37v3" stroke="white" strokeWidth="2" strokeLinecap="round"/>
      </svg>
    ),
    accentColor: '#d97706',
    accentLight: '#fffbeb',
    gradient: 'linear-gradient(135deg, #92400e 0%, #d97706 50%, #f59e0b 100%)',
    bgCard: 'bg-amber-50',
    borderAccent: 'border-amber-300',
    textAccent: 'text-amber-700',
    minCoins: 5000,
    inrPerCoin: 0.40,
    speedLabel: 'Up to 24h',
    speedIcon: <Clock size={11} className="text-amber-500" />,
    rateLabel: '5,000 🪙 = ₹2,000',
    fields: [
      { id: 'wallet', label: 'Wallet Address', placeholder: 'Enter crypto wallet address', type: 'text', hint: 'BTC / ETH / USDT — verify carefully' },
      { id: 'network', label: 'Network / Chain', placeholder: 'e.g. BTC · ETH · TRC20 · BEP20', type: 'text', hint: '⚠️ Wrong network = permanent loss' },
    ],
  },
];

const PRESETS = [5000, 10000, 15000, 20000, 50000];
const LEVELS = ['Beginner', 'Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond', 'Legend'];
const LEVEL_COLORS = ['#94a3b8','#cd7f32','#9ca3af','#f59e0b','#6366f1','#06b6d4','#ec4899'];

function formatCardNumber(v: string) {
  return v.replace(/\D/g,'').slice(0,16).replace(/(.{4})/g,'$1 ').trim();
}
function formatExpiry(v: string) {
  const d = v.replace(/\D/g,'').slice(0,4);
  return d.length >= 2 ? d.slice(0,2)+'/'+d.slice(2) : d;
}
function maskDetail(m: PaymentMethod, fd: Record<string,string>) {
  if (m.id==='phonepe') { const v=fd.phone||''; return v?'+91 '+v.slice(0,2)+'•••••'+v.slice(-3):'—'; }
  if (m.id==='upi') { const v=fd.upiId||''; const p=v.split('@'); return v?p[0].slice(0,3)+'•••@'+(p[1]||''):'—'; }
  if (m.id==='creditcard') { const cn=(fd.cardNumber||'').replace(/\s/g,''); return cn?'•••• •••• •••• '+cn.slice(-4):'—'; }
  if (m.id==='bank') { const a=fd.accountNo||''; return a?a.slice(0,2)+'•'.repeat(Math.max(0,a.length-4))+a.slice(-2):'—'; }
  if (m.id==='crypto') { const w=fd.wallet||''; return w?w.slice(0,6)+'....'+w.slice(-4):'—'; }
  return '—';
}

/* ─── Main Component ──────────────────────────────────────── */
export const WalletPage: React.FC<WalletPageProps> = ({ stats, transactions, onWithdraw, config }) => {
  const [tab, setTab] = useState<WalletTab>('overview');
  const [step, setStep] = useState<Step>('method');
  const [method, setMethod] = useState<PaymentMethod | null>(null);
  const [coinAmt, setCoinAmt] = useState('');
  const [formData, setFormData] = useState<Record<string,string>>({});
  const [errors, setErrors] = useState<Record<string,string>>({});
  const [showCvv, setShowCvv] = useState(false);
  const [copied, setCopied] = useState(false);
  const [txRef] = useState(() => 'CE'+Math.random().toString(36).slice(2,11).toUpperCase());
  const [filter, setFilter] = useState<FilterType>('all');
  const [searchQ, setSearchQ] = useState('');

  const earnTx = useMemo(() => transactions.filter(t=>t.type==='earn'), [transactions]);
  const withdrawTx = useMemo(() => transactions.filter(t=>t.type==='withdraw'), [transactions]);
  const totalEarned = useMemo(() => earnTx.reduce((s,t)=>s+t.amount,0), [earnTx]);
  const totalWithdrawn = useMemo(() => withdrawTx.reduce((s,t)=>s+t.amount,0), [withdrawTx]);

  // Apply admin config overrides to methods
  const activeMethods = METHODS.map(m => {
    if (!config) return m;
    const enabledMap: Record<string, boolean> = {
      phonepe: config.withdraw_phonepe_enabled ?? true,
      upi: config.withdraw_upi_enabled ?? true,
      creditcard: config.withdraw_card_enabled ?? true,
      bank: config.withdraw_bank_enabled ?? true,
      crypto: config.withdraw_crypto_enabled ?? true,
    };
    const minMap: Record<string, number> = {
      phonepe: config.withdraw_phonepe_min ?? m.minCoins,
      upi: config.withdraw_upi_min ?? m.minCoins,
      creditcard: config.withdraw_card_min ?? m.minCoins,
      bank: config.withdraw_bank_min ?? m.minCoins,
      crypto: config.withdraw_crypto_min ?? m.minCoins,
    };
    return { ...m, minCoins: minMap[m.id] ?? m.minCoins, enabled: enabledMap[m.id] ?? true };
  }).filter(m => (m as any).enabled !== false);

  const coins = parseInt(coinAmt)||0;
  const inrVal = method ? coins * method.inrPerCoin : 0;
  const lvlIdx = Math.min(stats.level, LEVELS.length-1);
  const xpPct = Math.min((stats.xp % 100), 100);

  const filteredTx = useMemo(()=>{
    return [...transactions].reverse()
      .filter(t=> filter==='all' || t.type===filter)
      .filter(t=> searchQ==='' || t.source.toLowerCase().includes(searchQ.toLowerCase()));
  },[transactions, filter, searchQ]);

  /* validation */
  const validate = () => {
    const e: Record<string,string> = {};
    const c = parseInt(coinAmt);
    if (!coinAmt||isNaN(c)) e.amount='Enter a valid coin amount.';
    else if (method && c < method.minCoins) e.amount=`Minimum ${method.minCoins.toLocaleString()} coins required.`;
    else if (c > stats.coins) e.amount=`Insufficient balance. You have ${stats.coins.toLocaleString()} coins.`;
    method?.fields.forEach(f=>{
      const v=formData[f.id]||'';
      if (!v.trim()) e[f.id]=`${f.label} is required.`;
      else if (f.id==='cardNumber'&&v.replace(/\s/g,'').length<16) e[f.id]='Enter valid 16-digit card number.';
      else if (f.id==='expiry'&&!/^\d{2}\/\d{2}$/.test(v)) e[f.id]='Enter valid expiry (MM/YY).';
      else if (f.id==='cvv'&&v.length<3) e[f.id]='Enter valid 3-digit CVV.';
      else if (f.id==='phone'&&!/^\d{10}$/.test(v)) e[f.id]='Enter valid 10-digit number.';
      else if (f.id==='upiId'&&!v.includes('@')) e[f.id]='Enter valid UPI ID (e.g. name@upi).';
      else if (f.id==='ifsc'&&v.length!==11) e[f.id]='IFSC must be exactly 11 characters.';
      else if (f.id==='confirmAccountNo'&&v!==formData.accountNo) e[f.id]='Account numbers do not match.';
    });
    setErrors(e);
    return Object.keys(e).length===0;
  };

  const handleField = (id: string, value: string) => {
    let v = value;
    if (id==='cardNumber') v=formatCardNumber(value);
    if (id==='expiry') v=formatExpiry(value);
    if (id==='ifsc') v=value.toUpperCase().slice(0,11);
    if (id==='phone') v=value.replace(/\D/g,'').slice(0,10);
    setFormData(p=>({...p,[id]:v}));
    if (errors[id]) setErrors(p=>{const n={...p};delete n[id];return n;});
  };

  const selectMethod = (m: PaymentMethod) => {
    setMethod(m); setFormData({}); setErrors({}); setCoinAmt(''); setStep('details');
  };
  const toConfirm = () => { if(validate()) setStep('confirm'); };
  const doWithdraw = () => { if(!method) return; onWithdraw(coins, method.name); setStep('success'); };
  const reset = () => { setStep('method'); setMethod(null); setFormData({}); setErrors({}); setCoinAmt(''); setTab('overview'); };
  const copy = () => { navigator.clipboard.writeText(txRef); setCopied(true); setTimeout(()=>setCopied(false),2000); };

  /* ── RENDER ── */
  return (
    <div className="max-w-xl mx-auto pb-6 space-y-0">

      {/* ══════════════════════════════════
          STICKY HEADER
      ══════════════════════════════════ */}
      <div className="sticky top-0 z-20 bg-slate-50 pt-2 pb-3">
        {/* Page title */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shadow"
              style={{background:'linear-gradient(135deg,#f59e0b,#f97316)'}}>
              <Wallet size={18} className="text-white" />
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-900 leading-none">Wallet</h1>
              <p className="text-slate-400 text-[11px] font-medium mt-0.5">Earn · Withdraw · History</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 bg-amber-50 border-2 border-amber-200 rounded-2xl px-3 py-1.5 shadow-sm">
            <span className="text-base">🪙</span>
            <span className="text-lg font-black text-amber-700 tabular-nums">{stats.coins.toLocaleString()}</span>
          </div>
        </div>

        {/* Tab switcher */}
        <div className="bg-white border border-slate-200 rounded-2xl p-1 flex gap-1 shadow-sm">
          {([
            {id:'overview', label:'Overview', icon:<BarChart3 size={14}/>},
            {id:'withdraw', label:'Withdraw', icon:<ArrowUpCircle size={14}/>},
            {id:'history',  label:'History',  icon:<History size={14}/>},
          ] as {id:WalletTab;label:string;icon:React.ReactNode}[]).map(t=>(
            <button key={t.id}
              onClick={()=>{ setTab(t.id); if(t.id==='withdraw') setStep('method'); }}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold transition-all duration-200 ${
                tab===t.id
                  ? 'bg-slate-900 text-white shadow'
                  : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
              }`}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ══════════════════════════════════
          TAB: OVERVIEW
      ══════════════════════════════════ */}
      {tab==='overview' && (
        <div className="space-y-4 pt-1">

          {/* ── Hero Card ── */}
          <div className="relative rounded-3xl overflow-hidden"
            style={{background:'linear-gradient(145deg,#0f172a 0%,#1e1b4b 40%,#0f172a 100%)'}}>
            {/* Glow blobs */}
            <div className="absolute -top-14 -right-14 w-52 h-52 rounded-full opacity-30"
              style={{background:'radial-gradient(circle,#f59e0b,transparent 70%)'}}/>
            <div className="absolute -bottom-16 -left-8 w-48 h-48 rounded-full opacity-20"
              style={{background:'radial-gradient(circle,#8b5cf6,transparent 70%)'}}/>
            <div className="absolute top-1/3 right-1/3 w-24 h-24 rounded-full opacity-10"
              style={{background:'radial-gradient(circle,#06b6d4,transparent 70%)'}}/>

            <div className="relative z-10 p-6">
              {/* Top row */}
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center">
                    <span className="text-sm">🪙</span>
                  </div>
                  <span className="text-white/50 text-[11px] font-bold uppercase tracking-widest">GetMe</span>
                </div>
                <div className="flex items-center gap-1.5 bg-emerald-500/20 border border-emerald-500/30 rounded-full px-2.5 py-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"/>
                  <span className="text-emerald-300 text-[11px] font-bold">ACTIVE</span>
                </div>
              </div>

              {/* Balance */}
              <div className="mb-5">
                <p className="text-white/40 text-[11px] font-semibold uppercase tracking-widest mb-1">Total Balance</p>
                <div className="flex items-end gap-2 mb-1">
                  <span className="text-5xl font-black text-white tabular-nums leading-none">{stats.coins.toLocaleString()}</span>
                  <span className="text-xl mb-0.5 leading-none">🪙</span>
                </div>
                <p className="text-amber-400 text-sm font-semibold">≈ ₹{(stats.coins*0.20).toFixed(0)} <span className="text-white/30 text-xs font-normal">estimated</span></p>
              </div>

              {/* Stats mini row */}
              <div className="grid grid-cols-3 gap-2">
                {[
                  {label:'Earned', val:`+${totalEarned.toLocaleString()}`, sub:'coins', col:'bg-emerald-500/15 border-emerald-500/25'},
                  {label:'Withdrawn', val:`-${totalWithdrawn.toLocaleString()}`, sub:'coins', col:'bg-red-500/15 border-red-500/25'},
                  {label:'INR Est.', val:`₹${(stats.coins*0.20).toFixed(0)}`, sub:'approx', col:'bg-amber-400/15 border-amber-400/25'},
                ].map((s,i)=>(
                  <div key={i} className={`${s.col} border rounded-2xl px-3 py-2.5`}>
                    <p className="text-white/40 text-[10px] font-semibold mb-1">{s.label}</p>
                    <p className="text-white font-black text-sm leading-none">{s.val}</p>
                    <p className="text-white/30 text-[10px] mt-0.5">{s.sub}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Level bar */}
            <div className="relative z-10 border-t border-white/10 px-6 py-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-md flex items-center justify-center" style={{backgroundColor: LEVEL_COLORS[lvlIdx]+'33'}}>
                    <Star size={11} style={{color: LEVEL_COLORS[lvlIdx]}}/>
                  </div>
                  <span className="text-white/70 text-xs font-bold" style={{color: LEVEL_COLORS[lvlIdx]}}>{LEVELS[lvlIdx]}</span>
                  <span className="text-white/30 text-[10px]">Lv.{stats.level}</span>
                </div>
                <span className="text-white/40 text-[11px]">{xpPct}/100 XP</span>
              </div>
              <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all duration-700"
                  style={{width:`${xpPct}%`, backgroundColor: LEVEL_COLORS[lvlIdx]}}/>
              </div>
            </div>
          </div>

          {/* ── Withdrawal Limits ── */}
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 pt-5 pb-3">
              <div>
                <h3 className="font-black text-slate-900 text-base">Withdrawal Methods</h3>
                <p className="text-slate-400 text-xs mt-0.5">Your unlock progress</p>
              </div>
              <button onClick={()=>{setTab('withdraw');setStep('method');}}
                className="flex items-center gap-1 text-xs font-bold text-amber-600 bg-amber-50 border border-amber-200 rounded-xl px-3 py-1.5">
                Withdraw <ArrowRight size={12}/>
              </button>
            </div>

            <div className="divide-y divide-slate-50">
              {activeMethods.map(m=>{
                const pct = Math.min((stats.coins/m.minCoins)*100,100);
                const unlocked = stats.coins >= m.minCoins;
                return (
                  <div key={m.id} className="flex items-center gap-3 px-5 py-3.5">
                    {/* Logo */}
                    <div className="w-9 h-9 rounded-xl overflow-hidden flex-shrink-0 shadow-sm">
                      {m.logo}
                    </div>
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-slate-800 text-sm font-bold">{m.shortName}</span>
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                          unlocked ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-500'
                        }`}>
                          {unlocked ? '✓ Unlocked' : `${m.minCoins.toLocaleString()} 🪙`}
                        </span>
                      </div>
                      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-700"
                          style={{width:`${pct}%`, backgroundColor: m.accentColor}}/>
                      </div>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-slate-400 text-[10px]">{m.rateLabel}</span>
                        <span className="text-slate-400 text-[10px]">{Math.round(pct)}%</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Big withdraw CTA */}
            <div className="px-5 pb-5 pt-2">
              <button onClick={()=>{setTab('withdraw');setStep('method');}}
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl text-white font-black text-sm shadow-lg transition-all active:scale-95"
                style={{background:'linear-gradient(135deg,#f59e0b,#f97316)'}}>
                <ArrowUpCircle size={16}/> Withdraw Coins
              </button>
            </div>
          </div>

          {/* ── Quick Stats ── */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center flex-shrink-0">
                <span className="text-lg">📋</span>
              </div>
              <div>
                <p className="text-slate-400 text-xs font-medium">Surveys Done</p>
                <p className="text-slate-900 font-black text-xl">{stats.surveysCompleted}</p>
              </div>
            </div>
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0">
                <span className="text-lg">🔐</span>
              </div>
              <div>
                <p className="text-slate-400 text-xs font-medium">CAPTCHAs</p>
                <p className="text-slate-900 font-black text-xl">{stats.captchasSolved}</p>
              </div>
            </div>
          </div>

          {/* ── Recent Transactions ── */}
          {transactions.length > 0 && (
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-5 pt-5 pb-3">
                <h3 className="font-black text-slate-900 text-base">Recent Activity</h3>
                <button onClick={()=>setTab('history')}
                  className="text-xs font-bold text-slate-500 hover:text-slate-800 flex items-center gap-1">
                  See all <ChevronRight size={12}/>
                </button>
              </div>
              <div className="divide-y divide-slate-50">
                {[...transactions].reverse().slice(0,5).map(tx=>(
                  <div key={tx.id} className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50/50 transition-colors">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      tx.type==='earn' ? 'bg-emerald-100' : 'bg-red-100'
                    }`}>
                      {tx.type==='earn'
                        ? <ArrowDownCircle size={16} className="text-emerald-500"/>
                        : <ArrowUpCircle size={16} className="text-red-400"/>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-slate-800 text-sm font-semibold truncate">{tx.source}</p>
                      <p className="text-slate-400 text-xs">{tx.date}</p>
                    </div>
                    <span className={`text-sm font-black ${tx.type==='earn' ? 'text-emerald-500' : 'text-red-400'}`}>
                      {tx.type==='earn' ? '+' : '−'}{tx.amount} 🪙
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {transactions.length === 0 && (
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-10 flex flex-col items-center gap-3 text-center">
              <div className="w-16 h-16 rounded-2xl bg-amber-50 flex items-center justify-center">
                <span className="text-3xl">🪙</span>
              </div>
              <p className="text-slate-700 font-black text-lg">No transactions yet</p>
              <p className="text-slate-400 text-sm">Complete surveys & CAPTCHAs to start earning coins!</p>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════
          TAB: WITHDRAW
      ══════════════════════════════════ */}
      {tab==='withdraw' && (
        <div className="space-y-4 pt-1">

          {/* Step 1: Method Selection */}
          {step==='method' && (
            <>
              {/* Balance pill */}
              <div className="flex items-center justify-between bg-white border border-slate-200 rounded-2xl px-4 py-3 shadow-sm">
                <div>
                  <p className="text-slate-400 text-xs font-medium">Available to withdraw</p>
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-900 font-black text-xl">{stats.coins.toLocaleString()}</span>
                    <span className="text-base">🪙</span>
                    <span className="text-slate-400 text-sm">≈ ₹{(stats.coins*0.20).toFixed(0)}</span>
                  </div>
                </div>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{background:'linear-gradient(135deg,#f59e0b,#f97316)'}}>
                  <Wallet size={18} className="text-white"/>
                </div>
              </div>

              {/* Section header */}
              <div>
                <h2 className="text-slate-900 font-black text-lg">Choose Payment Method</h2>
                <p className="text-slate-500 text-sm mt-0.5">Select how you'd like to receive your earnings</p>
              </div>

              {/* Method Cards */}
              <div className="space-y-3">
                {activeMethods.map(m=>{
                  const locked = stats.coins < m.minCoins;
                  const need = m.minCoins - stats.coins;
                  const pct = Math.min((stats.coins/m.minCoins)*100,100);
                  return (
                    <button key={m.id}
                      onClick={()=>!locked && selectMethod(m)}
                      disabled={locked}
                      className={`w-full text-left rounded-3xl border-2 overflow-hidden transition-all duration-200 ${
                        locked
                          ? 'border-slate-200 opacity-60 cursor-not-allowed'
                          : `${m.borderAccent} hover:shadow-lg hover:-translate-y-0.5 active:scale-[0.99] cursor-pointer`
                      }`}
                      style={locked ? {} : {boxShadow:`0 4px 24px ${m.accentColor}22`}}
                    >
                      {/* Top accent strip */}
                      <div className="h-1" style={locked ? {background:'#cbd5e1'} : {background:m.gradient}}/>

                      <div className="p-4">
                        <div className="flex items-start gap-3">
                          {/* Logo */}
                          <div className="w-12 h-12 rounded-2xl overflow-hidden flex-shrink-0 shadow-md">
                            {m.logo}
                          </div>

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2 mb-1">
                              <div>
                                <p className="font-black text-slate-900 text-base leading-tight">{m.name}</p>
                                <p className="text-slate-400 text-xs font-medium">{m.tagline}</p>
                              </div>
                              {locked
                                ? <div className="flex-shrink-0 w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center">
                                    <Lock size={14} className="text-slate-400"/>
                                  </div>
                                : <div className="flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center"
                                    style={{background:m.gradient}}>
                                    <ChevronRight size={14} className="text-white"/>
                                  </div>
                              }
                            </div>

                            {/* Rate + Speed row */}
                            <div className="flex items-center gap-2 flex-wrap mt-2">
                              <span className={`text-xs font-black px-2.5 py-1 rounded-xl ${m.bgCard} ${m.textAccent}`}>
                                {m.rateLabel}
                              </span>
                              <span className="flex items-center gap-1 text-xs font-semibold text-slate-500 bg-slate-100 rounded-xl px-2.5 py-1">
                                {m.speedIcon} {m.speedLabel}
                              </span>
                            </div>

                            {/* Progress (if locked) */}
                            {locked && (
                              <div className="mt-3">
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-slate-500 text-[11px] font-semibold">Progress</span>
                                  <span className="text-slate-400 text-[11px]">Need {need.toLocaleString()} more ��</span>
                                </div>
                                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                  <div className="h-full rounded-full transition-all duration-500"
                                    style={{width:`${pct}%`, backgroundColor: m.accentColor}}/>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Conversion reference */}
              <div className="bg-slate-900 rounded-3xl p-5">
                <p className="text-white/60 text-xs font-bold uppercase tracking-widest mb-3">💱 Conversion Rates</p>
                <div className="space-y-2">
                  {[
                    {label:'PhonePe & UPI', rate:'5,000 🪙 = ₹1,000', note:'₹0.20/coin'},
                    {label:'Credit Card & Bank', rate:'10,000 🪙 = ₹1,000', note:'₹0.10/coin'},
                    {label:'Crypto Wallet', rate:'5,000 🪙 = ₹2,000', note:'₹0.40/coin'},
                  ].map((r,i)=>(
                    <div key={i} className="flex items-center justify-between bg-white/5 rounded-2xl px-4 py-2.5">
                      <span className="text-white/60 text-xs font-medium">{r.label}</span>
                      <div className="text-right">
                        <span className="text-white font-black text-sm block">{r.rate}</span>
                        <span className="text-white/40 text-[10px]">{r.note}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Step 2: Details */}
          {step==='details' && method && (
            <div className="space-y-4">
              {/* Back */}
              <button onClick={()=>setStep('method')}
                className="flex items-center gap-1.5 text-sm font-bold text-slate-500 hover:text-slate-800 transition">
                <ChevronLeft size={16}/> Back to methods
              </button>

              {/* Method header card */}
              <div className="rounded-3xl overflow-hidden shadow-lg">
                <div className="p-5 text-white relative overflow-hidden" style={{background:method.gradient}}>
                  <div className="absolute inset-0 opacity-20" style={{backgroundImage:'radial-gradient(circle at 80% 20%, white, transparent 60%)'}}/>
                  <div className="relative z-10 flex items-center gap-3">
                    <div className="w-14 h-14 rounded-2xl overflow-hidden shadow-lg flex-shrink-0 bg-white/20">
                      {method.logo}
                    </div>
                    <div>
                      <p className="font-black text-xl">{method.name}</p>
                      <p className="text-white/60 text-sm">{method.tagline}</p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="text-xs bg-white/20 rounded-lg px-2 py-0.5 font-bold">{method.rateLabel}</span>
                        <span className="flex items-center gap-1 text-xs bg-white/20 rounded-lg px-2 py-0.5 font-bold">
                          {method.speedIcon} {method.speedLabel}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Amount input */}
              <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5 space-y-4">
                <h3 className="font-black text-slate-900 text-base">Enter Amount</h3>

                {/* Big coin input */}
                <div className={`border-2 rounded-2xl p-4 transition-all ${errors.amount ? 'border-red-400 bg-red-50' : 'border-slate-200 focus-within:border-amber-400 bg-slate-50 focus-within:bg-white'}`}>
                  <p className="text-slate-400 text-xs font-semibold mb-2">Coin Amount</p>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">🪙</span>
                    <input type="number" value={coinAmt} onChange={e=>setCoinAmt(e.target.value)}
                      placeholder="0"
                      className="flex-1 text-3xl font-black text-slate-900 bg-transparent outline-none w-full"
                      style={{fontSize:'28px'}}/>
                    <button onClick={()=>setCoinAmt(String(stats.coins))}
                      className="text-xs font-black bg-amber-100 text-amber-700 border border-amber-200 rounded-xl px-2.5 py-1 flex-shrink-0">
                      MAX
                    </button>
                  </div>
                  {inrVal > 0 && (
                    <p className="text-emerald-600 font-bold text-sm mt-2">= ₹{inrVal.toFixed(2)}</p>
                  )}
                </div>
                {errors.amount && (
                  <p className="text-red-500 text-xs font-semibold flex items-center gap-1">
                    <AlertCircle size={12}/> {errors.amount}
                  </p>
                )}

                {/* Presets */}
                <div>
                  <p className="text-slate-400 text-xs font-semibold mb-2">Quick Select</p>
                  <div className="flex gap-2 flex-wrap">
                    {PRESETS.filter(p=>p>=method.minCoins).map(p=>(
                      <button key={p} onClick={()=>setCoinAmt(String(p))}
                        className={`text-xs font-black px-3 py-1.5 rounded-xl border-2 transition-all ${
                          coinAmt===String(p)
                            ? `${method.bgCard} ${method.borderAccent} ${method.textAccent}`
                            : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-300'
                        }`}>
                        {p.toLocaleString()}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Min threshold note */}
                <div className={`flex items-center gap-2 ${method.bgCard} border ${method.borderAccent} rounded-2xl px-4 py-2.5`}>
                  <Info size={13} className={method.textAccent}/>
                  <p className={`text-xs font-semibold ${method.textAccent}`}>
                    Minimum: <strong>{method.minCoins.toLocaleString()} 🪙</strong> → ₹{(method.minCoins*method.inrPerCoin).toFixed(0)}
                  </p>
                </div>
              </div>

              {/* Payment fields */}
              <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5 space-y-4">
                <h3 className="font-black text-slate-900 text-base">Payment Details</h3>

                {/* Crypto warning */}
                {method.id==='crypto' && (
                  <div className="bg-red-50 border border-red-200 rounded-2xl p-3.5 flex items-start gap-2">
                    <AlertCircle size={15} className="text-red-500 flex-shrink-0 mt-0.5"/>
                    <p className="text-red-700 text-xs font-semibold leading-relaxed">
                      ⚠️ Double-check your wallet address and network. Wrong address = permanent loss of funds. We cannot reverse crypto transactions.
                    </p>
                  </div>
                )}

                {/* Credit card live preview */}
                {method.id==='creditcard' && (
                  <div className="rounded-2xl p-5 text-white relative overflow-hidden aspect-[16/9]"
                    style={{background:'linear-gradient(135deg,#1e3a8a,#6366f1,#8b5cf6)'}}>
                    <div className="absolute inset-0 opacity-30" style={{backgroundImage:'radial-gradient(circle at 80% 20%, white, transparent 50%)'}}/>
                    <div className="relative z-10 h-full flex flex-col justify-between">
                      <div className="flex justify-between items-start">
                        <div className="w-8 h-6 bg-amber-400 rounded opacity-90"/>
                        <span className="text-white/60 text-xs font-bold uppercase tracking-widest">CREDIT</span>
                      </div>
                      <div>
                        <p className="font-mono text-lg font-bold tracking-[0.2em] mb-3 text-white/90">
                          {(formData.cardNumber||'•••• •••• •••• ••••').replace(/(.{4})/g,(m,_,o)=>o?m+' ':m).trim()}
                        </p>
                        <div className="flex justify-between">
                          <div>
                            <p className="text-white/40 text-[9px] uppercase tracking-widest">Card Holder</p>
                            <p className="font-bold text-sm">{formData.cardName||'YOUR NAME'}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-white/40 text-[9px] uppercase tracking-widest">Expires</p>
                            <p className="font-bold text-sm">{formData.expiry||'MM/YY'}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* UPI preview */}
                {method.id==='upi' && formData.upiId && (
                  <div className="bg-green-50 border border-green-200 rounded-2xl p-3.5 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-green-500 flex items-center justify-center text-white font-black">
                      {(formData.name||'U')[0].toUpperCase()}
                    </div>
                    <div>
                      <p className="text-green-800 font-black text-sm">{formData.name||'Account Holder'}</p>
                      <p className="text-green-600 text-xs font-mono">{formData.upiId}</p>
                    </div>
                    <BadgeCheck size={18} className="text-green-500 ml-auto flex-shrink-0"/>
                  </div>
                )}

                {/* PhonePe preview */}
                {method.id==='phonepe' && formData.phone?.length===10 && (
                  <div className="bg-purple-50 border border-purple-200 rounded-2xl p-3.5 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{background:method.gradient}}>
                      <Smartphone size={16} className="text-white"/>
                    </div>
                    <div>
                      <p className="text-purple-800 font-black text-sm">{formData.name||'Account Holder'}</p>
                      <p className="text-purple-600 text-xs font-mono">+91 {formData.phone}</p>
                    </div>
                    <BadgeCheck size={18} className="text-purple-500 ml-auto flex-shrink-0"/>
                  </div>
                )}

                {/* Fields */}
                {method.fields.map(f=>(
                  <div key={f.id}>
                    <label className="block text-sm font-black text-slate-700 mb-1.5">{f.label}</label>
                    <div className="relative">
                      {f.prefix && (
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 text-sm font-bold">{f.prefix}</span>
                      )}
                      <input
                        type={f.id==='cvv' ? (showCvv?'text':'password') : f.type}
                        value={formData[f.id]||''}
                        onChange={e=>handleField(f.id, e.target.value)}
                        placeholder={f.placeholder}
                        maxLength={f.maxLength}
                        style={{fontSize:'16px', paddingLeft: f.prefix ? '44px' : undefined}}
                        className={`w-full px-4 py-3.5 border-2 rounded-2xl text-slate-800 font-semibold text-sm focus:outline-none transition-all ${
                          errors[f.id]
                            ? 'border-red-400 bg-red-50 focus:border-red-500'
                            : 'border-slate-200 bg-slate-50 focus:border-amber-400 focus:bg-white'
                        }`}
                      />
                      {f.id==='cvv' && (
                        <button type="button" onClick={()=>setShowCvv(!showCvv)}
                          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                          {showCvv ? <EyeOff size={16}/> : <Eye size={16}/>}
                        </button>
                      )}
                    </div>
                    {errors[f.id] && (
                      <p className="text-red-500 text-xs mt-1 font-semibold flex items-center gap-1">
                        <AlertCircle size={11}/> {errors[f.id]}
                      </p>
                    )}
                    {f.hint && !errors[f.id] && (
                      <p className="text-slate-400 text-xs mt-1">{f.hint}</p>
                    )}
                  </div>
                ))}
              </div>

              {/* CTA */}
              <button onClick={toConfirm}
                className="w-full py-4 rounded-2xl text-white font-black text-base flex items-center justify-center gap-2 shadow-xl transition-all active:scale-95"
                style={{background:method.gradient}}>
                Review Withdrawal <ChevronRight size={18}/>
              </button>
            </div>
          )}

          {/* Step 3: Confirm */}
          {step==='confirm' && method && (
            <div className="space-y-4">
              <button onClick={()=>setStep('details')}
                className="flex items-center gap-1.5 text-sm font-bold text-slate-500 hover:text-slate-800 transition">
                <ChevronLeft size={16}/> Edit details
              </button>

              {/* Big amount card */}
              <div className="rounded-3xl overflow-hidden shadow-xl">
                <div className="p-6 text-white text-center relative overflow-hidden" style={{background:method.gradient}}>
                  <div className="absolute inset-0 opacity-20"
                    style={{backgroundImage:'radial-gradient(circle at 15% 85%, white, transparent 55%)'}}/>
                  <div className="relative z-10">
                    <div className="w-14 h-14 rounded-2xl overflow-hidden mx-auto mb-3 shadow-lg">
                      {method.logo}
                    </div>
                    <p className="text-white/60 text-sm mb-1">You will receive</p>
                    <p className="text-5xl font-black">₹{inrVal.toFixed(2)}</p>
                    <p className="text-white/60 text-sm mt-1">{coins.toLocaleString()} 🪙 deducted</p>
                  </div>
                </div>

                {/* Detail rows */}
                <div className="bg-white divide-y divide-slate-50">
                  {[
                    {label:'Method', val:method.name},
                    {label:'Account', val:maskDetail(method,formData), mono:true},
                    {label:'Speed', val:method.speedLabel},
                    {label:'Coins Out', val:`−${coins.toLocaleString()} 🪙`, red:true},
                    {label:'₹ Credited', val:`₹${inrVal.toFixed(2)}`, green:true},
                    {label:'Remaining', val:`${(stats.coins-coins).toLocaleString()} 🪙`},
                  ].map((row,i)=>(
                    <div key={i} className="flex justify-between items-center px-5 py-3.5">
                      <span className="text-slate-500 text-sm">{row.label}</span>
                      <span className={`font-black text-sm ${
                        (row as any).red ? 'text-red-500' :
                        (row as any).green ? 'text-emerald-600' : 'text-slate-800'
                      } ${(row as any).mono ? 'font-mono text-xs' : ''}`}>
                        {row.val}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Notice */}
                <div className="bg-white px-5 pb-5">
                  <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3.5 flex items-start gap-2.5">
                    <Info size={13} className="text-amber-500 flex-shrink-0 mt-0.5"/>
                    <p className="text-amber-700 text-xs font-semibold leading-relaxed">
                      {method.id==='bank' ? 'Bank NEFT transfers take 1–2 business days. Verify IFSC carefully.' :
                       method.id==='crypto' ? 'Crypto may take up to 24h. Wrong address = permanent loss.' :
                       method.id==='creditcard' ? 'Card refunds appear within 1–3 business days.' :
                       'PhonePe/UPI transfers usually complete within seconds.'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex gap-3">
                <button onClick={()=>setStep('details')}
                  className="flex-1 border-2 border-slate-200 text-slate-600 font-black py-4 rounded-2xl hover:bg-slate-50 transition text-sm">
                  ← Back
                </button>
                <button onClick={doWithdraw}
                  className="flex-1 text-white font-black py-4 rounded-2xl shadow-xl transition-all active:scale-95 flex items-center justify-center gap-2 text-sm"
                  style={{background:method.gradient}}>
                  <ShieldCheck size={16}/> Confirm
                </button>
              </div>
            </div>
          )}

          {/* Step 4: Success */}
          {step==='success' && method && (
            <div className="space-y-4">
              <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                {/* Green top */}
                <div className="h-2 bg-gradient-to-r from-emerald-400 via-teal-400 to-emerald-500"/>

                <div className="p-7 space-y-5 text-center">
                  {/* Success icon */}
                  <div className="flex flex-col items-center gap-3">
                    <div className="relative">
                      <div className="w-24 h-24 rounded-full bg-emerald-50 border-4 border-emerald-100 flex items-center justify-center">
                        <CheckCircle2 size={54} className="text-emerald-500" strokeWidth={1.5}/>
                      </div>
                      <div className="absolute -bottom-1 -right-1 w-9 h-9 rounded-full bg-amber-400 flex items-center justify-center shadow-lg text-xl animate-bounce">
                        🪙
                      </div>
                    </div>
                    <div>
                      <h3 className="text-2xl font-black text-slate-900">Withdrawal Submitted!</h3>
                      <p className="text-slate-400 text-sm mt-1">Your request is being processed securely</p>
                    </div>
                  </div>

                  {/* Summary card */}
                  <div className="rounded-2xl overflow-hidden shadow-lg">
                    <div className="p-4 text-white" style={{background:method.gradient}}>
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-xl overflow-hidden flex-shrink-0">{method.logo}</div>
                        <div className="flex-1 text-left">
                          <p className="font-black">{method.name}</p>
                          <p className="text-white/60 text-xs font-mono">{maskDetail(method,formData)}</p>
                        </div>
                        <span className="text-xs bg-white/20 rounded-xl px-2.5 py-1 font-bold">{method.speedLabel}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="bg-white/15 rounded-xl p-3 text-left">
                          <p className="text-white/50 text-xs mb-0.5">Coins</p>
                          <p className="text-white font-black text-xl">{coins.toLocaleString()} 🪙</p>
                        </div>
                        <div className="bg-white/15 rounded-xl p-3 text-left">
                          <p className="text-white/50 text-xs mb-0.5">Amount</p>
                          <p className="text-white font-black text-xl">₹{inrVal.toFixed(2)}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* TX Ref */}
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 flex items-center justify-between">
                    <div className="text-left">
                      <p className="text-xs text-slate-400 mb-0.5">Transaction Reference</p>
                      <p className="text-sm font-black font-mono text-slate-800">{txRef}</p>
                    </div>
                    <button onClick={copy}
                      className={`flex items-center gap-1.5 text-xs font-black px-3 py-2 rounded-xl border-2 transition-all ${
                        copied
                          ? 'bg-emerald-50 border-emerald-300 text-emerald-600'
                          : 'bg-amber-50 border-amber-300 text-amber-600 hover:bg-amber-100'
                      }`}>
                      {copied ? <><Check size={12}/> Copied!</> : <><Copy size={12}/> Copy</>}
                    </button>
                  </div>

                  {/* Info notice */}
                  <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-start gap-3 text-left">
                    <ShieldCheck size={16} className="text-emerald-500 flex-shrink-0 mt-0.5"/>
                    <p className="text-emerald-700 text-xs font-semibold leading-relaxed">
                      {coins.toLocaleString()} coins deducted · ₹{inrVal.toFixed(2)} will be credited to your {method.name} account{' '}
                      {method.id==='bank' ? 'in 1–2 business days' :
                       method.id==='crypto' ? 'within 24 hours' :
                       method.id==='creditcard' ? 'in 1–3 business days' : 'within minutes'}.
                    </p>
                  </div>

                  <button onClick={reset}
                    className="w-full py-4 rounded-2xl text-white font-black shadow-lg active:scale-95 transition-all"
                    style={{background:'linear-gradient(135deg,#f59e0b,#f97316)'}}>
                    ← Back to Wallet
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════
          TAB: HISTORY
      ══════════════════════════════════ */}
      {tab==='history' && (
        <div className="space-y-4 pt-1">

          {/* Summary cards */}
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-3.5 text-center">
              <TrendingUp size={15} className="text-emerald-500 mx-auto mb-1"/>
              <p className="text-emerald-700 font-black text-lg leading-none">+{totalEarned.toLocaleString()}</p>
              <p className="text-emerald-400 text-[10px] font-semibold mt-1">EARNED 🪙</p>
            </div>
            <div className="bg-red-50 border border-red-100 rounded-2xl p-3.5 text-center">
              <TrendingDown size={15} className="text-red-400 mx-auto mb-1"/>
              <p className="text-red-500 font-black text-lg leading-none">−{totalWithdrawn.toLocaleString()}</p>
              <p className="text-red-300 text-[10px] font-semibold mt-1">WITHDRAWN 🪙</p>
            </div>
            <div className="bg-slate-50 border border-slate-100 rounded-2xl p-3.5 text-center">
              <BarChart3 size={15} className="text-slate-400 mx-auto mb-1"/>
              <p className="text-slate-700 font-black text-lg leading-none">{transactions.length}</p>
              <p className="text-slate-400 text-[10px] font-semibold mt-1">TOTAL TXN</p>
            </div>
          </div>

          {/* Search + filter */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 space-y-3">
            <div className="relative">
              <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"/>
              <input type="text" value={searchQ} onChange={e=>setSearchQ(e.target.value)}
                placeholder="Search transactions..."
                style={{fontSize:'16px'}}
                className="w-full pl-9 pr-9 py-2.5 border-2 border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:border-amber-400 transition bg-slate-50 focus:bg-white"/>
              {searchQ && (
                <button onClick={()=>setSearchQ('')} className="absolute right-3.5 top-1/2 -translate-y-1/2">
                  <X size={14} className="text-slate-400"/>
                </button>
              )}
            </div>

            <div className="flex gap-2">
              {([
                {id:'all', label:'All', count:transactions.length},
                {id:'earn', label:'↓ Earned', count:earnTx.length},
                {id:'withdraw', label:'↑ Withdrawn', count:withdrawTx.length},
              ] as {id:FilterType;label:string;count:number}[]).map(f=>(
                <button key={f.id} onClick={()=>setFilter(f.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black border-2 transition-all ${
                    filter===f.id
                      ? 'border-amber-400 bg-amber-50 text-amber-700'
                      : 'border-slate-200 text-slate-500 bg-white hover:border-slate-300'
                  }`}>
                  {f.label}
                  <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-black ${
                    filter===f.id ? 'bg-amber-200 text-amber-700' : 'bg-slate-100 text-slate-500'
                  }`}>{f.count}</span>
                </button>
              ))}
            </div>
          </div>

          {/* TX List */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            {filteredTx.length===0 ? (
              <div className="py-14 flex flex-col items-center gap-3 text-center px-6">
                <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center">
                  <RefreshCw size={22} className="text-slate-300"/>
                </div>
                <p className="text-slate-600 font-black">No transactions found</p>
                <p className="text-slate-400 text-sm">
                  {transactions.length===0 ? 'Complete tasks to earn coins!' : 'Adjust your filter or search.'}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-50">
                {filteredTx.map(tx=>(
                  <div key={tx.id} className="flex items-center gap-3 px-4 py-3.5 hover:bg-slate-50/50 transition-colors">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      tx.type==='earn' ? 'bg-emerald-100' : 'bg-red-100'
                    }`}>
                      {tx.type==='earn'
                        ? <ArrowDownCircle size={17} className="text-emerald-500"/>
                        : <ArrowUpCircle size={17} className="text-red-400"/>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-slate-800 text-sm font-semibold truncate">{tx.source}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-black ${
                          tx.type==='earn' ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-500'
                        }`}>
                          {tx.type==='earn' ? 'EARNED' : 'WITHDRAWN'}
                        </span>
                        <span className="text-slate-400 text-xs">{tx.date}</span>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className={`font-black text-sm ${tx.type==='earn' ? 'text-emerald-500' : 'text-red-400'}`}>
                        {tx.type==='earn' ? '+' : '−'}{tx.amount}
                      </p>
                      <p className="text-slate-400 text-xs">🪙</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {filteredTx.length>0 && (
            <p className="text-center text-slate-400 text-xs py-1">
              Showing {filteredTx.length} of {transactions.length} transactions
            </p>
          )}
        </div>
      )}
    </div>
  );
};
