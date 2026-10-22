/**
 * What a page answers when the API it loads its subject from fails.
 *
 * These pages used to redirect any failure to /404, so an API the site could not
 * reach looked to Google exactly like a quiz that does not exist, and Google drops
 * a 404 from the index. On 2026-10-19 Googlebot's and the AdSense crawler's requests,
 * served from Cloudflare's Atlanta data centre, got that redirect for a quiz that
 * answered 200 from Brazil, and their API calls never reached the API Worker. Search
 * Console shows the quiz pages leaving the index from 2026-10-03.
 *
 * Only the API's own 404 means "not found". Anything else (no answer, a 5xx, a 403
 * from the edge) is an outage, and an outage is a 503 with Retry-After, which Google
 * retries instead of deindexing. It is logged, so the cause shows up in the tail.
 */

interface ApiResult {
  error: unknown;
  status: number;
}

const RETRY_AFTER_SECONDS = 300;

const BODY = `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Instabilidade no FunSona</title>
  </head>
  <body>
    <h1>Estamos com instabilidade</h1>
    <p>Não conseguimos carregar esta página agora. Tente de novo em alguns minutos.</p>
    <p><a href="/">Voltar para o início</a></p>
  </body>
</html>
`;

export function isApiUnavailable(result: ApiResult): boolean {
  return Boolean(result.error) && result.status !== 404;
}

export function apiUnavailableResponse(page: string, result: ApiResult): Response {
  console.error(
    JSON.stringify({
      event: "api_unavailable",
      page,
      status: result.status,
      error: String(result.error),
    })
  );
  return new Response(BODY, {
    status: 503,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "retry-after": String(RETRY_AFTER_SECONDS),
      "cache-control": "no-store",
    },
  });
}
