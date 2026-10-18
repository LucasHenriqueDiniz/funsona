"""Slice 2 of docs/plans/adsense-low-value-content: one flag decides index, ad code and listings.

Runs against the local stack on a copy of production data, never against production:
  - api-prod-copy  (.claude/launch.json): wrangler dev on apps/api/.wrangler/prod-copy, port 8787
  - web-local-api  (.claude/launch.json): the web app pointed at that API, port 4323

It flips ads_eligible on one quiz in the local copy, checks every place the flag must reach, flips
it back and checks again, so a check that ignores the flag cannot pass.

Usage: python scripts/adsense/check-slice-02.py
"""
import glob
import pathlib
import re
import sqlite3
import subprocess
import sys
import time
import urllib.parse

ROOT = pathlib.Path(__file__).resolve().parents[2]
WEB = "http://localhost:4323"
DB_GLOB = str(ROOT / "apps/api/.wrangler/prod-copy/v3/d1/miniflare-D1DatabaseObject/*.sqlite")
SEED = "00000000-0000-0000-0000-000000000000"

results: list[tuple[bool, str]] = []


def check(ok: bool, label: str) -> bool:
    results.append((ok, label))
    print(f"{'PASS' if ok else 'FAIL'}  {label}", flush=True)
    return ok


def fetch(path: str) -> tuple[int, str]:
    out = subprocess.run(
        ["/usr/bin/curl", "-s", "-m", "90", "-w", "\n%{http_code}", WEB + path],
        capture_output=True, text=True,
    ).stdout
    body, _, status = out.rpartition("\n")
    return int(status or 0), body


def robots_noindex(html: str) -> bool:
    return bool(re.search(r'<meta name="robots" content="noindex, follow"', html))


def has_loader(html: str) -> bool:
    return "adsbygoogle.js" in html


def linked_slugs(html: str) -> set[str]:
    return set(re.findall(r'/quiz/([a-z0-9][a-z0-9-]*)', html))


def sitemap_slugs() -> set[str]:
    _, xml = fetch("/sitemap.xml")
    return set(re.findall(r"<loc>https?://[^<]*/quiz/([^<]+)</loc>", xml))


db_path = glob.glob(DB_GLOB)
if not db_path:
    sys.exit(f"no local D1 copy at {DB_GLOB}")
db = sqlite3.connect(db_path[0])


def q(sql: str, *args):
    return db.execute(sql, args).fetchall()


def set_flag(slug: str, value: int) -> None:
    db.execute("UPDATE quizzes SET ads_eligible = ? WHERE slug = ?", (value, slug))
    db.commit()


curated = {r[0] for r in q("SELECT slug FROM quizzes WHERE status='PUBLISHED' AND ads_eligible=1")}
community = {r[0] for r in q("SELECT slug FROM quizzes WHERE status='PUBLISHED' AND ads_eligible=0")}
print(f"      local copy: {len(curated)} curated, {len(community)} not curated", flush=True)

# 1. A non-curated quiz: playable, out of the index, no ad code.
status, html = fetch("/quiz/6-ano")
check(status == 200, f"/quiz/6-ano (not curated) answers {status}")
check(robots_noindex(html), "/quiz/6-ano carries noindex, follow")
check(not has_loader(html), "/quiz/6-ano carries no AdSense loader")
status, html = fetch("/quiz/6-ano/play")
check(not has_loader(html), "/quiz/6-ano/play carries no AdSense loader")

# 2. A curated quiz: indexed, with ad code.
status, html = fetch("/quiz/que-arma-voce-tem-descubra-sua-arma-interior")
check(status == 200 and not robots_noindex(html), "curated quiz has no robots noindex")
check(has_loader(html), "curated quiz carries the AdSense loader")

# 3. Sitemap = D1.
sm = sitemap_slugs()
check(sm == curated, f"sitemap quiz URLs = curated rows in D1 ({len(sm)} vs {len(curated)})")

# 4. Listings and search never link a non-curated quiz.
pages = ["/", "/explore", "/explore/personality", "/explore/trivia", "/explore?sort=plays"]
leaked = {p: linked_slugs(fetch(p)[1]) & community for p in pages}
check(all(not v for v in leaked.values()), f"no non-curated slug linked from {len(pages)} listing pages {leaked if any(leaked.values()) else ''}")
title = q("SELECT title FROM quizzes WHERE slug = ?", "marginalizacao-social-e-seus-efeitos-na-saude-mv7biwmm")[0][0]
word = title.split()[0]
_, html = fetch("/search?q=" + urllib.parse.quote(word))
check("marginalizacao-social-e-seus-efeitos-na-saude-mv7biwmm" not in html, f"search for '{word}' does not return the community quiz")

# 5. Loader is opt-in: on for home, explore and guides, off everywhere else.
for path, want in [("/", True), ("/explore", True), ("/guides", True), ("/about", False), ("/privacy", False),
                   ("/login", False), ("/register", False), ("/leaderboard", False), ("/search?q=quiz", False)]:
    check(has_loader(fetch(path)[1]) == want, f"{path} loader {'present' if want else 'absent'}")

# 6. Public profiles list published quizzes only. The profile shows the newest 6, and the copy's
#    non-published quizzes (13 ARCHIVED duplicates) are all older than that, so a check that just
#    looks for them passes with no filter at all. Make one the newest for the duration of the check.
hidden = q("SELECT q.slug, q.created_at, p.handle FROM quizzes q JOIN profiles p ON p.id = q.author_id "
           "WHERE q.status != 'PUBLISHED' ORDER BY q.created_at DESC LIMIT 1")
if hidden:
    h_slug, h_created, h_handle = hidden[0]
    db.execute("UPDATE quizzes SET created_at = '2099-01-01T00:00:00.000Z' WHERE slug = ?", (h_slug,))
    db.commit()
    try:
        listed = h_slug in linked_slugs(fetch(f"/profile/{h_handle}")[1])
    finally:
        db.execute("UPDATE quizzes SET created_at = ? WHERE slug = ?", (h_created, h_slug))
        db.commit()
    check(not listed, f"non-published {h_slug}, made the newest, is not listed on /profile/{h_handle}")
else:
    print("      no non-published quizzes in the copy; the status filter is untested here", flush=True)

# 7. Flip one seed quiz off and back on. Pick the newest, so it is on /profile/admin and /explore.
target = q("SELECT slug, title FROM quizzes WHERE author_id = ? AND status='PUBLISHED' AND ads_eligible=1 ORDER BY created_at DESC LIMIT 1", SEED)[0]
slug, title = target
search_q = urllib.parse.quote(" ".join(title.split()[:4]))


def surfaces() -> dict[str, bool]:
    _, page = fetch(f"/quiz/{slug}")
    return {
        "indexed": not robots_noindex(page),
        "loader": has_loader(page),
        "sitemap": slug in sitemap_slugs(),
        "explore": slug in linked_slugs(fetch("/explore")[1]),
        "profile": slug in linked_slugs(fetch("/profile/admin")[1]),
        "search": slug in linked_slugs(fetch(f"/search?q={search_q}")[1]),
    }


before = surfaces()
check(all(before.values()), f"{slug} before the flip: {before}")
set_flag(slug, 0)
try:
    time.sleep(1)
    off = surfaces()
    check(not any(off.values()), f"{slug} with ads_eligible=0: {off}")
finally:
    set_flag(slug, 1)
time.sleep(1)
after = surfaces()
check(all(after.values()), f"{slug} restored to ads_eligible=1: {after}")

passed = sum(ok for ok, _ in results)
print(f"---- {passed} PASS, {len(results) - passed} FAIL")
sys.exit(0 if passed == len(results) else 1)
