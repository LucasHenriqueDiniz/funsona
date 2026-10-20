---
tags: [fetch, 2026-10-20-adsense-slot-missing-in-production]
source: https://funsona.com/_astro/AdSlot.DYbUm9I1.js
fetched: 2026-10-20
kind: primary
---

# The `AdSlot` island chunk served by funsona.com on 2026-10-20

> Fetched 2026-10-20 17:22 UTC · The client bundle for `AdSlot.tsx` that production served, reached
> from the `<astro-island component-url>` on
> `https://funsona.com/quiz/que-arma-voce-tem-descubra-sua-arma-interior`. Kept because the next
> deploy replaces it, and it is the evidence for the whole note.

## What it says

The `SLOT_IDS` map, verbatim from the 922-byte minified file (variable renamed to `d`):

```js
const d={"quiz-landing":"﻿2214003867","quiz-play-interval":"﻿3283542953","quiz-result":"﻿8587840529"};
```

`od -c` on that region, so the escape is not a display artefact:

```
0000000    q   u   i   z   -   l   a   n   d   i   n   g   "   :   "   \
0000020    u   F   E   F   F   2   2   1   4   0   0   3   8   6   7   "
```

The client id in the same chunk, with no BOM:

```js
n="ca-pub-2600827684802809"
```

The page HTML around it: the loader `adsbygoogle.js?client=ca-pub-2600827684802809` is present, the
island is present (`props="{"slot":[0,"quiz-landing"]}"`, `client="visible"`), and there is no
`data-ad-slot` and no "Publicidade" anywhere in the HTML. The Clerk key in the same HTML is clean:
`pk_live_Y2xlcmsuZnVuc29uYS5jb20k`, no `﻿` before it.

## What it does not say

- Which Cloudflare deployment built it, and from which commit. Response headers carry no build id.
- Where the three values were set on the Cloudflare side (dashboard variable or secret).
