import { supabase } from './supabase';

export interface LeaderboardEntry {
  name: string;
  coins: number;
  surveys: number;
  captchas: number;
  avatar: string;
  badge: string;
}

export interface AdminConfig {
  // Earning rates
  survey_reward: number;
  captcha_reward: number;
  ad_reward: number;
  friend_cut_pct: number;

  // Limits
  survey_daily_limit: number;
  captcha_daily_limit: number;
  ad_daily_limit: number;

  // Claim timers (seconds)
  survey_claim_wait_seconds: number;
  captcha_claim_wait_seconds: number;
  ad_view_min_seconds: number;

  // Throttle threshold
  throttle_threshold: number;
  throttle_survey_reward: number;
  throttle_captcha_reward: number;
  throttle_ad_reward: number;
  throttle_friend_cut_pct: number;

  // Feature toggles
  surveys_enabled: boolean;
  captcha_enabled: boolean;
  ads_enabled: boolean;
  referral_enabled: boolean;
  wallet_enabled: boolean;
  leaderboard_enabled: boolean;

  // Withdrawal toggles
  withdraw_phonepe_enabled: boolean;
  withdraw_upi_enabled: boolean;
  withdraw_card_enabled: boolean;
  withdraw_bank_enabled: boolean;
  withdraw_crypto_enabled: boolean;

  // Min withdrawal
  withdraw_phonepe_min: number;
  withdraw_upi_min: number;
  withdraw_card_min: number;
  withdraw_bank_min: number;
  withdraw_crypto_min: number;

  // Maintenance
  maintenance_mode: boolean;
  maintenance_message: string;

  // Announcement
  announcement_enabled: boolean;
  announcement_text: string;
  announcement_type: 'info' | 'warning' | 'success' | 'error';

  // Admin
  admin_email: string;

  // Leaderboard customization
  leaderboard_title: string;
  leaderboard_subtitle: string;
  leaderboard_show_surveys: boolean;
  leaderboard_show_captchas: boolean;
  leaderboard_show_badges: boolean;
  leaderboard_show_podium: boolean;
  leaderboard_show_your_rank: boolean;
  leaderboard_entries: string; // JSON string of LeaderboardEntry[]
  leaderboard_badge_legend: number;
  leaderboard_badge_diamond: number;
  leaderboard_badge_platinum: number;
  leaderboard_badge_gold: number;
  leaderboard_badge_silver: number;

  // Leaderboard data source control
  leaderboard_mode: 'manual' | 'live';
  leaderboard_live_limit: number;
  leaderboard_min_coins: number;
}

export const DEFAULT_CONFIG: AdminConfig = {
  survey_reward: 15,
  captcha_reward: 20,
  ad_reward: 20,
  friend_cut_pct: 10,

  survey_daily_limit: 10,
  captcha_daily_limit: 30,
  ad_daily_limit: 20,

  survey_claim_wait_seconds: 10,
  captcha_claim_wait_seconds: 5,
  ad_view_min_seconds: 5,

  throttle_threshold: 4000,
  throttle_survey_reward: 5,
  throttle_captcha_reward: 5,
  throttle_ad_reward: 5,
  throttle_friend_cut_pct: 2,

  surveys_enabled: true,
  captcha_enabled: true,
  ads_enabled: true,
  referral_enabled: true,
  wallet_enabled: true,
  leaderboard_enabled: true,

  withdraw_phonepe_enabled: true,
  withdraw_upi_enabled: true,
  withdraw_card_enabled: true,
  withdraw_bank_enabled: true,
  withdraw_crypto_enabled: true,

  withdraw_phonepe_min: 5000,
  withdraw_upi_min: 5000,
  withdraw_card_min: 10000,
  withdraw_bank_min: 10000,
  withdraw_crypto_min: 5000,

  maintenance_mode: false,
  maintenance_message: 'We are currently under maintenance. Please check back soon.',

  announcement_enabled: false,
  announcement_text: '',
  announcement_type: 'info',

  admin_email: 'admin@getme.app',

  // Leaderboard defaults
  leaderboard_title: 'Top Earners 🏆',
  leaderboard_subtitle: 'Compete with other earners worldwide!',
  leaderboard_show_surveys: true,
  leaderboard_show_captchas: true,
  leaderboard_show_badges: true,
  leaderboard_show_podium: true,
  leaderboard_show_your_rank: true,
  leaderboard_entries: JSON.stringify([
    { name: 'CryptoKing99',  coins: 48320, surveys: 58, captchas: 890, avatar: '👑', badge: 'Legend'   },
    { name: 'SurveyQueen',   coins: 39150, surveys: 74, captchas: 612, avatar: '🌟', badge: 'Diamond'  },
    { name: 'EarnMaster',    coins: 31200, surveys: 45, captchas: 755, avatar: '💎', badge: 'Diamond'  },
    { name: 'CoinsRain',     coins: 24800, surveys: 40, captchas: 530, avatar: '🏆', badge: 'Platinum' },
    { name: 'GoldHunter',    coins: 19400, surveys: 33, captchas: 410, avatar: '🦁', badge: 'Platinum' },
    { name: 'TaskPro',       coins: 14300, surveys: 28, captchas: 360, avatar: '🦅', badge: 'Gold'     },
    { name: 'BonusHero',     coins: 10900, surveys: 21, captchas: 290, avatar: '🚀', badge: 'Gold'     },
    { name: 'QuickTyper',    coins: 8500,  surveys: 17, captchas: 220, avatar: '⚡', badge: 'Silver'   },
    { name: 'SurveyBot',     coins: 6200,  surveys: 14, captchas: 180, avatar: '🤖', badge: 'Silver'   },
  ]),
  leaderboard_badge_legend: 40000,
  leaderboard_badge_diamond: 20000,
  leaderboard_badge_platinum: 10000,
  leaderboard_badge_gold: 5000,
  leaderboard_badge_silver: 2000,

  leaderboard_mode: 'manual',
  leaderboard_live_limit: 50,
  leaderboard_min_coins: 0,
};

let configCache: AdminConfig = { ...DEFAULT_CONFIG };
let listeners: ((cfg: AdminConfig) => void)[] = [];
let channel: ReturnType<typeof supabase.channel> | null = null;

type SaveAdminResult = {
  ok: boolean;
  error?: string;
};

export function getConfig(): AdminConfig {
  return configCache;
}

export function onConfigChange(fn: (cfg: AdminConfig) => void) {
  listeners.push(fn);
  return () => { listeners = listeners.filter(l => l !== fn); };
}

function notify() {
  listeners.forEach(fn => fn({ ...configCache }));
}

export async function loadAdminConfig() {
  try {
    const { data, error } = await supabase
      .from('admin_config')
      .select('*')
      .eq('id', 1)
      .maybeSingle();

    if (!error && data) {
      configCache = { ...DEFAULT_CONFIG, ...data };
      notify();
    } else {
      // Ensure row exists so admin saves work on fresh databases.
      const { error: bootstrapError } = await supabase
        .from('admin_config')
        .upsert({ id: 1 }, { onConflict: 'id' });

      if (!bootstrapError) {
        const { data: nextData } = await supabase
          .from('admin_config')
          .select('*')
          .eq('id', 1)
          .maybeSingle();

        if (nextData) {
          configCache = { ...DEFAULT_CONFIG, ...nextData };
          notify();
        }
      }
    }
  } catch {
    // Use defaults
  }

  // Subscribe to real-time changes
  if (!channel) {
    channel = supabase
      .channel('admin_config_changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'admin_config',
      }, (payload) => {
        if (payload.new) {
          configCache = { ...DEFAULT_CONFIG, ...(payload.new as Partial<AdminConfig>) };
          notify();
        }
      })
      .subscribe();
  }
}

export async function saveAdminConfig(cfg: Partial<AdminConfig>) {
  try {
    const { data: existingRow } = await supabase
      .from('admin_config')
      .select('*')
      .eq('id', 1)
      .maybeSingle();

    // Backward compatibility with older schemas: only send existing columns.
    const safeCfg = existingRow
      ? (Object.fromEntries(
          Object.entries(cfg).filter(([key]) => key in existingRow),
        ) as Partial<AdminConfig>)
      : cfg;

    const { error } = await supabase
      .from('admin_config')
      .upsert({ id: 1, ...safeCfg }, { onConflict: 'id' });

    if (error) {
      return { ok: false, error: error.message } satisfies SaveAdminResult;
    }

    configCache = { ...configCache, ...safeCfg };
    notify();
    return { ok: true } satisfies SaveAdminResult;
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Unknown admin save error',
    } satisfies SaveAdminResult;
  }
}
