# Docs

This folder is an **Obsidian vault**. Open it directly (`File → Open vault → docs/`), and
`[[wiki-links]]` resolve inside Obsidian.

⚠️ **Nothing outside Obsidian resolves `[[wiki-links]]`.** There is no MCP server wired to this vault,
and this repo has no `.mcp.json`. An agent reading these files sees the raw `[[...]]` text, so any
link that has to work for a reader outside Obsidian must be written as a real relative path.

| folder | |
|---|---|
| `pitches/` | what a piece of work is for, written before it is researched or built |
| `plans/` | one directory per feature, numbered vertical slices |
| `architecture/` | the shape as built. `ARCHITECTURE.md` is the technical decisions and the stack; `production-readiness.md` is the release gates, smoke matrix and rollback triggers; `diagrams/` holds the pictures |
| `product/` | functional requirements and scope. Read before implementing a feature |
| `roadmap/` | what is done and what is next. Read to find out what belongs to the current version |
| `research/` | what is true, with sources. Read so research is not repeated |
| `postmortem/` | what shipped, and what a wrong measurement cost |

Each folder's own `README.md` says how to write the documents in it.

## Conventions

- **Frontmatter is expected, not forbidden**, and it is what the `board` skill reads. Pitches carry
  `status:` and `epic:`; plan slices carry `status:` and `kanban:`; other notes may carry `tags:` for
  cross-cutting search (`tags: [area/infra, status/active]`). This replaces the old rule in this file,
  which banned frontmatter outright while `pitches/` and `plans/` were made of it.
- `[[wiki-links]]` in shortest form, no `.md`. Moving a note between folders breaks nothing *in
  Obsidian* — see the warning above for everywhere else.
- A new note goes in the folder that matches its kind. If two fit, it is probably two notes.
- **Everything is in English.** See the `language` skill. The one exception on disk today is
  `postmortem/quiz-refactor-pilot-2026-06-30.md`, which quotes pt-BR product copy; the header on that
  file says why, and `plans/language-sweep/slice-01-translate-report.md` tracks it.
- **A research note that answers a blocking question gets its own directory**, not a loose file:
  `research/<topic>/research.md` plus `research/<topic>/fetches/<source>.md`, one fetch file per page
  actually read, quoted rather than summarised. The page changes or disappears and then the fetch file
  is the only evidence the claim ever had. `research/README.md` is the aggregate of research already
  finished, which is what makes it the index rather than a topic of its own.

## Layout

This is the hexagram template's vault shape, adopted on 2026-09-03 —
`plans/docs-layout/slice-01-choose-convention.md` records the decision and what moved. The five flat
documents that used to sit at the root of this folder are now in the folders above; nothing was
overwritten and nothing was dropped. `production-readiness.md` has no home in the template and was
put under `architecture/` because it describes how this system is deployed, monitored and rolled
back.

The template also ships a `.mcp.json` declaring an Obsidian MCP server. It was **deliberately not
copied**: the server is not installed here, and a document asserting a path that does not exist is
the failure this repo has already paid for once.
