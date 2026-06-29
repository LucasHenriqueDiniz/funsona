import { useState, useCallback } from "react";
import QuizProgressBar from "./QuizProgressBar";
import QuizQuestionCard from "./QuizQuestionCard";
import QuizOptionButton from "./QuizOptionButton";
import QuizResultScreen from "./QuizResultScreen";
import { PUBLIC_API_BASE_URL } from "@/lib/public-env";

// Support both old imported data format and new schema format
interface RawOption {
  id: string;
  text?: string;
  label?: string;
  image_url?: string;
  imageUrl?: string;
  is_correct?: boolean;
  outcome_key?: string;
  outcomeWeights?: Record<string, number>;
}

interface RawQuestion {
  id: string;
  text?: string;
  title?: string;
  image_url?: string;
  imageUrl?: string;
  options?: RawOption[];
  answers?: RawOption[];
}

interface QuizPlayProps {
  quiz: QuizPayload;
}

interface NormalizedQuestion {
  id: string;
  title: string;
  imageUrl?: string;
  options: { id: string; label: string; imageUrl?: string }[];
}

interface QuizOutcome {
  key?: string;
  title?: string;
  description?: string;
  imageUrl?: string;
  image_url?: string;
}

interface QuizContent {
  questions?: RawQuestion[];
  outcomes?: QuizOutcome[];
}

export interface QuizPayload {
  id: string;
  slug: string;
  title: string;
  description?: string;
  type: "TRIVIA" | "PERSONALITY";
  content: QuizContent;
}

interface TriviaResult {
  type: "score";
  value: string;
  title: string;
  description: string;
  xpGained: number;
}

interface PersonalityResult {
  type: "outcome";
  value: string;
  title: string;
  description: string;
  imageUrl?: string;
  xpGained: number;
}

type QuizResult = TriviaResult | PersonalityResult;

function normalizeQuestions(quiz: QuizPayload): NormalizedQuestion[] {
  const rawQuestions = quiz?.content?.questions || [];
  return rawQuestions.map((q: RawQuestion): NormalizedQuestion => {
    const rawOpts = q.options || q.answers || [];
    return {
      id: q.id,
      title: q.title || q.text || "Pergunta",
      imageUrl: q.imageUrl || q.image_url,
      options: rawOpts.map((o: RawOption) => ({
        id: o.id,
        label: o.label || o.text || "Opção",
        imageUrl: o.imageUrl || o.image_url,
      })),
    };
  });
}

const letters = ["A", "B", "C", "D", "E", "F", "G", "H"];

export default function QuizPlay({ quiz }: QuizPlayProps) {
  const questions = normalizeQuestions(quiz);
  const quizType: "TRIVIA" | "PERSONALITY" = quiz.type === "TRIVIA" ? "TRIVIA" : "PERSONALITY";
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [showResult, setShowResult] = useState(false);
  const [result, setResult] = useState<QuizResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [animating, setAnimating] = useState(false);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);

  const question = questions[currentQuestion];
  const isLast = currentQuestion === questions.length - 1;

  const selectAnswer = useCallback((optionId: string) => {
    if (!question) return;
    setSelectedOption(optionId);
    setAnswers((prev) => ({ ...prev, [question.id]: optionId }));
  }, [question]);

  function calculateTriviaResult(): TriviaResult {
    const rawQuestions = quiz.content.questions || [];
    let score = 0;
    rawQuestions.forEach((q) => {
      const selectedId = answers[q.id];
      const allOpts = q.options || q.answers || [];
      const selected = allOpts.find((o) => o.id === selectedId);
      if (selected?.is_correct) score++;
    });
    const xpGained = score * 10 + questions.length * 2;
    let title = "Continue praticando";
    if (score === questions.length) title = "Perfeito!";
    else if (score > questions.length / 2) title = "Muito bem!";
    return {
      type: "score",
      value: `${score}/${questions.length}`,
      title,
      description: `Você acertou ${score} de ${questions.length} perguntas.`,
      xpGained,
    };
  }

  function calculatePersonalityResult(): PersonalityResult {
    const rawQuestions = quiz.content.questions || [];
    const tally: Record<string, number> = {};
    rawQuestions.forEach((q) => {
      const selectedId = answers[q.id];
      const allOpts = q.options || q.answers || [];
      const selected = allOpts.find((o) => o.id === selectedId);
      if (selected?.outcome_key) {
        tally[selected.outcome_key] = (tally[selected.outcome_key] || 0) + 1;
      }
      // Also check outcomeWeights for imported data
      if (selected?.outcomeWeights) {
        Object.entries(selected.outcomeWeights).forEach(([key, weight]) => {
          tally[key] = (tally[key] || 0) + (weight as number);
        });
      }
    });

    const topKey = Object.entries(tally).sort((a, b) => b[1] - a[1])[0]?.[0];
    const outcomes = quiz.content.outcomes || [];
    const outcome = outcomes.find((o) => o.key === topKey || o.title === topKey);
    const xpGained = questions.length * 5;

    return {
      type: "outcome",
      value: topKey || "unknown",
      title: outcome?.title || "Seu resultado",
      description: outcome?.description || "Obrigado por jogar!",
      imageUrl: outcome?.imageUrl || outcome?.image_url,
      xpGained,
    };
  }

  async function finishQuiz() {
    setLoading(true);
    const quizResult = quizType === "TRIVIA" ? calculateTriviaResult() : calculatePersonalityResult();
    try {
      await fetch(`${PUBLIC_API_BASE_URL}/quizzes/${quiz.id}/results`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          result_type: quizType === "TRIVIA" ? "TRIVIA_SUM" : "PERSONALITY_TALLY",
          result_value: quizResult.value,
          xp_gained: quizResult.xpGained,
        }),
        credentials: "include",
      });
    } catch (err) {
      console.error("Failed to save quiz result:", err);
    }
    setResult(quizResult);
    setShowResult(true);
    setLoading(false);
  }

  function restart() {
    setCurrentQuestion(0);
    setAnswers({});
    setShowResult(false);
    setResult(null);
    setSelectedOption(null);
  }

  function shareResult() {
    const text = `Joguei "${quiz.title}" no FunSona e meu resultado foi: ${result?.title}`;
    const url = `${window.location.origin}/quiz/${quiz.slug}`;
    if (navigator.share) {
      navigator.share({ title: quiz.title, text, url });
    } else {
      navigator.clipboard.writeText(`${text}\n${url}`);
      alert("Link copiado para a área de transferência!");
    }
  }

  // Result screen
  if (showResult && result) {
    return (
      <div className="mx-auto w-full max-w-6xl">
        <QuizResultScreen
          title={result.title}
          description={result.description}
          imageUrl={result.type === "outcome" ? result.imageUrl : undefined}
          xpGained={result.xpGained}
          quizType={quizType}
          resultValue={result.value}
          onRestart={restart}
          onShare={shareResult}
          onBackToQuiz={() => window.location.href = `/quiz/${quiz.slug}`}
        />
      </div>
    );
  }

  if (!question) {
    return (
      <div className="rounded-[2rem] border border-white/10 bg-white/[0.06] px-6 py-16 text-center shadow-2xl shadow-black/20 backdrop-blur-xl">
        <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-3xl bg-white/10">
          <svg className="h-10 w-10 text-white/55" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
          </svg>
        </div>
        <p className="mb-2 text-lg font-bold text-white">Este quiz não possui perguntas.</p>
        <a href={`/quiz/${quiz.slug}`} className="text-sm font-bold text-cyan-300 transition hover:text-cyan-200">
          Voltar ao quiz
        </a>
      </div>
    );
  }

  return (
    <div className="mx-auto grid w-full max-w-6xl gap-5 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
      <div className="space-y-5 lg:sticky lg:top-28 lg:col-start-2 lg:row-start-1">
        <QuizProgressBar
          current={currentQuestion}
          total={questions.length}
          quizType={quizType}
        />
        <div className="hidden rounded-[2rem] border border-white/10 bg-white/[0.05] p-5 shadow-2xl shadow-black/15 backdrop-blur-xl lg:block">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-white/40">Quiz</p>
          <h1 className="mt-2 line-clamp-3 text-2xl font-black leading-tight text-white">{quiz.title}</h1>
          {quiz.description && (
            <p className="mt-3 line-clamp-4 text-sm font-medium leading-relaxed text-white/55">{quiz.description}</p>
          )}
        </div>
      </div>

      <section className="space-y-5 lg:col-start-1 lg:row-start-1">
        <QuizQuestionCard
          title={question.title}
          imageUrl={question.imageUrl}
          isAnimating={animating}
        />

        {(() => {
          const hasAnyImages = question.options.some(opt => opt.imageUrl);
          const gridCols = hasAnyImages
            ? question.options.length <= 2
              ? "grid-cols-2"
              : "grid-cols-2 xl:grid-cols-3"
            : "";

          return (
            <div
              className={`duration-300 ${
                hasAnyImages
                  ? `grid ${gridCols} gap-3 sm:gap-4`
                  : "space-y-3"
              }`}
              style={{ animationDelay: animating ? "0ms" : "100ms" }}
            >
              {question.options.map((option, idx) => {
                const letter = letters[idx] || String(idx + 1);
                const isSelected = selectedOption === option.id || answers[question.id] === option.id;
                return (
                  <QuizOptionButton
                    key={option.id}
                    letter={letter}
                    label={option.label}
                    imageUrl={option.imageUrl}
                    isSelected={isSelected}
                    isDisabled={animating}
                    onClick={() => selectAnswer(option.id)}
                  />
                );
              })}
            </div>
          );
        })()}

        <div className="flex gap-3 pt-2">
          <button
            onClick={() => {
              if (currentQuestion > 0) {
                setAnimating(true);
                setTimeout(() => {
                  setCurrentQuestion(prev => prev - 1);
                  setSelectedOption(null);
                  setAnimating(false);
                }, 200);
              }
            }}
            disabled={currentQuestion === 0 || animating}
            className="flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.06] px-5 py-4 text-sm font-black text-white/65 shadow-xl shadow-black/10 backdrop-blur-xl transition hover:border-white/25 hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Anterior
          </button>

          {isLast ? (
            <button
              onClick={finishQuiz}
              disabled={!answers[question.id] || loading || animating}
              className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-300 via-brand-500 to-accent-500 px-6 py-4 text-sm font-black text-white shadow-2xl shadow-brand-500/25 transition hover:-translate-y-0.5 hover:shadow-brand-500/35 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0"
            >
              {loading ? (
                <>
                  <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Salvando...
                </>
              ) : (
                <>
                  Ver resultado
                  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </>
              )}
            </button>
          ) : (
            <button
              onClick={() => {
                if (currentQuestion < questions.length - 1 && answers[question.id]) {
                  setAnimating(true);
                  setTimeout(() => {
                    setCurrentQuestion(prev => prev + 1);
                    setSelectedOption(null);
                    setAnimating(false);
                  }, 200);
                }
              }}
              disabled={animating || !answers[question.id]}
              className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-300 via-brand-500 to-accent-500 px-6 py-4 text-sm font-black text-white shadow-2xl shadow-brand-500/25 transition hover:-translate-y-0.5 hover:shadow-brand-500/35 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0"
            >
              Próxima
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          )}
        </div>
      </section>
    </div>
  );
}
