# Auditoria dos 769 quizzes publicados (Fase 1) — 2026-08-20

Somente leitura. Nada foi escrito no banco.

## Como os dados foram lidos

`wrangler d1 execute funsona-db --remote` (produção, D1) — dump de
`id, slug, title, description, cover_url, type, content, attempts_count,
completions_count, created_at` para os 769 quizzes `status = 'PUBLISHED'`.

O `content` foi parseado com os **mesmos acessadores legados que
`QuizPlay.tsx` usa** (`question.title || question.text`, `question.options ||
question.answers`, `option.label || option.text`, `option.imageUrl ||
option.image_url`, `outcome.imageUrl || outcome.image_url`). Antes de rodar
qualquer coisa em escala, confirmei numa amostra de 3 quizzes que `title` vem
preenchido e `text` vem `null` — exatamente a armadilha que você descreveu.
Confirmado, não é preciso reabrir essa discussão.

Todas as 9.110 URLs de imagem únicas (capa + perguntas + resultados) foram
checadas via HTTP (HEAD, com fallback GET, 2 tentativas, timeout 10-20s).

## O que a auditoria encontrou — e o que NÃO encontrou

A hipótese de partida era "qualidade irregular" no conteúdo. O que o script
mecânico encontrou foi bem mais estreito do que isso:

- **0** quizzes sem perguntas, com pergunta de 1 opção, ou com poucas
  perguntas demais.
- **0** títulos vazios, **0** descrições vazias.
- **0** vazamento de texto de IA (`as an AI`, markdown cru, `lorem ipsum`,
  placeholders de prompt).
- **628 dos 769 (82%)** não têm nenhum problema estrutural, de imagem ou de
  duplicata — o único flag que carregam é `ZERO_ATTEMPTS`.

Ou seja: **o conteúdo em si, estruturalmente, está OK na esmagadora maioria
dos casos.** Isso muda a leitura do problema — "769 quizzes de qualidade
irregular" não é o que os dados mostram. O que os dados mostram é um problema
bem mais concentrado, descrito abaixo.

## Achados por categoria

### A) Imagens

| categoria | quizzes afetados |
|---|---|
| Capa ausente | 2 |
| Capa quebrada (URL responde erro) | 0 |
| Pelo menos 1 imagem quebrada (pergunta/resultado) ou capa quebrada | 70 |
| Pelo menos 1 imagem com **token de placeholder nunca resolvido** (ver abaixo) | 16 |
| **União** (algum problema de imagem) | **70** |

**Achado não esperado:** 91 campos `image_url` em 16 quizzes não são URLs —
são strings literais do tipo `%GIPHY: Neville Longbottom`, `%GIPHY: Kanye
West`. Um pipeline de geração antigo deixou o placeholder de busca do Giphy
sem nunca resolver para uma URL real. Esses 16 quizzes têm entre 2 e 18
imagens quebradas cada — são os piores casos da auditoria (ver "20 piores"
abaixo). Isso é bug de pipeline, não "imagem de baixa qualidade" — vale
registrar separado porque a correção é diferente (script de resolução de
placeholder, não geração de imagem nova).

A classificação visual completa (`boa` / `generica` / `errada` — se a imagem
faz sentido para o tema) **não foi feita para as 9.110 imagens** — isso exige
julgamento visual por imagem, não é mecanizável em escala sem custo alto de
tempo/tokens. O que o script cobre com certeza mecânica é `ausente` e
`quebrada`. Se você quiser a classificação `boa/generica/errada`, ela precisa
rodar como uma segunda passada, amostral ou completa — me diga o escopo antes
de eu rodar (769 chamadas de análise de imagem tem custo real).

### B) Qualidade do conteúdo

| categoria | quizzes afetados |
|---|---|
| Sem perguntas / poucas perguntas (<4) | 0 |
| Pergunta com <2 opções | 0 |
| `PERSONALITY` com <2 resultados possíveis | 0 |
| Resultado sem descrição (`RESULT_NO_DESC`) | 2 (mas com 56 ocorrências — são quizzes com dezenas de resultados possíveis, a maioria sem descrição) |
| Possível truncamento (heurística: texto termina em `...` ou vírgula) | 30 — **heurística fraca, tem falso positivo**; recomendo tratar como "candidato a checar", não como fato |
| Vazamento de texto de IA / markdown cru / placeholder de prompt | 0 |
| Título duplicado dentro das próprias perguntas | 0 |

### C) Sinais de descarte

| categoria | quizzes afetados |
|---|---|
| `attempts_count = 0` | **718 de 769 (93%)** |
| Duplicatas (do `duplicate-quizzes.md`, já auditado antes) | 22 (13 `paraphrased`, 9 `distinct-ish`) — release de dedup já mapeado, não refeito aqui |

`attempts_count = 0` em 93% dos quizzes é o maior número da tabela, mas por
si só **não é evidência de baixa qualidade** — é exatamente o sintoma que
motivou a auditoria (indexado, ignorado). Cortar com base nisso sozinho
removeria quase tudo e não distingue "quiz ruim" de "quiz bom que nunca foi
visto". Ele só vira sinal de corte **combinado** com outro problema real
(imagem quebrada, duplicata).

## Os 20 piores casos (por severidade combinada)

Ranking por `severity_score` (pondera: zero plays, imagens quebradas ×1,
placeholders não-resolvidos ×2, duplicata ×4, resultado sem descrição ×2,
etc. — fórmula completa em `quiz-audit.json`, campo `severity_score`).

1. `qual-personagem-de-star-wars-voce-e-teste-divertido` — 18 imagens com placeholder `%GIPHY` não resolvido, 0 plays
2. `que-personagem-do-harry-potter-e-teste-de-personalidade` — 10 placeholders `%GIPHY`, 0 plays
3. `com-qual-celebridade-eu-me-pareco-questionario-divertido-sobre-sosias-de-celebridades` — 10 placeholders, 0 plays
4. `qual-e-a-sua-cor-de-mms-descubra-sua-personalidade-mm` — 10 placeholders, 0 plays
5. `qual-e-a-sua-cor-do-arco-iris` — 10 placeholders, 0 plays
6. `podemos-adivinhar-seu-emoji-favorito-quiz-divertido` — 9 placeholders, 0 plays
7. `qual-muppet-e-voce-descubra-seu-personagem-dos-muppets` — 7 placeholders, 0 plays
8. `quao-ma-pessoa-voce-realmente-e` — 6 placeholders, 0 plays
9. `devo-virar-vegano-quiz-para-descobrir` — 5 placeholders, 0 plays
10. `qual-e-o-teu-digimon-descubra-seu-digimon-ideal` — 9 imagens quebradas (URL real, 404), 0 plays
11. `qual-e-o-meu-superpoder` — 3 placeholders
12. `quantas-pessoas-querem-que-voce-morra-descubra-seu-destino` — 3 imagens quebradas, 0 plays
13. `o-que-diz-sua-mensagem-personalizada-de-biscoito-da-sorte-5` — 28 resultados sem descrição, duplicata (distinct-ish), 0 plays
14. `qual-personagem-de-gravity-falls-voce-e-descubra-seu-alter-ego` — 2 placeholders, 0 plays
15. `qual-personagem-de-owl-house-voce-e-quiz-divertido-e-magico` — 2 placeholders, 0 plays
16. `conseguimos-adivinhar-seu-personagem-favorito-de-one-piece-quiz-divertido` — 4 imagens quebradas, 0 plays
17. `qual-e-o-seu-alinhamento-moral-1` — duplicata (paraphrased), 0 plays
18. `descubra-se-voce-conhece-bem-o-nosso-planeta-5` — duplicata (distinct-ish), 0 plays
19. `qual-e-o-meu-estilo-de-apego-5` — duplicata (distinct-ish), 0 plays
20. `voce-e-kira-ou-l-5` — duplicata (distinct-ish), 0 plays

## Minha recomendação de corte

**Não recomendo um corte em massa por `attempts_count = 0`.** Os dados não
sustentam "769 quizzes de qualidade irregular" — sustentam um problema bem
mais estreito: ~70 quizzes com imagem quebrada (dos quais 16 por um bug de
pipeline específico, não falta de esforço) e 22 duplicatas já conhecidas.

Critério que eu aplicaria:

1. **Arquivar as 13 duplicatas `paraphrased`** do `duplicate-quizzes.md` — já
   auditadas, critério já validado antes (mesma contagem de perguntas, alta
   similaridade). O script `cleanup-duplicate-quizzes.mjs` existe e já
   escreve o redirect; só precisa ser retargetado para D1.
2. **Não arquivar por imagem quebrada.** É corrigível (Fase 2) e não é culpa
   do conteúdo do quiz — é ausência de asset. Faz mais sentido consertar do
   que descartar 70 quizzes só por isso.
3. **As 9 duplicatas `distinct-ish` ficam em aberto** — o `duplicate-quizzes.md`
   já registrou que essa é uma decisão de julgamento, não mecânica. Eu não
   arquivaria sem você olhar pelo menos os títulos/preview de cada par.
4. **Nada mais no dataset justifica corte** por critério de conteúdo — a
   auditoria não achou quizzes vazios, truncados ou com vazamento de prompt.

Isso dá um corte inicial de **13 quizzes** (1,7% dos 769), não uma fatia
grande. Se o objetivo é reduzir o índice do Google de forma mais agressiva
porque a suspeita é "conteúdo raso demais mesmo quando estruturalmente OK",
isso é uma decisão editorial sua, não algo que o script consiga provar — o
conteúdo lido é estruturalmente válido em 82% dos casos.

## Arquivos entregues

- `quiz-audit.csv` — uma linha por quiz, todas as classificações mecânicas.
- `quiz-audit.json` — mesmo dataset, com a lista completa de imagens
  checadas por quiz (`images_to_check`) e o array de `flags`.

## O que fica pendente antes da Fase 2

- Classificação visual `boa/generica/errada` das imagens que carregam —
  não feita aqui, precisa de escopo definido.
- Decisão sobre os 9 pares `distinct-ish`.
- Confirmar se você quer arquivar os 13 `paraphrased` agora ou junto com a
  Fase 2 completa.
