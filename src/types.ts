export type Tab = 'dashboard' | 'wallet' | 'leaderboard' | 'ads' | 'referral';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
}

export interface Survey {
  id: number;
  title: string;
  description: string;
  reward: number;
  questions: Question[];
  duration: string;
  category: string;
  completed: boolean;
}

export interface Question {
  id: number;
  text: string;
  type: 'radio' | 'checkbox' | 'text';
  options?: string[];
}

export type CaptchaType =
  | 'alphanumeric'
  | 'math_add'
  | 'math_sub'
  | 'math_mul'
  | 'math_div'
  | 'math_complex'
  | 'word'
  | 'sequence'
  | 'roman'
  | 'pattern'
  | 'emoji_count'
  | 'missing_number'
  | 'reverse'
  | 'case_mix';

export interface CaptchaTask {
  id: number;
  text: string;
  displayText?: string;
  reward: number;
  type: CaptchaType;
  timeLimit: number;
  difficulty: 'easy' | 'medium' | 'hard';
  hint?: string;
}

export interface Transaction {
  id: number;
  type: 'earn' | 'withdraw';
  source: string;
  amount: number;
  date: string;
}

export interface UserStats {
  coins: number;
  surveysCompleted: number;
  captchasSolved: number;
  totalEarned: number;
  level: number;
  xp: number;
  streak: number;
}

export interface Referral {
  id: string;
  referrer_id: string;
  referred_id: string;
  referred_name: string;
  referred_email: string;
  status: 'pending' | 'active' | 'rewarded';
  coins_earned: number;      // total coins THIS friend has earned
  your_cut: number;          // 10% of coins_earned that you received
  joined_at: string;
  last_active?: string;
}

export interface ReferralStats {
  total_referrals: number;
  active_referrals: number;
  total_coins_earned: number;
  referral_code: string;
}
