---
tags: [research, area/content, 2026-10-18-catalogue-origin]
status: active
decided: 2026-10-18
---

# Where did the seed catalogue come from?

> From quizpanda.com (PsyCat Games), translated and rewritten. The covers are quizpanda's own feature
> images, at paths named after quizpanda's quiz slugs. The text was not compared.

## What was blocking

Slice 4 of [[adsense-low-value-content]] planned to rewrite only the core's outcomes. That is enough if
the questions are FunSona's own work, and not enough if the quizzes were taken from another site.

## Findings

All measured on 2026-10-18, against a restored export of production `quizzes`:

| measurement | value |
|---|---|
| published quizzes serving at least one image from `quizpanda.com` | **691 of 762** |
| of those, with a `quizpanda.com` **cover** | 638 |
| `quizpanda.com` image URLs across those quizzes | 5,896 in the archived tail alone |
| curated core (70) with `quizpanda.com` images | **62** (58 by cover) |
| `quizpanda.com` operator | PsyCat Games, a third-party English quiz site (`fetches/quizpanda-what-weapon-am-i.md`) |
| FunSona's most-clicked quiz | same topic as quizpanda's "What weapon are you?", and its "Espada" outcome image is `quizpanda.com/images/quiz-images/sword.jpg` |
| cover URL shape | `https://quizpanda.com/<quizpanda-slug>/feature-image.jpg`. FunSona's weapon quiz has `quizpanda.com/what-weapon-am-i/feature-image.jpg`, which is the path of the quizpanda page in `fetches/`. Its medieval quiz has `quizpanda.com/who-would-you-have-been-in-medieval-times/feature-image.jpg` |
| repo | the roadmap carries "Scraper repo (QuizPanda) integration" under v2.3 |

**A first count was wrong.** It said 313 quizzes, 25 in the core. That count used a D1 dump taken
without `cover_url`, so every cover was missed. The owner's first archive decision ("288") rested on
it, and was re-asked with the corrected numbers before anything was written.

## Verdict

Treat the seed catalogue as taken from quizpanda.com and machine-translated. Google's spam policy
names that pattern directly ("scraping … including through synonymizing, translating"). The images
are a copyright exposure whether or not a page is indexed.

Decisions that followed:
- the owner archived the whole seed tail outside the core (680 quizzes, slice 3b);
- the owner widened slice 4 to a full rewrite of the core: questions, outcomes and images.

## What this does not establish

- No quiz's text was compared with its quizpanda original. "Translated from quizpanda" is inferred
  from hotlinked images plus matching topics.
- Where the 51 seed quizzes **without** quizpanda images came from.
- The licence of the images on `api.funsona.com` (R2). Those were migrated from Supabase storage, and
  their origin before that is unknown. Covers for 12 core quizzes live there.

## Sources

- [Quiz: What weapon are you?](https://quizpanda.com/what-weapon-am-i/) — `fetches/quizpanda-what-weapon-am-i.md` — operator and matching quiz topic
