import { useMemo, useState } from "react";
import { Button, DropdownSelect, Icon } from "./PmyUI";

export default function ViatorOnboardingPanel({
  catalog,
  error,
  lang,
  loading,
  mappingBusy,
  onConnectMapping,
  onDisconnectMapping,
  onRefresh,
  status,
}) {
  const [localSelections, setLocalSelections] = useState({});
  const tr = (pt, en) => lang === "en" ? en : pt;

  const localOptions = useMemo(
    () =>
      (status?.localTours || [])
        .filter((tour) => tour.ready)
        .map((tour) => ({
          value: tour.id,
          label: tour.title,
          meta: [
            (tour.scheduleSlots || []).join(", "),
            (tour.categories || []).join(", "),
          ].filter(Boolean).join(" · "),
        })),
    [status],
  );

  const products = Array.isArray(catalog?.products) ? catalog.products : [];
  const mappings = products.flatMap((product) =>
    (product.mappings || []).map((mapping) => ({
      ...mapping,
      productCode: product.productCode,
      productName: product.productName,
      productStatus: product.productStatus,
    })),
  );

  const evidenceRows = [
    ["credentials", tr("Credencial + Supplier ID", "Credentials + Supplier ID")],
    ["authenticatedTraffic", tr("Tráfego autenticado real", "Real authenticated traffic")],
    ["tourList", "Tour List"],
    ["calendar", "Calendar v2"],
    ["availabilityCheck", "Availability Check v2"],
    ["reserve", "Reserve v2"],
    ["booking", "Booking"],
    ["amendment", "Booking Amendment"],
    ["cancellation", "Booking Cancellation"],
  ];

  return (
    <div className="pmy-u-mt-4">
      <div className="pmy-ds-state-panel">
        <div className="pmy-ds-state-title">
          {tr("Implantação Viator Supplier API", "Viator Supplier API rollout")}
        </div>
        <div className="pmy-ds-state-text">
          {tr(
            "A Central expõe os endpoints chamados pela Viator e usa a API v2 da Viator para consultar e conectar os mapeamentos de produto.",
            "The Central exposes the endpoints called by Viator and uses Viator v2 APIs to retrieve and connect product mappings.",
          )}
        </div>

        <div className="pmy-ds-list-plain pmy-u-mt-3">
          <div className="pmy-ds-list-plain__row">
            <span>{tr("Supplier ID", "Supplier ID")}</span>
            <strong>{status?.supplierId || tr("pendente", "pending")}</strong>
          </div>
          <div className="pmy-ds-list-plain__row">
            <span>{tr("Tours PMY prontos", "PMY tours ready")}</span>
            <strong>{status?.readyTours || 0}/{status?.activeTours || 0}</strong>
          </div>
          <div className="pmy-ds-list-plain__row">
            <span>{tr("Tours com código Viator salvo", "Tours with saved Viator code")}</span>
            <strong>{status?.localMappedTours || 0}</strong>
          </div>
          <div className="pmy-ds-list-plain__row">
            <span>{tr("Reservas Viator na Central", "Viator bookings in Central")}</span>
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
          {tr("Checklist técnico", "Technical checklist")}
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
          {tr("Endpoints para cadastrar/testar na Viator", "Endpoints to register/test with Viator")}
        </div>
        <div className="pmy-ds-list-plain">
          {(status?.endpoints || []).map((endpoint) => (
            <div className="pmy-ds-list-plain__row" key={endpoint.key}>
              <span>
                <strong>{endpoint.label}</strong>
                <span className="pmy-ds-list-item__description">
                  {endpoint.method} · {endpoint.version}
                  {endpoint.verified ? " · " + tr("verificado", "verified") : ""}
                </span>
                <code className="pmy-ds-code-note">{endpoint.url}</code>
              </span>
              <button
                type="button"
                className="pmy-btn-secondary pmy-ds-compact-action"
                onClick={() => navigator.clipboard?.writeText(endpoint.url)}
              >
                {tr("Copiar", "Copy")}
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="pmy-u-mt-4">
        <div className="pmy-ds-actions">
          <Button
            type="button"
            variant="secondary"
            icon="refresh"
            onClick={onRefresh}
            disabled={loading || !status?.credentialsConfigured}
          >
            {loading
              ? tr("Consultando Viator...", "Checking Viator...")
              : tr("Consultar catálogo e mapeamentos", "Load catalog & mappings")}
          </Button>
        </div>

        {!status?.credentialsConfigured ? (
          <div className="pmy-ds-inline-message is-warning pmy-u-mt-2">
            {tr(
              "Salve primeiro a API Key e o Supplier ID acima. Depois consultaremos o catálogo real da Viator.",
              "Save the API Key and Supplier ID above first. Then we can load the real Viator catalog.",
            )}
          </div>
        ) : null}

        {error ? (
          <div className="pmy-ds-inline-message is-danger pmy-u-mt-2">{error}</div>
        ) : null}
      </div>

      {catalog ? (
        <div className="pmy-u-mt-4">
          <div className="pmy-ds-state-title pmy-u-mb-2">
            {tr("Produtos/opções Viator", "Viator products/options")}
          </div>
          <div className="pmy-ds-state-text pmy-u-mb-3">
            {tr(
              "Cada opção Viator é conectada ao productOptionId da PMY publicado pelo Tour List.",
              "Each Viator option is connected to the PMY productOptionId published by Tour List.",
            )}
          </div>

          {mappings.length === 0 ? (
            <div className="pmy-ds-state-panel is-warning">
              <div className="pmy-ds-state-title is-warning">
                {tr(
                  "Nenhum produto retornado pela API de mapeamento.",
                  "No products returned by the mapping API.",
                )}
              </div>
            </div>
          ) : mappings.map((mapping) => {
            const key = String(mapping.productCode || "") + ":" + String(mapping.tourGradeCode || "");
            const mappingStatus = String(mapping.mappingStatus || "");
            const mapped =
              mappingStatus.toLowerCase() === "mapped" &&
              Boolean(mapping.productOptionId);
            const busy = mappingBusy === key;

            return (
              <div className="pmy-ds-panel-soft pmy-u-mb-3" key={key}>
                <div className="pmy-ds-actions pmy-ds-justify-between">
                  <div>
                    <strong>{mapping.productName}</strong>
                    <div className="pmy-ds-list-item__description">
                      {mapping.productCode} · {mapping.tourGradeName || mapping.tourGradeCode}
                      {" · "}{mapping.productStatus}
                    </div>
                  </div>
                  <span className={"pmy-tag " + (mapped ? "is-success" : "")}>
                    {mappingStatus || tr("Sem status", "No status")}
                  </span>
                </div>

                {mapped ? (
                  <div className="pmy-u-mt-3">
                    <div className="pmy-ds-code-note">
                      productOptionId PMY: <strong>{mapping.productOptionId}</strong>
                    </div>
                    <div className="pmy-ds-actions pmy-u-mt-2">
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() =>
                          onDisconnectMapping({
                            key,
                            productOptionId: mapping.productOptionId,
                            productCode: mapping.productCode,
                            tourGradeCode: mapping.tourGradeCode,
                          })
                        }
                        disabled={busy}
                      >
                        {busy
                          ? tr("Processando...", "Processing...")
                          : tr("Desconectar mapeamento", "Disconnect mapping")}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="pmy-u-mt-3">
                    <DropdownSelect
                      value={localSelections[key] || ""}
                      onChange={(value) =>
                        setLocalSelections((current) => ({
                          ...current,
                          [key]: value,
                        }))
                      }
                      placeholder={tr("Selecione o tour PMY", "Select PMY tour")}
                      searchable
                      searchPlaceholder={tr("Pesquisar tour...", "Search tour...")}
                      options={localOptions}
                    />
                    <div className="pmy-ds-actions pmy-u-mt-2">
                      <Button
                        type="button"
                        variant="primary"
                        size="sm"
                        onClick={() =>
                          onConnectMapping({
                            key,
                            productOptionId: localSelections[key],
                            productCode: mapping.productCode,
                            tourGradeCode: mapping.tourGradeCode,
                          })
                        }
                        disabled={busy || !localSelections[key]}
                      >
                        {busy
                          ? tr("Conectando...", "Connecting...")
                          : tr("Conectar à PMY", "Connect to PMY")}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
