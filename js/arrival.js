/*
 * Arrival: marks the current slide .arrived once its transition has finished,
 * so animations can wait until the slide has scrolled into place.
 *
 *   .reveal section.arrived .thing { animation: … }
 *
 * reveal marks a slide .present when its transition starts, which is too
 * early. The class is removed whenever the slide changes, so an animation
 * replays every time the slide is entered. The timeout covers slides whose
 * transition never fires an end event (same approach as js/ring-map.js).
 */
(function () {
  'use strict';

  function mark(slide) {
    if (!slide) return;
    void slide.getBoundingClientRect(); // restart animations on re-entry
    slide.classList.add('arrived');
  }

  function init(reveal) {
    let pending = null;
    const arrive = () => {
      if (pending && pending === reveal.getCurrentSlide()) mark(pending);
      pending = null;
    };
    reveal.on('ready', (e) => mark(e.currentSlide));
    reveal.on('slidechanged', (e) => {
      document.querySelectorAll('.reveal section.arrived')
        .forEach((s) => s.classList.remove('arrived'));
      pending = e.currentSlide;
      setTimeout(arrive, 900);
    });
    reveal.on('slidetransitionend', arrive);
  }

  window.Arrival = { init };
})();
