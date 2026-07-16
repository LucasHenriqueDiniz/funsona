import { useState, useEffect, useCallback } from "react";
import { PUBLIC_API_BASE_URL } from "@/lib/public-env";

interface QuizCardData {
  id: string;
  slug: string;
  title: string;
  description?: string;
  cover_url?: string;
  type: string;
  likes_count: number;
  attempts_count: number;
}

interface QuizGridLoaderProps {
  apiUrl: string;
  title: string;
  seeAllHref?: string;
  limit?: number;
  emptyMessage?: string;
  excludeId?: string;
}

function SkeletonCard() {
  return (
    <div className="bg-[var(--color-surface-elevated)] rounded-2xl shadow-sm border border-[var(--color-border)] overflow-hidden animate-pulse">
      <div className="aspect-[4/3] bg-[var(--color-surface-muted)]"></div>
      <div className="p-4 space-y-3">
        <div className="h-5 bg-[var(--color-surface-muted)] rounded w-3/4"></div>
        <div className="h-4 bg-[var(--color-surface-muted)] rounded w-full"></div>
        <div className="flex gap-4">
          <div className="h-3 bg-[var(--color-surface-muted)] rounded w-16"></div>
          <div className="h-3 bg-[var(--color-surface-muted)] rounded w-16"></div>
        </div>
      </div>
    </div>
  );
}

function QuizCard({ quiz }: { quiz: QuizCardData }) {
  const isHot = (quiz.likes_count || 0) > 50 || (quiz.attempts_count || 0) > 100;
  const typeLabel = quiz.type === "TRIVIA" ? "Trivia" : "Personalidade";
  return (
    <article className="group relative overflow-hidden rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] shadow-sm transition-all duration-300 hover:-translate-y-1.5 hover:border-brand-300/50 hover:shadow-xl hover:shadow-brand-500/10">
      <a href={`/quiz/${quiz.slug}`} className="block">
        <div className="relative aspect-[4/3] overflow-hidden">
          {quiz.cover_url ? (
            <img
              src={quiz.cover_url}
              alt={quiz.title}
              className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
              loading="lazy"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-brand-100 to-accent-100 dark:from-brand-900/30 dark:to-accent-900/30">
              <span className="text-4xl">🎯</span>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-br from-brand-500/10 via-transparent to-accent-500/10 opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
          <div className="absolute top-3 left-3 flex gap-2">
            <span className="rounded-full border border-white/20 bg-black/35 px-2.5 py-1 text-xs font-bold text-white backdrop-blur-md">
              {quiz.type === "TRIVIA" ? "🧠" : "✨"} {typeLabel}
            </span>
            {isHot && (
              <span className="flex items-center gap-1 rounded-full bg-amber-500 px-2.5 py-1 text-xs font-black text-white shadow-lg shadow-amber-500/35">
                🔥 HOT
              </span>
            )}
          </div>
          <div className="absolute bottom-3 right-3 rounded-full border border-white/20 bg-black/40 px-2.5 py-1 text-[11px] font-bold text-white backdrop-blur-md">
            {(quiz.attempts_count || 0).toLocaleString()} jogadas
          </div>
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <div className="flex h-14 w-14 scale-90 items-center justify-center rounded-full bg-white/95 shadow-xl transition-transform group-hover:scale-100">
              <svg className="ml-1 h-6 w-6 text-brand-600" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
          </div>
        </div>
        <div className="p-5">
          <h3 className="mb-1.5 line-clamp-1 text-lg font-extrabold text-[var(--color-text-primary)] transition-colors group-hover:text-brand-500">{quiz.title}</h3>
          {quiz.description && (
            <p className="mb-4 line-clamp-2 text-sm text-[var(--color-text-secondary)]">{quiz.description}</p>
          )}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 text-xs font-semibold text-[var(--color-text-muted)]">
              <span className="flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {quiz.attempts_count || 0} plays
              </span>
              <span className="flex items-center gap-1">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
              </svg>
              {quiz.likes_count || 0}
              </span>
            </div>
            <span className="rounded-full bg-brand-500/10 px-2.5 py-1 text-xs font-bold text-brand-500">Jogar</span>
          </div>
        </div>
      </a>
    </article>
  );
}

type ErrorWithNameAndMessage = { name?: string; message?: string };

export default function QuizGridLoader({ apiUrl, title, seeAllHref, limit = 6, emptyMessage = "Nenhum quiz encontrado.", excludeId }: QuizGridLoaderProps) {
  const [quizzes, setQuizzes] = useState<QuizCardData[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const apiBaseUrl = PUBLIC_API_BASE_URL;

  const fetchQuizzes = useCallback(async (retryCount = 0) => {
    setLoading(true);
    setError(null);
    const controller = new AbortController();

    try {
      // Fetch one extra item when excluding by id, so the list still has
      // `limit` entries after filtering out the current quiz.
      const fetchLimit = excludeId ? limit + 1 : limit;
      const url = new URL(`${apiBaseUrl}${apiUrl}`, window.location.origin);
      url.searchParams.set("limit", String(fetchLimit));

      const res = await fetch(url.toString(), {
        signal: controller.signal,
        headers: { "Accept": "application/json" },
      });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const data = await res.json();
      if (data.success) {
        const items: QuizCardData[] = data.data || [];
        const filtered = excludeId ? items.filter((q) => q.id !== excludeId) : items;
        setQuizzes(filtered.slice(0, limit));
      } else {
        throw new Error(data.error || "Erro ao carregar quizzes");
      }
    } catch (err: unknown) {
      const error = err as ErrorWithNameAndMessage;
      if (error.name === "AbortError") return;
      console.error("QuizGridLoader error:", err);
      if (retryCount < 2) {
        setTimeout(() => fetchQuizzes(retryCount + 1), 1000 * (retryCount + 1));
        return;
      }
      setError(error.message || "Erro de conexão");
    } finally {
      setLoading(false);
    }

    return () => controller.abort();
  }, [apiUrl, limit, apiBaseUrl, excludeId]);

  useEffect(() => {
    fetchQuizzes();
  }, [fetchQuizzes]);

  return (
    <section>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-[var(--color-text-primary)]">{title}</h2>
        {seeAllHref && (
          <a href={seeAllHref} className="text-sm font-medium text-brand-500 hover:text-brand-600 transition">
            Ver todos →
          </a>
        )}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: limit }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : error ? (
        <div className="text-center py-12">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-red-500/10 rounded-full mb-4">
            <svg className="w-7 h-7 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <p className="text-[var(--color-text-secondary)] mb-2">{emptyMessage}</p>
          <p className="text-sm text-[var(--color-text-muted)]">{error}</p>
          <button
            onClick={() => fetchQuizzes()}
            className="mt-4 px-4 py-2 bg-brand-600 text-white text-sm font-medium rounded-lg hover:bg-brand-700 transition"
          >
            Tentar novamente
          </button>
        </div>
      ) : !quizzes || quizzes.length === 0 ? (
        <div className="text-center py-12 text-[var(--color-text-muted)]">
          <p>{emptyMessage}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {quizzes.map((quiz) => (
            <QuizCard key={quiz.id} quiz={quiz} />
          ))}
        </div>
      )}
    </section>
  );
}
