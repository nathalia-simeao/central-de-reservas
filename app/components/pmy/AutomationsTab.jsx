export default function AutomationsTab(props) {
  const {
    activeTab
  } = props;

  return (
    <>
{/* ===== TAB: AUTOMAÇÕES ===== */}
          {activeTab==='automacoes' && (
            <div className="pmy-form-box">
              <h3>🤖 Automação de Alertas para Guias</h3>
              <p style={{ fontSize:'13px', color:'#666', marginBottom:'25px' }}>Configure regras de envio de mensagens automáticas via WhatsApp e E-mail.</p>
              <div style={{ display:'flex', flexDirection:'column', gap:'15px' }}>
                {[
                  { title: "Notificação de Novo Agendamento", desc: "Dispara um alerta imediato para o guia assim que você o colocar na escala da Agenda Central.", checked: true },
                  { title: "Lembrete de Tour Próximo (24 horas antes)", desc: "Avisa o guia no dia anterior enviando dados do cliente e local de encontro.", checked: true },
                ].map((item, i) => (
                  <div key={i} style={{ padding:'20px', background:'#f9f9f9', border:'1px solid #eee', borderRadius:'8px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                    <div>
                      <strong style={{ display:'block', fontSize:'15px', color:'var(--text-dark)' }}>{item.title}</strong>
                      <span style={{ fontSize:'13px', color:'#888' }}>{item.desc}</span>
                    </div>
                    <input type="checkbox" style={{ transform:'scale(1.5)', cursor:'pointer' }} defaultChecked={item.checked} />
                  </div>
                ))}
                <button type="button" className="pmy-btn-submit" style={{ marginTop:'15px', width:'auto', alignSelf:'flex-start', padding:'10px 25px' }}>Salvar Regras de Automação</button>
              </div>
            </div>
          )}
    </>
  );
}
