interface QuizResultScreenProps {
  title: string;
  description?: string;
  imageUrl?: string;
  xpGained?: number;
  quizType?: "TRIVIA" | "PERSONALITY";
  resultValue?: string;
  onRestart: () => void;
  onShare: () => void;
  onBackToQuiz: () => void;
}

export default function QuizResultScreen({
  title,
  description,
  imageUrl,
  xpGained,
  quizType,
  resultValue,
  onRestart,
  onShare,
  onBackToQuiz,
}: QuizResultScreenProps) {
  const isTriviaResult = quizType === "TRIVIA";

  return (
    <div className="w-full rounded-[2rem] border border-white/10 bg-white/[0.06] p-5 shadow-2xl shadow-black/30 backdrop-blur-xl sm:rounded-[2.5rem] sm:p-8 lg:p-10">
      <div className="grid grid-cols-1 items-center gap-8 lg:grid-cols-2 lg:gap-12">
            <div className="order-2 flex items-center justify-center lg:order-1">
              {imageUrl ? (
                <div className="relative aspect-square w-full max-w-md">
                  <div className="absolute inset-0 rounded-[2rem] bg-gradient-to-br from-cyan-300/20 to-accent-500/20 blur-2xl" />
                  <div className="relative flex h-full items-center justify-center overflow-hidden rounded-[2rem] border border-white/20 shadow-2xl">
                    <img
                      src={imageUrl}
                      alt={title}
                      className="h-full w-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent" />
                  </div>
                </div>
              ) : (
                <div className="relative flex aspect-square w-full max-w-md items-center justify-center">
                  <div className="absolute inset-0 rounded-[2rem] bg-gradient-to-br from-cyan-300/20 to-accent-500/20 blur-2xl" />
                  <div className="relative flex h-full w-full items-center justify-center rounded-[2rem] border border-white/20 bg-gradient-to-br from-white/10 to-white/[0.03] p-8 backdrop-blur-sm lg:p-12">
                    <div className="text-center">
                      <div className="mb-4 bg-gradient-to-br from-cyan-300 via-brand-400 to-accent-400 bg-clip-text text-6xl font-black text-transparent lg:text-7xl">
                        {isTriviaResult ? resultValue : "✓"}
                      </div>
                      <p className="text-sm font-black uppercase tracking-widest text-white/45">
                        {isTriviaResult ? "Acertos" : "Resultado"}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="order-1 flex flex-col justify-center lg:order-2">
              <div className="mb-6 inline-flex w-fit items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-2 backdrop-blur-sm">
                <div className="h-2 w-2 animate-pulse rounded-full bg-cyan-300" />
                <span className="text-xs font-black uppercase tracking-widest text-white/50">
                  {isTriviaResult ? "Quiz Concluído" : "Seu Resultado"}
                </span>
              </div>

              <h1 className="mb-4 text-4xl font-black leading-tight tracking-tight text-white sm:text-5xl lg:mb-6 lg:text-6xl">
                {title}
              </h1>

              {description && (
                <p className="mb-8 max-w-lg text-base leading-relaxed text-white/65 sm:text-lg lg:mb-10">
                  {description}
                </p>
              )}

              {xpGained !== undefined && (
                <div className="mb-8 rounded-3xl border border-cyan-300/20 bg-cyan-300/10 p-5 lg:mb-10">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-300 to-accent-500">
                      <svg className="h-6 w-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-xs font-black uppercase tracking-widest text-white/45">Pontos conquistados</p>
                      <p className="text-2xl font-black text-cyan-300">+{xpGained} XP</p>
                    </div>
                  </div>
                </div>
              )}

              <div className="mb-6 flex flex-col gap-3 sm:flex-row">
                <button
                  onClick={onRestart}
                  className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-300 via-brand-500 to-accent-500 px-6 py-4 font-black text-white shadow-2xl shadow-brand-500/25 transition hover:-translate-y-0.5"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Jogar Novamente
                </button>
                <button
                  onClick={onShare}
                  className="flex flex-1 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.06] px-6 py-4 font-black text-white/75 backdrop-blur-sm transition hover:border-white/25 hover:bg-white/10 hover:text-white"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C9.589 12.438 10 11.193 10 9.5c0-2.485 0-4.5-2-4.5s-2 2.015-2 4.5c0 1.694.411 2.938 1.316 3.842m0 2.316v3.342M18 18c1.108-.999 2-2.326 2-3.842 0-2.485 0-4.5-2-4.5s-2 2.015-2 4.5m4 5.5v-3.342" />
                  </svg>
                  Compartilhar
                </button>
              </div>

              <button
                onClick={onBackToQuiz}
                className="flex items-center gap-2 text-sm font-black text-white/45 transition-colors hover:text-cyan-300"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Voltar ao quiz
              </button>
            </div>
      </div>
    </div>
  );
}
