"""Slice 0 of docs/plans/quiz-page-redesign: what the server HTML of /quiz/<slug> must carry.

curl + grep, no browser. Runs against any base URL that serves the web app: the live site
(https://funsona.com) or the local app against the production API (web-prod-api in
.claude/launch.json, http://localhost:4322). Quiz data comes from the API, which lists curated
quizzes only.

On 10 curated pages with intro_content:
  - the first sentence of intro_content.context and of every outcome is in the HTML;
  - the number of question titles from content.questions found in the HTML (must be 0 from slice 3);
  - no noindex, and the adsbygoogle loader present;
  - every /quiz/<slug> linked under "Mais para jogar" is curated and is not the page itself.
On 10 published, non-curated quizzes: noindex present and no loader, on the landing and on /play.
Candidates for those come from the local production copy's sqlite (read-only), confirmed through
the API, since no listing returns them.

Usage: python3 scripts/quiz-page/check-landing-html.py <base-url> [--api <api-base>]
"""
import argparse
import glob
import html as htmlmod
import json
import pathlib
import re
import sqlite3
import subprocess
import sys

ROOT = pathlib.Path(__file__).resolve().parents[2]
MAIN_CHECKOUT = pathlib.Path("/Users/maxter/dev/pessoal/funsona")
DB_GLOBS = [
    str(ROOT / "apps/api/.wrangler/prod-copy/v3/d1/miniflare-D1DatabaseObject/*.sqlite"),
    str(MAIN_CHECKOUT / "apps/api/.wrangler/prod-copy/v3/d1/miniflare-D1DatabaseObject/*.sqlite"),
]
SAMPLE = 10

results: list[tuple[bool, str]] = []


def check(ok: bool, label: str) -> bool:
    results.append((ok, label))
    print(f"{'PASS' if ok else 'FAIL'}  {label}", flush=True)
    return ok


def fetch(url: str) -> tuple[int, str]:
    out = subprocess.run(
        ["/usr/bin/curl", "-s", "-L", "-m", "120", "-w", "\n%{http_code}", url],
        capture_output=True, text=True,
    ).stdout
    body, _, status = out.rpartition("\n")
    return int(status or 0), body


def api_get(api: str, path: str):
    status, body = fetch(api + path)
    if status != 200:
        return None
    try:
        return json.loads(body).get("data")
    except json.JSONDecodeError:
        return None


def norm(text: str) -> str:
    return re.sub(r"\s+", " ", htmlmod.unescape(text)).strip()


def visible_text(page: str) -> str:
    page = re.sub(r"<(script|style)[^>]*>.*?</\1>", " ", page, flags=re.S | re.I)
    page = re.sub(r"<[^>]+>", " ", page)
    return norm(page)


def first_sentence(text: str) -> str:
    text = norm(text)
    m = re.match(r"(.+?[.!?])(\s|$)", text)
    return (m.group(1) if m else text)[:160]


def robots_noindex(page: str) -> bool:
    return bool(re.search(r'<meta name="robots" content="noindex, follow"', page))


def has_loader(page: str) -> bool:
    return "adsbygoogle.js" in page


def related_slugs(page: str) -> list[str]:
    i = page.find("Mais para jogar")
    if i < 0:
        return []
    tail = page[i:]
    end = re.search(r"</(aside|section)>", tail)
    block = tail[: end.start()] if end else tail
    seen: list[str] = []
    for s in re.findall(r'href="/quiz/([a-z0-9][a-z0-9-]*)"', block):
        if s not in seen:
            seen.append(s)
    return seen


def question_title(q: dict) -> str:
    return norm(q.get("title") or q.get("text") or "")


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("base", help="web base URL, e.g. https://funsona.com or http://localhost:4322")
    ap.add_argument("--api", default="https://api.funsona.com/api")
    args = ap.parse_args()
    base = args.base.rstrip("/")
    api = args.api.rstrip("/")

    listed = []
    for page in (1, 2):
        listed += api_get(api, f"/quizzes?limit=50&page={page}") or []
    curated_slugs = {q["slug"] for q in listed}
    with_intro = [q for q in listed if (q.get("intro_content") or {}).get("context")]
    sample = with_intro[:SAMPLE]
    print(f"      API lists {len(listed)} curated quizzes, {len(with_intro)} with intro_content; sampling {len(sample)}", flush=True)

    flag_pages = 0
    for quiz in sample:
        slug = quiz["slug"]
        status, page = fetch(f"{base}/quiz/{slug}")
        text = visible_text(page)
        if status != 200:
            check(False, f"{slug}: HTTP {status}")
            continue

        intro = first_sentence(quiz["intro_content"]["context"])
        outcomes = [o for o in (quiz.get("content") or {}).get("outcomes") or [] if (o.get("description") or "").strip()]
        missing = [o["title"] for o in outcomes if first_sentence(o["description"]) not in text]
        intro_ok = intro in text
        check(intro_ok and not missing,
              f"{slug}: intro first sentence {'present' if intro_ok else 'MISSING'}, outcomes present "
              f"{len(outcomes) - len(missing)}/{len(outcomes)}{' missing: ' + ', '.join(missing) if missing else ''}")

        questions = [question_title(q) for q in (quiz.get("content") or {}).get("questions") or []]
        questions = [q for q in questions if q]
        found = sum(1 for q in questions if q in text)
        check(found == 0, f"{slug}: question titles in the HTML {found}/{len(questions)} (must be 0)")

        flag_ok = not robots_noindex(page) and has_loader(page)
        flag_pages += flag_ok
        check(flag_ok, f"{slug}: curated → no noindex, loader present")

        rel = related_slugs(page)
        bad = [s for s in rel if s not in curated_slugs or s == slug]
        check(bool(rel) and not bad, f"{slug}: related {len(rel)} slugs, curated and not self{' (bad: ' + ', '.join(bad) + ')' if bad else ''}")

    # Non-curated: candidates from the production copy, each confirmed through the API.
    db_paths = [p for g in DB_GLOBS for p in glob.glob(g)]
    candidates: list[str] = []
    if db_paths:
        # immutable=1: read without touching the directory (no -shm/-wal), which mode=ro refuses here.
        db = sqlite3.connect(f"file:{db_paths[0]}?immutable=1", uri=True)
        candidates = [r[0] for r in db.execute(
            "SELECT slug FROM quizzes WHERE status='PUBLISHED' AND ads_eligible=0 ORDER BY created_at DESC LIMIT 30")]
    else:
        print("      no production copy found; pass non-curated slugs by editing DB_GLOBS", flush=True)

    non_curated: list[str] = []
    for slug in candidates:
        q = api_get(api, f"/quizzes/{slug}")
        if q and q.get("status") == "PUBLISHED" and not q.get("ads_eligible"):
            non_curated.append(slug)
        if len(non_curated) == SAMPLE:
            break
    print(f"      {len(non_curated)} non-curated published quizzes confirmed through the API", flush=True)

    for slug in non_curated:
        status, page = fetch(f"{base}/quiz/{slug}")
        _, play = fetch(f"{base}/quiz/{slug}/play")
        ok = status == 200 and robots_noindex(page) and not has_loader(page) and not has_loader(play)
        flag_pages += ok
        check(ok, f"{slug}: not curated → noindex, no loader on landing and /play (HTTP {status})")

    passed = sum(ok for ok, _ in results)
    print(f"---- flag rule {flag_pages}/{len(sample) + len(non_curated)} pages")
    print(f"---- {passed} PASS, {len(results) - passed} FAIL")
    return 0 if passed == len(results) else 1


if __name__ == "__main__":
    sys.exit(main())
