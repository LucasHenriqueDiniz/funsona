// Single allowlist of origins we trust, shared by two consumers that must
// agree: the CORS policy (which browser origins may call us) and Clerk's
// `authorizedParties` check (which origins may have minted the session token
// we're verifying). They used to be defined only in the CORS config, and
// `authorizedParties` wasn't passed at all — meaning a token minted for any
// other app on the same Clerk instance was accepted.

const PROD_HOSTS = new Set(["funsona.com", "www.funsona.com", "api.funsona.com", "funsona-v2.pages.dev"]);

const DEV_ORIGINS = ["http://localhost:4321", "http://localhost:3000"];

/** Origins that always count, before looking at the request's own Origin header. */
export function baseOrigins(environment: string): string[] {
  return environment === "development" ? [...DEV_ORIGINS] : ["https://funsona.com", "https://www.funsona.com"];
}

export function isAllowedOrigin(origin: string, environment: string): boolean {
  if (!origin) return false;
  if (environment === "development") return DEV_ORIGINS.includes(origin);

  try {
    const { hostname } = new URL(origin);
    return (
      PROD_HOSTS.has(hostname) ||
      hostname.endsWith(".funsona.com") ||
      hostname.endsWith(".funsona-v2.pages.dev")
    );
  } catch {
    return false;
  }
}

// Clerk matches `authorizedParties` as exact strings — no wildcards — so a
// preview deploy's unpredictable hostname can't be listed up front. Admit the
// request's own Origin only when it passes the same allowlist CORS uses.
export function authorizedPartiesFor(origin: string | undefined, environment: string): string[] {
  const parties = baseOrigins(environment);
  if (origin && isAllowedOrigin(origin, environment) && !parties.includes(origin)) {
    parties.push(origin);
  }
  return parties;
}
