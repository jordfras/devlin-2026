/*
 * Title swap: "hallucinatorn" drops onto "agenten" on the title slide and
 * knocks it down. The word is a fragment; the animation is CSS.
 *
 * CSS cannot transition an inline box to an auto width, so this measures both
 * words once the fonts are in and hands the widths over as custom properties:
 *
 *   .title-swap { width: var(--swap-old); }  →  var(--swap-new) when swapped
 *
 * The animation only plays on the click: reveal also marks the fragment
 * visible when the slide is entered backwards or reloaded on this step, and
 * then the swapped title should simply be there. So the click adds .swapping,
 * and leaving the step or the slide takes it away again.
 */
(function () {
  'use strict';

  function measure(box) {
    const old = box.querySelector('.title-swap-old');
    const neu = box.querySelector('.title-swap-new');
    box.style.setProperty('--swap-old', old.offsetWidth + 'px');
    box.style.setProperty('--swap-new', neu.offsetWidth + 'px');
  }

  function init(reveal) {
    const boxes = document.querySelectorAll('.title-swap');
    // Measured once laid out: before reveal is ready the slides are hidden
    // and every width reads as 0.
    let ready = false;
    reveal.on('ready', () => {
      ready = true;
      document.fonts.ready.then(() => boxes.forEach(measure));
    });
    const stop = () => boxes.forEach((b) => b.classList.remove('swapping'));
    reveal.on('fragmentshown', (e) => {
      // A reload on this step shows the fragment before 'ready'; not a click.
      if (!ready) return;
      e.fragments.forEach((f) => {
        const box = f.closest('.title-swap');
        if (box) box.classList.add('swapping');
      });
    });
    reveal.on('fragmenthidden', stop);
    reveal.on('slidechanged', stop);
  }

  window.TitleSwap = { init };
})();
