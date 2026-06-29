import type { APIRoute } from "astro";

export const GET: APIRoute = ({ site }) => {
  const baseUrl = site?.toString().replace(/\/$/, "") || "https://funsona.com";

  return new Response(
    `User-agent: *
Allow: /
Disallow: /api/
Disallow: /quiz/*/play

Sitemap: ${baseUrl}/sitemap.xml
`,
    {
      headers: {
        "Content-Type": "text/plain",
      },
    }
  );
};
