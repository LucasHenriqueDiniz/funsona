---
status: blocked
kanban: 92a26055-2df0-4036-b995-421ed86675a0
---

# Slice 1 — Pick one shape for docs/ and make the README say it

**Blocked on the owner: this is a taste call about a one-reader repo — flat `docs/*.md` or the
hexagram vault subtree — and nothing in the code decides it. No amount of reading resolves it; someone
has to choose.**

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
