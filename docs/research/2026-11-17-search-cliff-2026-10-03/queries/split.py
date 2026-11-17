"""Split funsona.com's Search Console impressions by page group, before and after 2026-10-03.

Run from the repo root:

    python3 -I docs/research/2026-11-17-search-cliff-2026-10-03/queries/split.py [groups|daily|hosts|queries|inspect]

Reads the JSON in ../measurements/, written by
`sitestats gsc funsona --dim date,page|date,query --start 2026-09-03 --end 2026-11-15 --json`.
"""

import collections
import json
import pathlib
import sys
from urllib.parse import urlparse

HERE = pathlib.Path(__file__).resolve().parent.parent / "measurements"
PAGES = json.loads((HERE / "gsc-date-page-2026-09-03-to-11-15.json").read_text())["rows"]
QUERIES = json.loads((HERE / "gsc-date-query-2026-09-03-to-11-15.json").read_text())["rows"]

# Windows. "after" stops before the first deploy of 2026-10-18; "fixed" starts the day after
# the service-binding deploy of 2026-10-19.
WINDOWS = {
    "before (09-03..10-02, 30d)": ("2026-09-03", "2026-10-02"),
    "after (10-03..10-17, 15d)": ("2026-10-03", "2026-10-17"),
    "fixed (10-20..11-15, 27d)": ("2026-10-20", "2026-11-15"),
}

STATIC = {"about", "contact", "privacy", "terms", "premium", "register", "login"}


def group_of(url: str) -> str:
    path = urlparse(url).path.strip("/")
    seg = path.split("/") if path else []
    if not seg:
        return "home /"
    head = seg[0]
    if head == "quiz" and len(seg) == 2:
        return "quiz landing /quiz/<slug>"
    if head == "quiz":
        return "quiz other (/play, ...)"
    if head == "og":
        return "og image /og/..."
    if head == "explore":
        return "explore"
    if head == "guides":
        return "guides"
    if head in STATIC:
        return "static (about, contact, premium, ...)"
    if head in {"es", "en"}:
        return "locale /es /en"
    return "other"


def days(start: str, end: str) -> int:
    from datetime import date

    a, b = date.fromisoformat(start), date.fromisoformat(end)
    return (b - a).days + 1


def in_window(d: str, w: tuple[str, str]) -> bool:
    return w[0] <= d <= w[1]


def groups() -> None:
    sums = collections.defaultdict(lambda: collections.Counter())
    for r in PAGES:
        d, url = r["keys"]
        g = group_of(url)
        for name, w in WINDOWS.items():
            if in_window(d, w):
                sums[g][name] += r["impressions"]
    names = list(WINDOWS)
    print("| group | " + " | ".join(f"imp/day {n}" for n in names) + " | after / before |")
    print("|---|" + "---|" * (len(names) + 1))
    order = sorted(sums, key=lambda g: -sums[g][names[0]])
    for g in order:
        per = [sums[g][n] / days(*WINDOWS[n]) for n in names]
        ratio = f"{per[1] / per[0]:.2f}" if per[0] else "-"
        print(f"| {g} | " + " | ".join(f"{p:.1f}" for p in per) + f" | {ratio} |")


def daily() -> None:
    table = collections.defaultdict(collections.Counter)
    for r in PAGES:
        d, url = r["keys"]
        if "2026-09-26" <= d <= "2026-10-08":
            table[d][group_of(url)] += r["impressions"]
    cols = [
        "quiz landing /quiz/<slug>",
        "og image /og/...",
        "home /",
        "static (about, contact, premium, ...)",
        "explore",
        "guides",
    ]
    print("| date | " + " | ".join(cols) + " |")
    print("|---|" + "---|" * len(cols))
    for d in sorted(table):
        print(f"| {d} | " + " | ".join(f"{table[d][c]:.0f}" for c in cols) + " |")


def hosts() -> None:
    sums = collections.defaultdict(collections.Counter)
    for r in PAGES:
        d, url = r["keys"]
        host = urlparse(url).netloc
        for name, w in WINDOWS.items():
            if in_window(d, w):
                sums[host][name] += r["impressions"]
    names = list(WINDOWS)
    print("| host | " + " | ".join(names) + " |")
    print("|---|" + "---|" * len(names))
    for h in sorted(sums, key=lambda h: -sums[h][names[0]]):
        print(f"| {h} | " + " | ".join(f"{sums[h][n]:.0f}" for n in names) + " |")


def queries() -> None:
    """Brand queries (containing 'funsona') against everything else."""
    sums = collections.defaultdict(collections.Counter)
    for r in QUERIES:
        d, q = r["keys"]
        kind = "brand (contains 'funsona')" if "funsona" in q.lower() else "non-brand"
        for name, w in WINDOWS.items():
            if in_window(d, w):
                sums[kind][name] += r["impressions"]
    names = list(WINDOWS)
    print("| query kind | " + " | ".join(names) + " |")
    print("|---|" + "---|" * len(names))
    for k in sums:
        print(f"| {k} | " + " | ".join(f"{sums[k][n]:.0f}" for n in names) + " |")




INSPECTION = HERE / "url-inspection-2026-11-17.json"


def inspect() -> None:
    """Index state today of the sitemap and of the 60 quiz pages with the most impressions before."""
    rows = json.loads(INSPECTION.read_text())
    before = collections.Counter()
    fixed = collections.Counter()
    for r in PAGES:
        d, url = r["keys"]
        path = urlparse(url).path
        if in_window(d, WINDOWS["before (09-03..10-02, 30d)"]):
            before[path] += r["impressions"]
        if in_window(d, WINDOWS["fixed (10-20..11-15, 27d)"]):
            fixed[path] += r["impressions"]
    quiz_before = collections.Counter({p: v for p, v in before.items() if p.startswith("/quiz/")})
    top = {p for p, _ in quiz_before.most_common(60)}  # the 60 quiz paths that were inspected

    by_state = collections.Counter()
    for r in rows:
        by_state[(group_of(r["url"]), r.get("coverageState", r.get("error", "?")))] += 1
    print("| group | coverage state | URLs |")
    print("|---|---|---|")
    for (g, s), n in sorted(by_state.items()):
        print(f"| {g} | {s} | {n} |")

    print()
    print("The 60 quiz pages with the most impressions 09-03..10-02:")
    print("| coverage state | URLs | imp before (30d) | imp fixed (27d) | last crawl >= 10-20 | last crawl <= 10-02 |")
    print("|---|---|---|---|---|---|")
    agg = collections.defaultdict(lambda: [0, 0, 0, 0, 0])
    for r in rows:
        path = urlparse(r["url"]).path
        if path not in top:
            continue
        a = agg[r.get("coverageState", "?")]
        a[0] += 1
        a[1] += before[path]
        a[2] += fixed[path]
        last = r.get("lastCrawlTime") or ""
        a[3] += last >= "2026-10-20"
        a[4] += bool(last) and last < "2026-10-03"
    for s, (n, b, f, recent, old) in sorted(agg.items(), key=lambda kv: -kv[1][1]):
        print(f"| {s} | {n} | {b:.0f} | {f:.0f} | {recent} | {old} |")


if __name__ == "__main__":
    {"groups": groups, "daily": daily, "hosts": hosts, "queries": queries, "inspect": inspect}[
        sys.argv[1] if len(sys.argv) > 1 else "groups"
    ]()
