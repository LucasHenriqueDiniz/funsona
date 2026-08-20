import { SignIn } from "@clerk/astro/react";

// Sign-in is fully handled by Clerk's hosted component (email/password,
// social OAuth, verification codes, error states — all built in). Theming
// and pt-BR localization come from the global clerk() config in
// astro.config.mjs — Clerk's new UI ignores the legacy per-component
// `elements` slot classes, so don't add appearance overrides here.
export default function LoginForm() {
  return <SignIn routing="hash" signUpUrl="/register" fallbackRedirectUrl="/profile/me" />;
}
