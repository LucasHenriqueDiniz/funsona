// Slice 0 of docs/plans/quiz-page-redesign: measure a quiz landing page in the viewport it is
// rendered in. Paste into the devtools console (or run through the browser pane) on
// /quiz/<slug> with the viewport already set to 375×812 or 1024×768. Prints one JSON object.
//
// Positions are document coordinates (scroll-independent). "screens" divide by the viewport height.
(() => {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const top = (el) => Math.round(el.getBoundingClientRect().top + window.scrollY);
  const bottom = (el) => Math.round(el.getBoundingClientRect().bottom + window.scrollY);
  const textOf = (el) => (el.textContent || "").trim();

  const play = [...document.querySelectorAll('a[href$="/play"]')].find((a) => /jogar/i.test(textOf(a)));
  const h1 = document.querySelector("h1");
  const comments = [...document.querySelectorAll("h2, h3, span, p")].find((el) => textOf(el).startsWith("Comentários"));
  // An unfilled AdSense unit is display:none, so its <ins> measures 0×0 at 0,0. The slot's wrapper
  // (the "Publicidade" label's parent) is where the unit sits whether or not an ad filled it.
  const adLabel = [...document.querySelectorAll("span")].find((el) => textOf(el) === "Publicidade");
  const ad = adLabel ? adLabel.parentElement : document.querySelector("ins.adsbygoogle");
  const docHeight = document.documentElement.scrollHeight;

  // The title "under the cover card": the text's own box against the h1's box. Positive = overflow.
  let h1TextOverflow = null;
  if (h1) {
    const range = document.createRange();
    range.selectNodeContents(h1);
    h1TextOverflow = Math.round(range.getBoundingClientRect().right - h1.getBoundingClientRect().right);
  }

  const out = {
    url: location.pathname,
    viewport: `${vw}x${vh}`,
    docHeight,
    screens: Number((docHeight / vh).toFixed(2)),
    playTop: play ? top(play) : null,
    playBottom: play ? bottom(play) : null,
    playAboveFold: play ? bottom(play) <= vh : false,
    commentsTop: comments ? top(comments) : null,
    commentsScreen: comments ? Number((top(comments) / vh).toFixed(2)) : null,
    adTop: ad ? top(ad) : null,
    adDistanceFromPlay: ad && play ? top(ad) - bottom(play) : null,
    h1TextOverflow,
    scrollWidth: document.documentElement.scrollWidth,
    overflowX: document.documentElement.scrollWidth > vw,
  };
  console.log(JSON.stringify(out));
  return out;
})();
