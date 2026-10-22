import { apiFetch } from "@/lib/api";

// The API clamps `limit` to 50 (see apps/api/src/routes/quizzes.ts), so asking for
// more silently returns 50. The sitemap was capped at 50 quizzes by exactly that, and
// so were the category pages, which asked for 300 and read the first page as the
// whole catalogue: on 2026-10-22, 16 of the 66 curated quizzes were in no category.
const PAGE_SIZE = 50;
const MAX_PAGES = 400;

/**
 * Every quiz the public listing returns (curated and published, since slice 2 of the
 * AdSense plan), across all pages.
 *
 * Walking the pages one after another took 10-13s in production, long enough for
 * Search Console to give up on the sitemap. The first response carries `meta.total`,
 * so only that call has to happen first; the remaining pages are fetched at once.
 */
export async function fetchAllPublishedQuizzes<T extends { slug?: string }>(sort = ""): Promise<T[]> {
  const query = (page: number) => `/quizzes?limit=${PAGE_SIZE}&page=${page}${sort ? `&sort=${encodeURIComponent(sort)}` : ""}`;
  const firstResponse = await apiFetch(query(1));
  const firstPage = (firstResponse?.data || []) as T[];
  if (!Array.isArray(firstPage) || firstPage.length === 0) return [];

  const total = firstResponse?.meta?.total;
  const pageCount =
    typeof total === "number" && total > 0 ? Math.min(Math.ceil(total / PAGE_SIZE), MAX_PAGES) : 1;

  const remaining = await Promise.all(
    Array.from({ length: Math.max(0, pageCount - 1) }, (_, index) =>
      apiFetch(query(index + 2)).then((response) => (response?.data || []) as T[]),
    ),
  );

  // Dedupe by slug: paging a list that is being written to can repeat a row across
  // page boundaries, and a duplicate <loc> invalidates the sitemap.
  const seenSlugs = new Set<string>();
  const all: T[] = [];
  for (const item of [firstPage, ...remaining].flat()) {
    if (item?.slug && !seenSlugs.has(item.slug)) {
      seenSlugs.add(item.slug);
      all.push(item);
    }
  }
  return all;
}
