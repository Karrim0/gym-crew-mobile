export const appConfig = {
  name: "Gym Crew",
  slug: "kareem-hanafy",
  version: "1.0.0",
  scheme: "gymcrew",
  buildNumber: 8,
} as const;

export const env = {
  supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL ?? "",
  supabasePublishableKey:
    process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY
    ?? process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
    ?? "",
  webApiUrl: process.env.EXPO_PUBLIC_WEB_API_URL ?? "",
  isConfigured() {
    return Boolean(this.supabaseUrl && this.supabasePublishableKey);
  },
} as const;
