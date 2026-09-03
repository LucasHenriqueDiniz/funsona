---
status: active
epic: docs-layout
---

# One shape for docs/

> **Decided 2026-09-03: adopt the vault.** The owner's reasoning was that the hexagram plugin decides
> and `init-project` prescribes the subtree. The five flat documents moved into their folders,
> `docs/README.md` was rewritten to describe the directory that now exists, and `AGENTS.md`'s table
> and layout tree were repointed. `docs/plans/docs-layout/slice-01-choose-convention.md` records what
> moved, where `production-readiness.md` landed, and the two template files deliberately not copied.
> The problem statement below is left as written; it describes the directory as it was.

## Problem

`docs/` is flat and says so on purpose. `docs/README.md:17-19` sets the rule: "No frontmatter, no
wiki-links, no Obsidian formatting. Plain markdown, direct, action-oriented." The five files it
enumerates — `architecture.md`, `product.md`, `roadmap.md`, `research.md`, `production-readiness.md` —
are the whole directory, and `AGENTS.md:27-31` points at those exact paths.

The hexagram template ships the other shape: a vault subtree with
`docs/architecture/ARCHITECTURE.md`, `docs/product/README.md`, `docs/research/README.md`,
`docs/roadmap/README.md`, `docs/postmortem/README.md`. Copying it in with `cp -Rn template/. .` would
not overwrite anything — `-n` refuses — which is exactly the trap: it would land
`docs/architecture/ARCHITECTURE.md` *beside* `docs/architecture.md` and `docs/product/README.md`
beside `docs/product.md`, leaving two conventions in one directory with `AGENTS.md` still linking to
the flat half.

The collision is no longer hypothetical. This board work adds `docs/pitches/` and `docs/plans/` — two
of the template's subdirectories — and every slice inside them carries YAML frontmatter, which
`docs/README.md` forbids in the same breath as it describes the directory. The directory now
contradicts its own README.

## Solution

Decide the shape once and write it down, then make `docs/README.md` and `AGENTS.md` agree with it.

Either the flat five stay flat and the vault subtree is scoped to workflow documents (`pitches/`,
`plans/`, `postmortem/`) with the frontmatter rule narrowed to say so — or the flat five move into
their template directories and `AGENTS.md`'s table is rewritten to the new paths.

## Surface

- `docs/README.md`
- `AGENTS.md` (the docs table at `:27-31` and the reference rule at `:64`)
- the five flat documents, if the answer is "move them"

## Scope

**In**

- The stated convention, and the two files that publish it.
- Whichever moves the decision implies.

**Out**

- The content of any document. Correcting what they *say* is `docs/pitches/supabase-leftovers.md`.
- Adopting the template wholesale. `cp -Rn template/. .` over this repo is the thing this pitch exists
  to prevent, not a step in it.

## Open questions

- ~~Which shape? This is a taste call about a repo with one reader, and it is not mine to make.~~
  **Answered 2026-09-03: the vault.**

## Done

**Met 2026-09-03.** `docs/README.md` states the convention in one place, and no file has both a flat
and a nested form: a listing of `docs/` shows either `architecture.md` or `architecture/`, never both.

```
ls docs | sed 's/\.md$//' | sort | uniq -d      # empty
```
