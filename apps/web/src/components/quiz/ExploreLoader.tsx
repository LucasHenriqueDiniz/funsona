import { useState, useEffect } from "react";
import { PUBLIC_API_BASE_URL } from "@/lib/public-env";

interface Quiz {
  id: string;
  slug: string;
  title: string;
  description?: string;
  cover_url?: string;
  type: string;
  likes_count: number;
  attempts_count: number;
  tags?: string[];
}

interface ExploreMeta {
  total: number;
  limit: number;
  page: number;
}

function SkeletonCard() {
  return (
    <div className="overflow-hidden rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] animate-pulse">
      <div className="aspect-[4/3] bg-[var(--color-surface-muted)]"></div>
      <div className="p-5 space-y-3">
        <div className="h-5 bg-[var(--color-surface-muted)] rounded-full w-3/4"></div>
        <div className="h-4 bg-[var(--color-surface-muted)] rounded-full w-full"></div>
        <div className="h-4 bg-[var(--color-surface-muted)] rounded-full w-2/3"></div>
        <div className="flex gap-4">
          <div className="h-3 bg-[var(--color-surface-muted)] rounded-full w-16"></div>
          <div className="h-3 bg-[var(--color-surface-muted)] rounded-full w-16"></div>
        </div>
      </div>
    </div>
  );
}

function QuizCard({ quiz }: { quiz: Quiz }) {
  return (
    <article className="group relative overflow-hidden rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] transition-all duration-300 hover:-translate-y-1.5 hover:border-brand-400/40 hover:shadow-2xl hover:shadow-brand-500/10">
      <a href={`/quiz/${quiz.slug}`} className="block">
        <div className="relative aspect-[4/3] overflow-hidden">
          {quiz.cover_url ? (
            <img src={quiz.cover_url} alt={quiz.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" loading="lazy" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-brand-600 via-brand-700 to-accent-600 flex items-center justify-center">
              <span className="text-5xl">🎯</span>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent"></div>
          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-br from-brand-500/15 via-transparent to-accent-500/20"></div>
          <div className="absolute top-3 left-3 flex gap-2">
            <span className="px-2.5 py-1 bg-black/35 backdrop-blur-md text-xs font-bold rounded-full text-white border border-white/20">
              {quiz.type === "TRIVIA" ? "🧠 Trivia" : "✨ Personalidade"}
            </span>
          </div>
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <div className="w-14 h-14 bg-white/95 backdrop-blur-sm rounded-full flex items-center justify-center shadow-xl transform scale-90 group-hover:scale-100 transition-transform">
              <svg className="w-6 h-6 text-brand-600 ml-1" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
          </div>
          <div className="absolute bottom-3 right-3 text-[11px] font-bold px-2.5 py-1 rounded-full bg-black/40 text-white border border-white/20 backdrop-blur-md">
            {(quiz.attempts_count || 0).toLocaleString()} jogadas
          </div>
        </div>
        <div className="p-5">
          <h3 className="mb-1.5 line-clamp-2 min-h-[3rem] text-base font-extrabold leading-tight text-[var(--color-text-primary)] transition-colors group-hover:text-brand-500">{quiz.title}</h3>
          {quiz.description && <p className="mb-4 line-clamp-2 min-h-10 text-sm text-[var(--color-text-secondary)]">{quiz.description}</p>}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 text-xs text-[var(--color-text-muted)] font-semibold">
              <span className="flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {(quiz.attempts_count || 0).toLocaleString()} plays
              </span>
              <span className="flex items-center gap-1">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
              </svg>
              {(quiz.likes_count || 0).toLocaleString()}
              </span>
            </div>
            <span className="rounded-full bg-brand-500/10 px-2.5 py-1 text-xs font-bold text-brand-500">Jogar</span>
          </div>
        </div>
      </a>
    </article>
  );
}

export default function ExploreLoader({
  tag,
  categoryAliases,
  sort,
  search,
  page,
  basePath = "/explore",
}: {
  tag?: string;
  categoryAliases?: string[];
  sort?: string;
  search?: string;
  page?: number;
  basePath?: string;
}) {
  const sortOptions = [
    { label: "Mais recentes", value: "" },
    { label: "Mais curtidos", value: "likes" },
    { label: "Mais jogados", value: "plays" },
  ];

  const [activeSort, setActiveSort] = useState(sort || "");
  const [quizzes, setQuizzes] = useState<Quiz[] | null>(null);
  const [recommended, setRecommended] = useState<Quiz[]>([]);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [meta, setMeta] = useState<ExploreMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const apiBaseUrl = PUBLIC_API_BASE_URL;

  useEffect(() => {
    const controller = new AbortController();

    fetch(`${apiBaseUrl}/auth/me`, {
      credentials: "include",
      signal: controller.signal,
      headers: { Accept: "application/json" },
    })
      .then((res) => res.json())
      .then((data) => {
        const logged = !!data?.success;
        setIsLoggedIn(logged);
        if (!logged) return;

        return fetch(`${apiBaseUrl}/quizzes/recommended/for-me`, {
          credentials: "include",
          signal: controller.signal,
          headers: { Accept: "application/json" },
        })
          .then((res) => res.json())
          .then((recData) => {
            if (recData?.success) {
              setRecommended(recData.data || []);
            }
          });
      })
      .catch(() => {
        setIsLoggedIn(false);
        setRecommended([]);
      });

    return () => controller.abort();
  }, [apiBaseUrl]);

  useEffect(() => {
    const normalize = (value: string) =>
      value
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");

    const tokenize = (value: string) =>
      normalize(value)
        .split(/[^a-z0-9]+/)
        .map((token) => token.trim())
        .filter((token) => token.length > 1);

    const searchTokens = tokenize(search || "");

    const matchesSearch = (quiz: Quiz) => {
      if (!search) return true;
      const combined = `${normalize(quiz.title || "")} ${normalize(quiz.description || "")}`;
      const normalizedSearch = normalize(search);
      if (combined.includes(normalizedSearch)) return true;
      if (searchTokens.length === 0) return false;
      return searchTokens.every((token) => combined.includes(token));
    };

    const matchesCategory = (quiz: Quiz, aliases: string[]) => {
      if (aliases.length === 0) return true;
      const aliasSet = new Set(aliases.map((alias) => normalize(alias)));
      const quizTags = (quiz.tags || []).map((value) => normalize(String(value)));
      const tagMatch = quizTags.some((tagValue) => aliasSet.has(tagValue));
      if (tagMatch) return true;

      const combined = `${normalize(quiz.title || "")} ${normalize(quiz.description || "")}`;
      return aliases.some((alias) => combined.includes(normalize(alias)));
    };

    setLoading(true);
    setError(false);

    const isCategoryMode = (categoryAliases || []).length > 0;
    const params = new URLSearchParams();
    if (!isCategoryMode && tag) params.set("tag", tag);
    if (activeSort) params.set("sort", activeSort);
    if (!isCategoryMode && search) params.set("search", search);
    if (!isCategoryMode && page) params.set("page", String(page));
    params.set("limit", isCategoryMode ? "300" : "24");

    const controller = new AbortController();

    fetch(`${apiBaseUrl}/quizzes?${params.toString()}`, {
      signal: controller.signal,
      headers: { "Accept": "application/json" },
    })
      .then((res) => res.json())
      .then(async (data) => {
        if (!data.success) {
          setError(true);
          return;
        }

        const primaryResults = data.data || [];

        if (!isCategoryMode) {
          setQuizzes(primaryResults);
          setMeta(data.meta || null);
          return;
        }

        const aliases = categoryAliases || [];
        const filtered = primaryResults
          .filter((quiz: Quiz) => matchesCategory(quiz, aliases))
          .filter((quiz: Quiz) => matchesSearch(quiz));

        const pageNum = Math.max(1, page || 1);
        const limitNum = 24;
        const offset = (pageNum - 1) * limitNum;
        const paged = filtered.slice(offset, offset + limitNum);

        setQuizzes(paged);
        setMeta({ total: filtered.length, limit: limitNum, page: pageNum });
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [tag, activeSort, search, page, categoryAliases, apiBaseUrl]);

  if (loading) {
    return (
      <section className="space-y-4">
        <div className="flex items-center justify-between rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-5 py-4">
          <div className="h-4 w-40 rounded-full bg-[var(--color-surface-muted)] animate-pulse"></div>
          <div className="h-4 w-24 rounded-full bg-[var(--color-surface-muted)] animate-pulse"></div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {Array.from({ length: 12 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      </section>
    );
  }

  if (error || !quizzes || quizzes.length === 0) {
    return (
      <div className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] py-16 text-center text-[var(--color-text-muted)]">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-500/10 text-2xl">🔎</div>
        <p className="text-lg font-bold text-[var(--color-text-primary)]">Nenhum quiz encontrado.</p>
        <p className="mt-1 text-sm">Tente outro termo ou limpe os filtros.</p>
        <a href="/explore" className="mt-4 inline-flex rounded-xl bg-brand-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-brand-700">Ver todos</a>
      </div>
    );
  }

  return (
    <section className="space-y-5">
      <div className="flex gap-2 overflow-x-auto rounded-2xl bg-[var(--color-surface-elevated)] p-1">
        {sortOptions.map((opt) => (
          <button
            key={opt.label}
            type="button"
            onClick={() => setActiveSort(opt.value)}
            className={`rounded-xl px-4 py-2 text-sm font-bold whitespace-nowrap transition ${activeSort === opt.value ? "bg-brand-600 text-white shadow-md shadow-brand-500/20" : "text-[var(--color-text-muted)] hover:bg-brand-500/10 hover:text-brand-500"}`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {meta && (
        <div className="flex flex-col gap-2 rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-bold text-[var(--color-text-primary)]">
            {Number(meta.total || 0).toLocaleString()} quizzes encontrados
          </p>
          <p className="text-sm text-[var(--color-text-muted)]">
            Pagina {page || 1} de {Math.max(1, Math.ceil(meta.total / meta.limit))}
          </p>
        </div>
      )}

      {isLoggedIn && recommended.length > 0 && (
        <div className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-4 sm:p-5">
          <div className="mb-4 flex items-end justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.14em] text-[var(--color-text-muted)]">Para voce</p>
              <h3 className="text-lg font-black text-[var(--color-text-primary)]">Recomendados para seu perfil</h3>
            </div>
            <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-emerald-600">Personalizado</span>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {recommended.slice(0, 3).map((quiz) => (
              <article key={`rec-${quiz.id}`} className="group relative overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3 transition hover:-translate-y-1 hover:border-brand-300 hover:shadow-xl hover:shadow-brand-500/10">
                <a href={`/quiz/${quiz.slug}`} className="block">
                  <div className="relative mb-3 aspect-[16/10] overflow-hidden rounded-xl bg-[var(--color-surface-muted)]">
                    {quiz.cover_url ? (
                      <img src={quiz.cover_url} alt={quiz.title} className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" loading="lazy" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-brand-700 to-slate-900 text-4xl">🎯</div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/15 to-transparent"></div>
                    <span className="absolute left-2 top-2 rounded-full border border-white/20 bg-black/45 px-2 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-white">Para voce</span>
                  </div>

                  <h4 className="line-clamp-2 min-h-[2.8rem] text-sm font-black leading-tight text-[var(--color-text-primary)]">{quiz.title}</h4>
                  <p className="mt-1 line-clamp-1 text-xs text-[var(--color-text-muted)]">{quiz.type === "TRIVIA" ? "Trivia" : "Personalidade"} · {(quiz.attempts_count || 0).toLocaleString()} jogadas</p>
                  <span className="mt-3 inline-flex rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-black text-white transition group-hover:bg-brand-500">Jogar agora</span>
                </a>
              </article>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {quizzes.map((quiz) => (
          <QuizCard key={quiz.id} quiz={quiz} />
        ))}
      </div>

      {meta && meta.total > meta.limit && (
        <div className="flex flex-wrap justify-center gap-2 mt-8">
          {page && page > 1 && (
            <a
              href={`${basePath}?${new URLSearchParams({
                ...(sort ? { sort } : {}),
                ...(activeSort ? { sort: activeSort } : {}),
                ...(search ? { search } : {}),
                page: String(page - 1),
              }).toString()}`}
              className="px-4 py-2 bg-[var(--color-surface-elevated)] border border-[var(--color-border)] rounded-xl hover:bg-[var(--color-surface-muted)] transition font-semibold"
            >
              ← Anterior
            </a>
          )}
          <span className="px-4 py-2 text-sm font-semibold text-[var(--color-text-secondary)]">
             Pagina {page || 1} de {Math.ceil(meta.total / meta.limit)}
           </span>
           {(page || 1) * meta.limit < meta.total && (
             <a
              href={`${basePath}?${new URLSearchParams({
                ...(sort ? { sort } : {}),
                ...(activeSort ? { sort: activeSort } : {}),
                ...(search ? { search } : {}),
                page: String((page || 1) + 1),
              }).toString()}`}
              className="px-4 py-2 bg-[var(--color-surface-elevated)] border border-[var(--color-border)] rounded-xl hover:bg-[var(--color-surface-muted)] transition font-semibold"
            >
              Próxima →
            </a>
          )}
        </div>
      )}
    </section>
  );
}
