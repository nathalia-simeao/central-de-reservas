import { Tabs } from "./PmyUI";
import IntegrationConnectionsPanel from "./IntegrationConnectionsPanel";
import IntegrationProductsPanel from "./IntegrationProductsPanel";
import IntegrationSyncLogPanel from "./IntegrationSyncLogPanel";
import PlatformPricesPanel from "./PlatformPricesPanel";
import GygNotifySandboxTest from "./GygNotifySandboxTest";

export default function IntegrationsTab(props) {
  const {
    activeTab,
    intSubTab,
    lang,
    setIntSubTab,
    tours = [],
    platformPrices = null,
    handleSavePlatformPrices,
  } = props;

  if (activeTab !== "integracoes") return null;

  const tr = (pt, en) => lang === "en" ? en : pt;

  return (
    <div>
      <Tabs
        items={[
          { value: "conexoes", label: tr("Conexões", "Connections"), icon: "link" },
          { value: "produtos", label: tr("Produtos por Plataforma", "Products by Platform"), icon: "ticket" },
          { value: "precos", label: tr("Preços por plataforma", "Prices by platform"), icon: "revenue" },
          { value: "logs", label: tr("Log de Sincronização", "Sync Log"), icon: "refresh" },
          { value: "testes", label: tr("Testes", "Tests"), icon: "settings" },
        ]}
        value={intSubTab}
        onChange={setIntSubTab}
        ariaLabel={tr("Seções de integrações", "Integration sections")}
        className="pmy-u-mb-5"
      />

      {intSubTab === "conexoes" ? <IntegrationConnectionsPanel {...props} /> : null}
      {intSubTab === "produtos" ? <IntegrationProductsPanel {...props} /> : null}
      {intSubTab === "precos" ? <PlatformPricesPanel tours={tours} platformPrices={platformPrices} onSave={handleSavePlatformPrices} lang={lang} /> : null}
      {intSubTab === "logs" ? <IntegrationSyncLogPanel {...props} /> : null}
      {intSubTab === "testes" ? (
        <div className="pmy-gyg-sandbox-standalone">
          <p className="pmy-agenda-modal__lead">{tr("Testes técnicos das plataformas (sandbox). Nada aqui mexe em reservas ou vagas reais.", "Technical platform tests (sandbox). Nothing here changes real bookings or seats.")}</p>
          <GygNotifySandboxTest lang={lang} />
        </div>
      ) : null}
    </div>
  );
}
