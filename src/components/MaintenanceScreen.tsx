import React from 'react';
import { Settings, Clock } from 'lucide-react';

interface MaintenanceScreenProps {
  message: string;
}

export const MaintenanceScreen: React.FC<MaintenanceScreenProps> = ({ message }) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-6">
      {/* Background blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-violet-500/5 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 text-center max-w-md w-full">
        {/* Icon */}
        <div className="relative mx-auto mb-6 w-28 h-28">
          <div className="w-28 h-28 rounded-3xl bg-gradient-to-br from-amber-400/20 to-orange-500/20 border border-amber-500/20 flex items-center justify-center">
            <Settings size={52} className="text-amber-400 animate-spin" style={{ animationDuration: '4s' }} />
          </div>
          <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-slate-800 border border-slate-700 rounded-2xl flex items-center justify-center">
            <Clock size={18} className="text-slate-400" />
          </div>
        </div>

        {/* Brand */}
        <div className="flex items-center justify-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
            <span className="text-white font-black text-sm">C</span>
          </div>
          <span className="text-white font-black text-xl">GetMe</span>
        </div>

        <h1 className="text-3xl font-black text-white mb-3">Under Maintenance</h1>
        <p className="text-slate-400 text-base leading-relaxed mb-6">
          {message || 'We are currently performing scheduled maintenance. Please check back soon.'}
        </p>

        {/* Animated dots */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {[0, 1, 2].map(i => (
            <div
              key={i}
              className="w-3 h-3 rounded-full bg-amber-400 animate-bounce"
              style={{ animationDelay: `${i * 0.2}s` }}
            />
          ))}
        </div>

        <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl px-5 py-4">
          <p className="text-slate-400 text-sm">
            We'll be back shortly. Thank you for your patience! 🙏
          </p>
        </div>
      </div>
    </div>
  );
};
