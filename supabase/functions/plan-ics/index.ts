// Calendar feed for John's shared plan.
// GET /functions/v1/plan-ics?f=<feed key>  ->  text/calendar with every dated deadline on his picks.
// The feed key is read-only (jn_plan_feed); it can never edit the plan. Notes are never included.
const API = "https://swjqlfcqvcrnydpyjyog.supabase.co";
const KEY = "sb_publishable_agYvnH3Bs77pPvNwaZLzjg_DjUsbeMW";
const SITE = "https://dixxxvhb.github.io/john-nuzzi-site";

type Item = Record<string, any>;
type Ev = { date: string; label: string; name: string; key: string; url: string };

const ISO = /\d{4}-\d{2}-\d{2}/g;

function clean(t: string): string {
  let x = t.replace(/\(.*?\)/g, " ");
  for (let i = 0; i < 3; i++) {
    x = x.replace(/^[\s,;:/]+|[\s,;:/]+$/g, "").replace(/^(and|or)(\s+|$)/i, "").replace(/\s+(or|and|for the|on|by|due)$/i, "");
  }
  return x.replace(/\s{2,}/g, " ").trim();
}

// Same labeling as the site: each date takes the words just before it (or a "for ..." clause after it).
function segDates(text: string, fallback: string, push: (date: string, label: string) => void) {
  String(text || "").split(/;|\.\s/).forEach((seg) => {
    const re = new RegExp(ISO.source, "g");
    let m: RegExpExecArray | null, prev = 0, stem = "", last = fallback;
    while ((m = re.exec(seg))) {
      const before = clean(seg.slice(prev, m.index));
      prev = m.index + m[0].length;
      const rest = seg.slice(prev);
      const fm = rest.match(/^\s*(for [^,]*?)(?=,|\s+and\s+\d{4}-|\s*\d{4}-|$)/i);
      let label: string;
      if (fm) {
        if (before) stem = before;
        label = [stem, clean(fm[1])].filter(Boolean).join(" ");
        prev += fm[0].length;
      } else label = before;
      if (label.length < 2 || label.length > 80) label = last;
      last = label;
      push(m[0], label.charAt(0).toUpperCase() + label.slice(1));
    }
  });
}

async function json(path: string): Promise<any> {
  try {
    const r = await fetch(`${SITE}/data/${path}`);
    return r.ok ? await r.json() : null;
  } catch {
    return null;
  }
}

const esc = (s: string) => String(s).replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
function fold(line: string): string {
  const bytes = new TextEncoder().encode(line);
  if (bytes.length <= 74) return line;
  const out: string[] = [];
  let cur = "";
  for (const ch of line) {
    if (new TextEncoder().encode(cur + ch).length > 73) { out.push(cur); cur = " " + ch; } else cur += ch;
  }
  out.push(cur);
  return out.join("\r\n");
}
const ymd = (d: string) => d.replace(/-/g, "");
function nextDay(d: string): string {
  const t = new Date(d + "T00:00:00Z");
  t.setUTCDate(t.getUTCDate() + 1);
  return t.toISOString().slice(0, 10);
}
async function uid(s: string): Promise<string> {
  const h = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(h)].slice(0, 12).map((b) => b.toString(16).padStart(2, "0")).join("") + "@john-nuzzi-site";
}

Deno.serve(async (req: Request) => {
  const url = new URL(req.url);
  const feed = url.searchParams.get("f") || "";
  if (feed.length < 32 || feed.length > 200) return new Response("Not found", { status: 404 });

  const pr = await fetch(`${API}/rest/v1/rpc/jn_plan_feed`, {
    method: "POST",
    headers: { apikey: KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ p_feed: feed }),
  });
  const plan = pr.ok ? await pr.json() : null;
  if (!plan) return new Response("Not found", { status: 404 });

  const saved: Record<string, unknown> = plan.saved || {};
  const status: Record<string, string> = plan.status || {};
  const keys = new Set(Object.keys(saved).filter((k) => status[k] !== "Not for me"));

  const [colleges, auditions, money, cruise, stage] = await Promise.all(
    ["colleges.json", "auditions.json", "money.json", "calls-cruise.json", "calls-stage.json"].map(json),
  );

  const evs: Ev[] = [];
  const add = (key: string, name: string, link: string) => (date: string, label: string) => {
    if (keys.has(key)) evs.push({ date, label, name, key, url: link });
  };
  for (const c of (colleges?.items || []) as Item[]) {
    const k = "c:" + c.id;
    segDates(c.prescreen_deadline, "Prescreen video due", add(k, c.name, c.url));
    segDates(c.app_deadline, "Application deadline", add(k, c.name, c.url));
  }
  for (const a of (auditions?.items || []) as Item[]) {
    const push = add("a:" + a.id, a.name, a.url);
    if (a.deadline) push(a.deadline, "Deadline");
    if (a.date_start) push(a.date_start, a.where ? `Starts, ${a.where}` : "Starts");
  }
  for (const o of [...(cruise?.items || []), ...(stage?.items || [])] as Item[]) {
    const push = add("o:" + o.id, o.title, o.url);
    if (o.deadline) push(o.deadline, "Submission deadline");
    if (o.date_start) push(o.date_start, o.where ? `Open call, ${o.where}` : "Open call");
  }
  for (const m of (money?.items || []) as Item[]) {
    if (m.deadline) add("m:" + m.id, m.name, m.url)(m.deadline, "Scholarship deadline");
  }

  // Keep the last 30 days and everything ahead; one event per name + date + label.
  const cutoff = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
  const seen = new Set<string>();
  const list = evs
    .filter((e) => /^\d{4}-\d{2}-\d{2}$/.test(e.date) && e.date >= cutoff)
    .filter((e) => { const k = e.name + e.date + e.label; if (seen.has(k)) return false; seen.add(k); return true; })
    .sort((a, b) => a.date.localeCompare(b.date));

  const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d+Z$/, "Z");
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//John Nuzzi//Plan//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:John's Plan",
    "X-WR-CALDESC:Deadlines and auditions on John's picks",
    "REFRESH-INTERVAL;VALUE=DURATION:PT6H",
    "X-PUBLISHED-TTL:PT6H",
  ];
  for (const e of list) {
    lines.push(
      "BEGIN:VEVENT",
      `UID:${await uid(e.key + e.date + e.label)}`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${ymd(e.date)}`,
      `DTEND;VALUE=DATE:${ymd(nextDay(e.date))}`,
      `SUMMARY:${esc(`${e.name}: ${e.label}`)}`,
      `DESCRIPTION:${esc(`${e.label}. Official page: ${e.url}\nPlan: ${SITE}/next.html#mine`)}`,
      `URL:${esc(e.url || SITE + "/next.html")}`,
      "TRANSP:TRANSPARENT",
      // A week ahead and the day before, both at 9am.
      "BEGIN:VALARM", "ACTION:DISPLAY", `DESCRIPTION:${esc(e.name + " in a week")}`, "TRIGGER:-P6DT15H", "END:VALARM",
      "BEGIN:VALARM", "ACTION:DISPLAY", `DESCRIPTION:${esc(e.name + " tomorrow")}`, "TRIGGER:-PT15H", "END:VALARM",
      "END:VEVENT",
    );
  }
  lines.push("END:VCALENDAR");

  return new Response(lines.map(fold).join("\r\n") + "\r\n", {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'inline; filename="johns-plan.ics"',
      "Cache-Control": "public, max-age=900",
    },
  });
});
