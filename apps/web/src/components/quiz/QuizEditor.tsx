import { useState, type ComponentProps } from "react";
import type { QuizType, CreateQuiz } from "@FunSona/shared";
import ImageUpload from "@/components/ui/ImageUpload";
import { PUBLIC_API_BASE_URL } from "@/lib/public-env";

type FormSubmitEvent = Parameters<NonNullable<ComponentProps<"form">["onSubmit"]>>[0];

interface Question {
  id: string;
  text: string;
  image_url?: string;
  options: { id: string; text: string; image_url?: string; is_correct?: boolean; outcome_key?: string }[];
}

interface Outcome {
  key: string;
  title: string;
  description: string;
  image_url?: string;
}

export default function QuizEditor() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [coverUrl, setCoverUrl] = useState("");
  const [quizType, setQuizType] = useState<QuizType>("TRIVIA");
  const [questions, setQuestions] = useState<Question[]>([
    { id: crypto.randomUUID(), text: "", options: [{ id: crypto.randomUUID(), text: "" }, { id: crypto.randomUUID(), text: "" }] },
  ]);
  const [outcomes, setOutcomes] = useState<Outcome[]>([]);
  const [tags, setTags] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<"basic" | "questions" | "results">("basic");

  function addQuestion() {
    setQuestions((prev) => [...prev, { id: crypto.randomUUID(), text: "", options: [{ id: crypto.randomUUID(), text: "" }, { id: crypto.randomUUID(), text: "" }] }]);
  }

  function updateQuestion(index: number, text: string) {
    setQuestions((prev) => prev.map((q, i) => (i === index ? { ...q, text } : q)));
  }

  function addOption(qIndex: number) {
    setQuestions((prev) => prev.map((q, i) => i === qIndex ? { ...q, options: [...q.options, { id: crypto.randomUUID(), text: "" }] } : q));
  }

  function updateOption(qIndex: number, oIndex: number, text: string) {
    setQuestions((prev) => prev.map((q, qi) => qi === qIndex ? { ...q, options: q.options.map((o, oi) => oi === oIndex ? { ...o, text } : o) } : q));
  }

  function setCorrectOption(qIndex: number, oIndex: number) {
    if (quizType !== "TRIVIA") return;
    setQuestions((prev) => prev.map((q, qi) => qi === qIndex ? { ...q, options: q.options.map((o, oi) => ({ ...o, is_correct: oi === oIndex })) } : q));
  }

  function removeQuestion(index: number) {
    setQuestions((prev) => prev.filter((_, i) => i !== index));
  }

  function removeOption(qIndex: number, oIndex: number) {
    setQuestions((prev) => prev.map((q, qi) => qi === qIndex ? { ...q, options: q.options.filter((_, oi) => oi !== oIndex) } : q));
  }

  function addOutcome() {
    setOutcomes((prev) => [...prev, { key: crypto.randomUUID(), title: "", description: "" }]);
  }

  function updateOutcome(index: number, field: keyof Outcome, value: string) {
    setOutcomes((prev) => prev.map((o, i) => (i === index ? { ...o, [field]: value } : o)));
  }

  function removeOutcome(index: number) {
    setOutcomes((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: FormSubmitEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const quizData: CreateQuiz = {
      title,
      description: description || null,
      cover_url: coverUrl || null,
      type: quizType,
      status: "PUBLISHED",
      content: {
        questions: questions.map((q) => ({
          ...q,
          image_url: q.image_url || null,
          options: q.options.map((o) => ({
            ...o,
            image_url: o.image_url || null,
            is_correct: quizType === "TRIVIA" ? o.is_correct || false : undefined,
            outcome_key: quizType === "PERSONALITY" ? o.outcome_key : undefined,
            points: quizType === "TRIVIA" ? (o.is_correct ? 1 : 0) : undefined,
          })),
        })),
        outcomes: quizType === "PERSONALITY" ? outcomes : undefined,
      },
      settings: { show_correct_answers: true, randomize_questions: false },
      language: "pt",
      tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
    };

    try {
      const res = await fetch(`${PUBLIC_API_BASE_URL}/quizzes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(quizData),
        credentials: "include",
      });
      const data = await res.json();
      if (!data.success) { setError(data.error || "Erro ao criar quiz"); return; }
      window.location.href = `/quiz/${data.data.slug}`;
    } catch { setError("Erro de conexão. Tente novamente."); }
    finally { setLoading(false); }
  }

  const tabs = [
    { id: "basic" as const, label: "📋 Básico", icon: "📝" },
    { id: "questions" as const, label: `❓ Perguntas (${questions.length})`, icon: "❓" },
    { id: "results" as const, label: `🏆 Resultados (${outcomes.length})`, icon: "🏆" },
  ];

  const canSubmit = title.trim().length > 0 && questions.length > 0 && questions.every((q) => q.options.length >= 2 && q.options.every((o) => o.text.trim().length > 0));

  return (
    <form onSubmit={handleSubmit} className="space-y-8 pb-24">
      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-500 font-medium flex items-center gap-3">
          <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
          {error}
        </div>
      )}

      {/* Tab bar */}
      <div className="sticky top-24 z-20 flex gap-2 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)]/95 p-1.5 shadow-lg shadow-slate-950/5 backdrop-blur">
        {tabs.filter((t) => t.id !== "results" || quizType === "PERSONALITY").map((tab) => (
          <button key={tab.id} type="button" onClick={() => setActiveTab(tab.id)}
            className={`flex-1 py-2.5 px-4 rounded-xl text-sm font-bold transition-all duration-200 ${
              activeTab === tab.id
                ? "bg-brand-600 text-white shadow-lg shadow-brand-500/25"
                : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface)]"
            }`}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Basic Info */}
      {activeTab === "basic" && (
        <div className="rounded-3xl border border-[var(--color-border)] p-6 sm:p-8 space-y-6 shadow-xl shadow-slate-950/5"
          style={{ backgroundColor: 'var(--color-surface-elevated)' }}>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-brand-500/10 flex items-center justify-center text-xl">📝</div>
            <h2 className="text-xl font-black text-[var(--color-text-primary)]">Informações do Quiz</h2>
          </div>

          <div>
            <label className="block text-sm font-bold text-[var(--color-text-secondary)] mb-2">Título *</label>
            <input type="text" required maxLength={200} value={title} onChange={(e) => setTitle(e.target.value)}
            className="w-full px-4 py-3.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500 outline-none transition font-medium"
              placeholder="Ex: Quem você seria em Game of Thrones?" />
          </div>

          <div>
            <label className="block text-sm font-bold text-[var(--color-text-secondary)] mb-2">Descrição</label>
            <textarea maxLength={1000} value={description} onChange={(e) => setDescription(e.target.value)}
            className="w-full px-4 py-3.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500 outline-none transition font-medium h-24 resize-none"
              placeholder="Descreva seu quiz em poucas palavras..." />
          </div>

          <ImageUpload label="Imagem de capa" onUpload={setCoverUrl} currentUrl={coverUrl} />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-[var(--color-text-secondary)] mb-2">Tipo de Quiz</label>
              <select value={quizType} onChange={(e) => setQuizType(e.target.value as QuizType)}
                className="w-full px-4 py-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-primary)] focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500 outline-none transition font-medium appearance-none">
                <option value="TRIVIA">🧠 Trivia (respostas certas/erradas)</option>
                <option value="PERSONALITY">✨ Personalidade (resultados por perfil)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold text-[var(--color-text-secondary)] mb-2">Tags</label>
              <input type="text" value={tags} onChange={(e) => setTags(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500 outline-none transition font-medium"
                placeholder="tv, series, got (separadas por vírgula)" />
            </div>
          </div>
        </div>
      )}

      {/* Questions */}
      {activeTab === "questions" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-brand-500/10 flex items-center justify-center text-xl">❓</div>
              <h2 className="text-xl font-black text-[var(--color-text-primary)]">Perguntas</h2>
            </div>
            <button type="button" onClick={addQuestion}
              className="px-5 py-2.5 bg-brand-600 text-white rounded-xl hover:bg-brand-700 transition font-bold text-sm shadow-lg shadow-brand-500/25 flex items-center gap-2 hover:-translate-y-0.5">
              <span>+</span> Adicionar pergunta
            </button>
          </div>

          {questions.map((question, qIndex) => (
            <div key={question.id} className="rounded-3xl border border-[var(--color-border)] overflow-hidden shadow-lg shadow-slate-950/5"
              style={{ backgroundColor: 'var(--color-surface-elevated)' }}>
              <div className="p-6 sm:p-8 space-y-5">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-black text-brand-500 uppercase tracking-wider">Pergunta {qIndex + 1}</span>
                  {questions.length > 1 && (
                    <button type="button" onClick={() => removeQuestion(qIndex)}
                      className="text-red-500 hover:text-red-600 hover:bg-red-500/10 px-3 py-1.5 rounded-lg transition text-sm font-semibold">
                      🗑️ Remover
                    </button>
                  )}
                </div>

                <input type="text" required value={question.text} onChange={(e) => updateQuestion(qIndex, e.target.value)}
                  className="w-full px-4 py-3.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500 outline-none transition font-bold text-lg"
                  placeholder="Digite a pergunta..." />

                <div className="space-y-3">
                  <span className="text-sm font-bold text-[var(--color-text-secondary)]">Opções de resposta</span>
                  {question.options.map((option, oIndex) => (
                    <div key={option.id} className="flex items-center gap-3 group">
                      {quizType === "TRIVIA" && (
                        <button type="button" onClick={() => setCorrectOption(qIndex, oIndex)}
                          className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition ${
                            option.is_correct
                              ? "bg-green-500 text-white shadow-lg shadow-green-500/25"
                              : "bg-[var(--color-surface-muted)] text-[var(--color-text-muted)] hover:bg-green-500/20 hover:text-green-500 border border-[var(--color-border)]"
                          }`}
                          title="Marcar como correta">
                          {option.is_correct ? (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7"/></svg>
                          ) : (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" strokeWidth="2"/></svg>
                          )}
                        </button>
                      )}
                      <input type="text" required value={option.text} onChange={(e) => updateOption(qIndex, oIndex, e.target.value)}
                        className="flex-1 px-4 py-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500 outline-none transition font-medium"
                        placeholder={`Opção ${oIndex + 1}`} />
                      {question.options.length > 2 && (
                        <button type="button" onClick={() => removeOption(qIndex, oIndex)}
                          className="text-[var(--color-text-muted)] hover:text-red-500 hover:bg-red-500/10 p-2 rounded-lg transition opacity-0 group-hover:opacity-100">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
                        </button>
                      )}
                    </div>
                  ))}
                  <button type="button" onClick={() => addOption(qIndex)}
                    className="text-sm font-bold text-brand-500 hover:text-brand-600 transition flex items-center gap-1.5 mt-2">
                    <span>+</span> Adicionar opção
                  </button>
                </div>
              </div>
            </div>
          ))}

          <button type="button" onClick={addQuestion}
            className="w-full py-4 rounded-3xl border-2 border-dashed border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-brand-500 hover:border-brand-300 dark:hover:border-brand-700 hover:bg-brand-500/5 transition font-bold flex items-center justify-center gap-2">
            <span className="text-xl">+</span> Adicionar nova pergunta
          </button>
        </div>
      )}

      {/* Outcomes */}
      {activeTab === "results" && quizType === "PERSONALITY" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-brand-500/10 flex items-center justify-center text-xl">🏆</div>
              <h2 className="text-xl font-black text-[var(--color-text-primary)]">Resultados</h2>
            </div>
            <button type="button" onClick={addOutcome}
              className="px-5 py-2.5 bg-brand-600 text-white rounded-xl hover:bg-brand-700 transition font-bold text-sm shadow-lg shadow-brand-500/25 flex items-center gap-2">
              <span>+</span> Adicionar resultado
            </button>
          </div>

          {outcomes.map((outcome, index) => (
            <div key={outcome.key} className="rounded-3xl border border-[var(--color-border)] overflow-hidden shadow-lg shadow-slate-950/5"
              style={{ backgroundColor: 'var(--color-surface-elevated)' }}>
              <div className="p-6 sm:p-8 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-black text-brand-500 uppercase tracking-wider">Resultado {index + 1}</span>
                  <button type="button" onClick={() => removeOutcome(index)}
                    className="text-red-500 hover:text-red-600 hover:bg-red-500/10 px-3 py-1.5 rounded-lg transition text-sm font-semibold">
                    🗑️ Remover
                  </button>
                </div>
                <input type="text" required value={outcome.title} onChange={(e) => updateOutcome(index, "title", e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500 outline-none transition font-bold text-lg"
                  placeholder="Título do resultado" />
                <textarea required value={outcome.description} onChange={(e) => updateOutcome(index, "description", e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500 outline-none transition font-medium h-24 resize-none"
                  placeholder="Descrição do resultado..." />
              </div>
            </div>
          ))}

          {outcomes.length === 0 && (
            <div className="text-center py-12 rounded-3xl border-2 border-dashed border-[var(--color-border)]">
              <div className="text-4xl mb-3">🏆</div>
              <p className="text-[var(--color-text-muted)] font-medium mb-1">Nenhum resultado ainda</p>
              <p className="text-sm text-[var(--color-text-muted)]">Adicione resultados para quizzes de personalidade</p>
            </div>
          )}

          <button type="button" onClick={addOutcome}
            className="w-full py-4 rounded-3xl border-2 border-dashed border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-brand-500 hover:border-brand-300 dark:hover:border-brand-700 hover:bg-brand-500/5 transition font-bold flex items-center justify-center gap-2">
            <span className="text-xl">+</span> Adicionar novo resultado
          </button>
        </div>
      )}

      {/* Submit */}
      <div className="fixed bottom-4 left-0 right-0 z-30 mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="flex justify-end rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)]/95 p-3 shadow-2xl shadow-slate-950/10 backdrop-blur">
        <button type="submit" disabled={loading || !canSubmit}
          className="px-10 py-4 bg-brand-500 text-white font-black rounded-2xl hover:bg-brand-600 transition disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-brand-500/20 text-base flex items-center gap-2">
          {loading ? (
            <>
              <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/></svg>
              Publicando...
            </>
          ) : (
            <>
              <span>🚀</span> Publicar Quiz
            </>
          )}
        </button>
        </div>
      </div>
    </form>
  );
}
