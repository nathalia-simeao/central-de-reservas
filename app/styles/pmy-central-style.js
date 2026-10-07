import { isDarkThemeColor } from "../config/pmy-central-config";

export function buildCentralStyles(theme) {
  const dashboardSurfaceIsDark = isDarkThemeColor(theme.surfaceColor || "#FFFFFF");
  const dashboardPrimaryIsDark = isDarkThemeColor(theme.primaryColor || "#006600");
  const dashboardTextIsDark = isDarkThemeColor(theme.textColor || "#2B2B2B");
  const dashboardTitleIsDark = isDarkThemeColor(theme.titleColor || "#006600");
  
  const dashboardAccent =
    dashboardSurfaceIsDark === dashboardPrimaryIsDark
      ? (dashboardSurfaceIsDark ? "#F5F5F2" : "#111111")
      : (theme.primaryColor || "#006600");
  
  const dashboardText =
    dashboardSurfaceIsDark === dashboardTextIsDark
      ? (dashboardSurfaceIsDark ? "#F5F5F2" : "#1F1F1F")
      : (theme.textColor || "#2B2B2B");
  
  const dashboardTitle =
    dashboardSurfaceIsDark === dashboardTitleIsDark
      ? (dashboardSurfaceIsDark ? "#FFFFFF" : "#111111")
      : (theme.titleColor || "#006600");

  return `
      :root {
        --bg-color:${theme.bgColor};
        --surface-color:${theme.surfaceColor || "#FFFFFF"};
        --input-bg-color:${theme.inputBgColor || "#FFFFFF"};
        --primary-green:${theme.primaryColor};
        --primary-hover:${theme.primaryColor}dd;
        --text-dark:${theme.textColor};
        --text-muted:#666666;
        --card-bg:${theme.surfaceColor || "#FFFFFF"};
        --border-radius:12px;
        --font-family:${theme.fontFamily},'sans-serif';
        --font-size:${theme.fontSize};
        --title-color:${theme.titleColor};
        --sidebar-bg:${theme.sidebarBg};
        --sidebar-text:${theme.sidebarTextColor || theme.textColor};
        --sidebar-muted:${theme.sidebarMutedTextColor || "#777777"};
        --sidebar-hover:${theme.sidebarHoverBg || "#F2F7F2"};
        --sidebar-active-bg:${theme.sidebarActiveBg || theme.primaryColor};
        --sidebar-active-text:${theme.sidebarActiveTextColor || "#FFFFFF"};
        --sidebar-border:${theme.sidebarBorderColor || "#E7ECE7"};
        --dashboard-accent:${dashboardAccent};
        --dashboard-accent-contrast:${isDarkThemeColor(dashboardAccent) ? "#FFFFFF" : "#111111"};
        --dashboard-text:${dashboardText};
        --dashboard-title:${dashboardTitle};
        --dashboard-muted:${dashboardSurfaceIsDark ? "#B8B8B3" : "#667069"};
        --dashboard-soft:${dashboardSurfaceIsDark ? "#1F1F1F" : "#F3F5F3"};
        --dashboard-soft-strong:${dashboardSurfaceIsDark ? "#292929" : "#E9EDE9"};
        --dashboard-border:${dashboardSurfaceIsDark ? "rgba(255,255,255,0.15)" : "rgba(28,47,34,0.12)"};
        --dashboard-shadow:${dashboardSurfaceIsDark ? "0 18px 45px rgba(0,0,0,0.28)" : "0 18px 45px rgba(22,44,29,0.075)"};
      }
      * { box-sizing:border-box; margin:0; padding:0; font-family:var(--font-family); font-size:var(--font-size); }
      body, html { background-color:var(--bg-color); }
      .Polaris-Page { padding:0 !important; max-width:100% !important; }
      h1.Polaris-Header-Title { display:none !important; }
      ::-webkit-scrollbar { width:6px; height:0px; }
      ::-webkit-scrollbar-thumb { background:rgba(0,0,0,0.12); border-radius:10px; }
  
      .pmy-app-container { display:flex; height:100vh; width:100vw; margin-left:-20px; overflow:hidden; }
      .pmy-sidebar { width:260px; background-color:var(--sidebar-bg); border-right:1px solid rgba(0,0,0,0.05); display:flex; flex-direction:column; box-shadow:2px 0 15px rgba(0,0,0,0.03); flex-shrink:0; }
      .pmy-logo-area { padding:30px 20px; text-align:center; border-bottom:1px solid #f0f0f0; display:flex; justify-content:center; align-items:center; min-height:180px; }
      .pmy-logo-placeholder { width:180px; height:80px; margin:0 auto; border:2px dashed #ccc; border-radius:8px; display:flex; align-items:center; justify-content:center; color:#999; font-weight:bold; }
      .pmy-logo-wrapper { position:relative; width:180px; height:140px; margin:0 auto; display:flex; justify-content:center; align-items:center; border-radius:8px; overflow:hidden; }
      .pmy-logo-image { max-width:100%; max-height:140px; object-fit:contain; }
      .pmy-menu { padding:20px 0; display:flex; flex-direction:column; gap:5px; }
      .pmy-menu-item { padding:12px 25px; margin:0 10px; border-radius:8px; cursor:pointer; color:var(--text-dark); font-weight:600; display:flex; align-items:center; gap:12px; transition:all 0.2s; }
      .pmy-menu-item:hover { background-color:#f5f5f5; }
      .pmy-menu-item.active { background-color:var(--primary-green); color:#ffffff; }
      .pmy-sidebar-footer { margin-top:auto; padding:20px; border-top:1px solid #f0f0f0; display:flex; flex-direction:column; align-items:center; gap:15px; }
      .pmy-lang-pill { display:flex; align-items:center; gap:12px; border:1px solid rgba(0,0,0,0.15); border-radius:30px; padding:8px 16px; background:transparent; user-select:none; }
      .pmy-lang-pill button { appearance:none; border:0; padding:0; margin:0; background:transparent; color:inherit; cursor:pointer; opacity:0.3; transition:0.2s ease; display:flex; align-items:center; justify-content:center; border-radius:999px; }
      .pmy-lang-pill button.active { opacity:1; transform:scale(1.1); }
      .pmy-lang-pill button:focus-visible { outline:2px solid currentColor; outline-offset:3px; }
      .pmy-flag-icon { width:24px; height:16px; object-fit:cover; border-radius:2px; box-shadow:0 1px 3px rgba(0,0,0,0.2); }
      .pmy-lang-divider { width:1px; height:18px; background:rgba(0,0,0,0.15); }
      .pmy-credit-text { font-size:12px; color:#999; text-align:center; }
      .pmy-content { flex:1; padding:40px; overflow-y:auto; height:100vh; }
      .pmy-header-top { display:flex; justify-content:space-between; align-items:center; margin-bottom:30px; }
      .pmy-page-title { font-size:28px; font-weight:800; color:var(--title-color); margin:0; }
  
      .pmy-grid { display:grid; grid-template-columns:repeat(auto-fit, minmax(210px,1fr)); gap:20px; margin-bottom:30px; }
      .pmy-card { background:var(--card-bg); border-radius:var(--border-radius); padding:22px; box-shadow:0 8px 20px rgba(0,0,0,0.04); border:1px solid rgba(0,0,0,0.02); position:relative; transition:0.2s ease; }
      .pmy-card.has-hover { cursor:pointer; }
      .pmy-card.has-hover:hover { box-shadow:0 12px 25px rgba(0,0,0,0.08); transform:translateY(-3px); }
      .pmy-card-icon { position:absolute; top:22px; right:22px; color:#ddd; transition:0.2s ease; }
      .pmy-card.has-hover:hover .pmy-card-icon { color:var(--primary-green); }
      .pmy-card-title { font-size:14px; color:var(--text-muted); font-weight:600; margin-bottom:10px; padding-right:20px; }
      .pmy-card-value { font-size:32px; font-weight:900; color:var(--primary-green); }
  
      .pmy-form-box { background:#ffffff; padding:25px; border-radius:var(--border-radius); box-shadow:0 8px 20px rgba(0,0,0,0.04); margin-bottom:25px; border:1px solid rgba(0,0,0,0.02); }
      .pmy-form-box h3 { color:var(--primary-green); margin-bottom:20px; font-weight:800; font-size:18px; border-bottom:1px solid #f5f5f5; padding-bottom:8px; }
      .pmy-form-group { display:flex; flex-direction:column; gap:6px; margin-bottom:15px; }
      .pmy-form-group label { font-size:13px; font-weight:700; color:var(--text-dark); }
      .pmy-form-input { padding:10px 14px; border:1px solid #ddd; border-radius:8px; outline:none; font-size:14px; width:100%; font-family:inherit; }
      .pmy-form-input:focus { border-color:var(--primary-green); }
      .pmy-btn-submit { background:var(--primary-green); color:#fff; font-weight:bold; border:none; padding:12px; border-radius:8px; cursor:pointer; width:100%; font-size:14px; transition:0.2s; }
      .pmy-btn-submit:hover { background:var(--primary-hover); }
  
      .pmy-calendar-view-tabs { display:flex; gap:5px; background:#eee; padding:4px; border-radius:8px; flex-shrink:0; }
      .pmy-cal-tab { padding:6px 14px; border:none; background:transparent; font-size:12px; font-weight:bold; color:#666; cursor:pointer; border-radius:6px; transition:0.2s; white-space:nowrap; }
      .pmy-cal-tab.active { background:#fff; color:var(--primary-green); box-shadow:0 2px 6px rgba(0,0,0,0.05); }
      .pmy-calendar-month-selector-bar { display:flex; align-items:center; gap:15px; margin-bottom:15px; }
      .pmy-calendar-nav-arrow-btn { background:#ffffff; border:1px solid #ddd; border-radius:50%; width:28px; height:28px; display:flex; align-items:center; justify-content:center; cursor:pointer; font-size:11px; font-weight:bold; transition:0.2s; color:var(--text-dark); }
      .pmy-calendar-nav-arrow-btn:hover { border-color:var(--primary-green); color:var(--primary-green); }
      .pmy-calendar-current-month-year-label { font-size:18px; font-weight:800; color:var(--text-dark); min-width:140px; text-align:center; }
      .pmy-calendar-week-headers { display:grid; grid-template-columns:repeat(7,1fr); gap:8px; text-align:center; font-weight:800; font-size:12px; color:var(--text-muted); margin-bottom:5px; padding:0 15px; }
      .pmy-calendar-grid { display:grid; grid-template-columns:repeat(7,1fr); gap:8px; background:#fff; padding:15px; border-radius:12px; box-shadow:0 8px 20px rgba(0,0,0,0.04); margin-bottom:25px; }
      .pmy-calendar-day { background:#fafafa; padding:14px 12px; border-radius:8px; cursor:pointer; transition:0.2s; border:1px solid #f0f0f0; color:var(--text-dark); min-height:105px; display:flex; flex-direction:column; justify-content:flex-start; gap:6px; text-align:left; position:relative; }
      .pmy-calendar-day:hover { background:#f0f0f0; border-color:var(--primary-green); }
      .pmy-calendar-day.active { background:var(--primary-green); color:#fff; border-color:var(--primary-green); }
      .pmy-cal-date-line { font-size:13px; font-weight:800; border-bottom:1px solid rgba(0,0,0,0.04); padding-bottom:3px; margin-bottom:2px; }
      .pmy-calendar-day.active .pmy-cal-date-line { border-bottom-color:rgba(255,255,255,0.15); }
      .pmy-cal-info-line { font-size:11px; font-weight:600; opacity:0.8; }
      .pmy-calendar-dot { width:6px; height:6px; background:#c99a3c; border-radius:50%; position:absolute; bottom:6px; right:8px; }
      .pmy-calendar-day.active .pmy-calendar-dot { background:#fff; }
  
      .pmy-capacity-controls { display:flex; align-items:center; gap:10px; background:#f9f9f9; padding:4px 10px; border-radius:20px; border:1px solid #eee; }
      .pmy-cap-btn { background:#fff; border:1px solid #ddd; width:26px; height:26px; border-radius:50%; font-weight:bold; cursor:pointer; display:flex; align-items:center; justify-content:center; font-size:16px; }
      .pmy-cap-btn:hover { border-color:var(--primary-green); color:var(--primary-green); }
      .pmy-tour-item { display:flex; gap:15px; padding:15px 0; border-bottom:1px solid #eee; align-items:center; justify-content:space-between; }
      .pmy-tour-item:last-child { border-bottom:none; }
      .pmy-guide-mini-tag { display:flex; align-items:center; gap:6px; background:#f5f5f5; padding:4px 10px; border-radius:20px; font-size:12px; font-weight:bold; }
      .pmy-guide-mini-img { width:18px; height:18px; border-radius:50%; object-fit:cover; }
  
      .pmy-accordion-header { appearance:none; width:100%; background:transparent; color:inherit; font:inherit; display:flex; justify-content:space-between; align-items:center; padding:15px 0; border:0; border-bottom:1px solid #eee; cursor:pointer; transition:0.2s; text-align:left; }
      .pmy-accordion-header:hover { color:var(--primary-green); }
      .pmy-accordion-title { font-size:16px; font-weight:700; }
      .pmy-accordion-content { display:none; padding:15px 0; border-bottom:1px solid #eee; }
      .pmy-accordion-content.open { display:block; }
      .pmy-tour-img { width:65px; height:65px; object-fit:cover; box-shadow:0 4px 10px rgba(0,0,0,0.08); transition:border-radius 0.3s ease; background:#eee; }
      .pmy-tour-img.circle { border-radius:50%; }
      .pmy-tour-img.rounded { border-radius:12px; }
      .pmy-tour-details { flex:1; }
      .pmy-tour-name { font-weight:bold; font-size:15px; margin-bottom:6px; color:var(--text-dark); }
      .pmy-format-btn { background:#f0f0f0; border:none; border-radius:20px; padding:6px 14px; font-size:13px; font-weight:bold; color:#555; cursor:pointer; transition:0.2s; }
      .pmy-format-btn:hover { background:#e0e0e0; color:var(--primary-green); }
      .pmy-list-item { display:flex; justify-content:space-between; align-items:center; padding:15px 0; border-bottom:1px solid #eee; }
      .pmy-list-item:last-child { border-bottom:none; }
      .pmy-tag { font-size:11px; padding:3px 8px; border-radius:10px; font-weight:700; }
      .pmy-tag.viator { background:#ffe4cc; color:#cc6600; }
      .pmy-tag.gyg { background:#fff4cc; color:#cc9900; }
      .pmy-tag.site { background:#e6f2e6; color:var(--primary-green); }
      .pmy-tag-row { display:flex; gap:6px; flex-wrap:wrap; margin-top:4px; }
  
      .pmy-date-wrapper { position:relative; z-index:101; }
      .pmy-date-btn { display:flex; align-items:center; gap:8px; background:#ffffff; border:1px solid rgba(0,0,0,0.1); padding:10px 18px; border-radius:8px; font-weight:600; color:var(--text-dark); cursor:pointer; box-shadow:0 2px 10px rgba(0,0,0,0.02); transition:0.2s; }
      .pmy-date-btn:hover { border-color:var(--primary-green); }
      .pmy-date-overlay { appearance:none; position:fixed; top:0; left:0; width:100vw; height:100vh; z-index:90; border:0; padding:0; background:transparent; }
      .pmy-date-dropdown { position:absolute; right:0; top:calc(100% + 8px); background:var(--surface-color); border-radius:16px; box-shadow:0 18px 46px rgba(0,0,0,0.16); width:min(390px,calc(100vw - 32px)); z-index:100; border:1px solid var(--pmy-border); display:flex; flex-direction:column; overflow:visible; }
      .pmy-date-presets { display:grid; grid-template-columns:1fr 1fr; gap:1px; background:var(--pmy-border); border-radius:16px 16px 0 0; overflow:hidden; }
      .pmy-date-preset-item { appearance:none; width:100%; border:0; background:var(--surface-color); padding:11px 10px; font-size:12px; font-weight:800; cursor:pointer; text-align:center; color:var(--text-dark); transition:0.2s; }
      .pmy-date-preset-item:hover { background:color-mix(in srgb,var(--primary-green) 6%,var(--surface-color)); color:var(--primary-green); }
      .pmy-date-preset-item.active { background:var(--pmy-green-soft); color:var(--primary-green); }
      .pmy-date-preset-item:focus-visible { outline:2px solid var(--primary-green); outline-offset:-3px; }
      .pmy-date-custom { padding:16px; display:flex; flex-direction:column; gap:12px; background:var(--surface-color); border-radius:0 0 16px 16px; }
      .pmy-date-custom-title { font-size:11px; font-weight:850; color:var(--text-muted); text-transform:uppercase; letter-spacing:.06em; }
      .pmy-date-custom-inputs { display:grid; grid-template-columns:minmax(0,1fr) 18px minmax(0,1fr); gap:8px; align-items:center; }
      .pmy-dashboard-date-picker { min-width:0; }
      .pmy-dashboard-date-picker .pmy-ds-date-picker__trigger { min-height:42px; border-radius:12px; background:var(--surface-color); font-size:12px; font-weight:700; }
      .pmy-dashboard-date-picker--start .pmy-ds-date-picker__popover { left:0; right:auto; }
      .pmy-dashboard-date-picker--end .pmy-ds-date-picker__popover { left:auto; right:0; }
      .pmy-date-custom-separator { display:grid; place-items:center; color:var(--text-muted); font-size:14px; font-weight:900; }
      .pmy-date-apply-btn { background:var(--primary-green); color:#fff; border:none; padding:10px 12px; min-height:40px; border-radius:10px; font-weight:800; cursor:pointer; font-size:13px; transition:0.2s; text-align:center; width:100%; }
      .pmy-date-apply-btn:hover { background:var(--primary-hover); }
      @media (max-width: 520px) {
        .pmy-date-custom-inputs { grid-template-columns:1fr; }
        .pmy-date-custom-separator { transform:rotate(90deg); }
        .pmy-dashboard-date-picker--start .pmy-ds-date-picker__popover,
        .pmy-dashboard-date-picker--end .pmy-ds-date-picker__popover {
          left:0;
          right:auto;
          width:min(340px,calc(100vw - 48px));
        }
      }
      .pmy-variants-form-grid { display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-top:5px; }
  
      .pmy-modal-layer { display:contents; }
      .pmy-modal-overlay { position:fixed; top:0; left:0; width:100vw; height:100vh; background:rgba(0,0,0,0.4); backdrop-filter:blur(4px); display:flex; justify-content:center; align-items:center; z-index:9999; }
      .pmy-modal-overlay [role="dialog"]:focus { outline:none; }
      .pmy-modal-overlay button:focus-visible,
      .pmy-modal-overlay a:focus-visible,
      .pmy-modal-overlay input:focus-visible,
      .pmy-modal-overlay select:focus-visible,
      .pmy-modal-overlay textarea:focus-visible {
        outline:2px solid var(--primary-green);
        outline-offset:2px;
      }
      .pmy-modal { background:#ffffff; width:600px; max-width:90%; max-height:85vh; border-radius:16px; display:flex; flex-direction:column; overflow:hidden; box-shadow:0 20px 50px rgba(0,0,0,0.15); }
      .pmy-modal-header { padding:20px 25px; border-bottom:1px solid #eee; display:flex; justify-content:space-between; align-items:center; }
      .pmy-modal-title { font-size:20px; font-weight:800; color:var(--primary-green); }
      .pmy-modal-close { background:none; border:none; font-size:28px; cursor:pointer; color:#999; }
      .pmy-modal-body { padding:25px; overflow-y:auto; flex:1; }
  
      .pmy-guides-grid {
        display:grid;
        grid-template-columns:repeat(6,minmax(0,1fr));
        gap:18px;
        align-items:stretch;
      }
      .pmy-guide-card-square {
        min-width:0;
        min-height:250px;
        background:#fdfdfd;
        border:1px solid #eee;
        border-radius:16px;
        padding:16px;
        display:flex;
        flex-direction:column;
        align-items:center;
        cursor:pointer;
        transition:0.2s ease;
        text-align:center;
        overflow:hidden;
      }
      .pmy-guide-card-square:hover { border-color:var(--primary-green); transform:translateY(-3px); box-shadow:0 8px 20px rgba(0,0,0,0.05); }
      .pmy-guide-square-img { width:96px; height:96px; border-radius:16px; object-fit:cover; margin-bottom:12px; background:#eee; flex-shrink:0; }
      .pmy-guide-square-name { min-height:34px; font-weight:800; font-size:14px; color:var(--text-dark); line-height:1.2; display:flex; align-items:center; justify-content:center; flex-direction:column; }
      .pmy-platform-pills { display:flex; flex-wrap:wrap; gap:7px; margin-top:6px; }
      .pmy-platform-pill { display:flex; align-items:center; gap:6px; padding:6px 12px; border-radius:20px; border:1.5px solid #e0e0e0; background:#fff; font-size:12px; font-weight:700; cursor:pointer; transition:all 0.18s; color:#666; user-select:none; }
      .pmy-platform-pill:hover { border-color:var(--primary-green); color:var(--primary-green); }
      .pmy-platform-pill.selected { background:var(--primary-green); border-color:var(--primary-green); color:#fff; }
      .pmy-platform-pill.selected-block { background:#2b2b2b; border-color:#2b2b2b; color:#fff; }
      .pmy-platform-pill.disconnected { opacity:0.35; cursor:not-allowed; }
      .pmy-platform-pill-logo { font-size:14px; line-height:1; }
      .pmy-platform-pill-check { width:14px; height:14px; border-radius:50%; background:rgba(255,255,255,0.3); display:flex; align-items:center; justify-content:center; font-size:9px; font-weight:900; flex-shrink:0; }
      .pmy-platform-count-badge { font-size:10px; background:rgba(255,255,255,0.22); padding:1px 6px; border-radius:10px; font-weight:800; }
      .pmy-guide-edit-btn { flex:1; padding:5px 0; background:#f0f8f0; border:1px solid #c5e0c5; border-radius:6px; font-size:11px; font-weight:700; color:var(--primary-green); cursor:pointer; transition:0.2s; }
      .pmy-guide-edit-btn:hover { background:var(--primary-green); color:#fff; }
      .pmy-guide-delete-btn { padding:5px 9px; background:#fff0f0; border:1px solid #fcc; border-radius:6px; font-size:13px; cursor:pointer; transition:0.2s; }
      .pmy-guide-delete-btn:hover { background:#cc0000; color:#fff; }
      .pmy-int-subtab-bar { display:flex; gap:0; background:#f0f0f0; border-radius:10px; padding:4px; margin-bottom:28px; width:fit-content; }
      .pmy-int-subtab { padding:8px 22px; border:none; background:transparent; font-size:13px; font-weight:700; color:#888; cursor:pointer; border-radius:8px; transition:0.2s; }
      .pmy-int-subtab.active { background:#fff; color:var(--primary-green); box-shadow:0 2px 8px rgba(0,0,0,0.07); }
      .pmy-prod-platform-tabs { display:flex; gap:8px; flex-wrap:wrap; margin-bottom:22px; }
      .pmy-prod-ptab { display:flex; align-items:center; gap:7px; padding:8px 16px; border-radius:20px; border:1.5px solid #ddd; background:#fff; font-size:13px; font-weight:700; cursor:pointer; transition:0.2s; color:#555; }
      .pmy-prod-ptab:hover { border-color:var(--primary-green); color:var(--primary-green); }
      .pmy-prod-ptab.active { background:var(--primary-green); color:#fff; border-color:var(--primary-green); }
      .pmy-prod-ptab.disabled { opacity:0.4; cursor:not-allowed; }
      .pmy-prod-table { width:100%; border-collapse:separate; border-spacing:0 5px; }
      .pmy-prod-table th { font-size:11px; font-weight:800; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.5px; padding:4px 14px; text-align:left; }
      .pmy-prod-row { background:#fafafa; transition:0.15s; }
      .pmy-prod-row:hover { background:#f3f3f3; }
      .pmy-prod-row td { padding:11px 14px; font-size:13px; }
      .pmy-prod-row td:first-child { border-radius:8px 0 0 8px; border-left:3px solid #e0e0e0; }
      .pmy-prod-row.active-prod td:first-child { border-left-color:var(--primary-green); }
      .pmy-prod-row td:last-child { border-radius:0 8px 8px 0; }
      .pmy-prod-status { display:inline-flex; align-items:center; gap:5px; font-size:11px; font-weight:700; padding:3px 9px; border-radius:20px; }
      .pmy-prod-status.on { background:#e6f2e6; color:var(--primary-green); }
      .pmy-prod-status.off { background:#f5f5f5; color:#aaa; }
      .pmy-prod-toggle { position:relative; width:38px; height:20px; cursor:pointer; flex-shrink:0; }
      .pmy-prod-toggle input { opacity:0; width:0; height:0; }
      .pmy-prod-toggle-slider { position:absolute; top:0; left:0; right:0; bottom:0; background:#ddd; border-radius:20px; transition:0.2s; }
      .pmy-prod-toggle-slider:before { content:''; position:absolute; width:14px; height:14px; left:3px; bottom:3px; background:#fff; border-radius:50%; transition:0.2s; }
      .pmy-prod-toggle input:checked + .pmy-prod-toggle-slider { background:var(--primary-green); }
      .pmy-prod-toggle input:checked + .pmy-prod-toggle-slider:before { transform:translateX(18px); }
  
      /* PLATAFORMAS - CARDS NOVOS */
      .pmy-int-card-v2 { background:#ffffff; border-radius:14px; padding:22px; box-shadow:0 4px 16px rgba(0,0,0,0.04); display:flex; flex-direction:column; border:1.5px solid transparent; transition:0.25s ease; position:relative; overflow:hidden; }
      .pmy-int-card-v2:hover { border-color:var(--primary-green); transform:translateY(-2px); box-shadow:0 10px 30px rgba(0,0,0,0.08); }
      .pmy-int-card-v2.connected { border-color:#b8e6b8; }
      .pmy-int-card-v2.connected::before,
      .pmy-int-card-v2.is-required::before,
      .pmy-int-card-v2.is-pending::before,
      .pmy-int-card-v2.is-configured::before,
      .pmy-int-card-v2.is-error::before {
        content:'';
        position:absolute;
        top:0;
        left:0;
        right:0;
        height:3px;
      }
      .pmy-int-card-v2.connected::before { background:var(--primary-green); }
      .pmy-int-card-v2.is-required::before,
      .pmy-int-card-v2.is-error::before { background:#d93025; }
      .pmy-int-card-v2.is-pending::before { background:#d99a00; }
      .pmy-int-card-v2.is-configured::before { background:#2f6f9f; }
      .pmy-int-status-dot { width:8px; height:8px; border-radius:50%; display:inline-block; margin-right:5px; }
      .pmy-int-status-dot.on { background:#22c55e; box-shadow:0 0 0 3px rgba(34,197,94,0.2); }
      .pmy-int-status-dot.error,
      .pmy-int-status-dot.required { background:#d93025; box-shadow:0 0 0 3px rgba(217,48,37,0.12); }
      .pmy-int-status-dot.pending { background:#d99a00; box-shadow:0 0 0 3px rgba(217,154,0,0.14); }
      .pmy-int-status-dot.configured { background:#2f6f9f; box-shadow:0 0 0 3px rgba(47,111,159,0.14); }
      .pmy-int-status-dot.off { background:#d1d5db; }
      .pmy-int-top { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:14px; }
      .pmy-int-logo-v2 { font-size:36px; line-height:1; }
      .pmy-int-sync-info { font-size:11px; color:#22c55e; font-weight:600; background:#f0fdf4; padding:3px 8px; border-radius:20px; }
      .pmy-int-name-v2 { font-size:17px; font-weight:800; color:var(--text-dark); margin-bottom:5px; }
      .pmy-int-desc-v2 { font-size:12px; color:var(--text-muted); line-height:1.4; margin-bottom:18px; flex:1; }
      .pmy-int-actions { display:flex; gap:8px; }
      .pmy-int-btn-connect { flex:1; background:var(--primary-green); color:#fff; border:none; padding:10px; border-radius:8px; font-weight:700; font-size:13px; cursor:pointer; transition:0.2s; }
      .pmy-int-btn-connect:hover { background:var(--primary-hover); }
      .pmy-int-btn-settings { background:#f5f5f5; border:1px solid #eee; color:#555; padding:10px 14px; border-radius:8px; font-size:13px; cursor:pointer; transition:0.2s; font-weight:600; }
      .pmy-int-btn-settings:hover { background:#eee; }
      .pmy-int-btn-disconnect { background:#fff0f0; border:1px solid #fcc; color:#cc0000; padding:10px 14px; border-radius:8px; font-size:12px; cursor:pointer; transition:0.2s; font-weight:600; }
      .pmy-int-btn-disconnect:hover { background:#ffe6e6; }
  
      /* MODAL DE CONEXÃO */
      .pmy-connect-modal {
        background:#fff;
        width:min(720px,95vw);
        max-width:95vw;
        max-height:min(90dvh,860px);
        border-radius:16px;
        box-shadow:0 20px 60px rgba(0,0,0,0.2);
        overflow:hidden !important;
        display:flex;
        flex-direction:column;
        position:relative;
      }
      .pmy-connect-modal::before {
        content:'';
        position:absolute;
        top:0;
        left:0;
        right:0;
        height:4px;
        z-index:5;
        background:transparent;
      }
      .pmy-connect-modal.is-status-connected::before { background:var(--primary-green); }
      .pmy-connect-modal.is-status-required::before { background:#d93025; }
      .pmy-connect-modal.is-status-pending::before { background:#d99a00; }
      .pmy-connect-modal.is-status-waiting::before { background:#2f6f9f; }
      .pmy-connect-modal__header {
        flex:0 0 auto;
        position:relative;
        z-index:2;
        background:#fff;
        border-bottom:1px solid #eef1ee;
      }
      .pmy-connect-modal__body {
        flex:1 1 auto;
        min-height:0;
        overflow-y:auto;
        overscroll-behavior:contain;
        scrollbar-gutter:stable;
        padding-top:18px;
      }
      .pmy-gyg-quick-map {
        margin-bottom:16px;
        padding:16px;
        border:1px solid #dbe9dd;
        border-radius:12px;
        background:#f7fbf7;
      }
      .pmy-gyg-quick-map__title {
        font-size:14px;
        font-weight:850;
        color:var(--primary-green);
        margin-bottom:5px;
      }
      .pmy-gyg-quick-map__hint {
        font-size:12px;
        line-height:1.45;
        color:var(--text-muted);
      }
      .pmy-gyg-product-id {
        display:flex;
        align-items:center;
        justify-content:space-between;
        gap:12px;
        margin-top:12px;
        padding:12px;
        border:1px solid #cfe3d1;
        border-radius:10px;
        background:#fff;
      }
      .pmy-gyg-product-id__meta {
        min-width:0;
        display:flex;
        flex-direction:column;
        gap:5px;
      }
      .pmy-gyg-product-id__label {
        font-size:10px;
        font-weight:800;
        color:var(--text-muted);
        text-transform:uppercase;
        letter-spacing:.04em;
      }
      .pmy-gyg-product-id__value {
        display:block;
        max-width:100%;
        overflow:auto hidden;
        white-space:nowrap;
        font-size:13px;
        font-weight:800;
        color:var(--text-dark);
      }
      .pmy-gyg-product-id__copy {
        flex:0 0 auto;
        border:1px solid var(--primary-green);
        border-radius:8px;
        background:var(--primary-green);
        color:#fff;
        padding:9px 12px;
        font:inherit;
        font-size:12px;
        font-weight:800;
        cursor:pointer;
      }
      .pmy-gyg-product-id__copy:hover { background:var(--primary-hover); }
      .pmy-gyg-option-map-card {
        margin-top:12px;
        padding:14px;
        border:1px solid #dbe9dd;
        border-radius:10px;
        background:#fff;
      }
      .pmy-connect-oauth-btn { width:100%; padding:13px; border-radius:10px; border:1.5px solid #ddd; background:#fff; font-weight:700; font-size:14px; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:10px; transition:0.2s; color:var(--text-dark); margin-bottom:10px; }
      .pmy-connect-oauth-btn:hover { border-color:var(--primary-green); background:#f5fcf5; }
  
      /* MAPEAMENTO DE CAMPOS */
      .pmy-mapping-platform-tabs { display:flex; gap:6px; flex-wrap:wrap; margin-bottom:20px; }
      .pmy-mapping-tab { padding:7px 14px; border-radius:20px; border:1.5px solid #ddd; background:#fff; font-size:12px; font-weight:700; cursor:pointer; transition:0.2s; color:#555; display:flex; align-items:center; gap:6px; }
      .pmy-mapping-tab:hover { border-color:var(--primary-green); color:var(--primary-green); }
      .pmy-mapping-tab.active { background:var(--primary-green); color:#fff; border-color:var(--primary-green); }
      .pmy-mapping-table { width:100%; border-collapse:separate; border-spacing:0 6px; }
      .pmy-mapping-table th { font-size:11px; font-weight:800; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.5px; padding:0 12px 8px; text-align:left; }
      .pmy-mapping-row { background:#fafafa; }
      .pmy-mapping-row td { padding:10px 12px; font-size:13px; }
      .pmy-mapping-row td:first-child { border-radius:8px 0 0 8px; border-left:3px solid #e8e8e8; font-weight:700; color:var(--text-dark); width:200px; }
      .pmy-mapping-row.active-conn td:first-child { border-left-color:var(--primary-green); }
      .pmy-mapping-row td:last-child { border-radius:0 8px 8px 0; }
      .pmy-mapping-field-input { width:100%; padding:7px 10px; border:1px solid #e5e5e5; border-radius:6px; font-size:12px; font-family:'Courier New',monospace; color:#333; background:#fff; outline:none; transition:0.2s; }
      .pmy-mapping-field-input:focus { border-color:var(--primary-green); background:#f5fcf5; }
      .pmy-mapping-arrow { color:#bbb; font-size:16px; padding:0 8px; text-align:center; }
      .pmy-mapping-internal-label { font-size:12px; color:#888; font-family:'Courier New',monospace; background:#f0f0f0; padding:4px 8px; border-radius:4px; display:inline-block; }
      .pmy-field-badge { display:inline-flex; align-items:center; gap:4px; font-size:10px; padding:2px 7px; border-radius:10px; font-weight:700; white-space:nowrap; }
      .pmy-field-badge.required { background:#fff0f0; color:#cc0000; }
      .pmy-field-badge.optional { background:#f0f0f0; color:#888; }
  
      /* BANCO DE MÍDIA */
      .pmy-media-filter-tabs { display:flex; gap:6px; flex-wrap:wrap; margin-bottom:20px; }
      .pmy-media-ftab { padding:6px 14px; border-radius:20px; border:1.5px solid #ddd; background:#fff; font-size:12px; font-weight:700; cursor:pointer; transition:0.2s; color:#666; }
      .pmy-media-ftab:hover { border-color:var(--primary-color); color:var(--primary-green); }
      .pmy-media-ftab.active { background:var(--primary-green); color:#fff; border-color:var(--primary-green); }
      .pmy-media-grid { display:grid; grid-template-columns:repeat(auto-fill, minmax(160px,1fr)); gap:16px; }
      .pmy-media-card { background:#fff; border:1.5px solid #eee; border-radius:12px; overflow:hidden; transition:0.2s; position:relative; cursor:pointer; }
      .pmy-media-card:hover { border-color:var(--primary-green); box-shadow:0 6px 20px rgba(0,0,0,0.08); transform:translateY(-2px); }
      .pmy-media-thumb { width:100%; height:120px; object-fit:cover; display:block; background:#f5f5f5; }
      .pmy-media-thumb-placeholder { width:100%; height:120px; background:#f5f5f5; display:flex; align-items:center; justify-content:center; font-size:32px; }
      .pmy-media-info { padding:10px 12px; }
      .pmy-media-label { font-size:12px; font-weight:700; color:var(--text-dark); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; margin-bottom:3px; }
      .pmy-media-meta { font-size:10px; color:#aaa; }
      .pmy-media-cat-badge { display:inline-block; font-size:9px; font-weight:800; padding:2px 7px; border-radius:10px; text-transform:uppercase; margin-bottom:5px; }
      .pmy-media-cat-logo { background:#e6f2e6; color:var(--primary-green); }
      .pmy-media-cat-guide { background:#e6e6f9; color:#5e35b1; }
      .pmy-media-cat-tour { background:#fff4cc; color:#cc9900; }
      .pmy-media-cat-general { background:#f0f0f0; color:#666; }
      .pmy-media-actions { position:absolute; top:8px; right:8px; display:flex; gap:5px; opacity:0; transition:0.2s; }
      .pmy-media-card:hover .pmy-media-actions { opacity:1; }
      .pmy-media-action-btn { width:28px; height:28px; border-radius:50%; border:none; cursor:pointer; display:flex; align-items:center; justify-content:center; font-size:12px; backdrop-filter:blur(4px); }
      .pmy-media-action-copy { background:rgba(255,255,255,0.9); color:#333; }
      .pmy-media-action-delete { background:rgba(255,80,80,0.9); color:#fff; }
      .pmy-upload-zone { border:2px dashed #ddd; border-radius:12px; padding:30px; text-align:center; cursor:pointer; transition:0.2s; background:#fafafa; }
      .pmy-upload-zone:hover { border-color:var(--primary-green); background:#f5fcf5; }
      .pmy-upload-progress { height:4px; background:#eee; border-radius:4px; overflow:hidden; margin-top:10px; }
      .pmy-upload-progress-bar { height:100%; background:var(--primary-green); border-radius:4px; transition:width 0.3s; }
      .pmy-media-preview-overlay { position:fixed; top:0; left:0; width:100vw; height:100vh; background:rgba(0,0,0,0.85); display:flex; align-items:center; justify-content:center; z-index:99999; cursor:zoom-out; }
      .pmy-media-preview-img { max-width:90vw; max-height:85vh; border-radius:18px; box-shadow:0 20px 60px rgba(0,0,0,0.5); }
  
      /* ===== PMY RESPONSIVE SHELL 2026 ===== */
      :root {
        --pmy-pink-soft: color-mix(in srgb, var(--bg-color) 78%, #ffffff 22%);
        --pmy-green-soft: color-mix(in srgb, var(--primary-green) 10%, #ffffff 90%);
        --pmy-border: rgba(28, 47, 34, 0.10);
        --pmy-shadow: 0 18px 45px rgba(22, 44, 29, 0.075);
        --pmy-heading-font: 'Asul', Georgia, serif;
        --pmy-ui-font: 'Inter', 'Assistant', Arial, sans-serif;
        --pmy-pill: 999px;
      }
  
      html, body {
        width:100%;
        height:100%;
        min-height:100%;
        overflow:hidden;
        background:var(--bg-color);
      }
      body { margin:0; }
      ::-webkit-scrollbar { width:8px; height:8px; }
      ::-webkit-scrollbar-thumb { background:rgba(24,55,34,0.18); border-radius:var(--pmy-pill); }
  
      .pmy-app-container {
        width:100%;
        height:100dvh;
        min-height:100dvh;
        margin:0;
        overflow:hidden;
        display:flex;
        background:var(--bg-color);
        color:var(--text-dark);
      }
  
      .pmy-sidebar {
        width:270px;
        min-height:100dvh;
        height:100dvh;
        max-height:100dvh;
        position:relative;
        top:auto;
        z-index:300;
        border-right:1px solid var(--pmy-border);
        box-shadow:none;
        transition:width .28s ease, transform .28s ease;
        overflow:visible;
        background:color-mix(in srgb, var(--sidebar-bg) 94%, transparent);
        backdrop-filter:blur(18px);
      }
      .pmy-sidebar.is-collapsed { width:88px; }
      .pmy-sidebar.is-collapsed .pmy-logo-full,
      .pmy-sidebar.is-collapsed .pmy-menu-label,
      .pmy-sidebar.is-collapsed .pmy-credit-text,
      .pmy-sidebar.is-collapsed .pmy-lang-pill { display:none; }
      .pmy-sidebar.is-collapsed .pmy-logo-mini { display:flex; }
      .pmy-sidebar.is-collapsed .pmy-menu-item { width:48px; height:48px; margin-inline:auto; padding:0; justify-content:center; border-radius:18px; }
      .pmy-sidebar.is-collapsed .pmy-sidebar-footer { padding-inline:12px; }
  
      .pmy-logo-area {
        min-height:132px;
        padding:22px 18px 16px;
        border-bottom:none;
        position:relative;
      }
      .pmy-logo-wrapper { width:176px; height:92px; border-radius:18px; }
      .pmy-logo-image { max-height:88px; }
      .pmy-logo-image.is-auto-white { filter:brightness(0) invert(1); }
      .pmy-logo-placeholder { width:172px; height:72px; border-radius:18px; }
      .pmy-logo-mini {
        display:none;
        width:48px;
        height:48px;
        align-items:center;
        justify-content:center;
        border-radius:18px;
        background:var(--primary-green);
        color:#fff;
        font-family:var(--pmy-heading-font);
        font-size:16px;
        font-weight:700;
        letter-spacing:.08em;
      }
      .pmy-sidebar-collapse {
        position:absolute;
        right:-19px;
        top:78px;
        width:40px;
        height:40px;
        border-radius:50%;
        border:2px solid var(--surface-color);
        background:var(--primary-green);
        color:#fff;
        display:flex;
        align-items:center;
        justify-content:center;
        cursor:pointer;
        box-shadow:0 10px 26px color-mix(in srgb, var(--primary-green) 28%, rgba(0,0,0,.14));
        z-index:360;
        font-size:22px;
        font-weight:900;
        line-height:1;
        transition:transform .18s ease, box-shadow .18s ease, background .18s ease;
      }
      .pmy-sidebar-collapse:hover {
        transform:scale(1.07);
        box-shadow:0 12px 30px color-mix(in srgb, var(--primary-green) 36%, rgba(0,0,0,.18));
        background:color-mix(in srgb, var(--primary-green) 88%, #000 12%);
      }
      .pmy-sidebar-collapse:focus-visible {
        outline:3px solid color-mix(in srgb, var(--primary-green) 22%, transparent);
        outline-offset:3px;
      }
  
      .pmy-menu { padding:10px 12px 18px; gap:7px; overflow-y:auto; flex:1; min-height:0; }
      .pmy-menu-item {
        appearance:none;
        border:1px solid transparent;
        width:100%;
        margin:0;
        padding:12px 14px;
        border-radius:var(--pmy-pill);
        background:transparent;
        color:var(--sidebar-text);
        font-weight:700;
        display:flex;
        align-items:center;
        gap:12px;
        text-align:left;
        cursor:pointer;
        transition:transform .18s ease, background .18s ease, color .18s ease, border-color .18s ease;
      }
      .pmy-menu-item:hover {
        background:var(--sidebar-hover);
        color:var(--sidebar-text);
        transform:translateX(2px);
      }
      .pmy-menu-item.active {
        background:var(--sidebar-active-bg);
        color:var(--sidebar-active-text);
        box-shadow:0 10px 24px color-mix(in srgb, var(--sidebar-active-bg) 18%, transparent);
      }
      .pmy-sidebar .pmy-menu-item svg { color:inherit; }
      .pmy-sidebar .pmy-menu-item:not(.active) { color:var(--sidebar-text); }
      .pmy-sidebar .pmy-menu-item:not(.active):hover { color:var(--sidebar-text); }
      .pmy-logo-placeholder {
        border-color:var(--sidebar-border);
        color:var(--sidebar-muted);
        background:color-mix(in srgb, var(--sidebar-text) 4%, transparent);
      }
      .pmy-lang-divider { background:var(--sidebar-border); }
      .pmy-sidebar-collapse {
        border-color:var(--surface-color);
        background:var(--primary-green);
        color:#fff;
      }
      .pmy-menu-icon { width:20px; height:20px; display:grid; place-items:center; flex:0 0 20px; }
      .pmy-menu-label { min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
      .pmy-sidebar-footer { padding:16px 12px 18px; gap:12px; border-top:1px solid var(--sidebar-border); }
      .pmy-sidebar-footer .pmy-menu-item { width:100%; }
      .pmy-lang-pill { border-color:var(--sidebar-border); background:color-mix(in srgb, var(--sidebar-text) 9%, transparent); color:var(--sidebar-text); }
      .pmy-credit-text { font-size:11px; color:var(--sidebar-muted); opacity:1; }
  
      .pmy-mobile-menu-btn {
        display:none;
        width:42px;
        height:42px;
        border-radius:50%;
        border:1px solid var(--pmy-border);
        background:#fff;
        color:var(--primary-green);
        align-items:center;
        justify-content:center;
        cursor:pointer;
        flex:0 0 42px;
        box-shadow:0 8px 20px rgba(24,55,34,.08);
      }
      .pmy-mobile-backdrop { display:none; }
  
      .pmy-content {
        flex:1;
        min-width:0;
        height:100dvh;
        max-height:100dvh;
        min-height:0;
        overflow-y:auto;
        overflow-x:auto;
        overscroll-behavior:contain;
        scrollbar-gutter:stable;
        padding:0;
      }
      .pmy-content-inner {
        width:100%;
        max-width:none;
        margin:0;
        padding:26px 22px 56px;
      }
      .pmy-header-top {
        min-height:72px;
        margin-bottom:24px;
        display:flex;
        justify-content:space-between;
        align-items:center;
        gap:18px;
        position:sticky;
        top:0;
        z-index:120;
        padding:10px 0;
        background:var(--bg-color);
        backdrop-filter:none;
      }
      .pmy-header-title-wrap { display:flex; align-items:center; gap:12px; min-width:0; }
      .pmy-header-copy { min-width:0; }
      .pmy-eyebrow {
        font-size:10px;
        line-height:1;
        text-transform:uppercase;
        letter-spacing:.15em;
        font-weight:800;
        color:var(--primary-green);
        opacity:.78;
        margin-bottom:7px;
      }
      .pmy-page-title {
        font-family:var(--pmy-heading-font);
        font-size:clamp(26px, 2.2vw, 38px);
        line-height:1.02;
        font-weight:700;
        color:var(--title-color);
        letter-spacing:-.025em;
      }
  
      .pmy-card,
      .pmy-form-box,
      .pmy-calendar-grid,
      .pmy-int-card-v2,
      .pmy-connect-modal,
      .pmy-modal {
        border:1px solid var(--pmy-border);
        box-shadow:var(--pmy-shadow);
      }
      .pmy-card { border-radius:22px; padding:22px; background:var(--surface-color); }
      .pmy-card.has-hover:hover { transform:translateY(-2px); box-shadow:0 22px 48px rgba(22,44,29,.11); }
      .pmy-form-box { border-radius:22px; padding:24px; background:var(--surface-color); }
      .pmy-form-box h3 {
        font-family:var(--pmy-heading-font);
        font-size:19px;
        border-bottom:none;
        padding-bottom:0;
        margin-bottom:18px;
      }
      .pmy-btn-submit,
      .pmy-format-btn,
      .pmy-date-btn,
      .pmy-int-btn-connect,
      .pmy-int-btn-settings,
      .pmy-int-btn-disconnect,
      .pmy-cal-tab,
      .pmy-prod-ptab,
      .pmy-mapping-tab,
      .pmy-media-ftab {
        border-radius:var(--pmy-pill);
      }
      .pmy-btn-submit { min-height:44px; padding:11px 20px; }
      .pmy-form-input {
        min-height:44px;
        border-radius:14px;
        border-color:rgba(30,55,38,.14);
        background:var(--input-bg-color);
        transition:border-color .18s ease, box-shadow .18s ease, background .18s ease;
      }
      .pmy-form-input:focus {
        border-color:var(--primary-green);
        box-shadow:0 0 0 3px color-mix(in srgb, var(--primary-green) 11%, transparent);
        background:#fff;
      }
  
      .pmy-grid { gap:18px; grid-template-columns:repeat(auto-fit,minmax(min(100%,240px),1fr)); }
  
      /* ===== DESKTOP TYPOGRAPHY SCALE ===== */
      .pmy-menu-item,
      .pmy-menu-label { font-size:15px; }
      .pmy-credit-text { font-size:12px; }
      .pmy-date-btn { font-size:14px; }
      .pmy-card-title { font-size:16px; }
      .pmy-form-group label { font-size:14px; }
      .pmy-form-input { font-size:15px; }
      .pmy-btn-submit { font-size:15px; }
      .pmy-cal-tab { font-size:13px; }
  
      .pmy-eyebrow { font-size:12px; }
      .pmy-kpi-label { font-size:14px; }
      .pmy-kpi-detail { font-size:13px; }
      .pmy-dashboard-status-item strong { font-size:20px; }
      .pmy-dashboard-status-item span:not(.pmy-dashboard-status-dot) { font-size:13px; }
  
      .pmy-trend-eyebrow { font-size:12px; }
      .pmy-trend-title { font-size:30px; }
      .pmy-trend-subtitle { font-size:14px; }
      .pmy-trend-granularity { font-size:13px; }
      .pmy-trend-legend span { font-size:13px; }
      .pmy-trend-axis-label { font-size:13px; }
      .pmy-trend-x-label { font-size:12px; }
      .pmy-trend-tooltip strong,
      .pmy-trend-tooltip span { font-size:12px; }
      .pmy-trend-axis-captions { font-size:12px; }
      .pmy-trend-empty strong { font-size:15px; }
      .pmy-trend-empty span { font-size:13px; }
  
      /* ===== DASHBOARD / KPI SHELL ===== */
      .pmy-dashboard { display:flex; flex-direction:column; gap:22px; }
      .pmy-dashboard-kpi-grid {
        display:grid;
        grid-template-columns:repeat(6,minmax(0,1fr));
        gap:16px;
      }
      .pmy-kpi-card {
        appearance:none;
        position:relative;
        min-width:0;
        min-height:176px;
        border:1px solid var(--pmy-border);
        border-radius:22px;
        background:var(--surface-color);
        box-shadow:var(--pmy-shadow);
        padding:18px 18px 16px;
        display:flex;
        flex-direction:column;
        align-items:flex-start;
        text-align:left;
        color:var(--text-dark);
        cursor:pointer;
        transition:transform .18s ease, box-shadow .18s ease, border-color .18s ease, background .18s ease;
      }
      .pmy-kpi-card:hover {
        transform:translateY(-2px);
        box-shadow:0 22px 48px rgba(22,44,29,.11);
        border-color:color-mix(in srgb, var(--primary-green) 24%, var(--pmy-border));
      }
      .pmy-kpi-card.is-featured {
        grid-column:span 2;
        background:
          radial-gradient(circle at 86% 12%, color-mix(in srgb, var(--primary-green) 12%, transparent) 0, transparent 8rem),
          var(--surface-color);
      }
      .pmy-kpi-topline {
        width:100%;
        display:flex;
        align-items:center;
        justify-content:space-between;
        margin-bottom:20px;
      }
      .pmy-kpi-icon {
        width:42px;
        height:42px;
        border-radius:14px;
        display:grid;
        place-items:center;
        background:var(--pmy-green-soft);
        color:var(--primary-green);
      }
      .pmy-kpi-expand { color:#9ca3af; transition:color .18s ease, transform .18s ease; }
      .pmy-kpi-card:hover .pmy-kpi-expand { color:var(--primary-green); transform:translate(1px,-1px); }
      .pmy-kpi-label {
        font-size:12px;
        text-transform:uppercase;
        letter-spacing:.075em;
        font-weight:800;
        color:var(--text-muted);
        margin-bottom:8px;
      }
      .pmy-kpi-value {
        font-family:var(--pmy-heading-font);
        font-size:clamp(26px,2vw,34px);
        line-height:1;
        font-weight:700;
        color:var(--title-color);
        letter-spacing:-.03em;
        margin-bottom:9px;
        max-width:100%;
        overflow:hidden;
        text-overflow:ellipsis;
        white-space:nowrap;
      }
      .pmy-kpi-detail {
        margin-top:auto;
        font-size:12px;
        line-height:1.4;
        color:#737a75;
      }
      .pmy-kpi-gold .pmy-kpi-icon { background:#fff7e8; color:#9a6b13; }
      .pmy-kpi-gold .pmy-kpi-value { color:#8c651c; }
      .pmy-kpi-danger .pmy-kpi-icon { background:#fff1f1; color:#b42318; }
      .pmy-kpi-danger .pmy-kpi-value { color:#b42318; }
      .pmy-kpi-neutral .pmy-kpi-icon { background:#f2f3f2; color:#444; }
  
      .pmy-dashboard-status-strip {
        display:grid;
        grid-template-columns:repeat(4,minmax(0,1fr));
        gap:1px;
        overflow:hidden;
        border:1px solid var(--pmy-border);
        border-radius:18px;
        background:var(--pmy-border);
        box-shadow:0 10px 28px rgba(22,44,29,.045);
      }
      .pmy-dashboard-status-item {
        appearance:none;
        width:100%;
        border:0;
        background:color-mix(in srgb, var(--surface-color) 96%, var(--bg-color) 4%);
        padding:12px 15px;
        display:flex;
        align-items:center;
        gap:10px;
        min-width:0;
        text-align:left;
        font:inherit;
        color:inherit;
        cursor:pointer;
        transition:background .16s ease, color .16s ease;
      }
      .pmy-dashboard-status-item:hover,
      .pmy-dashboard-status-item:focus-visible {
        background:color-mix(in srgb, var(--primary-green) 6%, var(--surface-color));
        outline:none;
      }
      .pmy-dashboard-status-item:focus-visible {
        box-shadow:inset 0 0 0 2px color-mix(in srgb, var(--primary-green) 42%, transparent);
      }
      .pmy-dashboard-status-expand {
        margin-left:auto;
        flex:0 0 auto;
        color:#9ca3af;
        transition:transform .16s ease, color .16s ease;
      }
      .pmy-dashboard-status-item:hover .pmy-dashboard-status-expand,
      .pmy-dashboard-status-item:focus-visible .pmy-dashboard-status-expand {
        color:var(--primary-green);
        transform:translateX(2px);
      }
      .pmy-dashboard-status-item > div {
        display:flex;
        flex-direction:column;
        min-width:0;
      }
      .pmy-dashboard-status-item strong {
        font-size:18px;
        line-height:1.05;
        color:var(--text-dark);
        font-weight:800;
      }
      .pmy-dashboard-status-item span:not(.pmy-dashboard-status-dot) {
        font-size:11px;
        line-height:1.35;
        color:#747a76;
        white-space:nowrap;
        overflow:hidden;
        text-overflow:ellipsis;
      }
      .pmy-dashboard-status-dot {
        width:8px;
        height:8px;
        flex:0 0 8px;
        border-radius:50%;
        background:#9ca3af;
        box-shadow:0 0 0 4px rgba(156,163,175,.12);
      }
      .pmy-dashboard-status-dot.is-good { background:#16a34a; box-shadow:0 0 0 4px rgba(22,163,74,.12); }
      .pmy-dashboard-status-dot.is-info { background:#2563eb; box-shadow:0 0 0 4px rgba(37,99,235,.11); }
      .pmy-dashboard-status-dot.is-warning { background:#d97706; box-shadow:0 0 0 4px rgba(217,119,6,.12); }
  
      .pmy-trend-card {
        position:relative;
        overflow:hidden;
        border:1px solid var(--pmy-border);
        border-radius:24px;
        background:var(--surface-color);
        box-shadow:var(--pmy-shadow);
        padding:22px 22px 16px;
      }
      .pmy-trend-header {
        display:flex;
        justify-content:space-between;
        align-items:flex-start;
        gap:18px;
        margin-bottom:8px;
      }
      .pmy-trend-eyebrow {
        font-size:11px;
        line-height:1;
        text-transform:uppercase;
        letter-spacing:.13em;
        font-weight:800;
        color:var(--primary-green);
        opacity:.74;
        margin-bottom:7px;
      }
      .pmy-trend-title {
        font-family:var(--pmy-heading-font);
        font-size:27px;
        line-height:1.05;
        color:var(--title-color);
        font-weight:700;
        margin:0 0 5px;
        letter-spacing:-.02em;
      }
      .pmy-trend-subtitle {
        font-size:12px;
        color:#737a75;
        margin:0;
      }
      .pmy-trend-meta {
        display:flex;
        align-items:flex-end;
        flex-direction:column;
        gap:9px;
      }
      .pmy-trend-granularity {
        display:inline-flex;
        align-items:center;
        min-height:30px;
        padding:6px 11px;
        border-radius:999px;
        border:1px solid color-mix(in srgb, var(--primary-green) 15%, var(--pmy-border));
        background:var(--pmy-green-soft);
        color:var(--primary-green);
        font-size:11px;
        font-weight:800;
        letter-spacing:.03em;
      }
      .pmy-trend-legend {
        display:flex;
        align-items:center;
        gap:13px;
        flex-wrap:wrap;
        justify-content:flex-end;
      }
      .pmy-trend-legend span {
        display:inline-flex;
        align-items:center;
        gap:6px;
        font-size:11px;
        color:#676e69;
        font-weight:700;
      }
      .pmy-trend-legend-bookings { color:#2f6fdb !important; }
      .pmy-trend-legend-revenue { color:var(--primary-green) !important; }
      .pmy-legend-bar {
        width:9px;
        height:9px;
        display:inline-block;
        border-radius:3px;
        background:color-mix(in srgb, #2f6fdb 30%, transparent);
        border:1px solid color-mix(in srgb, #2f6fdb 58%, transparent);
      }
      .pmy-legend-line {
        width:16px;
        height:2px;
        display:inline-block;
        border-radius:999px;
        background:var(--primary-green);
        position:relative;
      }
      .pmy-legend-line::after {
        content:'';
        width:5px;
        height:5px;
        border-radius:50%;
        background:var(--surface-color);
        border:1.5px solid var(--primary-green);
        position:absolute;
        right:3px;
        top:50%;
        transform:translateY(-50%);
      }
      .pmy-trend-chart-wrap {
        position:relative;
        width:100%;
        overflow:hidden;
        padding-top:8px;
      }
      .pmy-trend-chart {
        display:block;
        width:100%;
        height:auto;
        min-height:280px;
        overflow:visible;
      }
      .pmy-trend-gridline {
        stroke:color-mix(in srgb, var(--text-dark) 9%, transparent);
        stroke-width:1;
        stroke-dasharray:3 7;
      }
      .pmy-trend-axis-label,
      .pmy-trend-x-label {
        fill:color-mix(in srgb, var(--text-dark) 58%, transparent);
        font-size:11px;
        font-weight:700;
      }
      .pmy-trend-x-label { font-size:10px; }
      .pmy-trend-axis-label--bookings {
        fill:#2f6fdb;
      }
      .pmy-trend-axis-label--revenue {
        fill:var(--primary-green);
      }
      .pmy-trend-bar {
        fill:#2f6fdb;
        fill-opacity:.28;
        stroke:#2f6fdb;
        stroke-width:1.2;
        transition:opacity .16s ease;
      }
      .pmy-trend-booking-point {
        fill:var(--surface-color);
        stroke:#2f6fdb;
        stroke-width:2.4;
        filter:drop-shadow(0 2px 5px color-mix(in srgb, #2f6fdb 18%, transparent));
        transition:r .12s ease;
      }
      .pmy-trend-line {
        stroke:var(--primary-green);
        stroke-width:3;
        stroke-linejoin:round;
        stroke-linecap:round;
        filter:drop-shadow(0 4px 7px color-mix(in srgb, var(--primary-green) 18%, transparent));
      }
      .pmy-trend-point {
        fill:var(--surface-color);
        stroke:var(--primary-green);
        stroke-width:2.5;
        transition:r .12s ease;
      }
      .pmy-trend-hover-line {
        stroke:color-mix(in srgb, var(--primary-green) 35%, transparent);
        stroke-width:1;
        stroke-dasharray:4 5;
        pointer-events:none;
      }
      .pmy-trend-tooltip {
        position:absolute;
        top:12px;
        z-index:5;
        transform:translateX(-50%);
        min-width:150px;
        max-width:210px;
        padding:9px 11px;
        border:1px solid var(--pmy-border);
        border-radius:12px;
        background:color-mix(in srgb, var(--surface-color) 97%, transparent);
        backdrop-filter:blur(12px);
        box-shadow:0 12px 30px rgba(22,44,29,.12);
        pointer-events:none;
        display:flex;
        flex-direction:column;
        gap:3px;
      }
      .pmy-trend-tooltip strong {
        font-size:11px;
        color:var(--text-dark);
        font-weight:800;
        margin-bottom:2px;
      }
      .pmy-trend-tooltip span {
        font-size:11px;
        color:#676e69;
        font-weight:700;
      }
      .pmy-trend-axis-captions {
        display:flex;
        justify-content:space-between;
        align-items:center;
        margin-top:-6px;
        padding:0 14px 0 8px;
        font-size:10px;
        font-weight:800;
        color:#7f8581;
        text-transform:uppercase;
        letter-spacing:.08em;
      }
      .pmy-trend-axis-caption--bookings { color:#2f6fdb; }
      .pmy-trend-axis-caption--revenue { color:var(--primary-green); }
      .pmy-trend-empty {
        min-height:260px;
        display:flex;
        flex-direction:column;
        align-items:center;
        justify-content:center;
        text-align:center;
        padding:32px 20px;
        color:#8b908d;
      }
      .pmy-trend-empty-icon {
        width:58px;
        height:58px;
        border-radius:20px;
        background:var(--pmy-green-soft);
        color:var(--primary-green);
        display:grid;
        place-items:center;
        margin-bottom:14px;
      }
      .pmy-trend-empty strong {
        color:var(--text-dark);
        font-size:13px;
        margin-bottom:5px;
      }
      .pmy-trend-empty span {
        max-width:440px;
        font-size:11px;
        line-height:1.5;
      }
      .pmy-agenda-form-grid { display:grid; grid-template-columns:minmax(0,1fr) minmax(0,1fr); gap:22px; margin-bottom:28px; align-items:start; }
      .pmy-booking-meta-grid { display:grid; grid-template-columns:minmax(0,1fr) minmax(0,1fr); gap:10px; margin-bottom:14px; }
      .pmy-media-layout { display:grid; grid-template-columns:minmax(0,1fr) 320px; gap:24px; align-items:start; }
      .pmy-media-upload-panel { position:sticky; top:92px; }
      .pmy-settings-color-grid { display:grid; grid-template-columns:minmax(0,1fr) minmax(0,1fr); gap:20px; margin-top:10px; }
  
      .pmy-brand-logo-grid {
        display:grid;
        grid-template-columns:repeat(2,minmax(0,1fr));
        gap:16px;
      }
      .pmy-brand-logo-card {
        border:1px solid var(--pmy-border);
        border-radius:18px;
        padding:16px;
        background:color-mix(in srgb, var(--surface-color) 97%, var(--bg-color) 3%);
      }
      .pmy-brand-logo-card-head {
        display:flex;
        align-items:flex-start;
        justify-content:space-between;
        gap:12px;
        margin-bottom:12px;
      }
      .pmy-brand-logo-card-head > div {
        display:flex;
        flex-direction:column;
        gap:3px;
      }
      .pmy-brand-logo-card-head strong {
        color:var(--text-dark);
        font-size:13px;
        font-weight:800;
      }
      .pmy-brand-logo-card-head span {
        color:#777;
        font-size:10px;
        line-height:1.4;
      }
      .pmy-brand-logo-status {
        flex:0 0 auto;
        border-radius:999px;
        padding:4px 7px;
        background:#ecfdf3;
        color:#166534 !important;
        font-size:9px !important;
        font-weight:800;
      }
      .pmy-brand-logo-preview {
        min-height:120px;
        border-radius:16px;
        display:flex;
        align-items:center;
        justify-content:center;
        padding:18px;
        margin-bottom:12px;
        border:1px solid rgba(0,0,0,.07);
        overflow:hidden;
      }
      .pmy-brand-logo-preview.is-light {
        background:#f6f7f5;
      }
      .pmy-brand-logo-preview.is-dark {
        background:#171717;
        border-color:#2d2d2d;
      }
      .pmy-brand-logo-preview img {
        display:block;
        max-width:100%;
        max-height:82px;
        object-fit:contain;
      }
      .pmy-brand-logo-preview img.is-auto-white,
      .pmy-brand-logo-current img.is-auto-white {
        filter:brightness(0) invert(1);
      }
      .pmy-brand-logo-preview > span {
        font-size:11px;
        color:#929792;
        font-weight:700;
      }
      .pmy-brand-logo-preview.is-dark > span {
        color:#b8b8b8;
      }
      .pmy-brand-logo-actions {
        display:flex;
        align-items:center;
        gap:8px;
        flex-wrap:wrap;
      }
      .pmy-brand-logo-actions button:disabled {
        cursor:wait;
        opacity:.6;
      }
      .pmy-brand-logo-current {
        margin-top:16px;
        padding-top:16px;
        border-top:1px solid var(--pmy-border);
        display:flex;
        align-items:center;
        justify-content:space-between;
        gap:16px;
        flex-wrap:wrap;
      }
      .pmy-brand-logo-current > span {
        color:#777;
        font-size:11px;
        font-weight:700;
      }
      .pmy-brand-logo-current > div {
        width:220px;
        min-height:72px;
        border-radius:15px;
        padding:10px 14px;
        display:flex;
        align-items:center;
        justify-content:center;
        border:1px solid var(--pmy-border);
      }
      .pmy-brand-logo-current img {
        display:block;
        max-width:100%;
        max-height:54px;
        object-fit:contain;
      }
      .pmy-brand-logo-current strong {
        font-size:12px;
        color:var(--sidebar-text);
      }
      .pmy-settings-color-grid > * { min-width:0; }
      .pmy-media-filter-tabs,
      .pmy-prod-platform-tabs,
      .pmy-mapping-platform-tabs { scrollbar-width:thin; }
  
      .pmy-calendar-scroll { width:100%; overflow-x:auto; padding-bottom:6px; }
      .pmy-calendar-scroll .pmy-calendar-week-headers,
      .pmy-calendar-scroll .pmy-calendar-grid { min-width:720px; }
      .pmy-calendar-grid { border-radius:22px; }
      .pmy-calendar-day { border-radius:15px; min-height:112px; }
  
      .pmy-prod-table,
      .pmy-mapping-table { min-width:680px; }
      .pmy-form-box:has(.pmy-prod-table),
      .pmy-form-box:has(.pmy-mapping-table) { overflow-x:auto; }
  
      /* ===== DASHBOARD THEME-SAFE COLORS ===== */
      .pmy-dashboard {
        color:var(--dashboard-text);
      }
  
      .pmy-dashboard .pmy-card,
      .pmy-dashboard .pmy-kpi-card,
      .pmy-dashboard .pmy-trend-card {
        background:var(--surface-color);
        border-color:var(--dashboard-border);
        box-shadow:var(--dashboard-shadow);
        color:var(--dashboard-text);
      }
  
      .pmy-dashboard .pmy-kpi-card:hover {
        border-color:color-mix(in srgb, var(--dashboard-accent) 30%, var(--dashboard-border));
      }
  
      .pmy-dashboard .pmy-kpi-card.is-featured {
        background:
          radial-gradient(circle at 86% 12%, color-mix(in srgb, var(--dashboard-accent) 13%, transparent) 0, transparent 8rem),
          var(--surface-color);
      }
  
      .pmy-dashboard .pmy-kpi-icon,
      .pmy-dashboard .pmy-trend-empty-icon {
        background:color-mix(in srgb, var(--dashboard-accent) 11%, var(--surface-color));
        color:var(--dashboard-accent);
      }
  
      .pmy-dashboard .pmy-kpi-expand {
        color:var(--dashboard-muted);
      }
  
      .pmy-dashboard .pmy-kpi-card:hover .pmy-kpi-expand,
      .pmy-dashboard .pmy-trend-eyebrow,
      .pmy-dashboard .pmy-trend-granularity {
        color:var(--dashboard-accent);
      }
  
      .pmy-dashboard .pmy-kpi-label,
      .pmy-dashboard .pmy-kpi-detail,
      .pmy-dashboard .pmy-trend-subtitle,
      .pmy-dashboard .pmy-trend-legend span,
      .pmy-dashboard .pmy-trend-axis-captions,
      .pmy-dashboard .pmy-trend-empty,
      .pmy-dashboard .pmy-dashboard-status-item span:not(.pmy-dashboard-status-dot) {
        color:var(--dashboard-muted) !important;
      }
  
      .pmy-dashboard .pmy-kpi-value,
      .pmy-dashboard .pmy-dashboard-status-item strong,
      .pmy-dashboard .pmy-trend-empty strong {
        color:var(--dashboard-text);
      }
  
      .pmy-dashboard .pmy-trend-title,
      .pmy-dashboard .pmy-accordion-title {
        color:var(--dashboard-title);
      }
  
      .pmy-dashboard .pmy-dashboard-status-strip {
        border-color:var(--dashboard-border);
        background:var(--dashboard-border);
        box-shadow:var(--dashboard-shadow);
      }
  
      .pmy-dashboard .pmy-dashboard-status-item {
        background:color-mix(in srgb, var(--surface-color) 94%, var(--dashboard-soft) 6%);
      }
  
      .pmy-dashboard .pmy-trend-granularity {
        border-color:color-mix(in srgb, var(--dashboard-accent) 24%, var(--dashboard-border));
        background:color-mix(in srgb, var(--dashboard-accent) 10%, var(--surface-color));
      }
  
      .pmy-dashboard .pmy-legend-bar {
        background:color-mix(in srgb, var(--dashboard-accent) 28%, transparent);
        border-color:color-mix(in srgb, var(--dashboard-accent) 45%, transparent);
      }
  
      .pmy-dashboard .pmy-legend-line {
        background:var(--dashboard-accent);
      }
  
      .pmy-dashboard .pmy-legend-line::after {
        background:var(--surface-color);
        border-color:var(--dashboard-accent);
      }
  
      .pmy-dashboard .pmy-trend-gridline {
        stroke:color-mix(in srgb, var(--dashboard-text) 12%, transparent);
      }
  
      .pmy-dashboard .pmy-trend-axis-label,
      .pmy-dashboard .pmy-trend-x-label {
        fill:color-mix(in srgb, var(--dashboard-text) 65%, transparent);
      }
  
      .pmy-dashboard .pmy-trend-bar {
        fill:color-mix(in srgb, var(--dashboard-accent) 28%, transparent);
        stroke:color-mix(in srgb, var(--dashboard-accent) 48%, transparent);
      }
  
      .pmy-dashboard .pmy-trend-line {
        stroke:var(--dashboard-accent);
        filter:drop-shadow(0 4px 7px color-mix(in srgb, var(--dashboard-accent) 22%, transparent));
      }
  
      .pmy-dashboard .pmy-trend-point {
        fill:var(--surface-color);
        stroke:var(--dashboard-accent);
      }
  
      .pmy-dashboard .pmy-trend-hover-line {
        stroke:color-mix(in srgb, var(--dashboard-accent) 42%, transparent);
      }
  
      .pmy-dashboard .pmy-trend-tooltip {
        border-color:var(--dashboard-border);
        background:color-mix(in srgb, var(--surface-color) 97%, transparent);
        box-shadow:var(--dashboard-shadow);
      }
  
      .pmy-dashboard .pmy-trend-tooltip strong {
        color:var(--dashboard-text);
      }
  
      .pmy-dashboard .pmy-trend-tooltip span {
        color:var(--dashboard-muted);
      }
  
      .pmy-dashboard .pmy-accordion-header,
      .pmy-dashboard .pmy-accordion-content {
        border-color:var(--dashboard-border);
        color:var(--dashboard-text);
      }
  
      .pmy-dashboard .pmy-accordion-header:hover {
        color:var(--dashboard-accent);
      }
  
      .pmy-dashboard .pmy-tour-name {
        color:var(--dashboard-text);
      }
  
      /* ===== FINAL DESKTOP READABILITY OVERRIDES ===== */
      .pmy-app-container,
      .pmy-sidebar,
      .pmy-content,
      .pmy-dashboard,
      .pmy-dashboard button,
      .pmy-dashboard input,
      .pmy-dashboard select,
      .pmy-dashboard textarea,
      .pmy-menu-item,
      .pmy-menu-label,
      .pmy-date-btn {
        font-family:var(--pmy-ui-font) !important;
      }
  
      .pmy-page-title,
      .pmy-trend-title {
        font-family:var(--pmy-heading-font) !important;
      }
  
      .pmy-menu-item,
      .pmy-menu-label {
        font-size:15px !important;
        line-height:1.3;
      }
  
      .pmy-eyebrow,
      .pmy-trend-eyebrow {
        font-family:var(--pmy-ui-font) !important;
        font-size:12px !important;
        line-height:1.2;
      }
  
      .pmy-kpi-label {
        font-family:var(--pmy-ui-font) !important;
        font-size:14px !important;
        line-height:1.25;
        letter-spacing:.065em;
      }
  
      .pmy-kpi-value {
        font-family:var(--pmy-ui-font) !important;
        font-size:clamp(30px, 2vw, 36px) !important;
        line-height:1.05;
        font-weight:800;
      }
  
      .pmy-kpi-detail {
        font-family:var(--pmy-ui-font) !important;
        font-size:14px !important;
        line-height:1.45;
        color:#68706a;
      }
  
      .pmy-dashboard-status-strip {
        min-height:66px;
        border-radius:18px;
      }
  
      .pmy-dashboard-status-item {
        min-height:66px;
        padding:14px 18px !important;
        gap:13px;
      }
  
      .pmy-dashboard-status-item strong {
        font-family:var(--pmy-ui-font) !important;
        font-size:22px !important;
        line-height:1.05;
        font-weight:800;
      }
  
      .pmy-dashboard-status-item span:not(.pmy-dashboard-status-dot) {
        font-family:var(--pmy-ui-font) !important;
        font-size:14px !important;
        line-height:1.35;
        font-weight:500;
        color:#667069;
      }
  
      .pmy-dashboard-status-dot {
        width:10px;
        height:10px;
        flex-basis:10px;
      }
  
      .pmy-trend-subtitle {
        font-family:var(--pmy-ui-font) !important;
        font-size:14px !important;
        line-height:1.4;
      }
  
      .pmy-trend-granularity,
      .pmy-trend-legend span {
        font-family:var(--pmy-ui-font) !important;
        font-size:13px !important;
      }
  
      .pmy-trend-axis-label {
        font-family:var(--pmy-ui-font) !important;
        font-size:13px !important;
        font-weight:700;
      }
  
      .pmy-trend-x-label {
        font-family:var(--pmy-ui-font) !important;
        font-size:12px !important;
        font-weight:700;
      }
  
      .pmy-trend-axis-captions {
        font-family:var(--pmy-ui-font) !important;
        font-size:12px !important;
      }
  
      .pmy-trend-tooltip strong,
      .pmy-trend-tooltip span {
        font-family:var(--pmy-ui-font) !important;
        font-size:13px !important;
      }
  
      .pmy-date-btn {
        font-size:14px !important;
      }
  
      @media (max-width: 1380px) {
        .pmy-guides-grid { grid-template-columns:repeat(5,minmax(0,1fr)); }
      }
  
      @media (max-width: 1160px) {
        .pmy-guides-grid { grid-template-columns:repeat(4,minmax(0,1fr)); }
      }
  
      @media (max-width: 900px) {
        .pmy-guides-grid { grid-template-columns:repeat(3,minmax(0,1fr)); gap:14px; }
      }
  
      @media (max-width: 1180px) {
        .pmy-dashboard-kpi-grid { grid-template-columns:repeat(3,minmax(0,1fr)); }
        .pmy-kpi-card.is-featured { grid-column:span 2; }
        .pmy-dashboard-status-strip { grid-template-columns:repeat(2,minmax(0,1fr)); }
        .pmy-trend-card { padding:20px 18px 14px; }
        .pmy-trend-chart { min-width:760px; }
        .pmy-trend-chart-wrap { overflow-x:auto; padding-bottom:6px; }
        .pmy-content-inner { padding-inline:18px; }
        .pmy-agenda-form-grid { grid-template-columns:1fr; }
        .pmy-media-layout { grid-template-columns:1fr; }
        .pmy-media-upload-panel { position:static; }
        .pmy-grid { grid-template-columns:repeat(2,minmax(0,1fr)); }
      }
  
      @media (max-width: 980px) {
        .pmy-sidebar {
          position:fixed;
          left:0;
          top:0;
          width:min(86vw, 310px);
          transform:translateX(-104%);
          box-shadow:24px 0 70px rgba(20,45,28,.18);
        }
        .pmy-sidebar.is-collapsed { width:min(86vw, 310px); }
        .pmy-sidebar.is-collapsed .pmy-logo-full,
        .pmy-sidebar.is-collapsed .pmy-menu-label,
        .pmy-sidebar.is-collapsed .pmy-credit-text,
        .pmy-sidebar.is-collapsed .pmy-lang-pill { display:flex; }
        .pmy-sidebar.is-collapsed .pmy-logo-mini { display:none; }
        .pmy-sidebar.is-collapsed .pmy-menu-item { width:100%; height:auto; margin:0; padding:12px 14px; justify-content:flex-start; }
        .pmy-sidebar.is-mobile-open { transform:translateX(0); }
        .pmy-sidebar-collapse { display:none; }
        .pmy-mobile-menu-btn { display:flex; }
        .pmy-mobile-backdrop {
          display:block;
          position:fixed;
          inset:0;
          border:0;
          background:rgba(14,28,18,.34);
          backdrop-filter:blur(3px);
          z-index:250;
          opacity:0;
          pointer-events:none;
          transition:opacity .22s ease;
        }
        .pmy-mobile-backdrop.is-visible { opacity:1; pointer-events:auto; }
        .pmy-content-inner { padding:20px 20px 48px; }
        .pmy-header-top {
          min-height:66px;
          margin-bottom:18px;
          padding-block:8px;
        }
        .pmy-date-btn { padding:10px 14px; }
      }
  
      @media (max-width: 720px) {
        .pmy-connect-modal {
          width:calc(100vw - 20px);
          max-width:calc(100vw - 20px);
          max-height:92dvh;
        }
        .pmy-connect-modal__body { padding-inline:16px; }
        .pmy-gyg-product-id { align-items:stretch; flex-direction:column; }
        .pmy-gyg-product-id__copy { width:100%; }

        .pmy-dashboard { gap:14px; }
        .pmy-dashboard-kpi-grid { grid-template-columns:repeat(2,minmax(0,1fr)); gap:10px; }
        .pmy-kpi-card,
        .pmy-kpi-card.is-featured { grid-column:span 1; min-height:150px; border-radius:18px; padding:15px; }
        .pmy-kpi-topline { margin-bottom:14px; }
        .pmy-kpi-icon { width:38px; height:38px; border-radius:13px; }
        .pmy-kpi-value { font-size:25px; }
        .pmy-dashboard-status-strip { grid-template-columns:1fr 1fr; border-radius:16px; }
        .pmy-dashboard-status-item { padding:10px 11px; }
        .pmy-trend-header { flex-direction:column; align-items:flex-start; margin-bottom:4px; }
        .pmy-trend-meta { width:100%; align-items:flex-start; }
        .pmy-trend-legend { justify-content:flex-start; }
        .pmy-trend-title { font-size:21px; }
        .pmy-trend-card { border-radius:18px; padding:17px 14px 12px; }
        .pmy-trend-chart { min-width:680px; min-height:250px; }
        .pmy-content-inner { padding:14px 14px 38px; }
        .pmy-header-top { align-items:flex-start; }
        .pmy-header-title-wrap { flex:1; }
        .pmy-eyebrow { display:none; }
        .pmy-page-title { font-size:27px; padding-top:6px; }
        .pmy-grid { grid-template-columns:1fr; gap:12px; margin-bottom:18px; }
        .pmy-card, .pmy-form-box { border-radius:18px; padding:18px; }
        .pmy-card-value { font-size:28px; }
        .pmy-date-wrapper { flex-shrink:0; }
        .pmy-date-btn { width:42px; height:42px; overflow:hidden; padding:0; justify-content:center; font-size:0; }
        .pmy-date-btn::before { content:none; }
        .pmy-date-dropdown { position:fixed; left:14px; right:14px; top:76px; width:auto; max-height:calc(100dvh - 96px); overflow:auto; }
        .pmy-date-custom-inputs { flex-direction:column; align-items:stretch; }
        .pmy-date-custom-inputs > span { display:none; }
  
        .pmy-booking-meta-grid,
        .pmy-variants-form-grid { grid-template-columns:1fr; }
        .pmy-settings-color-grid { grid-template-columns:1fr; gap:14px; }
        .pmy-brand-logo-grid { grid-template-columns:1fr; }
        .pmy-brand-logo-current { align-items:flex-start; }
        .pmy-brand-logo-current > div { width:100%; }
        .pmy-calendar-month-selector-bar { flex-wrap:wrap; gap:8px; }
        .pmy-calendar-view-tabs { width:100%; overflow-x:auto; }
        .pmy-cal-tab { flex:0 0 auto; }
        .pmy-calendar-current-month-year-label { min-width:0; flex:1; }
        .pmy-list-item,
        .pmy-tour-item { align-items:flex-start; gap:10px; }
        .pmy-tour-item { flex-wrap:wrap; }
  
        .pmy-int-subtab-bar,
        .pmy-prod-platform-tabs,
        .pmy-mapping-platform-tabs,
        .pmy-media-filter-tabs { width:100%; overflow-x:auto; flex-wrap:nowrap; scrollbar-width:thin; padding-bottom:4px; }
        .pmy-int-subtab,
        .pmy-prod-ptab,
        .pmy-mapping-tab,
        .pmy-media-ftab { flex:0 0 auto; }
  
        .pmy-modal-overlay { align-items:flex-end; padding:0; }
        .pmy-modal,
        .pmy-connect-modal {
          width:100%;
          max-width:100%;
          max-height:92dvh;
          border-radius:24px 24px 0 0;
        }
        .pmy-modal-header { padding:18px; }
        .pmy-modal-body { padding:18px; }
        .pmy-guides-grid { grid-template-columns:repeat(2,minmax(0,1fr)); gap:12px; }
        .pmy-media-grid { grid-template-columns:repeat(2,minmax(0,1fr)); gap:10px; }
        .pmy-media-thumb, .pmy-media-thumb-placeholder { height:110px; }
      }
  

      .pmy-ds-connection-state.is-required { color:#b42318; }
      .pmy-ds-connection-state.is-pending { color:#9a6700; }
      .pmy-ds-connection-state.is-configured { color:#245b83; }
      .pmy-int-connection-note.is-waiting {
        border-color:color-mix(in srgb, #2f6f9f 24%, transparent);
        background:color-mix(in srgb, #2f6f9f 8%, #fff);
        color:#245b83;
      }

      @media (max-width: 430px) {
        .pmy-dashboard-kpi-grid { grid-template-columns:1fr; }
        .pmy-dashboard-status-strip { grid-template-columns:1fr; }
        .pmy-kpi-card { min-height:138px; }
        .pmy-content-inner { padding-inline:10px; }
        .pmy-header-top { gap:8px; }
        .pmy-page-title { font-size:24px; }
        .pmy-mobile-menu-btn, .pmy-date-btn { width:40px; height:40px; flex-basis:40px; }
        .pmy-card, .pmy-form-box { padding:16px; }
        .pmy-guides-grid, .pmy-media-grid { grid-template-columns:1fr; }
        .pmy-platform-pill { padding-inline:10px; }
      }
    `;
}

