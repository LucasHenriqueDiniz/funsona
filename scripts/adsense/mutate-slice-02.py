"""Revert each slice-2 fix in turn and confirm check-slice-02.py fails on it, then restore.

Needs the same local stack as check-slice-02.py (api-prod-copy and web-local-api). Edits source
files, waits for wrangler and Astro to reload, and always restores the original text.

Usage: python scripts/adsense/mutate-slice-02.py
"""
import pathlib
import subprocess
import sys
import time

ROOT = pathlib.Path(__file__).resolve().parents[2]
CHECK = [sys.executable, "-I", str(ROOT / "scripts/adsense/check-slice-02.py")]

# (name, file, fixed text, reverted text, label of the check that must fail)
MUTATIONS = [
    ("listings curated only", "apps/api/src/db/client.ts",
     """const where: string[] = ["status = 'PUBLISHED'", "ads_eligible = 1"];""",
     """const where: string[] = ["status = 'PUBLISHED'"];""",
     "sitemap quiz URLs = curated rows"),
    ("non-curated quiz is noindex", "apps/web/src/pages/quiz/[slug].astro",
     """lang={quiz.language || "pt"} noindex={!curated} ads={curated}>""",
     """lang={quiz.language || "pt"} ads={curated}>""",
     "/quiz/6-ano carries noindex"),
    ("loader is opt-in", "apps/web/src/layouts/Layout.astro",
     "lang, ads = false } = Astro.props;",
     "lang, ads = true } = Astro.props;",
     "/about loader absent"),
    ("public profile filter", "apps/api/src/db/client.ts",
     """  const visibility = publicView ? `AND ${PUBLIC_QUIZ_FILTER}` : "";
  const { results } = await getDb(env)""",
     """  const visibility = "";
  const { results } = await getDb(env)""",
     "is not listed on /profile/"),
]


def run_check() -> tuple[int, str]:
    p = subprocess.run(CHECK, capture_output=True, text=True)
    return p.returncode, p.stdout


def failed_on(out: str, label: str) -> bool:
    return any(line.startswith("FAIL") and label in line for line in out.splitlines())


ok_all = True
for name, rel, fixed, reverted, label in MUTATIONS:
    f = ROOT / rel
    orig = f.read_text()
    assert orig.count(fixed) == 1, (rel, fixed)
    try:
        f.write_text(orig.replace(fixed, reverted))
        red = False
        for wait in (8, 12, 20):
            time.sleep(wait)
            code, out = run_check()
            if code != 0 and failed_on(out, label):
                red = True
                break
    finally:
        f.write_text(orig)
    green = False
    for wait in (8, 12, 20):
        time.sleep(wait)
        code, out = run_check()
        if code == 0:
            green = True
            break
    ok_all &= red and green
    print(f"{name:30} reverted={'red' if red else 'STAYED GREEN'}  restored={'green' if green else 'RED'}", flush=True)

print("---- every check went red without its fix and green with it" if ok_all else "---- SOME CHECK DOES NOT KILL ITS MUTATION")
sys.exit(0 if ok_all else 1)
