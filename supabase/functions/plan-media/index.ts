// Uploads for John's plan. Everything goes through here so the storage bucket stays private.
// POST {action, token, ...}: list | sign-upload | add | update | delete   (token = the plan link secret)
// GET  ?public=1: public photos and links for the public Media page (no token).
// Only this function holds the service key; the database functions it calls are service-role only.
const URL_ = Deno.env.get("SUPABASE_URL")!;
const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const BUCKET = "john-media";
const MAX_BYTES = 50 * 1024 * 1024;
// figgg shares this project's storage; John's uploads stop well short of the free-plan quota.
const BUCKET_CAP = 600 * 1024 * 1024;
const MIME_EXT: Record<string, string> = {
  "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp",
  "video/mp4": "mp4", "video/quicktime": "mov", "video/webm": "webm",
};
const ORIGINS = ["https://dixxxvhb.github.io", "http://localhost:5517"];

function cors(req: Request): Record<string, string> {
  const o = req.headers.get("origin") || "";
  return {
    "Access-Control-Allow-Origin": ORIGINS.includes(o) ? o : ORIGINS[0],
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "content-type",
    "Vary": "Origin",
  };
}
const H = { apikey: SERVICE, Authorization: `Bearer ${SERVICE}`, "Content-Type": "application/json" };

async function rpc(fn: string, body: unknown) {
  const r = await fetch(`${URL_}/rest/v1/rpc/${fn}`, { method: "POST", headers: H, body: JSON.stringify(body) });
  const j = await r.json().catch(() => null);
  if (!r.ok) throw Object.assign(new Error(j?.message || fn), { status: j?.code === "P0002" ? 404 : 400, code: j?.code });
  return j;
}
async function signRead(paths: string[], seconds = 3600): Promise<Record<string, string>> {
  if (!paths.length) return {};
  const r = await fetch(`${URL_}/storage/v1/object/sign/${BUCKET}`, { method: "POST", headers: H, body: JSON.stringify({ expiresIn: seconds, paths }) });
  const j = r.ok ? await r.json() : [];
  const out: Record<string, string> = {};
  for (const x of j || []) if (x && x.signedURL && !x.error) out[x.path] = `${URL_}/storage/v1${x.signedURL}`;
  return out;
}
const json = (req: Request, data: unknown, status = 200, extra: Record<string, string> = {}) =>
  new Response(JSON.stringify(data), { status, headers: { ...cors(req), "Content-Type": "application/json", ...extra } });

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors(req) });
  try {
    const u = new URL(req.url);
    if (req.method === "GET" && u.searchParams.get("public") === "1") {
      const items = await rpc("jn_media_public", {});
      const urls = await signRead(items.filter((m: any) => m.path).map((m: any) => m.path), 7200);
      const out = items.map((m: any) => ({ ...m, src: m.path ? urls[m.path] || null : null, path: undefined }));
      return json(req, out, 200, { "Cache-Control": "public, max-age=600" });
    }
    if (req.method !== "POST") return json(req, { error: "method" }, 405);

    const body = await req.json().catch(() => ({}));
    const token = String(body.token || "");
    if (token.length < 32 || token.length > 200) return json(req, { error: "not found" }, 404);

    switch (body.action) {
      case "list": {
        const items = await rpc("jn_media_list", { p_token: token });
        if (items === null) return json(req, { error: "not found" }, 404);
        const urls = await signRead(items.filter((m: any) => m.path).map((m: any) => m.path));
        return json(req, items.map((m: any) => ({ ...m, src: m.path ? urls[m.path] || null : null })));
      }
      case "sign-upload": {
        const plan = await rpc("jn_plan_id", { p_token: token });
        if (!plan) return json(req, { error: "not found" }, 404);
        const mime = String(body.mime || "");
        const bytes = Number(body.bytes || 0);
        if (!MIME_EXT[mime]) return json(req, { error: "That file type isn't supported. Use a photo (JPG, PNG) or a video (MP4, MOV)." }, 400);
        if (!(bytes > 0) || bytes > MAX_BYTES) return json(req, { error: "Files can be up to 50 MB. For longer videos, add a YouTube link instead." }, 400);
        // Clear abandoned uploads (slots signed but never added) before checking the cap.
        const orphans: string[] = await rpc("jn_media_orphans", {}).catch(() => []);
        if (orphans && orphans.length) await fetch(`${URL_}/storage/v1/object/${BUCKET}`, { method: "DELETE", headers: H, body: JSON.stringify({ prefixes: orphans.slice(0, 100) }) });
        const used = Number(await rpc("jn_media_bucket_bytes", {}));
        if (used + bytes > BUCKET_CAP) return json(req, { error: "John's upload space is full. Ask Dixon to make room, or add a YouTube link instead." }, 400);
        const path = `${plan}/${crypto.randomUUID()}.${MIME_EXT[mime]}`;
        const r = await fetch(`${URL_}/storage/v1/object/upload/sign/${BUCKET}/${path}`, { method: "POST", headers: H, body: "{}" });
        const j = await r.json().catch(() => null);
        if (!r.ok || !j?.url) return json(req, { error: "Could not start the upload." }, 500);
        return json(req, { path, uploadUrl: `${URL_}/storage/v1${j.url}` });
      }
      case "add": {
        const it = body.item || {};
        if (it.kind === "link") {
          let ok = false;
          try { const x = new URL(String(it.url)); ok = x.protocol === "https:"; } catch { ok = false; }
          if (!ok) return json(req, { error: "Paste a full link that starts with https://" }, 400);
        } else {
          // The file has to be there already (uploaded to its signed slot).
          const plan = await rpc("jn_plan_id", { p_token: token });
          if (!plan || !String(it.path || "").startsWith(plan + "/")) return json(req, { error: "not found" }, 404);
          const urls = await signRead([String(it.path)], 60);
          if (!urls[String(it.path)]) return json(req, { error: "The upload didn't finish. Try again." }, 400);
        }
        const row = await rpc("jn_media_add", { p_token: token, p_item: it });
        const urls = row.path ? await signRead([row.path]) : {};
        return json(req, { ...row, src: row.path ? urls[row.path] || null : null });
      }
      case "update": {
        const row = await rpc("jn_media_update", { p_token: token, p_id: String(body.id || ""), p_patch: body.patch || {} });
        return json(req, row);
      }
      case "delete": {
        const res = await rpc("jn_media_delete", { p_token: token, p_id: String(body.id || "") });
        if (res && res.path) await fetch(`${URL_}/storage/v1/object/${BUCKET}`, { method: "DELETE", headers: H, body: JSON.stringify({ prefixes: [res.path] }) });
        return json(req, { ok: true });
      }
    }
    return json(req, { error: "unknown action" }, 400);
  } catch (e) {
    const status = (e as any).status === 404 ? 404 : 400;
    return json(req, { error: status === 404 ? "not found" : "Something went wrong." }, status);
  }
});
