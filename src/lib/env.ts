const asNumber = (value: string | undefined, fallback: number) => {
  if (!value) return fallback;
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

export const APP_ENV = {
  SUPABASE_URL:
    import.meta.env.VITE_SUPABASE_URL ?? 'https://xsiycnqqgadtjmkolftx.supabase.co',
  SUPABASE_ANON_KEY:
    import.meta.env.VITE_SUPABASE_ANON_KEY ??
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhzaXljbnFxZ2FkdGpta29sZnR4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEwNjk0NzAsImV4cCI6MjA5NjY0NTQ3MH0.kD01DmetEkwzp5eYf96nGlHRaIAwYqW05OqnsUCjvBs',
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
