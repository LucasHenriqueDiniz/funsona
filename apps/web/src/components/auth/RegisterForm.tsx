import { SignUp } from "@clerk/astro/react";

// Sign-up is now fully handled by Clerk's hosted component (username/email/
// password, Google OAuth, email verification code step — all built in).
export default function RegisterForm() {
  return (
    <SignUp
      routing="hash"
      signInUrl="/login"
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
