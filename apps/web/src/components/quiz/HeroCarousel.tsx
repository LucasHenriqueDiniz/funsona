import { useState, useEffect, useCallback, useMemo, useRef, type PointerEvent } from "react";
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
  author?: {
    display_name?: string;
    handle?: string;
    avatar_url?: string;
  };
}

const AUTOPLAY_INTERVAL = 5000;

function SkeletonHero() {
  return (
    <div className="relative w-full h-[400px] sm:h-[480px] lg:h-[520px] rounded-3xl overflow-hidden bg-[var(--color-surface-muted)] animate-pulse">
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/30 to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-10">
        <div className="max-w-2xl">
          <div className="h-6 bg-white/20 rounded-full w-32 mb-4" />
          <div className="h-10 bg-white/20 rounded w-3/4 mb-3" />
          <div className="h-5 bg-white/20 rounded w-1/2 mb-6" />
          <div className="h-12 bg-white/20 rounded-xl w-40" />
        </div>
      </div>
    </div>
  );
}

export default function HeroCarousel() {
  const [quizzes, setQuizzes] = useState<Quiz[] | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isHovering, setIsHovering] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const apiBaseUrl = PUBLIC_API_BASE_URL;
  const dragStartX = useRef<number | null>(null);

  useEffect(() => {
    fetch(`${apiBaseUrl}/quizzes?limit=6&sort=likes`, {
      headers: { "Accept": "application/json" },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.data?.length > 0) {
          setQuizzes(data.data);
        }
      })
      .catch((err) => console.error("Hero fetch error:", err))
      .finally(() => setLoading(false));
  }, [apiBaseUrl]);

  const goNext = useCallback(() => {
    setCurrentIndex((prev) => (quizzes ? (prev + 1) % quizzes.length : 0));
  }, [quizzes]);

  const goPrev = useCallback(() => {
    setCurrentIndex((prev) => (quizzes ? (prev - 1 + quizzes.length) % quizzes.length : 0));
  }, [quizzes]);

  const visibleSlides = useMemo(() => {
    if (!quizzes || quizzes.length === 0) return [];
    const prev = (currentIndex - 1 + quizzes.length) % quizzes.length;
    const next = (currentIndex + 1) % quizzes.length;
    return [prev, currentIndex, next];
  }, [quizzes, currentIndex]);

  const endDrag = useCallback(() => {
    if (!isDragging) return;
    const threshold = 70;
    if (dragOffset <= -threshold) goNext();
    if (dragOffset >= threshold) goPrev();
    setDragOffset(0);
    setIsDragging(false);
    dragStartX.current = null;
  }, [dragOffset, goNext, goPrev, isDragging]);

  const onPointerDown = useCallback((e: PointerEvent<HTMLDivElement>) => {
    dragStartX.current = e.clientX;
    setIsDragging(true);
  }, []);

  const onPointerMove = useCallback((e: PointerEvent<HTMLDivElement>) => {
    if (!isDragging || dragStartX.current === null) return;
    const delta = e.clientX - dragStartX.current;
    setDragOffset(Math.max(-140, Math.min(140, delta)));
  }, [isDragging]);

  // Autoplay
  useEffect(() => {
    if (!quizzes || quizzes.length <= 1 || isHovering || isDragging) return;
    const timer = setInterval(goNext, AUTOPLAY_INTERVAL);
    return () => clearInterval(timer);
  }, [quizzes, isHovering, goNext, isDragging]);

  if (loading) return <SkeletonHero />;
  if (!quizzes || quizzes.length === 0) return null;

  const quiz = quizzes[currentIndex];

  return (
    <div
      className="group relative h-[400px] w-full overflow-hidden rounded-3xl border border-[var(--color-border)] shadow-2xl shadow-slate-950/20 select-none touch-pan-y"
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onPointerLeave={endDrag}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_30%,rgba(255,255,255,0.14),transparent_42%)]" />

      {visibleSlides.map((index) => {
        const q = quizzes[index];
        const relative = index === currentIndex ? 0 : index === (currentIndex - 1 + quizzes.length) % quizzes.length ? -1 : 1;
        const translateBase = relative * 100;
        const translateDrag = (dragOffset / 4) * (relative === 0 ? 1 : 0.4);
        return (
          <div
            key={q.id}
            className="absolute inset-0 transition-transform duration-500 ease-out"
            style={{
              transform: `translateX(calc(${translateBase}% + ${translateDrag}px)) scale(${relative === 0 ? 1 : 0.96})`,
              opacity: relative === 0 ? 1 : 0.62,
              zIndex: relative === 0 ? 20 : 10,
            }}
          >
            {q.cover_url ? (
              <img
                src={q.cover_url}
                alt={q.title}
                className="h-full w-full object-cover"
                draggable={false}
              />
            ) : (
              <div className="h-full w-full bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-black/10" />
          </div>
        );
      })}

      {/* Content */}
      <div className="absolute inset-0 z-30 flex flex-col justify-end p-5 sm:p-8 lg:p-10">
        <div className="max-w-3xl">
          {/* Type badge */}
          <div className="flex items-center gap-3 mb-4">
            <span className="px-3 py-1.5 bg-white/20 backdrop-blur-sm text-white text-sm font-semibold rounded-full">
              {quiz.type === "TRIVIA" ? "🧠 Trivia" : "✨ Personalidade"}
            </span>
            {(quiz.likes_count || 0) > 10 && (
              <span className="px-3 py-1.5 bg-orange-500 text-white text-sm font-bold rounded-full flex items-center gap-1">
                🔥 Em alta
              </span>
            )}
          </div>

          {/* Title with animation */}
          <h2
            key={`title-${currentIndex}`}
            className="mb-3 line-clamp-2 max-w-[20ch] text-[clamp(1.7rem,5.2vw,3.35rem)] font-black leading-[1.08] text-white drop-shadow-sm animate-fadeInUp"
          >
            {quiz.title}
          </h2>

          {/* Description */}
          {quiz.description && (
            <p
              key={`desc-${currentIndex}`}
                className="mb-6 max-w-[62ch] text-sm leading-relaxed text-white/85 sm:text-base lg:text-lg line-clamp-3 animate-fadeInUp"
                style={{ animationDelay: "100ms" }}
              >
                {quiz.description}
              </p>
            )}

          {/* Meta + CTA */}
          <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:gap-5">
            <a
              href={`/quiz/${quiz.slug}`}
            className="inline-flex items-center gap-2 rounded-xl bg-white px-8 py-3.5 font-bold text-indigo-700 shadow-lg transition hover:-translate-y-0.5 hover:bg-indigo-50 hover:shadow-xl"
          >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
              Jogar Agora
            </a>

             <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-white/75 sm:text-sm">
              <span className="flex items-center gap-1.5">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {(quiz.attempts_count || 0).toLocaleString()} jogadas
              </span>
              <span className="flex items-center gap-1.5">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                </svg>
                {(quiz.likes_count || 0).toLocaleString()} curtidas
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation arrows */}
      {quizzes.length > 1 && (
        <>
          <button
            onClick={goPrev}
            className="absolute left-4 top-1/2 z-40 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white opacity-0 transition hover:bg-white/25 group-hover:opacity-100"
            aria-label="Anterior"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            onClick={goNext}
            className="absolute right-4 top-1/2 z-40 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white opacity-0 transition hover:bg-white/25 group-hover:opacity-100"
            aria-label="Próximo"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </>
      )}

      {/* Dots */}
      {quizzes.length > 1 && (
        <div className="absolute bottom-6 left-1/2 z-40 flex -translate-x-1/2 items-center gap-2">
          {quizzes.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentIndex(i)}
              className={`transition-all duration-300 rounded-full ${
                i === currentIndex
                  ? "w-8 h-2.5 bg-white"
                  : "w-2.5 h-2.5 bg-white/40 hover:bg-white/60"
              }`}
              aria-label={`Ir para quiz ${i + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
