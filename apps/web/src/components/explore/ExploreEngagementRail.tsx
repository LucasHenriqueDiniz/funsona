import { useEffect, useMemo, useState } from "react";
import { PUBLIC_API_BASE_URL } from "@/lib/public-env";

type LeaderboardWindow = "weekly" | "monthly";

type LeaderboardEntry = {
  id: string;
  xp_weekly: number;
  xp_monthly: number;
  profiles?: {
    handle?: string;
    display_name?: string;
    avatar_url?: string;
    level?: number;
  };
};

const API_BASE = PUBLIC_API_BASE_URL;

const badgeByIndex = ["🥇", "🥈", "🥉"];

type MyRank = {
  rank: number;
  xp: number;
  window: string;
  profile?: {
    handle?: string;
    display_name?: string;
    avatar_url?: string;
    level?: number;
  } | null;
};

type AuthUser = {
  handle?: string;
  display_name?: string;
};

export default function ExploreEngagementRail() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [leaderboardWindow, setLeaderboardWindow] = useState<LeaderboardWindow>("weekly");
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [myRank, setMyRank] = useState<MyRank | null>(null);
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadStatic() {
      const [authRes] = await Promise.all([
        fetch(`${API_BASE}/auth/me`, { credentials: "include", headers: { Accept: "application/json" } }),
      ]);

      const authJson = await authRes.json().catch(() => null);

      if (cancelled) return;

      const logged = !!authJson?.success;
      setIsLoggedIn(logged);
      setAuthUser(logged ? authJson?.data || null : null);
    }

    loadStatic().catch(() => {
      if (!cancelled) {
        setIsLoggedIn(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadLeaderboard() {
      const res = await fetch(`${API_BASE}/leaderboard?window=${leaderboardWindow}&limit=3`, {
        headers: { Accept: "application/json" },
      });
      const json = await res.json().catch(() => null);
      if (!cancelled) {
        setLeaderboard(json?.success ? json.data || [] : []);
      }

      if (isLoggedIn) {
        const meRes = await fetch(`${API_BASE}/leaderboard/me?window=${leaderboardWindow}`, {
          credentials: "include",
          headers: { Accept: "application/json" },
        });
        const meJson = await meRes.json().catch(() => null);
        if (!cancelled) {
          setMyRank(meJson?.success ? meJson.data || null : null);
        }
      } else if (!cancelled) {
        setMyRank(null);
      }
    }

    loadLeaderboard().catch(() => {
      if (!cancelled) setLeaderboard([]);
    });

    return () => {
      cancelled = true;
    };
  }, [leaderboardWindow, isLoggedIn]);

  const rankingRows = useMemo(
    () =>
      leaderboard.map((entry, idx) => {
        const xp = leaderboardWindow === "weekly" ? entry.xp_weekly || 0 : entry.xp_monthly || 0;
        const leaderXp = leaderboardWindow === "weekly" ? leaderboard[0]?.xp_weekly || xp || 0 : leaderboard[0]?.xp_monthly || xp || 0;
        return {
          rank: idx + 1,
          medal: badgeByIndex[idx] || "#",
          name: entry.profiles?.display_name || "Anonimo",
          handle: entry.profiles?.handle || "",
          avatar: entry.profiles?.avatar_url || "",
          xp,
          gap: Math.max(0, leaderXp - xp),
        };
      }),
    [leaderboard, leaderboardWindow]
  );

  const inferredRank = useMemo(() => {
    if (!isLoggedIn || !authUser?.handle) return null;
    const found = rankingRows.find((row) => row.handle && row.handle === authUser.handle);
    if (!found) return null;
    return { rank: found.rank, xp: found.xp };
  }, [isLoggedIn, authUser, rankingRows]);

  return (
    <section className="space-y-5">
      <article className="relative overflow-hidden rounded-[2rem] border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-5 shadow-2xl shadow-slate-950/10 sm:p-7">
        <div className="pointer-events-none absolute -left-20 -top-20 h-72 w-72 rounded-full bg-cyan-400/12 blur-3xl"></div>
        <div className="pointer-events-none absolute -right-16 top-10 h-64 w-64 rounded-full bg-indigo-500/10 blur-3xl"></div>
        <div className="pointer-events-none absolute -bottom-24 left-1/3 h-72 w-72 rounded-full bg-brand-500/10 blur-3xl"></div>
        <div className="pointer-events-none absolute inset-0 opacity-30 [background:linear-gradient(120deg,transparent_0%,rgba(255,255,255,0.04)_45%,transparent_70%)]"></div>

        <div className="relative mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--color-text-muted)]">Ranking em destaque</p>
            <h3 className="text-2xl font-black tracking-tight text-[var(--color-text-primary)] sm:text-3xl">Top jogadores da comunidade</h3>
            <p className="mt-1 text-sm text-[var(--color-text-secondary)]">Quem mais pontua ganha visibilidade. Jogue para entrar no pódio.</p>
          </div>
          <div className="inline-flex rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-1">
            <button
              type="button"
              onClick={() => setLeaderboardWindow("weekly")}
              className={`rounded-lg px-3 py-1.5 text-xs font-black transition ${
                leaderboardWindow === "weekly" ? "bg-brand-600 text-white" : "text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
              }`}
            >
              Semanal
            </button>
            <button
              type="button"
              onClick={() => setLeaderboardWindow("monthly")}
              className={`rounded-lg px-3 py-1.5 text-xs font-black transition ${
                leaderboardWindow === "monthly" ? "bg-brand-600 text-white" : "text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
              }`}
            >
              Mensal
            </button>
          </div>
        </div>

        {rankingRows.length > 0 ? (
          <div className="relative grid gap-3 lg:grid-cols-3">
            {rankingRows.map((row) => (
            <a
              key={`${row.rank}-${row.handle}`}
              href={row.handle ? `/profile/${row.handle}` : "/leaderboard"}
              className={`group relative overflow-hidden rounded-2xl border bg-[var(--color-surface)]/90 p-4 transition hover:-translate-y-0.5 hover:shadow-xl ${row.rank === 1 ? "border-amber-300/40 hover:shadow-amber-500/10" : "border-[var(--color-border)] hover:border-brand-300 hover:shadow-brand-500/10"}`}
            >
              <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                <div className="h-full w-full bg-gradient-to-br from-brand-500/10 via-transparent to-cyan-400/10"></div>
              </div>

              <div className="relative mb-3 flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2.5">
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] text-base shadow-sm">
                    {row.medal}
                  </span>
                  <div className="h-9 w-9 overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)]">
                    {row.avatar ? (
                      <img
                        src={row.avatar}
                        alt={row.name}
                        className="h-full w-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-xs font-black text-[var(--color-text-muted)]">
                        {row.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-black text-[var(--color-text-primary)]">{row.name}</p>
                    <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--color-text-muted)]">Top {row.rank}</p>
                  </div>
                </div>
                <span className={`rounded-full px-2.5 py-1 text-xs font-black ${row.rank === 1 ? "bg-amber-400/15 text-amber-600" : "bg-brand-500/10 text-brand-600"}`}>{row.xp.toLocaleString()} XP</span>
              </div>

              {row.rank === 1 ? (
                <p className="relative text-xs font-bold text-emerald-600">Lider atual</p>
              ) : (
                <p className="relative text-xs font-bold text-[var(--color-text-muted)]">Faltam {row.gap.toLocaleString()} XP para liderar</p>
              )}
            </a>
            ))}
          </div>
        ) : (
          <div className="relative overflow-hidden rounded-2xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface)]/80 px-6 py-10 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-500/10 text-2xl">🏁</div>
            <p className="text-lg font-black text-[var(--color-text-primary)]">Ainda sem pontuacao nesta janela</p>
            <p className="mt-1 text-sm text-[var(--color-text-muted)]">
              {leaderboardWindow === "weekly" ? "Comece a semana liderando o ranking." : "Ainda da tempo de subir no ranking deste mes."}
            </p>
            <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
              <a href="/explore" className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-black text-white transition hover:bg-brand-700">Jogar quizzes</a>
              <a href="/leaderboard" className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-4 py-2 text-sm font-bold text-[var(--color-text-secondary)] transition hover:border-brand-300 hover:text-brand-600">Ver ranking geral</a>
            </div>
          </div>
        )}

        <div className="relative mt-5 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]/65 px-4 py-3">
          {!isLoggedIn ? (
            <a href="/login" className="rounded-xl border border-brand-400/30 bg-brand-500/10 px-3 py-2 text-xs font-black text-brand-600 transition hover:bg-brand-500/15">
              Logue para competir e aparecer aqui
            </a>
          ) : (
            <div className="flex items-center gap-2">
              {myRank?.profile?.avatar_url ? (
                <img src={myRank.profile.avatar_url} alt="Seu avatar" className="h-8 w-8 rounded-lg object-cover" loading="lazy" />
              ) : (
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--color-surface-muted)] text-xs font-black text-[var(--color-text-muted)]">
                  {(myRank?.profile?.display_name || "?").charAt(0).toUpperCase()}
                </div>
              )}
              <span className="text-xs font-bold text-[var(--color-text-muted)]">
                {myRank
                  ? `Voce esta em #${myRank.rank} com ${myRank.xp.toLocaleString()} XP`
                  : inferredRank
                    ? `Voce esta em #${inferredRank.rank} com ${inferredRank.xp.toLocaleString()} XP`
                    : "Voce ainda nao pontuou nesta janela"}
              </span>
            </div>
          )}
          <a href="/leaderboard" className="text-sm font-black text-brand-600 transition hover:translate-x-0.5 hover:text-brand-700">
            Ver ranking completo →
          </a>
        </div>
      </article>
    </section>
  );
}
