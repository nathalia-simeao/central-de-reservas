import { Icon, Tabs } from "./PmyUI";
import useIsMobile from "./useIsMobile";
import IntegrationConnectionsPanel from "./IntegrationConnectionsPanel";
import IntegrationProductsPanel from "./IntegrationProductsPanel";
import IntegrationSyncLogPanel from "./IntegrationSyncLogPanel";
import PlatformPricesPanel from "./PlatformPricesPanel";
import GygNotifySandboxTest from "./GygNotifySandboxTest";

/** Aviso das telas que só se configuram no computador (pedido da Nathalia, 12/11/2026). */
export function DesktopOnlyNote({ lang = "pt", children }) {
  const tr = (pt, en) => (lang === "en" ? en : pt);
  return (
    <div className="pmy-desktop-only-note" role="note">
      <Icon name="settings" size={18} />
      <p>{children || tr("Para conectar plataformas ou mudar configurações, abra a Central no computador. No celular você acompanha a situação.", "To connect platforms or change settings, open the Central on a computer. On the phone you can follow the status.")}</p>
    </div>
  );
}

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

  const isMobile = useIsMobile();
  if (activeTab !== "integracoes") return null;

  const tr = (pt, en) => lang === "en" ? en : pt;

  // Celular: só a situação das conexões, sem botões de configurar.
  if (isMobile) {
    return (
      <div className="pmy-int-readonly">
        <DesktopOnlyNote lang={lang} />
        <IntegrationConnectionsPanel {...props} readOnly />
      </div>
    );
  }

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
