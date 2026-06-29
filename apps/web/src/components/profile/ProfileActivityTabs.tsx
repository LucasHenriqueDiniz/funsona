import { useState } from "react";
import AchievementBadges from "@/components/profile/AchievementBadges";

type Quiz = {
  id: string;
  slug: string;
  title: string;
  description?: string;
  cover_url?: string;
  type: string;
  likes_count: number;
  attempts_count: number;
};

type Props = {
  userId: string;
  createdQuizzes: Quiz[];
  playedQuizzes: Quiz[];
  isOwnProfile?: boolean;
};

const tabs = [
  { id: "created", label: "Quizzes criados" },
  { id: "played", label: "Quizzes jogados" },
  { id: "achievements", label: "Conquistas" },
] as const;

export default function ProfileActivityTabs({ userId, createdQuizzes, playedQuizzes, isOwnProfile = false }: Props) {
  const [activeTab, setActiveTab] = useState<(typeof tabs)[number]["id"]>("created");

  const renderQuizCard = (quiz: Quiz) => {
    const isHot = quiz.likes_count > 50 || quiz.attempts_count > 100;

    return (
      <article
        key={quiz.id}
        className="group relative overflow-hidden rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] transition-all duration-300 hover:-translate-y-1.5 hover:border-brand-400/40 hover:shadow-2xl hover:shadow-brand-500/10"
      >
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
              <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-brand-600 via-brand-700 to-accent-600">
                <span className="text-5xl">🎯</span>
              </div>
            )}

            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent"></div>
            <div className="absolute inset-0 bg-gradient-to-br from-brand-500/15 via-transparent to-accent-500/20 opacity-0 transition-opacity duration-500 group-hover:opacity-100"></div>

            <div className="absolute left-3 top-3 flex gap-2">
              <span className="rounded-full border border-white/20 bg-black/35 px-2.5 py-1 text-xs font-bold text-white backdrop-blur-md">
                {quiz.type === "TRIVIA" ? "🧠 Trivia" : "✨ Personalidade"}
              </span>
              {isHot && (
                <span className="flex items-center gap-1 rounded-full bg-amber-500 px-2.5 py-1 text-xs font-black text-white shadow-lg shadow-amber-500/35">
                  🔥 HOT
                </span>
              )}
            </div>

            <div className="absolute bottom-3 right-3 rounded-full border border-white/20 bg-black/40 px-2.5 py-1 text-[11px] font-bold text-white backdrop-blur-md">
              {quiz.attempts_count.toLocaleString()} jogadas
            </div>
          </div>

          <div className="p-5">
            <h3 className="mb-1.5 line-clamp-1 font-extrabold text-[var(--color-text-primary)] transition-colors group-hover:text-brand-500">
              {quiz.title}
            </h3>
            {quiz.description && (
              <p className="mb-4 line-clamp-2 text-sm text-[var(--color-text-secondary)]">{quiz.description}</p>
            )}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4 text-xs font-semibold text-[var(--color-text-muted)]">
                <span>{quiz.attempts_count} plays</span>
                <span>{quiz.likes_count} likes</span>
              </div>
              <span className="rounded-full bg-brand-500/10 px-2.5 py-1 text-xs font-bold text-brand-500">Jogar</span>
            </div>
          </div>
        </a>
      </article>
    );
  };

  return (
    <section className="mt-10">
      <div className="sticky top-24 z-10 mb-5 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-1.5 shadow-sm backdrop-blur-xl">
        <div className="grid gap-1 sm:grid-cols-3">
          {tabs.map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`rounded-xl px-4 py-3 text-sm font-black transition ${active ? "bg-brand-600 text-white shadow-lg shadow-brand-500/25" : "text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface)]"}`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {activeTab === "created" && (
        <div>
          <div className="mb-5 flex items-center justify-between gap-3">
            <h2 className="text-xl font-black tracking-tight text-[var(--color-text-primary)]">Quizzes criados</h2>
            <span className="text-sm font-semibold text-[var(--color-text-muted)]">{createdQuizzes.length} total</span>
          </div>

          {createdQuizzes.length > 0 ? (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {createdQuizzes.map((quiz) => (
                renderQuizCard(quiz)
              ))}
            </div>
          ) : (
            <div className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] py-16 text-center">
              <p className="text-lg font-black text-[var(--color-text-primary)]">Nenhum quiz ainda</p>
              <p className="mt-2 text-sm text-[var(--color-text-muted)]">Ainda nao ha quizzes criados aqui.</p>
            </div>
          )}
        </div>
      )}

      {activeTab === "played" && (
        <div>
          <div className="mb-5 flex items-center justify-between gap-3">
            <h2 className="text-xl font-black tracking-tight text-[var(--color-text-primary)]">Quizzes jogados</h2>
            <span className="text-sm font-semibold text-[var(--color-text-muted)]">{playedQuizzes.length} total</span>
          </div>

          {playedQuizzes.length > 0 ? (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {playedQuizzes.map((quiz) => (
                renderQuizCard(quiz)
              ))}
            </div>
          ) : (
            <div className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] py-16 text-center">
              <p className="text-lg font-black text-[var(--color-text-primary)]">Sem jogos ainda</p>
              <p className="mt-2 text-sm text-[var(--color-text-muted)]">Os quizzes jogados vao aparecer aqui.</p>
            </div>
          )}
        </div>
      )}

      {activeTab === "achievements" && (
        <div>
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-xl font-black tracking-tight text-[var(--color-text-primary)]">Conquistas</h2>
          </div>
          <AchievementBadges userId={userId} isOwnProfile={isOwnProfile} />
        </div>
      )}
    </section>
  );
}
