import { useEffect } from "react";
import { Link, NavLink, useRouteLoaderData } from "react-router";
import { guideLocale, translate } from "../../utils/guide-i18n.js";

/** Tradução do app no idioma da pessoa: t("Saídas"), t("Próximos {n} dias", { n }). */
export function useGuideLang() {
  const layout = useRouteLoaderData("routes/guia");
  return layout?.lang || "pt";
}
export function useT() {
  const lang = useGuideLang();
  return (text, vars) => translate(lang, text, vars);
}
export function useGuideLocale() {
  return guideLocale(useGuideLang());
}

// Layout leve do portal do guia (celular primeiro, sem Polaris/Shopify).
export const guideStyles = `
:root { --surface-color:var(--g-card); --dashboard-text:var(--g-ink); --dashboard-muted:var(--g-muted); --dashboard-accent:var(--g-green); --dashboard-border:var(--g-line); --g-bg:#f4dcdc; --g-card:#ffffff; --g-ink:#1f2933; --g-muted:#6b6264; --g-line:#ecd6d6; --g-green:#006600; --g-green-soft:#e1f1e1; --g-red:#b91c1c; --g-red-soft:#fee2e2; --g-amber:#b45309; --g-amber-soft:#fef3c7; }
@media (prefers-color-scheme: dark) { :root { --g-bg:#111614; --g-card:#1a211e; --g-ink:#e8eee9; --g-muted:#9aa5a0; --g-line:#2b3530; --g-green:#4ade80; --g-green-soft:#14361f; --g-red:#f87171; --g-red-soft:#3b1515; --g-amber:#fbbf24; --g-amber-soft:#3a2a0b; } }
* { box-sizing: border-box; }
body { margin:0; background:var(--g-bg); color:var(--g-ink); font-family: Inter, system-ui, -apple-system, "Segoe UI", sans-serif; font-size:16px; -webkit-text-size-adjust:100%; }
a { color: inherit; }
.g-wrap { max-width: 640px; margin: 0 auto; padding: max(16px, env(safe-area-inset-top)) max(16px, env(safe-area-inset-right)) max(48px, env(safe-area-inset-bottom)) max(16px, env(safe-area-inset-left)); }
.g-wrap.has-tabs { padding-bottom: calc(96px + env(safe-area-inset-bottom)); }
.g-wrap.wide { max-width: none; }
.g-tabs { position:fixed; left:0; right:0; bottom:0; z-index:50; display:flex; justify-content:center; background:var(--g-card); border-top:1px solid var(--g-line); padding:6px 8px calc(6px + env(safe-area-inset-bottom)); }
.g-tabs__inner { display:flex; gap:4px; width:100%; max-width:640px; }
.g-tab { flex:1; display:flex; flex-direction:column; align-items:center; gap:2px; padding:6px 4px; border-radius:12px; text-decoration:none; color:var(--g-muted); font-size:12px; font-weight:700; }
.g-tab svg { width:22px; height:22px; }
.g-tab__avatar { width:24px; height:24px; border-radius:50%; object-fit:cover; border:1.5px solid currentColor; }
.g-prefs { display:grid; gap:12px; }
.g-prefs h2 { margin:0 0 4px; font-size:17px; }
.g-prefs p { margin:0 0 10px; color:var(--g-muted); font-size:14px; line-height:1.45; }
.g-photo { display:flex; align-items:center; gap:14px; }
.g-photo img, .g-photo .g-photo__empty { width:72px; height:72px; border-radius:50%; object-fit:cover; flex:none; background:var(--g-green-soft); color:var(--g-green); display:grid; place-items:center; font-weight:800; font-size:24px; }
.g-langs { display:grid; grid-template-columns:repeat(auto-fill, minmax(130px, 1fr)); gap:8px; }
.g-qr { width:220px; max-width:100%; margin:4px 0 12px; padding:10px; background:#fff; border:1px solid var(--g-line); border-radius:12px; }
.g-qr svg { display:block; width:100%; height:auto; }
.g-secret { font-family:ui-monospace, Menlo, monospace; font-size:15px; letter-spacing:.08em; word-break:break-all; background:var(--g-bg); padding:10px; border-radius:10px; }
.g-steps { margin:0 0 10px; padding-left:20px; color:var(--g-ink); font-size:14px; line-height:1.55; }
.g-ico { width:18px; height:18px; flex:none; vertical-align:-3px; }
.g-periods { display:flex; gap:6px; overflow-x:auto; padding-bottom:4px; margin-bottom:12px; scrollbar-width:none; }
.g-chip { flex:none; min-height:36px; padding:6px 14px; border-radius:999px; border:1px solid var(--g-line); background:var(--g-card); color:var(--g-ink); font:inherit; font-size:14px; font-weight:600; cursor:pointer; }
.g-chip.on { background:var(--g-green); border-color:var(--g-green); color:#fff; }
.g-range { display:grid; gap:10px; }
.g-tab.active { color:var(--g-green); background:var(--g-green-soft); }
.g-cl { border:1px solid var(--g-line); border-radius:12px; padding:10px; margin-top:10px; }
.g-cl.mine { border-color:var(--g-green); }
.g-cl h3 { font-size:14px; margin:0 0 6px; display:flex; justify-content:space-between; gap:8px; overflow-wrap:anywhere; }
.g-cl h3 small { color:var(--g-muted); font-weight:600; white-space:nowrap; }
.g-cl-people { margin:-2px 0 6px; font-size:13px; font-weight:700; color:var(--g-green); }
.g-cl-row { display:flex; flex-wrap:wrap; align-items:flex-start; column-gap:6px; border-top:1px solid var(--g-line); }
.g-cl-row .g-cl-item { border-top:0; flex:1 1 auto; min-width:0; }
.g-cl-row > form { flex:1 1 210px; min-width:0; display:flex; }
.g-cl-side { display:flex; align-items:center; flex-wrap:wrap; justify-content:flex-end; gap:6px; padding:8px 0; margin-left:auto; }
@media (max-width: 520px) { .g-cl-side { padding:0 0 10px 34px; margin-left:0; justify-content:flex-start; flex-wrap:nowrap; } .g-cl-side { gap:5px; } .g-cl-side .g-phone-chip { min-width:0; padding:5px 8px; font-size:12px; } .g-cl-side .g-noshow { padding:5px 9px; } }
@media (max-width: 400px) { .g-cl-side { padding-left:0; } }
.g-noshow { min-height:34px; padding:5px 11px; border-radius:999px; border:1px solid var(--g-line); background:var(--g-card); color:var(--g-muted); font:inherit; font-size:12px; font-weight:700; cursor:pointer; white-space:nowrap; }
.g-noshow.on { background:var(--g-red-soft); border-color:var(--g-red); color:var(--g-red); }
.g-noshow[disabled] { opacity:.5; cursor:not-allowed; }
.g-cl-row.is-noshow .g-cl-text { color:var(--g-muted); text-decoration:line-through; text-decoration-color:var(--g-red); }
.g-phone-chip { display:inline-flex; align-items:center; gap:5px; min-height:34px; padding:5px 10px; border-radius:999px; border:1px solid color-mix(in srgb, var(--g-green) 35%, transparent); background:var(--g-green-soft); color:var(--g-green); font:inherit; font-size:13px; font-weight:700; white-space:nowrap; cursor:pointer; }
.g-phone-chip svg { width:14px; height:14px; }
.g-icon-btn { display:inline-grid; place-items:center; width:36px; height:36px; border-radius:50%; border:1px solid var(--g-line); background:var(--g-card); color:var(--g-muted); cursor:pointer; }
.g-icon-btn svg { width:18px; height:18px; }
.g-sheet-backdrop { position:fixed; inset:0; z-index:60; background:rgba(0,0,0,.38); display:flex; align-items:flex-end; justify-content:center; padding:12px; }
.g-sheet { width:100%; max-width:440px; background:var(--g-card); color:var(--g-ink); border-radius:20px; padding:14px 14px 10px; box-shadow:0 20px 50px rgba(0,0,0,.25); margin-bottom:max(8px, env(safe-area-inset-bottom)); }
.g-sheet__head { display:flex; align-items:center; justify-content:space-between; gap:10px; padding:2px 4px 10px; border-bottom:1px solid var(--g-line); margin-bottom:6px; }
.g-sheet__head strong { display:block; font-size:16px; }
.g-sheet__head small { color:var(--g-muted); font-size:13px; }
.g-sheet__item { display:flex; align-items:center; gap:12px; width:100%; min-height:48px; padding:10px 8px; border:0; border-radius:12px; background:none; color:var(--g-ink); font:inherit; font-size:15px; font-weight:600; text-align:left; text-decoration:none; cursor:pointer; }
.g-sheet__item:active, .g-sheet__item:hover { background:var(--g-green-soft); }
.g-sheet__item svg { width:20px; height:20px; color:var(--g-green); flex:none; }
.g-sheet__item.is-danger svg { color:var(--g-red); }
.g-sheet__item[disabled] { opacity:.45; cursor:not-allowed; }
.g-sheet__sep { height:1px; background:var(--g-line); margin:6px 4px; }
.g-sheet__note { margin:4px 8px 6px; font-size:12px; color:var(--g-muted); }
.g-cl-item { display:flex; align-items:flex-start; gap:10px; width:100%; text-align:left; background:none; border:0; border-top:1px solid var(--g-line); padding:10px 2px; font:inherit; font-size:15px; color:var(--g-ink); cursor:pointer; min-height:44px; }
.g-cl-item.done .g-cl-text { color:var(--g-muted); text-decoration:line-through; }
.g-plat { flex:none; margin-left:auto; align-self:center; padding:1px 7px; border-radius:6px; color:#fff; font-size:12px; font-weight:700; letter-spacing:.02em; }
.g-cl-box { flex:0 0 22px; height:22px; border-radius:6px; border:2px solid var(--g-line); display:grid; place-items:center; font-size:14px; font-weight:800; color:#fff; }
.g-cl-item.done .g-cl-box { background:var(--g-green); border-color:var(--g-green); }
.g-mentions { border-color:#0c66e4; }
.g-mentions p { margin:0 0 10px; font-size:15px; white-space:pre-wrap; overflow-wrap:anywhere; }
.g-mentions small { color:var(--g-muted); }
.g-kpis { display:grid; grid-template-columns:repeat(2, minmax(0,1fr)); gap:8px; }
.g-kpi { border:1px solid var(--g-line); border-radius:12px; padding:10px 12px; }
.g-kpi small { display:block; color:var(--g-muted); font-size:12px; font-weight:600; }
.g-kpi b { font-size:20px; font-variant-numeric:tabular-nums; }
.g-board { display:flex; gap:10px; overflow-x:auto; padding-bottom:8px; scroll-snap-type:x mandatory; -webkit-overflow-scrolling:touch; }
.g-col { flex:0 0 min(82vw, 300px); scroll-snap-align:start; background:color-mix(in srgb, var(--g-line) 45%, var(--g-bg)); border-radius:14px; padding:10px; align-self:flex-start; }
.g-col h3 { font-size:14px; margin:2px 4px 10px; display:flex; justify-content:space-between; }
.g-col h3 small { color:var(--g-muted); font-weight:600; }
.g-bcard { display:block; background:var(--g-card); border:1px solid var(--g-line); border-radius:10px; padding:10px; margin-bottom:8px; text-decoration:none; }
.g-col.support { background:color-mix(in srgb, #f4dcdc 60%, var(--g-bg)); }
.g-bcard summary { cursor:pointer; list-style:none; }
.g-bcard summary::-webkit-details-marker { display:none; }
.g-doc { display:block; margin-top:8px; color:var(--g-green); font-weight:600; font-size:14px; text-decoration:none; overflow-wrap:anywhere; }
.g-bcard__collection { font-weight:700; color:var(--g-green); }
.g-col.more { background:none; display:flex; align-items:center; }
.g-bcard.mine { border-color:var(--g-green); box-shadow:0 0 0 1px var(--g-green); }
.g-bcard__foot { display:flex; align-items:center; justify-content:space-between; gap:8px; flex-wrap:wrap; margin-top:6px; }
.g-bcard__foot small { margin-top:0; }
.g-bcard__guides { display:flex; flex-wrap:wrap; gap:6px; }
.g-bcard__guide { display:inline-flex; align-items:center; gap:5px; font-size:12px; font-weight:700; color:var(--g-ink); }
.g-bcard__guide img, .g-bcard__initials { width:26px; height:26px; border-radius:50%; object-fit:cover; flex:none; border:1px solid var(--g-line); }
.g-bcard__initials { display:inline-grid; place-items:center; background:var(--g-green-soft); color:var(--g-green); font-size:10px; font-weight:800; }
.g-card-guide { display:flex; align-items:center; gap:10px; padding:8px 0; border-top:1px solid var(--g-line); }
.g-card-guide img, .g-card-guide .g-bcard__initials { width:36px; height:36px; border-radius:50%; object-fit:cover; flex:none; }
.g-card-guide__name { flex:1; min-width:0; display:flex; flex-direction:column; gap:3px; }
.g-assign { display:grid; gap:8px; margin-top:10px; padding-top:10px; border-top:1px solid var(--g-line); }
.g-assign__langs { display:flex; flex-wrap:wrap; gap:6px; }
.g-lang-toggle { min-width:42px; min-height:34px; padding:4px 10px; border-radius:8px; border:1px solid var(--g-line); background:var(--g-card); color:var(--g-ink); font:inherit; font-size:12px; font-weight:800; cursor:pointer; }
.g-lang-toggle.on { color:#fff; }
.g-noshow.on-ok { background:var(--g-green-soft); border-color:var(--g-green); color:var(--g-green); }
.g-note-form { display:grid; gap:8px; margin-bottom:10px; }
.g-note-form textarea { font:inherit; font-size:16px; padding:10px; border-radius:12px; border:1px solid var(--g-line); background:var(--g-card); color:var(--g-ink); }
.g-note { margin:0 0 10px; font-size:14px; white-space:pre-wrap; overflow-wrap:anywhere; }
.g-note small { color:var(--g-muted); }
.g-card-checklists .pmy-board-modal__section { margin:0; }
.g-bcard__langs { display:flex; flex-wrap:wrap; gap:4px; margin:4px 0 2px; }
.g-lang { padding:1px 7px; border-radius:6px; border:1px solid transparent; color:#fff; font-size:11px; font-weight:800; letter-spacing:.03em; }
.g-bcard--edit { color:inherit; cursor:pointer; -webkit-tap-highlight-color:transparent; }
.g-bcard--edit:active { transform:scale(.99); }
.g-bcard__edit { display:inline-flex; align-items:center; gap:5px; margin-top:8px; font-size:12px; font-weight:700; color:var(--g-green); }
.g-bcard__edit svg { width:14px; height:14px; }
.g-bcard__bar { height:6px; width:44px; border-radius:99px; margin-bottom:6px; }
.g-bcard strong { display:block; font-size:14px; overflow-wrap:anywhere; }
.g-bcard small { display:block; color:var(--g-muted); font-size:12px; margin-top:4px; overflow-wrap:anywhere; }
.g-bcard pre { white-space:pre-wrap; font:inherit; font-size:13px; margin:6px 0 0; color:var(--g-ink); }
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
.g-dep__guides { display:flex; flex-wrap:wrap; align-items:center; gap:6px; margin-top:4px; }
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
.g-hint { margin:10px 0 4px; font-size:13px; color:var(--g-muted); }
.g-undo-checks { display:flex; flex-wrap:wrap; align-items:center; gap:4px 12px; margin-top:10px; font-size:13px; color:var(--g-muted); }
.g-link-btn { padding:4px 0; border:0; background:none; color:var(--g-red); font:inherit; font-size:13px; font-weight:700; text-decoration:underline; text-underline-offset:2px; cursor:pointer; }
.g-link-btn[disabled] { opacity:.5; }
.g-checks { display:grid; grid-template-columns:repeat(2, minmax(0,1fr)); gap:8px; }
@media (min-width: 560px) { .g-checks { grid-template-columns:repeat(4, minmax(0,1fr)); } }
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
.g-seats { padding:12px; border-radius:12px; border:1px solid var(--g-line); background:var(--g-bg); color:var(--g-ink); font-size:15px; font-weight:700; }
.g-seats { display:flex; align-items:baseline; justify-content:space-between; gap:10px; flex-wrap:wrap; }
.g-seats__note { font-size:12px; font-weight:600; color:var(--g-muted); }
.g-seats.is-full { border-color:var(--g-amber); background:var(--g-amber-soft); }
.g-seats.is-over { border-color:var(--g-red); background:var(--g-red-soft); color:var(--g-red); }
.g-seg { display:flex; gap:4px; padding:4px; margin-top:12px; border-radius:14px; background:var(--g-bg); }
.g-seg button { flex:1 1 0; min-height:40px; padding:8px 10px; border:0; border-radius:10px; background:transparent; color:var(--g-muted); font:inherit; font-size:14px; font-weight:700; cursor:pointer; }
.g-seg button.on { background:var(--g-card); color:var(--g-green); box-shadow:0 1px 3px rgba(0,0,0,.08); }
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
.g-field .pmy-ds-input { font-size:16px; }
.g-empty { color:var(--g-muted); font-size:14px; margin:0; }
.g-summary { display:flex; gap:16px; flex-wrap:wrap; color:var(--g-muted); font-size:14px; }
.g-summary b { color:var(--g-ink); }
`;

// Ícones de linha (minimalistas), no lugar dos emojis.
const ICONS = {
  calendar: <><rect x="3.5" y="5" width="17" height="15.5" rx="2.5" /><path d="M3.5 9.5h17M8 3v4M16 3v4" /></>,
  board: <><rect x="3.5" y="4" width="5" height="16" rx="1.5" /><rect x="9.5" y="4" width="5" height="11" rx="1.5" /><rect x="15.5" y="4" width="5" height="7" rx="1.5" /></>,
  chart: <><path d="M4 20h16" /><path d="M7 16v-5M12 16V7M17 16v-8" /></>,
  building: <><path d="M4 20.5h16M6 20.5V5.5a1.5 1.5 0 0 1 1.5-1.5h9A1.5 1.5 0 0 1 18 5.5v15" /><path d="M9.5 8h1M13.5 8h1M9.5 11.5h1M13.5 11.5h1M10.5 20.5v-4h3v4" /></>,
  user: <><circle cx="12" cy="8.5" r="3.5" /><path d="M5 20c.8-3.6 3.6-5.5 7-5.5s6.2 1.9 7 5.5" /></>,
  chat: <path d="M5 18.5 3.5 21l.3-4A8 8 0 1 1 7 19.4Z" />,
  card: <><rect x="3" y="5.5" width="18" height="13" rx="2.5" /><path d="M3 10h18M7 15h3" /></>,
  file: <><path d="M7 3.5h6.5L18 8v12.5H7z" /><path d="M13.5 3.5V8H18" /></>,
  clip: <path d="m20 11.5-7.8 7.8a4.5 4.5 0 0 1-6.4-6.4l8-8a3 3 0 0 1 4.3 4.3l-8 8a1.5 1.5 0 1 1-2.1-2.1l7.4-7.4" />,
  sms: <><path d="M4 5h16a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H9l-4 3v-3H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Z" /><path d="M8 10h.01M12 10h.01M16 10h.01" /></>,
  copy: <><rect x="9" y="9" width="11" height="11" rx="2" /><path d="M5 15V6a2 2 0 0 1 2-2h9" /></>,
  more: <><circle cx="5" cy="12" r="1.2" /><circle cx="12" cy="12" r="1.2" /><circle cx="19" cy="12" r="1.2" /></>,
  x: <path d="M6 6l12 12M18 6 6 18" />,
  userX: <><circle cx="10" cy="8" r="4" /><path d="M3 21v-1a6 6 0 0 1 10-4.5M16 16l5 5M21 16l-5 5" /></>,
  userCheck: <><circle cx="10" cy="8" r="4" /><path d="M3 21v-1a6 6 0 0 1 10-4.5M15.5 18.5 17.5 20.5 21.5 16" /></>,
  phone: <path d="M5 4h3.5l1.5 4-2 1.5a10 10 0 0 0 6.5 6.5L16 14l4 1.5V19a1.5 1.5 0 0 1-1.6 1.5C10.6 20 4 13.4 3.5 5.6A1.5 1.5 0 0 1 5 4Z" />,
  back: <path d="M15 5 8 12l7 7" />,
  check: <path d="m5 12.5 4.5 4.5L19 7.5" />,
  edit: <><path d="M4 20h4L19 9l-4-4L4 16v4Z" /><path d="M13.5 6.5l4 4" /></>,
  download: <><path d="M12 4v11M7.5 10.5 12 15l4.5-4.5" /><path d="M4.5 19.5h15" /></>,
};

export function GIcon({ name, className = "g-ico" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {ICONS[name] || null}
    </svg>
  );
}

const TABS = [
  { to: "/guia", label: "Saídas", icon: "calendar", end: true },
  { to: "/guia/quadro", label: "Quadro", icon: "board" },
  { to: "/guia/dash", label: "Dash", icon: "chart" },
];

function GuideTabs() {
  const layout = useRouteLoaderData("routes/guia");
  const t = useT();
  const person = layout?.person;
  if (!person) return null;
  return (
    <nav className="g-tabs" aria-label={t("Menu do app")}>
      <div className="g-tabs__inner">
        {TABS.map((tab) => (
          <NavLink key={tab.to} to={tab.to} end={tab.end} className={({ isActive }) => `g-tab${isActive ? " active" : ""}`}>
            <GIcon name={tab.icon} className="" />{t(tab.label)}
          </NavLink>
        ))}
        {person.isAdmin && (
          // A Central é outra tela (fora do /guia): carrega a página inteira.
          <Link to="/" reloadDocument className="g-tab">
            <GIcon name="building" className="" />{t("Central")}
          </Link>
        )}
        <NavLink to="/guia/preferencias" className={({ isActive }) => `g-tab${isActive ? " active" : ""}`}>
          {person.photo
            ? <img className="g-tab__avatar" src={person.photo} alt="" />
            : <GIcon name="user" className="" />}
          {t("Perfil")}
        </NavLink>
      </div>
    </nav>
  );
}

export function GuideShell({ children, title = "Portal do guia", wide = false, bare = false }) {
  const layout = useRouteLoaderData("routes/guia");
  // Instalar como app no Android exige um service worker (public/guia-sw.js).
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/guia-sw.js", { scope: "/guia" }).catch(() => {});
  }, []);
  const withTabs = Boolean(layout?.person);
  return (
    <>
      <title>{`${title} · Portugal, Me & You`}</title>
      <meta name="robots" content="noindex" />
      {/* Manifesto, theme-color e ícone do iPhone ficam no <head> (app/root.jsx). */}
      <style dangerouslySetInnerHTML={{ __html: guideStyles }} />
      {bare ? children : <div className={`g-wrap${withTabs ? " has-tabs" : ""}${wide ? " wide" : ""}`}>{children}</div>}
      <GuideTabs />
    </>
  );
}

export function lisbonParts(value, locale = "pt-PT") {
  const date = new Date(value);
  const fmt = (opts) => new Intl.DateTimeFormat(locale, { timeZone: "Europe/Lisbon", ...opts }).format(date);
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
