/*
 * Notes style: makes the speaker notes easier to scan in the speaker view.
 *
 *   <p class="qa">[Om någon frågar: …]</p>   smaller and grey, easy to skip
 *   <p class="caveat">[…]</p>                the same: a caveat for the speaker
 *   <p><b>Nyckelord</b> text…</p>           the keyword on its own line above
 *   [Klicka.] / [Vänta.]                     bold and red, easy to spot
 *   <p class="stage">[…]</p>                 bold and red: a cue for the
 *                                            speaker only, e.g. a slide to
 *                                            skip when short of time;
 *                                            tools/publish.py strips these
 *
 * The speaker view is a separate window that does not load css/custom.css;
 * the notes plugin sends each slide's notes as HTML and inserts it with
 * innerHTML. So the styling has to travel inside the notes: this rewrites
 * them once on load, adding inline styles. Stage directions are found by
 * text, so new notes need no markup; prepared answers and caveats carry a
 * class.
 */
(function () {
  'use strict';

  const QA_STYLE = 'font-size: 0.8em; color: #888;';
  const CUE_STYLE = 'font-weight: 700; color: #bf0000;';
  const CUE = /\[(?:Klicka|Vänta)[^\]]*\]/g;
  const KEY_STYLE = 'display: block;';
  const STAGE_STYLE = CUE_STYLE;

  // A <b> that opens a paragraph is its keyword. Runs before styleCues, so
  // the cues' own <b> elements do not exist yet.
  function styleKeys(aside) {
    aside.querySelectorAll('p').forEach((p) => {
      const first = p.firstChild;
      const opener = first && first.nodeType === Node.TEXT_NODE && !first.nodeValue.trim()
        ? first.nextSibling : first;
      if (opener && opener.nodeName === 'B') opener.setAttribute('style', KEY_STYLE);
    });
  }

  function styleCues(aside) {
    const walker = document.createTreeWalker(aside, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    for (const node of nodes) {
      const text = node.nodeValue;
      // matchAll only; a CUE.test() first would move lastIndex past the
      // match, and matchAll starts from there.
      const matches = [...text.matchAll(CUE)];
      if (matches.length === 0) continue;
      const frag = document.createDocumentFragment();
      let last = 0;
      for (const m of matches) {
        frag.append(text.slice(last, m.index));
        const b = document.createElement('b');
        b.setAttribute('style', CUE_STYLE);
        b.textContent = m[0];
        frag.append(b);
        last = m.index + m[0].length;
      }
      frag.append(text.slice(last));
      node.replaceWith(frag);
    }
  }

  function init() {
    document.querySelectorAll('aside.notes').forEach((aside) => {
      aside.querySelectorAll('.qa, .caveat').forEach((p) => p.setAttribute('style', QA_STYLE));
      aside.querySelectorAll('.stage').forEach((p) => p.setAttribute('style', STAGE_STYLE));
      styleKeys(aside);
      styleCues(aside);
    });
  }

  window.NotesStyle = { init };
})();
