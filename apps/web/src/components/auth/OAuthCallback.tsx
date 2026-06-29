import { useEffect, useState } from "react";
import { finalizeOAuthLogin } from "@/lib/oauth";

export default function OAuthCallback() {
  const [message, setMessage] = useState("Finalizando login...");
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    async function run() {
      try {
        const safeNext = await finalizeOAuthLogin(setMessage);
        window.history.replaceState({}, document.title, "/auth/callback");
        window.location.replace(safeNext);
      } catch (error) {
        setFailed(true);
        setMessage(error instanceof Error ? error.message : "Falha de conexao ao finalizar login.");
      }
    }

    run();
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_top_left,rgba(99,102,241,0.28),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(236,72,153,0.2),transparent_32%),var(--color-surface)] px-6 py-10">
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-brand-500 via-accent-500 to-pink-500" />
      <div className="relative max-w-md w-full rounded-[2rem] border border-white/10 bg-[var(--color-surface-elevated)]/90 p-8 text-center shadow-2xl shadow-brand-950/10 backdrop-blur-xl">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-600 to-accent-600 text-white shadow-lg shadow-brand-500/25">
          {failed ? (
            <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v4m0 4h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            </svg>
          ) : (
            <svg className="h-8 w-8 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-90" fill="currentColor" d="M4 12a8 8 0 0 1 8-8V0C5.37 0 0 5.37 0 12h4z" />
            </svg>
          )}
        </div>
        <p className="mb-2 text-xs font-black uppercase tracking-[0.28em] text-brand-500">FunSona</p>
        <h1 className="text-2xl font-black text-[var(--color-text-primary)]">
          {failed ? "Nao deu para entrar" : "Preparando seu perfil"}
        </h1>
        <p className="mt-3 text-sm font-medium leading-6 text-[var(--color-text-secondary)]">{message}</p>

        {!failed && (
          <div className="mt-7 overflow-hidden rounded-full bg-[var(--color-surface-muted)]">
            <div className="h-2 w-2/3 animate-pulse rounded-full bg-gradient-to-r from-brand-500 to-accent-500" />
          </div>
        )}

        {failed && (
          <a href="/login" className="mt-7 inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-brand-600 to-accent-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-brand-500/20 transition hover:-translate-y-0.5">
            Tentar novamente
          </a>
        )}
      </div>
    </div>
  );
}
