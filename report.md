# Report de Bugs - FunSona v2

## Contexto
Este relatório consolida a análise do código-fonte do FunSona v2, identificando bugs, problemas de segurança e inconsistências encontrados durante a inspeção.

## Bugs Críticos

### 1. Desalinhamento entre `apiFetch` e Rotas da API
**Local:** `apps/web/src/lib/api.ts` e rotas da API (`apps/api/src/routes/*`)

**Descrição:** A função `apiFetch` no frontend espera que a resposta tenha propriedades `error` e `data` no topo, mas as rotas da API retornam um wrapper `{ success, data, error, meta }`. Isso causa falha em verificações como `if (res.error)`.

**Impacto:** Qualquer componente que use `apiFetch` (ex: `og/[slug].ts`) terá comportamento incorreto ao processar erros.

**Exemplo no arquivo `apps/web/src/pages/og/[slug].ts`:**
```typescript
if (!res || res.error || !res.data) { // res.error é undefined
  return new Response("Quiz not found", { status: 404 });
}
```

**Solução:** Ajustar `apiFetch` para extrair o campo `error` do wrapper, ou ajustar as rotas da API para retornar um formato diferente. A primeira opção é menos invasiva.

### 2. Uso Incorreto de `.single()` em Queries que Podem Não Retornar Resultados
**Local:** `apps/api/src/routes/quizzes.ts` (linhas 263, 310, 346, 475)

**Descrição:** O uso de `.single()` sem garantir que há resultado causa exceções quando o registro não existe.

**Impacto:** A aplicação pode crashar em cenários de slug inválido, quiz inexistente ou like não encontrado.

**Solução:** Substituir por `.maybe().first()` ou verificar se o resultado existe antes de acessar.

### 3. Duplicação de Incremento de `attempts_count` para Usuários Autenticados
**Local:** `apps/api/src/routes/quizzes.ts` (linha 409) e trigger `handle_quiz_result` (migration `003_functions.sql`)

**Descrição:** O trigger incrementa `attempts_count` e `completions_count` ao inserir um resultado. A rota `POST /:id/results` também chama `increment_quiz_attempts` após a inserção, causando duplicação.

**Impacto:** Contagens de jogadas ficarão infladas para usuários autenticados.

**Solução:** Remover a chamada `increment_quiz_attempts` da rota, pois o trigger já cuida disso. Para não autenticados (user_id NULL), o trigger não é acionado, então a chamada deve permanecer apenas nesse fluxo.

### 4. Coluna `search_vector` Inexistente
**Local:** `apps/api/src/routes/quizzes.ts` (linha 128)

**Descrição:** A query `.textSearch("search_vector", ...)` pressupõe a existência de uma coluna `search_vector` do tipo `tsvector`. A migration 001_schema.sql não cria essa coluna.

**Impacto:** A funcionalidade de busca por texto falhará.

**Solução:** Adicionar a coluna `search_vector` e um índice GIN na tabela `quizzes`, e criar uma função para atualizá-la com base nos campos relevantes (título, descrição, tags).

## Problemas de Segurança e Configuração

### 5. Possível Problema de CORS no Middleware do Astro
**Local:** `apps/web/src/middleware.ts`

**Descrição:** O fetch para `/api/auth/me` não inclui credenciais por padrão. Em desenvolvimento (frontend e API em portas diferentes), o cookie `FunSona_session` (httpOnly) pode não ser enviado, invalidando a sessão.

**Impacto:** Usuários podem ser redirecionados incorretamente para login mesmo estando autenticados.

**Solução:** Garantir que o fetch inclua `credentials: "include"` ou ajustar a configuração de CORS na API para permitir o compartilhamento de cookies.

### 6. Falta de Verificação de Email Verificado no Login
**Local:** `apps/api/src/routes/auth.ts` (linha 117-124)

**Descrição:** A rota `/login` permite acesso mesmo se o email não foi verificado.

**Impacto:** Dependendo dos requisitos de segurança, isso pode permitir acesso não autorizado.

**Solução:** Adicionar verificação de `email_verified` no Supabase Auth antes de emitir token.

### 7. Inconsistência no Comprimento Máximo do `handle`
**Local:** `apps/api/src/routes/auth.ts` (função `normalizeHandle`) e `@FunSona/shared` (schema)

**Descrição:** `normalizeHandle` trunca em 24 caracteres, mas o schema permite até 30. Isso pode rejeitar handles válidos.

**Impacto:** Usuários podem falhar ao registrar handles com 25-30 caracteres que, após normalização, ficariam dentro do limite de 30.

**Solução:** Ajustar `normalizeHandle` para truncar em 30 caracteres, ou ajustar o schema para 24.

### 8. RLS Pode Não Estar Habilitado Corretamente
**Local:** `supabase/migrations/002_rls.sql`

**Descrição:** As policies são criadas, mas é necessário garantir que o Supabase ative o RLS nas tabelas. Além disso, as policies pressupõem que `auth.uid()` está disponível, o que requer configuração do Supabase.

**Impacto:** A segurança por linha (RLS) pode não estar efetivamente ativa, expondo dados.

**Solução:** Verificar se o RLS está habilitado e se as policies estão sendo aplicadas corretamente.

## Outros Problemas

### 9. Tratamento de Erros em `apiFetch`
**Local:** `apps/web/src/lib/api.ts`

**Descrição:** Se a resposta não for JSON (ex: 500 com HTML), `res.json().catch(() => null)` retorna `null`, e o erro retornado será `HTTP ${res.status}` sem detalhes.

**Impacto:** Dificulta o diagnóstico de erros do servidor.

**Solução:** Considerar logar o corpo da resposta não JSON ou retornar uma mensagem mais descritiva.

### 10. Possível Vazamento de Informação em `robots.txt`
**Local:** `apps/web/src/pages/robots.txt.ts`

**Descrição:** O `robots.txt` permite acesso a todas as páginas públicas, mas bloqueia `/api/` e `/quiz/*/play`. No entanto, o padrão `/quiz/*/play` pode não corresponder à rota real, que é `/quiz/[slug]/play`.

**Impacto:** Página de jogo podem ser indexadas indesejadamente.

**Solução:** Ajustar o padrão para `/quiz/*/play` (já está correto) ou usar `/quiz/*/play` (regex). Verificar a rota real.

### 11. Limite de Paginação no Sitemap
**Local:** `apps/web/src/pages/sitemap.xml.ts`

**Descrição:** O sitemap busca até 200 páginas de quizzes, com 200 itens por página. Se houver mais de 40.000 quizzes, eles não serão incluídos.

**Impacto:** SEO pode ser afetado se houver muitos quizzes.

**Solução:** Aumentar `maxPages` e `limit` se necessário, ou implementar paginação no sitemap (mas sitemaps grandes são problemáticos).

## Recomendações de Prioridade

1. **Corrigir imediatamente:** Itens 1, 2 e 3 (críticos para funcionamento).
2. **Corrigir em curto prazo:** Item 4 (busca) e 5 (CORS).
3. **Revisar requisitos:** Itens 6, 7, 8 (segurança e configuração).
4. **Melhorias:** Itens 9, 10, 11 (otimizações).

## Próximos Passos

1. **Planejar implementação:** Detalhar as alterações necessárias para cada bug.
2. **Executar testes:** Garantir que as correções não quebrem funcionalidades existentes.
3. **Revisar migrations:** Planejar adições ao schema (coluna `search_vector`) sem perder dados.
4. **Testar em ambiente de desenvolvimento:** Validar fluxos de autenticação, busca e contagem de jogadas.

---
*Report gerado em: 2026-05-23*