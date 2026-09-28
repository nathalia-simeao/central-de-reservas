export default function IntegrationsTab(props) {
  const {
    activeTab,
    activeProdPlatform,
    allPlatforms,
    bookings,
    contentPlatforms,
    customIntegrations,
    customKey,
    customName,
    customUrl,
    formatSyncTime,
    handleAddCustomIntegration,
    handleDisconnect,
    handleOpenConnect,
    handleRequeueSyncJob,
    handleSyncPlatformNow,
    handleToggleProduct,
    intSubTab,
    lang,
    loadSyncQueue,
    manualSyncError,
    manualSyncPlatform,
    manualSyncResult,
    platformConnections,
    platformProducts,
    reservationPlatforms,
    runSyncQueueNow,
    setActiveProdPlatform,
    setCustomKey,
    setCustomName,
    setCustomUrl,
    setIntSubTab,
    syncEventLabel,
    syncProviderMeta,
    syncQueueActionId,
    syncQueueData,
    syncQueueError,
    syncQueueLastLoaded,
    syncQueueLoading,
    syncStatusMeta,
    shopifyValidation,
    shopifyValidationError,
    shopifyValidationLoading,
    loadShopifyValidation,
    startShopifyValidation,
    t,
    tours
  } = props;

  const tr = (pt, en) => lang === "en" ? en : pt;

  return (
    <>
{/* ===== TAB: INTEGRAÇÕES ===== */}
          {activeTab==='integracoes' && (
            <div>
              {/* Sub-tabs */}
              <div className="pmy-int-subtab-bar">
                <button className={`pmy-int-subtab ${intSubTab==='conexoes'?'active':''}`} onClick={()=>setIntSubTab('conexoes')}>{tr("🔗 Conexões", "🔗 Connections")}</button>
                <button className={`pmy-int-subtab ${intSubTab==='produtos'?'active':''}`} onClick={()=>setIntSubTab('produtos')}>{tr("📦 Produtos por Plataforma", "📦 Products by Platform")}</button>
                <button className={`pmy-int-subtab ${intSubTab==='logs'?'active':''}`} onClick={()=>setIntSubTab('logs')}>{tr("📡 Log de Sincronização", "📡 Sync Log")}</button>
              </div>

              {/* ── SUB-TAB: CONEXÕES ── */}
              {intSubTab==='conexoes' && (
                <div>
                  <p style={{ color:'var(--text-muted)', marginBottom:'25px', fontSize:'15px' }}>
                    {lang==='pt' ? 'Canais de reserva sincronizam vendas e disponibilidade. Integrações de conteúdo, como Tripadvisor, ficam separadas.' : 'Booking channels sync sales and availability. Content integrations, such as Tripadvisor, are kept separate.'}
                  </p>
                  <div style={{ display:'flex', gap:'12px', marginBottom:'30px', flexWrap:'wrap' }}>
                    <div style={{ background:'#fff', border:'1px solid #eee', borderRadius:'10px', padding:'14px 20px', display:'flex', alignItems:'center', gap:'10px' }}>
                      <span style={{ fontSize:'22px' }}>🟢</span>
                      <div>
                        <div style={{ fontWeight:'800', fontSize:'20px', color:'var(--primary-green)' }}>{reservationPlatforms.filter(p=>platformConnections[p.key]?.connected).length}</div>
                        <div style={{ fontSize:'12px', color:'#888' }}>{tr("Conectadas", "Connected")}</div>
                      </div>
                    </div>
                    <div style={{ background:'#fff', border:'1px solid #eee', borderRadius:'10px', padding:'14px 20px', display:'flex', alignItems:'center', gap:'10px' }}>
                      <span style={{ fontSize:'22px' }}>⚫</span>
                      <div>
                        <div style={{ fontWeight:'800', fontSize:'20px', color:'#888' }}>{reservationPlatforms.filter(p=>!platformConnections[p.key]?.connected).length}</div>
                        <div style={{ fontSize:'12px', color:'#888' }}>{tr("Pendentes", "Pending")}</div>
                      </div>
                    </div>
                  </div>
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(260px,1fr))', gap:'20px', marginBottom:'40px' }}>
                    {reservationPlatforms.map(platform => {
                      const conn = platformConnections[platform.key];
                      return (
                        <div key={platform.key} className={`pmy-int-card-v2 ${conn.connected?'connected':''}`} style={{ display:'flex', flexDirection:'column' }}>
                          <div className="pmy-int-top">
                            <span className="pmy-int-logo-v2">{platform.logo}</span>
                            {conn.connected && <span className="pmy-int-sync-info">🔄 {conn.lastSync}</span>}
                          </div>
                          <div style={{ display:'flex', alignItems:'center', gap:'6px', marginBottom:'6px' }}>
                            <span className={`pmy-int-status-dot ${conn.connected?'on':'off'}`}></span>
                            <span style={{ fontSize:'11px', fontWeight:'700', color:conn.connected?'#22c55e':'#aaa' }}>
                              {conn.connected ? tr('CONECTADO','CONNECTED') : tr('NÃO CONECTADO','NOT CONNECTED')}
                            </span>
                          </div>
                          <div className="pmy-int-name-v2">{platform.name}</div>
                          <div className="pmy-int-desc-v2">{lang==='pt' ? platform.desc.pt : platform.desc.en}</div>
                          <div className="pmy-int-actions">
                            {conn.connected ? (
                              <>
                                <button className="pmy-int-btn-settings" onClick={()=>handleOpenConnect(platform.key)}>{tr("⚙️ Gerenciar", "⚙️ Manage")}</button>
                                <button className="pmy-int-btn-disconnect" onClick={()=>handleDisconnect(platform.key)}>{tr("Desconectar", "Disconnect")}</button>
                              </>
                            ) : (
                              <button className="pmy-int-btn-connect" onClick={()=>handleOpenConnect(platform.key)}>
                                🔗 Conectar {platform.name}
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                    <div style={{ gridColumn:'1 / -1', marginTop:'4px', paddingTop:'18px', borderTop:'1px solid #eee' }}>
                      <div style={{ fontSize:'13px', fontWeight:'900', color:'#3949ab', marginBottom:'4px' }}>{tr("🦉 Conteúdo & reputação", "🦉 Content & Reputation")}</div>
                      <div style={{ fontSize:'12px', color:'#888' }}>{tr("Integrações que enriquecem reviews, ratings, fotos e presença da marca. Não entram na Agenda nem no inventário de reservas.", "Integrations that enrich reviews, ratings, photos, and brand presence. They do not enter the Agenda or booking inventory.")}</div>
                    </div>
                    {contentPlatforms.map(platform => {
                      const conn = platformConnections[platform.key];
                      return (
                        <div key={platform.key} className="pmy-int-card-v2" style={{ display:'flex', flexDirection:'column', borderColor:'#d9def8' }}>
                          <div className="pmy-int-top">
                            <span className="pmy-int-logo-v2">{platform.logo}</span>
                            <span className="pmy-int-sync-info">{tr("Conteúdo", "Content")}</span>
                          </div>
                          <div style={{ display:'flex', alignItems:'center', gap:'6px', marginBottom:'6px' }}>
                            <span className="pmy-int-status-dot" style={{ background:'#3949ab' }}></span>
                            <span style={{ fontSize:'11px', fontWeight:'700', color:'#3949ab' }}>
                              CONTEÚDO / REVIEWS
                            </span>
                          </div>
                          <div className="pmy-int-name-v2">{platform.name}</div>
                          <div className="pmy-int-desc-v2">{lang==='pt' ? platform.desc.pt : platform.desc.en}</div>
                          <div className="pmy-int-actions">
                            <button className="pmy-int-btn-settings" onClick={()=>handleOpenConnect(platform.key)}>
                              🦉 Ver integração de conteúdo
                            </button>
                          </div>
                        </div>
                      );
                    })}
                    {customIntegrations.map(c => (
                      <div className="pmy-int-card-v2 connected" key={c.id} style={{ display:'flex', flexDirection:'column' }}>
                        <div className="pmy-int-top"><span className="pmy-int-logo-v2">⚙️</span><span className="pmy-int-sync-info">Custom API</span></div>
                        <div className="pmy-int-name-v2">{c.name}</div>
                        <div className="pmy-int-desc-v2" style={{ wordBreak:'break-all' }}>Endpoint: {c.url}</div>
                      </div>
                    ))}
                  </div>
                  <div className="pmy-form-box" style={{ maxWidth:'600px' }}>
                    <h3>{tr("🔗 Conectar Nova Plataforma via API", "🔗 Connect New Platform via API")}</h3>
                    <form onSubmit={handleAddCustomIntegration}>
                      <div className="pmy-form-group"><label>{tr("Nome da Plataforma:", "Platform Name:")}</label><input type="text" className="pmy-form-input" placeholder={tr('Ex: Agência Parceira LX','E.g. Partner Agency LX')} value={customName} onChange={e=>setCustomName(e.target.value)} required /></div>
                      <div className="pmy-form-group"><label>{tr("Endpoint da API (URL):", "API Endpoint (URL):")}</label><input type="url" className="pmy-form-input" placeholder="https://api.parceiro.com/v1/bookings" value={customUrl} onChange={e=>setCustomUrl(e.target.value)} required /></div>
                      <div className="pmy-form-group"><label>{tr("Chave da API / Token:", "API Key / Token:")}</label><input type="password" className="pmy-form-input" placeholder="pmy_live_key_..." value={customKey} onChange={e=>setCustomKey(e.target.value)} /></div>
                      <button type="submit" className="pmy-btn-submit" style={{ background:'#ff6600' }}>{tr("Ativar Integração Customizada", "Activate Custom Integration")}</button>
                    </form>
                  </div>
                </div>
              )}

              {/* ── SUB-TAB: LOG DE SINCRONIZAÇÃO ── */}
              {intSubTab==='logs' && (
                <div>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:'16px', flexWrap:'wrap', marginBottom:'20px' }}>
                    <div>
                      <h3 style={{ margin:'0 0 6px', color:'var(--text-dark)' }}>{tr("📡 Log de Sincronização", "📡 Sync Log")}</h3>
                      <p style={{ color:'var(--text-muted)', margin:0, fontSize:'14px', lineHeight:'1.6' }}>
                        Acompanhe cada envio por canal, identifique divergências e reenvie falhas sem alterar a reserva original.
                        A tela atualiza automaticamente a cada 15 segundos.
                      </p>
                    </div>
                    <div style={{ display:'flex', gap:'8px', alignItems:'center', flexWrap:'wrap' }}>
                      {syncQueueLastLoaded && (
                        <span style={{ fontSize:'11px', color:'#999' }}>
                          Atualizado {syncQueueLastLoaded.toLocaleTimeString('pt-PT', { hour:'2-digit', minute:'2-digit', second:'2-digit' })}
                        </span>
                      )}
                      <button type="button" onClick={loadSyncQueue} disabled={syncQueueLoading}
                        style={{ border:'1px solid #ddd', background:'#fff', borderRadius:'8px', padding:'9px 13px', cursor:syncQueueLoading?'wait':'pointer', fontWeight:'700', fontSize:'12px', color:'#555' }}>
                        {syncQueueLoading ? tr('⏳ Atualizando...','⏳ Refreshing...') : tr('🔄 Atualizar','🔄 Refresh')}
                      </button>
                      <button type="button" onClick={runSyncQueueNow} disabled={syncQueueActionId==='run'}
                        className="pmy-btn-submit" style={{ width:'auto', padding:'9px 15px', fontSize:'12px' }}>
                        {syncQueueActionId==='run' ? tr('⏳ Processando...','⏳ Processing...') : tr('▶ Processar fila agora','▶ Process queue now')}
                      </button>
                    </div>
                  </div>

                  {syncQueueError && (
                    <div style={{ background:'#fef2f2', border:'1px solid #fecaca', color:'#b91c1c', borderRadius:'10px', padding:'12px 15px', marginBottom:'16px', fontSize:'13px' }}>
                      ❌ {syncQueueError}
                    </div>
                  )}

                  <div style={{
                    background: shopifyValidation?.status === 'PASSED' ? '#f0fdf4' : '#fff',
                    border: shopifyValidation?.status === 'PASSED' ? '1px solid #bbf7d0' : '1px solid #e5e7eb',
                    borderRadius:'12px',
                    padding:'16px 18px',
                    marginBottom:'18px'
                  }}>
                    <div style={{ display:'flex', justifyContent:'space-between', gap:'12px', alignItems:'flex-start', flexWrap:'wrap' }}>
                      <div>
                        <div style={{ fontWeight:'900', fontSize:'14px', color:'#243b2d', marginBottom:'4px' }}>
                          🧪 Validação real Shopify → Webhook → Booking → Agenda → Vagas
                        </div>
                        <div style={{ fontSize:'11px', color:'#6b7280', lineHeight:'1.55', maxWidth:'780px' }}>
                          Cria um Draft Order de teste com 1 participante, converte em pedido Shopify com pagamento pendente e acompanha automaticamente se o webhook entrou, se o Booking foi criado e se a disponibilidade caiu.
                        </div>
                      </div>
                      <div style={{ display:'flex', gap:'8px', flexWrap:'wrap' }}>
                        <button type="button" onClick={loadShopifyValidation}
                          style={{ border:'1px solid #ddd', background:'#fff', borderRadius:'8px', padding:'8px 11px', fontSize:'11px', fontWeight:'800', cursor:'pointer' }}>
                          🔄 Verificar
                        </button>
                        <button type="button" onClick={startShopifyValidation} disabled={shopifyValidationLoading || shopifyValidation?.status === 'WAITING'}
                          className="pmy-btn-submit" style={{ width:'auto', padding:'8px 13px', fontSize:'11px', opacity:(shopifyValidationLoading || shopifyValidation?.status === 'WAITING')?0.6:1 }}>
                          {shopifyValidationLoading ? tr('⏳ Criando pedido...','⏳ Creating order...') : shopifyValidation?.status === 'WAITING' ? tr('⏳ Aguardando webhook...','⏳ Waiting for webhook...') : tr('▶ Executar teste real','▶ Run real test')}
                        </button>
                      </div>
                    </div>

                    {shopifyValidationError && (
                      <div style={{ marginTop:'12px', background:'#fef2f2', border:'1px solid #fecaca', borderRadius:'8px', padding:'9px 11px', color:'#b91c1c', fontSize:'11px' }}>
                        ❌ {shopifyValidationError}
                      </div>
                    )}

                    {shopifyValidation?.exists && (
                      <div style={{ marginTop:'14px' }}>
                        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(145px,1fr))', gap:'8px', marginBottom:'12px' }}>
                          {[
                            [tr('Pedido Shopify','Shopify Order'), shopifyValidation.steps?.orderCreated],
                            [tr('Webhook recebido','Webhook received'), shopifyValidation.steps?.webhookReceived],
                            [tr('Booking criado','Booking created'), shopifyValidation.steps?.bookingCreated],
                            [tr('Agenda abastecida','Agenda updated'), shopifyValidation.steps?.agendaReady],
                            [tr('Vagas reduzidas','Availability reduced'), shopifyValidation.steps?.capacityReduced],
                          ].map(([label,ok]) => (
                            <div key={label} style={{
                              background:ok?'#ecfdf3':'#f8fafc',
                              border:`1px solid ${ok?'#bbf7d0':'#e5e7eb'}`,
                              borderRadius:'8px',
                              padding:'9px 10px'
                            }}>
                              <div style={{ fontSize:'11px', fontWeight:'800', color:ok?'#166534':'#6b7280' }}>
                                {ok?'✅':'⏳'} {label}
                              </div>
                            </div>
                          ))}
                        </div>

                        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))', gap:'8px', fontSize:'11px', color:'#555' }}>
                          <div style={{ background:'#fff', border:'1px solid #eee', borderRadius:'8px', padding:'10px 12px' }}>
                            <strong>{tr("Pedido:", "Order:")}</strong> {shopifyValidation.order?.name || '—'}<br/>
                            <span style={{ color:'#888' }}>{shopifyValidation.order?.financialStatus || tr('status financeiro pendente','pending financial status')}</span>
                          </div>
                          <div style={{ background:'#fff', border:'1px solid #eee', borderRadius:'8px', padding:'10px 12px' }}>
                            <strong>{tr("Tour:", "Tour:")}</strong> {shopifyValidation.slot?.tourTitle || '—'}<br/>
                            <span style={{ color:'#888' }}>{shopifyValidation.slot?.date || '—'} · {shopifyValidation.slot?.time || '—'}</span>
                          </div>
                          <div style={{ background:'#fff', border:'1px solid #eee', borderRadius:'8px', padding:'10px 12px' }}>
                            <strong>{tr("Vagas:", "Availability:")}</strong> {shopifyValidation.slot?.remainingBefore ?? '—'} → {shopifyValidation.slot?.remainingAfter ?? '—'}<br/>
                            <span style={{ color:'#888' }}>ocupadas: {shopifyValidation.slot?.occupiedBefore ?? '—'} → {shopifyValidation.slot?.occupiedAfter ?? '—'}</span>
                          </div>
                        </div>

                        {shopifyValidation.status === 'PASSED' && (
                          <div style={{ marginTop:'12px', background:'#dcfce7', border:'1px solid #86efac', borderRadius:'8px', padding:'10px 12px', color:'#166534', fontWeight:'800', fontSize:'12px' }}>
                            ✅ Fluxo validado de ponta a ponta. O pedido Shopify chegou por webhook, virou Booking, entrou na Agenda e reduziu a disponibilidade.
                          </div>
                        )}
                        {shopifyValidation.status === 'WAITING' && (
                          <div style={{ marginTop:'10px', fontSize:'11px', color:'#6b7280' }}>
                            ⏳ O pedido já foi criado. A Central verifica o webhook automaticamente a cada poucos segundos.
                          </div>
                        )}
                        {shopifyValidation.status === 'FAILED' && (
                          <div style={{ marginTop:'10px', fontSize:'11px', color:'#b91c1c', fontWeight:'700' }}>
                            ❌ O teste encontrou uma falha no processamento do webhook. Veja o Log de Sincronização abaixo.
                          </div>
                        )}
                      </div>
                    )}

                    {!shopifyValidation?.exists && !shopifyValidationError && (
                      <div style={{ marginTop:'12px', fontSize:'11px', color:'#888' }}>
                        Nenhum teste end-to-end executado ainda. O teste usa uma reserva de 1 participante e não cobra cliente.
                      </div>
                    )}
                  </div>

                  {(() => {
                    const stats = syncQueueData.stats || {};
                    const divergent = Number(stats.retry || 0) + Number(stats.blocked || 0) + Number(stats.dead || 0);
                    const cards = [
                      ['✅', tr('Concluídos','Completed'), stats.completed || 0, '#166534', '#ecfdf3'],
                      ['⏳', tr('Pendentes','Pending'), (stats.pending || 0) + (stats.processing || 0), '#9a3412', '#fff7ed'],
                      ['🟠', tr('Em nova tentativa','Retrying'), stats.retry || 0, '#c2410c', '#fff7ed'],
                      ['⚠️', tr('Divergências','Mismatches'), divergent, divergent > 0 ? '#b91c1c' : '#166534', divergent > 0 ? '#fef2f2' : '#ecfdf3'],
                    ];
                    return (
                      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(160px,1fr))', gap:'12px', marginBottom:'20px' }}>
                        {cards.map(([icon,label,value,color,bg]) => (
                          <div key={label} style={{ background:bg, border:'1px solid rgba(0,0,0,0.06)', borderRadius:'12px', padding:'14px 16px' }}>
                            <div style={{ fontSize:'11px', color:'#777', fontWeight:'700', marginBottom:'5px' }}>{icon} {label}</div>
                            <div style={{ fontSize:'24px', fontWeight:'900', color }}>{value}</div>
                          </div>
                        ))}
                      </div>
                    );
                  })()}

                  <div className="pmy-form-box" style={{ padding:0, overflow:'hidden' }}>
                    {syncQueueLoading && syncQueueData.jobs.length === 0 ? (
                      <div style={{ padding:'42px', textAlign:'center', color:'#888' }}>{tr("⏳ Carregando histórico de sincronização...", "⏳ Loading sync history...")}</div>
                    ) : syncQueueData.jobs.length === 0 ? (
                      <div style={{ padding:'42px', textAlign:'center', color:'#888' }}>
                        <div style={{ fontSize:'32px', marginBottom:'8px' }}>📭</div>
                        <strong style={{ display:'block', color:'#555', marginBottom:'5px' }}>{tr("Nenhum evento de sincronização registrado ainda", "No sync events recorded yet")}</strong>
                        Os próximos bloqueios, reservas, cancelamentos e alterações de capacidade aparecerão aqui.
                      </div>
                    ) : (
                      <div style={{ overflowX:'auto' }}>
                        <table style={{ width:'100%', borderCollapse:'collapse', minWidth:'980px' }}>
                          <thead>
                            <tr style={{ background:'#fafafa', borderBottom:'1px solid #eee' }}>
                              {['Horário', 'Evento', 'Origem', 'Canal', 'Status', 'Tentativas', 'Detalhe', 'Ação'].map(header => (
                                <th key={header} style={{ textAlign:'left', padding:'12px 14px', fontSize:'11px', color:'#777', textTransform:'uppercase', letterSpacing:'0.3px' }}>{header}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {syncQueueData.jobs.map(job => {
                              const status = syncStatusMeta[job.status] || { icon:'•', label:job.status || '—', bg:'#f5f5f5', color:'#555' };
                              const provider = syncProviderMeta[job.provider] || { label:job.provider || '—', icon:'🔌' };
                              const source = syncProviderMeta[job.sourcePlatform] || { label:job.sourcePlatform || 'Central', icon:'🧭' };
                              const detail = job.error || job.result?.reason || job.result?.detail || (job.status === 'COMPLETED' ? 'Sincronização concluída' : '—');
                              const canRetry = ['RETRY','BLOCKED','DEAD'].includes(job.status);
                              return (
                                <tr key={job.id} style={{ borderBottom:'1px solid #f1f1f1', background:['RETRY','BLOCKED','DEAD'].includes(job.status) ? '#fffdfd' : '#fff' }}>
                                  <td style={{ padding:'12px 14px', fontSize:'12px', color:'#555', whiteSpace:'nowrap' }}>
                                    {formatSyncTime(job.lastAttemptAt || job.updatedAt || job.createdAt)}
                                  </td>
                                  <td style={{ padding:'12px 14px', fontSize:'12px' }}>
                                    <div style={{ fontWeight:'800', color:'#333' }}>{syncEventLabel(job.eventType)}</div>
                                    <div style={{ color:'#aaa', fontSize:'10px', marginTop:'3px', fontFamily:'monospace' }}>{job.eventType}</div>
                                  </td>
                                  <td style={{ padding:'12px 14px', fontSize:'12px', whiteSpace:'nowrap' }}>{source.icon} {source.label}</td>
                                  <td style={{ padding:'12px 14px', fontSize:'12px', fontWeight:'800', whiteSpace:'nowrap' }}>{provider.icon} {provider.label}</td>
                                  <td style={{ padding:'12px 14px' }}>
                                    <span style={{ display:'inline-flex', alignItems:'center', gap:'5px', background:status.bg, color:status.color, padding:'5px 8px', borderRadius:'20px', fontSize:'11px', fontWeight:'800', whiteSpace:'nowrap' }}>
                                      {status.icon} {status.label}
                                    </span>
                                  </td>
                                  <td style={{ padding:'12px 14px', fontSize:'12px', color:'#666', textAlign:'center' }}>
                                    {job.attempts || 0}/{job.maxAttempts || 8}
                                  </td>
                                  <td style={{ padding:'12px 14px', fontSize:'11px', color:job.error?'#b91c1c':'#666', maxWidth:'290px' }}>
                                    <div title={String(detail)} style={{ whiteSpace:'normal', lineHeight:'1.45' }}>{String(detail)}</div>
                                  </td>
                                  <td style={{ padding:'12px 14px', whiteSpace:'nowrap' }}>
                                    {canRetry ? (
                                      <button type="button" onClick={()=>handleRequeueSyncJob(job.id)} disabled={syncQueueActionId===job.id}
                                        style={{ border:'1px solid #f59e0b', background:'#fff7ed', color:'#9a3412', borderRadius:'7px', padding:'7px 10px', fontSize:'11px', fontWeight:'800', cursor:syncQueueActionId===job.id?'wait':'pointer' }}>
                                        {syncQueueActionId===job.id ? '⏳ Reenviando' : '↻ Reenviar'}
                                      </button>
                                    ) : (
                                      <span style={{ fontSize:'11px', color:'#bbb' }}>—</span>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  <div style={{ marginTop:'14px', background:'#f8fafc', border:'1px solid #e5e7eb', borderRadius:'10px', padding:'12px 14px', fontSize:'12px', color:'#64748b', lineHeight:'1.6' }}>
                    <strong style={{ color:'#475569' }}>{tr("Como ler:", "How to read:")}</strong> cada linha representa o envio de um mesmo evento para um canal.
                    Se um canal estiver ✅ e outro ❌/🟠, existe uma divergência. O botão <strong>{tr("Reenviar", "Retry")}</strong> recoloca apenas aquele job na fila e tenta processá-lo novamente.
                  </div>
                </div>
              )}

              {/* ── SUB-TAB: PRODUTOS POR PLATAFORMA ── */}
              {intSubTab==='produtos' && (
                <div>
                  <p style={{ color:'var(--text-muted)', marginBottom:'22px', fontSize:'15px' }}>
                    Visualize e gerencie os produtos dos canais de venda e reserva. Tripadvisor não aparece aqui porque reviews/conteúdo não constituem inventário de reservas separado.
                  </p>

                  {/* Tabs de plataformas */}
                  <div className="pmy-prod-platform-tabs">
                    {reservationPlatforms.map(p => {
                      const conn = platformConnections[p.key];
                      const prods = platformProducts[p.key] || [];
                      const activeCount = prods.filter(x=>x.active).length;
                      return (
                        <button
                          key={p.key}
                          className={`pmy-prod-ptab ${activeProdPlatform===p.key?'active':''} ${!conn.connected?'disabled':''}`}
                          onClick={() => conn.connected && setActiveProdPlatform(p.key)}
                          title={!conn.connected ? tr(tr('Plataforma não conectada','Platform not connected'),'Platform not connected') : ''}
                        >
                          <span style={{ fontSize:'18px' }}>{p.logo}</span>
                          {p.name}
                          {conn.connected && (
                            <span style={{
                              fontSize:'10px', fontWeight:'800', padding:'2px 7px', borderRadius:'10px',
                              background: activeProdPlatform===p.key ? 'rgba(255,255,255,0.25)' : '#e6f2e6',
                              color: activeProdPlatform===p.key ? '#fff' : 'var(--primary-green)'
                            }}>{activeCount} {tr('ativos','active')}</span>
                          )}
                          {!conn.connected && (
                            <span style={{ fontSize:'10px', padding:'2px 7px', borderRadius:'10px', background:'#f5f5f5', color:'#aaa' }}>{tr('desconectado','disconnected')}</span>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {(manualSyncError || (manualSyncResult?.platform === activeProdPlatform)) && (
                    <div style={{
                      marginBottom:'18px',
                      border: manualSyncError ? '1px solid #fecaca' : '1px solid #d8e6dc',
                      background: manualSyncError ? '#fef2f2' : '#f7fbf8',
                      borderRadius:'12px',
                      padding:'16px 18px'
                    }}>
                      {manualSyncError ? (
                        <div style={{ color:'#b91c1c', fontSize:'13px', fontWeight:'700' }}>
                          ❌ {manualSyncError}
                        </div>
                      ) : (() => {
                        const result = manualSyncResult;
                        const products = result?.products || {};
                        const reservations = result?.reservations || {};
                        const availability = result?.availability || {};
                        const differences = Number(result?.differences || 0);
                        return (
                          <div>
                            <div style={{ display:'flex', justifyContent:'space-between', gap:'12px', alignItems:'flex-start', flexWrap:'wrap', marginBottom:'13px' }}>
                              <div>
                                <div style={{ fontWeight:'900', color:'#243b2d', fontSize:'14px' }}>
                                  {differences === 0 ? tr('✅ Canais consistentes nesta verificação','✅ Channels are consistent in this check') : `⚠️ ${differences} diferença${differences===1?'':'s'} encontrada${differences===1?'':'s'}`}
                                </div>
                                <div style={{ fontSize:'11px', color:'#6b7280', marginTop:'4px', maxWidth:'760px', lineHeight:'1.5' }}>
                                  {result?.scopeNote}
                                </div>
                              </div>
                              <span style={{ fontSize:'10px', fontWeight:'800', color:'#60746a', background:'#edf5ef', borderRadius:'20px', padding:'5px 9px' }}>
                                {result?.mode === 'LIVE_API' ? tr('API AO VIVO','LIVE API') : result?.mode === 'PUSH_API' ? tr('PUSH REAL','LIVE PUSH') : tr('SUPPLIER / PULL','SUPPLIER / PULL')}
                              </span>
                            </div>

                            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))', gap:'9px', marginBottom:'12px' }}>
                              <div style={{ background:'#fff', border:'1px solid #e8eee9', borderRadius:'9px', padding:'10px 12px' }}>
                                <div style={{ fontSize:'10px', color:'#888', fontWeight:'800' }}>{tr("📦 PRODUTOS", "📦 PRODUCTS")}</div>
                                <div style={{ fontSize:'18px', fontWeight:'900', marginTop:'3px' }}>{products.remote ?? products.centralAfter ?? 0}</div>
                                <div style={{ fontSize:'10px', color:'#777' }}>{tr("canal / cadastro verificado", "channel / record checked")}</div>
                              </div>
                              <div style={{ background:'#fff', border:'1px solid #e8eee9', borderRadius:'9px', padding:'10px 12px' }}>
                                <div style={{ fontSize:'10px', color:'#888', fontWeight:'800' }}>{tr("🎟️ RESERVAS", "🎟️ BOOKINGS")}</div>
                                <div style={{ fontSize:'18px', fontWeight:'900', marginTop:'3px' }}>{reservations.remoteChecked ?? reservations.centralAfter ?? 0}</div>
                                <div style={{ fontSize:'10px', color:'#777' }}>{reservations.remoteChecked != null ? tr('pedidos consultados','orders checked') : tr('reservas recebidas na Central','bookings received by the Central')}</div>
                              </div>
                              <div style={{ background:'#fff', border:'1px solid #e8eee9', borderRadius:'9px', padding:'10px 12px' }}>
                                <div style={{ fontSize:'10px', color:'#888', fontWeight:'800' }}>{tr("🕒 DISPONIBILIDADE", "🕒 AVAILABILITY")}</div>
                                <div style={{ fontSize:'18px', fontWeight:'900', marginTop:'3px' }}>{availability.checked ?? 0}</div>
                                <div style={{ fontSize:'10px', color:'#777' }}>{tr("tours verificados", "tours checked")}</div>
                              </div>
                              <div style={{ background:differences?'#fff7ed':'#ecfdf3', border:`1px solid ${differences?'#fed7aa':'#bbf7d0'}`, borderRadius:'9px', padding:'10px 12px' }}>
                                <div style={{ fontSize:'10px', color:'#888', fontWeight:'800' }}>{tr("🔎 DIFERENÇAS", "🔎 MISMATCHES")}</div>
                                <div style={{ fontSize:'18px', fontWeight:'900', marginTop:'3px', color:differences?'#c2410c':'#166534' }}>{differences}</div>
                                <div style={{ fontSize:'10px', color:'#777' }}>{tr("itens que pedem atenção", "items needing attention")}</div>
                              </div>
                            </div>

                            {(products.created > 0 || products.updated > 0 || reservations.rowsTouched > 0 || availability.pushed > 0) && (
                              <div style={{ fontSize:'11px', color:'#365a43', marginBottom:'10px', lineHeight:'1.55' }}>
                                <strong>{tr("Ações executadas:", "Actions performed:")}</strong>
                                {products.created > 0 ? ` ${products.created} produto(s) criado(s) na Central.` : ''}
                                {products.updated > 0 ? ` ${products.updated} produto(s) atualizado(s).` : ''}
                                {reservations.rowsTouched > 0 ? ` ${reservations.rowsTouched} reserva(s) reconciliada(s).` : ''}
                                {availability.pushed > 0 ? ` Disponibilidade enviada para ${availability.pushed} tour(s).` : ''}
                              </div>
                            )}

                            {[
                              ...(products.missingInCentral || []),
                              ...(products.missingInChannel || []),
                              ...(products.changed || []),
                              ...(reservations.differences || []),
                            ].length > 0 && (
                              <div style={{ background:'#fff', border:'1px solid #eee', borderRadius:'8px', padding:'10px 12px', marginBottom:'9px' }}>
                                <div style={{ fontSize:'11px', fontWeight:'900', color:'#555', marginBottom:'6px' }}>{tr("Diferenças encontradas", "Mismatches found")}</div>
                                {[
                                  ...(products.missingInCentral || []),
                                  ...(products.missingInChannel || []),
                                  ...(products.changed || []),
                                  ...(reservations.differences || []),
                                ].slice(0, 12).map((item, index) => (
                                  <div key={`${item.id || item.name}-${index}`} style={{ fontSize:'11px', color:'#666', padding:'3px 0', lineHeight:'1.45' }}>
                                    • <strong>{item.name || item.id}</strong>: {item.reason}
                                  </div>
                                ))}
                              </div>
                            )}

                            {(result?.notes || []).map((note, index) => (
                              <div key={index} style={{ fontSize:'10px', color:'#7b8580', lineHeight:'1.5' }}>• {note}</div>
                            ))}
                          </div>
                        );
                      })()}
                    </div>
                  )}

                  {/* Tabela de produtos da plataforma ativa */}
                  {(() => {
                    const conn = platformConnections[activeProdPlatform];
                    if (!conn?.connected) return (
                      <div style={{ background:'#fffbeb', border:'1px solid #fcd34d', borderRadius:'10px', padding:'20px 24px', display:'flex', alignItems:'center', gap:'12px' }}>
                        <span style={{ fontSize:'24px' }}>⚠️</span>
                        <div>
                          <strong style={{ fontSize:'14px', color:'#92400e', display:'block' }}>{tr("Plataforma não conectada", "Platform not connected")}</strong>
                          <span style={{ fontSize:'13px', color:'#b45309' }}>Conecte esta plataforma na aba <strong>{tr("Conexões", "Connections")}</strong> para gerenciar seus produtos aqui.</span>
                        </div>
                      </div>
                    );
                    const prods = platformProducts[activeProdPlatform] || [];
                    const platform = allPlatforms.find(p=>p.key===activeProdPlatform);
                    const activeCount   = prods.filter(x=>x.active).length;
                    const inactiveCount = prods.filter(x=>!x.active).length;
                    // Plataforma conectada mas sem produtos ainda (ex: Viator recém conectado)
                    if (prods.length === 0) return (
                      <div style={{ background:'#f8f8f8', border:'1px solid #eee', borderRadius:'12px', padding:'32px 28px', textAlign:'center' }}>
                        <div style={{ fontSize:'36px', marginBottom:'12px' }}>{platform?.logo}</div>
                        <div style={{ fontWeight:'800', fontSize:'16px', color:'var(--text-dark)', marginBottom:'8px' }}>
                          Nenhum produto sincronizado ainda
                        </div>
                        <div style={{ fontSize:'13px', color:'#888', lineHeight:'1.6', maxWidth:'380px', margin:'0 auto 20px' }}>
                          {platform?.key === 'shopify'
                            ? tr('Sua loja Shopify não tem produtos cadastrados ainda, ou nenhum foi retornado pela API. Cadastre produtos no painel Shopify e recarregue esta página.','Your Shopify store has no products yet, or none were returned by the API. Create products in Shopify Admin and reload this page.')
                            : (lang === 'en' ? `The ${platform?.name} integration is connected, but no products are loaded on this screen yet. Click Sync Now to query the channel and run the comparison.` : `A integração com ${platform?.name} está conectada, mas ainda não há produtos carregados nesta tela. Clique em Sincronizar Agora para consultar o canal e executar a comparação.`)
                          }
                        </div>
                        {platform?.key !== 'shopify' && (
                          <button className="pmy-btn-submit" style={{ width:'auto', padding:'10px 24px', fontSize:'13px' }}
                            disabled={manualSyncPlatform===platform?.key}
                            onClick={() => handleSyncPlatformNow(platform?.key)}>
                            {manualSyncPlatform===platform?.key ? tr('⏳ Consultando canal...','⏳ Checking channel...') : tr('🔄 Sincronizar Agora','🔄 Sync Now')}
                          </button>
                        )}
                        {platform?.key === 'shopify' && (
                          <a href="/admin/products/new" target="_blank" rel="noreferrer"
                            style={{ display:'inline-block', background:'var(--primary-green)', color:'#fff', padding:'10px 24px', borderRadius:'8px', fontSize:'13px', fontWeight:'700', textDecoration:'none' }}>
                            + Criar Produto no Shopify ↗
                          </a>
                        )}
                      </div>
                    );

                    return (
                      <div className="pmy-form-box" style={{ padding:'0' }}>
                        {/* Header da tabela */}
                        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'18px 22px', borderBottom:'1px solid #f0f0f0' }}>
                          <div style={{ display:'flex', alignItems:'center', gap:'12px' }}>
                            <span style={{ fontSize:'26px' }}>{platform?.logo}</span>
                            <div>
                              <div style={{ fontWeight:'800', fontSize:'16px', color:'var(--text-dark)' }}>{platform?.name}</div>
                              <div style={{ fontSize:'12px', color:'#888', marginTop:'2px' }}>
                                <span style={{ color:'var(--primary-green)', fontWeight:'700' }}>{activeCount} {tr('ativos','active')}</span>
                                <span style={{ margin:'0 8px', color:'#ddd' }}>•</span>
                                <span style={{ color:'#aaa' }}>{inactiveCount} {tr('inativos','inactive')}</span>
                                <span style={{ margin:'0 8px', color:'#ddd' }}>•</span>
                                {prods.length} {tr('produtos no total','products total')}
                              </div>
                            </div>
                          </div>
                          <div style={{ display:'flex', gap:'8px', flexWrap:'wrap', justifyContent:'flex-end' }}>
                            <button type="button"
                              onClick={() => handleSyncPlatformNow(platform?.key)}
                              disabled={manualSyncPlatform===platform?.key}
                              style={{ border:'1px solid #b9d2c0', background:'#f3faf5', color:'#245936', borderRadius:'8px', padding:'8px 13px', fontSize:'12px', fontWeight:'800', cursor:manualSyncPlatform===platform?.key?'wait':'pointer' }}>
                              {manualSyncPlatform===platform?.key ? tr('⏳ Consultando...','⏳ Checking...') : tr('🔄 Sincronizar agora','🔄 Sync now')}
                            </button>
                            <button className="pmy-btn-submit" style={{ width:'auto', padding:'8px 18px', fontSize:'13px' }}
                              onClick={()=>alert(tr('Para adicionar um novo produto, cadastre-o primeiro no Shopify e ele será sincronizado automaticamente.','To add a new product, create it in Shopify first and it will be synced automatically.'))}>
                              + Adicionar Produto
                            </button>
                          </div>
                        </div>

                        {/* Tabela */}
                        <div style={{ padding:'14px 22px 22px' }}>
                          <table className="pmy-prod-table">
                            <thead>
                              <tr>
                                <th>{tr("Produto / Tour", "Product / Tour")}</th>
                                <th>{tr("SKU / ID Externo", "SKU / External ID")}</th>
                                <th>{tr("Preço", "Price")}</th>
                                <th>{tr("Sincronizado", "Synced")}</th>
                                <th>{tr("Status", "Status")}</th>
                                <th style={{ textAlign:'center' }}>{tr("Ativo", "Active")}</th>
                              </tr>
                            </thead>
                            <tbody>
                              {prods.map(prod => (
                                <tr key={prod.id} className={`pmy-prod-row ${prod.active?'active-prod':''}`}>
                                  <td>
                                    <div style={{ fontWeight:'700', fontSize:'14px', color:'var(--text-dark)' }}>{prod.name}</div>
                                  </td>
                                  <td>
                                    <code style={{ fontSize:'11px', background:'#f0f0f0', padding:'3px 7px', borderRadius:'4px', color:'#555' }}>{prod.sku}</code>
                                  </td>
                                  <td style={{ fontWeight:'700', color:'var(--primary-green)' }}>{prod.price}</td>
                                  <td>
                                    {prod.synced
                                      ? <span style={{ fontSize:'12px', color:'#22c55e', fontWeight:'700' }}>{tr("✓ Sincronizado", "✓ Synced")}</span>
                                      : <span style={{ fontSize:'12px', color:'#aaa' }}>{tr("— Pendente", "— Pending")}</span>
                                    }
                                  </td>
                                  <td>
                                    <span className={`pmy-prod-status ${prod.active?'on':'off'}`}>
                                      <span style={{ width:'6px', height:'6px', borderRadius:'50%', background:'currentColor', display:'inline-block' }}></span>
                                      {prod.active ? tr('Ativo','Active') : tr('Inativo','Inactive')}
                                    </span>
                                  </td>
                                  <td style={{ textAlign:'center' }}>
                                    <label className="pmy-prod-toggle" title={prod.active ? tr('Desativar produto','Deactivate product') : tr('Ativar produto','Activate product')}>
                                      <input type="checkbox" checked={prod.active} onChange={()=>handleToggleProduct(activeProdPlatform, prod.id)} />
                                      <span className="pmy-prod-toggle-slider"></span>
                                    </label>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>

                        {/* Legenda */}
                        <div style={{ padding:'12px 22px 16px', borderTop:'1px solid #f5f5f5', display:'flex', gap:'20px', flexWrap:'wrap' }}>
                          <div style={{ fontSize:'12px', color:'#888', display:'flex', alignItems:'center', gap:'6px' }}>
                            <span style={{ width:'8px', height:'8px', borderRadius:'50%', background:'var(--primary-green)', display:'inline-block' }}></span>
                            Produto ativo = aparece nas plataformas e aceita reservas
                          </div>
                          <div style={{ fontSize:'12px', color:'#888', display:'flex', alignItems:'center', gap:'6px' }}>
                            <span style={{ width:'8px', height:'8px', borderRadius:'50%', background:'#ddd', display:'inline-block' }}></span>
                            Inativo = oculto na plataforma, sem novas reservas
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          )}
    </>
  );
}
