import { memo, useEffect, useState, useRef } from 'react';
import { Play, CheckCircle, Clock, AlertCircle, ExternalLink, Sparkles, Users, TrendingUp, Gift } from 'lucide-react';
import { AllAds } from './AdScripts';
import { APP_ENV } from '../lib/env';

interface AdsPageProps {
  onEarn: (amount: number, source: string) => void;
  friendCount: number;
  friendTotalEarned: number;
  adReward: number;
  friendCut: number;
  minAdViewSeconds: number;
}

const SMARTLINK_URL = APP_ENV.SMART_LINK;
const DEFAULT_MIN_AD_VIEW_TIME = APP_ENV.MIN_AD_VIEW_SECONDS;

type Phase = 'idle' | 'waiting' | 'success' | 'failed' | 'claimed';

const AdsPage = memo(({ onEarn, friendCount, friendTotalEarned, adReward, friendCut, minAdViewSeconds }: AdsPageProps) => {
  const MIN_AD_VIEW_TIME = Math.max(1, minAdViewSeconds || DEFAULT_MIN_AD_VIEW_TIME);
  const [phase, setPhase] = useState<Phase>('idle');
  const [adsWatched, setAdsWatched] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [showAlert, setShowAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');
  
  const leaveTimeRef = useRef<number | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Smart Ad Visibility Check using visibilitychange
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (phase !== 'waiting') return;

      if (document.hidden) {
        // User left the tab (went to ad)
        leaveTimeRef.current = Date.now();
        console.log('✅ User left to view ad at:', new Date(leaveTimeRef.current).toLocaleTimeString());
      } else {
        // User came back to our tab
        if (leaveTimeRef.current) {
          const returnTime = Date.now();
          const timeAway = Math.floor((returnTime - leaveTimeRef.current) / 1000); // in seconds
          
          console.log(`✅ User returned after ${timeAway} seconds`);

          if (timeAway < MIN_AD_VIEW_TIME) {
            // TOO FAST - Show alert
            setAlertMessage(`Opps! Task incomplete. Please wait for the page to load fully. (You were only away for ${timeAway}s, need ${MIN_AD_VIEW_TIME}s)`);
            setShowAlert(true);
            setPhase('failed');
            leaveTimeRef.current = null;
          } else {
            // SUCCESS - User stayed long enough
            setAlertMessage('Reward Claimed! ✅');
            setShowAlert(true);
            setPhase('success');
            leaveTimeRef.current = null;
          }
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [phase, MIN_AD_VIEW_TIME]);

  // Elapsed time counter when waiting
  useEffect(() => {
    if (phase === 'waiting') {
      intervalRef.current = setInterval(() => {
        setElapsedTime((prev) => prev + 1);
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      setElapsedTime(0);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [phase]);

  const handleWatchAd = (event: React.MouseEvent<HTMLButtonElement>) => {
    // CRITICAL: Stop the global Adsterra click script from firing
    event.stopPropagation();
    event.preventDefault();
    
    // Open smartlink in new tab
    window.open(SMARTLINK_URL, '_blank', 'noopener,noreferrer');
    setPhase('waiting');
    setShowAlert(false);
    leaveTimeRef.current = null;
    setElapsedTime(0);
  };

  const handleClaimReward = (event: React.MouseEvent<HTMLButtonElement>) => {
    // CRITICAL: Stop the global Adsterra click script from firing
    event.stopPropagation();
    event.preventDefault();
    
    onEarn(adReward, `Ad Watched #${adsWatched + 1}`);
    setAdsWatched((prev) => prev + 1);
    setPhase('claimed');
    setShowAlert(false);
  };

  const handleWatchAnother = (event: React.MouseEvent<HTMLButtonElement>) => {
    // CRITICAL: Stop the global Adsterra click script from firing
    event.stopPropagation();
    event.preventDefault();
    
    setPhase('idle');
    setShowAlert(false);
  };

  const handleRetry = (event: React.MouseEvent<HTMLButtonElement>) => {
    // CRITICAL: Stop the global Adsterra click script from firing
    event.stopPropagation();
    event.preventDefault();
    
    setPhase('idle');
    setShowAlert(false);
  };

  const yourFriendCut = Math.floor(friendTotalEarned * (friendCut / 100));

  return (
    <div className="min-h-screen pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-slate-950/95 backdrop-blur border-b border-slate-800/50 px-4 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-white">Watch Ads & Earn</h1>
            <p className="text-xs text-slate-400 mt-0.5">Click ad → Stay {MIN_AD_VIEW_TIME}s+ → Earn coins</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="bg-gradient-to-br from-violet-500/10 to-fuchsia-500/10 border border-violet-500/30 rounded-lg px-3 py-1.5">
              <p className="text-[10px] text-violet-300 font-medium">Today</p>
              <p className="text-sm font-bold text-white">{adsWatched} ads</p>
            </div>
            <div className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 border border-amber-500/30 rounded-lg px-3 py-1.5">
              <p className="text-[10px] text-amber-300 font-medium">Per Ad</p>
              <p className="text-sm font-bold text-white">{adReward} 🪙</p>
            </div>
          </div>
        </div>
      </div>

      {/* Alert Banner */}
      {showAlert && (
        <div className={`mx-4 mt-4 p-4 rounded-xl border-2 ${
          phase === 'success' 
            ? 'bg-emerald-500/10 border-emerald-500/50' 
            : 'bg-red-500/10 border-red-500/50'
        } flex items-start gap-3 animate-in fade-in slide-in-from-top-2 duration-300`}>
          {phase === 'success' ? (
            <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          )}
          <p className={`text-sm font-medium ${phase === 'success' ? 'text-emerald-100' : 'text-red-100'}`}>
            {alertMessage}
          </p>
        </div>
      )}

      <div className="px-4 py-4 space-y-4">
        {/* Main Ad Watch Card */}
        <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border border-slate-700/50 rounded-2xl overflow-hidden shadow-xl">
          {/* Card Header with Phase Label */}
          <div className={`px-4 py-3 border-b border-slate-700/50 flex items-center justify-between ${
            phase === 'waiting' ? 'bg-violet-500/10' :
            phase === 'success' ? 'bg-emerald-500/10' :
            phase === 'failed' ? 'bg-red-500/10' :
            phase === 'claimed' ? 'bg-blue-500/10' :
            'bg-slate-800/50'
          }`}>
            <div className="flex items-center gap-2">
              {phase === 'idle' && <Play className="w-4 h-4 text-violet-400" />}
              {phase === 'waiting' && <Clock className="w-4 h-4 text-violet-400 animate-pulse" />}
              {phase === 'success' && <CheckCircle className="w-4 h-4 text-emerald-400" />}
              {phase === 'failed' && <AlertCircle className="w-4 h-4 text-red-400" />}
              {phase === 'claimed' && <Sparkles className="w-4 h-4 text-blue-400" />}
              <span className="text-sm font-semibold text-white">
                {phase === 'idle' && 'Ready to Watch'}
                {phase === 'waiting' && 'Waiting for Ad View...'}
                {phase === 'success' && 'Ad Verified!'}
                {phase === 'failed' && 'Task Failed'}
                {phase === 'claimed' && 'Reward Claimed!'}
              </span>
            </div>
            {phase === 'waiting' && (
              <div className="bg-violet-500/20 border border-violet-500/30 rounded-full px-3 py-1">
                <span className="text-xs font-bold text-violet-200">{elapsedTime}s away</span>
              </div>
            )}
          </div>

          {/* Card Body */}
          <div className="p-5">
            {phase === 'idle' && (
              <div className="space-y-4">
                <div className="text-center py-6">
                  <div className="w-16 h-16 bg-gradient-to-br from-violet-500 to-fuchsia-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Play className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">Watch an Ad & Earn {adReward} 🪙</h3>
                  <p className="text-sm text-slate-400">Click the button to open the ad in a new tab</p>
                </div>

                <button
                  onClick={handleWatchAd}
                  className="w-full bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-all duration-200 shadow-lg shadow-violet-500/25 active:scale-98"
                >
                  <Play className="w-5 h-5" />
                  Watch Ad Now
                  <ExternalLink className="w-4 h-4" />
                </button>

                {/* How It Works */}
                <div className="mt-6 bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
                  <h4 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-violet-400" />
                    How It Works
                  </h4>
                  <ol className="space-y-2 text-xs text-slate-300">
                    <li className="flex items-start gap-2">
                      <span className="bg-violet-500/20 text-violet-300 rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0 font-bold text-[10px]">1</span>
                      <span>Click "Watch Ad Now" — ad opens in new tab</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="bg-violet-500/20 text-violet-300 rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0 font-bold text-[10px]">2</span>
                      <span>Wait for the ad page to fully load (minimum {MIN_AD_VIEW_TIME} seconds)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="bg-violet-500/20 text-violet-300 rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0 font-bold text-[10px]">3</span>
                      <span>Come back to this tab</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="bg-violet-500/20 text-violet-300 rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0 font-bold text-[10px]">4</span>
                      <span>Click "Claim Reward" to get your {adReward} 🪙</span>
                    </li>
                  </ol>
                </div>
              </div>
            )}

            {phase === 'waiting' && (
              <div className="space-y-4">
                <div className="text-center py-8">
                  <div className="relative w-20 h-20 mx-auto mb-6">
                    <div className="absolute inset-0 bg-gradient-to-br from-violet-500 to-fuchsia-500 rounded-full animate-ping opacity-20"></div>
                    <div className="relative w-20 h-20 bg-gradient-to-br from-violet-500 to-fuchsia-500 rounded-full flex items-center justify-center">
                      <Clock className="w-10 h-10 text-white animate-pulse" />
                    </div>
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">Waiting for You...</h3>
                   <p className="text-sm text-slate-400 mb-1">Stay on the ad page for at least {MIN_AD_VIEW_TIME} seconds</p>
                  <p className="text-xs text-violet-400 font-medium">You've been away for {elapsedTime} seconds</p>
                </div>

                <div className="bg-violet-500/10 border border-violet-500/30 rounded-xl p-4">
                  <p className="text-xs text-violet-200 text-center">
                    ⏱️ <strong>Don't close the ad tab too quickly!</strong><br/>
                    Return here after the ad fully loads (min {MIN_AD_VIEW_TIME}s)
                  </p>
                </div>
              </div>
            )}

            {phase === 'success' && (
              <div className="space-y-4">
                <div className="text-center py-8">
                  <div className="relative w-20 h-20 mx-auto mb-6">
                    <div className="absolute inset-0 bg-emerald-500 rounded-full animate-ping opacity-30"></div>
                    <div className="relative w-20 h-20 bg-gradient-to-br from-emerald-500 to-green-500 rounded-full flex items-center justify-center animate-bounce-slow">
                      <CheckCircle className="w-12 h-12 text-white" />
                    </div>
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-2">Ad Verified! ✅</h3>
                  <p className="text-sm text-slate-400">You stayed long enough. Claim your reward!</p>
                </div>

                <button
                  onClick={handleClaimReward}
                  className="w-full bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white font-bold py-5 rounded-xl flex items-center justify-center gap-2 transition-all duration-200 shadow-lg shadow-emerald-500/25 active:scale-98 text-lg animate-pulse-slow"
                >
                  <Gift className="w-6 h-6" />
                  Claim Reward: +{adReward} 🪙
                </button>
              </div>
            )}

            {phase === 'failed' && (
              <div className="space-y-4">
                <div className="text-center py-8">
                  <div className="w-20 h-20 bg-gradient-to-br from-red-500 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-6">
                    <AlertCircle className="w-12 h-12 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">Too Fast! ⏱️</h3>
                  <p className="text-sm text-slate-400">You came back too quickly. The ad needs time to load.</p>
                </div>

                <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
                  <p className="text-xs text-red-200 text-center">
                    ⚠️ <strong>Stay on the ad page for at least {MIN_AD_VIEW_TIME} seconds</strong><br/>
                    This ensures the ad fully loads and you get credit.
                  </p>
                </div>

                <button
                  onClick={handleRetry}
                  className="w-full bg-gradient-to-r from-slate-700 to-slate-600 hover:from-slate-600 hover:to-slate-500 text-white font-bold py-4 rounded-xl transition-all duration-200 active:scale-98"
                >
                  Try Again
                </button>
              </div>
            )}

            {phase === 'claimed' && (
              <div className="space-y-4">
                <div className="text-center py-6">
                  <div className="text-6xl mb-4 animate-bounce-slow">🎉</div>
                  <h3 className="text-xl font-bold text-white mb-2">+{adReward} 🪙 Earned!</h3>
                  <p className="text-sm text-slate-400">Keep watching to earn more</p>
                </div>

                <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
                  <p className="text-center text-xs text-blue-200">
                    ♾️ <strong>No daily limit</strong> — watch as many ads as you want!
                  </p>
                </div>

                <button
                  onClick={handleWatchAnother}
                  className="w-full bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-all duration-200 shadow-lg shadow-violet-500/25 active:scale-98"
                >
                  <Play className="w-5 h-5" />
                  Watch Another Ad
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Friend Bonus Card */}
        {friendCount > 0 && (
          <div className="bg-gradient-to-br from-rose-900/30 via-pink-900/30 to-fuchsia-900/30 border border-rose-500/30 rounded-2xl p-4">
            <div className="flex items-start gap-3 mb-3">
              <div className="bg-rose-500/20 rounded-xl p-2">
                <Users className="w-5 h-5 text-rose-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-bold text-white mb-1">Friend Bonus (Passive)</h3>
                <p className="text-xs text-rose-200">You earn {friendCut}% of everything your friends earn</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 mt-3">
              <div className="bg-rose-500/10 border border-rose-500/30 rounded-lg p-2 text-center">
                <p className="text-[10px] text-rose-300 font-medium">Friends</p>
                <p className="text-base font-bold text-white">{friendCount}</p>
              </div>
              <div className="bg-rose-500/10 border border-rose-500/30 rounded-lg p-2 text-center">
                <p className="text-[10px] text-rose-300 font-medium">They Earned</p>
                <p className="text-base font-bold text-white">{friendTotalEarned} 🪙</p>
              </div>
              <div className="bg-amber-500/20 border border-amber-500/40 rounded-lg p-2 text-center">
                <p className="text-[10px] text-amber-300 font-medium">Your Cut</p>
                <p className="text-base font-bold text-amber-200">+{yourFriendCut} 🪙</p>
              </div>
            </div>
          </div>
        )}

        {/* Stats Card */}
        <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border border-slate-700/50 rounded-2xl p-4">
          <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-violet-400" />
            Your Stats
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-3">
              <p className="text-xs text-slate-400 mb-1">Ads Watched</p>
              <p className="text-2xl font-bold text-white">{adsWatched}</p>
            </div>
            <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-3">
              <p className="text-xs text-slate-400 mb-1">Total Earned</p>
              <p className="text-2xl font-bold text-amber-400">{adsWatched * adReward} 🪙</p>
            </div>
          </div>
        </div>

        {/* Ad Zones */}
        <AllAds prefix="ads" />
        <AllAds prefix="ads-extra" accentColor="from-violet-50 to-fuchsia-50" label="More Sponsored Ads" />
        <AllAds prefix="ads-offerwall" accentColor="from-indigo-50 to-violet-50" label="Offerwall Ads" />
        <AllAds prefix="ads-bottom" accentColor="from-purple-50 to-pink-50" label="Top Offers" />
      </div>
    </div>
  );
});

AdsPage.displayName = 'AdsPage';

export default AdsPage;
