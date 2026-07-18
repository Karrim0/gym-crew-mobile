export const appConfig = {
  name: "Gym Crew",
  slug: "gym-crew-mobile",
  version: "0.1.0",
  scheme: "gymcrew",
  supportEmail: "support@gymcrew.app",
} as const;

export const env = {
  supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL ?? "",
  supabasePublishableKey:
    process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ??
    "",
  webApiUrl: process.env.EXPO_PUBLIC_WEB_API_URL ?? "",
  isConfigured() {
    return Boolean(this.supabaseUrl && this.supabasePublishableKey);
  },
} as const;
