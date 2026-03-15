import React, { useEffect } from 'react';
import { ExternalLink, Gift } from 'lucide-react';
import { APP_ENV } from '../lib/env';

/* ─────────────────────────────────────────────────────────────
   AD CONSTANTS
───────────────────────────────────────────────────────────── */
export const SMART_LINK   = APP_ENV.SMART_LINK;
export const NATIVE_SRC   = APP_ENV.NATIVE_SRC;
export const NATIVE_ID    = APP_ENV.NATIVE_ID;
export const BANNER_KEY   = APP_ENV.BANNER_KEY;
export const BANNER_SRC   = `https://drainalmost.com/${BANNER_KEY}/invoke.js`;

/* ─────────────────────────────────────────────────────────────
   NATIVE BANNER HOOK
───────────────────────────────────────────────────────────── */
export function useNativeBannerAd(containerId: string) {
  useEffect(() => {
    const el = document.getElementById(containerId);
    if (!el || el.dataset.adLoaded) return;
    el.dataset.adLoaded = 'true';
    const s = document.createElement('script');
    s.async = true;
    s.setAttribute('data-cfasync', 'false');
    s.src = NATIVE_SRC;
    el.appendChild(s);
  }, [containerId]);
}

/* ─────────────────────────────────────────────────────────────
   BANNER AD HOOK  (iframe 468×60)
───────────────────────────────────────────────────────────── */
export function useBannerAd(containerId: string) {
  useEffect(() => {
    const el = document.getElementById(containerId);
    if (!el || el.dataset.adLoaded) return;
    el.dataset.adLoaded = 'true';
    const opt = document.createElement('script');
    opt.text = `window.atOptions={"key":"${BANNER_KEY}","format":"iframe","height":60,"width":468,"params":{}};`;
    el.appendChild(opt);
    const inv = document.createElement('script');
    inv.src = BANNER_SRC;
    el.appendChild(inv);
  }, [containerId]);
}

/* ─────────────────────────────────────────────────────────────
   FULL AD BLOCK COMPONENT
───────────────────────────────────────────────────────────── */
interface AllAdsProps {
  prefix: string;
  accentColor?: string;
  label?: string;
}

export const AllAds: React.FC<AllAdsProps> = ({
  prefix,
  accentColor = 'from-violet-50 to-purple-50',
  label = 'Advertisement',
}) => {
  useNativeBannerAd(`${prefix}-native-container`);
  useBannerAd(`${prefix}-banner-container`);

  const dotColor =
    accentColor.includes('emerald') ? 'bg-emerald-400' :
    accentColor.includes('blue')    ? 'bg-blue-400'    :
    accentColor.includes('amber')   ? 'bg-amber-400'   :
    'bg-violet-400';

  const textColor =
    accentColor.includes('emerald') ? 'text-emerald-700' :
    accentColor.includes('blue')    ? 'text-blue-700'    :
    accentColor.includes('amber')   ? 'text-amber-700'   :
    'text-violet-700';

  return (
    <div className="space-y-3">

      {/* ── 1. NATIVE BANNER */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <AdHeader accentColor={accentColor} dotColor={dotColor} textColor={textColor} label="Sponsored" badge="Ad" />
        <div className="p-3 min-h-[100px] flex items-center justify-center overflow-hidden">
          <div id={`${prefix}-native-container`} className="w-full" />
        </div>
      </div>

      {/* ── 2. SMART LINK BUTTON */}
      <a
        href={SMART_LINK}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-3 w-full bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 rounded-2xl px-4 py-3.5 shadow-lg shadow-emerald-200/60 active:scale-[0.98] transition-all group"
      >
        <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
          <Gift size={20} className="text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white font-black text-sm leading-tight">🎁 Claim Special Bonus</p>
          <p className="text-emerald-100 text-xs mt-0.5">Tap to unlock exclusive rewards</p>
        </div>
        <ExternalLink size={16} className="text-white/80 flex-shrink-0 group-hover:translate-x-0.5 transition-transform" />
      </a>

      {/* ── 3. BANNER AD (iframe 468×60) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <AdHeader accentColor={accentColor} dotColor={dotColor} textColor={textColor} label={label} badge="Ads" />
        <div className="p-3 flex items-center justify-center min-h-[72px] overflow-x-auto">
          <div id={`${prefix}-banner-container`} className="flex items-center justify-center" />
        </div>
      </div>

      {/* ── 4. SMART LINK STRIP (bottom) */}
      <a
        href={SMART_LINK}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-between bg-gradient-to-r from-amber-400 via-orange-400 to-rose-500 rounded-2xl px-4 py-3 shadow-md shadow-amber-200/60 active:scale-[0.98] transition-all"
      >
        <div>
          <p className="text-white font-black text-xs">🔥 Limited Offer — Extra Coins!</p>
          <p className="text-amber-100 text-[10px] mt-0.5">Exclusive bonus for active users</p>
        </div>
        <div className="bg-white/20 rounded-lg px-2 py-1">
          <ExternalLink size={14} className="text-white" />
        </div>
      </a>

    </div>
  );
};

/* ─────────────────────────────────────────────────────────────
   INTERNAL: AdHeader
───────────────────────────────────────────────────────────── */
const AdHeader: React.FC<{
  accentColor: string;
  dotColor: string;
  textColor: string;
  label: string;
  badge: string;
}> = ({ accentColor, dotColor, textColor, label, badge }) => (
  <div className={`flex items-center justify-between px-4 pt-3 pb-2.5 border-b border-slate-100 bg-gradient-to-r ${accentColor}`}>
    <div className="flex items-center gap-2">
      <span className={`w-1.5 h-1.5 rounded-full ${dotColor} animate-pulse block`} />
      <span className={`text-[10px] font-black ${textColor} uppercase tracking-widest`}>{label}</span>
    </div>
    <span className="text-[10px] text-slate-400 bg-white px-2 py-0.5 rounded-full font-semibold border border-slate-200">
      {badge}
    </span>
  </div>
);
