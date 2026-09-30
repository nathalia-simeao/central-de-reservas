import { Button, Card, Icon, SectionHeader } from "./PmyUI";

export default function AutomationsTab(props) {
  const {
    activeTab,
    lang
  } = props;

  const tr = (pt, en) => lang === "en" ? en : pt;

  if (activeTab !== "automacoes") return null;

  const rules = [
    {
      title: tr("Notificação de Novo Agendamento", "New Booking Notification"),
      desc: tr(
        "Dispara um alerta imediato para o guia assim que você o colocar na escala da Agenda Central.",
        "Sends an immediate alert to the guide as soon as they are assigned in the Central Agenda.",
      ),
      checked: true,
    },
    {
      title: tr(
        "Lembrete de Tour Próximo (24 horas antes)",
        "Upcoming Tour Reminder (24 hours before)",
      ),
      desc: tr(
        "Avisa o guia no dia anterior enviando dados do cliente e local de encontro.",
        "Notifies the guide the day before with customer details and the meeting point.",
      ),
      checked: true,
    },
  ];

  return (
    <Card>
      <SectionHeader
        eyebrow={tr("Automações", "Automations")}
        title={tr("Alertas para guias", "Guide alerts")}
        subtitle={tr(
          "Configure regras de envio automático por WhatsApp e e-mail.",
          "Configure automatic WhatsApp and email rules.",
        )}
      />

      <div className="pmy-ds-list">
        {rules.map((item) => (
          <div key={item.title} className="pmy-ds-list-item">
            <div className="pmy-ds-row pmy-ds-grow">
              <Icon name="automation" size={20} />
              <div className="pmy-ds-list-item__content">
                <strong className="pmy-ds-list-item__title">{item.title}</strong>
                <span className="pmy-ds-list-item__description">{item.desc}</span>
              </div>
            </div>
            <input
              type="checkbox"
              className="pmy-ds-checkbox"
              defaultChecked={item.checked}
              aria-label={item.title}
            />
          </div>
        ))}

        <div className="pmy-ds-actions pmy-ds-mt-2">
          <Button type="button" icon="check">
            {tr("Salvar regras de automação", "Save automation rules")}
          </Button>
        </div>
      </div>
    </Card>
  );
}
