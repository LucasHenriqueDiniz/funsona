import { SignUp } from "@clerk/astro/react";

// Sign-up is fully handled by Clerk's hosted component (username/email/
// password, social OAuth, email verification code step — all built in).
// Theming and pt-BR localization come from the global clerk() config in
// astro.config.mjs — Clerk's new UI ignores the legacy per-component
// `elements` slot classes, so don't add appearance overrides here.
export default function RegisterForm() {
  return <SignUp routing="hash" signInUrl="/login" fallbackRedirectUrl="/profile/me" />;
}
