/// <reference types="astro/client" />
// Declares locals.auth(), locals.authToken and locals.currentUser, which
// clerkMiddleware() populates in src/middleware.ts.
/// <reference types="@clerk/astro/env" />

interface ImportMetaEnv {
  readonly PUBLIC_API_URL: string;
  readonly PUBLIC_SITE_URL: string;
  readonly PUBLIC_CLERK_PUBLISHABLE_KEY: string;
  readonly PUBLIC_GOOGLE_ANALYTICS_ID: string;
  readonly PUBLIC_GOOGLE_ADSENSE_CLIENT: string;
  /** Numeric AdSense ad unit IDs, from the AdSense dashboard. A placement with
   *  no ID configured renders nothing rather than an empty ad box. */
  readonly PUBLIC_ADSENSE_SLOT_QUIZ_LANDING: string;
  readonly PUBLIC_ADSENSE_SLOT_QUIZ_PLAY: string;
  readonly PUBLIC_ADSENSE_SLOT_QUIZ_RESULT: string;
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
    /** The local profile for the signed-in Clerk user; filled lazily by lib/api-server.ts. */
    user?: UserProfile;
  }
}
