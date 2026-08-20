-- Community quizzes publish instantly with zero review (see quizzesApp.post
-- "/" in routes/quizzes.ts — status defaults straight to whatever the client
-- sends), and until now AdSlot rendered on every quiz regardless of who wrote
-- it. That means ads could serve next to unmoderated user content, which is
-- the kind of thing Google Publisher Policies (ADS-PUB-11 / ADS-CONTENT-07)
-- flag: ads must not run next to content nobody has reviewed. Gate ad
-- rendering behind this flag instead of gating publishing, so quiz creation
-- stays instant — only monetization waits on review.
ALTER TABLE quizzes ADD COLUMN ads_eligible INTEGER NOT NULL DEFAULT 0;

-- Backfill: the pre-existing catalog (750 of 756 published quizzes) was
-- authored under the platform's own seed account, not submitted by end users
-- — it's editorial content the site owner already vetted at generation time,
-- not community UGC. Mark it eligible. Everything else (real user accounts)
-- starts ineligible until an admin reviews and flips it via POST
-- /quizzes/:id/approve-ads.
UPDATE quizzes SET ads_eligible = 1 WHERE author_id = '00000000-0000-0000-0000-000000000000';
