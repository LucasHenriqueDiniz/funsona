/** Below this, a play or like count is not shown publicly. A page reading
 *  "0 plays · 0 likes" tells a visitor, and an AdSense reviewer, that nobody
 *  uses the site — on 2026-10-18, 652 of the 750 seed quizzes had zero plays.
 *  The count is hidden, not faked. */
export const PUBLIC_COUNT_THRESHOLD = 10;

/** The count when it clears the threshold, otherwise null so callers render nothing. */
export function publicCount(value: number | null | undefined): number | null {
  return typeof value === "number" && value >= PUBLIC_COUNT_THRESHOLD ? value : null;
}
