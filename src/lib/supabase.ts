import { createClient } from '@supabase/supabase-js';
import { APP_ENV } from './env';

export const supabase = createClient(APP_ENV.SUPABASE_URL, APP_ENV.SUPABASE_ANON_KEY);
