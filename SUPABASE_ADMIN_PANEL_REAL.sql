-- =============================================
-- MAKE ADMIN PANEL FULLY REAL WITH SUPABASE
-- =============================================
-- Run this in Supabase SQL Editor

-- 1) Ensure admin_config table exists with all columns
CREATE TABLE IF NOT EXISTS public.admin_config (
  id INT PRIMARY KEY DEFAULT 1,
  
  -- Earning rates
  survey_reward INT DEFAULT 15,
  captcha_reward INT DEFAULT 20,
  ad_reward INT DEFAULT 20,
  friend_cut_pct INT DEFAULT 10,
  
  -- Limits
  captcha_daily_limit INT DEFAULT 30,
  ad_daily_limit INT DEFAULT 20,
  
  -- Throttle
  throttle_threshold INT DEFAULT 4000,
  throttle_survey_reward INT DEFAULT 5,
  throttle_captcha_reward INT DEFAULT 5,
  throttle_ad_reward INT DEFAULT 5,
  throttle_friend_cut_pct INT DEFAULT 2,
  
  -- Feature toggles
  surveys_enabled BOOLEAN DEFAULT true,
  captcha_enabled BOOLEAN DEFAULT true,
  ads_enabled BOOLEAN DEFAULT true,
  referral_enabled BOOLEAN DEFAULT true,
  wallet_enabled BOOLEAN DEFAULT true,
  leaderboard_enabled BOOLEAN DEFAULT true,
  
  -- Withdrawal toggles
  withdraw_phonepe_enabled BOOLEAN DEFAULT true,
  withdraw_upi_enabled BOOLEAN DEFAULT true,
  withdraw_card_enabled BOOLEAN DEFAULT true,
  withdraw_bank_enabled BOOLEAN DEFAULT true,
  withdraw_crypto_enabled BOOLEAN DEFAULT true,
  
  -- Min withdrawal
  withdraw_phonepe_min INT DEFAULT 5000,
  withdraw_upi_min INT DEFAULT 5000,
  withdraw_card_min INT DEFAULT 10000,
  withdraw_bank_min INT DEFAULT 10000,
  withdraw_crypto_min INT DEFAULT 5000,
  
  -- Maintenance
  maintenance_mode BOOLEAN DEFAULT false,
  maintenance_message TEXT DEFAULT 'We are currently under maintenance. Please check back soon.',
  
  -- Announcement
  announcement_enabled BOOLEAN DEFAULT false,
  announcement_text TEXT DEFAULT '',
  announcement_type TEXT DEFAULT 'info',
  
  -- Admin
  admin_email TEXT DEFAULT 'admin@getme.app',
  
  -- Leaderboard
  leaderboard_title TEXT DEFAULT 'Top Earners 🏆',
  leaderboard_subtitle TEXT DEFAULT 'Compete with other earners worldwide!',
  leaderboard_show_surveys BOOLEAN DEFAULT true,
  leaderboard_show_captchas BOOLEAN DEFAULT true,
  leaderboard_show_badges BOOLEAN DEFAULT true,
  leaderboard_show_podium BOOLEAN DEFAULT true,
  leaderboard_show_your_rank BOOLEAN DEFAULT true,
  leaderboard_entries TEXT DEFAULT '[]',
  leaderboard_badge_legend INT DEFAULT 40000,
  leaderboard_badge_diamond INT DEFAULT 20000,
  leaderboard_badge_platinum INT DEFAULT 10000,
  leaderboard_badge_gold INT DEFAULT 5000,
  leaderboard_badge_silver INT DEFAULT 2000,
  leaderboard_mode TEXT DEFAULT 'manual',
  leaderboard_live_limit INT DEFAULT 50,
  leaderboard_min_coins INT DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add check constraint for leaderboard mode
DO $$ BEGIN
  ALTER TABLE public.admin_config 
  ADD CONSTRAINT admin_config_leaderboard_mode_check 
  CHECK (leaderboard_mode IN ('manual', 'live'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Add check constraint for announcement type
DO $$ BEGIN
  ALTER TABLE public.admin_config 
  ADD CONSTRAINT admin_config_announcement_type_check 
  CHECK (announcement_type IN ('info', 'warning', 'success', 'error'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 2) Insert default config if not exists
INSERT INTO public.admin_config (id)
VALUES (1)
ON CONFLICT (id) DO NOTHING;

-- 3) Add trigger to update updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS admin_config_updated_at ON public.admin_config;
CREATE TRIGGER admin_config_updated_at
  BEFORE UPDATE ON public.admin_config
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- 4) Enable Row Level Security
ALTER TABLE public.admin_config ENABLE ROW LEVEL SECURITY;

-- 5) RLS Policies
-- Everyone can read config
DROP POLICY IF EXISTS "Anyone can read admin config" ON public.admin_config;
CREATE POLICY "Anyone can read admin config"
  ON public.admin_config
  FOR SELECT
  USING (true);

-- Only admins can update config
DROP POLICY IF EXISTS "Only admins can update config" ON public.admin_config;
CREATE POLICY "Only admins can update config"
  ON public.admin_config
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.is_admin = true
    )
  );

-- 6) Enable Realtime for admin_config
ALTER PUBLICATION supabase_realtime ADD TABLE public.admin_config;

-- 7) Grant permissions
GRANT SELECT ON public.admin_config TO authenticated, anon;
GRANT UPDATE ON public.admin_config TO authenticated;

-- 8) Verify setup
SELECT 
  'admin_config table setup complete' as status,
  COUNT(*) as config_rows,
  (SELECT is_admin FROM public.user_profiles WHERE email = 'sahanapraveen2006@gmail.com' LIMIT 1) as admin_status
FROM public.admin_config;

-- =============================================
-- ADMIN PANEL NOW FULLY REAL
-- =============================================
-- All settings save to Supabase
-- Real-time updates push to all users instantly
-- RLS ensures only admins can modify settings
-- Non-admins can read config to respect feature toggles
