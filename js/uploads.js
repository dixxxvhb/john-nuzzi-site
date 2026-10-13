// Uploads for the Media page. Anyone holding the plan link (John, his mom, Dixon) can add
// photos, short videos and links. Photos are re-drawn on a canvas before upload, which also
// drops their location data. Everything is private until someone marks it public.
window.JNUploads = (function () {
  const FN = 'https://swjqlfcqvcrnydpyjyog.supabase.co/functions/v1/plan-media';
  const MAX = 50 * 1024 * 1024;
  let token = null;
  try {
    const fromUrl = new URLSearchParams(location.search).get('plan');
    token = fromUrl && fromUrl.length >= 32 ? fromUrl : JSON.parse(localStorage.getItem('jn-plan'));
    if (fromUrl && fromUrl.length >= 32) localStorage.setItem('jn-plan', JSON.stringify(fromUrl));
  } catch (e) { token = null; }

  async function call(action, extra) {
    const r = await fetch(FN, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(Object.assign({ action, token }, extra)) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j.error || 'Something went wrong.');
    return j;
  }
  async function publicItems() {
    try { const r = await fetch(FN + '?public=1'); return r.ok ? r.json() : []; } catch (e) { return []; }
  }

  // Photos: decode (orientation applied), scale to 2400px max, re-encode JPEG. No EXIF survives.
  async function preparePhoto(file) {
    let bmp;
    try { bmp = await createImageBitmap(file, { imageOrientation: 'from-image' }); }
    catch (e) {
      bmp = await new Promise((res, rej) => { const img = new Image(); img.onload = () => res(img); img.onerror = () => rej(new Error("This photo format won't open here. On iPhone, pick it in Safari or save it as a JPEG first.")); img.src = URL.createObjectURL(file); });
    }
    const w0 = bmp.width, h0 = bmp.height, s = Math.min(1, 2400 / Math.max(w0, h0));
    const w = Math.round(w0 * s), h = Math.round(h0 * s);
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    c.getContext('2d').drawImage(bmp, 0, 0, w, h);
    const blob = await new Promise(res => c.toBlob(res, 'image/jpeg', 0.86));
    if (!blob) throw new Error("Couldn't read that photo.");
    return { blob, mime: 'image/jpeg', width: w, height: h };
  }
  function put(url, blob, mime, onProgress) {
    return new Promise((res, rej) => {
      const x = new XMLHttpRequest();
      x.open('PUT', url);
      x.setRequestHeader('Content-Type', mime);
      x.setRequestHeader('x-upsert', 'false');
      x.upload.onprogress = e => { if (e.lengthComputable && onProgress) onProgress(e.loaded / e.total); };
      x.onload = () => (x.status >= 200 && x.status < 300 ? res() : rej(new Error('The upload failed. Try again.')));
      x.onerror = () => rej(new Error('The upload failed. Check your connection.'));
      x.send(blob);
    });
  }
  async function uploadFile(file, meta, onProgress) {
    const isVideo = /^video\//.test(file.type) || /\.(mov|mp4|webm)$/i.test(file.name);
    let blob = file, mime = file.type, width = null, height = null;
    if (isVideo) {
      if (!mime) mime = /\.mov$/i.test(file.name) ? 'video/quicktime' : 'video/mp4';
      if (file.size > MAX) throw new Error(`That video is ${Math.round(file.size / 1048576)} MB. Uploads can be 50 MB, so add longer videos as a YouTube link.`);
    } else {
      const p = await preparePhoto(file); blob = p.blob; mime = p.mime; width = p.width; height = p.height;
    }
    const slot = await call('sign-upload', { mime, bytes: blob.size });
    await put(slot.uploadUrl, blob, mime, onProgress);
    return call('add', { item: Object.assign({ kind: isVideo ? 'video' : 'photo', path: slot.path, mime, bytes: blob.size, width, height }, meta) });
  }

  return {
    get canEdit() { return !!token; },
    list: () => call('list', {}),
    publicItems,
    uploadFile,
    addLink: (url, meta) => call('add', { item: Object.assign({ kind: 'link', url }, meta) }),
    update: (id, patch) => call('update', { id, patch }),
    remove: id => call('delete', { id })
  };
})();
