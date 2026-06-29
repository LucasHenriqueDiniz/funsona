interface QuizProgressBarProps {
  current: number;
  total: number;
  quizType?: "TRIVIA" | "PERSONALITY";
}

export default function QuizProgressBar({ current, total, quizType }: QuizProgressBarProps) {
  const progress = total > 0 ? ((current + 1) / total) * 100 : 0;
  const typeLabel = quizType === "TRIVIA" ? "Trivia" : "Personalidade";

  return (
    <div className="w-full rounded-[2rem] border border-white/10 bg-white/[0.06] p-4 shadow-2xl shadow-black/20 backdrop-blur-xl sm:p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.22em] text-white/45">
            Pergunta {current + 1} de {total}
          </p>
          <p className="mt-1 text-sm font-semibold text-white/75">
            {Math.round(progress)}% concluído
          </p>
        </div>
        <div className="rounded-full border border-white/10 bg-black/20 px-3 py-1.5 shadow-inner shadow-white/5">
          <span className="text-xs font-black uppercase tracking-wider text-white/70">
            {typeLabel}
          </span>
        </div>
      </div>

      <div className="mt-4 h-3 w-full overflow-hidden rounded-full border border-white/10 bg-black/30 p-0.5">
        <div
          className="h-full rounded-full transition-all duration-700 ease-out"
          style={{
            width: `${progress}%`,
            backgroundImage:
              "linear-gradient(90deg, #22d3ee 0%, var(--color-brand-500) 45%, var(--color-accent-500) 100%)",
            boxShadow: "0 0 26px rgba(99, 102, 241, 0.65)",
          }}
        />
      </div>
    </div>
  );
}
