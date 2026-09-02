import { useEffect, useState } from "react";
import { useAuth } from "@clerk/astro/react";
import { apiFetch } from "@/lib/auth-fetch";

// Who is signed in is answered by Clerk's own client state, never by a network
// call. That distinction is the whole point: the navbar used to decide it from
// GET /auth/me, so any API problem — an expired token, a mismatched key, a
// blip — rendered as "you are logged out", complete with a "Criar conta"
// ("Create account") button in front of a signed-in user.
//
// The profile (handle, avatar, XP) still comes from the API, but it is
// enrichment layered on top of a known-signed-in state, and its failure is
// reported as a failure.

export type ProfileError = "unavailable" | "not_found";

export type ProfileState = {
  isLoaded: boolean;
  isSignedIn: boolean;
  profile: UserProfile | null;
  profileError: ProfileError | null;
};

type Cached = { promise: Promise<void>; profile: UserProfile | null; error: ProfileError | null };

// Several islands (navbar, premium gate, engagement rail) want the profile on
// the same page. Without sharing, that's one identical request each.
let cache: Cached | null = null;

function loadProfile(): Cached {
  if (cache) return cache;

  const entry: Cached = { profile: null, error: null, promise: Promise.resolve() };
  entry.promise = apiFetch<UserProfile>("/auth/me", { auth: "required" }).then((res) => {
    if (res.data) {
      entry.profile = res.data;
    } else if (res.status === 404) {
      // Signed into Clerk but no local row yet — the webhook hasn't landed.
      entry.error = "not_found";
    } else if (res.authUnavailable || res.status >= 500 || res.status === 0) {
      entry.error = "unavailable";
    } else {
      entry.error = "unavailable";
    }
  });

  cache = entry;
  return entry;
}

/** Drops the shared profile so the next read refetches (used on sign-out). */
export function resetProfileCache() {
  cache = null;
}

export function useProfile(): ProfileState {
  const { isLoaded, isSignedIn } = useAuth();
  const [state, setState] = useState<{ profile: UserProfile | null; error: ProfileError | null }>({
    profile: null,
    error: null,
  });

  useEffect(() => {
    if (!isLoaded) return;

    if (!isSignedIn) {
      resetProfileCache();
      setState({ profile: null, error: null });
      return;
    }

    let active = true;
    const entry = loadProfile();
    entry.promise.then(() => {
      if (active) setState({ profile: entry.profile, error: entry.error });
    });
    return () => {
      active = false;
    };
  }, [isLoaded, isSignedIn]);

  return {
    isLoaded: !!isLoaded,
    isSignedIn: !!isSignedIn,
    profile: state.profile,
    profileError: state.error,
  };
}
