import type { APIRoute } from "astro";
import { getCollection, type CollectionEntry } from "astro:content";
import { apiFetch } from "@/lib/api";
import { exploreCategories, getExploreCategoryUrl } from "@/lib/explore-categories";

type QuizSitemapEntry = {
  slug: string;
  updated_at?: string;
};

// The API clamps `limit` to 50 (see apps/api/src/routes/quizzes.ts), so asking
// for 200 silently returned 50 — and the old `pageItems.length < limit` guard
// then read that as "last page" and stopped after page 1. The sitemap has been
// capped at 50 quizzes ever since. Page at the real maximum instead.
const PAGE_SIZE = 50;
const MAX_PAGES = 400;

/**
 * Walking the pages one after another took 10-13s in production, and Google
 * gave up on it — Search Console reported "couldn't fetch the sitemap" with 0
 * pages found. Cloudflare does not cache this response either
 * (cf-cache-status: DYNAMIC), so the cost was paid on every request.
 *
 * The first response carries `meta.total`, so only that one call has to happen
 * before the rest: read the total, then fetch the remaining pages at once.
 */
async function fetchAllPublishedQuizzes() {
  const firstResponse = await apiFetch(`/quizzes?limit=${PAGE_SIZE}&page=1`);
  const firstPage = (firstResponse?.data || []) as QuizSitemapEntry[];
  if (!Array.isArray(firstPage) || firstPage.length === 0) return [];

  const total = firstResponse?.meta?.total;
  const pageCount =
    typeof total === "number" && total > 0
      ? Math.min(Math.ceil(total / PAGE_SIZE), MAX_PAGES)
      : 1;

  const remaining = await Promise.all(
    Array.from({ length: Math.max(0, pageCount - 1) }, (_, index) =>
      apiFetch(`/quizzes?limit=${PAGE_SIZE}&page=${index + 2}`).then(
        (response) => (response?.data || []) as QuizSitemapEntry[]
      )
    )
  );

  // Dedupe by slug: paging a list that is being written to can repeat a row
  // across page boundaries, and a duplicate <loc> invalidates the sitemap.
  const seenSlugs = new Set<string>();
  const all: QuizSitemapEntry[] = [];
  for (const item of [firstPage, ...remaining].flat()) {
    if (item?.slug && !seenSlugs.has(item.slug)) {
      seenSlugs.add(item.slug);
      all.push(item);
    }
  }
  return all;
}

export const GET: APIRoute = async ({ site }) => {
  const baseUrl = site?.toString().replace(/\/$/, "") || "https://funsona.com";
  const defaultLocale = "pt";

  // Only default-locale URLs are listed. Astro's `i18n` config does not by
  // itself generate /en/* or /es/* routes, and no such pages exist under
  // src/pages — every locale-prefixed URL returns 404 (verified against
  // production). This sitemap used to emit all three locales for every path,
  // so roughly two thirds of the URLs submitted to Google were dead links.
  const quizzes = await fetchAllPublishedQuizzes();
  const guides = await getCollection("guides");
  const basePaths = [
    { path: "/", changefreq: "daily", priority: 1.0 },
    { path: "/explore", changefreq: "daily", priority: 0.9 },
    ...exploreCategories.map((category) => ({
      path: getExploreCategoryUrl(category.slug),
      changefreq: "daily",
      priority: 0.8,
    })),
    { path: "/search", changefreq: "weekly", priority: 0.5 },
    { path: "/guides", changefreq: "weekly", priority: 0.6 },
  ] as const;

  const staticUrls = basePaths.map((entry) => ({
    loc: `${baseUrl}${entry.path}`,
    changefreq: entry.changefreq,
    priority: entry.priority,
  }));

  // Quizzes are authored in a single language and never translated, so each one
  // has exactly one URL. The locale-prefixed variants used to be listed here as
  // well, which put ~1,500 duplicate Portuguese pages in the sitemap; they now
  // 301 to the canonical URL (see src/middleware.ts).
  const quizUrls = (quizzes || []).map((quiz) => ({
    loc: `${baseUrl}/quiz/${quiz.slug}`,
    changefreq: "weekly",
    priority: 0.8,
    lastmod: quiz.updated_at?.split("T")[0],
  }));

  // Guide entries carry their locale in the collection id (`<locale>/<slug>`),
  // but /guides/[slug].astro only ever resolves the default locale, so only the
  // pt guides are actually reachable. The en/es ones were being submitted as
  // /en/guides/... and /es/guides/..., which 404. List just the reachable ones.
  const guideUrls = guides
    .filter((guide: CollectionEntry<"guides">) => guide.id.split("/")[0] === defaultLocale)
    .map((guide: CollectionEntry<"guides">) => ({
      loc: `${baseUrl}/guides/${guide.id.split("/")[1]}`,
      changefreq: "monthly",
      priority: 0.6,
      lastmod: (guide.data.updatedDate || guide.data.publishedDate).toISOString().split("T")[0],
    }));

  const uniqueUrls = new Map<string, { loc: string; changefreq: string; priority: number; lastmod?: string }>();
  for (const entry of [...staticUrls, ...quizUrls, ...guideUrls]) {
    uniqueUrls.set(entry.loc, entry);
  }
  const urls = Array.from(uniqueUrls.values());

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (url) => `  <url>
    <loc>${url.loc}</loc>
    ${url.lastmod ? `<lastmod>${url.lastmod}</lastmod>` : ""}
    <changefreq>${url.changefreq}</changefreq>
    <priority>${url.priority.toFixed(1)}</priority>
  </url>`
  )
  .join("\n")}
</urlset>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml",
      // Building this now costs one API round-trip per 50 quizzes, so let the
      // edge serve it from cache between crawls instead of re-paginating.
      "Cache-Control": "public, max-age=3600, s-maxage=21600",
    },
  });
};
