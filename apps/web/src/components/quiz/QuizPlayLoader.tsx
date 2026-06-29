import { useEffect, useState } from "react";
import QuizPlay from "./QuizPlay";
import { PUBLIC_API_BASE_URL } from "@/lib/public-env";
import type { QuizPayload } from "./QuizPlay";

interface QuizPlayLoaderProps {
  slug: string;
}

export default function QuizPlayLoader({ slug }: QuizPlayLoaderProps) {
  const [quiz, setQuiz] = useState<QuizPayload | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadQuiz() {
      try {
        const res = await fetch(`${PUBLIC_API_BASE_URL}/quizzes/${slug}`, {
          credentials: "include",
        });
        const payload = await res.json().catch(() => null);

        if (cancelled) return;

        if (!res.ok || !payload?.success || !payload?.data) {
          window.location.replace("/404");
          return;
        }

        setQuiz(payload.data);
      } catch {
        if (!cancelled) {
          window.location.replace("/404");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadQuiz();

    return () => {
      cancelled = true;
    };
  }, [slug]);

  if (loading || !quiz) {
    return (
      <div className="mx-auto grid w-full max-w-6xl animate-pulse gap-5 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
        <div className="space-y-5 lg:col-start-2 lg:row-start-1">
          <div className="rounded-[2rem] border border-white/10 bg-white/[0.06] p-5 shadow-2xl shadow-black/20 backdrop-blur-xl">
            <div className="mb-4 flex items-center justify-between">
              <div className="space-y-2">
                <div className="h-3 w-36 rounded-full bg-white/10" />
                <div className="h-4 w-24 rounded-full bg-white/10" />
              </div>
              <div className="h-8 w-24 rounded-full bg-white/10" />
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-black/30 p-0.5">
              <div className="h-full w-1/3 rounded-full bg-gradient-to-r from-cyan-300/70 via-brand-500/70 to-accent-500/70" />
            </div>
          </div>
        </div>

        <section className="space-y-5 lg:col-start-1 lg:row-start-1">
          <div className="rounded-[2rem] border border-white/10 bg-white/[0.06] p-6 shadow-2xl shadow-black/30 backdrop-blur-xl sm:p-10">
            <div className="mb-6 h-8 w-36 rounded-full bg-white/10" />
            <div className="mb-4 h-10 w-4/5 rounded-2xl bg-white/10 sm:h-14" />
            <div className="h-10 w-2/3 rounded-2xl bg-white/10 sm:h-14" />
          </div>

          <div className="space-y-3">
            {[0, 1, 2, 3].map((item) => (
              <div key={item} className="h-20 rounded-[1.5rem] border border-white/10 bg-white/[0.06] shadow-xl shadow-black/10" />
            ))}
          </div>

          <p className="text-center text-sm font-black text-white/45">
            Carregando quiz...
          </p>
        </section>
      </div>
    );
  }

  return <QuizPlay quiz={quiz} />;
}
