import { PUBLIC_API_BASE_URL, PUBLIC_API_ORIGIN } from "@/lib/public-env";
import { getClerkIfLoaded } from "@/lib/clerk-client";

// The single way the browser talks to the API.
//
// Every call used to be a hand-rolled `fetch(..., { credentials: "include" })`
// relying on Clerk's session cookie reaching api.funsona.com. That cookie is
// never sent from a *.pages.dev preview or from localhost (cross-site), so
// auth silently didn't exist outside production — and a rejected cookie was
// indistinguishable from being logged out. We send a Clerk session token as a
// Bearer header instead, which travels from any origin. The API accepts both
// (@clerk/backend's authenticateRequest handles cookie and Bearer), so the
// cookie stays on as a fallback until every call site has moved.

export type ApiResult<T> = {
  data: T | null;
  error: string | null;
  meta: unknown;
  status: number;
  /** The server is sure nobody is signed in. */
  unauthenticated: boolean;
  /** The server could not verify the credential we sent — a config/outage problem, NOT a logged-out user. */
  authUnavailable: boolean;
};

export type ApiFetchInit = Omit<RequestInit, "credentials"> & {
  /**
   * "optional" (default) attaches a token when there is one.
   * "none" never attaches one — for public endpoints.
   * "required" skips the request entirely when signed out, returning `unauthenticated`.
   */
  auth?: "required" | "optional" | "none";
};

/** Resolves a fresh Clerk session token, or null when signed out / Clerk unavailable. */
export async function getSessionToken(opts?: { skipCache?: boolean }): Promise<string | null> {
  const clerk = await getClerkIfLoaded();
  if (!clerk?.session) return null;
  try {
    return await clerk.session.getToken(opts?.skipCache ? { skipCache: true } : undefined);
  } catch {
    return null;
  }
}

/** `/media/*` is served by the same Worker but sits outside the /api prefix. */
export function apiUrl(path: string): string {
  const base = path.startsWith("/media") ? PUBLIC_API_ORIGIN : PUBLIC_API_BASE_URL;
  return `${base}${path}`;
}

function buildHeaders(init: ApiFetchInit | undefined, token: string | null, json: boolean): Headers {
  const headers = new Headers(init?.headers);
  // FormData must set its own multipart boundary, so Content-Type is only ours
  // to set when we're sending JSON.
  if (json && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);
  return headers;
}

async function send(path: string, init: ApiFetchInit | undefined, json: boolean): Promise<Response | null> {
  const mode = init?.auth ?? "optional";
  let token = mode === "none" ? null : await getSessionToken();
  if (mode === "required" && !token) return null;

  const url = apiUrl(path);
  const run = (bearer: string | null) =>
    fetch(url, { ...init, headers: buildHeaders(init, bearer, json), credentials: "include" });

  let res = await run(token);

  // A token can expire between minting and arrival. Retry exactly once with a
  // freshly minted one; a second 401 is a real answer.
  if (res.status === 401 && token) {
    token = await getSessionToken({ skipCache: true });
    if (token) res = await run(token);
  }

  return res;
}

export async function apiFetch<T = unknown>(path: string, init?: ApiFetchInit): Promise<ApiResult<T>> {
  const unauthenticatedResult: ApiResult<T> = {
    data: null,
    error: "Unauthorized",
    meta: null,
    status: 401,
    unauthenticated: true,
    authUnavailable: false,
  };

  let res: Response | null;
  try {
    res = await send(path, init, !(init?.body instanceof FormData) && init?.body !== undefined);
  } catch {
    return { data: null, error: "Network error", meta: null, status: 0, unauthenticated: false, authUnavailable: false };
  }
  if (!res) return unauthenticatedResult;

  const body = (await res.json().catch(() => null)) as
    | { data?: T; error?: string; meta?: unknown; code?: string }
    | null;

  const code = body?.code;
  return {
    data: res.ok ? (body?.data ?? null) : null,
    error: res.ok ? (body?.error ?? null) : (body?.error ?? `HTTP ${res.status}`),
    meta: body?.meta ?? null,
    status: res.status,
    unauthenticated: code === "unauthenticated" || (res.status === 401 && !code),
    authUnavailable: code === "auth_unavailable",
  };
}

/** For requests whose body isn't JSON (file uploads) or whose response isn't. */
export async function apiFetchRaw(path: string, init?: ApiFetchInit): Promise<Response | null> {
  return send(path, init, false);
}
