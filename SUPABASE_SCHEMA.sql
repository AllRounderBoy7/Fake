-- ═══════════════════════════════════════════════════════════════════════════
-- COINEARN - SUPABASE DATABASE SCHEMA
-- Production Ready SQL for Supabase
-- ═══════════════════════════════════════════════════════════════════════════

-- ┌─────────────────────────────────────────────────────────────────────────┐
-- │ 1. ADMIN CONFIG TABLE                                                    │
-- │ Stores all app configuration (single row, id=1)                         │
-- └─────────────────────────────────────────────────────────────────────────┘

CREATE TABLE IF NOT EXISTS admin_config (
  id INTEGER PRIMARY KEY DEFAULT 1,
  
  -- Earning rewards
  survey_reward INTEGER DEFAULT 15,
  captcha_reward INTEGER DEFAULT 20,
  ad_reward INTEGER DEFAULT 20,
  friend_cut_pct INTEGER DEFAULT 10,
  
  -- Daily limits
  captcha_daily_limit INTEGER DEFAULT 30,
  ad_daily_limit INTEGER DEFAULT 20,
  
  -- Throttle system (triggers when user earns X total coins)
  throttle_threshold INTEGER DEFAULT 4000,
  throttle_survey_reward INTEGER DEFAULT 5,
  throttle_captcha_reward INTEGER DEFAULT 5,
  throttle_ad_reward INTEGER DEFAULT 5,
  throttle_friend_cut_pct INTEGER DEFAULT 2,
  
  -- Feature toggles
  surveys_enabled BOOLEAN DEFAULT true,
  captcha_enabled BOOLEAN DEFAULT true,
  ads_enabled BOOLEAN DEFAULT true,
  referral_enabled BOOLEAN DEFAULT true,
  wallet_enabled BOOLEAN DEFAULT true,
  leaderboard_enabled BOOLEAN DEFAULT true,
  
  -- Withdrawal method toggles
  withdraw_phonepe_enabled BOOLEAN DEFAULT true,
  withdraw_upi_enabled BOOLEAN DEFAULT true,
  withdraw_card_enabled BOOLEAN DEFAULT true,
  withdraw_bank_enabled BOOLEAN DEFAULT true,
  withdraw_crypto_enabled BOOLEAN DEFAULT true,
  
  -- Withdrawal minimums
  withdraw_phonepe_min INTEGER DEFAULT 5000,
  withdraw_upi_min INTEGER DEFAULT 5000,
  withdraw_card_min INTEGER DEFAULT 10000,
  withdraw_bank_min INTEGER DEFAULT 10000,
  withdraw_crypto_min INTEGER DEFAULT 5000,
  
  -- Maintenance mode
  maintenance_mode BOOLEAN DEFAULT false,
  maintenance_message TEXT DEFAULT 'We are currently under maintenance. Please check back soon!',
  
  -- Announcement banner
  announcement_enabled BOOLEAN DEFAULT false,
  announcement_text TEXT DEFAULT '',
  announcement_type TEXT DEFAULT 'info', -- info, warning, success, error
  
  -- Leaderboard customization
  leaderboard_title TEXT DEFAULT 'Leaderboard',
  leaderboard_subtitle TEXT DEFAULT 'Compete with other earners worldwide!',
  leaderboard_show_surveys BOOLEAN DEFAULT true,
  leaderboard_show_captchas BOOLEAN DEFAULT true,
  leaderboard_show_badges BOOLEAN DEFAULT true,
  leaderboard_show_podium BOOLEAN DEFAULT true,
  leaderboard_show_your_rank BOOLEAN DEFAULT true,
  leaderboard_badge_legend INTEGER DEFAULT 40000,
  leaderboard_badge_diamond INTEGER DEFAULT 20000,
  leaderboard_badge_platinum INTEGER DEFAULT 10000,
  leaderboard_badge_gold INTEGER DEFAULT 5000,
  leaderboard_badge_silver INTEGER DEFAULT 2000,
  leaderboard_entries TEXT DEFAULT '[]',
  
  -- Admin
  admin_email TEXT DEFAULT 'admin@coinearn.app',
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default config row
INSERT INTO admin_config (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- Enable realtime for admin_config
ALTER PUBLICATION supabase_realtime ADD TABLE admin_config;


-- ┌─────────────────────────────────────────────────────────────────────────┐
-- │ 2. USER PROFILES TABLE                                                   │
-- │ Extended user data (coins, stats, etc.)                                 │
-- └─────────────────────────────────────────────────────────────────────────┘

CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  
  -- Coins & earnings
  coins INTEGER DEFAULT 0,
  total_earned INTEGER DEFAULT 0,
  total_withdrawn INTEGER DEFAULT 0,
  
  -- Stats
  surveys_completed INTEGER DEFAULT 0,
  captchas_solved INTEGER DEFAULT 0,
  ads_watched INTEGER DEFAULT 0,
  
  -- Level & XP
  level INTEGER DEFAULT 1,
  xp INTEGER DEFAULT 0,
  streak INTEGER DEFAULT 0,
  
  -- Referral
  referral_code TEXT UNIQUE,
  referred_by UUID REFERENCES user_profiles(id),
  referral_earnings INTEGER DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_active TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Policies: Users can only read/update their own profile
CREATE POLICY "Users can view own profile" ON user_profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON user_profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON user_profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE user_profiles;


-- ┌─────────────────────────────────────────────────────────────────────────┐
-- │ 3. REFERRALS TABLE                                                       │
-- │ Tracks referral relationships and earnings                              │
-- └─────────────────────────────────────────────────────────────────────────┘

CREATE TABLE IF NOT EXISTS referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Referrer (the one who shared the code)
  referrer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referrer_email TEXT,
  referrer_name TEXT,
  
  -- Referred (the new user who signed up)
  referred_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  referred_email TEXT,
  referred_name TEXT,
  
  -- Stats
  referred_earnings INTEGER DEFAULT 0,  -- Total coins the referred user earned
  referrer_cut INTEGER DEFAULT 0,       -- 10% cut the referrer received
  
  -- Status
  status TEXT DEFAULT 'pending', -- pending, active, rewarded
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_active TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view own referrals" ON referrals
  FOR SELECT USING (auth.uid() = referrer_id OR auth.uid() = referred_id);

CREATE POLICY "Users can insert referrals" ON referrals
  FOR INSERT WITH CHECK (auth.uid() = referrer_id);

CREATE POLICY "Users can update own referrals" ON referrals
  FOR UPDATE USING (auth.uid() = referrer_id);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE referrals;


-- ┌─────────────────────────────────────────────────────────────────────────┐
-- │ 4. TRANSACTIONS TABLE                                                    │
-- │ Complete transaction history                                            │
-- └─────────────────────────────────────────────────────────────────────────┘

CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Transaction details
  type TEXT NOT NULL, -- 'earn' or 'withdraw'
  source TEXT NOT NULL, -- 'Survey: Lifestyle', 'CAPTCHA: Math', 'Ad Watch', 'Referral', etc.
  amount INTEGER NOT NULL,
  
  -- For withdrawals
  method TEXT, -- 'phonepe', 'upi', 'bank', 'crypto', etc.
  account_info TEXT, -- masked account info
  status TEXT DEFAULT 'completed', -- pending, completed, failed
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view own transactions" ON transactions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own transactions" ON transactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);


-- ┌─────────────────────────────────────────────────────────────────────────┐
-- │ 5. WITHDRAWALS TABLE                                                     │
-- │ Withdrawal requests for admin review                                    │
-- └─────────────────────────────────────────────────────────────────────────┘

CREATE TABLE IF NOT EXISTS withdrawals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Withdrawal details
  method TEXT NOT NULL,
  amount_coins INTEGER NOT NULL,
  amount_inr DECIMAL(10,2) NOT NULL,
  
  -- Account info (encrypted in production)
  account_name TEXT,
  account_number TEXT,
  upi_id TEXT,
  wallet_address TEXT,
  
  -- Status
  status TEXT DEFAULT 'pending', -- pending, processing, completed, rejected
  admin_note TEXT,
  processed_by UUID REFERENCES auth.users(id),
  processed_at TIMESTAMPTZ,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE withdrawals ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view own withdrawals" ON withdrawals
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own withdrawals" ON withdrawals
  FOR INSERT WITH CHECK (auth.uid() = user_id);


-- ┌─────────────────────────────────────────────────────────────────────────┐
-- │ 6. HELPER FUNCTIONS                                                      │
-- └─────────────────────────────────────────────────────────────────────────┘

-- Function to generate unique referral code
CREATE OR REPLACE FUNCTION generate_referral_code()
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result TEXT := 'CE-';
  i INTEGER;
BEGIN
  FOR i IN 1..6 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Function to auto-create user profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_profiles (id, email, full_name, referral_code)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    generate_referral_code()
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-create profile
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_admin_config_updated_at
  BEFORE UPDATE ON admin_config
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_referrals_updated_at
  BEFORE UPDATE ON referrals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_withdrawals_updated_at
  BEFORE UPDATE ON withdrawals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ┌─────────────────────────────────────────────────────────────────────────┐
-- │ 7. INDEXES FOR PERFORMANCE                                               │
-- └─────────────────────────────────────────────────────────────────────────┘

CREATE INDEX IF NOT EXISTS idx_user_profiles_referral_code ON user_profiles(referral_code);
CREATE INDEX IF NOT EXISTS idx_user_profiles_referred_by ON user_profiles(referred_by);
CREATE INDEX IF NOT EXISTS idx_referrals_referrer_id ON referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referred_id ON referrals(referred_id);
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_withdrawals_user_id ON withdrawals(user_id);
CREATE INDEX IF NOT EXISTS idx_withdrawals_status ON withdrawals(status);


-- ═══════════════════════════════════════════════════════════════════════════
-- END OF SCHEMA
-- ═══════════════════════════════════════════════════════════════════════════
