import { useState, type ComponentProps } from "react";
import { beginGoogleOAuth } from "@/lib/oauth";
import { PUBLIC_API_BASE_URL } from "@/lib/public-env";

type FormSubmitEvent = Parameters<NonNullable<ComponentProps<"form">["onSubmit"]>>[0];

export default function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleGoogleLogin() {
    setError("");
    setLoading(true);

    try {
      await beginGoogleOAuth();
    } catch {
      setError("Nao foi possivel iniciar o login com Google.");
      setLoading(false);
    }
  }

  async function handleSubmit(e: FormSubmitEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch(`${PUBLIC_API_BASE_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
        credentials: "include",
      });

      const data = await res.json();
      if (!data.success) {
        setError(data.error || "Email ou senha incorretos");
        setLoading(false);
        return;
      }

      window.location.href = "/profile/me";
    } catch {
      setError("Erro de conexão. Tente novamente.");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label className="block text-sm font-semibold text-[var(--color-text-secondary)] mb-2">Email</label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="seu@email.com"
          className="w-full rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3.5 text-[var(--color-text-primary)] outline-none transition-all placeholder:text-[var(--color-text-muted)] focus:border-brand-500 focus:ring-4 focus:ring-brand-500/15"
        />
      </div>
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-semibold text-[var(--color-text-secondary)]">Senha</label>
          <a href="#" className="text-xs text-brand-500 hover:text-brand-600 font-medium">
            Esqueceu?
          </a>
        </div>
        <input
          type="password"
          required
          minLength={6}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          className="w-full rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3.5 text-[var(--color-text-primary)] outline-none transition-all placeholder:text-[var(--color-text-muted)] focus:border-brand-500 focus:ring-4 focus:ring-brand-500/15"
        />
      </div>

      {error && (
        <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-100 rounded-xl text-red-700 text-sm">
          <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-2xl bg-brand-600 px-4 py-3.5 font-bold text-white shadow-lg shadow-brand-500/25 transition-all hover:-translate-y-0.5 hover:bg-brand-700 hover:shadow-xl hover:shadow-brand-500/30 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            Entrando...
          </span>
        ) : (
          "Entrar"
        )}
      </button>

      <div className="relative pt-1">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-[var(--color-border)]" />
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-3 bg-[var(--color-surface-elevated)] text-[var(--color-text-muted)]">ou continue com</span>
        </div>
      </div>

      <button
        type="button"
        onClick={handleGoogleLogin}
        disabled={loading}
        className="flex w-full items-center justify-center gap-2.5 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3.5 font-semibold text-[var(--color-text-primary)] transition hover:border-brand-500/40 hover:bg-brand-500/5 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <svg className="w-5 h-5" viewBox="0 0 24 24">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
        </svg>
        Entrar com Google
      </button>
    </form>
  );
}
