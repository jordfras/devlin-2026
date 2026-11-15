/*
 * Morph the Code 42d logo mark into Don Wells' XP planning/feedback loops
 * diagram, and back.
 *
 * Two vertical slides carry the same <svg class="xp-morph">, with the labels
 * as plain <text>: the first with data-xp-state="logo", the second with
 * data-xp-state="diagram". Stepping from one to the other plays the morph on
 * the slide being entered; arriving any other way shows the slide's own state.
 *
 * Both states are built from the same number of cubic segments per path, so
 * the morph is a straight interpolation of coordinates — no library needed.
 * Arrowheads are drawn here rather than with SVG markers so they can carry
 * the gradient and grow or shrink independently of the line.
 */
(function () {
  'use strict';

  const DURATION = 1800; // ms
  const SVG_NS = 'http://www.w3.org/2000/svg';

  // ---- Geometry, in the svg's 1000 x 700 viewBox ------------------------

  // Diagram state: the path geometry of the Wikimedia Commons redrawing of
  // Wells' diagram (File:Extreme_Programming.svg by DonWells, CC BY-SA 3.0),
  // scaled into this viewBox. Each path ends at its arrow's tip. Labels are
  // [x, baseline] for start-anchored text.
  //   outer: the arc from Code round to Release plan
  //   chain: the steps down the right side, Release plan -> ... -> Code
  //   inner: the arcs to Iteration plan ... Pair programming
  //   names: Release plan ... Pair programming, then Code
  //   times: months ... seconds
  const WELLS = {"outer":[[[391.1,647.3],[371.8,643.4],[353.1,637.5],[335.3,630.0]],[[335.3,630.0],[299.8,615.0],[267.7,593.2],[240.9,566.3]],[[240.9,566.3],[214.0,539.4],[192.2,507.4],[177.2,471.8]],[[177.2,471.8],[162.1,436.3],[153.8,397.2],[153.8,356.1]],[[153.8,356.1],[153.8,315.1],[162.1,276.0],[177.2,240.5]],[[177.2,240.5],[192.2,204.9],[214.0,172.9],[240.9,146.0]],[[240.9,146.0],[267.7,119.1],[311.5,86.6],[357.3,73.6]]],"chain":[[[[528.9,71.8],[538.8,74.8],[548.4,78.3],[557.7,82.3]],[[557.7,82.3],[577.8,90.8],[596.7,101.4],[623.3,120.3]]],[[[659.3,153.3],[670.6,165.4],[680.9,178.5],[696.1,201.5]]],[[[714.5,237.1],[714.9,238.2],[715.4,239.3],[715.9,240.5]],[[715.9,240.5],[721.9,254.7],[726.9,269.5],[732.7,292.7]]],[[[738.0,328.2],[738.8,337.4],[739.3,346.7],[739.3,356.1]],[[739.3,356.1],[739.0,363.5],[738.6,370.8],[736.3,394.7]]],[[[728.5,431.6],[724.4,447.2],[719.1,462.4],[708.3,487.4]]],[[[687.2,523.7],[677.5,538.3],[666.1,551.8],[647.4,570.1]]],[[[607.8,601.0],[591.2,613.0],[573.1,623.2],[553.9,631.2]],[[553.9,631.2],[537.2,638.3],[519.8,643.7],[493.0,649.2]]]],"inner":[[[[191.9,501.8],[110.0,365.6],[207.3,150.6],[546.5,135.7]]],[[[230.9,552.9],[144.5,472.7],[190.4,266.8],[592.9,215.8]]],[[[264.6,588.1],[178.1,507.8],[204.0,360.5],[602.6,310.0]]],[[[313.2,619.6],[284.3,605.3],[137.8,467.7],[621.3,404.9]]],[[[372.0,642.1],[313.7,627.0],[138.6,544.9],[629.4,504.7]]],[[[372.0,642.1],[337.9,632.3],[237.8,590.1],[506.4,577.7]]]],"names":[[359.2,83.6],[559.9,144.4],[606.7,223.8],[616.9,318.9],[632.2,414.4],[642.3,514.0],[516.2,589.6],[413.0,652.4]],"times":[[509.8,109.3],[613.5,182.0],[673.8,267.6],[659.9,358.4],[667.4,453.6],[596.6,542.1],[487.8,621.4]]};
  const DIAGRAM_OUTER_WIDTH = 6;
  const DIAGRAM_WIDTH = 4;

  // Logo state, fitted to images/code42d-icon.svg: an open circular loop
  // (angles in degrees, y down, so increasing is clockwise on screen) whose
  // last piece bends in to the big arrowhead, plus three arrows whose start
  // hides inside the loop's stroke.
  const LOGO = { cx: 500, cy: 350, r: 257.6, start: 98.3, top: 262, end: 416 };
  const LOGO_TIP = [528, 590];
  const LOGO_TIP_HEADING = [-0.979, 0.204];
  const LOGO_OUTER_WIDTH = 40;
  const LOGO_INNER_WIDTH = 20;
  const LOGO_ARROWS = {
    red: [[244.1, 319.3], [324.8, 247.5], [412.5, 113.0], [668.0, 246.0]],
    green: [[253.6, 427.5], [396.9, 312.2], [420.0, 275.4], [618.4, 350.0]],
    blue: [[303.6, 517.3], [397.2, 429.9], [393.7, 397.2], [568.0, 467.6]],
  };
  // Which logo arrow each inner loop grows out of; the ones that share an
  // arrow with a neighbour start invisible and fade in.
  const INNER_SOURCE = ['red', 'red', 'green', 'green', 'blue', 'blue'];
  const INNER_VISIBLE = [true, false, true, false, true, false];
  const OVERLAP = 1.5; // degrees, so no seam shows between logo pieces

  // Arrowheads as [length, half width], in line widths.
  const HEAD_LOGO_OUTER = [2.46, 1.44];
  const HEAD_LOGO_INNER = [3.24, 1.86];
  const HEAD_DIAGRAM = [3.2, 1.35];

  // ---- Small geometry helpers -------------------------------------------

  const rad = (deg) => (deg * Math.PI) / 180;
  const add = (a, b) => [a[0] + b[0], a[1] + b[1]];
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1]];
  const mul = (a, k) => [a[0] * k, a[1] * k];
  const unit = (v) => { const l = Math.hypot(v[0], v[1]) || 1; return [v[0] / l, v[1] / l]; };
  const onLogo = (deg) => [LOGO.cx + LOGO.r * Math.cos(rad(deg)), LOGO.cy + LOGO.r * Math.sin(rad(deg))];
  const tangent = (deg) => [-Math.sin(rad(deg)), Math.cos(rad(deg))];

  function circleSegments(a0, a1, n) {
    const segs = [];
    const step = (a1 - a0) / n;
    const k = (4 / 3) * Math.tan(rad(step) / 4) * LOGO.r;
    for (let i = 0; i < n; i++) {
      const s = a0 + i * step, e = s + step;
      const p0 = onLogo(s), p3 = onLogo(e);
      segs.push([p0, add(p0, mul(tangent(s), k)), sub(p3, mul(tangent(e), k)), p3]);
    }
    return segs;
  }

  function splitCubic([p0, p1, p2, p3], t) {
    const l = (a, b) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
    const a = l(p0, p1), b = l(p1, p2), c = l(p2, p3), d = l(a, b), e = l(b, c), m = l(d, e);
    return [[p0, a, d, m], [m, e, c, p3]];
  }

  // Split a single cubic into n pieces so it can morph against n segments.
  function splitInto(seg, n) {
    const out = [];
    let rest = seg;
    for (let i = n; i > 1; i--) {
      const [a, b] = splitCubic(rest, 1 / i);
      out.push(a);
      rest = b;
    }
    out.push(rest);
    return out;
  }

  // ---- The two states ----------------------------------------------------

  function buildPaths() {
    const paths = [];
    const chainSpan = (LOGO.end - LOGO.top) / WELLS.chain.length;

    paths.push({
      logo: circleSegments(LOGO.start, LOGO.top + OVERLAP, WELLS.outer.length),
      diagram: WELLS.outer,
      width: [LOGO_OUTER_WIDTH, DIAGRAM_OUTER_WIDTH],
      headSize: [HEAD_LOGO_OUTER, HEAD_DIAGRAM],
      head: [0, 1],
      opacity: [1, 1],
      cap: 'round',
    });

    WELLS.chain.forEach((diagram, j) => {
      const last = j === WELLS.chain.length - 1;
      const a0 = LOGO.top + j * chainSpan;
      let logo;
      if (last) {
        // Along the loop, then bend in to the arrowhead's tip.
        const body = circleSegments(a0, LOGO.end, diagram.length - 1);
        const from = onLogo(LOGO.end);
        logo = [...body, [from, add(from, mul(tangent(LOGO.end), 30)), sub(LOGO_TIP, mul(LOGO_TIP_HEADING, 30)), LOGO_TIP]];
      } else {
        logo = circleSegments(a0, a0 + chainSpan + OVERLAP, diagram.length);
      }
      paths.push({
        logo, diagram,
        width: [LOGO_OUTER_WIDTH, DIAGRAM_WIDTH],
        headSize: [HEAD_LOGO_OUTER, HEAD_DIAGRAM],
        head: [last ? 1 : 0, 1],
        opacity: [1, 1],
        cap: 'butt',
      });
    });

    WELLS.inner.forEach((diagram, i) => {
      paths.push({
        logo: splitInto(LOGO_ARROWS[INNER_SOURCE[i]], diagram.length),
        diagram,
        width: [LOGO_INNER_WIDTH, DIAGRAM_WIDTH],
        headSize: [HEAD_LOGO_INNER, HEAD_DIAGRAM],
        head: [1, 1],
        opacity: [INNER_VISIBLE[i] ? 1 : 0, 1],
        cap: 'butt',
      });
    });
    return paths;
  }

  const flat = (segs) => segs.flatMap((s, i) => (i === 0 ? s : s.slice(1))).flat();

  function toD(nums) {
    let d = `M${nums[0].toFixed(1)} ${nums[1].toFixed(1)}`;
    for (let i = 2; i < nums.length; i += 6) {
      d += `C${nums.slice(i, i + 6).map((n) => n.toFixed(1)).join(' ')}`;
    }
    return d;
  }

  // ---- Drawing -------------------------------------------------------------

  function el(name, attrs, parent) {
    const node = document.createElementNS(SVG_NS, name);
    for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
    if (parent) parent.appendChild(node);
    return node;
  }

  let uid = 0;

  function build(state) {
    const svg = state.svg;
    const id = `xp-gradient-${uid++}`;
    const defs = el('defs', {}, null);
    svg.insertBefore(defs, svg.firstChild);
    // Fixed in space, like the logo: purple top right, red bottom left.
    const grad = el('linearGradient', {
      id, gradientUnits: 'userSpaceOnUse', x1: '820', y1: '60', x2: '200', y2: '660',
    }, defs);
    el('stop', { offset: '0', 'stop-color': '#833fff' }, grad);
    el('stop', { offset: '1', 'stop-color': '#bf0000' }, grad);

    const group = el('g', { class: 'xp-arcs' }, null);
    svg.insertBefore(group, defs.nextSibling);

    state.paths = buildPaths().map((p) => ({
      ...p,
      from: flat(p.logo),
      to: flat(p.diagram),
      line: el('path', {
        fill: 'none', stroke: `url(#${id})`,
        'stroke-linecap': p.cap, 'stroke-linejoin': 'round',
      }, group),
      arrow: el('path', { fill: `url(#${id})` }, group),
    }));

    const place = (text, [x, y]) => { text.setAttribute('x', x); text.setAttribute('y', y); };
    const names = [...svg.querySelectorAll('.xp-name'), svg.querySelector('.xp-code')];
    names.forEach((t, i) => place(t, WELLS.names[i]));
    // Nudged left: Source Sans runs wider than the original's Times.
    svg.querySelectorAll('.xp-time').forEach((t, i) => place(t, add(WELLS.times[i], [-14, 0])));
    // Fade in from the innermost loop outwards: seconds first, months last.
    const groups = svg.querySelectorAll('.xp-node');
    groups.forEach((g, i) => { g.style.transitionDelay = `${(groups.length - 1 - i) * 160}ms`; });
  }

  function render(state, t) {
    state.t = t;
    for (const p of state.paths) {
      const nums = p.from.map((a, i) => a + (p.to[i] - a) * t);
      const w = p.width[0] + (p.width[1] - p.width[0]) * t;
      const head = p.head[0] + (p.head[1] - p.head[0]) * t;
      p.line.setAttribute('d', toD(nums));
      p.line.setAttribute('stroke-width', w);

      const size = [0, 1].map((k) => p.headSize[0][k] + (p.headSize[1][k] - p.headSize[0][k]) * t);
      const len = size[0] * w * head, half = size[1] * w * head;

      // The line runs to the tip; stop it well inside the head so no corner
      // of the line shows past the head's sides.
      const total = p.line.getTotalLength();
      p.line.setAttribute('stroke-dasharray', `${Math.max(0, total - 0.6 * len)} ${total + 1}`);

      const n = nums.length;
      const tip = [nums[n - 2], nums[n - 1]];
      let back = [nums[n - 4], nums[n - 3]];
      if (Math.hypot(tip[0] - back[0], tip[1] - back[1]) < 0.01) back = [nums[n - 6], nums[n - 5]];
      const dir = unit(sub(tip, back));
      const normal = [-dir[1], dir[0]];
      const base = sub(tip, mul(dir, len));
      const a = add(base, mul(normal, half)), b = sub(base, mul(normal, half));
      p.arrow.setAttribute('d', head > 0.001
        ? `M${tip[0].toFixed(1)} ${tip[1].toFixed(1)}L${a[0].toFixed(1)} ${a[1].toFixed(1)}L${b[0].toFixed(1)} ${b[1].toFixed(1)}Z`
        : '');

      const opacity = p.opacity[0] + (p.opacity[1] - p.opacity[0]) * t;
      p.line.setAttribute('opacity', opacity);
      p.arrow.setAttribute('opacity', opacity);
    }
  }

  const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

  function animate(state, from, to) {
    cancelAnimationFrame(state.raf);
    state.svg.classList.remove('xp-done');
    render(state, from);
    const t0 = performance.now();
    const tick = (now) => {
      const k = Math.min((now - t0) / DURATION, 1);
      render(state, from + (to - from) * ease(k));
      if (k < 1) state.raf = requestAnimationFrame(tick);
      else show(state, to);
    };
    state.raf = requestAnimationFrame(tick);
  }

  function show(state, t, instant) {
    cancelAnimationFrame(state.raf);
    if (instant) state.svg.classList.add('xp-instant');
    render(state, t);
    state.svg.classList.toggle('xp-done', t === 1);
    if (instant) requestAnimationFrame(() => state.svg.classList.remove('xp-instant'));
  }

  // ---- Wiring to reveal.js ----------------------------------------------

  const targetOf = (state) => (state.svg.dataset.xpState === 'diagram' ? 1 : 0);
  let states = [];

  function ensureBuilt(state) {
    if (!state.paths) build(state);
  }

  function onSlide(e) {
    for (const s of states) {
      if (s.slide !== e.currentSlide) continue;
      ensureBuilt(s);
      const prev = states.find((o) => o.slide === e.previousSlide);
      if (prev && prev.svg.dataset.xpState !== s.svg.dataset.xpState) {
        animate(s, targetOf(prev), targetOf(s));
      } else {
        show(s, targetOf(s), true);
      }
    }
  }

  function init(Reveal) {
    states = [...document.querySelectorAll('svg.xp-morph')].map((svg) => ({
      svg, slide: svg.closest('section'), t: 0, raf: 0,
    }));
    Reveal.on('ready', (e) => onSlide({ currentSlide: e.currentSlide, previousSlide: null }));
    Reveal.on('slidechanged', onSlide);
  }

  // setT(0..1) freezes the morph on the current slide at a point between the
  // states — for checking in-between frames while rehearsing.
  function setT(t) {
    for (const s of states) if (s.paths && s.slide.classList.contains('present')) show(s, t, true);
  }

  window.XpMorph = { init, setT };
})();
