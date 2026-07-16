import type { APIRoute } from "astro";
import { getCollection, type CollectionEntry } from "astro:content";
import { apiFetch } from "@/lib/api";
import { exploreCategories, getExploreCategoryUrl } from "@/lib/exploreCategories";

type QuizSitemapEntry = {
  slug: string;
  updated_at?: string;
};

async function fetchAllPublishedQuizzes() {
  const limit = 200;
  const maxPages = 200;
  const all: QuizSitemapEntry[] = [];

  for (let page = 1; page <= maxPages; page++) {
    const response = await apiFetch(`/quizzes?limit=${limit}&page=${page}`);
    const pageItems = (response?.data || []) as QuizSitemapEntry[];

    if (!Array.isArray(pageItems) || pageItems.length === 0) {
      break;
    }

    all.push(...pageItems);

    if (pageItems.length < limit) {
      break;
    }
  }

  return all;
}

export const GET: APIRoute = async ({ site }) => {
  const baseUrl = site?.toString().replace(/\/$/, "") || "https://funsona.com";
  const locales = ["pt", "en", "es"] as const;
  const defaultLocale = "pt";
  const withLocale = (path: string, locale: (typeof locales)[number]) => {
    if (locale === defaultLocale) return path;
    return path === "/" ? `/${locale}` : `/${locale}${path}`;
  };
  
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

  const localizedStaticUrls = locales.flatMap((locale) =>
    basePaths.map((entry) => ({
      loc: `${baseUrl}${withLocale(entry.path, locale)}`,
      changefreq: entry.changefreq,
      priority: entry.priority,
    }))
  );

  const localizedQuizUrls = locales.flatMap((locale) =>
    (quizzes || []).map((quiz) => ({
      loc: `${baseUrl}${withLocale(`/quiz/${quiz.slug}`, locale)}`,
      changefreq: "weekly",
      priority: 0.8,
      lastmod: quiz.updated_at?.split("T")[0],
    }))
  );

  // Guide entries carry their own locale in the collection id (`<locale>/<slug>`),
  // so each one maps to exactly one localized URL rather than being repeated
  // across all locales like the static paths above.
  const guideUrls = guides.map((guide: CollectionEntry<"guides">) => {
    const [locale, slug] = guide.id.split("/");
    return {
      loc: `${baseUrl}${withLocale(`/guides/${slug}`, locale as (typeof locales)[number])}`,
      changefreq: "monthly",
      priority: 0.6,
      lastmod: (guide.data.updatedDate || guide.data.publishedDate).toISOString().split("T")[0],
    };
  });

  const uniqueUrls = new Map<string, { loc: string; changefreq: string; priority: number; lastmod?: string }>();
  for (const entry of [...localizedStaticUrls, ...localizedQuizUrls, ...guideUrls]) {
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
    },
  });
};
