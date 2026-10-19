"""Pick the curated core for slice 3 of docs/plans/adsense-low-value-content.

Decision (owner, 2026-10-18): clicks first. Candidates are the quiz URLs with at least one Search
click in the GSC window; the exclusions decided in the plan are applied, each with its reason.
Writes core.csv next to this file. Reads only; nothing here touches the database.

Usage:
  python scripts/adsense-core/pick_core.py <gsc_pages.json> <d1_quizzes.json>

  gsc_pages.json   sitestats gsc funsona --dim page --days 90 --limit 1000 --json
  d1_quizzes.json  wrangler d1 execute funsona-db --remote --json --command
                   "SELECT q.slug, q.title, q.status, q.ads_eligible, q.attempts_count, q.author_id,
                    p.handle FROM quizzes q JOIN profiles p ON p.id = q.author_id"
"""
import csv
import json
import pathlib
import re
import sys
from collections import defaultdict

HERE = pathlib.Path(__file__).resolve().parent
ROOT = HERE.parents[1]
SEED = "00000000-0000-0000-0000-000000000000"

# Decided outside the core (pitch, Decisions table): restricted-adjacent themes.
SENSITIVE_PREFIXES = (
    "qual-personagem-yaoi-voce-e",
    "quantas-pessoas-querem-que-voce-morra",
    "descubra-quao-atraente-voce-e",
)


def duplicate_slugs() -> set[str]:
    """The derivative side of each near-duplicate pair in scripts/duplicate-quizzes.md."""
    text = (ROOT / "scripts/duplicate-quizzes.md").read_text()
    return {m.group(1) for m in re.finditer(r"^\| `([a-z0-9-]+)` \|", text, re.M) if "..." not in m.group(1)}


def broken_image_slugs() -> dict[str, str]:
    """Quizzes the 2026-08-20 audit found with broken or placeholder images."""
    out = {}
    with open(ROOT / "scripts/quiz-audit-2026-08-20/quiz-audit.csv") as f:
        for row in csv.DictReader(f):
            broken, placeholder = int(row["broken_images"] or 0), int(row["placeholder_images"] or 0)
            if placeholder:
                out[row["slug"]] = f"{placeholder} unresolved %GIPHY placeholder image(s)"
            elif broken:
                out[row["slug"]] = f"{broken} broken image(s) in the 2026-08-20 audit"
    return out


def main(gsc_path: str, d1_path: str) -> None:
    gsc = json.load(open(gsc_path))
    clicks: dict[str, int] = defaultdict(int)
    impressions: dict[str, int] = defaultdict(int)
    for row in gsc["rows"]:
        m = re.search(r"/quiz/([^/?#]+)", row["keys"][0])
        if m:
            clicks[m.group(1)] += row["clicks"]
            impressions[m.group(1)] += row["impressions"]

    quizzes = {r["slug"]: r for r in json.load(open(d1_path))[0]["results"]}
    dupes, broken = duplicate_slugs(), broken_image_slugs()
    total_quiz_clicks = sum(clicks.values())

    rows = []
    for slug in sorted(clicks, key=lambda s: (-clicks[s], -impressions[s], s)):
        if clicks[slug] < 1:
            continue
        q = quizzes.get(slug)
        if q is None:
            decision, reason = "drop", "slug no longer exists (old URL still in GSC)"
        elif q["status"] != "PUBLISHED":
            decision, reason = "drop", f"status {q['status']}"
        elif q["author_id"] != SEED:
            decision, reason = "drop", f"community quiz by @{q['handle']} (curation out of scope)"
        elif slug.startswith(SENSITIVE_PREFIXES):
            decision, reason = "drop", "sensitive theme (owner decision)"
        elif slug in dupes:
            decision, reason = "drop", "near-duplicate of another quiz (scripts/duplicate-quizzes.md)"
        elif slug in broken:
            decision, reason = "drop", broken[slug]
        else:
            decision, reason = "keep", "clicked in the GSC window"
        rows.append({
            "slug": slug,
            "title": q["title"] if q else "",
            "clicks": clicks[slug],
            "impressions": impressions[slug],
            "attempts": q["attempts_count"] if q else "",
            "decision": decision,
            "reason": reason,
        })

    out = HERE / "core.csv"
    with open(out, "w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=list(rows[0]))
        w.writeheader()
        w.writerows(rows)

    kept = [r for r in rows if r["decision"] == "keep"]
    kept_clicks = sum(r["clicks"] for r in kept)
    print(f"GSC window {gsc['start']} .. {gsc['end']}: {len(rows)} quiz URLs with clicks, {total_quiz_clicks} quiz clicks")
    print(f"keep {len(kept)}  ·  drop {len(rows) - len(kept)}  ·  kept clicks {kept_clicks}/{total_quiz_clicks} "
          f"({100 * kept_clicks / total_quiz_clicks:.0f}%)")
    reasons: dict[str, int] = defaultdict(int)
    for r in rows:
        if r["decision"] == "drop":
            reasons[re.sub(r"@\S+|\d+ ", "", r["reason"])] += 1
    for reason, n in sorted(reasons.items(), key=lambda kv: -kv[1]):
        print(f"  drop {n:3}  {reason}")
    print(f"wrote {out.relative_to(ROOT)}")


if __name__ == "__main__":
    main(*sys.argv[1:3])
