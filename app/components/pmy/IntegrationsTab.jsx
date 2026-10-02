import { Tabs } from "./PmyUI";
import IntegrationConnectionsPanel from "./IntegrationConnectionsPanel";
import IntegrationProductsPanel from "./IntegrationProductsPanel";
import IntegrationSyncLogPanel from "./IntegrationSyncLogPanel";

export default function IntegrationsTab(props) {
  const {
    activeTab,
    intSubTab,
    lang,
    setIntSubTab,
  } = props;

  if (activeTab !== "integracoes") return null;

  const tr = (pt, en) => lang === "en" ? en : pt;

  return (
    <div>
      <Tabs
        items={[
          { value: "conexoes", label: tr("Conexões", "Connections"), icon: "link" },
          { value: "produtos", label: tr("Produtos por Plataforma", "Products by Platform"), icon: "ticket" },
          { value: "logs", label: tr("Log de Sincronização", "Sync Log"), icon: "refresh" },
        ]}
        value={intSubTab}
        onChange={setIntSubTab}
        ariaLabel={tr("Seções de integrações", "Integration sections")}
        className="pmy-u-mb-5"
      />

      {intSubTab === "conexoes" ? <IntegrationConnectionsPanel {...props} /> : null}
      {intSubTab === "produtos" ? <IntegrationProductsPanel {...props} /> : null}
      {intSubTab === "logs" ? <IntegrationSyncLogPanel {...props} /> : null}
    </div>
  );
}
