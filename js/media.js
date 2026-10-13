// Media page: every photo and video of John, grouped by season, plus anything John, his mom
// or Dixon add from their phones (js/uploads.js). Added items are private to the plan link
// unless someone marks a photo or link public.
(async function () {
  const $ = s => document.querySelector(s);
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const U = window.JNUploads;
  const FILTERS = [
    { id: 'all', label: 'Everything', test: () => true },
    { id: 'videos', label: 'Videos', test: i => i.type === 'video' },
    { id: 'solos', label: 'Solos', test: i => i.tag === 'solos' },
    { id: 'groups', label: 'Groups', test: i => i.tag === 'groups' },
    { id: 'class', label: 'Class and rehearsal', test: i => i.tag === 'class' },
    { id: 'photos', label: 'Photos', test: i => i.type === 'photo' },
    { id: 'stage', label: 'On stage', test: i => i.type === 'photo' && i.tag === 'stage' },
    { id: 'off', label: 'Off stage', test: i => i.type === 'photo' && i.tag !== 'stage' && i.tag !== 'added' },
    { id: 'added', label: 'Added', test: i => i.tag === 'added' }
  ];
  const seasonOf = d => { if (!d) return null; const [y, m] = d.split('-').map(Number); const s = m >= 8 ? y : y - 1; return `${s}-${String(s + 1).slice(2)}`; };
  const ytId = url => { const m = String(url).match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|shorts\/|embed\/|live\/))([\w-]{11})/); return m ? m[1] : null; };
  const host = url => { try { return new URL(url).hostname.replace(/^www\./, ''); } catch (e) { return 'link'; } };
  const fmtDate = d => d ? new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : '';

  // ---------- load ----------
  const base = (await (await fetch('data/media.json')).json()).items;
  let added = [];
  async function loadAdded() {
    let rows = [];
    if (U.canEdit) { try { rows = await U.list(); } catch (e) { rows = []; } }
    else rows = await U.publicItems();
    added = rows.map(toItem).filter(Boolean);
  }
  function toItem(r) {
    const date = r.taken || (r.created_at || '').slice(0, 10);
    const common = { id: r.id, added: true, isPublic: !!r.is_public, title: r.title || (r.kind === 'link' ? host(r.url) : r.kind === 'video' ? 'Video' : 'Photo'), kind: [r.added_by ? 'Added by ' + r.added_by : 'Added', fmtDate(date)].filter(Boolean).join(' · '), season: seasonOf(date), date, tag: 'added', raw: r };
    if (r.kind === 'photo') return r.src ? Object.assign(common, { type: 'photo', src: r.src, w: r.width, h: r.height }) : null;
    if (r.kind === 'video') return r.src ? Object.assign(common, { type: 'video', src: r.src, upVideo: true }) : null;
    const id = ytId(r.url);
    if (id) return Object.assign(common, { type: 'video', youtube: id, poster: `https://i.ytimg.com/vi/${id}/hqdefault.jpg` });
    return Object.assign(common, { type: 'link', url: r.url });
  }
  await loadAdded();

  // ---------- grid ----------
  let current = 'all';
  try { current = new URLSearchParams(location.search).get('f') || 'all'; } catch (e) {}
  const order = s => s ? parseInt(s, 10) : 0;
  const all = () => [...added, ...base].sort((a, b) => order(b.season) - order(a.season) || (a.type === b.type ? String(b.date || '').localeCompare(String(a.date || '')) : a.type === 'video' ? -1 : 1));
  function drawChips(items) {
    const chips = $('#chips');
    chips.innerHTML = FILTERS.filter(f => f.id === 'all' || items.some(f.test)).map(f => `<button class="chip" data-f="${f.id}" aria-pressed="${f.id === current}">${f.label} <span class="n">${items.filter(f.test).length}</span></button>`).join('');
  }
  $('#chips').addEventListener('click', e => { const b = e.target.closest('[data-f]'); if (!b) return; current = b.dataset.f; draw(); history.replaceState(null, '', current === 'all' ? 'media.html' + (location.search.includes('plan=') ? location.search.replace(/[?&]f=[^&]*/, '') : '') : '?f=' + current); });

  function draw() {
    const items = all();
    const photos = items.filter(i => i.type === 'photo').length, vids = items.filter(i => i.type === 'video').length;
    $('#summary').textContent = `${photos} photos and ${vids} videos, from his first solo to this season.`;
    drawChips(items);
    const f = FILTERS.find(x => x.id === current) || FILTERS[0];
    const list = items.filter(f.test);
    const grid = $('#grid'); grid.innerHTML = '';
    $('#empty').hidden = list.length > 0;
    let season = null, cols = null;
    list.forEach((it, idx) => {
      const sKey = it.season || 'Earlier';
      if (sKey !== season) {
        season = sKey;
        const h = document.createElement('h2'); h.className = 'season-head';
        h.textContent = sKey === 'Earlier' ? 'More from the archive' : sKey.replace('-', ' to 20') + ' season';
        grid.appendChild(h);
        cols = document.createElement('div'); cols.className = 'grid'; grid.appendChild(cols);
      }
      const wrap = document.createElement('div'); wrap.className = 'tile-wrap';
      const b = document.createElement('button');
      b.className = 'tile' + (it.type === 'video' ? ' is-video' : '') + (it.type === 'link' ? ' is-link' : '');
      const meta = [it.kind, it.added ? '' : it.season].filter(Boolean).join(' · ');
      let visual;
      if (it.type === 'photo') visual = `<img src="${esc(it.src)}"${it.w ? ` width="${it.w}" height="${it.h}"` : ''} alt="${esc(it.title)}" loading="lazy">`;
      else if (it.upVideo) visual = `<video src="${esc(it.src)}#t=0.5" muted playsinline preload="metadata" aria-hidden="true"></video>`;
      else if (it.type === 'video') visual = `<img src="${esc(it.poster)}" alt="${esc(it.title)}" loading="lazy">`;
      else visual = `<span class="link-card"><b>${esc(it.title)}</b><span>${esc(host(it.url))}</span></span>`;
      b.innerHTML = `${visual}
        ${it.type === 'video' ? '<span class="play" aria-hidden="true"></span>' : ''}
        ${it.added && U.canEdit && !it.isPublic ? '<span class="lock">Only you</span>' : ''}
        ${it.type !== 'link' ? `<span class="cap"><b>${esc(it.title)}</b>${esc(meta)}</span>` : ''}`;
      b.setAttribute('aria-label', (it.type === 'video' ? 'Play ' : 'Open ') + it.title);
      b.addEventListener('click', () => {
        if (it.type === 'link') { window.open(it.url, '_blank', 'noopener'); return; }
        const viewable = list.filter(x => x.type !== 'link');
        Viewer.open(viewable, viewable.indexOf(it));
      });
      wrap.appendChild(b);
      if (it.added && U.canEdit) {
        const e = document.createElement('button'); e.className = 'tile-edit'; e.textContent = 'Edit'; e.setAttribute('aria-label', 'Edit ' + it.title);
        e.addEventListener('click', () => openEdit(it)); wrap.appendChild(e);
      }
      cols.appendChild(wrap);
    });
  }
  draw();

  // ---------- sheet + toast ----------
  let toastT = null;
  function toast(msg) { const t = $('#toast'); t.textContent = msg; t.hidden = false; requestAnimationFrame(() => t.classList.add('on')); clearTimeout(toastT); toastT = setTimeout(() => { t.classList.remove('on'); setTimeout(() => { t.hidden = true; }, 220); }, 2600); }
  function openSheet(html) {
    $('#sheet-body').innerHTML = html; $('#sheet').hidden = false; $('#scrim').hidden = false; document.body.classList.add('sheet-open');
    requestAnimationFrame(() => { $('#sheet').classList.add('on'); $('#scrim').classList.add('on'); });
  }
  function closeSheet() {
    $('#sheet').classList.remove('on'); $('#scrim').classList.remove('on'); document.body.classList.remove('sheet-open');
    setTimeout(() => { $('#sheet').hidden = true; $('#scrim').hidden = true; }, 260);
  }
  document.addEventListener('click', e => { if (e.target.closest('[data-close]') || e.target === $('#scrim')) closeSheet(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !$('#sheet').hidden) closeSheet(); });
  const closeBtn = '<button class="icon-btn" data-close aria-label="Close"><svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg></button>';
  const today = () => new Date().toISOString().slice(0, 10);
  const WHO = ['John', 'Mom', 'Dixon'];
  const who = () => { try { return localStorage.getItem('jn-who') || 'John'; } catch (e) { return 'John'; } };

  // ---------- add ----------
  if (U.canEdit) { $('#add-open').hidden = false; $('#add-open').addEventListener('click', openAdd); if (location.hash === '#add') setTimeout(openAdd, 300); }
  function openAdd() {
    openSheet(`
      <header class="sheet-head"><div><h2 id="sheet-title">Add to John's media</h2><p class="sheet-sub">Only John, his mom and Dixon can see what you add, until you make it public.</p></div>${closeBtn}</header>
      <div class="up-tabs seg-scroll inline" role="tablist"><button class="seg on" data-up="files" role="tab">Photos or videos</button><button class="seg" data-up="link" role="tab">A link</button></div>
      <form id="up-form" class="up-form" novalidate>
        <div data-pane="files">
          <label class="drop" for="up-files"><b>Choose photos or videos</b><span>Photos are resized and their location data removed. Videos up to 50 MB.</span></label>
          <input id="up-files" type="file" accept="image/*,video/*" multiple hidden>
          <ul class="up-list" id="up-list"></ul>
        </div>
        <div data-pane="link" hidden>
          <label class="field"><span>Link</span><input id="up-url" type="url" inputmode="url" placeholder="https://youtube.com/..." autocomplete="off" spellcheck="false"></label>
          <p class="muted small">YouTube plays right on the page. Instagram, TikTok and Google Drive links open in a new tab.</p>
        </div>
        <label class="field"><span>Title <i>optional</i></span><input id="up-title" type="text" maxlength="200" placeholder="Prelude at Groove, JUMP class, recital..."></label>
        <label class="field"><span>Date</span><input id="up-date" type="date" value="${today()}" max="${today()}"></label>
        <div class="field"><span>Added by</span><div class="seg-scroll inline">${WHO.map(w => `<button type="button" class="seg${who() === w ? ' on' : ''}" data-who="${w}">${w}</button>`).join('')}</div></div>
        <label class="toggle"><input id="up-public" type="checkbox"><span><b>Show on John's public Media page</b><i>Only if everyone in it is OK being on a public site. Uploaded videos always stay private.</i></span></label>
        <p class="form-err" id="up-err" role="alert" hidden></p>
        <button class="btn up-go" id="up-go" type="submit">Add</button>
      </form>`);
    let mode = 'files', files = [];
    const sheet = $('#sheet');
    sheet.querySelectorAll('[data-up]').forEach(b => b.addEventListener('click', () => {
      mode = b.dataset.up;
      sheet.querySelectorAll('[data-up]').forEach(x => x.classList.toggle('on', x === b));
      sheet.querySelectorAll('[data-pane]').forEach(p => { p.hidden = p.dataset.pane !== mode; });
    }));
    sheet.querySelectorAll('[data-who]').forEach(b => b.addEventListener('click', () => { try { localStorage.setItem('jn-who', b.dataset.who); } catch (e) {} sheet.querySelectorAll('[data-who]').forEach(x => x.classList.toggle('on', x === b)); }));
    $('#up-files').addEventListener('change', e => {
      files = [...e.target.files];
      $('#up-list').innerHTML = files.map((f, i) => `<li data-i="${i}"><span>${esc(f.name)}</span><span class="muted small">${(f.size / 1048576).toFixed(1)} MB</span><i class="prog"><b></b></i></li>`).join('');
      if (files.length === 1 && files[0].lastModified) $('#up-date').value = new Date(files[0].lastModified).toISOString().slice(0, 10);
    });
    $('#up-form').addEventListener('submit', async e => {
      e.preventDefault();
      const err = $('#up-err'); err.hidden = true;
      const meta = { title: $('#up-title').value.trim() || null, taken: $('#up-date').value || null, added_by: who(), is_public: $('#up-public').checked };
      const go = $('#up-go'); go.disabled = true; go.textContent = 'Adding...';
      try {
        if (mode === 'link') {
          const url = $('#up-url').value.trim();
          if (!/^https:\/\//i.test(url)) throw new Error('Paste a full link that starts with https://');
          await U.addLink(url, meta);
        } else {
          if (!files.length) throw new Error('Choose at least one photo or video.');
          let done = 0;
          for (let i = 0; i < files.length; i++) {
            const li = $(`#up-list [data-i="${i}"]`);
            try {
              await U.uploadFile(files[i], Object.assign({}, meta, files.length > 1 && meta.title ? { title: `${meta.title} ${i + 1}` } : {}), p => { const bar = li && li.querySelector('.prog b'); if (bar) bar.style.width = Math.round(p * 100) + '%'; });
              if (li) li.classList.add('ok'); done++;
            } catch (x) { if (li) { li.classList.add('bad'); li.insertAdjacentHTML('beforeend', `<em>${esc(x.message)}</em>`); } }
          }
          if (!done) throw new Error('Nothing was added. See the messages above.');
        }
        await loadAdded(); draw();
        toast('Added. It shows up under Added.');
        closeSheet();
      } catch (x) {
        err.textContent = x.message; err.hidden = false;
      } finally { go.disabled = false; go.textContent = 'Add'; }
    });
  }

  // ---------- edit ----------
  function openEdit(it) {
    const r = it.raw;
    openSheet(`
      <header class="sheet-head"><div><h2 id="sheet-title">Edit</h2><p class="sheet-sub">${esc(it.kind)}</p></div>${closeBtn}</header>
      <form id="ed-form" class="up-form" novalidate>
        <label class="field"><span>Title</span><input id="ed-title" type="text" maxlength="200" value="${esc(r.title || '')}"></label>
        <label class="field"><span>Date</span><input id="ed-date" type="date" value="${esc(r.taken || '')}" max="${today()}"></label>
        ${r.kind === 'video' ? `<p class="muted small">Uploaded videos stay private because they can carry location data. Ask Dixon to post a cleaned copy if you want it public.</p>` :
        `<label class="toggle"><input id="ed-public" type="checkbox" ${r.is_public ? 'checked' : ''}><span><b>Show on John's public Media page</b><i>Only if everyone in it is OK being on a public site.</i></span></label>`}
        <p class="form-err" id="ed-err" role="alert" hidden></p>
        <button class="btn up-go" type="submit">Save</button>
        <button class="btn ghost danger" type="button" id="ed-del">Delete</button>
      </form>`);
    $('#ed-form').addEventListener('submit', async e => {
      e.preventDefault();
      const patch = { title: $('#ed-title').value.trim(), taken: $('#ed-date').value || null };
      if ($('#ed-public')) patch.is_public = $('#ed-public').checked;
      try { await U.update(r.id, patch); await loadAdded(); draw(); toast('Saved'); closeSheet(); }
      catch (x) { $('#ed-err').textContent = x.message; $('#ed-err').hidden = false; }
    });
    let armed = false;
    $('#ed-del').addEventListener('click', async e => {
      if (!armed) { armed = true; e.target.textContent = 'Tap again to delete for good'; return; }
      try { await U.remove(r.id); await loadAdded(); draw(); toast('Deleted'); closeSheet(); }
      catch (x) { $('#ed-err').textContent = x.message; $('#ed-err').hidden = false; }
    });
  }
})();
