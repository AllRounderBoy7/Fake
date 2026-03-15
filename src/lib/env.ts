const asNumber = (value: string | undefined, fallback: number) => {
  if (!value) return fallback;
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

export const APP_ENV = {
  SUPABASE_URL:
    import.meta.env.VITE_SUPABASE_URL ?? 'https://iezxcwdjrgyhwhvotmaj.supabase.co',
  SUPABASE_ANON_KEY:
    import.meta.env.VITE_SUPABASE_ANON_KEY ??
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imllenhjd2Rqcmd5aHdodm90bWFqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMyMzIwMTksImV4cCI6MjA4ODgwODAxOX0.zMUt7-Cjldw0U2u791Y7KhZEWN6x5PaMHYgXLMbViWo',
  SMART_LINK:
    import.meta.env.VITE_AD_SMARTLINK_URL ??
    'https://drainalmost.com/h3afaqfwhx?key=553c3d8daad9d9dfc17c316458eff43c',
  NATIVE_SRC:
    import.meta.env.VITE_AD_NATIVE_SRC ??
    'https://drainalmost.com/bd24abcc61deee18aca3c2f72c84c455/invoke.js',
  NATIVE_ID:
    import.meta.env.VITE_AD_NATIVE_ID ?? 'bd24abcc61deee18aca3c2f72c84c455',
  BANNER_KEY:
    import.meta.env.VITE_AD_BANNER_KEY ?? 'e8c608480b4d087402ceec5182ae718d',
  MIN_AD_VIEW_SECONDS: asNumber(import.meta.env.VITE_MIN_AD_VIEW_SECONDS, 5),
  MIN_CAPTCHA_WAIT_SECONDS: asNumber(import.meta.env.VITE_MIN_CAPTCHA_WAIT_SECONDS, 5),
};

export const validateEnvConfig = () => {
  const errors: string[] = [];
  if (!APP_ENV.SUPABASE_URL.startsWith('https://')) {
    errors.push('VITE_SUPABASE_URL must start with https://');
  }
  if (!APP_ENV.SUPABASE_ANON_KEY) {
    errors.push('VITE_SUPABASE_ANON_KEY is required');
  }
  if (!APP_ENV.SMART_LINK.startsWith('http')) {
    errors.push('VITE_AD_SMARTLINK_URL must be a valid URL');
  }
  return errors;
};
