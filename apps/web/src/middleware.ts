import { defineMiddleware } from "astro:middleware";
import { PUBLIC_API_BASE_URL } from "@/lib/public-env";

export const onRequest = defineMiddleware(async (context, next) => {
  const protectedPaths = ["/profile/me", "/quiz/new", "/settings"];
  const path = context.url.pathname;

  // A quiz is authored in exactly one language (quizzes.language) and is never
  // translated, so it has no locale variants — yet Astro's i18n routing happily
  // served /en/quiz/x and /es/quiz/x as byte-identical copies of /quiz/x. That
  // tripled every quiz URL and reads as scaled/duplicate content. Collapse them
  // onto the single canonical URL. Static pages are genuinely translated, so
  // this deliberately only covers /quiz/*.
  const localizedQuizPath = path.match(/^\/(?:en|es)(\/quiz\/.+)$/);
  if (localizedQuizPath) {
    return context.redirect(`${localizedQuizPath[1]}${context.url.search}`, 301);
  }

  if (protectedPaths.some((p) => path.startsWith(p))) {
    // Try to fetch /auth/me to check session
    try {
      const res = await fetch(`${PUBLIC_API_BASE_URL}/auth/me`, {
        credentials: "include",
        headers: {
          cookie: context.request.headers.get("cookie") || "",
        },
      });
      const data = await res.json();
      if (!data.success) {
        return context.redirect("/login");
      }
      // Attach user to locals for use in pages
      context.locals.user = data.data;
    } catch {
      return context.redirect("/login");
    }
  }

  return next();
});
