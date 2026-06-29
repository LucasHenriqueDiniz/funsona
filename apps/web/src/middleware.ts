import { defineMiddleware } from "astro:middleware";
import { PUBLIC_API_BASE_URL } from "@/lib/public-env";

export const onRequest = defineMiddleware(async (context, next) => {
  const protectedPaths = ["/profile/me", "/quiz/new", "/settings"];
  const path = context.url.pathname;

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
