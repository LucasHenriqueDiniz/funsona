---
status: done
kanban: 92a26055-2df0-4036-b995-421ed86675a0
---

# Slice 1 — Pick one shape for docs/ and make the README say it

**Done 2026-09-03. The owner chose: adopt the vault.** He said the hexagram plugin decides, and
`init-project` prescribes the subtree, so the taste call was made by naming the authority rather than
the shape.

What moved — `git mv`, content untouched, nothing overwritten and nothing dropped:

| was | is |
|---|---|
| `docs/architecture.md` | `docs/architecture/ARCHITECTURE.md` |
| `docs/product.md` | `docs/product/README.md` |
| `docs/roadmap.md` | `docs/roadmap/README.md` |
| `docs/research.md` | `docs/research/README.md` |
| `docs/production-readiness.md` | `docs/architecture/production-readiness.md` |

`production-readiness.md` is the one this slice said needed a home chosen. It went under
`architecture/`: it describes how this system is deployed, monitored and rolled back, which is the
folder for infrastructure. It is not roadmap material — it is not about what is next — and the
template's three root-level files (`DEVLOG.md`, `PROGRESS.md`, `IDEAS.md`) are a closed list it is not
on.

Two things the template ships were **not** copied. `docs/architecture/ARCHITECTURE.md` from the
template is a `{{PROJECT_NAME}}` scaffold, and landing it would have meant either overwriting real
content or parking a placeholder beside it — the exact collision the pitch exists to prevent; the
existing document holds that path instead, unrewritten, because
`docs/plans/supabase-leftovers/slice-01-rewrite-docs.md` owns fixing what it *says* and doing both in
one diff makes both unreadable. And `.mcp.json` was left out because the Obsidian MCP it declares is
not installed here; `docs/README.md` now states that `[[wiki-links]]` resolve in Obsidian and nowhere
else, rather than asserting a server that does not exist.

Also copied in, since they had no flat counterpart to collide with: the folder guides
`architecture/README.md`, `architecture/diagrams/README.md`, `pitches/README.md`, `plans/README.md`,
`postmortem/README.md`, and `docs/.obsidian/app.json`. `product/`, `roadmap/` and `research/` took the
existing content as their `README.md`, so the template's two-line placeholders for those three were
folded into the table in `docs/README.md` instead.

## Delivers

`docs/README.md` describes the directory that exists. Right now it does not: `:17-19` states "No
frontmatter, no wiki-links, no Obsidian formatting. Plain markdown", while `docs/pitches/` and
`docs/plans/` — added by this very branch — hold nothing but files with YAML frontmatter, and the
"Files" list at `:9-13` enumerates five documents as if they were the whole directory.

After this slice, adding the rest of the hexagram template is a decision with a known answer instead of
a `cp -Rn` that silently produces `docs/architecture/ARCHITECTURE.md` next to `docs/architecture.md`.

## Needs

- The owner's answer. Two options, and they are not equivalent in cost:
  - **Keep flat.** `docs/README.md` gains a second section saying workflow documents (`pitches/`,
    `plans/`, `postmortem/`) live in subdirectories and do carry frontmatter, and that the flat five
    do not. No file moves. `AGENTS.md:27-31` stays valid.
  - **Adopt the vault.** `architecture.md` → `architecture/ARCHITECTURE.md`, `product.md` →
    `product/README.md`, and the same for `roadmap`, `research`; `production-readiness.md` has no
    template home and needs one chosen. `AGENTS.md:27-31` and `:67` are rewritten to the new paths.
- If the answer is "adopt the vault", this slice should run after
  `docs/plans/supabase-leftovers/slice-01-rewrite-docs.md` — rewriting a file and moving it in the same
  change makes both diffs unreadable.

## Tests

- `ls docs | sed 's/\.md$//' | sort | uniq -d` prints nothing — no name exists as both a file and a
  directory.
- `grep -n "pitches\|plans" docs/README.md` prints at least one line.
- `grep -n "frontmatter" docs/README.md` prints a line that scopes the rule rather than banning it
  outright, or the rule is gone.
- Every `docs/` path referenced from `AGENTS.md` resolves:
  `for f in $(grep -oE 'docs/[a-zA-Z0-9/_-]+\.md' AGENTS.md | sort -u); do test -f "$f" || echo "MISSING $f"; done`
  prints nothing.

## Done when

```
ls docs | sed 's/\.md$//' | sort | uniq -d; grep -c "pitches" docs/README.md
```

prints no duplicate name at all, then a count greater than `0`.

## If stuck

If the owner has no opinion, keep flat. It is the shape already on disk, it is the shape `AGENTS.md`
already links to, and it costs one paragraph in `docs/README.md` instead of five `git mv`s plus a
rewritten table. Record that the default was taken by absence of a decision, so it can be revisited
without re-deriving the argument.
