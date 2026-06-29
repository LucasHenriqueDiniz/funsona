import { createClient } from "@supabase/supabase-js";
import type { Env } from "../index.js";

export function createServiceClient(env: Env["Bindings"]) {
  return createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export function createAnonClient(env: Env["Bindings"]) {
  return createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
