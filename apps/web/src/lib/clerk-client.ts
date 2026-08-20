// The auth forms are fully custom UI (see LoginForm/RegisterForm) — Clerk is
// used only as the underlying client SDK via window.Clerk, which the
// @clerk/astro integration injects and loads on every page. @clerk/astro/react
// exposes no useSignIn/useSignUp hooks (only useAuth), so custom flows go
// through the loaded Clerk instance directly.

type ClerkInstance = NonNullable<(Window & typeof globalThis)["Clerk"]>;

export async function getClerk(): Promise<ClerkInstance> {
  for (let i = 0; i < 200; i++) {
    const clerk = window.Clerk;
    if (clerk?.loaded) return clerk;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  throw new Error("Clerk não carregou");
}

/** Maps Clerk API errors to short pt-BR messages; falls back to Clerk's own text. */
export function clerkErrorMessage(err: unknown, fallback: string): string {
  const first = (err as { errors?: Array<{ code?: string; longMessage?: string; message?: string }> })
    ?.errors?.[0];
  if (!first) return fallback;
  switch (first.code) {
    case "form_identifier_not_found":
    case "form_password_incorrect":
      return "Email ou senha incorretos";
    case "form_identifier_exists":
      return "Já existe uma conta com esse email ou nome de usuário";
    case "form_username_invalid_character":
    case "form_username_invalid_length":
      return "Nome de usuário inválido";
    case "form_password_pwned":
      return "Essa senha apareceu em vazamentos de dados — escolha outra";
    case "form_password_length_too_short":
      return "A senha precisa ter pelo menos 8 caracteres";
    case "form_code_incorrect":
      return "Código incorreto. Confira o email e tente de novo";
    case "verification_expired":
      return "Código expirado. Reenvie e tente novamente";
    case "too_many_requests":
      return "Muitas tentativas. Aguarde um pouco e tente de novo";
    default:
      return first.longMessage || first.message || fallback;
  }
}

export type OAuthProvider = "oauth_discord" | "oauth_google" | "oauth_x";

export async function beginOAuth(strategy: OAuthProvider): Promise<void> {
  const clerk = await getClerk();
  await clerk.client?.signIn.authenticateWithRedirect({
    strategy,
    redirectUrl: "/sso-callback",
    redirectUrlComplete: "/profile/me",
  });
}
