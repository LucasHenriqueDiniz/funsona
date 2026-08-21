import { useState, type ComponentProps } from "react";
import { beginOAuth, clerkErrorMessage, getClerk, type OAuthProvider } from "@/lib/clerk-client";
import SocialButtons from "./SocialButtons";

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
      <SocialButtons action="Cadastrar" disabled={loading} onSelect={handleOAuth} />

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
