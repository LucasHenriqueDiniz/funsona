# Roadmap

Milestones e prioridades. Não implemente features de versões futuras sem aprovação explícita.

## v2.0 — MVP (Atual)

Objetivo: Plataforma jogável, indexável no Google, com auth e gamificação básica.

- [x] F0: Foundation (monorepo, configs, migrations, docs)
- [x] F1: Auth + Core Público
  - [x] Auth flows (register, login, OAuth Google placeholder)
  - [x] Session middleware + cookies
  - [x] Homepage SSG
  - [x] Quiz detail page SSG
  - [x] Explore + Search
  - [x] Sitemap + robots
- [ ] F2: Quiz Engine
  - [ ] Quiz CRUD API completo
  - [ ] Quiz play (trivia + personality)
  - [ ] Results + sharing
  - [x] Supabase Storage upload
- [ ] F3: Gamification
  - [ ] XP/level triggers (já no banco, precisa de testes)
  - [ ] Streaks
  - [ ] Leaderboard pages
- [ ] F4: Monetization
  - [ ] Stripe checkout
  - [ ] Webhook handler
  - [ ] AdSense integration
  - [ ] Premium gates
- [ ] F5: Polish
  - [ ] i18n completo (pt/en/es)
  - [ ] OG image generation
  - [ ] SEO audit
  - [ ] Migrate old quizzes
  - [ ] Deploy

## v2.1 — Social

- [ ] Comentários flat (não threads)
- [ ] Seguir usuários
- [ ] Notificações básicas

## v2.2 — Engagement

- [ ] Achievements
- [ ] Sistema de recomendação simples (tags similares + mesmo autor + trending)
- [ ] Newsletter / email digest

## v2.3 — Scale

- [ ] Scraper repo (QuizPanda) integration
- [ ] Moderation tools
- [ ] Analytics dashboard para criadores

## Future Ideas (sem compromisso)

- Mobile app (React Native / Expo)
- Quiz embed widget para sites
- API pública para devs

## Critério de Avanço de Versão

Não passe para v2.1 enquanto:
- v2.0 não estiver deployado em produção
- Não tivermos 100 quizzes publicados por usuários reais
- Lighthouse SEO score < 90
