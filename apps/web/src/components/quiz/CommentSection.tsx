import { useState, useEffect, useCallback, type ComponentProps } from "react";
import { PUBLIC_API_BASE_URL } from "@/lib/public-env";

type FormSubmitEvent = Parameters<NonNullable<ComponentProps<"form">["onSubmit"]>>[0];

interface Profile {
  id: string;
  handle: string;
  display_name: string;
  avatar_url: string | null;
}

interface Comment {
  id: string;
  content: string;
  created_at: string;
  updated_at: string;
  user: Profile;
}

interface CommentSectionProps {
  quizSlug: string;
  currentUserId?: string | null;
}

export default function CommentSection({ quizSlug, currentUserId }: CommentSectionProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [reportedIds, setReportedIds] = useState<Set<string>>(new Set());

  const API_URL = PUBLIC_API_BASE_URL;

  const fetchComments = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_URL}/quizzes/${quizSlug}/comments`, { credentials: "include" });
      const json = await res.json();
      if (json.success) {
        setComments(json.data || []);
        setTotal(json.meta?.total || 0);
      } else {
        setError(json.error || "Erro ao carregar comentários");
      }
    } catch {
      setError("Erro ao carregar comentários");
    } finally {
      setLoading(false);
    }
  }, [quizSlug, API_URL]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  async function handleSubmit(e: FormSubmitEvent) {
    e.preventDefault();
    if (!content.trim() || submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/quizzes/${quizSlug}/comments`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: content.trim() }),
      });
      const json = await res.json();
      if (json.success) {
        setContent("");
        setComments((prev) => [json.data, ...prev]);
        setTotal((t) => t + 1);
      } else {
        setError(json.error || "Erro ao enviar comentário");
      }
    } catch {
      setError("Erro ao enviar comentário");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(commentId: string) {
    if (deletingId) return;
    setDeletingId(commentId);
    try {
      const res = await fetch(`${API_URL}/quizzes/${quizSlug}/comments/${commentId}`, {
        method: "DELETE",
        credentials: "include",
      });
      const json = await res.json();
      if (json.success) {
        setComments((prev) => prev.filter((c) => c.id !== commentId));
        setTotal((t) => Math.max(0, t - 1));
      } else {
        setError(json.error || "Erro ao excluir comentário");
      }
    } catch {
      setError("Erro ao excluir comentário");
    } finally {
      setDeletingId(null);
    }
  }

  async function handleReport(commentId: string) {
    if (reportedIds.has(commentId)) return;
    try {
      const res = await fetch(`${API_URL}/quizzes/${quizSlug}/comments/${commentId}/report`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const json = await res.json();
      if (json.success) {
        setReportedIds((prev) => new Set(prev).add(commentId));
      }
    } catch {
      // silent — reporting isn't critical-path, don't block the user on failure
    }
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <h3 className="text-xl font-black text-[var(--color-text-primary)]">Comentários</h3>
        <span className="px-3 py-1 bg-[var(--color-surface-muted)] text-[var(--color-text-muted)] rounded-full text-sm font-bold">
          {total}
        </span>
      </div>

      {currentUserId ? (
        <form onSubmit={handleSubmit} className="space-y-3">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Escreva um comentário..."
            rows={3}
            maxLength={1000}
            className="w-full px-4 py-3 bg-[var(--color-surface-elevated)] text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] rounded-xl border-2 border-[var(--color-border)] focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none transition resize-none"
          />
          <div className="flex items-center justify-between">
            <span className="text-xs text-[var(--color-text-muted)]">{content.length}/1000</span>
            <button
              type="submit"
              disabled={submitting || !content.trim()}
              className="px-5 py-2.5 bg-gradient-to-r from-brand-600 to-accent-600 text-white font-bold rounded-xl hover:from-brand-700 hover:to-accent-700 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-brand-500/20"
            >
              {submitting ? "Enviando..." : "Comentar"}
            </button>
          </div>
        </form>
      ) : (
        <div className="p-4 bg-[var(--color-surface-muted)] rounded-xl text-center text-sm text-[var(--color-text-muted)] border border-dashed border-[var(--color-border)]">
          <a href="/login" className="text-brand-500 font-bold hover:underline">Faça login</a> para comentar
        </div>
      )}

      {error && (
        <div className="p-3 bg-red-500/10 text-red-500 rounded-xl text-sm font-semibold border border-red-500/20">
          {error}
        </div>
      )}

      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex gap-3 animate-pulse">
              <div className="w-10 h-10 rounded-full bg-[var(--color-surface-muted)]" />
              <div className="flex-1 space-y-2">
                <div className="w-32 h-4 bg-[var(--color-surface-muted)] rounded" />
                <div className="w-full h-3 bg-[var(--color-surface-muted)] rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : comments.length === 0 ? (
        <div className="text-center py-10 text-[var(--color-text-muted)]">
          <p className="text-sm">Nenhum comentário ainda. Seja o primeiro!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {comments.map((comment) => (
            <div
              key={comment.id}
              className="flex gap-3 p-4 bg-[var(--color-surface-elevated)] rounded-2xl border border-[var(--color-border)] hover:border-[var(--color-border-hover)] transition"
            >
              <a href={`/profile/${comment.user.handle}`} className="shrink-0">
                {comment.user.avatar_url ? (
                  <img
                    src={comment.user.avatar_url}
                    alt={comment.user.display_name}
                    className="w-10 h-10 rounded-full object-cover border-2 border-[var(--color-border)]"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand-500 to-accent-500 flex items-center justify-center text-white font-bold text-sm">
                    {(comment.user.display_name || comment.user.handle || "?")[0].toUpperCase()}
                  </div>
                )}
              </a>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <a
                    href={`/profile/${comment.user.handle}`}
                    className="font-bold text-[var(--color-text-primary)] hover:text-brand-500 transition truncate"
                  >
                    {comment.user.display_name || comment.user.handle}
                  </a>
                  <span className="text-xs text-[var(--color-text-muted)]">@{comment.user.handle}</span>
                  <span className="text-xs text-[var(--color-text-muted)]">·</span>
                  <span className="text-xs text-[var(--color-text-muted)]">{formatDate(comment.created_at)}</span>
                </div>
                <p className="text-[var(--color-text-secondary)] text-sm leading-relaxed whitespace-pre-wrap">
                  {comment.content}
                </p>
              </div>
              {currentUserId === comment.user.id ? (
                <button
                  onClick={() => handleDelete(comment.id)}
                  disabled={deletingId === comment.id}
                  className="shrink-0 text-[var(--color-text-muted)] hover:text-red-500 transition p-1"
                  title="Excluir comentário"
                >
                  {deletingId === comment.id ? (
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  )}
                </button>
              ) : currentUserId ? (
                <button
                  onClick={() => handleReport(comment.id)}
                  disabled={reportedIds.has(comment.id)}
                  className="shrink-0 text-xs font-semibold text-[var(--color-text-muted)] hover:text-red-500 transition disabled:text-red-500 disabled:opacity-70"
                  title="Denunciar comentário"
                >
                  {reportedIds.has(comment.id) ? "Denunciado" : "Denunciar"}
                </button>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
