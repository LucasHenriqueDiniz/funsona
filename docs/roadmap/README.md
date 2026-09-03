# Roadmap

Milestones and priorities. Do not implement features from future versions without explicit approval.

## v2.0 — MVP (Current)

Goal: a playable platform, indexable by Google, with auth and basic gamification.

- [x] F0: Foundation (monorepo, configs, migrations, docs)
- [x] F1: Auth + Public Core
  - [x] Auth flows (register, login, OAuth Google placeholder)
  - [x] Session middleware + cookies
  - [x] Homepage SSG
  - [x] Quiz detail page SSG
  - [x] Explore + Search
  - [x] Sitemap + robots
- [ ] F2: Quiz Engine
  - [ ] Complete quiz CRUD API
  - [ ] Quiz play (trivia + personality)
  - [ ] Results + sharing
  - [x] Supabase Storage upload
- [ ] F3: Gamification
  - [ ] XP/level triggers (already in the database, needs tests)
  - [ ] Streaks
  - [ ] Leaderboard pages
- [ ] F4: Monetization
  - [ ] Stripe checkout
  - [ ] Webhook handler
  - [ ] AdSense integration
  - [ ] Premium gates
- [ ] F5: Polish
  - [ ] Complete i18n (pt/en/es)
  - [ ] OG image generation
  - [ ] SEO audit
  - [ ] Migrate old quizzes
  - [ ] Deploy

## v2.1 — Social

- [ ] Flat comments (not threads)
- [ ] Following users
- [ ] Basic notifications

## v2.2 — Engagement

- [ ] Achievements
- [ ] Simple recommendation system (similar tags + same author + trending)
- [ ] Newsletter / email digest

## v2.3 — Scale

- [ ] Scraper repo (QuizPanda) integration
- [ ] Moderation tools
- [ ] Analytics dashboard for creators

## Future Ideas (no commitment)

- Mobile app (React Native / Expo)
- Quiz embed widget for other sites
- Public API for developers

## Version Advancement Criteria

Do not move on to v2.1 while:
- v2.0 is not deployed to production
- We do not have 100 quizzes published by real users
- Lighthouse SEO score < 90
