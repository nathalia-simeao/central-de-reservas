export default function AutomationsTab(props) {
  const {
    activeTab,
    lang
  } = props;

  const tr = (pt, en) => lang === "en" ? en : pt;

  return (
    <>
{/* ===== TAB: AUTOMAÇÕES ===== */}
          {activeTab==='automacoes' && (
            <div className="pmy-form-box">
              <h3>{tr('🤖 Automação de Alertas para Guias', '🤖 Guide Alert Automation')}</h3>
              <p style={{ fontSize:'13px', color:'#666', marginBottom:'25px' }}>{tr('Configure regras de envio de mensagens automáticas via WhatsApp e E-mail.', 'Configure rules for automatic WhatsApp and email messages.')}</p>
              <div style={{ display:'flex', flexDirection:'column', gap:'15px' }}>
                {[
                  { title: tr("Notificação de Novo Agendamento", "New Booking Notification"), desc: tr("Dispara um alerta imediato para o guia assim que você o colocar na escala da Agenda Central.", "Sends an immediate alert to the guide as soon as they are assigned in the Central Agenda."), checked: true },
                  { title: tr("Lembrete de Tour Próximo (24 horas antes)", "Upcoming Tour Reminder (24 hours before)"), desc: tr("Avisa o guia no dia anterior enviando dados do cliente e local de encontro.", "Notifies the guide the day before with customer details and the meeting point."), checked: true },
                ].map((item, i) => (
                  <div key={i} style={{ padding:'20px', background:'#f9f9f9', border:'1px solid #eee', borderRadius:'8px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                    <div>
                      <strong style={{ display:'block', fontSize:'15px', color:'var(--text-dark)' }}>{item.title}</strong>
                      <span style={{ fontSize:'13px', color:'#888' }}>{item.desc}</span>
                    </div>
                    <input type="checkbox" style={{ transform:'scale(1.5)', cursor:'pointer' }} defaultChecked={item.checked} />
                  </div>
                ))}
                <button type="button" className="pmy-btn-submit" style={{ marginTop:'15px', width:'auto', alignSelf:'flex-start', padding:'10px 25px' }}>{tr('Salvar Regras de Automação', 'Save Automation Rules')}</button>
              </div>
            </div>
          )}
    </>
  );
}
