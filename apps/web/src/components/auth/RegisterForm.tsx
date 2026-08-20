import { useState, type ComponentProps } from "react";
import { beginOAuth, clerkErrorMessage, getClerk, type OAuthProvider } from "@/lib/clerk-client";

type FormSubmitEvent = Parameters<NonNullable<ComponentProps<"form">["onSubmit"]>>[0];

const inputClass =
  "w-full rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3.5 text-[var(--color-text-primary)] outline-none transition-all placeholder:text-[var(--color-text-muted)] focus:border-brand-500 focus:ring-4 focus:ring-brand-500/15";

// Fully custom sign-up UI in the site's own design language; Clerk is only the
// client SDK underneath (see lib/clerk-client.ts). Sign-up is a two-step flow:
// create the account, then confirm the email verification code Clerk sends.
// The username feeds the profile handle and the display name feeds first_name
// — exactly what the Clerk webhook maps into the FunSona profile.
export default function RegisterForm() {
  const [step, setStep] = useState<"form" | "verify">("form");
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleOAuth(strategy: OAuthProvider) {
    setError("");
    setLoading(true);
    try {
      await beginOAuth(strategy);
    } catch (err) {
      setError(clerkErrorMessage(err, "Não foi possível iniciar o cadastro social."));
      setLoading(false);
    }
  }

  async function handleSubmit(e: FormSubmitEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const clerk = await getClerk();
      await clerk.client!.signUp.create({
        username,
        firstName: displayName,
        emailAddress: email,
        password,
      });
      await clerk.client!.signUp.prepareEmailAddressVerification({ strategy: "email_code" });
      setStep("verify");
      setLoading(false);
    } catch (err) {
      setError(clerkErrorMessage(err, "Erro ao criar conta"));
      setLoading(false);
    }
  }

  async function handleVerify(e: FormSubmitEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const clerk = await getClerk();
      const attempt = await clerk.client!.signUp.attemptEmailAddressVerification({ code });
      if (attempt.status === "complete") {
        await clerk.setActive({ session: attempt.createdSessionId });
        window.location.href = "/profile/me";
        return;
      }
      setError("Não foi possível concluir o cadastro. Tente novamente.");
      setLoading(false);
    } catch (err) {
      setError(clerkErrorMessage(err, "Código incorreto. Confira o email e tente de novo"));
      setLoading(false);
    }
  }

  async function handleResend() {
    setError("");
    try {
      const clerk = await getClerk();
      await clerk.client!.signUp.prepareEmailAddressVerification({ strategy: "email_code" });
    } catch (err) {
      setError(clerkErrorMessage(err, "Não foi possível reenviar o código."));
    }
  }

  if (step === "verify") {
    return (
      <form onSubmit={handleVerify} className="space-y-5">
        <div className="rounded-2xl border border-brand-500/25 bg-brand-500/10 px-4 py-3 text-sm text-[var(--color-text-secondary)]">
          Enviamos um código de 6 dígitos para <span className="font-bold text-[var(--color-text-primary)]">{email}</span>.
        </div>
        <div>
          <label className="block text-sm font-semibold text-[var(--color-text-secondary)] mb-2">Código de verificação</label>
          <input
            type="text"
            required
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            placeholder="000000"
            className={`${inputClass} text-center text-2xl font-black tracking-[0.5em]`}
          />
        </div>

        {error && (
          <div className="flex items-center gap-2 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading || code.length < 6}
          className="w-full rounded-2xl bg-gradient-to-r from-brand-600 to-accent-600 px-4 py-3.5 font-black text-white shadow-lg shadow-brand-500/25 transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-brand-500/30 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "Confirmando..." : "Confirmar código"}
        </button>
        <p className="text-center text-sm text-[var(--color-text-secondary)]">
          Não chegou?{" "}
          <button type="button" onClick={handleResend} className="font-bold text-brand-500 hover:text-brand-400 hover:underline">
            Reenviar código
          </button>
        </p>
      </form>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <button
          type="button"
          onClick={() => handleOAuth("oauth_discord")}
          disabled={loading}
          aria-label="Cadastrar com Discord"
          className="flex items-center justify-center rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] py-3 transition hover:-translate-y-0.5 hover:border-brand-500/60 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <svg className="h-5 w-5 text-[#5865F2]" viewBox="0 0 24 24" fill="currentColor">
            <path d="M20.317 4.37a19.79 19.79 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.058a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128c.126-.094.252-.192.372-.291a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z" />
          </svg>
        </button>
        <button
          type="button"
          onClick={() => handleOAuth("oauth_google")}
          disabled={loading}
          aria-label="Cadastrar com Google"
          className="flex items-center justify-center rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] py-3 transition hover:-translate-y-0.5 hover:border-brand-500/60 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
        </button>
        <button
          type="button"
          onClick={() => handleOAuth("oauth_x")}
          disabled={loading}
          aria-label="Cadastrar com X"
          className="flex items-center justify-center rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] py-3 transition hover:-translate-y-0.5 hover:border-brand-500/60 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <svg className="h-4 w-4 text-[var(--color-text-primary)]" viewBox="0 0 24 24" fill="currentColor">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
          </svg>
        </button>
      </div>

      <div className="relative pt-1">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-[var(--color-border)]" />
        </div>
        <div className="relative flex justify-center text-xs font-bold uppercase tracking-[0.12em]">
          <span className="px-3 bg-[var(--color-surface-elevated)] text-[var(--color-text-muted)]">ou</span>
        </div>
      </div>

      <div>
        <label className="block text-sm font-semibold text-[var(--color-text-secondary)] mb-2">Nome de usuário</label>
        <input
          type="text"
          required
          minLength={3}
          maxLength={30}
          pattern="[a-zA-Z0-9_]+"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="ex: maria_quiz"
          className={inputClass}
        />
        <p className="text-xs text-[var(--color-text-muted)] mt-1">Apenas letras, números e underscores</p>
      </div>
      <div>
        <label className="block text-sm font-semibold text-[var(--color-text-secondary)] mb-2">Nome de exibição</label>
        <input
          type="text"
          required
          maxLength={50}
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="ex: Maria Silva"
          className={inputClass}
        />
      </div>
      <div>
        <label className="block text-sm font-semibold text-[var(--color-text-secondary)] mb-2">Email</label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="seu@email.com"
          className={inputClass}
        />
      </div>
      <div>
        <label className="block text-sm font-semibold text-[var(--color-text-secondary)] mb-2">Senha</label>
        <input
          type="password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Mínimo 8 caracteres"
          className={inputClass}
        />
      </div>

      {error && (
        <div className="flex items-center gap-2 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
          <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-2xl bg-gradient-to-r from-brand-600 to-accent-600 px-4 py-3.5 font-black text-white shadow-lg shadow-brand-500/25 transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-brand-500/30 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? "Criando conta..." : "Criar conta"}
      </button>
    </form>
  );
}
