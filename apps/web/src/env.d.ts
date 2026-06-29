/// <reference types="astro/client" />

interface ImportMetaEnv {
  readonly PUBLIC_API_URL: string;
  readonly PUBLIC_SITE_URL: string;
  readonly PUBLIC_SUPABASE_URL: string;
  readonly PUBLIC_SUPABASE_ANON_KEY: string;
  readonly PUBLIC_GOOGLE_ANALYTICS_ID: string;
  readonly PUBLIC_GOOGLE_ADSENSE_CLIENT: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

interface UserProfile {
  id: string;
  handle: string;
  display_name: string;
  avatar_url?: string;
  avatar_path?: string;
  avatar_source?: "external" | "storage";
  banner_url?: string;
  banner_path?: string;
  banner_source?: "external" | "storage";
  bio?: string;
  xp: number;
  level: number;
  is_premium: boolean;
  is_admin: boolean;
}

declare namespace App {
  interface Locals {
    user?: UserProfile;
  }
}
