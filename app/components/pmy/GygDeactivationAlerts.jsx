import { useCallback, useEffect, useMemo, useState } from "react";

export default function GygDeactivationAlerts({ lang = "pt" }) {
  const [alerts, setAlerts] = useState([]);
  const [open, setOpen] = useState(false);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const tr = (pt, en) => lang === "en" ? en : pt;

  const api = useCallback(async (form = null) => {
    const current = new URL(window.location.href);
    const target = new URL("/api/gyg-notification-alerts", current.origin);
    for (const key of ["shop", "host", "embedded"]) {
      const value = current.searchParams.get(key);
      if (value) target.searchParams.set(key, value);
    }
    const headers = { Accept: "application/json" };
    try {
      const token = await window.shopify?.idToken?.();
      if (token) headers.Authorization = `Bearer ${token}`;
    } catch { /* App Bridge may add authentication */ }
    const response = await fetch(target.pathname + target.search, {
      method: form ? "POST" : "GET",
      body: form,
      headers,
      credentials: "include",
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const payload = await response.json();
    if (!payload.success) throw new Error(payload.error || "REQUEST_FAILED");
    return payload;
  }, []);

  const refresh = useCallback(async () => {
    try {
      const data = await api();
      setAlerts(Array.isArray(data.alerts) ? data.alerts : []);
      setError("");
    } catch {
      setError(tr("Não foi possível carregar os avisos.", "Could not load notifications."));
    }
  }, [api, lang]);

  useEffect(() => { refresh(); }, [refresh]);
  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (event) => { if (event.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  // Multiple notifications for the same product are one operational alert.
  const groups = useMemo(() => {
    const map = new Map();
    for (const alert of alerts) {
      const key = alert.productId || alert.id;
      if (!map.has(key)) map.set(key, { ...alert, ids: [], unread: false, occurrences: 0 });
      const group = map.get(key);
      group.ids.push(alert.id);
      group.unread ||= !alert.read;
      group.occurrences++;
    }
    return [...map.values()];
  }, [alerts]);

  const unread = groups.filter((group) => group.unread).length;

  const change = async (group, action) => {
    if (working) return;
    setWorking(true);
    try {
      const form = new FormData();
      form.set("_action", action);
      form.set("ids", group.ids.join(","));
      await api(form);
      await refresh();
    } catch {
      setError(tr("Não foi possível salvar. Tente novamente.", "Could not save. Please retry."));
    } finally {
      setWorking(false);
    }
  };

  return (
    <>
      <button type="button" className="pmy-date-btn"
        aria-label={tr(`Notificações GetYourGuide: ${unread} não lidas`, `GetYourGuide notifications: ${unread} unread`)}
        title={tr("Notificações", "Notifications")}
        onClick={() => setOpen(true)}
        style={{ position: "relative", width: 42, height: 42, minWidth: 42, maxWidth: 42, flex: "0 0 42px", padding: 0, display: "inline-flex", alignItems: "center", justifyContent: "center", borderRadius: "50%" }}>
        <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/>
        </svg>
        {unread > 0 && <span style={{ position:"absolute", top:-5, right:-5, minWidth:17, height:17, padding:"0 4px", background:"#b42318", color:"#fff", borderRadius:20, fontSize:10, display:"grid", placeItems:"center" }}>{unread}</span>}
      </button>
      {open && (
        <div role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) setOpen(false); }}
          style={{ position:"fixed", inset:0, zIndex:9999, background:"rgba(0,0,0,.42)", display:"grid", placeItems:"center", padding:16 }}>
          <section role="dialog" aria-modal="true" aria-label={tr("Notificações", "Notifications")}
            style={{ width:"min(100%, 560px)", maxHeight:"80vh", overflowY:"auto", borderRadius:16, padding:22, background:"var(--pmy-surface, #fff)", color:"var(--pmy-text, #212121)", boxShadow:"0 20px 60px #0003" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", gap:12 }}>
              <h2 style={{ margin:0, fontSize:20 }}>{tr("Notificações", "Notifications")}</h2>
              <button type="button" className="pmy-date-btn" onClick={() => setOpen(false)} aria-label={tr("Fechar", "Close")}>✕</button>
            </div>
            <p style={{ opacity:.7, fontSize:13 }}>{tr("Avisos recebidos do GetYourGuide. Confirme o estado dos produtos no portal antes de agir.", "GetYourGuide notices. Verify product status in the portal before taking action.")}</p>
            {error && <p role="alert">{error}</p>}
            {groups.length === 0 ? <p>{tr("Nenhuma notificação.", "No notifications.")}</p> : groups.map((group) => (
              <div key={group.productId || group.id} style={{ borderTop:"1px solid #ddd5", padding:"14px 0", opacity:group.unread?1:.7 }}>
                <strong>{group.tourTitle || group.productId}</strong>
                <div style={{ fontSize:13, marginTop:4 }}>{tr("Aviso de desativação recebido. Verifique no GetYourGuide.", "Deactivation notice received. Verify on GetYourGuide.")}</div>
                <div style={{ fontSize:12, opacity:.7, marginTop:4 }}>
                  {group.occurrences > 1 ? `${group.occurrences} ${tr("ocorrências", "occurrences")} · ` : ""}
                  {group.receivedAt ? new Date(group.receivedAt).toLocaleString(lang==="en"?"en-GB":"pt-PT") : ""}
                </div>
                <div style={{ display:"flex", flexWrap:"wrap", gap:8, marginTop:10 }}>
                  {group.unread && <button type="button" className="pmy-date-btn" disabled={working} onClick={() => change(group,"read")}>{tr("Marcar como lida", "Mark as read")}</button>}
                  <button type="button" className="pmy-date-btn" disabled={working} onClick={() => change(group,"dismiss")}>{tr("Excluir da lista", "Remove from list")}</button>
                </div>
              </div>
            ))}
          </section>
        </div>
      )}
    </>
  );
}
