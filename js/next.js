// What's Next: colleges, auditions, careers, employers, saved list.
// Data lives in data/*.json so it can be refreshed without touching this file.
(async function () {
  const $ = s => document.querySelector(s);
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const load = async f => { try { const r = await fetch('data/' + f); return r.ok ? r.json() : null; } catch (e) { return null; } };
  const store = {
    get(k, d) { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  };

  const [colleges, auditions, careers] = await Promise.all([load('colleges.json'), load('auditions.json'), load('careers.json')]);
  const C = colleges?.items || [], A = auditions?.items || [];
  const P = careers?.paths || [], E = careers?.employers || [], B = careers?.boards || [];

  const today = new Date(); today.setHours(0, 0, 0, 0);
  const iso = s => { const d = new Date(s + 'T00:00:00'); return isNaN(d) ? null : d; };
  const daysLeft = d => Math.round((d - today) / 86400000);
  const fmt = d => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const fmtLong = d => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const leftLabel = n => n === 0 ? 'Today' : n === 1 ? 'Tomorrow' : n < 0 ? 'Passed' : n < 60 ? `${n} days` : `${Math.round(n / 7)} weeks`;
  // Turn any YYYY-MM-DD inside text into a readable date.
  const humanize = s => esc(s).replace(/(\d{4})-(\d{2})-(\d{2})/g, (m) => { const d = iso(m); return d ? fmtLong(d) : m; });

  // ---------- saved ----------
  let saved = new Set(store.get('jn-saved', []));
  const starSvg = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z" stroke-linejoin="round"/></svg>';
  const starBtn = (key, name) => `<button class="star" data-star="${esc(key)}" aria-pressed="${saved.has(key)}" aria-label="Save ${esc(name)}">${starSvg}</button>`;
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-star]'); if (!b) return;
    const k = b.dataset.star;
    saved.has(k) ? saved.delete(k) : saved.add(k);
    store.set('jn-saved', [...saved]);
    document.querySelectorAll(`[data-star="${CSS.escape(k)}"]`).forEach(x => x.setAttribute('aria-pressed', String(saved.has(k))));
    renderMine();
  });

  // ---------- cards ----------
  const GROUPS = { florida: 'Florida', 'top-bfa': 'Top BFA programs', commercial: 'Commercial and musical theatre', 'conservatory-gap': 'Conservatories and gap programs' };
  const TYPES = { scholarship: 'Scholarships', convention: 'Conventions', competition: 'Competitions', intensive: 'Summer intensives', 'gap-year': 'Gap year', 'college-audition': 'College auditions', job: 'Jobs' };
  const ETYPES = { 'theme-park': 'Theme parks', cruise: 'Cruise lines', company: 'Companies', 'second-company': 'Second companies', tour: 'Tours and Broadway', sports: 'Sports teams', agency: 'Agencies', convention: 'Conventions', other: 'Other' };
  const unverified = '<span class="tag check" title="Some details were not posted for this cycle yet">Confirm dates</span>';
  const row = (k, v) => v ? `<dt>${k}</dt><dd>${humanize(v)}</dd>` : '';

  function collegeCard(c) {
    const pre = c.prescreen === true ? (c.prescreen_deadline || 'Yes') : null;
    return `<article class="card">
      <div class="card-top"><div><h3>${esc(c.name)}</h3><p class="sub">${esc(c.program)} &middot; ${esc([c.city, c.state].filter(Boolean).join(', '))}</p></div>${starBtn('c:' + c.id, c.name)}</div>
      ${c.why_john ? `<p class="why">${esc(c.why_john)}</p>` : ''}
      <dl>${row('Prescreen', pre)}${row('Apply by', c.app_deadline)}${row('Audition', c.audition)}${row('Money', c.scholarships)}</dl>
      ${c.watch_out ? `<p class="watch"><b>Heads up:</b> ${humanize(c.watch_out)}</p>` : ''}
      <div class="foot"><a class="link" href="${esc(c.url)}" target="_blank" rel="noopener">Official page</a>
        <span>${(c.styles || []).slice(0, 3).map(s => `<span class="tag">${esc(s)}</span>`).join(' ')} ${c.verified ? '' : unverified}</span></div>
    </article>`;
  }
  function audCard(a) {
    const s = a.date_start && iso(a.date_start), e = a.date_end && iso(a.date_end), dl = a.deadline && iso(a.deadline);
    const when = s ? (e && +e !== +s ? `${fmt(s)} to ${fmtLong(e)}` : fmtLong(s)) : null;
    return `<article class="card">
      <div class="card-top"><div><h3>${esc(a.name)}</h3><p class="sub">${esc(TYPES[a.type] || a.type)}${a.where ? ' &middot; ' + esc(a.where) : ''}</p></div>${starBtn('a:' + a.id, a.name)}</div>
      ${a.why_john ? `<p class="why">${esc(a.why_john)}</p>` : ''}
      <dl>${row('Deadline', dl ? fmtLong(dl) : null)}${row('Dates', when)}${row('When', a.when)}${row('Age', a.age_rule)}${row('Cost', a.cost)}</dl>
      <div class="foot"><a class="link" href="${esc(a.url)}" target="_blank" rel="noopener">Official page</a>
        <span>${dl && daysLeft(dl) >= 0 && daysLeft(dl) <= 21 ? `<span class="left hot">${leftLabel(daysLeft(dl))}</span>` : ''} ${a.verified ? '' : unverified}</span></div>
    </article>`;
  }
  function empCard(x) {
    return `<article class="card">
      <div class="card-top"><div><h3>${esc(x.name)}</h3><p class="sub">${esc(ETYPES[x.type] || x.type)}${x.location ? ' &middot; ' + esc(x.location) : ''}</p></div>${starBtn('e:' + x.id, x.name)}</div>
      ${x.why_john ? `<p class="why">${esc(x.why_john)}</p>` : ''}
      <dl>${row('Age', x.min_age)}${row('Casting', x.auditions)}</dl>
      <div class="foot"><a class="link" href="${esc(x.url)}" target="_blank" rel="noopener">Auditions page</a><span>${x.verified ? '' : unverified}</span></div>
    </article>`;
  }

  // ---------- generic filtered list ----------
  function filtered({ data, chipsEl, labels, key, qEl, toggleEl, toggleTest, countEl, cardsEl, card, noun, sort }) {
    let group = 'all', on = false;
    const groups = ['all', ...Object.keys(labels).filter(g => data.some(d => d[key] === g))];
    chipsEl.innerHTML = groups.map(g => `<button class="chip" data-g="${g}" aria-pressed="${g === 'all'}">${g === 'all' ? 'All' : esc(labels[g])} <span class="n">${g === 'all' ? data.length : data.filter(d => d[key] === g).length}</span></button>`).join('');
    chipsEl.addEventListener('click', e => { const b = e.target.closest('[data-g]'); if (!b) return; group = b.dataset.g; chipsEl.querySelectorAll('.chip').forEach(c => c.setAttribute('aria-pressed', String(c === b))); draw(); });
    qEl.addEventListener('input', draw);
    if (toggleEl) toggleEl.addEventListener('click', () => { on = !on; toggleEl.setAttribute('aria-pressed', String(on)); draw(); });
    function draw() {
      const q = qEl.value.trim().toLowerCase();
      let list = data.filter(d => (group === 'all' || d[key] === group) && (!q || JSON.stringify(d).toLowerCase().includes(q)));
      if (toggleTest) list = list.filter(d => toggleTest(d, on));
      if (sort) list = list.slice().sort(sort);
      countEl.textContent = list.length ? `${list.length} ${list.length === 1 ? noun[0] : noun[1]}` : `No ${noun[1]} match that.`;
      cardsEl.innerHTML = list.map(card).join('');
    }
    draw();
  }

  // Colleges: Florida first, then by soonest real deadline.
  const firstDate = s => { const m = String(s || '').match(/\d{4}-\d{2}-\d{2}/g) || []; const f = m.map(iso).filter(d => d && d >= today).sort((a, b) => a - b); return f[0] || null; };
  const gOrder = ['florida', 'top-bfa', 'commercial', 'conservatory-gap'];
  filtered({
    data: C, chipsEl: $('#college-groups'), labels: GROUPS, key: 'group', qEl: $('#college-q'),
    toggleEl: $('#college-prescreen'), toggleTest: (c, on) => !on || c.prescreen === true,
    countEl: $('#college-count'), cardsEl: $('#college-cards'), card: collegeCard, noun: ['program', 'programs'],
    sort: (a, b) => (gOrder.indexOf(a.group) - gOrder.indexOf(b.group)) || ((firstDate(a.prescreen_deadline + ' ' + a.app_deadline) || 9e15) - (firstDate(b.prescreen_deadline + ' ' + b.app_deadline) || 9e15))
  });

  // Auditions: soonest first; passed ones hidden unless asked.
  const audDate = a => iso(a.deadline || '') || iso(a.date_start || '') || null;
  const isPast = a => { const ends = iso(a.date_end || '') || iso(a.date_start || '') || iso(a.deadline || ''); return ends && ends < today && !(a.deadline && iso(a.deadline) >= today); };
  filtered({
    data: A, chipsEl: $('#aud-types'), labels: TYPES, key: 'type', qEl: $('#aud-q'),
    toggleEl: $('#aud-past'), toggleTest: (a, on) => on || !isPast(a),
    countEl: $('#aud-count'), cardsEl: $('#aud-cards'), card: audCard, noun: ['opportunity', 'opportunities'],
    sort: (a, b) => ((audDate(a) || 9e15) - (audDate(b) || 9e15))
  });

  // Employers
  const open17 = x => { const t = String(x.min_age || '').toLowerCase(); const n = parseInt((t.match(/\d+/) || [])[0], 10); return !t || isNaN(n) ? null : n <= 17; };
  filtered({
    data: E, chipsEl: $('#emp-types'), labels: ETYPES, key: 'type', qEl: $('#emp-q'),
    toggleEl: $('#emp-17'), toggleTest: (x, on) => !on || open17(x) === true,
    countEl: $('#emp-count'), cardsEl: $('#emp-cards'), card: empCard, noun: ['place', 'places']
  });
  $('#boards').innerHTML = B.map(b => `<li><strong><a href="${esc(b.url)}" target="_blank" rel="noopener">${esc(b.name)}</a></strong><span>${esc(b.what)}</span></li>`).join('');

  // Career paths
  $('#paths').innerHTML = P.length ? P.map(p => `<details class="path"><summary>${esc(p.title)}</summary><div class="body">
      <p>${esc(p.what)}</p>
      ${p.how_in ? `<p><b>How people get in:</b> ${esc(p.how_in)}</p>` : ''}
      ${p.training ? `<p><b>Training:</b> ${esc(p.training)}</p>` : ''}
      ${p.pay ? `<p><b>Pay:</b> ${esc(p.pay)}${p.pay_source ? ` <a class="link" href="${esc(p.pay_source)}" target="_blank" rel="noopener">source</a>` : ''}</p>` : ''}
      ${(p.links || []).length ? `<p>${p.links.map(l => `<a class="link" href="${esc(l.url)}" target="_blank" rel="noopener">${esc(l.label)}</a>`).join(' &middot; ')}</p>` : ''}
    </div></details>`).join('') : '<p class="muted">Career paths are still being researched.</p>';

  // ---------- Coming up ----------
  const events = [];
  const segDates = (text, fallback) => String(text || '').split(/;|\.\s/).forEach(seg => {
    (seg.match(/\d{4}-\d{2}-\d{2}/g) || []).forEach(m => {
      const d = iso(m); if (!d) return;
      let label = seg.replace(/\(.*?\)/g, '').replace(/\d{4}-\d{2}-\d{2}/g, '').replace(/\b(or|and|for the|on|by|due)\s*$/i, '').replace(/[,:]\s*$/, '').trim();
      if (label.length < 4 || label.length > 70) label = fallback;
      events.push({ d, label });
    });
  });
  C.forEach(c => {
    const start = events.length;
    segDates(c.prescreen_deadline, 'Prescreen video due');
    segDates(c.app_deadline, 'Application deadline');
    for (let i = start; i < events.length; i++) Object.assign(events[i], { name: c.name, key: 'c:' + c.id, tab: 'colleges' });
  });
  A.forEach(a => {
    if (a.deadline && iso(a.deadline)) events.push({ d: iso(a.deadline), label: ['Deadline', a.where].filter(Boolean).join(' · '), name: a.name, key: 'a:' + a.id, tab: 'auditions' });
    else if (a.date_start && iso(a.date_start)) events.push({ d: iso(a.date_start), label: [TYPES[a.type] ? TYPES[a.type].replace(/s$/, '') : 'Event', a.where].filter(Boolean).join(' · '), name: a.name, key: 'a:' + a.id, tab: 'auditions' });
  });
  const seen = new Set();
  const upcoming = events.filter(e => e.d >= today).sort((a, b) => a.d - b.d).filter(e => { const k = e.name + +e.d; if (seen.has(k)) return false; seen.add(k); return true; });
  let showAll = false;
  function drawSoon() {
    const list = showAll ? upcoming : upcoming.slice(0, 10);
    $('#soon').innerHTML = list.length ? list.map(e => {
      const n = daysLeft(e.d);
      return `<li><div class="d">${fmt(e.d)}<small>${e.d.toLocaleDateString('en-US', { weekday: 'short' })}</small></div>
        <div class="w"><b>${esc(e.name)}</b><span>${esc(e.label)}</span></div>
        <span class="left${n <= 7 ? ' hot' : ''}">${leftLabel(n)}</span></li>`;
    }).join('') : '<li class="muted">No dated deadlines loaded yet.</li>';
    $('#soon-more').textContent = showAll ? 'Show the next ten' : `Show every date (${upcoming.length})`;
    $('#soon-more').hidden = upcoming.length <= 10;
  }
  $('#soon-more').addEventListener('click', () => { showAll = !showAll; drawSoon(); });
  drawSoon();

  // ---------- Senior kit ----------
  const KIT = [
    ['solo', 'A studio solo video', '1 to 2 minutes, filmed in a studio in class clothes. FSU will not take competition footage, and most prescreens want the same thing.'],
    ['ballet', 'Two ballet photos', 'First arabesque and tendu a la seconde. Ailey and Pace both ask for them.'],
    ['resume', 'A one-page dance resume', 'Training, competition titles, choreography and teaching. Ask Dixon to check it.'],
    ['headshot', 'A headshot', 'Clean, current, smiling. Most college and job portals ask for one.'],
    ['recs', 'Two recommendation letters', 'One from your dance teacher, one from an academic teacher. Ask at least a month ahead.'],
    ['acceptd', 'An Acceptd account', 'Many schools take dance applications and videos through it.'],
    ['counselor', 'A meeting with your school counselor', 'Transcripts, test scores (OCU, for one, wants an ACT 21, SAT 1060 or a 3.33 GPA) and graduation timing.'],
    ['fafsa', 'FAFSA', 'Free at studentaid.gov. Almost every school on this page uses it for aid. A few private schools also want the CSS Profile.'],
    ['bf', 'Florida Bright Futures', 'Covers tuition at Florida public schools like FSU, UF, USF and Valencia. Ask your counselor about the Florida Financial Aid Application.']
  ];
  let done = new Set(store.get('jn-kit', []));
  $('#kit').innerHTML = KIT.map(([id, t, s]) => `<li><label><input type="checkbox" data-kit="${id}" ${done.has(id) ? 'checked' : ''}><div><b>${esc(t)}</b><span>${esc(s)}</span></div></label></li>`).join('');
  $('#kit').addEventListener('change', e => { const id = e.target.dataset.kit; e.target.checked ? done.add(id) : done.delete(id); store.set('jn-kit', [...done]); });

  // ---------- My list ----------
  function renderMine() {
    const cards = [];
    C.forEach(c => saved.has('c:' + c.id) && cards.push(collegeCard(c)));
    A.forEach(a => saved.has('a:' + a.id) && cards.push(audCard(a)));
    E.forEach(x => saved.has('e:' + x.id) && cards.push(empCard(x)));
    $('#mine-cards').innerHTML = cards.join('');
    $('#mine-empty').hidden = cards.length > 0;
    $('#mine-n').textContent = cards.length ? `(${cards.length})` : '';
  }
  renderMine();

  // ---------- Tabs ----------
  const tabs = [...document.querySelectorAll('.tab')];
  function show(id) {
    tabs.forEach(t => t.setAttribute('aria-selected', String(t.dataset.tab === id)));
    document.querySelectorAll('[data-panel]').forEach(p => { p.hidden = p.dataset.panel !== id; });
    if (location.hash.slice(1) !== id) history.replaceState(null, '', '#' + id);
  }
  tabs.forEach(t => t.addEventListener('click', () => { show(t.dataset.tab); window.scrollTo({ top: 0 }); }));
  const initial = location.hash.slice(1);
  show(tabs.some(t => t.dataset.tab === initial) ? initial : 'start');
})();
