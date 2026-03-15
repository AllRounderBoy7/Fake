import React, { useState } from 'react';
import { Bell, X, AlertTriangle, CheckCircle2, Info, AlertCircle } from 'lucide-react';
import { AdminConfig } from '../lib/adminConfig';

interface AnnouncementBannerProps {
  config: AdminConfig;
}

export const AnnouncementBanner: React.FC<AnnouncementBannerProps> = ({ config }) => {
  const [dismissed, setDismissed] = useState(false);

  if (!config.announcement_enabled || !config.announcement_text || dismissed) return null;

  const styles = {
    info:    { bg: 'bg-blue-600',    icon: <Info size={15} className="text-white" />,          text: 'text-white' },
    warning: { bg: 'bg-amber-500',   icon: <AlertTriangle size={15} className="text-white" />, text: 'text-white' },
    success: { bg: 'bg-emerald-500', icon: <CheckCircle2 size={15} className="text-white" />,  text: 'text-white' },
    error:   { bg: 'bg-red-600',     icon: <AlertCircle size={15} className="text-white" />,   text: 'text-white' },
  };

  const s = styles[config.announcement_type] || styles.info;

  return (
    <div className={`${s.bg} px-4 py-2.5 flex items-center gap-3 z-50 relative`}>
      <Bell size={14} className="text-white/80 flex-shrink-0" />
      <div className="flex items-center gap-2 flex-1 min-w-0">
        {s.icon}
        <p className={`${s.text} text-xs sm:text-sm font-semibold truncate`}>{config.announcement_text}</p>
      </div>
      <button onClick={() => setDismissed(true)} className="text-white/70 hover:text-white transition flex-shrink-0">
        <X size={15} />
      </button>
    </div>
  );
};
