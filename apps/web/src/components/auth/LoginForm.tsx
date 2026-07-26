import { SignIn } from "@clerk/astro/react";

// Sign-in is now fully handled by Clerk's hosted component (email/password,
// Google OAuth, verification codes, error states — all built in). The
// surrounding card/editorial layout in pages/login.astro is unchanged; only
// the form internals moved to Clerk.
export default function LoginForm() {
  return (
    <SignIn
      routing="hash"
      signUpUrl="/register"
      fallbackRedirectUrl="/profile/me"
      appearance={{
        elements: {
          rootBox: "w-full",
          card: "shadow-none border-none bg-transparent p-0 w-full",
          headerTitle: "hidden",
          headerSubtitle: "hidden",
          footer: "hidden",
          formButtonPrimary:
            "rounded-2xl bg-brand-600 hover:bg-brand-700 text-white font-bold shadow-lg shadow-brand-500/25",
          formFieldInput:
            "rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-primary)]",
          socialButtonsBlockButton: "rounded-2xl border border-[var(--color-border)]",
        },
      }}
    />
  );
}
