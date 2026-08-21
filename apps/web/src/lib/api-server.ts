import type { APIContext } from "astro";
import { PUBLIC_API_BASE_URL, PUBLIC_API_ORIGIN } from "@/lib/public-env";

// Server-side twin of lib/auth-fetch.ts, for .astro pages rendering on the
// Worker. clerkMiddleware() puts a short-lived session token on
// locals.authToken; we forward that as a Bearer header rather than replaying
// the browser's raw Cookie header, which is what the pages used to do.

export type ServerResult<T> = {
  data: T | null;
  error: string | null;
  meta: unknown;
  status: number;
};

export async function apiFetchServer<T = unknown>(
  context: APIContext,
  path: string,
  init?: RequestInit
): Promise<ServerResult<T>> {
  const base = path.startsWith("/media") ? PUBLIC_API_ORIGIN : PUBLIC_API_BASE_URL;
  const headers = new Headers(init?.headers);
  headers.set("Accept", "application/json");

  const token = context.locals.authToken;
  if (token) headers.set("Authorization", `Bearer ${token}`);

  let res: Response;
  try {
    res = await fetch(`${base}${path}`, { ...init, headers });
  } catch {
    return { data: null, error: "Network error", meta: null, status: 0 };
  }

  const body = (await res.json().catch(() => null)) as
    | { data?: T; error?: string; meta?: unknown }
    | null;

  return {
    data: res.ok ? (body?.data ?? null) : null,
    error: res.ok ? (body?.error ?? null) : (body?.error ?? `HTTP ${res.status}`),
    meta: body?.meta ?? null,
    status: res.status,
  };
}

/**
 * The signed-in user's local profile, or null. Memoized on `locals` so several
 * components on one page don't each pay for the round-trip.
 */
export async function getProfile(context: APIContext): Promise<UserProfile | null> {
  if (context.locals.user) return context.locals.user;
  if (!context.locals.authToken) return null;

  const { data } = await apiFetchServer<UserProfile>(context, "/auth/me");
  if (data) context.locals.user = data;
  return data;
}
