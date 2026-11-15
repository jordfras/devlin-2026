/*
 * Ring map: a small set of concentric rings showing which feedback loop the
 * talk is on. Innermost ring = fastest loop.
 *
 *   <div class="ring-map" data-rings="9" data-active="0"></div>
 *
 * data-rings   how many loops the talk presents (change it in one place per
 *              slide if the set of loops changes)
 * data-active  0-based index of the current loop, counted from the inside,
 *              or "all" to light every ring
 *
 * Rings inside the active one are drawn as already visited; rings outside
 * it are faint. Pure SVG, no dependencies, works offline.
 *
 * Optional, for a loop that feeds an inner one:
 *   data-feed="0"            draw an arrow from the active ring inwards to
 *                            this ring (0 = the centre); it is a fragment and
 *                            draws itself in when revealed
 *   data-feed-label="…"      text beside the arrow
 *   data-center-label="…"    text at the centre
 */
(function () {
  'use strict';

  const SVG_NS = 'http://www.w3.org/2000/svg';
  let uid = 0;

  function el(name, attrs, parent) {
    const node = document.createElementNS(SVG_NS, name);
    for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
    if (parent) parent.appendChild(node);
    return node;
  }

  function draw(host) {
    const rings = parseInt(host.dataset.rings || '1', 10);
    // data-active="all" lights every ring (the closing overview).
    const all = host.dataset.active === 'all';
    const active = all ? -1 : parseInt(host.dataset.active || '0', 10);
    const size = 400;
    const c = size / 2;
    const inner = 22;
    const step = (c - inner - 10) / Math.max(rings - 1, 1);

    const svg = el('svg', { viewBox: `0 0 ${size} ${size}`, 'aria-hidden': 'true' }, null);
    const id = `ring-map-grad-${uid++}`;
    const defs = el('defs', {}, svg);
    const grad = el('linearGradient', { id, x1: '1', y1: '0', x2: '0', y2: '1' }, defs);
    el('stop', { offset: '0', 'stop-color': '#833fff' }, grad);
    el('stop', { offset: '1', 'stop-color': '#bf0000' }, grad);

    for (let i = rings - 1; i >= 0; i--) {
      const r = inner + i * step;
      let cls = 'ring-later';
      if (all || i === active) cls = 'ring-active';
      else if (i < active) cls = 'ring-done';
      const circle = el('circle', { cx: c, cy: c, r, class: cls }, svg);
      if (cls === 'ring-active') circle.setAttribute('stroke', `url(#${id})`);
      // Counted from the inside: the closing overview lights them in order.
      circle.style.setProperty('--ring-i', i);
    }
    if (host.dataset.feed !== undefined) drawFeed(host, svg, id, { c, inner, step, active });
    host.replaceChildren(svg);
  }

  // An arrow from the active ring curving in to an inner ring or the centre.
  // The head is a separate path (not a marker) so it can fade in after the
  // line has drawn itself.
  function drawFeed(host, svg, gradId, { c, inner, step, active }) {
    const target = parseInt(host.dataset.feed, 10);
    const rFrom = inner + active * step;
    const rTo = target === 0 ? 0 : inner + target * step;
    const deg = (d) => (d * Math.PI) / 180;
    const at = (r, d) => [c + r * Math.cos(deg(d)), c + r * Math.sin(deg(d))];

    // Leave the ring at the top right, sweep round, arrive at the target
    // from above-right so the label below the centre stays clear.
    const from = at(rFrom, -55);
    // The path ends where the arrowhead's base sits; the tip is drawn on
    // from there, so a target of the centre ends just short of the dot.
    const stop = rTo === 0 ? 34 : rTo + 26;
    const to = at(stop, -60);
    // A cubic: leave along the ring (clockwise), arrive heading straight at
    // the target, so the line runs smoothly into the arrowhead.
    const c1 = at(rFrom * 0.85, -20);
    const c2 = at(stop + (rFrom - stop) * 0.45, -60);
    const ctrl = c2;

    const g = el('g', { class: 'rm-feed fragment' }, svg);
    el('path', {
      d: `M${from[0]} ${from[1]} C${c1[0]} ${c1[1]} ${c2[0]} ${c2[1]} ${to[0]} ${to[1]}`,
      class: 'rm-feed-line', pathLength: '1', stroke: `url(#${gradId})`,
    }, g);

    // Arrowhead along the curve's final direction.
    const dir = [to[0] - ctrl[0], to[1] - ctrl[1]];
    const len = Math.hypot(dir[0], dir[1]) || 1;
    const u = [dir[0] / len, dir[1] / len];
    const n = [-u[1], u[0]];
    // Point the head at the target itself, not along the curve's tangent.
    const goal = rTo === 0 ? [c, c] : at(rTo, -60);
    const g2 = [goal[0] - to[0], goal[1] - to[1]];
    const gl = Math.hypot(g2[0], g2[1]) || 1;
    u[0] = g2[0] / gl; u[1] = g2[1] / gl;
    n[0] = -u[1]; n[1] = u[0];
    const tip = [goal[0] - u[0] * 11, goal[1] - u[1] * 11];
    const base = [tip[0] - u[0] * 22, tip[1] - u[1] * 22];
    const p = (q) => `${q[0].toFixed(1)} ${q[1].toFixed(1)}`;
    el('path', {
      d: `M${p(tip)} L${p([base[0] + n[0] * 11, base[1] + n[1] * 11])} L${p([base[0] - n[0] * 11, base[1] - n[1] * 11])} Z`,
      class: 'rm-feed-head',
    }, g);

    if (host.dataset.feedLabel) {
      // Outside the rings, by where the arrow leaves; the svg's overflow is
      // visible so the label may extend past the viewBox.
      const out = at(c - 4, -55);
      const t = el('text', { x: out[0] + 6, y: out[1] - 6, class: 'rm-feed-label' }, g);
      t.textContent = host.dataset.feedLabel;
    }
    if (host.dataset.centerLabel) {
      el('circle', { cx: c, cy: c, r: 8, class: 'rm-center' }, svg);
      const t = el('text', { x: c, y: c + 34, class: 'rm-center-label' }, svg);
      t.textContent = host.dataset.centerLabel;
    }
  }

  // The pulse on arrival is pure CSS, keyed on .arrived from js/arrival.js.
  function init() {
    document.querySelectorAll('.ring-map').forEach(draw);
  }

  window.RingMap = { init };
})();
