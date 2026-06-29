import { supabase } from "@/lib/supabase";
import { PUBLIC_API_BASE_URL } from "@/lib/public-env";

const DEFAULT_AUTH_REDIRECT = "/explore";
const OAUTH_NEXT_KEY = "funsona-oauth-next";

export function getSafeAuthRedirect(value?: string | null) {
  if (!value) return DEFAULT_AUTH_REDIRECT;
  try {
    const url = new URL(value, window.location.origin);
    if (url.origin !== window.location.origin) return DEFAULT_AUTH_REDIRECT;
    return url.pathname + url.search + url.hash;
  } catch {
    return DEFAULT_AUTH_REDIRECT;
  }
}

export async function beginGoogleOAuth(next = DEFAULT_AUTH_REDIRECT) {
  const redirectTo = `${window.location.origin}/auth/callback`;
  sessionStorage.setItem(OAUTH_NEXT_KEY, getSafeAuthRedirect(next));

  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo },
  });

  if (error) throw error;
}

export async function finalizeOAuthLogin() {
  const hash = window.location.hash.startsWith("#") ? window.location.hash.slice(1) : "";
  const hashParams = new URLSearchParams(hash);
  const queryParams = new URLSearchParams(window.location.search);

  const safeNext = getSafeAuthRedirect(
    queryParams.get("next") || sessionStorage.getItem(OAUTH_NEXT_KEY)
  );
  sessionStorage.removeItem(OAUTH_NEXT_KEY);

  const authError = hashParams.get("error_description") || queryParams.get("error_description");
  if (authError) throw new Error(decodeURIComponent(authError));

  let accessToken = hashParams.get("access_token");

  if (accessToken) {
    window.history.replaceState({}, document.title, "/auth/callback");
  }

  if (!accessToken) {
    const code = queryParams.get("code");
    if (code) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) throw new Error("Erro ao trocar codigo OAuth.");

      const { data } = await supabase.auth.getSession();
      accessToken = data.session?.access_token || null;
    }
  }

  if (!accessToken) throw new Error("Nao foi possivel obter token de acesso.");

  const res = await fetch(`${PUBLIC_API_BASE_URL}/auth/oauth/finalize`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ access_token: accessToken }),
  });
  const json = await res.json().catch(() => null);

  if (!res.ok || !json?.success) {
    throw new Error(json?.error || "Erro ao finalizar sessao.");
  }

  return safeNext;
}
