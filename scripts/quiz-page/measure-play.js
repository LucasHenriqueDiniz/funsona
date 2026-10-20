// Slice 0 of docs/plans/quiz-page-redesign: measure the play screen's ad placement. Paste into the
// devtools console (or run through the browser pane) on /quiz/<slug>/play, viewport already set.
// Prints one JSON object. Positions are document coordinates.
(() => {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const top = (el) => Math.round(el.getBoundingClientRect().top + window.scrollY);
  const bottom = (el) => Math.round(el.getBoundingClientRect().bottom + window.scrollY);
  const textOf = (el) => (el.textContent || "").trim();

  // The answers and the Anterior/Próxima row share the question <section>; the exit control and
  // the navbar do not.
  const buttons = [...document.querySelectorAll("main section button")];
  const navRow = buttons.filter((b) => /^(Anterior|Próxima|Ver resultado|Salvando)/.test(textOf(b)));
  const answers = buttons.filter((b) => !navRow.includes(b));
  // An unfilled unit is display:none, so measure the slot's wrapper (the "Publicidade" label's
  // parent), which is where the unit sits whether or not an ad filled it.
  const ads = [...document.querySelectorAll("span")]
    .filter((el) => textOf(el) === "Publicidade")
    .map((el) => el.parentElement);

  const stickyAncestors = (el) => {
    let n = 0;
    for (let node = el; node && node !== document.body; node = node.parentElement) {
      const pos = getComputedStyle(node).position;
      if (pos === "sticky" || pos === "fixed") n += 1;
    }
    return n;
  };

  const lastAnswerBottom = answers.length ? Math.max(...answers.map(bottom)) : null;
  const navRowBottom = navRow.length ? Math.max(...navRow.map(bottom)) : null;
  const ad = ads[0] || null;

  const out = {
    url: location.pathname,
    viewport: `${vw}x${vh}`,
    answers: answers.length,
    lastAnswerBottom,
    navRowBottom,
    adCount: ads.length,
    adTop: ad ? top(ad) : null,
    adWidth: ad ? Math.round(ad.getBoundingClientRect().width) : null,
    adBelowAnswers: ad && lastAnswerBottom !== null ? top(ad) > lastAnswerBottom : null,
    adBelowNavRow: ad && navRowBottom !== null ? top(ad) > navRowBottom : null,
    stickyAdAncestors: ad ? stickyAncestors(ad) : null,
    stickyAdCount: ads.filter((el) => stickyAncestors(el) > 0).length,
    scrollWidth: document.documentElement.scrollWidth,
    overflowX: document.documentElement.scrollWidth > vw,
  };
  console.log(JSON.stringify(out));
  return out;
})();
