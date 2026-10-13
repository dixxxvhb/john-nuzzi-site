// What's Next: plan, colleges, auditions, money, prep, careers, employers, and John's tracker.
// Data lives in data/*.json so it can be refreshed without touching this file.
(async function () {
  const $ = s => document.querySelector(s);
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const load = async f => { try { const r = await fetch('data/' + f, { cache: 'no-cache' }); return r.ok ? r.json() : null; } catch (e) { return null; } };

  await window.PlanStore.init();
  const S = window.PlanStore;
  const isSaved = k => !!S.data.saved[k];
  const savedKeys = () => Object.keys(S.data.saved);
  const trackOf = k => S.data.track[k] || {};

  const [colleges, auditions, careers, costs, money, prep, callsCruise, callsStage] = await Promise.all(
    ['colleges', 'auditions', 'careers', 'costs', 'money', 'prep', 'calls-cruise', 'calls-stage'].map(n => load(n + '.json')));
  const O = [...(callsCruise?.items || []), ...(callsStage?.items || [])];
  const C = colleges?.items || [], A = auditions?.items || [];
  const P = careers?.paths || [], E = careers?.employers || [], B = careers?.boards || [];
  const COST = costs?.items || {}, M = money?.items || [], PREP = prep?.items || {};

  const today = new Date(); today.setHours(0, 0, 0, 0);
  const iso = s => { if (!s || !/^\d{4}-\d{2}-\d{2}/.test(s)) return null; const d = new Date(s.slice(0, 10) + 'T00:00:00'); return isNaN(d) ? null : d; };
  const daysLeft = d => Math.round((d - today) / 86400000);
  const fmt = d => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const fmtLong = d => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const leftLabel = n => n === 0 ? 'Today' : n === 1 ? 'Tomorrow' : n < 0 ? 'Passed' : n < 60 ? `${n} days` : `${Math.round(n / 7)} weeks`;
  const money$ = n => n == null ? null : '$' + Math.round(n).toLocaleString('en-US');
  // Turn any YYYY-MM-DD inside text into a readable date.
  const humanize = s => esc(s).replace(/(\d{4})-(\d{2})-(\d{2})/g, m => { const d = iso(m); return d ? fmtLong(d) : m; });

  // ---------- saved + tracker ----------
  const STATUSES = ['Interested', 'Applying', 'Submitted', 'Audition booked', 'Auditioned', 'Got an offer', 'Not for me'];
  const starSvg = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z" stroke-linejoin="round"/></svg>';
  const starBtn = (key, name) => `<button class="star" data-star="${esc(key)}" aria-pressed="${isSaved(key)}" aria-label="Save ${esc(name)}">${starSvg}</button>`;
  function setSaved(k, on) {
    S.set(['saved', k], on ? true : null);
    renderPersonal();
  }
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-star]'); if (!b) return;
    setSaved(b.dataset.star, !isSaved(b.dataset.star));
  });

  // ---------- labels ----------
  const GROUPS = { florida: 'Florida', 'top-bfa': 'Top BFA programs', commercial: 'Commercial and musical theatre', 'conservatory-gap': 'Conservatories and gap programs' };
  const TYPES = { scholarship: 'Scholarships', convention: 'Conventions', competition: 'Competitions', intensive: 'Summer intensives', 'gap-year': 'Gap year', 'college-audition': 'College auditions', job: 'Jobs' };
  const ETYPES = { 'theme-park': 'Theme parks', cruise: 'Cruise lines', company: 'Companies', 'second-company': 'Second companies', tour: 'Tours and Broadway', sports: 'Sports teams', agency: 'Agencies', convention: 'Conventions', other: 'Other' };
  const OTYPES = { cruise: 'Cruise lines', 'theme-park': 'Theme parks', broadway: 'Broadway', tour: 'Touring shows', company: 'Dance companies', theatre: 'Theatres', 'tv-film': 'TV and film', other: 'Other' };
  const OK = { 'yes-now': ['You can go now', 'hot'], 'at-18': ['Opens when you turn 18', ''], check: ['Age not stated, ask', ''], no: ['Not open to you', ''] };
  const MTYPES = { dance: 'Dance', arts: 'Arts', general: 'General', need: 'Need-based', local: 'Central Florida' };
  const singular = s => s.replace(/ies$/, 'y').replace(/s$/, '');
  const unverified = '<span class="tag check" title="Some details were not posted for this cycle yet">Confirm dates</span>';
  const row = (k, v) => v ? `<dt>${k}</dt><dd>${humanize(v)}</dd>` : '';

  // ---------- cards ----------
  // The Scorecard after-aid average mostly reflects in-state families, so it misleads for
  // public schools outside Florida, where John pays out-of-state tuition. Hide it there.
  const outOfStatePublic = c => c && c.tuition_in_state != null && c.tuition_out_of_state != null && c.tuition_in_state !== c.tuition_out_of_state && c.john_tuition === c.tuition_out_of_state;
  const fairNet = c => c && !outOfStatePublic(c) ? c.net_price : null;
  function costLine(id) {
    const c = COST[id]; if (!c) return '';
    const t = money$(c.john_tuition), n = money$(fairNet(c));
    if (!t && !n) return '';
    return `<p class="cost">${t ? `<span><b>${t}</b> tuition a year for you${c.cost_year ? ` (${esc(c.cost_year)})` : ''}</span>` : ''}${n ? `<span><b>${n}</b> average real cost after aid${c.scorecard_url ? ` <a class="link" href="${esc(c.scorecard_url)}" target="_blank" rel="noopener">source</a>` : ''}</span>` : ''}</p>`;
  }
  function collegeCard(c) {
    const pre = c.prescreen === true ? (c.prescreen_deadline || 'Yes') : null;
    return `<article class="card">
      <div class="card-top"><div><h3>${esc(c.name)}</h3><p class="sub">${esc(c.program)} &middot; ${esc([c.city, c.state].filter(Boolean).join(', '))}</p></div>${starBtn('c:' + c.id, c.name)}</div>
      ${c.why_john ? `<p class="why">${esc(c.why_john)}</p>` : ''}
      ${costLine(c.id)}
      <dl>${row('Prescreen', pre)}${row('Apply by', c.app_deadline)}${row('Audition', c.audition)}${row('Money', c.scholarships)}</dl>
      ${c.watch_out ? `<p class="watch"><b>Heads up:</b> ${humanize(c.watch_out)}</p>` : ''}
      <div class="foot"><a class="link" href="${esc(c.url)}" target="_blank" rel="noopener">Official page</a>
        <span>${(c.styles || []).slice(0, 3).map(s => `<span class="tag">${esc(s)}</span>`).join(' ')} ${c.verified ? '' : unverified}</span></div>
    </article>`;
  }
  function soonPill(dl) { return dl && daysLeft(dl) >= 0 && daysLeft(dl) <= 21 ? `<span class="left hot">${leftLabel(daysLeft(dl))}</span>` : ''; }
  function audCard(a) {
    const s = iso(a.date_start), e = iso(a.date_end), dl = iso(a.deadline);
    const when = s ? (e && +e !== +s ? `${fmt(s)} to ${fmtLong(e)}` : fmtLong(s)) : null;
    return `<article class="card">
      <div class="card-top"><div><h3>${esc(a.name)}</h3><p class="sub">${esc(TYPES[a.type] ? singular(TYPES[a.type]) : a.type)}${a.where ? ' &middot; ' + esc(a.where) : ''}</p></div>${starBtn('a:' + a.id, a.name)}</div>
      ${a.why_john ? `<p class="why">${esc(a.why_john)}</p>` : ''}
      <dl>${row('Deadline', dl ? fmtLong(dl) : null)}${row('Dates', when)}${row('When', a.when)}${row('Age', a.age_rule)}${row('Cost', a.cost)}</dl>
      <div class="foot"><a class="link" href="${esc(a.url)}" target="_blank" rel="noopener">Official page</a><span>${soonPill(dl)} ${a.verified ? '' : unverified}</span></div>
    </article>`;
  }
  function moneyCard(m) {
    const dl = iso(m.deadline);
    return `<article class="card">
      <div class="card-top"><div><h3>${esc(m.name)}</h3><p class="sub">${esc([m.org, MTYPES[m.type]].filter(Boolean).join(' · '))}</p></div>${starBtn('m:' + m.id, m.name)}</div>
      ${m.why_john ? `<p class="why">${esc(m.why_john)}</p>` : ''}
      <dl>${row('Amount', m.amount)}${row('Deadline', dl ? fmtLong(dl) : null)}${row('When', m.when)}${row('Who', m.eligibility)}</dl>
      <div class="foot"><a class="link" href="${esc(m.url)}" target="_blank" rel="noopener">Official page</a><span>${dl && dl < today ? '<span class="left">Closed this year</span>' : soonPill(dl)} ${m.verified ? '' : unverified}</span></div>
    </article>`;
  }
  function callCard(o) {
    const s = iso(o.date_start), e = iso(o.date_end), dl = iso(o.deadline);
    const when = s ? (e && +e !== +s ? `${fmt(s)} to ${fmtLong(e)}` : fmtLong(s)) : (o.rolling ? 'Rolling, submit any time' : null);
    const ok = o.john_ok === 'check' && o.age_rule ? ['Check the age rule', ''] : OK[o.john_ok];
    return `<article class="card">
      <div class="card-top"><div><h3>${esc(o.title)}</h3><p class="sub">${esc([o.org, o.where].filter(Boolean).join(' · '))}</p></div>${starBtn('o:' + o.id, o.title)}</div>
      ${ok ? `<p><span class="left ${ok[1]}">${ok[0]}</span></p>` : ''}
      <dl>${row('When', when)}${row('Deadline', dl ? fmtLong(dl) : null)}${row('Format', o.format)}${row('Union', o.union)}${row('Age', o.age_rule)}${row('Bring', o.bring)}</dl>
      ${o.notes ? `<p class="watch">${humanize(o.notes)}</p>` : ''}
      <div class="foot"><a class="link" href="${esc(o.url)}" target="_blank" rel="noopener">See the call</a><span>${soonPill(dl || s)} ${o.verified ? '' : unverified}</span></div>
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

  // One index of everything that can be saved.
  const ALL = new Map();
  C.forEach(c => ALL.set('c:' + c.id, { name: c.name, card: () => collegeCard(c) }));
  A.forEach(a => ALL.set('a:' + a.id, { name: a.name, card: () => audCard(a) }));
  M.forEach(m => ALL.set('m:' + m.id, { name: m.name, card: () => moneyCard(m) }));
  O.forEach(o => ALL.set('o:' + o.id, { name: o.title, card: () => callCard(o) }));
  E.forEach(x => ALL.set('e:' + x.id, { name: x.name, card: () => empCard(x) }));

  // ---------- generic filtered list ----------
  function filtered({ data, chipsEl, labels, key, qEl, toggleEl, toggleTest, countEl, cardsEl, card, noun, sorts, sortEl }) {
    let group = 'all', on = false, sortBy = sorts ? Object.keys(sorts)[0] : null;
    const groups = ['all', ...Object.keys(labels).filter(g => data.some(d => d[key] === g))];
    chipsEl.innerHTML = groups.map(g => `<button class="chip" data-g="${g}" aria-pressed="${g === 'all'}">${g === 'all' ? 'All' : esc(labels[g])} <span class="n">${g === 'all' ? data.length : data.filter(d => d[key] === g).length}</span></button>`).join('');
    chipsEl.addEventListener('click', e => { const b = e.target.closest('[data-g]'); if (!b) return; group = b.dataset.g; chipsEl.querySelectorAll('.chip').forEach(c => c.setAttribute('aria-pressed', String(c === b))); draw(); });
    qEl.addEventListener('input', draw);
    if (toggleEl) toggleEl.addEventListener('click', () => { on = !on; toggleEl.setAttribute('aria-pressed', String(on)); draw(); });
    if (sortEl && sorts) {
      sortEl.innerHTML = Object.keys(sorts).map(k => `<option value="${k}">${esc(sorts[k].label)}</option>`).join('');
      sortEl.hidden = Object.keys(sorts).length < 2;
      sortEl.addEventListener('change', () => { sortBy = sortEl.value; draw(); });
    }
    function draw() {
      const q = qEl.value.trim().toLowerCase();
      let list = data.filter(d => (group === 'all' || d[key] === group) && (!q || JSON.stringify(d).toLowerCase().includes(q)));
      if (toggleTest) list = list.filter(d => toggleTest(d, on));
      if (sortBy) list = list.slice().sort(sorts[sortBy].fn);
      countEl.textContent = list.length ? `${list.length} ${list.length === 1 ? noun[0] : noun[1]}` : `No ${noun[1]} match that.`;
      cardsEl.innerHTML = list.map(card).join('');
    }
    draw();
  }

  // Colleges
  const firstDate = s => { const m = String(s || '').match(/\d{4}-\d{2}-\d{2}/g) || []; const f = m.map(iso).filter(d => d && d >= today).sort((a, b) => a - b); return f[0] || null; };
  const gOrder = ['florida', 'top-bfa', 'commercial', 'conservatory-gap'];
  const nextDl = c => firstDate((c.prescreen_deadline || '') + ' ' + (c.app_deadline || '')) || 9e15;
  const tuition = c => COST[c.id]?.john_tuition ?? 9e15;
  const netp = c => fairNet(COST[c.id]) ?? 9e15;
  const collegeSorts = { home: { label: 'Florida first', fn: (a, b) => (gOrder.indexOf(a.group) - gOrder.indexOf(b.group)) || (nextDl(a) - nextDl(b)) }, soon: { label: 'Soonest deadline', fn: (a, b) => nextDl(a) - nextDl(b) } };
  if (Object.keys(COST).length) {
    collegeSorts.tuition = { label: 'Lowest tuition for you', fn: (a, b) => tuition(a) - tuition(b) };
    collegeSorts.net = { label: 'Lowest cost after aid', fn: (a, b) => netp(a) - netp(b) };
  }
  filtered({
    data: C, chipsEl: $('#college-groups'), labels: GROUPS, key: 'group', qEl: $('#college-q'),
    toggleEl: $('#college-prescreen'), toggleTest: (c, on) => !on || c.prescreen === true,
    countEl: $('#college-count'), cardsEl: $('#college-cards'), card: collegeCard, noun: ['program', 'programs'],
    sorts: collegeSorts, sortEl: $('#college-sort')
  });

  // Auditions: soonest first; passed ones hidden unless asked.
  const audDate = a => iso(a.deadline) || iso(a.date_start) || null;
  const isPast = a => { const ends = iso(a.date_end) || iso(a.date_start) || iso(a.deadline); return ends && ends < today && !(iso(a.deadline) >= today); };
  filtered({
    data: A, chipsEl: $('#aud-types'), labels: TYPES, key: 'type', qEl: $('#aud-q'),
    toggleEl: $('#aud-past'), toggleTest: (a, on) => on || !isPast(a),
    countEl: $('#aud-count'), cardsEl: $('#aud-cards'), card: audCard, noun: ['opportunity', 'opportunities'],
    sorts: { soon: { label: 'Soonest first', fn: (a, b) => ((audDate(a) || 9e15) - (audDate(b) || 9e15)) } }
  });

  // Money
  if (costs?.bright_futures?.summary) {
    $('#bf').innerHTML = `<b>Florida Bright Futures.</b> ${esc(costs.bright_futures.summary)} ${costs.bright_futures.url ? `<a class="link" href="${esc(costs.bright_futures.url)}" target="_blank" rel="noopener">Official page</a>` : ''}`;
    $('#bf').hidden = false;
  }
  // Open deadlines first (soonest), then rolling or undated, then ones already closed this year.
  const mKey = m => { const d = iso(m.deadline); return !d ? 8e15 : d < today ? 9e15 + +d : +d; };
  if (M.length) {
    filtered({
      data: M, chipsEl: $('#money-types'), labels: MTYPES, key: 'type', qEl: $('#money-q'),
      countEl: $('#money-count'), cardsEl: $('#money-cards'), card: moneyCard, noun: ['scholarship', 'scholarships'],
      sorts: { soon: { label: 'Soonest deadline', fn: (a, b) => mKey(a) - mKey(b) } }
    });
  } else { $('#money-count').textContent = 'More scholarships are being researched. The college talent awards are on each college card.'; }
  // Cost table
  const priced = C.filter(c => COST[c.id] && (COST[c.id].john_tuition != null || COST[c.id].net_price != null));
  if (priced.length) {
    const rows = priced.slice().sort((a, b) => tuition(a) - tuition(b));
    $('#cost-table').innerHTML = `<div class="ct-head"><span>School</span><span>Tuition for you</span><span>Avg cost after aid</span></div>` +
      rows.map(c => { const k = COST[c.id]; return `<div class="ct-row"><span><b>${esc(c.name)}</b><small>${esc(GROUPS[c.group])}${k.room_board ? ` · ${money$(k.room_board)} housing and food` : ''}</small></span><span>${money$(k.john_tuition) || '<i>not posted</i>'}</span><span>${outOfStatePublic(k) ? '<i>out-of-state, ask</i>' : (money$(k.net_price) || '<i>not posted</i>')}</span></div>`; }).join('');
    $('#cost-wrap').hidden = false;
  }

  // Open calls: dated ones first by date, rolling portals after.
  const callDate = o => iso(o.date_start) || iso(o.deadline);
  const callPast = o => { const end = iso(o.date_end) || iso(o.date_start) || iso(o.deadline); return !o.rolling && end && end < today; };
  if (O.length) {
    filtered({
      data: O, chipsEl: $('#call-types'), labels: OTYPES, key: 'category', qEl: $('#call-q'),
      toggleEl: $('#call-now'), toggleTest: (o, on) => !callPast(o) && (!on || o.john_ok === 'yes-now'),
      countEl: $('#call-count'), cardsEl: $('#call-cards'), card: callCard, noun: ['call', 'calls'],
      sorts: { soon: { label: 'Open to you first', fn: (a, b) => ((a.john_ok === 'yes-now' ? 0 : 1) - (b.john_ok === 'yes-now' ? 0 : 1)) || ((callDate(a) || 9e15) - (callDate(b) || 9e15)) } }
    });
  } else { $('#call-count').textContent = 'Live casting calls are being collected right now.'; }

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

  // ---------- every dated thing, in one list ----------
  const events = [];
  // Each date in a sentence gets the words around it as its label:
  // "ED I 2026-11-01, ED II 2027-01-01" and "supplemental due 2026-10-14 for the Oct 28 audition".
  const clean = t => {
    let x = t.replace(/\(.*?\)/g, ' ');
    for (let i = 0; i < 3; i++) x = x.replace(/^[\s,;:/]+|[\s,;:/]+$/g, '').replace(/^(and|or)(\s+|$)/i, '').replace(/\s+(or|and|for the|on|by|due)$/i, '');
    return x.replace(/\s{2,}/g, ' ').trim();
  };
  const segDates = (text, fallback, base) => String(text || '').split(/;|\.\s/).forEach(seg => {
    const re = /\d{4}-\d{2}-\d{2}/g; let m, prev = 0, stem = '', last = fallback;
    while ((m = re.exec(seg))) {
      const d = iso(m[0]); let before = clean(seg.slice(prev, m.index)); prev = m.index + m[0].length;
      const rest = seg.slice(prev); const fm = rest.match(/^\s*(for [^,]*?)(?=,|\s+and\s+\d{4}-|\s*\d{4}-|$)/i);
      let label;
      if (fm) {
        if (before) stem = before;
        label = [stem, clean(fm[1])].filter(Boolean).join(' ');
        prev += fm[0].length;
      } else label = before;
      if (!d) continue;
      if (label.length < 2 || label.length > 80) label = last;
      last = label;
      events.push(Object.assign({ d, label: label.charAt(0).toUpperCase() + label.slice(1) }, base));
    }
  });
  C.forEach(c => {
    const base = { name: c.name, key: 'c:' + c.id, kind: 'College' };
    segDates(c.prescreen_deadline, 'Prescreen video due', base);
    segDates(c.app_deadline, 'Application deadline', base);
  });
  A.forEach(a => {
    const base = { name: a.name, key: 'a:' + a.id, kind: TYPES[a.type] ? singular(TYPES[a.type]) : 'Event' };
    if (iso(a.deadline)) events.push(Object.assign({ d: iso(a.deadline), label: ['Deadline', a.where].filter(Boolean).join(' · ') }, base));
    if (iso(a.date_start)) events.push(Object.assign({ d: iso(a.date_start), label: [base.kind, a.where].filter(Boolean).join(' · ') }, base));
  });
  O.forEach(o => {
    const base = { name: o.title, key: 'o:' + o.id, kind: 'Open call' };
    if (iso(o.deadline)) events.push(Object.assign({ d: iso(o.deadline), label: ['Submission deadline', o.org].filter(Boolean).join(' · ') }, base));
    if (iso(o.date_start)) events.push(Object.assign({ d: iso(o.date_start), label: ['Open call', o.where].filter(Boolean).join(' · ') }, base));
  });
  M.forEach(m => { if (iso(m.deadline)) events.push({ d: iso(m.deadline), label: 'Scholarship deadline', name: m.name, key: 'm:' + m.id, kind: 'Scholarship' }); });
  const seen = new Set();
  const upcoming = events.filter(e => e.d >= today).sort((a, b) => a.d - b.d)
    .filter(e => { const k = e.name + +e.d; if (seen.has(k)) return false; seen.add(k); return true; });

  // Coming up (Start here)
  let showAll = false;
  const soonRow = e => {
    const n = daysLeft(e.d);
    return `<li><div class="d">${fmt(e.d)}<small>${e.d.toLocaleDateString('en-US', { weekday: 'short' })}</small></div>
      <div class="w"><b>${esc(e.name)}${isSaved(e.key) ? ' <span class="mine-dot" title="On your list">On your list</span>' : ''}</b><span>${esc(e.label)}</span></div>
      <span class="left${n <= 7 ? ' hot' : ''}">${leftLabel(n)}</span></li>`;
  };
  function drawSoon() {
    const list = showAll ? upcoming : upcoming.slice(0, 10);
    $('#soon').innerHTML = list.length ? list.map(soonRow).join('') : '<li class="muted">No dated deadlines loaded yet.</li>';
    $('#soon-more').textContent = showAll ? 'Show the next ten' : `Show every date (${upcoming.length})`;
    $('#soon-more').hidden = upcoming.length <= 10;
  }
  $('#soon-more').addEventListener('click', () => { showAll = !showAll; drawSoon(); });
  drawSoon();

  // ---------- Roadmap ----------
  const PHASES = {
    '2026-10': 'Build the kit: solo video, ballet photos, resume, headshot. The first deadlines hit this month.',
    '2026-11': 'Early Action and early prescreens. A lot of schools close their first round on November 1.',
    '2026-12': 'Prescreen season peaks. December 1 is the biggest single deadline of the year.',
    '2027-01': 'Audition season starts: regional tours and campus audition days. Summer intensive tours begin.',
    '2027-02': 'The busiest audition month. Keep your solo fresh and your body healthy.',
    '2027-03': 'Last auditions. Admission and scholarship decisions start landing.',
    '2027-04': 'Compare offers and aid letters side by side. Real cost, not sticker price.',
    '2027-05': 'Decide. Most colleges want your deposit by May 1.',
    '2027-06': 'Graduate. The Dance Awards in Orlando.',
    '2027-07': 'Summer intensives and The Dance Awards in Las Vegas.',
    '2027-08': 'Move in, or start your next program.'
  };
  let roadOnlyMine = false;
  function renderRoadmap() {
    const box = $('#road'); if (!box) return;
    const months = Object.keys(PHASES);
    const ofMonth = ym => upcoming.filter(e => `${e.d.getFullYear()}-${String(e.d.getMonth() + 1).padStart(2, '0')}` === ym && (!roadOnlyMine || isSaved(e.key)));
    box.innerHTML = months.map(ym => {
      const [y, m] = ym.split('-').map(Number);
      const label = new Date(y, m - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      const evs = ofMonth(ym);
      const current = today.getFullYear() === y && today.getMonth() === m - 1;
      return `<section class="month${current ? ' now' : ''}">
        <div class="month-head"><h3>${label}</h3>${current ? '<span class="tag">Now</span>' : ''}</div>
        <p class="phase">${esc(PHASES[ym])}</p>
        ${evs.length ? `<ul class="soon">${evs.map(soonRow).join('')}</ul>` : `<p class="muted small">${roadOnlyMine ? 'Nothing from your list this month.' : 'No dated deadlines this month yet.'}</p>`}
      </section>`;
    }).join('');
  }
  $('#road-mine').addEventListener('click', e => { roadOnlyMine = !roadOnlyMine; e.currentTarget.setAttribute('aria-pressed', String(roadOnlyMine)); renderRoadmap(); });
  renderRoadmap();

  // ---------- Get ready ----------
  if (prep) {
    $('#prep-patterns').innerHTML = (prep.patterns || []).map(p => `<li><b>${esc(p.fact)}</b></li>`).join('');
    $('#prep-film').innerHTML = (prep.film_day || []).map((t, i) => `<li><label><input type="checkbox" data-film="${i}"><div><b>${esc(t.tip)}</b><span>${(t.from || []).map(id => esc(C.find(c => c.id === id)?.name || id)).slice(0, 4).join(', ')}${(t.from || []).length > 4 ? ' and more' : ''}</span></div></label></li>`).join('');
    $('#prep-film').addEventListener('change', e => { S.set(['film', 'f' + e.target.dataset.film], e.target.checked || null); });
    $('#prep-ready').hidden = false; $('#prep-wait').hidden = true;
  }
  let prepAll = false;
  function prepCard(c) {
    const p = PREP[c.id]; if (!p) return '';
    const v = p.video || {}, s = p.solo || {};
    const list = a => (a || []).filter(Boolean).map(esc).join(', ');
    return `<article class="card">
      <div class="card-top"><div><h3>${esc(c.name)}</h3><p class="sub">${esc(c.program)}</p></div>${starBtn('c:' + c.id, c.name)}</div>
      <dl>
        ${v.needed != null ? `<dt>Video</dt><dd>${v.needed ? [v.length, list(v.contents)].filter(Boolean).join(' · ') || 'Yes' : 'No video needed'}${v.rules ? `<br><span class="muted">${esc(v.rules)}</span>` : ''}</dd>` : ''}
        ${s.length || s.style_rule || s.own_choreo_ok != null ? `<dt>Solo</dt><dd>${esc([s.length, s.style_rule, s.own_choreo_ok === true ? 'your own choreography is fine' : s.own_choreo_ok === false ? 'not your own choreography' : null].filter(Boolean).join(' · '))}</dd>` : ''}
        ${(p.photos || []).length ? `<dt>Photos</dt><dd>${list(p.photos)}</dd>` : ''}
        ${p.resume ? '<dt>Resume</dt><dd>Yes</dd>' : ''}
        ${p.essay ? `<dt>Essay</dt><dd>${esc(p.essay)}</dd>` : ''}
        ${p.recs ? `<dt>Letters</dt><dd>${esc(p.recs)}</dd>` : ''}
        ${p.mens_attire ? `<dt>Men wear</dt><dd>${esc(p.mens_attire)}</dd>` : ''}
        ${p.platform ? `<dt>Submit on</dt><dd>${esc(p.platform)}</dd>` : ''}
        ${p.fee ? `<dt>Fee</dt><dd>${esc(p.fee)}</dd>` : ''}
      </dl>
      <div class="foot"><a class="link" href="${esc(p.source_url || c.url)}" target="_blank" rel="noopener">Requirements page</a></div>
    </article>`;
  }
  function renderPrepSchools() {
    if (!prep) return;
    const list = C.filter(c => PREP[c.id] && (prepAll || isSaved('c:' + c.id)));
    $('#prep-cards').innerHTML = list.map(prepCard).join('');
    $('#prep-empty').hidden = list.length > 0;
  }
  $('#prep-all').addEventListener('click', e => { prepAll = !prepAll; e.currentTarget.setAttribute('aria-pressed', String(prepAll)); renderPrepSchools(); });
  renderPrepSchools();

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
  $('#kit').innerHTML = KIT.map(([id, t, s]) => `<li><label><input type="checkbox" data-kit="${id}"><div><b>${esc(t)}</b><span>${esc(s)}</span></div></label></li>`).join('');
  $('#kit').addEventListener('change', e => { S.set(['kit', e.target.dataset.kit], e.target.checked || null); });
  function syncChecks() {
    document.querySelectorAll('[data-kit]').forEach(i => { i.checked = !!S.data.kit[i.dataset.kit]; });
    document.querySelectorAll('[data-film]').forEach(i => { i.checked = !!S.data.film['f' + i.dataset.film]; });
  }

  // ---------- My list + tracker ----------
  // ---------- per-pick checklists ----------
  // Every pick gets its own steps, built from that school's or call's real requirements and dates.
  const trim = (t, n) => { t = String(t || ''); return t.length > n ? t.slice(0, n - 1).replace(/\s+\S*$/, '') + '...' : t; };
  function stepsFor(key) {
    const kind = key.slice(0, 1), id = key.slice(2);
    const evs = upcoming.filter(e => e.key === key);
    const find = re => evs.find(e => re.test(e.label));
    const steps = [];
    if (kind === 'c') {
      const c = C.find(x => x.id === id); if (!c) return steps;
      const p = PREP[id] || {}, v = p.video || {};
      const vdue = find(/prescreen|video|digital|portfolio|solo/i);
      const adue = find(/appl|common app|early|regular|supplement|priority|deadline|decision|\bED\b|\bEA\b|apply/i) || evs.find(e => e !== vdue);
      steps.push({ id: 'apply', t: 'Send the application', due: adue && adue.d });
      if (c.prescreen === true || v.needed) steps.push({ id: 'video', t: 'Film and upload the video' + (v.length ? ` (${v.length})` : ''), due: vdue && vdue.d });
      if ((p.photos || []).length) steps.push({ id: 'photos', t: 'Photos: ' + p.photos.join(', ') });
      if (p.resume) steps.push({ id: 'resume', t: 'Dance resume' });
      if (p.essay) steps.push({ id: 'essay', t: 'Essay: ' + trim(p.essay, 90) });
      if (p.recs) steps.push({ id: 'recs', t: /^\d+$/.test(String(p.recs)) ? `${p.recs} recommendation letter${+p.recs === 1 ? '' : 's'}` : 'Recommendation letters: ' + trim(p.recs, 60) });
      if (p.fee) steps.push({ id: 'fee', t: 'Pay the fee: ' + trim(p.fee, 60) });
      steps.push({ id: 'audition', t: 'Book and do the audition' });
      steps.push({ id: 'aid', t: 'Aid forms: FAFSA, plus the CSS Profile if they ask' });
    } else if (kind === 'a' || kind === 'o') {
      const x = kind === 'a' ? A.find(y => y.id === id) : O.find(y => y.id === id); if (!x) return steps;
      steps.push({ id: 'register', t: kind === 'o' && x.format === 'video submission' ? 'Send the submission' : 'Register or sign up', due: iso(x.deadline) || null });
      steps.push({ id: 'ready', t: x.bring ? 'Get ready: ' + trim(x.bring, 90) : 'Get your materials ready' });
      if (iso(x.date_start)) steps.push({ id: 'go', t: 'Go and dance', due: iso(x.date_start) });
    } else if (kind === 'm') {
      const m = M.find(y => y.id === id); if (!m) return steps;
      steps.push({ id: 'docs', t: 'Gather what they ask for' });
      steps.push({ id: 'apply', t: 'Apply', due: iso(m.deadline) });
    } else if (kind === 'e') {
      steps.push({ id: 'profile', t: 'Make a casting profile or send a reel' });
      steps.push({ id: 'watch', t: 'Check their audition page for new calls' });
    }
    return steps;
  }
  const stepDone = (k, sid) => !!(S.data.steps[k] || {})[sid];
  function stepsHtml(k) {
    const steps = stepsFor(k); if (!steps.length) return '';
    const left = steps.filter(s => !stepDone(k, s.id)).length;
    return `<div class="steps"><p class="tk-label">Checklist <span class="muted">${left ? `${left} to go` : 'all done'}</span></p>
      <ul>${steps.map(s => `<li><label><input type="checkbox" data-step="${esc(s.id)}" ${stepDone(k, s.id) ? 'checked' : ''}><span>${esc(s.t)}${s.due ? ` <em class="${daysLeft(s.due) <= 7 && !stepDone(k, s.id) ? 'hot' : ''}">${fmt(s.due)}</em>` : ''}</span></label></li>`).join('')}</ul></div>`;
  }
  function trackerHtml(k) {
    const t = trackOf(k);
    return `<div class="tracker" data-track="${esc(k)}">
      <label class="tk-label">Status
        <select data-tk="status">${STATUSES.map(s => `<option${(t.status || 'Interested') === s ? ' selected' : ''}>${s}</option>`).join('')}</select></label>
      ${stepsHtml(k)}
      <label class="tk-label">Notes
        <textarea data-tk="note" rows="2" placeholder="Audition time, what to bring, how it went">${esc(t.note || '')}</textarea></label>
    </div>`;
  }
  function renderMine() {
    // Don't redraw under someone's thumbs while they're typing a note.
    if (document.activeElement && document.activeElement.closest && document.activeElement.closest('#mine-cards textarea')) { mineDirty = true; return; }
    mineDirty = false;
    const keys = savedKeys().filter(k => ALL.has(k));
    const byStatus = s => keys.filter(k => (trackOf(k).status || 'Interested') === s);
    $('#mine-cards').innerHTML = STATUSES.map(s => {
      const ks = byStatus(s); if (!ks.length) return '';
      return `<h3 class="status-head">${s} <span class="muted">${ks.length}</span></h3>
        <div class="cards">${ks.map(k => `<div class="tracked">${ALL.get(k).card()}${trackerHtml(k)}</div>`).join('')}</div>`;
    }).join('');
    $('#mine-empty').hidden = keys.length > 0;
    $('#mine-tools').hidden = keys.length === 0 || S.shared; // a shared plan already syncs; no need for a picks link
    $('#mine-n').textContent = keys.length ? `(${keys.length})` : '';
  }
  $('#mine-cards').addEventListener('change', e => {
    const box = e.target.closest('[data-track]'); if (!box) return;
    const k = box.dataset.track;
    if (e.target.dataset.step) { S.set(['steps', k, e.target.dataset.step], e.target.checked || null); renderPersonal(); return; }
    const f = e.target.dataset.tk; if (!f) return;
    S.set(['track', k, f], e.target.value || null);
    if (f === 'status') renderPersonal();
  });
  $('#mine-cards').addEventListener('input', e => {
    if (e.target.dataset.tk !== 'note') return;
    S.set(['track', e.target.closest('[data-track]').dataset.track, 'note'], e.target.value || null);
  });
  $('#mine-cards').addEventListener('focusout', () => { setTimeout(() => { if (mineDirty) renderMine(); }, 0); });

  // Share: a link that carries the starred list, so John can send it to Dixon or his mom.
  $('#mine-share').addEventListener('click', async () => {
    const url = location.origin + location.pathname + '?list=' + encodeURIComponent(savedKeys().filter(k => ALL.has(k)).join(',')) + '#mine';
    let ok = false;
    try { if (navigator.share) { await navigator.share({ title: "John's list", url }); ok = true; } } catch (e) {}
    if (!ok) { try { await navigator.clipboard.writeText(url); ok = true; } catch (e) {} }
    $('#mine-share-msg').textContent = ok ? 'Link ready. Anyone who opens it sees your list.' : url;
  });
  const shared = (() => { try { return (new URLSearchParams(location.search).get('list') || '').split(',').filter(k => ALL.has(k)); } catch (e) { return []; } })();
  if (shared.length) {
    const fresh = shared.filter(k => !isSaved(k));
    $('#shared').hidden = false;
    $('#shared-text').textContent = `Someone shared ${shared.length} pick${shared.length === 1 ? '' : 's'} with you${fresh.length ? `, ${fresh.length} not on your list yet` : ', all already on your list'}.`;
    $('#shared-cards').innerHTML = shared.map(k => ALL.get(k).card()).join('');
    $('#shared-add').hidden = !fresh.length;
    $('#shared-add').addEventListener('click', () => { fresh.forEach(k => setSaved(k, true)); $('#shared').hidden = true; history.replaceState(null, '', location.pathname + '#mine'); });
  }
  // ---------- This week + plan bar ----------
  function renderWeek() {
    const box = $('#week'); if (!box) return;
    const keys = savedKeys().filter(k => ALL.has(k) && trackOf(k).status !== 'Not for me');
    if (!keys.length) {
      box.innerHTML = `<p class="muted" style="margin:0">Star the schools, auditions and calls you care about. Their deadlines and checklists collect here.</p>`;
      return;
    }
    const dated = [];
    keys.forEach(k => stepsFor(k).forEach(st => { if (st.due && st.due >= today && !stepDone(k, st.id)) dated.push({ k, st }); }));
    dated.sort((a, b) => a.st.due - b.st.due);
    const next = dated.slice(0, 4);
    const openSteps = keys.reduce((n, k) => n + stepsFor(k).filter(st => !stepDone(k, st.id)).length, 0);
    box.innerHTML = (next.length ? `<ul class="soon">${next.map(({ k, st }) => {
      const n = daysLeft(st.due);
      return `<li><div class="d">${fmt(st.due)}<small>${st.due.toLocaleDateString('en-US', { weekday: 'short' })}</small></div>
        <div class="w"><b>${esc(ALL.get(k).name)}</b><span>${esc(st.t)}</span></div><span class="left${n <= 7 ? ' hot' : ''}">${leftLabel(n)}</span></li>`;
    }).join('')}</ul>` : '<p class="muted" style="margin:0">Nothing dated coming up on your picks.</p>') +
      `<p class="small muted" style="margin:12px 0 0">${keys.length} pick${keys.length === 1 ? '' : 's'}, ${openSteps} checklist item${openSteps === 1 ? '' : 's'} left. <a class="link" href="#mine" data-go="mine">Open my list</a></p>`;
  }
  function ago(d) { if (!d) return ''; const s = Math.round((Date.now() - d) / 1000); return s < 45 ? 'just now' : s < 3600 ? `${Math.round(s / 60)} min ago` : `${Math.round(s / 3600)} hr ago`; }
  function renderPlanBar() {
    const bar = $('#planbar'); if (!bar) return;
    if (!S.shared) {
      bar.innerHTML = `<span class="small muted">Saved on this device only.</span>`;
      return;
    }
    const st = S.status === 'offline' ? 'Offline, will sync when you are back' : S.pending ? 'Saving...' : `Shared plan, synced ${ago(S.lastSync)}`;
    const cal = S.calendarUrl();
    bar.innerHTML = `<span class="pb-status small"><span class="dot${S.status === 'offline' ? ' off' : ''}"></span>${esc(st)}</span>
      <span class="pb-actions">
        ${cal ? `<a class="chip" href="${esc(cal.replace(/^https:/, 'webcal:'))}">Add deadlines to my calendar</a>` : ''}
        <button class="chip" id="copy-plan">Copy plan link</button>
      </span>`;
    $('#copy-plan').addEventListener('click', async e => {
      const url = S.planUrl(); let ok = false;
      try { if (navigator.share) { await navigator.share({ title: "John's plan", url }); ok = true; } } catch (err) {}
      if (!ok) { try { await navigator.clipboard.writeText(url); ok = true; } catch (err) {} }
      e.target.textContent = ok ? 'Link copied' : url;
    });
  }
  function renderPersonal() {
    document.querySelectorAll('[data-star]').forEach(x => x.setAttribute('aria-pressed', String(isSaved(x.dataset.star))));
    renderMine(); renderRoadmap(); renderPrepSchools(); drawSoon(); renderWeek(); renderPlanBar(); syncChecks();
  }
  S.onChange(renderPersonal);
  setInterval(renderPlanBar, 20000);
  renderPersonal();

  // ---------- Tabs ----------
  const tabs = [...document.querySelectorAll('.tab')];
  function show(id) {
    tabs.forEach(t => t.setAttribute('aria-selected', String(t.dataset.tab === id)));
    document.querySelectorAll('[data-panel]').forEach(p => { p.hidden = p.dataset.panel !== id; });
    if (location.hash.slice(1) !== id) history.replaceState(null, '', location.pathname + location.search + '#' + id);
    const t = tabs.find(x => x.dataset.tab === id); if (t) t.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }
  tabs.forEach(t => t.addEventListener('click', () => { show(t.dataset.tab); window.scrollTo({ top: 0 }); }));
  document.addEventListener('click', e => { const g = e.target.closest('[data-go]'); if (g) { e.preventDefault(); show(g.dataset.go); window.scrollTo({ top: 0 }); } });
  const initial = location.hash.slice(1);
  show(tabs.some(t => t.dataset.tab === initial) ? initial : 'start');
})();
