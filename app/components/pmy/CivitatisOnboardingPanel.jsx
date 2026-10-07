import { Button, Icon } from "./PmyUI";

export default function CivitatisOnboardingPanel({
  error,
  lang,
  loading,
  onRefresh,
  status,
}) {
  const tr = (pt, en) => (lang === "en" ? en : pt);

  const evidenceRows = [
    ["credentials", tr("Token configurado", "Token configured")],
    ["testEnvironment", tr("Ambiente de teste", "Test environment")],
    ["authenticatedTraffic", tr("Tráfego autenticado real", "Real authenticated traffic")],
    ["products", tr("Catálogo de produtos", "Product catalog")],
    ["availability", "Availability"],
    ["reserve", tr("Reserva / hold", "Reservation / hold")],
    ["confirm", tr("Confirmação", "Confirmation")],
    ["cancel", tr("Cancelamento", "Cancellation")],
  ];

  return (
    <div className="pmy-u-mt-4">
      <div className="pmy-ds-state-panel">
        <div className="pmy-ds-state-title">
          {tr("Implantação Civitatis · Operator API", "Civitatis Operator API rollout")}
        </div>
        <div className="pmy-ds-state-text">
          {tr(
            "Aqui a lógica é inversa da Viator: a Civitatis chamará a API da PMY. Nós geramos o token, configuramos o ambiente e entregamos essas credenciais à equipa de Product Operations durante o onboarding.",
            "This works in the opposite direction from Viator: Civitatis calls the PMY API. We generate the token, configure the environment, and provide those credentials to Product Operations during onboarding.",
          )}
        </div>

        <div className="pmy-ds-list-plain pmy-u-mt-3">
          <div className="pmy-ds-list-plain__row">
            <span>{tr("Ambiente atual", "Current environment")}</span>
            <strong>{status?.environment || "test"}</strong>
          </div>
          <div className="pmy-ds-list-plain__row">
            <span>{tr("Produtos PMY prontos", "PMY products ready")}</span>
            <strong>{status?.readyTours || 0}/{status?.activeTours || 0}</strong>
          </div>
          <div className="pmy-ds-list-plain__row">
            <span>{tr("Pricing", "Pricing")}</span>
            <strong>{status?.pricingConfigured ? tr("configurado", "configured") : tr("pendente de acordo comercial", "pending commercial setup")}</strong>
          </div>
          <div className="pmy-ds-list-plain__row">
            <span>Pickups</span>
            <strong>{status?.pickupsConfigured ? tr("configurado", "configured") : tr("não habilitado", "not enabled")}</strong>
          </div>
          <div className="pmy-ds-list-plain__row">
            <span>{tr("Reservas Civitatis na Central", "Civitatis bookings in Central")}</span>
            <strong>
              {(status?.bookingCounts?.confirmed || 0)} {tr("confirmadas", "confirmed")}
              {" · "}
              {(status?.bookingCounts?.pending || 0)} holds
              {" · "}
              {(status?.bookingCounts?.canceled || 0)} {tr("canceladas", "canceled")}
            </strong>
          </div>
        </div>
      </div>

      <div className="pmy-u-mt-4">
        <div className="pmy-ds-state-title pmy-u-mb-2">
          {tr("Checklist do onboarding", "Onboarding checklist")}
        </div>
        <div className="pmy-ds-list-plain">
          {evidenceRows.map(([key, label]) => {
            const ok = Boolean(status?.evidence?.[key]);
            return (
              <div className="pmy-ds-list-plain__row" key={key}>
                <span className="pmy-ds-list-plain__title">
                  <Icon name={ok ? "check" : "clock"} size={16} />
                  {label}
                </span>
                <span className={"pmy-tag " + (ok ? "is-success" : "")}>
                  {ok ? tr("verificado", "verified") : tr("pendente", "pending")}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="pmy-u-mt-4">
        <div className="pmy-ds-state-title pmy-u-mb-2">
          {tr("Endpoints Operator API", "Operator API endpoints")}
        </div>
        <div className="pmy-ds-list-plain">
          {(status?.endpoints || []).map((endpoint) => (
            <div className="pmy-ds-list-plain__row pmy-civitatis-endpoint-row" key={endpoint.key}>
              <div className="pmy-civitatis-endpoint-main">
                <strong className="pmy-civitatis-endpoint-label">{endpoint.label}</strong>
                <span className="pmy-ds-list-item__description pmy-civitatis-endpoint-meta">
                  {endpoint.method}{endpoint.verified ? " · " + tr("verificado", "verified") : ""}
                </span>
                <code className="pmy-ds-code-note pmy-civitatis-endpoint-url">{endpoint.url}</code>
              </div>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                icon="copy"
                className="pmy-civitatis-endpoint-copy"
                onClick={() => navigator.clipboard?.writeText(endpoint.url)}
              >
                {tr("Copiar", "Copy")}
              </Button>
            </div>
          ))}
        </div>
      </div>

      <div className="pmy-u-mt-4">
        <div className="pmy-ds-state-title pmy-u-mb-2">
          {tr("Produtos disponíveis para o teste", "Products available for testing")}
        </div>
        <div className="pmy-ds-state-text pmy-u-mb-2">
          {tr(
            "A Civitatis usa o productId devolvido pela nossa API. A opção padrão publicada pela Central é STANDARD.",
            "Civitatis uses the productId returned by our API. The default option published by the Central is STANDARD.",
          )}
        </div>
        <div className="pmy-ds-list-plain">
          {(status?.localProducts || []).filter((product) => product.ready).map((product) => (
            <div className="pmy-ds-list-plain__row pmy-civitatis-product-row" key={product.id}>
              <div className="pmy-civitatis-product-main">
                <strong className="pmy-civitatis-product-label">{product.title}</strong>
                <span className="pmy-ds-list-item__description pmy-civitatis-product-meta">
                  {product.optionId} · {(product.scheduleSlots || []).join(", ")} · {(product.categories || []).join(", ")}
                </span>
                <code className="pmy-ds-code-note pmy-civitatis-product-id">{product.id}</code>
              </div>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                icon="copy"
                className="pmy-civitatis-product-copy"
                onClick={() => navigator.clipboard?.writeText(product.id)}
              >
                {tr("Copiar ID", "Copy ID")}
              </Button>
            </div>
          ))}
        </div>
      </div>

      <div className="pmy-ds-actions pmy-u-mt-4">
        <Button
          type="button"
          variant="secondary"
          icon="refresh"
          onClick={onRefresh}
          disabled={loading}
        >
          {loading ? tr("Atualizando...", "Refreshing...") : tr("Atualizar diagnóstico", "Refresh diagnostics")}
        </Button>
      </div>

      {error ? (
        <div className="pmy-ds-inline-message is-danger pmy-u-mt-2">{error}</div>
      ) : null}
    </div>
  );
}
