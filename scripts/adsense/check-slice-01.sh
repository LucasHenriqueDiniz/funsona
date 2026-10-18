#!/bin/bash
# Slice 1 of docs/plans/adsense-low-value-content, checked against a running site.
# Usage: scripts/adsense/check-slice-01.sh <base-url>   (default http://localhost:4322)
# Exits non-zero if any check fails.
B=${1:-http://localhost:4322}
pass=0; fail=0
ok(){ echo "PASS  $1"; pass=$((pass+1)); }
ko(){ echo "FAIL  $1"; fail=$((fail+1)); }
get(){ /usr/bin/curl -s -m 60 "$B$1"; }
code(){ /usr/bin/curl -s -m 60 -o /dev/null -w '%{http_code} %{redirect_url}' "$B$1"; }

home=$(get /)
for pat in '+10k' 'qual-personagem-anime' 'conhecimentos-gerais-brasil' 'maior plataforma' 'A maioria dos quizzes é criada pela própria comunidade'; do
  n=$(grep -cF -- "$pat" <<<"$home"); [ "$n" = 0 ] && ok "home lacks '$pat'" || ko "home contains '$pat' ($n)"
done
stat=$(grep -oE '\+[0-9]+</div>' <<<"$home" | head -1); echo "      home quiz stat: ${stat:-<absent>}"
[ "$(grep -c 'adsbygoogle.js' <<<"$home")" = 1 ] && ok "home loads the AdSense loader" || ko "home has no loader"
grep -q 'href="#"' <<<"$home" && ko "home has href=\"#\"" || ok "home has no href=\"#\""
grep -q 'href="/contact"' <<<"$home" && ok "footer: Contact -> /contact" || ko "footer has no /contact"
grep -q 'mailto:' <<<"$home" && ko "home still has mailto:" || ok "home has no mailto:"

for p in /login /register /sso-callback; do
  h=$(get $p); n=$(grep -c 'adsbygoogle.js' <<<"$h"); [ "$n" = 0 ] && ok "$p has no loader" || ko "$p has the loader ($n)"
done
login=$(get /login)
for pat in '+18k' '+3k' '24/7'; do grep -qF -- "$pat" <<<"$login" && ko "login contains '$pat'" || ok "login lacks '$pat'"; done
for p in /settings /moderation /quiz/new /profile/me; do
  r=$(code $p); echo "      $p (signed out) -> $r"
done

about=$(get /about)
for pat in 'mais de 1.000' 'maiores portais' 'comunidade ativa' 'maior plataforma'; do grep -qF -- "$pat" <<<"$about" && ko "about contains '$pat'" || ok "about lacks '$pat'"; done
grep -q 'email_off' <<<"$about" && ok "about: email_off present in HTML" || ko "about: email_off missing from HTML"
contact=$(get /contact); grep -qF 'maior plataforma' <<<"$contact" && ko "contact contains 'maior plataforma'" || ok "contact lacks 'maior plataforma'"

priv=$(get /privacy)
for pat in 'google.com/settings/ads' 'aboutads.info/choices' 'Fornecedores terceiros, incluindo o Google'; do grep -qF -- "$pat" <<<"$priv" && ok "privacy contains '$pat'" || ko "privacy lacks '$pat'"; done
grep -qF 'RLS' <<<"$priv" && ko "privacy still mentions RLS" || ok "privacy has no RLS"

r=$(code /explore/nao-existe-xyz); [[ "$r" == 302*"/404" ]] && ok "/explore/nao-existe-xyz -> $r" || ko "/explore/nao-existe-xyz -> $r"
f=$(/usr/bin/curl -s -m 60 -L -o /dev/null -w '%{http_code}' "$B/explore/nao-existe-xyz"); [ "$f" = 404 ] && ok "following the redirect: 404" || ko "following the redirect: $f"
r=$(code /explore/personality); [[ "$r" == 200* ]] && ok "/explore/personality -> 200" || ko "/explore/personality -> $r"

low=$(get /quiz/quantas-criancas-de-cinco-anos-voce-pode-lutar-descubra-agora)
n=$(grep -cE '>jogadas</p>' <<<"$low"); [ "$n" = 0 ] && ok "quiz with 0 plays: no counter on the card" || ko "quiz with 0 plays shows a counter ($n)"
hi=$(get /quiz/que-arma-voce-tem-descubra-sua-arma-interior)
n=$(grep -cE '>jogadas</p>' <<<"$hi"); [ "$n" = 1 ] && ok "quiz with 21 plays: card shows the counter" || ko "quiz with 21 plays has no counter ($n)"
n=$(sed -E 's/<[^>]+>/ /g' <<<"$low$home" | grep -cE '(^|[^0-9])0 +jogadas'); [ "$n" = 0 ] && ok "no '0 jogadas' on home + quiz" || ko "'0 jogadas' appears ($n)"

echo "---- $pass PASS, $fail FAIL"
[ "$fail" = 0 ]
