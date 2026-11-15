/*
 * Where-map: three boxes — the language model at the provider, the agent on
 * your machine, and you — showing where a feedback loop runs.
 *
 *   <div class="where-map" data-active="token"></div>
 *
 * data-active  the loop(s) to light up, space-separated: keys from the lists
 *              below. Loops already presented are drawn faint; loops the
 *              talk has not reached yet are blurred, so the map does not
 *              give away what comes later.
 *
 * Deep analysis and release are left out on purpose: they run in CI and at
 * the users, neither on the agent's machine nor with you.
 *
 * Built from HTML, so it is styled from css/custom.css like everything else.
 */
(function () {
  'use strict';

  // Which side each loop runs on, its label, and its place in the talk (the
  // ring number on the ring map). Edit here if the set of loops changes.
  const MODEL_LOOPS = [['token', 'token', 0]];
  const AGENT_LOOPS = [
    ['compiler', 'kompilator', 1],
    ['lint', 'lint och formatering', 2],
    ['tests', 'tester', 3],
    ['ai-review', 'AI-granskning', 5],
  ];
  const HUMAN_LOOPS = [
    ['review', 'granskning', 5],
    ['instructions', 'instruktioner', 6],
  ];

  function loopList(loops, active, reached) {
    const ul = document.createElement('ul');
    for (const [key, label, ring] of loops) {
      const li = document.createElement('li');
      li.className = 'wm-loop';
      if (active.includes(key)) li.classList.add('is-active');
      else if (ring > reached) li.classList.add('is-upcoming');
      const mark = document.createElement('span');
      mark.className = 'wm-mark';
      mark.textContent = '↻';
      li.appendChild(mark);
      li.appendChild(document.createTextNode(label));
      ul.appendChild(li);
    }
    return ul;
  }

  function box(where, what, loops, active, reached) {
    const div = document.createElement('div');
    div.className = 'wm-box';
    const kicker = document.createElement('p');
    kicker.className = 'wm-where';
    kicker.textContent = where;
    const title = document.createElement('p');
    title.className = 'wm-what';
    title.textContent = what;
    div.append(kicker, title, loopList(loops, active, reached));
    return div;
  }

  function arrows(forward, back) {
    const div = document.createElement('div');
    div.className = 'wm-arrows';
    div.innerHTML =
      `<span class="wm-arrow">${forward} <b>→</b></span>` +
      `<span class="wm-arrow"><b>←</b> ${back}</span>`;
    return div;
  }

  function draw(host) {
    const active = (host.dataset.active || '').split(/\s+/).filter(Boolean);
    const all = [...MODEL_LOOPS, ...AGENT_LOOPS, ...HUMAN_LOOPS];
    // The furthest loop the talk has reached: the current one.
    const reached = Math.max(-1, ...all
      .filter(([key]) => active.includes(key))
      .map(([, , ring]) => ring));
    host.replaceChildren(
      box('Hos leverantören', 'Språkmodellen', MODEL_LOOPS, active, reached),
      arrows('kod', 'fel'),
      box('Din dator', 'Agenten', AGENT_LOOPS, active, reached),
      arrows('ändring', 'synpunkter'),
      box('Människan', 'Du', HUMAN_LOOPS, active, reached),
    );
  }

  function init() {
    document.querySelectorAll('.where-map').forEach(draw);
  }

  window.WhereMap = { init };
})();
