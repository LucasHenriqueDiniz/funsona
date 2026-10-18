"""Revert each slice-1 fix in turn, measure, restore, measure again.

A check that stays green with its fix reverted does not test the fix. Needs the
web dev server running against the production API (.claude/launch.json,
"web-prod-api"). Edits source files and always restores them.

Usage: python scripts/adsense/mutate-slice-01.py

Runs on the slice 1 tree only: slice 2 made the loader opt-in and removed the
ads={false} this script reverts on the login page.
"""
import pathlib, re, subprocess, sys, time
W = pathlib.Path(__file__).resolve().parents[2] / "apps/web/src"
B = "http://localhost:4322"

def curl(path, host=None, follow=False):
    args = ["/usr/bin/curl", "-s", "-m", "60", "-w", "\n%{http_code} %{redirect_url}"]
    if host: args += ["-H", f"Host: {host}"]
    if follow: args += ["-L"]
    out = subprocess.run(args + [B + path], capture_output=True, text=True).stdout
    body, _, meta = out.rpartition("\n")
    return body, meta

def text(html):  # visible text; dev mode adds data-astro-source-* attributes
    return re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", html))

checks = {
  "explore 404": lambda: curl("/explore/nao-existe-xyz")[1].endswith("/404"),
  "counter hidden (0 plays)": lambda: not re.search(r"(^|[^0-9])0 +jogadas", text(curl("/quiz/quantas-criancas-de-cinco-anos-voce-pode-lutar-descubra-agora")[0])),
  "login has no loader": lambda: "adsbygoogle.js" not in curl("/login")[0],
  "stat comes from the API": lambda: bool(re.search(r">\+700</div>", curl("/")[0])),
  "www -> 301": lambda: curl("/quiz/que-arma-voce-tem-descubra-sua-arma-interior", host="www.localhost:4322")[1].startswith("301"),
}
mutations = [
  ("explore 404", "pages/explore/[category].astro", 'return Astro.redirect("/404");', 'return Astro.redirect("/explore", 302);'),
  ("counter hidden (0 plays)", "lib/public-count.ts", "PUBLIC_COUNT_THRESHOLD = 10;", "PUBLIC_COUNT_THRESHOLD = 0;"),
  ("login has no loader", "pages/login.astro", " hideFooter={true} ads={false}>", " hideFooter={true}>"),
  ("stat comes from the API", "pages/index.astro", "const totalQuizzes = topQuizzes?.length ? topMeta?.total ?? 0 : 0;", "const totalQuizzes = 0;"),
  ("www -> 301", "middleware.ts", "sequence(canonicalHost, auth,", "sequence(auth,"),
]

def settle(check, want, tries=20):
    for _ in range(tries):
        if check() == want: return True
        time.sleep(1.5)
    return False

rows = []
for name, rel, fixed, reverted in mutations:
    f = W / rel; orig = f.read_text()
    assert orig.count(fixed) == 1, (rel, fixed)
    before = checks[name]()
    try:
        f.write_text(orig.replace(fixed, reverted))
        red = settle(checks[name], False)  # must go red with the fix reverted
    finally:
        f.write_text(orig)
    green = settle(checks[name], True)  # and green again once restored
    rows.append((name, before, not red, green))
    print(f"{name:28} before={'green' if before else 'RED'}  reverted={'red' if red else 'STAYED GREEN'}  restored={'green' if green else 'RED'}", flush=True)

ok = all(b and r is False and g for _, b, r, g in rows)
print("---- every check went red without its fix and green with it" if ok else "---- SOME CHECK DOES NOT KILL ITS MUTATION")
sys.exit(0 if ok else 1)
