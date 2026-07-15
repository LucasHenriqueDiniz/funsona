import type { APIRoute } from "astro";

export const GET: APIRoute = ({ site }) => {
  const baseUrl = site?.toString().replace(/\/$/, "") || "https://funsona.com";

  return new Response(
    `# Allow all crawlers to index the site
# AdSense and search engines are welcome

User-agent: Mediapartners-Google
Allow: /

User-agent: *
Allow: /
Disallow: /api/
Disallow: /admin/
Disallow: /auth/
Disallow: /quiz/*/play
Disallow: /private/

Sitemap: ${baseUrl}/sitemap.xml
`,
    {
      headers: {
        "Content-Type": "text/plain",
      },
    }
  );
};
