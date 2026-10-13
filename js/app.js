// John's Plan: the What's Next planner.
// Five views (Today, Explore, My plan, Roadmap, Get ready), one detail sheet for every item,
// and a shared plan (js/plan-store.js) so John, his mom and Dixon see the same thing.
// All content comes from data/*.json; refresh the data and this file never changes.
(async function () {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const load = async f => { try { const r = await fetch('data/' + f, { cache: 'no-cache' }); return r.ok ? r.json() : null; } catch (e) { return null; } };

  // ---------- data ----------
  const [, colleges, auditions, careers, costs, money, prep, callsCruise, callsStage] = await Promise.all([
    window.PlanStore.init(),
    ...['colleges', 'auditions', 'careers', 'costs', 'money', 'prep', 'calls-cruise', 'calls-stage'].map(n => load(n + '.json'))
  ]);
  const S = window.PlanStore;
  const C = colleges?.items || [], A = auditions?.items || [], M = money?.items || [];
  const O = [...(callsCruise?.items || []), ...(callsStage?.items || [])];
  const P = careers?.paths || [], E = careers?.employers || [], B = careers?.boards || [];
  const COST = costs?.items || {}, PREP = prep?.items || {};

  // ---------- dates and formatting ----------
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const iso = s => { if (!s || !/^\d{4}-\d{2}-\d{2}/.test(s)) return null; const d = new Date(s.slice(0, 10) + 'T00:00:00'); return isNaN(d) ? null : d; };
  const daysLeft = d => Math.round((d - today) / 86400000);
  const fmt = d => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const fmtLong = d => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const wk = d => d.toLocaleDateString('en-US', { weekday: 'short' });
  const leftLabel = n => n === 0 ? 'Today' : n === 1 ? 'Tomorrow' : n < 0 ? 'Passed' : n < 60 ? `${n} days` : `${Math.round(n / 7)} weeks`;
  const usd = n => n == null ? null : '$' + Math.round(n).toLocaleString('en-US');
  const humanize = s => esc(s).replace(/(\d{4})-(\d{2})-(\d{2})/g, m => { const d = iso(m); return d ? fmtLong(d) : m; });
  const trim = (t, n) => { t = String(t || ''); return t.length > n ? t.slice(0, n - 1).replace(/\s+\S*$/, '') + '...' : t; };
  const plural = (n, a, b) => `${n} ${n === 1 ? a : b}`;

  // ---------- icons (one family, 1.75 stroke) ----------
  const I = {
    today: '<path d="M12 3v2M12 19v2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M3 12h2M19 12h2M5.6 18.4 7 17M17 7l1.4-1.4"/><circle cx="12" cy="12" r="4"/>',
    explore: '<circle cx="11" cy="11" r="6.5"/><path d="m20 20-4.2-4.2"/>',
    plan: '<path d="M9 6h11M9 12h11M9 18h11"/><path d="m3.5 6 1.2 1.2L7 4.8M3.5 12l1.2 1.2L7 10.8M3.5 18l1.2 1.2L7 16.8"/>',
    roadmap: '<rect x="3.5" y="5" width="17" height="15" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
    prep: '<rect x="3" y="6.5" width="12.5" height="11" rx="2.5"/><path d="m15.5 10.5 5-3v9l-5-3"/>',
    star: '<path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z" stroke-linejoin="round"/>',
    close: '<path d="M6 6l12 12M18 6 6 18"/>',
    out: '<path d="M14 4h6v6M20 4l-9 9"/><path d="M18 14v4.5A1.5 1.5 0 0 1 16.5 20h-11A1.5 1.5 0 0 1 4 18.5v-11A1.5 1.5 0 0 1 5.5 6H10"/>',
    chev: '<path d="m9 6 6 6-6 6"/>',
    cal: '<rect x="3.5" y="5" width="17" height="15" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4M12 13.5v4M10 15.5h4"/>',
    link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
    compare: '<rect x="3.5" y="4" width="7" height="16" rx="2"/><rect x="13.5" y="4" width="7" height="16" rx="2"/>'
  };
  const icon = (n, cls = '') => `<svg class="ic ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${I[n]}</svg>`;

  // ---------- labels ----------
  const GROUPS = { florida: 'Florida', 'top-bfa': 'Top BFA', commercial: 'Commercial and MT', 'conservatory-gap': 'Conservatory and gap year' };
  const TYPES = { scholarship: 'Scholarship', convention: 'Convention', competition: 'Competition', intensive: 'Summer intensive', 'gap-year': 'Gap year', 'college-audition': 'College audition', job: 'Job' };
  const ETYPES = { 'theme-park': 'Theme park', cruise: 'Cruise line', company: 'Company', 'second-company': 'Second company', tour: 'Tours and Broadway', sports: 'Sports team', agency: 'Agency', convention: 'Convention', other: 'Other' };
  const OTYPES = { cruise: 'Cruise lines', 'theme-park': 'Theme parks', broadway: 'Broadway', tour: 'Tours', company: 'Companies', theatre: 'Theatres', 'tv-film': 'TV and film', other: 'Other' };
  const MTYPES = { dance: 'Dance', arts: 'Arts', general: 'General', need: 'Need-based', local: 'Central Florida' };
  const STATUSES = ['Interested', 'Applying', 'Submitted', 'Audition booked', 'Auditioned', 'Got an offer', 'Not for me'];

  // ---------- costs ----------
  // The Scorecard after-aid average mostly reflects in-state families, so it misleads for
  // public schools outside Florida, where John pays out-of-state tuition. Hidden there.
  const outOfStatePublic = c => c && c.tuition_in_state != null && c.tuition_out_of_state != null && c.tuition_in_state !== c.tuition_out_of_state && c.john_tuition === c.tuition_out_of_state;
  const fairNet = c => c && !outOfStatePublic(c) ? c.net_price : null;

  // ---------- every dated thing ----------
  const events = [];
  const clean = t => {
    let x = t.replace(/\(.*?\)/g, ' ');
    for (let i = 0; i < 3; i++) x = x.replace(/^[\s,;:/]+|[\s,;:/]+$/g, '').replace(/^(and|or)(\s+|$)/i, '').replace(/\s+(or|and|for the|on|by|due)$/i, '');
    return x.replace(/\s{2,}/g, ' ').trim();
  };
  // Each date in a sentence takes the words just before it ("ED I 2026-11-01, ED II 2027-01-01")
  // or a "for ..." clause after it ("supplemental due 2026-10-14 for the Oct 28 audition").
  const segDates = (text, fallback, base) => String(text || '').split(/;|\.\s/).forEach(seg => {
    const re = /\d{4}-\d{2}-\d{2}/g; let m, prev = 0, stem = '', last = fallback;
    while ((m = re.exec(seg))) {
      const d = iso(m[0]); const before = clean(seg.slice(prev, m.index)); prev = m.index + m[0].length;
      const fm = seg.slice(prev).match(/^\s*(for [^,]*?)(?=,|\s+and\s+\d{4}-|\s*\d{4}-|$)/i);
      let label;
      if (fm) { if (before) stem = before; label = [stem, clean(fm[1])].filter(Boolean).join(' '); prev += fm[0].length; } else label = before;
      if (!d) continue;
      if (label.length < 2 || label.length > 80) label = last;
      last = label;
      events.push(Object.assign({ d, label: label.charAt(0).toUpperCase() + label.slice(1) }, base));
    }
  });
  C.forEach(c => {
    const base = { name: c.name, key: 'c:' + c.id };
    segDates(c.prescreen_deadline, 'Prescreen video due', base);
    segDates(c.app_deadline, 'Application deadline', base);
  });
  A.forEach(a => {
    const base = { name: a.name, key: 'a:' + a.id };
    if (iso(a.deadline)) events.push(Object.assign({ d: iso(a.deadline), label: ['Deadline', a.where].filter(Boolean).join(' · ') }, base));
    if (iso(a.date_start)) events.push(Object.assign({ d: iso(a.date_start), label: [TYPES[a.type] || 'Event', a.where].filter(Boolean).join(' · ') }, base));
  });
  O.forEach(o => {
    const base = { name: o.title, key: 'o:' + o.id };
    if (iso(o.deadline)) events.push(Object.assign({ d: iso(o.deadline), label: ['Submission deadline', o.org].filter(Boolean).join(' · ') }, base));
    if (iso(o.date_start)) events.push(Object.assign({ d: iso(o.date_start), label: ['Open call', o.where].filter(Boolean).join(' · ') }, base));
  });
  M.forEach(m => { if (iso(m.deadline)) events.push({ d: iso(m.deadline), label: 'Scholarship deadline', name: m.name, key: 'm:' + m.id }); });
  const seenEv = new Set();
  const upcoming = events.filter(e => e.d >= today).sort((a, b) => a.d - b.d)
    .filter(e => { const k = e.name + +e.d; if (seenEv.has(k)) return false; seenEv.add(k); return true; });
  const nextEvent = key => upcoming.find(e => e.key === key) || null;

  // ---------- one index of everything ----------
  // kind: c college, a audition/scholarship event, o open call, m money, e employer, p career path
  const ITEMS = new Map();
  C.forEach(c => ITEMS.set('c:' + c.id, { kind: 'c', key: 'c:' + c.id, name: c.name, raw: c }));
  A.forEach(a => ITEMS.set('a:' + a.id, { kind: 'a', key: 'a:' + a.id, name: a.name, raw: a }));
  O.forEach(o => ITEMS.set('o:' + o.id, { kind: 'o', key: 'o:' + o.id, name: o.title, raw: o }));
  M.forEach(m => ITEMS.set('m:' + m.id, { kind: 'm', key: 'm:' + m.id, name: m.name, raw: m }));
  E.forEach(x => ITEMS.set('e:' + x.id, { kind: 'e', key: 'e:' + x.id, name: x.name, raw: x }));
  P.forEach(p => ITEMS.set('p:' + p.id, { kind: 'p', key: 'p:' + p.id, name: p.title, raw: p }));
  const KIND_LABEL = { c: 'College', a: 'Audition', o: 'Open call', m: 'Scholarship', e: 'Hiring', p: 'Career path' };

  // ---------- plan state ----------
  const isSaved = k => !!S.data.saved[k];
  const savedKeys = () => Object.keys(S.data.saved).filter(k => ITEMS.has(k));
  const statusOf = k => (S.data.track[k] || {}).status || 'Interested';
  const noteOf = k => (S.data.track[k] || {}).note || '';
  const stepDone = (k, sid) => !!(S.data.steps[k] || {})[sid];
  const activeKeys = () => savedKeys().filter(k => statusOf(k) !== 'Not for me');

  // ---------- per-pick checklists ----------
  function stepsFor(key) {
    const it = ITEMS.get(key); if (!it) return [];
    const x = it.raw, steps = [];
    const evs = upcoming.filter(e => e.key === key);
    const find = re => evs.find(e => re.test(e.label));
    if (it.kind === 'c') {
      const p = PREP[x.id] || {}, v = p.video || {};
      const vdue = find(/prescreen|video|digital|portfolio|solo/i);
      const adue = find(/appl|common app|early|regular|supplement|priority|deadline|decision|\bED\b|\bEA\b|apply/i) || evs.find(e => e !== vdue);
      steps.push({ id: 'apply', t: 'Send the application', due: adue && adue.d });
      if (x.prescreen === true || v.needed) steps.push({ id: 'video', t: 'Film and upload the video' + (v.length ? ` (${trim(v.length, 40)})` : ''), due: vdue && vdue.d });
      if ((p.photos || []).length) steps.push({ id: 'photos', t: 'Photos: ' + trim(p.photos.join(', '), 80) });
      if (p.resume) steps.push({ id: 'resume', t: 'Dance resume' });
      if (p.essay) steps.push({ id: 'essay', t: 'Essay: ' + trim(p.essay, 80) });
      if (p.recs) steps.push({ id: 'recs', t: /^\d+$/.test(String(p.recs)) ? plural(+p.recs, 'recommendation letter', 'recommendation letters') : 'Letters: ' + trim(p.recs, 60) });
      if (p.fee) steps.push({ id: 'fee', t: 'Pay the fee: ' + trim(p.fee, 50) });
      steps.push({ id: 'audition', t: 'Book and do the audition' });
      steps.push({ id: 'aid', t: 'FAFSA, plus the CSS Profile if they ask' });
    } else if (it.kind === 'a' || it.kind === 'o') {
      steps.push({ id: 'register', t: it.kind === 'o' && x.format === 'video submission' ? 'Send the submission' : 'Register or sign up', due: iso(x.deadline) });
      steps.push({ id: 'ready', t: x.bring ? 'Get ready: ' + trim(x.bring, 80) : 'Get your materials ready' });
      if (iso(x.date_start)) steps.push({ id: 'go', t: 'Go and dance', due: iso(x.date_start) });
    } else if (it.kind === 'm') {
      steps.push({ id: 'docs', t: 'Gather what they ask for' });
      steps.push({ id: 'apply', t: 'Apply', due: iso(x.deadline) });
    } else if (it.kind === 'e') {
      steps.push({ id: 'profile', t: 'Make a casting profile or send a reel' });
      steps.push({ id: 'watch', t: 'Check their audition page for new calls' });
    }
    return steps;
  }
  const progress = k => { const s = stepsFor(k); return { done: s.filter(x => stepDone(k, x.id)).length, total: s.length }; };
  const nextStep = k => stepsFor(k).find(s => !stepDone(k, s.id)) || null;

  // ---------- small UI pieces ----------
  const starBtn = (key, name, cls = '') => `<button class="star ${cls}" data-star="${esc(key)}" aria-pressed="${isSaved(key)}" aria-label="${isSaved(key) ? 'Remove' : 'Save'} ${esc(name)}">${icon('star')}</button>`;
  const pill = (d, done) => { if (!d) return ''; const n = daysLeft(d); return `<span class="pill${n <= 7 && n >= 0 && !done ? ' hot' : ''}">${n <= 7 && n >= 0 ? leftLabel(n) : fmt(d)}</span>`; };
  const okTag = o => {
    if (o.john_ok === 'yes-now') return '<span class="tag strong">You can go now</span>';
    if (o.john_ok === 'at-18') return '<span class="tag">18+</span>';
    if (o.john_ok === 'no') return '<span class="tag">Not open to you</span>';
    return o.age_rule ? '<span class="tag">Check age</span>' : '';
  };
  function rowMeta(it) {
    const x = it.raw, ev = nextEvent(it.key);
    switch (it.kind) {
      case 'c': {
        const c = COST[x.id];
        const tags = [c && c.john_tuition != null ? `<span class="tag">${usd(c.john_tuition)}/yr</span>` : '', x.prescreen === true ? '<span class="tag">Prescreen</span>' : ''].join('');
        return { sub: `${x.program} · ${[x.city, x.state].filter(Boolean).join(', ')}`, tags, side: ev ? pill(ev.d) : '' };
      }
      case 'a': return { sub: [TYPES[x.type], x.where].filter(Boolean).join(' · '), tags: '', side: ev ? pill(ev.d) : '' };
      case 'o': return { sub: [x.org, x.where].filter(Boolean).join(' · '), tags: okTag(x), side: ev ? pill(ev.d) : (x.rolling ? '<span class="pill soft">Rolling</span>' : '') };
      case 'm': { const d = iso(x.deadline); return { sub: [x.org, MTYPES[x.type]].filter(Boolean).join(' · '), tags: x.amount ? `<span class="tag">${esc(trim(x.amount, 28))}</span>` : '', side: d ? (d < today ? '<span class="pill soft">Closed</span>' : pill(d)) : '' }; }
      case 'e': return { sub: [ETYPES[x.type], x.location].filter(Boolean).join(' · '), tags: x.min_age ? `<span class="tag">${esc(trim(x.min_age, 24))}</span>` : '', side: '' };
      case 'p': return { sub: trim(x.what, 90), tags: '', side: '' };
    }
    return { sub: '', tags: '', side: '' };
  }
  function row(it, opts = {}) {
    const m = rowMeta(it);
    const canSave = it.kind !== 'p';
    const sel = opts.compare ? `<span class="pick-dot${compareSet.has(it.key) ? ' on' : ''}" aria-hidden="true"></span>` : '';
    return `<li class="row${opts.compare && compareSet.has(it.key) ? ' selected' : ''}">
      <button class="row-hit" data-open="${esc(it.key)}"${opts.compare ? ` data-compare="${esc(it.key)}"` : ''}>
        ${sel}
        <span class="row-main"><b>${esc(it.name)}</b><span class="row-sub">${esc(m.sub)}</span>${m.tags ? `<span class="row-tags">${m.tags}</span>` : ''}</span>
        <span class="row-side">${m.side}</span>
      </button>
      ${canSave && !opts.compare ? starBtn(it.key, it.name, 'sm') : ''}
    </li>`;
  }

  // ---------- toast ----------
  let toastTimer = null;
  function toast(msg) {
    const t = $('#toast'); t.textContent = msg; t.hidden = false;
    requestAnimationFrame(() => t.classList.add('on'));
    clearTimeout(toastTimer); toastTimer = setTimeout(() => { t.classList.remove('on'); setTimeout(() => { t.hidden = true; }, 220); }, 2200);
  }

  // ---------- saving ----------
  function setSaved(k, on) {
    S.set(['saved', k], on ? true : null);
    toast(on ? 'Saved to your plan' : 'Removed from your plan');
    refreshAll();
  }
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-star]'); if (!b) return;
    e.preventDefault(); e.stopPropagation();
    setSaved(b.dataset.star, !isSaved(b.dataset.star));
  });

  // ======================================================================
  // VIEWS
  // ======================================================================
  const VIEWS = [
    { id: 'today', label: 'Today', icon: 'today' },
    { id: 'explore', label: 'Explore', icon: 'explore' },
    { id: 'plan', label: 'My plan', icon: 'plan' },
    { id: 'roadmap', label: 'Roadmap', icon: 'roadmap' },
    { id: 'prep', label: 'Get ready', icon: 'prep' }
  ];
  $('#tabbar').innerHTML = VIEWS.map(v => `<a class="navtab" href="#${v.id}" data-tab="${v.id}">${icon(v.icon)}<span>${v.label}</span><i class="badge" data-badge="${v.id}" hidden></i></a>`).join('');

  const head = (title, sub) => `<header class="view-head"><h1>${title}</h1>${sub ? `<p class="view-sub">${sub}</p>` : ''}</header>`;

  // ----- TODAY -----
  const KIT = [
    ['solo', 'A studio solo video', '1 to 2 minutes, filmed in a studio in class clothes. FSU will not take competition footage.'],
    ['ballet', 'Two ballet photos', 'First arabesque and tendu a la seconde. Ailey and Pace both ask for them.'],
    ['resume', 'A one-page dance resume', 'Training, titles, choreography and teaching. Ask Dixon to check it.'],
    ['headshot', 'A headshot', 'Clean, current, smiling. Most portals ask for one.'],
    ['recs', 'Two recommendation letters', 'One dance teacher, one academic teacher. Ask a month ahead.'],
    ['acceptd', 'An Acceptd account', 'Many schools take applications and videos through it.'],
    ['counselor', 'A meeting with your school counselor', 'Transcripts, test scores and graduation timing.'],
    ['fafsa', 'FAFSA', 'Free at studentaid.gov. Almost every school here uses it for aid.'],
    ['bf', 'Florida Bright Futures', 'Covers tuition at Florida public schools. Ask about the Florida Financial Aid Application.']
  ];
  function dueSteps() {
    const list = [];
    activeKeys().forEach(k => stepsFor(k).forEach(st => { if (st.due && st.due >= today && !stepDone(k, st.id)) list.push({ k, st }); }));
    return list.sort((a, b) => a.st.due - b.st.due);
  }
  function stepRow(k, st, showName = true) {
    const it = ITEMS.get(k), done = stepDone(k, st.id);
    return `<li class="check-row${done ? ' done' : ''}">
      <label class="check"><input type="checkbox" data-step="${esc(st.id)}" data-key="${esc(k)}" ${done ? 'checked' : ''}><span class="box" aria-hidden="true"></span></label>
      <button class="check-text" data-open="${esc(k)}"><b>${esc(st.t)}</b>${showName ? `<span>${esc(it.name)}</span>` : ''}</button>
      ${st.due ? pill(st.due, done) : ''}
    </li>`;
  }
  function renderToday() {
    const v = $('[data-view=today]');
    const keys = activeKeys();
    const due = dueSteps();
    const hero = due[0];
    const dateLine = today.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
    let heroHtml;
    if (!keys.length) {
      heroHtml = `<div class="hero-card start">
        <p class="hero-k">Start here</p>
        <h2>Star the schools and auditions you like.</h2>
        <p>Each one gets its own checklist, its deadlines land in your calendar, and this page keeps track of what's next.</p>
        <div class="hero-actions"><a class="btn" href="#explore/colleges">Browse colleges</a><a class="btn ghost" href="#explore/calls">Open calls</a></div>
      </div>`;
    } else if (hero) {
      const n = daysLeft(hero.st.due);
      heroHtml = `<button class="hero-card" data-open="${esc(hero.k)}">
        <span class="hero-num"><b>${n === 0 ? 'Today' : n}</b>${n === 0 ? '' : `<small>${n === 1 ? 'day' : 'days'}</small>`}</span>
        <span class="hero-copy"><span class="hero-k">Next up · ${fmt(hero.st.due)}</span><strong>${esc(hero.st.t)}</strong><span>${esc(ITEMS.get(hero.k).name)}</span></span>
        ${icon('chev', 'hero-chev')}
      </button>`;
    } else {
      heroHtml = `<div class="hero-card start"><p class="hero-k">All caught up</p><h2>Nothing dated is due on your picks.</h2><p>Add a few more schools or open calls, or work through Get ready.</p><div class="hero-actions"><a class="btn" href="#explore">Explore</a></div></div>`;
    }
    const week = due.filter(x => daysLeft(x.st.due) <= 21).slice(1, 7);
    const counts = STATUSES.map(s => [s, savedKeys().filter(k => statusOf(k) === s).length]).filter(([, n]) => n);
    const kitDone = KIT.filter(([id]) => S.data.kit[id]).length;
    const everywhere = upcoming.filter(e => !isSaved(e.key)).slice(0, 5);
    v.innerHTML = `
      ${head('Today', dateLine)}
      ${planBar()}
      ${heroHtml}
      ${week.length ? `<section class="block"><h2 class="block-title">Coming up on your picks</h2><ul class="list checks">${week.map(x => stepRow(x.k, x.st)).join('')}</ul></section>` : ''}
      ${counts.length ? `<section class="block"><h2 class="block-title">Your picks</h2><div class="pipeline">${counts.map(([s, n]) => `<a class="pipe" href="#plan/${encodeURIComponent(s)}"><b>${n}</b><span>${s}</span></a>`).join('')}</div></section>` : ''}
      <section class="block">
        <div class="block-head"><h2 class="block-title">Senior year kit</h2><span class="meter" role="img" aria-label="${kitDone} of ${KIT.length} done"><i style="width:${Math.round(kitDone / KIT.length * 100)}%"></i></span><span class="muted small tnum">${kitDone}/${KIT.length}</span></div>
        <p class="muted small" style="margin:0 0 8px">Get these ready once and use them for every application.</p>
        <ul class="list checks">${KIT.map(([id, t, s]) => `<li class="check-row${S.data.kit[id] ? ' done' : ''}"><label class="check"><input type="checkbox" data-kit="${id}" ${S.data.kit[id] ? 'checked' : ''}><span class="box" aria-hidden="true"></span></label><span class="check-text static"><b>${esc(t)}</b><span>${esc(s)}</span></span></li>`).join('')}</ul>
      </section>
      ${everywhere.length ? `<section class="block"><div class="block-head"><h2 class="block-title">Also coming up</h2><a class="link small" href="#roadmap">Roadmap</a></div><ul class="list">${everywhere.map(e => evRow(e)).join('')}</ul></section>` : ''}
    `;
  }
  function evRow(e) {
    const it = ITEMS.get(e.key);
    return `<li class="row ev"><button class="row-hit" data-open="${esc(e.key)}">
      <span class="date-chip"><b>${e.d.getDate()}</b><small>${e.d.toLocaleDateString('en-US', { month: 'short' })}</small></span>
      <span class="row-main"><b>${esc(e.name)}</b><span class="row-sub">${esc(e.label)}</span></span>
      <span class="row-side">${pill(e.d)}</span></button>
      ${it && it.kind !== 'p' ? starBtn(e.key, e.name, 'sm') : ''}</li>`;
  }

  function planBar() {
    if (!S.shared) return `<p class="planbar local">Saved on this phone only.</p>`;
    const st = S.status === 'offline' ? 'Offline, will sync' : S.pending ? 'Saving...' : 'Shared with Mom and Dixon';
    const cal = S.calendarUrl();
    return `<div class="planbar"><span class="pb-status"><span class="dot${S.status === 'offline' ? ' off' : ''}"></span>${esc(st)}</span>
      <span class="pb-actions">${cal ? `<a class="chip" href="${esc(cal.replace(/^https:/, 'webcal:'))}">${icon('cal')}Add to calendar</a>` : ''}<button class="chip" data-copy-plan>${icon('link')}Copy link</button></span></div>`;
  }
  document.addEventListener('click', async e => {
    const b = e.target.closest('[data-copy-plan]'); if (!b) return;
    const url = S.planUrl(); let ok = false;
    try { if (navigator.share) { await navigator.share({ title: "John's plan", url }); ok = true; } } catch (err) { if (err && err.name === 'AbortError') return; }
    if (!ok) { try { await navigator.clipboard.writeText(url); ok = true; } catch (err) {} }
    toast(ok ? 'Plan link copied' : 'Could not copy the link');
  });

  // ----- EXPLORE -----
  const CATS = [
    { id: 'all', label: 'Everything' },
    { id: 'colleges', label: 'Colleges', kind: 'c' },
    { id: 'auditions', label: 'Auditions', kind: 'a' },
    { id: 'calls', label: 'Open calls', kind: 'o' },
    { id: 'money', label: 'Money', kind: 'm' },
    { id: 'hiring', label: 'Who hires', kind: 'e' },
    { id: 'careers', label: 'Careers', kind: 'p' }
  ];
  const ex = { cat: 'colleges', q: '', group: 'all', sort: 'home', toggle: false, compare: false };
  let compareSet = new Set();
  const firstDate = s => { const m = String(s || '').match(/\d{4}-\d{2}-\d{2}/g) || []; const f = m.map(iso).filter(d => d && d >= today).sort((a, b) => a - b); return f[0] || null; };
  const nextDl = c => firstDate((c.prescreen_deadline || '') + ' ' + (c.app_deadline || '')) || 9e15;
  const gOrder = ['florida', 'top-bfa', 'commercial', 'conservatory-gap'];
  const callDate = o => iso(o.date_start) || iso(o.deadline);
  const callPast = o => { const end = iso(o.date_end) || iso(o.date_start) || iso(o.deadline); return !o.rolling && end && end < today; };
  const audPast = a => { const end = iso(a.date_end) || iso(a.date_start) || iso(a.deadline); return end && end < today && !(iso(a.deadline) >= today); };
  const mKey = m => { const d = iso(m.deadline); return !d ? 8e15 : d < today ? 9e15 + +d : +d; };

  const CATDEF = {
    colleges: {
      list: () => C, group: 'group', groups: GROUPS,
      toggle: { label: 'Prescreen video', test: c => c.prescreen === true },
      sorts: { home: ['Florida first', (a, b) => (gOrder.indexOf(a.group) - gOrder.indexOf(b.group)) || (nextDl(a) - nextDl(b))], soon: ['Soonest deadline', (a, b) => nextDl(a) - nextDl(b)], tuition: ['Lowest tuition', (a, b) => (COST[a.id]?.john_tuition ?? 9e15) - (COST[b.id]?.john_tuition ?? 9e15)] },
      key: c => 'c:' + c.id
    },
    auditions: {
      list: () => A.filter(a => !audPast(a)), group: 'type', groups: TYPES,
      sorts: { soon: ['Soonest', (a, b) => ((iso(a.deadline) || iso(a.date_start) || 9e15) - (iso(b.deadline) || iso(b.date_start) || 9e15))] },
      key: a => 'a:' + a.id
    },
    calls: {
      list: () => O.filter(o => !callPast(o)), group: 'category', groups: OTYPES,
      toggle: { label: 'I can go now', test: o => o.john_ok === 'yes-now' },
      sorts: { soon: ['Open to you first', (a, b) => ((a.john_ok === 'yes-now' ? 0 : 1) - (b.john_ok === 'yes-now' ? 0 : 1)) || ((callDate(a) || 9e15) - (callDate(b) || 9e15))] },
      key: o => 'o:' + o.id
    },
    money: { list: () => M, group: 'type', groups: MTYPES, sorts: { soon: ['Soonest deadline', (a, b) => mKey(a) - mKey(b)] }, key: m => 'm:' + m.id },
    hiring: {
      list: () => E, group: 'type', groups: ETYPES,
      toggle: { label: 'Open at 17', test: x => { const n = parseInt((String(x.min_age || '').match(/\d+/) || [])[0], 10); return !isNaN(n) && n <= 17; } },
      sorts: { az: ['A to Z', (a, b) => a.name.localeCompare(b.name)] }, key: x => 'e:' + x.id
    },
    careers: { list: () => P, sorts: { az: ['As listed', () => 0] }, key: p => 'p:' + p.id }
  };

  function renderExplore() {
    const v = $('[data-view=explore]');
    v.innerHTML = `
      ${head('Explore', 'Every college, audition, open call, scholarship and job here was checked on its official page in October 2026.')}
      <div class="search-wrap">${icon('explore')}<input class="search" id="ex-q" type="search" placeholder="Search schools, cities, styles, shows" value="${esc(ex.q)}" aria-label="Search everything" autocomplete="off" spellcheck="false"></div>
      <div class="seg-scroll" role="tablist" aria-label="Category">${CATS.map(c => `<button class="seg${ex.cat === c.id ? ' on' : ''}" data-cat="${c.id}" role="tab" aria-selected="${ex.cat === c.id}">${c.label}</button>`).join('')}</div>
      <div id="ex-tools"></div>
      <div id="ex-body"></div>`;
    $('#ex-q').addEventListener('input', e => { ex.q = e.target.value; if (ex.q && ex.cat !== 'all') ex.cat = 'all'; drawExploreBody(true); });
    v.querySelector('.seg-scroll').addEventListener('click', e => {
      const b = e.target.closest('[data-cat]'); if (!b) return;
      ex.cat = b.dataset.cat; ex.group = 'all'; ex.toggle = false; ex.compare = false; compareSet.clear();
      const d = CATDEF[ex.cat]; ex.sort = d ? Object.keys(d.sorts)[0] : 'home';
      history.replaceState(null, '', '#explore/' + ex.cat);
      drawExploreBody();
    });
    drawExploreBody();
  }
  function drawExploreBody(fromSearch) {
    $$('[data-cat]').forEach(b => { const on = b.dataset.cat === ex.cat; b.classList.toggle('on', on); b.setAttribute('aria-selected', on); });
    const tools = $('#ex-tools'), body = $('#ex-body');
    const q = ex.q.trim().toLowerCase();
    if (ex.cat === 'all') {
      tools.innerHTML = '';
      if (!q) {
        body.innerHTML = `<ul class="cat-grid">${CATS.slice(1).map(c => {
          const d = CATDEF[c.id]; const n = d.list().length;
          return `<li><button class="cat-card" data-cat-go="${c.id}"><b>${c.label}</b><span class="tnum">${n}</span></button></li>`;
        }).join('')}</ul>`;
        return;
      }
      const hits = [...ITEMS.values()].filter(it => JSON.stringify(it.raw).toLowerCase().includes(q));
      body.innerHTML = hits.length ? CATS.slice(1).map(c => {
        const h = hits.filter(it => it.kind === c.kind); if (!h.length) return '';
        return `<section class="block tight"><h2 class="block-title">${c.label} <span class="muted tnum">${h.length}</span></h2><ul class="list">${h.slice(0, 8).map(it => row(it)).join('')}</ul>${h.length > 8 ? `<button class="more" data-cat-go="${c.id}">See all ${h.length}</button>` : ''}</section>`;
      }).join('') : empty('Nothing matches that.', 'Try a school, a city, a style or a show name.');
      return;
    }
    const d = CATDEF[ex.cat];
    let list = d.list();
    const groups = d.group ? Object.keys(d.groups).filter(g => list.some(x => x[d.group] === g)) : [];
    tools.innerHTML = `
      ${groups.length > 1 ? `<div class="chips">${['all', ...groups].map(g => `<button class="chip${ex.group === g ? ' on' : ''}" data-group="${g}">${g === 'all' ? 'All' : esc(d.groups[g])} <span class="n tnum">${g === 'all' ? list.length : list.filter(x => x[d.group] === g).length}</span></button>`).join('')}</div>` : ''}
      <div class="tool-row">
        ${d.toggle ? `<button class="chip${ex.toggle ? ' on' : ''}" data-toggle>${esc(d.toggle.label)}</button>` : ''}
        ${Object.keys(d.sorts).length > 1 ? `<label class="sort-wrap"><span class="sr">Sort</span><select class="sort" data-sort>${Object.entries(d.sorts).map(([k, s]) => `<option value="${k}"${ex.sort === k ? ' selected' : ''}>${s[0]}</option>`).join('')}</select></label>` : ''}
        ${ex.cat === 'colleges' ? `<button class="chip${ex.compare ? ' on' : ''}" data-compare-mode>${icon('compare')}${ex.compare ? 'Done' : 'Compare'}</button>` : ''}
      </div>`;
    if (ex.group !== 'all') list = list.filter(x => x[d.group] === ex.group);
    if (ex.toggle && d.toggle) list = list.filter(d.toggle.test);
    if (q) list = list.filter(x => JSON.stringify(x).toLowerCase().includes(q));
    const sort = d.sorts[ex.sort] || Object.values(d.sorts)[0];
    list = list.slice().sort(sort[1]);
    if (ex.cat === 'careers') {
      body.innerHTML = `<p class="lede-s">Performing is one path. Choreographing, teaching, the body side and the business side are real careers too, often more than one at once.</p>
        <ul class="list">${list.map(p => row(ITEMS.get('p:' + p.id))).join('')}</ul>
        ${B.length ? `<section class="block"><h2 class="block-title">Where the listings live</h2><ul class="list">${B.map(b => `<li class="row"><a class="row-hit" href="${esc(b.url)}" target="_blank" rel="noopener"><span class="row-main"><b>${esc(b.name)}</b><span class="row-sub">${esc(b.what)}</span></span><span class="row-side">${icon('out', 'muted-ic')}</span></a></li>`).join('')}</ul></section>` : ''}`;
      return;
    }
    const compareBar = ex.compare ? `<div class="compare-bar"><span>${compareSet.size ? `${compareSet.size} of 3 picked` : 'Pick up to 3 schools'}</span><button class="btn sm" data-compare-go ${compareSet.size < 2 ? 'disabled' : ''}>Compare</button></div>` : '';
    body.innerHTML = `<p class="count tnum">${plural(list.length, 'result', 'results')}</p>` +
      (list.length ? `<ul class="list">${list.map(x => row(ITEMS.get(d.key(x)), { compare: ex.compare })).join('')}</ul>` : empty('Nothing matches those filters.', 'Clear a filter or try another search.')) + compareBar;
  }
  function empty(t, s) { return `<div class="empty"><b>${esc(t)}</b><span>${esc(s)}</span></div>`; }
  document.addEventListener('click', e => {
    const go = e.target.closest('[data-cat-go]');
    if (go) { ex.cat = go.dataset.catGo; ex.q = ''; ex.group = 'all'; ex.toggle = false; const d = CATDEF[ex.cat]; ex.sort = Object.keys(d.sorts)[0]; location.hash = '#explore/' + ex.cat; return; }
    const g = e.target.closest('[data-group]'); if (g) { ex.group = g.dataset.group; drawExploreBody(); return; }
    if (e.target.closest('[data-toggle]')) { ex.toggle = !ex.toggle; drawExploreBody(); return; }
    if (e.target.closest('[data-compare-mode]')) { ex.compare = !ex.compare; if (!ex.compare) compareSet.clear(); drawExploreBody(); return; }
    if (e.target.closest('[data-compare-go]')) { openCompare(); return; }
  });
  document.addEventListener('change', e => { if (e.target.matches('[data-sort]')) { ex.sort = e.target.value; drawExploreBody(); } });

  // ----- MY PLAN -----
  let planFilter = 'all';
  function renderPlan() {
    const v = $('[data-view=plan]');
    const keys = savedKeys();
    const counts = Object.fromEntries(STATUSES.map(s => [s, keys.filter(k => statusOf(k) === s).length]));
    const list = keys.filter(k => planFilter === 'all' ? statusOf(k) !== 'Not for me' : statusOf(k) === planFilter)
      .sort((a, b) => STATUSES.indexOf(statusOf(a)) - STATUSES.indexOf(statusOf(b)) || ((nextStep(a)?.due || 9e15) - (nextStep(b)?.due || 9e15)));
    const shared = sharedList();
    v.innerHTML = `
      ${head('My plan', keys.length ? `${plural(keys.length, 'pick', 'picks')}. Tap one to update its status, checklist and notes.` : 'Everything you star lands here with its own checklist.')}
      ${planBar()}
      ${shared}
      ${keys.length ? `<div class="seg-scroll">${[['all', 'Active', keys.length - counts['Not for me']], ...STATUSES.map(s => [s, s, counts[s]])].filter(([id, , n]) => id === 'all' || n).map(([id, label, n]) => `<button class="seg${planFilter === id ? ' on' : ''}" data-pf="${esc(id)}">${esc(label)} <span class="n tnum">${n}</span></button>`).join('')}</div>` : ''}
      ${list.length ? `<ul class="list plan-list">${list.map(k => planRow(k)).join('')}</ul>` : keys.length ? empty('Nothing here.', 'Pick another status above.') : `<div class="hero-card start"><h2>Nothing saved yet.</h2><p>Tap the star on any school, audition, open call or scholarship.</p><div class="hero-actions"><a class="btn" href="#explore/colleges">Browse colleges</a></div></div>`}
    `;
  }
  function planRow(k) {
    const it = ITEMS.get(k), pr = progress(k), ns = nextStep(k);
    const pct = pr.total ? Math.round(pr.done / pr.total * 100) : 0;
    return `<li class="row plan-row"><button class="row-hit" data-open="${esc(k)}">
      <span class="row-main"><span class="row-kicker">${KIND_LABEL[it.kind]} · ${esc(statusOf(k))}</span><b>${esc(it.name)}</b>
        <span class="row-sub">${ns ? `Next: ${esc(ns.t)}` : 'Checklist done'}</span>
        <span class="bar" aria-label="${pr.done} of ${pr.total} steps done"><i style="width:${pct}%"></i></span></span>
      <span class="row-side">${ns && ns.due ? pill(ns.due) : `<span class="muted small tnum">${pr.done}/${pr.total}</span>`}</span>
    </button></li>`;
  }
  document.addEventListener('click', e => { const b = e.target.closest('[data-pf]'); if (b) { planFilter = b.dataset.pf; renderPlan(); } });
  // A link with ?list= carries someone's picks (older share links).
  const sharedKeys = (() => { try { return (new URLSearchParams(location.search).get('list') || '').split(',').filter(k => ITEMS.has(k)); } catch (e) { return []; } })();
  let sharedDismissed = false;
  function sharedList() {
    if (!sharedKeys.length || sharedDismissed) return '';
    const fresh = sharedKeys.filter(k => !isSaved(k));
    if (!fresh.length) return '';
    return `<div class="note-box"><p><b>Someone shared ${plural(sharedKeys.length, 'pick', 'picks')} with you.</b> ${fresh.length} ${fresh.length === 1 ? "isn't" : "aren't"} on your plan yet.</p><ul class="list">${fresh.map(k => row(ITEMS.get(k))).join('')}</ul><button class="btn sm" data-add-shared>Add all to my plan</button></div>`;
  }
  document.addEventListener('click', e => {
    if (!e.target.closest('[data-add-shared]')) return;
    sharedKeys.filter(k => !isSaved(k)).forEach(k => S.set(['saved', k], true));
    sharedDismissed = true; toast('Added to your plan'); refreshAll();
  });

  // ----- ROADMAP -----
  const PHASES = {
    '2026-10': 'Build the kit: solo video, ballet photos, resume, headshot. The first deadlines hit this month.',
    '2026-11': 'Early Action and early prescreens. A lot of schools close their first round on November 1.',
    '2026-12': 'Prescreen season peaks. December 1 is the biggest single deadline of the year.',
    '2027-01': 'Audition season starts: regional tours and campus audition days.',
    '2027-02': 'The busiest audition month. Keep your solo fresh and your body healthy.',
    '2027-03': 'Last auditions. Admission and scholarship decisions start landing.',
    '2027-04': 'Compare offers and aid letters side by side. Real cost, not sticker price.',
    '2027-05': 'Decide. Most colleges want your deposit by May 1.',
    '2027-06': 'Graduate. The Dance Awards in Orlando.',
    '2027-07': 'Summer intensives and The Dance Awards in Las Vegas.',
    '2027-08': 'Move in, or start your next program.'
  };
  let roadMine = false;
  function renderRoadmap() {
    const v = $('[data-view=roadmap]');
    const months = Object.keys(PHASES);
    const ym = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    v.innerHTML = `
      ${head('Roadmap', 'Senior year, month by month, to move-in day.')}
      <div class="tool-row"><div class="seg-scroll inline"><button class="seg${!roadMine ? ' on' : ''}" data-road="all">Everything</button><button class="seg${roadMine ? ' on' : ''}" data-road="mine">My picks</button></div></div>
      <ol class="timeline">${months.map(m => {
        const [y, mo] = m.split('-').map(Number);
        const evs = upcoming.filter(e => ym(e.d) === m && (!roadMine || isSaved(e.key)));
        const now = today.getFullYear() === y && today.getMonth() === mo - 1;
        return `<li class="tl-month${now ? ' now' : ''}">
          <div class="tl-head"><h2>${new Date(y, mo - 1, 1).toLocaleDateString('en-US', { month: 'long' })} <span class="muted">${y}</span></h2>${now ? '<span class="tag strong">Now</span>' : ''}</div>
          <p class="phase">${esc(PHASES[m])}</p>
          ${evs.length ? `<ul class="list">${evs.map(evRow).join('')}</ul>` : `<p class="muted small">${roadMine ? 'Nothing from your picks this month.' : 'No dated deadlines this month yet.'}</p>`}
        </li>`;
      }).join('')}</ol>`;
  }
  document.addEventListener('click', e => { const b = e.target.closest('[data-road]'); if (b) { roadMine = b.dataset.road === 'mine'; renderRoadmap(); } });

  // ----- GET READY -----
  function renderPrep() {
    const v = $('[data-view=prep]');
    if (!prep) { v.innerHTML = head('Get ready', 'Audition requirements are loading.'); return; }
    const picks = C.filter(c => isSaved('c:' + c.id) && PREP[c.id]);
    const filmDone = (prep.film_day || []).filter((t, i) => S.data.film['f' + i]).length;
    v.innerHTML = `
      ${head('Get ready', 'What the schools actually ask for, pulled from their own requirement pages.')}
      <section class="block">
        <div class="block-head"><h2 class="block-title">Film day</h2><span class="meter"><i style="width:${Math.round(filmDone / Math.max(1, (prep.film_day || []).length) * 100)}%"></i></span><span class="muted small tnum">${filmDone}/${(prep.film_day || []).length}</span></div>
        <p class="muted small" style="margin:0 0 8px">Every line is a rule at least one of the schools wrote down.</p>
        <ul class="list checks">${(prep.film_day || []).map((t, i) => `<li class="check-row${S.data.film['f' + i] ? ' done' : ''}"><label class="check"><input type="checkbox" data-film="${i}" ${S.data.film['f' + i] ? 'checked' : ''}><span class="box" aria-hidden="true"></span></label><span class="check-text static"><b>${esc(t.tip)}</b><span>${esc((t.from || []).map(id => C.find(c => c.id === id)?.name || id).slice(0, 3).join(', '))}${(t.from || []).length > 3 ? ` and ${(t.from || []).length - 3} more` : ''}</span></span></li>`).join('')}</ul>
      </section>
      <section class="block">
        <h2 class="block-title">Your schools' requirements</h2>
        ${picks.length ? `<ul class="list">${picks.map(c => `<li class="row"><button class="row-hit" data-open="c:${esc(c.id)}"><span class="row-main"><b>${esc(c.name)}</b><span class="row-sub">${esc(prepSummary(PREP[c.id]))}</span></span><span class="row-side">${icon('chev', 'muted-ic')}</span></button></li>`).join('')}</ul>` : `<p class="muted">Star colleges in Explore and their exact requirements collect here.</p>`}
      </section>
      <section class="block">
        <h2 class="block-title">What the schools have in common</h2>
        <ul class="facts-list">${(prep.patterns || []).map(p => `<li>${esc(p.fact)}</li>`).join('')}</ul>
      </section>`;
  }
  function prepSummary(p) {
    const bits = [];
    if (p.video && p.video.needed) bits.push('Video' + (p.video.length ? ' ' + trim(p.video.length, 24) : ''));
    if (p.solo && p.solo.own_choreo_ok === true) bits.push('own choreo OK');
    if (p.solo && p.solo.own_choreo_ok === false) bits.push('teacher-set solo');
    if ((p.photos || []).length) bits.push(plural(p.photos.length, 'photo', 'photos'));
    if (p.essay) bits.push('essay');
    if (p.recs) bits.push('letters');
    return bits.join(' · ') || 'See details';
  }

  // ======================================================================
  // DETAIL SHEET
  // ======================================================================
  const dl = rows => { const r = rows.filter(([, v]) => v); return r.length ? `<dl class="kv">${r.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('')}</dl>` : ''; };
  function sheetFor(key) {
    const it = ITEMS.get(key); if (!it) return '';
    const x = it.raw, canSave = it.kind !== 'p';
    const m = rowMeta(it);
    let body = '';
    const why = x.why_john ? `<p class="why">${esc(x.why_john)}</p>` : '';
    if (it.kind === 'c') {
      const c = COST[x.id], p = PREP[x.id];
      const net = fairNet(c);
      const money = c && (c.john_tuition != null || net != null) ? `<div class="stat-row">
          ${c.john_tuition != null ? `<div class="stat"><b class="tnum">${usd(c.john_tuition)}</b><span>tuition a year for you</span></div>` : ''}
          ${net != null ? `<div class="stat"><b class="tnum">${usd(net)}</b><span>avg real cost after aid</span></div>` : outOfStatePublic(c) ? `<div class="stat"><b>Out of state</b><span>ask about aid for non-residents</span></div>` : ''}
          ${c.room_board ? `<div class="stat"><b class="tnum">${usd(c.room_board)}</b><span>housing and food</span></div>` : ''}
        </div>` : '';
      body = `${why}${money}
        <h3 class="sheet-h">Dates and audition</h3>
        ${dl([['Prescreen', x.prescreen === true ? humanize(x.prescreen_deadline || 'Required') : x.prescreen === false ? 'Not required' : null], ['Apply by', humanize(x.app_deadline)], ['Audition', humanize(x.audition)], ['Money', humanize(x.scholarships)]])}
        ${p ? `<h3 class="sheet-h">What they ask for</h3>${prepDl(p)}` : ''}
        ${x.watch_out ? `<p class="heads"><b>Heads up.</b> ${humanize(x.watch_out)}</p>` : ''}
        ${linkBtn(x.url, 'Official program page')}${p && p.source_url && p.source_url !== x.url ? linkBtn(p.source_url, 'Requirements page', true) : ''}`;
    } else if (it.kind === 'a') {
      const s = iso(x.date_start), e = iso(x.date_end);
      body = `${why}${dl([['Deadline', iso(x.deadline) ? fmtLong(iso(x.deadline)) : null], ['Dates', s ? (e && +e !== +s ? `${fmt(s)} to ${fmtLong(e)}` : fmtLong(s)) : null], ['When', humanize(x.when)], ['Where', esc(x.where)], ['Age', esc(x.age_rule)], ['Cost', esc(x.cost)]])}${linkBtn(x.url, 'Official page')}`;
    } else if (it.kind === 'o') {
      const s = iso(x.date_start), e = iso(x.date_end);
      body = `<p class="sheet-tags">${m.tags}</p>${dl([['When', s ? (e && +e !== +s ? `${fmt(s)} to ${fmtLong(e)}` : fmtLong(s)) : (x.rolling ? 'Rolling, submit any time' : null)], ['Deadline', iso(x.deadline) ? fmtLong(iso(x.deadline)) : null], ['Where', esc(x.where)], ['Format', esc(x.format)], ['Union', esc(x.union)], ['Age', esc(x.age_rule)], ['Bring', esc(x.bring)]])}
        ${x.notes ? `<p class="heads">${humanize(x.notes)}</p>` : ''}${linkBtn(x.url, 'See the call')}`;
    } else if (it.kind === 'm') {
      body = `${why}${dl([['Amount', esc(x.amount)], ['Deadline', iso(x.deadline) ? fmtLong(iso(x.deadline)) + (iso(x.deadline) < today ? ' (closed this year)' : '') : null], ['When', humanize(x.when)], ['Who', esc(x.eligibility)]])}${linkBtn(x.url, 'Official page')}`;
    } else if (it.kind === 'e') {
      body = `${why}${dl([['Age', esc(x.min_age)], ['Casting', humanize(x.auditions)], ['Where', esc(x.location)]])}${linkBtn(x.url, 'Auditions page')}`;
    } else if (it.kind === 'p') {
      body = `<p class="why">${esc(x.what)}</p>${dl([['How people get in', esc(x.how_in)], ['Training', esc(x.training)], ['Pay', x.pay ? esc(x.pay) + (x.pay_source ? ` <a class="link" href="${esc(x.pay_source)}" target="_blank" rel="noopener">source</a>` : '') : null]])}${(x.links || []).map(l => linkBtn(l.url, l.label, true)).join('')}`;
    }
    const verified = x.verified === false ? '<p class="muted small">Some details for this cycle were not posted yet. Confirm on the official page.</p>' : '';
    const track = canSave && isSaved(key) ? trackHtml(key) : '';
    return `<header class="sheet-head">
        <div><p class="sheet-kicker">${KIND_LABEL[it.kind]}</p><h2 id="sheet-title">${esc(it.name)}</h2>${m.sub && it.kind !== 'p' ? `<p class="sheet-sub">${esc(m.sub)}</p>` : ''}</div>
        <button class="icon-btn" data-close aria-label="Close">${icon('close')}</button>
      </header>
      ${canSave ? `<button class="save-btn${isSaved(key) ? ' on' : ''}" data-star="${esc(key)}" aria-pressed="${isSaved(key)}">${icon('star')}<span>${isSaved(key) ? 'In your plan' : 'Save to my plan'}</span></button>` : ''}
      ${track}
      <div class="sheet-content">${body}${verified}</div>`;
  }
  function prepDl(p) {
    const v = p.video || {}, s = p.solo || {}, list = a => (a || []).filter(Boolean).map(esc).join(', ');
    return dl([
      ['Video', v.needed == null ? null : v.needed ? [esc(v.length), list(v.contents)].filter(Boolean).join(' · ') + (v.rules ? `<span class="dd-note">${esc(v.rules)}</span>` : '') : 'No video needed'],
      ['Solo', [esc(s.length), esc(s.style_rule), s.own_choreo_ok === true ? 'your own choreography is fine' : s.own_choreo_ok === false ? 'not your own choreography' : ''].filter(Boolean).join(' · ') || null],
      ['Photos', list(p.photos) || null], ['Resume', p.resume ? 'Yes' : null], ['Essay', esc(p.essay)], ['Letters', esc(p.recs)],
      ['Men wear', esc(p.mens_attire)], ['Submit on', esc(p.platform)], ['Fee', esc(p.fee)]
    ]);
  }
  const linkBtn = (url, label, ghost) => url ? `<a class="out-btn${ghost ? ' ghost' : ''}" href="${esc(url)}" target="_blank" rel="noopener">${esc(label)}${icon('out')}</a>` : '';
  function trackHtml(k) {
    const steps = stepsFor(k), pr = progress(k);
    return `<section class="track" data-track="${esc(k)}">
      <div class="status-pills" role="radiogroup" aria-label="Status">${STATUSES.map(s => `<button class="spill${statusOf(k) === s ? ' on' : ''}" role="radio" aria-checked="${statusOf(k) === s}" data-status="${esc(s)}">${esc(s)}</button>`).join('')}</div>
      ${steps.length ? `<div class="block-head"><h3 class="sheet-h">Checklist</h3><span class="meter"><i style="width:${pr.total ? Math.round(pr.done / pr.total * 100) : 0}%"></i></span><span class="muted small tnum">${pr.done}/${pr.total}</span></div>
      <ul class="list checks">${steps.map(st => stepRow(k, st, false)).join('')}</ul>` : ''}
      <label class="note-label" for="note-${esc(k)}">Notes</label>
      <textarea id="note-${esc(k)}" class="note" data-note="${esc(k)}" rows="3" placeholder="Audition time, what to bring, how it went">${esc(noteOf(k))}</textarea>
    </section>`;
  }

  // Sheet open/close. The URL carries the open item so Back closes it and links can point at one.
  let sheetKey = null, lastFocus = null;
  function openSheet(key, push = true) {
    if (!ITEMS.has(key)) return;
    sheetKey = key; lastFocus = document.activeElement;
    $('#sheet-body').innerHTML = sheetFor(key);
    $('#sheet').hidden = false; $('#scrim').hidden = false;
    document.body.classList.add('sheet-open');
    requestAnimationFrame(() => { $('#sheet').classList.add('on'); $('#scrim').classList.add('on'); });
    $('#sheet').scrollTop = 0; $('#sheet-body').scrollTop = 0;
    if (push) history.pushState({ sheet: key }, '', location.pathname + location.search + location.hash.split('~')[0] + '~' + encodeURIComponent(key));
    setTimeout(() => { const c = $('#sheet [data-close]'); if (c) c.focus({ preventScroll: true }); }, 60);
  }
  function closeSheet(fromPop) {
    if (!sheetKey) return;
    sheetKey = null;
    $('#sheet').classList.remove('on'); $('#scrim').classList.remove('on');
    document.body.classList.remove('sheet-open');
    $('#sheet').style.transform = '';
    setTimeout(() => { if (!sheetKey) { $('#sheet').hidden = true; $('#scrim').hidden = true; } }, 260);
    if (!fromPop && location.hash.includes('~')) history.back();
    if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
    refreshAll();
  }
  function rerenderSheet() {
    if (!sheetKey) return;
    if (document.activeElement && document.activeElement.matches('#sheet textarea')) { sheetDirty = true; return; }
    const sc = $('#sheet-body').scrollTop, sc2 = $('#sheet').scrollTop;
    $('#sheet-body').innerHTML = sheetKey === '__compare' ? compareHtml() : sheetFor(sheetKey);
    $('#sheet-body').scrollTop = sc; $('#sheet').scrollTop = sc2;
  }
  let sheetDirty = false;
  document.addEventListener('click', e => {
    if (e.target.closest('[data-close]') || e.target === $('#scrim')) { closeSheet(); return; }
    const cmp = e.target.closest('[data-compare]');
    if (cmp && ex.compare) {
      const k = cmp.dataset.compare;
      if (compareSet.has(k)) compareSet.delete(k); else if (compareSet.size < 3) compareSet.add(k); else toast('Compare up to 3 at a time');
      drawExploreBody(); return;
    }
    const o = e.target.closest('[data-open]');
    if (o && !e.target.closest('[data-star]')) { e.preventDefault(); openSheet(o.dataset.open); }
  });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && sheetKey) closeSheet(); });
  // Swipe the sheet down to dismiss (phone).
  (function () {
    const sh = $('#sheet'); let y0 = null, dy = 0, t0 = 0;
    sh.addEventListener('touchstart', e => { if (sh.scrollTop > 0 && !e.target.closest('.sheet-grab, .sheet-head')) return; y0 = e.touches[0].clientY; t0 = Date.now(); dy = 0; sh.style.transition = 'none'; }, { passive: true });
    sh.addEventListener('touchmove', e => { if (y0 == null) return; dy = Math.max(0, e.touches[0].clientY - y0); if (dy > 0) sh.style.transform = `translateY(${dy}px)`; }, { passive: true });
    sh.addEventListener('touchend', () => {
      if (y0 == null) return; sh.style.transition = '';
      const v = dy / Math.max(1, Date.now() - t0);
      if (dy > 120 || v > 0.6) closeSheet(); else sh.style.transform = '';
      y0 = null;
    });
  })();

  // Changes inside the sheet and on check rows anywhere.
  document.addEventListener('change', e => {
    const t = e.target;
    if (t.matches('[data-step]')) { S.set(['steps', t.dataset.key, t.dataset.step], t.checked || null); if (t.checked) toast('Nice. One step closer.'); refreshAll(); return; }
    if (t.matches('[data-kit]')) { S.set(['kit', t.dataset.kit], t.checked || null); refreshAll(); return; }
    if (t.matches('[data-film]')) { S.set(['film', 'f' + t.dataset.film], t.checked || null); refreshAll(); return; }
  });
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-status]'); if (!b) return;
    const k = b.closest('[data-track]').dataset.track;
    S.set(['track', k, 'status'], b.dataset.status === 'Interested' ? null : b.dataset.status);
    refreshAll();
  });
  document.addEventListener('input', e => { if (e.target.matches('[data-note]')) S.set(['track', e.target.dataset.note, 'note'], e.target.value || null); });
  document.addEventListener('focusout', e => { if (e.target.matches('#sheet textarea') && sheetDirty) { sheetDirty = false; setTimeout(rerenderSheet, 0); } });

  // ----- compare sheet -----
  function compareHtml() {
    const cols = [...compareSet].map(k => ITEMS.get(k).raw);
    const r = (label, fn) => `<tr><th scope="row">${label}</th>${cols.map(c => `<td>${fn(c) || '<span class="muted">Not posted</span>'}</td>`).join('')}</tr>`;
    const p = c => PREP[c.id] || {};
    return `<header class="sheet-head"><div><p class="sheet-kicker">Compare</p><h2 id="sheet-title">${plural(cols.length, 'school', 'schools')} side by side</h2></div><button class="icon-btn" data-close aria-label="Close">${icon('close')}</button></header>
      <div class="cmp-wrap"><table class="cmp">
        <thead><tr><th></th>${cols.map(c => `<th scope="col"><button class="link" data-open="c:${esc(c.id)}">${esc(c.name)}</button></th>`).join('')}</tr></thead>
        <tbody>
          ${r('Tuition for you', c => COST[c.id]?.john_tuition != null ? `<b class="tnum">${usd(COST[c.id].john_tuition)}</b>` : '')}
          ${r('Avg cost after aid', c => { const k = COST[c.id]; return outOfStatePublic(k) ? 'Out of state' : fairNet(k) != null ? `<span class="tnum">${usd(fairNet(k))}</span>` : ''; })}
          ${r('Housing and food', c => COST[c.id]?.room_board ? `<span class="tnum">${usd(COST[c.id].room_board)}</span>` : '')}
          ${r('Next deadline', c => { const e = nextEvent('c:' + c.id); return e ? `${fmt(e.d)}<span class="dd-note">${esc(e.label)}</span>` : ''; })}
          ${r('Prescreen', c => c.prescreen === true ? 'Yes' : c.prescreen === false ? 'No' : '')}
          ${r('Your own solo', c => { const s = p(c).solo || {}; return s.own_choreo_ok === true ? 'Yes' : s.own_choreo_ok === false ? 'No' : ''; })}
          ${r('Solo length', c => esc((p(c).solo || {}).length))}
          ${r('Photos', c => esc((p(c).photos || []).join(', ')))}
          ${r('Essay', c => esc(trim(p(c).essay, 80)))}
          ${r('Letters', c => esc(p(c).recs))}
          ${r('Fee', c => esc(p(c).fee))}
          ${r('Styles', c => esc((c.styles || []).join(', ')))}
        </tbody></table></div>`;
  }
  function openCompare() {
    if (compareSet.size < 2) return;
    sheetKey = '__compare'; lastFocus = document.activeElement;
    $('#sheet-body').innerHTML = compareHtml();
    $('#sheet').hidden = false; $('#scrim').hidden = false; document.body.classList.add('sheet-open');
    $('#sheet').classList.add('wide');
    requestAnimationFrame(() => { $('#sheet').classList.add('on'); $('#scrim').classList.add('on'); });
    history.pushState({ sheet: '__compare' }, '', location.pathname + location.search + location.hash.split('~')[0] + '~compare');
  }

  // ======================================================================
  // ROUTING + REFRESH
  // ======================================================================
  let current = 'today';
  function route() {
    const raw = location.hash.slice(1);
    const [path, item] = raw.split('~');
    const [view, sub] = (path || 'today').split('/');
    const id = VIEWS.some(v => v.id === view) ? view : 'today';
    if (id === 'explore' && sub && CATDEF[sub] && ex.cat !== sub) { ex.cat = sub; ex.group = 'all'; ex.toggle = false; ex.sort = Object.keys(CATDEF[sub].sorts)[0]; }
    if (id === 'plan' && sub) planFilter = decodeURIComponent(sub);
    if (id !== current || !$(`[data-view=${id}]`).innerHTML) { current = id; renderView(id); window.scrollTo({ top: 0 }); }
    $$('.view').forEach(v => { v.hidden = v.dataset.view !== id; });
    $$('.navtab').forEach(t => t.setAttribute('aria-current', t.dataset.tab === id ? 'page' : 'false'));
    if (item && item !== 'compare') { const k = decodeURIComponent(item); if (k !== sheetKey) openSheet(k, false); }
    else if (sheetKey) closeSheet(true);
    $('#sheet').classList.toggle('wide', item === 'compare' && sheetKey === '__compare');
  }
  function renderView(id) {
    ({ today: renderToday, explore: renderExplore, plan: renderPlan, roadmap: renderRoadmap, prep: renderPrep })[id]();
  }
  function badges() {
    const n = dueSteps().filter(x => daysLeft(x.st.due) <= 7).length;
    const b = $('[data-badge=today]'); b.hidden = !n; b.textContent = n;
    const p = $('[data-badge=plan]'); const c = savedKeys().length; p.hidden = !c; p.textContent = c;
  }
  // Redraw whatever is on screen after any change (local or from another phone).
  function refreshAll() {
    if (current === 'explore') { drawExploreBody(); } else if (!(document.activeElement && document.activeElement.matches('.view textarea'))) renderView(current);
    $$('[data-star]').forEach(x => x.setAttribute('aria-pressed', String(isSaved(x.dataset.star))));
    rerenderSheet(); badges();
  }
  S.onChange(refreshAll);
  window.addEventListener('hashchange', route);
  window.addEventListener('popstate', route);
  setInterval(() => { const pb = $('.view:not([hidden]) .planbar'); if (pb && current !== 'explore') { const tmp = document.createElement('div'); tmp.innerHTML = planBar(); pb.replaceWith(tmp.firstElementChild); } }, 20000);

  $('#loading').remove();
  route(); badges();
})();
