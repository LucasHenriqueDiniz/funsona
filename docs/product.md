# Product

Requisitos funcionais e escopo. Consulte este arquivo antes de implementar uma feature para confirmar se ela está no escopo atual.

## Visão

FunSona é a plataforma de quizzes mais rápida e SEO-friendly da internet. Crie, jogue e compartilhe quizzes em segundos.

## Público-alvo

- Jogadores casuais: buscam entretenimento rápido, descoberta via Google.
- Criadores de conteúdo: influencers, educadores, marcas que querem engajar audiência.

## Escopo v2.0 (MVP)

### Jogar Quiz
- Página de quiz com SEO completo (title, description, OG, structured data Schema.org Quiz)
- Player interativo: trivia com pontuação, personalidade com outcomes
- Compartilhamento de resultados (OG image dinâmica — F5)
- Likes e favoritos

### Criar Quiz
- Editor de quizzes: título, descrição, capa (Supabase Storage), tags
- Editor de perguntas e respostas
- Preview antes de publicar
- Estados: DRAFT / PUBLISHED / ARCHIVED

### Descoberta
- Homepage com trending
- Explore por tags/categorias
- Busca full-text (Postgres `to_tsvector`)
- Perfis públicos de criadores

### Gamificação (simplificada)
- XP e níveis automáticos (trigger Postgres)
- Streak diário
- Leaderboard semanal e geral
- Achievements simples por uso, XP, streak, criacao e likes recebidos

### Comunidade
- Comentarios simples em quizzes publicados

### Monetização
- AdSense ready (slots definidos, Consent Mode GDPR/LGPD)
- Premium via Stripe (remove ads, badge, stats avançadas)

## Fora do Escopo v2.0

Não implemente sem aprovação explícita:
- Seguir usuários
- Sistema de recomendação avançado
- Scraping de quizzes externos
- Fake data / bot accounts

## Métricas de Sucesso

- 1000 quizzes publicados no primeiro mês
- Lighthouse 70+ Performance, 95+ SEO, 100 Best Practices
- Aprovação AdSense em até 30 dias após lançamento
- Premium conversion rate > 2%

## Fluxos de Usuário

1. **Descoberta orgânica**: Google → página de quiz (/quiz/[slug]) → joga → compartilha resultado
2. **Criação**: Logado → /quiz/new → editor → preview → publica
3. **Engajamento**: Logado → joga → ganha XP → sobe no leaderboard → repete amanhã para manter streak
4. **Conversão premium**: Jogador vê ads → clica "Remover ads" → Stripe checkout → premium ativo

## Decisões de Produto

- **UGC first**: O foco é usuários criarem quizzes, não scraping externo.
- **SEO é o canal #1**: Toda página pública precisa de HTML real, metadata completo, e structured data.
- **Mobile-first design**: 70%+ do tráfego de quizzes casual é mobile.
- **Sem dark mode no MVP**: Adiciona complexidade de CSS. Foco em ship rápido.
