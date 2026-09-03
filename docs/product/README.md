# Product

Functional requirements and scope. Read this file before implementing a feature, to confirm it is in the current scope.

## Vision

FunSona is the fastest and most SEO-friendly quiz platform on the internet. Create, play and share quizzes in seconds.

## Target Audience

- Casual players: after quick entertainment, arriving through Google.
- Content creators: influencers, educators and brands who want to engage an audience.

## Scope for v2.0 (MVP)

### Play a Quiz
- Quiz page with complete SEO (title, description, OG, Schema.org Quiz structured data)
- Interactive player: trivia with scoring, personality with outcomes
- Result sharing (dynamic OG image — F5)
- Likes and favourites

### Create a Quiz
- Quiz editor: title, description, cover (Supabase Storage), tags
- Question and answer editor
- Preview before publishing
- States: DRAFT / PUBLISHED / ARCHIVED

### Discovery
- Homepage with trending
- Explore by tag/category
- Full-text search (Postgres `to_tsvector`)
- Public creator profiles

### Gamification (simplified)
- Automatic XP and levels (Postgres trigger)
- Daily streak
- Weekly and all-time leaderboard
- Simple achievements for usage, XP, streak, creation and likes received

### Community
- Simple comments on published quizzes

### Monetization
- AdSense ready (slots defined, GDPR/LGPD Consent Mode)
- Premium through Stripe (removes ads, badge, advanced stats)

## Out of Scope for v2.0

Do not implement without explicit approval:
- Following users
- Advanced recommendation system
- Scraping external quizzes
- Fake data / bot accounts

## Success Metrics

- 1000 quizzes published in the first month
- Lighthouse 70+ Performance, 95+ SEO, 100 Best Practices
- AdSense approval within 30 days of launch
- Premium conversion rate > 2%

## User Flows

1. **Organic discovery**: Google → quiz page (/quiz/[slug]) → plays → shares the result
2. **Creation**: logged in → /quiz/new → editor → preview → publishes
3. **Engagement**: logged in → plays → earns XP → climbs the leaderboard → comes back tomorrow to keep the streak
4. **Premium conversion**: player sees ads → clicks "Remove ads" → Stripe checkout → premium active

## Product Decisions

- **UGC first**: the point is users creating quizzes, not external scraping.
- **SEO is channel #1**: every public page needs real HTML, complete metadata, and structured data.
- **Mobile-first design**: 70%+ of casual quiz traffic is mobile.
- **No dark mode in the MVP**: it adds CSS complexity. The focus is shipping fast.
