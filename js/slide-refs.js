/*
 * Slide references that keep themselves up to date.
 *
 *   <span class="slide-ref" data-slides="token-candidates token-result"></span>
 *
 * becomes "(6.3, 6.4)" — the numbers reveal.js currently shows for the
 * slides with those ids, in the same h.v format — and each number links to
 * its slide. Move slides around and the references follow.
 *
 * An unknown id renders as "(?id)" in red, so a broken reference is visible
 * on the slide rather than silently wrong.
 */
(function () {
  'use strict';

  // Mirrors slideNumber: 'h.v' — slides inside a vertical stack get h.v,
  // stand-alone slides just h.
  function label(Reveal, slide) {
    const { h, v } = Reveal.getIndices(slide);
    const inStack = slide.parentElement && slide.parentElement.tagName === 'SECTION';
    return inStack ? `${h + 1}.${v + 1}` : `${h + 1}`;
  }

  function fill(Reveal) {
    document.querySelectorAll('.slide-ref[data-slides]').forEach((ref) => {
      const parts = [];
      for (const id of ref.dataset.slides.split(/\s+/).filter(Boolean)) {
        const slide = document.getElementById(id);
        if (slide && slide.tagName === 'SECTION') {
          const a = document.createElement('a');
          a.href = `#/${id}`;
          a.textContent = label(Reveal, slide);
          parts.push(a);
        } else {
          const bad = document.createElement('span');
          bad.className = 'slide-ref-missing';
          bad.textContent = `?${id}`;
          parts.push(bad);
        }
      }
      ref.replaceChildren('(');
      parts.forEach((p, i) => {
        if (i > 0) ref.append(', ');
        ref.append(p);
      });
      ref.append(')');
    });
  }

  function init(Reveal) {
    if (Reveal.isReady()) fill(Reveal);
    else Reveal.on('ready', () => fill(Reveal));
  }

  window.SlideRefs = { init };
})();
