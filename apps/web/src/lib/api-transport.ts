/**
 * How server-rendered pages reach the API Worker.
 *
 * Over the internet, a call from this Worker to api.funsona.com crosses the
 * zone's Bot Fight Mode, which the Free plan cannot skip with a rule. It
 * challenged those calls, which come from Cloudflare's own ASN, in the US data
 * centres Googlebot and the AdSense crawler are served from: on 2026-10-19 both
 * URL Inspection live tests of a quiz logged a botFight managed_challenge on the
 * API call, and the page answered 404. Search Console lost the quiz pages from
 * 2026-10-03.
 *
 * The API service binding (wrangler.toml) goes Worker to Worker and never
 * crosses the zone. The middleware hands it over on every request of the built
 * Worker. Without it (in the browser, or under `astro dev`) calls go over the
 * internet as before.
 */

export interface ApiBinding {
  fetch(input: string, init?: RequestInit): Promise<Response>;
}

// The binding is one object per isolate, the same for every request, so holding
// it at module level is safe under concurrent requests.
let binding: ApiBinding | undefined;

export function setApiBinding(next: ApiBinding | undefined): void {
  binding = next;
}

export function apiTransport(url: string, init?: RequestInit): Promise<Response> {
  return binding ? binding.fetch(url, init) : fetch(url, init);
}
