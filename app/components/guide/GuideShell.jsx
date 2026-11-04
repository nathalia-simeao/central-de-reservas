// Layout leve do portal do guia (celular primeiro, sem Polaris/Shopify).
export const guideStyles = `
:root { --g-bg:#f6f4f1; --g-card:#ffffff; --g-ink:#1f2933; --g-muted:#6b7280; --g-line:#e5e1db; --g-green:#166534; --g-green-soft:#dcfce7; --g-red:#b91c1c; --g-red-soft:#fee2e2; --g-amber:#b45309; --g-amber-soft:#fef3c7; }
@media (prefers-color-scheme: dark) { :root { --g-bg:#111614; --g-card:#1a211e; --g-ink:#e8eee9; --g-muted:#9aa5a0; --g-line:#2b3530; --g-green:#4ade80; --g-green-soft:#14361f; --g-red:#f87171; --g-red-soft:#3b1515; --g-amber:#fbbf24; --g-amber-soft:#3a2a0b; } }
* { box-sizing: border-box; }
body { margin:0; background:var(--g-bg); color:var(--g-ink); font-family: Inter, system-ui, -apple-system, "Segoe UI", sans-serif; font-size:16px; -webkit-text-size-adjust:100%; }
a { color: inherit; }
.g-wrap { max-width: 640px; margin: 0 auto; padding: 16px 16px 48px; }
.g-top { display:flex; align-items:center; justify-content:space-between; gap:12px; margin-bottom:16px; }
.g-top h1 { font-size:20px; margin:0; }
.g-top small { color:var(--g-muted); display:block; font-size:13px; }
.g-link { font-size:14px; color:var(--g-muted); text-decoration:none; padding:8px 0; }
.g-card { background:var(--g-card); border:1px solid var(--g-line); border-radius:16px; padding:16px; margin-bottom:12px; }
.g-card h2 { font-size:16px; margin:0 0 10px; }
.g-day { font-size:13px; font-weight:700; text-transform:uppercase; letter-spacing:.04em; color:var(--g-muted); margin:20px 0 8px; }
.g-dep { display:flex; gap:12px; align-items:center; text-decoration:none; }
.g-dep__time { font-size:20px; font-weight:800; min-width:64px; font-variant-numeric: tabular-nums; }
.g-dep__main { flex:1; min-width:0; }
.g-dep__main strong { display:block; overflow-wrap:anywhere; }
.g-dep__main span { color:var(--g-muted); font-size:14px; }
.g-pill { display:inline-block; padding:3px 9px; border-radius:999px; font-size:12px; font-weight:700; }
.g-pill.ok { background:var(--g-green-soft); color:var(--g-green); }
.g-pill.no { background:var(--g-red-soft); color:var(--g-red); }
.g-pill.wait { background:var(--g-amber-soft); color:var(--g-amber); }
.g-btn { display:inline-flex; align-items:center; justify-content:center; gap:6px; min-height:44px; padding:10px 14px; border-radius:12px; border:1px solid var(--g-line); background:var(--g-card); color:var(--g-ink); font:inherit; font-size:15px; font-weight:600; text-decoration:none; cursor:pointer; }
.g-btn.primary { background:var(--g-green); border-color:var(--g-green); color:#fff; }
.g-btn.danger { color:var(--g-red); border-color:var(--g-red); }
.g-btn.on { background:var(--g-green-soft); border-color:var(--g-green); color:var(--g-green); }
.g-btn.on-no { background:var(--g-red-soft); border-color:var(--g-red); color:var(--g-red); }
.g-btn[disabled] { opacity:.45; cursor:not-allowed; }
.g-row { display:flex; flex-wrap:wrap; gap:8px; }
.g-checks { display:grid; grid-template-columns:repeat(3, minmax(0,1fr)); gap:8px; }
.g-check { display:flex; flex-direction:column; align-items:center; justify-content:center; gap:2px; min-height:64px; padding:8px; border-radius:12px; border:1px solid var(--g-line); background:var(--g-card); font:inherit; font-weight:700; color:var(--g-ink); cursor:pointer; }
.g-check small { font-weight:500; color:var(--g-muted); font-size:12px; }
.g-check.done { background:var(--g-green-soft); border-color:var(--g-green); color:var(--g-green); }
.g-check[disabled]:not(.done) { opacity:.45; cursor:not-allowed; }
.g-guest { padding:12px 0; border-top:1px solid var(--g-line); }
.g-guest:first-of-type { border-top:0; padding-top:0; }
.g-guest__head { display:flex; justify-content:space-between; gap:8px; align-items:baseline; }
.g-guest__head strong { overflow-wrap:anywhere; }
.g-guest__meta { color:var(--g-muted); font-size:14px; margin:4px 0 10px; overflow-wrap:anywhere; }
.g-field { display:flex; flex-direction:column; gap:6px; margin-bottom:12px; font-size:14px; font-weight:600; }
.g-field input, .g-field textarea, .g-select { font:inherit; font-size:16px; padding:12px; border-radius:12px; border:1px solid var(--g-line); background:var(--g-card); color:var(--g-ink); width:100%; }
.g-ticket { display:flex; justify-content:space-between; align-items:center; gap:12px; padding:10px 0; border-top:1px solid var(--g-line); }
.g-ticket span { flex:1; min-width:0; font-size:14px; overflow-wrap:anywhere; }
.g-ticket small { display:block; color:var(--g-muted); }
.g-ticket input { width:72px; font:inherit; font-size:16px; padding:10px; border-radius:12px; border:1px solid var(--g-line); background:var(--g-card); color:var(--g-ink); text-align:center; }
.g-sell { display:flex; align-items:center; justify-content:center; gap:8px; width:100%; margin-bottom:12px; }
.g-participants { margin:0 0 10px; }
.g-participants summary { cursor:pointer; font-size:14px; color:var(--g-muted); padding:4px 0; }
.g-participant { display:grid; grid-template-columns:minmax(0,2fr) minmax(0,1fr); gap:8px; margin:8px 0; }
.g-participant input { font:inherit; font-size:16px; padding:10px; border-radius:12px; border:1px solid var(--g-line); background:var(--g-card); color:var(--g-ink); width:100%; min-width:0; }
.g-error { background:var(--g-red-soft); color:var(--g-red); padding:10px 12px; border-radius:12px; font-size:14px; margin-bottom:12px; }
.g-ok { background:var(--g-green-soft); color:var(--g-green); padding:10px 12px; border-radius:12px; font-size:14px; margin-bottom:12px; }
.g-note { border-left:3px solid var(--g-line); padding:4px 0 4px 10px; margin:8px 0; font-size:14px; }
.g-note small { color:var(--g-muted); display:block; }
.g-file { display:flex; justify-content:space-between; align-items:center; gap:10px; padding:10px 0; border-top:1px solid var(--g-line); text-decoration:none; }
.g-file:first-of-type { border-top:0; }
.g-file span { overflow-wrap:anywhere; }
.g-empty { color:var(--g-muted); font-size:14px; margin:0; }
.g-summary { display:flex; gap:16px; flex-wrap:wrap; color:var(--g-muted); font-size:14px; }
.g-summary b { color:var(--g-ink); }
`;

export function GuideShell({ children, title = "Portal do guia" }) {
  return (
    <>
      <title>{`${title} · Portugal, Me & You`}</title>
      <meta name="robots" content="noindex" />
      <style>{guideStyles}</style>
      <div className="g-wrap">{children}</div>
    </>
  );
}

export function lisbonParts(value) {
  const date = new Date(value);
  const fmt = (opts) => new Intl.DateTimeFormat("pt-PT", { timeZone: "Europe/Lisbon", ...opts }).format(date);
  return {
    time: fmt({ hour: "2-digit", minute: "2-digit" }),
    day: fmt({ weekday: "long", day: "2-digit", month: "long" }),
    dayKey: new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Lisbon" }).format(date),
  };
}

export const PLATFORM_NAMES = {
  SHOPIFY: "Site",
  GETYOURGUIDE: "GetYourGuide",
  VIATOR: "Viator",
  CIVITATIS: "Civitatis",
  HEADOUT: "Headout",
  CENTRAL: "Central",
};
