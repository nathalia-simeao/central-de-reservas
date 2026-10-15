import { useEffect, useState } from "react";

export default function GygDeactivationAlerts({ lang = "pt" }) {
  const [result, setResult] = useState({ loading: true, alerts: [], error: "" });
  const translate = (pt, en) => lang === "en" ? en : pt;

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
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
        } catch { /* App Bridge may inject authentication */ }
        const response = await fetch(target.pathname + target.search, {
          credentials: "include", headers,
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        if (!data.success || !Array.isArray(data.alerts)) throw new Error("INVALID_RESPONSE");
        if (active) setResult({ loading: false, alerts: data.alerts, error: "" });
      } catch (error) {
        if (active) setResult({ loading: false, alerts: [], error: error.message });
      }
    };
    load();
    return () => { active = false; };
  }, []);

  if (result.loading) return null;
  return (
    <section aria-label={translate("Alertas GetYourGuide", "GetYourGuide alerts")}
      style={{ marginBottom: 20, padding: 16, border: "1px solid var(--pmy-border, #d7dde2)", borderRadius: 12 }}>
      <h2 style={{ margin: "0 0 8px", fontSize: 17 }}>
        {translate("Alertas de desativação · GetYourGuide", "Deactivation alerts · GetYourGuide")}
      </h2>
      {result.error ? (
        <p role="status">{translate("Não foi possível carregar as notificações. Tente reabrir a Central.", "Could not load notifications. Reopen Central to retry.")} ({result.error})</p>
      ) : result.alerts.length === 0 ? (
        <p>{translate("Nenhuma notificação de desativação recebida.", "No deactivation notifications received.")}</p>
      ) : (
        <>
          <p role="status">{result.alerts.length} {translate("notificações registradas (últimas 30)", "recorded notifications (latest 30)")}</p>
          <ul style={{ margin: 0, paddingLeft: 20 }}>
            {result.alerts.map((alert) => (
              <li key={alert.id} style={{ marginBottom: 10 }}>
                <strong>{alert.tourTitle || alert.productId}</strong>{" · "}
                {translate("Produto desativado na GYG; verificar no portal antes de tomar providências.", "Product deactivated on GYG; verify in the portal before taking action.")}
                <div style={{ fontSize: 12, opacity: .7 }}>
                  {alert.tourTitle ? alert.productId + " · " : ""}
                  {alert.receivedAt ? new Date(alert.receivedAt).toLocaleString(lang === "en" ? "en-GB" : "pt-PT") : ""}
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
