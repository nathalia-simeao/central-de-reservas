import { Icon } from "./PmyUI";

export default function HeadoutOnboardingPanel({ lang, tours = [] }) {
  const tr = (pt, en) => (lang === "en" ? en : pt);
  const activeTours = (tours || []).filter((tour) => tour.shopifyStatus !== "INACTIVE");
  const scheduleReady = activeTours.filter(
    (tour) => Array.isArray(tour.scheduleSlots) && tour.scheduleSlots.length > 0,
  ).length;

  const steps = [
    {
      label: tr("Conta Headout Hub / Supply Partner", "Headout Hub / Supply Partner account"),
      status: "done",
    },
    {
      label: tr("Pedido de integração do RMS próprio enviado", "Custom RMS integration request sent"),
      status: "done",
    },
    {
      label: tr("Aprovação técnica da Headout para integração direta", "Headout technical approval for direct integration"),
      status: "pending",
    },
    {
      label: tr("Contrato/especificação de conectividade do lado fornecedor", "Supplier-side connectivity contract/specification"),
      status: "pending",
    },
    {
      label: tr("Credenciais ou método de autenticação de teste", "Test credentials or authentication method"),
      status: "pending",
    },
    {
      label: tr("Mapeamento de produtos/opções", "Product/option mapping"),
      status: "pending",
    },
    {
      label: tr("Teste disponibilidade → reserva → cancelamento", "Availability → booking → cancellation test"),
      status: "pending",
    },
  ];

  return (
    <div>
      <div className="pmy-ds-state-panel is-warning">
        <div className="pmy-ds-state-title is-warning">
          {tr(
            "Aguardando liberação da integração de fornecedor pela Headout",
            "Waiting for Headout supplier-integration enablement",
          )}
        </div>
        <div className="pmy-ds-state-text">
          {tr(
            "A PMY é Supply Partner da Headout. A API pública Headout-Auth documentada para API/Booking Partners serve para distribuir e reservar o inventário da Headout em outro canal; ela não é o contrato correto para enviar a disponibilidade e receber as reservas dos passeios próprios da PMY.",
            "PMY is a Headout Supply Partner. The public Headout-Auth API documented for API/Booking Partners is for distributing and booking Headout inventory elsewhere; it is not the correct contract for publishing PMY availability and receiving bookings for PMY-owned experiences.",
          )}
        </div>
      </div>

      <div className="pmy-ds-panel-soft pmy-u-mt-3">
        <strong>{tr("Estado da preparação PMY", "PMY readiness")}</strong>
        <div className="pmy-ds-list-plain pmy-u-mt-2">
          <div className="pmy-ds-list-plain__row">
            <span>{tr("Tours ativos na Central", "Active Central tours")}</span>
            <strong>{activeTours.length}</strong>
          </div>
          <div className="pmy-ds-list-plain__row">
            <span>{tr("Tours com horários operacionais", "Tours with operational schedules")}</span>
            <strong>{scheduleReady}/{activeTours.length}</strong>
          </div>
          <div className="pmy-ds-list-plain__row">
            <span>{tr("Controle central de capacidade", "Central capacity control")}</span>
            <strong>{tr("pronto", "ready")}</strong>
          </div>
        </div>
      </div>

      <div className="pmy-u-mt-4">
        <div className="pmy-ds-state-title pmy-u-mb-2">
          {tr("Checklist Headout", "Headout checklist")}
        </div>
        <div className="pmy-ds-list-plain">
          {steps.map((step) => {
            const done = step.status === "done";
            return (
              <div className="pmy-ds-list-plain__row" key={step.label}>
                <span className="pmy-ds-list-plain__title">
                  <Icon name={done ? "check" : "clock"} size={16} />
                  {step.label}
                </span>
                <span className={"pmy-tag " + (done ? "is-success" : "")}>
                  {done ? tr("concluído", "done") : tr("pendente", "pending")}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="pmy-ds-inline-message is-warning pmy-u-mt-4">
        {tr(
          "Não cadastre uma API Key de distribuidor nesta tela. Só habilitaremos credenciais quando a Headout confirmar a modalidade de integração para o RMS próprio Reservas Unificadas e fornecer o contrato técnico correspondente.",
          "Do not enter a distributor API key here. Credentials will only be enabled after Headout confirms the integration model for the custom Reservas Unificadas RMS and provides the corresponding technical contract.",
        )}
      </div>

      <div className="pmy-ds-panel-soft pmy-u-mt-3">
        <strong>{tr("Próximo passo", "Next step")}</strong>
        <p className="pmy-u-mt-2">
          {tr(
            "Aguardar a resposta da Headout ao pedido já enviado pedindo integração direta do RMS próprio, documentação, credenciais e processo de testes. Quando eles liberarem o método de conectividade, conectamos o adapter correto sem inventar campos ou usar a API de distribuição errada.",
            "Wait for Headout's response to the existing request for direct custom-RMS integration, documentation, credentials, and testing process. Once they enable the connectivity method, we will connect the correct adapter without inventing fields or using the wrong distribution API.",
          )}
        </p>
      </div>
    </div>
  );
}
