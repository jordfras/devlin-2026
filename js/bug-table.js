/*
 * "Same bug, different loop": a table of bug classes against languages, each
 * cell naming the first loop that catches that bug in that language.
 *
 *   <div class="bug-table" data-upto="compiler"></div>
 *
 * data-upto  show only cells caught in this loop or a faster one; later cells
 *            stay empty, so the table fills in as the talk moves outwards.
 *
 * A cell is a loop name, or a list of loops that each contribute (shown
 * joined with " + " once reached), e.g. ['tests', 'sanitizer']. A list means
 * different variants of the bug are caught in different loops: each entry is
 * the first loop for one variant, never every loop that could catch it.
 * A loop name may carry a qualifier after a colon, shown in brackets:
 * 'compiler:varning' reads "kompilatorn (varning)".
 *
 * data-extra="go" adds the Go column, shown only on the slide answering
 * "why not Go?"; the talk's own comparison stays at four languages.
 *
 * The data lives here, once. It is a draft — see notes/feedback-loops.md —
 * and every cell needs checking before it is final.
 */
(function () {
  'use strict';

  // Fastest first. 'na' = the bug cannot happen in that language.
  const LOOPS = ['token', 'compiler', 'tests', 'sanitizer', 'review', 'release'];
  const LABELS = {
    compiler: 'kompilatorn',
    tests: 'tester',
    sanitizer: 'sanitizer',
    review: 'granskning',
    release: 'QA',
    na: 'går inte',
  };

  const LANGUAGES = ['Rust', 'C++', 'Java', 'Python'];

  // Go, per row in the same order as ROWS. Checked against Go's own docs
  // (2026-10-04): nil dereference panics at run time; a call's results may be
  // discarded, so an ignored err compiles and go vet does not flag it; the
  // race detector ships with the toolchain but only finds races that happen.
  const EXTRA = {
    go: ['Go', ['compiler', 'tests', ['review', 'release'], 'na', 'sanitizer', 'tests']],
  };

  const ROWS = [
    ['Typfel', ['compiler', 'compiler', 'compiler', 'tests']],
    ['Null', ['compiler', ['tests', 'sanitizer'], 'tests', 'tests']],
    // "Ohanterat fel" (renamed back from "Ignorerat fel" 2026-11-21: the
    // dress rehearsal audience did not connect "ignored" with exceptions and
    // returned results). A forgotten error, not a deliberately silenced one (`let _ =`,
    // `catch {}`, `except: pass` — those are escape hatches, see the review
    // loop). Rust: #[must_use] warns. C++ has both mechanisms, like Java: an
    // unhandled exception crashes (tests; no checked exceptions, so the
    // compiler never helps), an ignored error code compiles silently (review
    // + QA; [[nodiscard]] warns only where an API is marked). Go: an ignored
    // err compiles silently. Java: checked exceptions are enforced, others
    // propagate. Python: the exception propagates and crashes.
    ['Ohanterat fel', ['compiler:varning', ['tests', 'review', 'release'], ['compiler', 'tests'], 'tests']],
    ['Use-after-free', ['compiler', 'sanitizer', 'na', 'na']],
    ['Data race', ['compiler', 'sanitizer', ['review', 'release'], ['review', 'release']]],
    ['Logikfel', ['tests', 'tests', 'tests', 'tests']],
  ];

  // Fills one cell for the loops reached so far. Returns whether the current
  // loop is among them, i.e. whether the cell is this loop's news.
  function fill(td, cell, upto) {
    if (cell === 'na') {
      td.classList.add('bt-na');
      td.textContent = LABELS.na;
      return false;
    }
    // 'compiler:varning' -> loop 'compiler', shown as "kompilatorn (varning)".
    const parts = [].concat(cell).map((entry) => {
      const [loop, note] = entry.split(':');
      return { loop, text: note ? `${LABELS[loop]} (${note})` : LABELS[loop] };
    });
    const reached = parts.filter((p) => LOOPS.indexOf(p.loop) <= upto);
    if (reached.length === 0) return false;
    const current = reached.some((p) => LOOPS.indexOf(p.loop) === upto);
    td.classList.add(`bt-${reached[0].loop}`);
    if (current) td.classList.add('bt-current');
    td.textContent = reached.map((p) => p.text).join(' + ');
    return current;
  }

  function draw(host) {
    const upto = LOOPS.indexOf(host.dataset.upto || 'compiler');
    const extra = EXTRA[host.dataset.extra];
    const languages = extra ? [...LANGUAGES, extra[0]] : LANGUAGES;
    const rows = ROWS.map(([bug, cells], i) => [bug, extra ? [...cells, extra[1][i]] : cells]);
    const table = document.createElement('table');
    const head = table.createTHead().insertRow();
    head.appendChild(document.createElement('th'));
    for (const lang of languages) {
      const th = document.createElement('th');
      th.textContent = lang;
      head.appendChild(th);
    }
    const body = table.createTBody();
    const stamps = [];
    for (const [bug, cells] of rows) {
      const tr = body.insertRow();
      const th = document.createElement('th');
      th.textContent = bug;
      tr.appendChild(th);
      cells.forEach((cell, ci) => {
        const td = tr.insertCell();
        // On the extra-column slide the news is the extra language, not the
        // loop: no cell is highlighted, and the extra column stamps in.
        const current = fill(td, cell, upto);
        if (extra) td.classList.remove('bt-current');
        const news = extra ? ci === languages.length - 1 : current;
        if (news && td.textContent) {
          td.classList.add('bt-stamp');
          td.dataset.text = td.textContent; // drawn again by the stamp, see CSS
          stamps.push([ci, td]);
        }
      });
    }
    // New cells stamp in on arrival, a column (language) at a time, top to
    // bottom. The order is all CSS needs.
    stamps.sort((a, b) => a[0] - b[0])
      .forEach(([, td], i) => td.style.setProperty('--stamp-i', i));
    host.replaceChildren(table);
    if (extra) ringExtraColumn(host, table);
  }

  // One outline around the whole extra column, header included. Cell borders
  // would break at the table's border-spacing, so draw a single box over it.
  // Measured with offset* (unaffected by reveal's scaling) once the slide is
  // laid out; a ResizeObserver covers the slide becoming visible.
  function ringExtraColumn(host, table) {
    host.style.position = 'relative';
    const ring = document.createElement('div');
    ring.className = 'bt-extra-ring';
    host.appendChild(ring);
    const place = () => {
      const cells = [...table.querySelectorAll('tr')].map((tr) => tr.lastElementChild);
      const first = cells[0];
      const last = cells[cells.length - 1];
      if (!first || first.offsetWidth === 0) return;
      const pad = 4; // within the wide table's 5px border-spacing
      const top = table.offsetTop + first.offsetTop;
      const bottom = table.offsetTop + last.offsetTop + last.offsetHeight;
      ring.style.left = `${table.offsetLeft + first.offsetLeft - pad}px`;
      ring.style.top = `${top - pad}px`;
      ring.style.width = `${first.offsetWidth + 2 * pad}px`;
      ring.style.height = `${bottom - top + 2 * pad}px`;
    };
    new ResizeObserver(place).observe(table);
    place();
  }

  function init() {
    document.querySelectorAll('.bug-table').forEach(draw);
  }

  window.BugTable = { init };
})();
