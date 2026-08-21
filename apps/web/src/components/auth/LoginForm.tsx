import { useState, type ComponentProps } from "react";
import { beginOAuth, clerkErrorMessage, getClerk, type OAuthProvider } from "@/lib/clerk-client";
import SocialButtons from "./SocialButtons";

type FormSubmitEvent = Parameters<NonNullable<ComponentProps<"form">["onSubmit"]>>[0];

// Fully custom sign-in UI in the site's own design language; Clerk is only
// the client SDK underneath (see lib/clerk-client.ts). The prebuilt <SignIn>
// widget was dropped because its look couldn't be brought in line with the
// site (its new UI ignores the legacy `elements` appearance API).
export default function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleOAuth(strategy: OAuthProvider) {
    setError("");
    setLoading(true);
    try {
      await beginOAuth(strategy);
    } catch (err) {
      setError(clerkErrorMessage(err, "Não foi possível iniciar o login social."));
      setLoading(false);
    }
  }

  async function handleSubmit(e: FormSubmitEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const clerk = await getClerk();
      const attempt = await clerk.client!.signIn.create({ identifier: email, password });

      if (attempt.status === "complete") {
        await clerk.setActive({ session: attempt.createdSessionId });
        window.location.href = "/profile/me";
        return;
      }

      // Only reachable with extra factors enabled (2FA etc.), which this
      // instance doesn't use — surface something actionable just in case.
      setError("Essa conta exige verificação adicional. Entre pelo login social.");
      setLoading(false);
    } catch (err) {
      setError(clerkErrorMessage(err, "Email ou senha incorretos"));
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <SocialButtons action="Entrar" disabled={loading} onSelect={handleOAuth} />

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
        <label className="block text-sm font-semibold text-[var(--color-text-secondary)] mb-2">Senha</label>
        <input
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          className="w-full rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3.5 text-[var(--color-text-primary)] outline-none transition-all placeholder:text-[var(--color-text-muted)] focus:border-brand-500 focus:ring-4 focus:ring-brand-500/15"
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
    </form>
  );
}
