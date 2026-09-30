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
                  <p className="pmy-ds-migrated-5553a5">
                    {lang==='pt' ? 'Canais de reserva sincronizam vendas e disponibilidade. Integrações de conteúdo, como Tripadvisor, ficam separadas.' : 'Booking channels sync sales and availability. Content integrations, such as Tripadvisor, are kept separate.'}
                  </p>
                  <div className="pmy-ds-migrated-148qhts">
                    <div className="pmy-ds-migrated-1c2aa5v">
                      <span className="pmy-ds-migrated-i9ilnf">🟢</span>
                      <div>
                        <div className="pmy-ds-migrated-m37lxr">{reservationPlatforms.filter(p=>platformConnections[p.key]?.connected).length}</div>
                        <div className="pmy-ds-migrated-htnqm2">{tr("Conectadas", "Connected")}</div>
                      </div>
                    </div>
                    <div className="pmy-ds-migrated-1c2aa5v">
                      <span className="pmy-ds-migrated-i9ilnf">⚫</span>
                      <div>
                        <div className="pmy-ds-migrated-1ppuvw4">{reservationPlatforms.filter(p=>!platformConnections[p.key]?.connected).length}</div>
                        <div className="pmy-ds-migrated-htnqm2">{tr("Pendentes", "Pending")}</div>
                      </div>
                    </div>
                  </div>
                  <div className="pmy-ds-migrated-xqzku2">
                    {reservationPlatforms.map(platform => {
                      const conn = platformConnections[platform.key];
                      return (
                        <div key={platform.key} className={[`pmy-int-card-v2 ${conn.connected?'connected':''}`, "pmy-ds-migrated-15s4y9o"].filter(Boolean).join(" ")} >
                          <div className="pmy-int-top">
                            <span className="pmy-int-logo-v2">{platform.logo}</span>
                            {conn.connected && <span className="pmy-int-sync-info">🔄 {conn.lastSync}</span>}
                          </div>
                          <div className="pmy-ds-migrated-1gcp9k1">
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
                    <div className="pmy-ds-migrated-1konp2u">
                      <div className="pmy-ds-migrated-166ghmy">{tr("🦉 Conteúdo & reputação", "🦉 Content & Reputation")}</div>
                      <div className="pmy-ds-migrated-htnqm2">{tr("Integrações que enriquecem reviews, ratings, fotos e presença da marca. Não entram na Agenda nem no inventário de reservas.", "Integrations that enrich reviews, ratings, photos, and brand presence. They do not enter the Agenda or booking inventory.")}</div>
                    </div>
                    {contentPlatforms.map(platform => {
                      const conn = platformConnections[platform.key];
                      return (
                        <div key={platform.key} className="pmy-int-card-v2 pmy-ds-migrated-1btvbiy" >
                          <div className="pmy-int-top">
                            <span className="pmy-int-logo-v2">{platform.logo}</span>
                            <span className="pmy-int-sync-info">{tr("Conteúdo", "Content")}</span>
                          </div>
                          <div className="pmy-ds-migrated-1gcp9k1">
                            <span className="pmy-int-status-dot pmy-ds-migrated-1ezk5zw" ></span>
                            <span className="pmy-ds-migrated-1xorh95">
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
                      <div className="pmy-int-card-v2 connected pmy-ds-migrated-15s4y9o" key={c.id} >
                        <div className="pmy-int-top"><span className="pmy-int-logo-v2">⚙️</span><span className="pmy-int-sync-info">Custom API</span></div>
                        <div className="pmy-int-name-v2">{c.name}</div>
                        <div className="pmy-int-desc-v2 pmy-ds-migrated-tlps5h" >Endpoint: {c.url}</div>
                      </div>
                    ))}
                  </div>
                  <div className="pmy-form-box pmy-ds-migrated-8xzf4b" >
                    <h3>{tr("🔗 Conectar Nova Plataforma via API", "🔗 Connect New Platform via API")}</h3>
                    <form onSubmit={handleAddCustomIntegration}>
                      <div className="pmy-form-group"><label>{tr("Nome da Plataforma:", "Platform Name:")}</label><input type="text" className="pmy-form-input" placeholder={tr('Ex: Agência Parceira LX','E.g. Partner Agency LX')} value={customName} onChange={e=>setCustomName(e.target.value)} required /></div>
                      <div className="pmy-form-group"><label>{tr("Endpoint da API (URL):", "API Endpoint (URL):")}</label><input type="url" className="pmy-form-input" placeholder="https://api.parceiro.com/v1/bookings" value={customUrl} onChange={e=>setCustomUrl(e.target.value)} required /></div>
                      <div className="pmy-form-group"><label>{tr("Chave da API / Token:", "API Key / Token:")}</label><input type="password" className="pmy-form-input" placeholder="pmy_live_key_..." value={customKey} onChange={e=>setCustomKey(e.target.value)} /></div>
                      <button type="submit" className="pmy-btn-submit pmy-ds-migrated-1fwqvmo" >{tr("Ativar Integração Customizada", "Activate Custom Integration")}</button>
                    </form>
                  </div>
                </div>
              )}

              {/* ── SUB-TAB: LOG DE SINCRONIZAÇÃO ── */}
              {intSubTab==='logs' && (
                <div>
                  <div className="pmy-ds-migrated-1acd7k0">
                    <div>
                      <h3 className="pmy-ds-migrated-cwjrli">{tr("📡 Log de Sincronização", "📡 Sync Log")}</h3>
                      <p className="pmy-ds-migrated-j6655o">
                        Acompanhe cada envio por canal, identifique divergências e reenvie falhas sem alterar a reserva original.
                        A tela atualiza automaticamente a cada 15 segundos.
                      </p>
                    </div>
                    <div className="pmy-ds-migrated-1foyi5b">
                      {syncQueueLastLoaded && (
                        <span className="pmy-ds-migrated-vinc8y">
                          Atualizado {syncQueueLastLoaded.toLocaleTimeString('pt-PT', { hour:'2-digit', minute:'2-digit', second:'2-digit' })}
                        </span>
                      )}
                      <button type="button" onClick={loadSyncQueue} disabled={syncQueueLoading}
                        style={{ border:'1px solid #ddd', background:'#fff', borderRadius:'8px', padding:'9px 13px', cursor:syncQueueLoading?'wait':'pointer', fontWeight:'700', fontSize:'12px', color:'#555' }}>
                        {syncQueueLoading ? tr('⏳ Atualizando...','⏳ Refreshing...') : tr('🔄 Atualizar','🔄 Refresh')}
                      </button>
                      <button type="button" onClick={runSyncQueueNow} disabled={syncQueueActionId==='run'}
                        className="pmy-btn-submit pmy-ds-migrated-15y797" >
                        {syncQueueActionId==='run' ? tr('⏳ Processando...','⏳ Processing...') : tr('▶ Processar fila agora','▶ Process queue now')}
                      </button>
                    </div>
                  </div>

                  {syncQueueError && (
                    <div className="pmy-ds-migrated-14g0aa5">
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
                    <div className="pmy-ds-migrated-wwbjgp">
                      <div>
                        <div className="pmy-ds-migrated-vz949o">
                          🧪 Validação real Shopify → Webhook → Booking → Agenda → Vagas
                        </div>
                        <div className="pmy-ds-migrated-t4mqfp">
                          Cria um Draft Order de teste com 1 participante, converte em pedido Shopify com pagamento pendente e acompanha automaticamente se o webhook entrou, se o Booking foi criado e se a disponibilidade caiu.
                        </div>
                      </div>
                      <div className="pmy-ds-migrated-11c3s9p">
                        <button type="button" onClick={loadShopifyValidation}
                          className="pmy-ds-migrated-r8mbti">
                          🔄 Verificar
                        </button>
                        <button type="button" onClick={startShopifyValidation} disabled={shopifyValidationLoading || shopifyValidation?.status === 'WAITING'}
                          className="pmy-btn-submit" style={{ width:'auto', padding:'8px 13px', fontSize:'11px', opacity:(shopifyValidationLoading || shopifyValidation?.status === 'WAITING')?0.6:1 }}>
                          {shopifyValidationLoading ? tr('⏳ Criando pedido...','⏳ Creating order...') : shopifyValidation?.status === 'WAITING' ? tr('⏳ Aguardando webhook...','⏳ Waiting for webhook...') : tr('▶ Executar teste real','▶ Run real test')}
                        </button>
                      </div>
                    </div>

                    {shopifyValidationError && (
                      <div className="pmy-ds-migrated-1jl3hj0">
                        ❌ {shopifyValidationError}
                      </div>
                    )}

                    {shopifyValidation?.exists && (
                      <div className="pmy-ds-migrated-1n9iw3x">
                        <div className="pmy-ds-migrated-2blvc1">
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

                        <div className="pmy-ds-migrated-tyzer6">
                          <div className="pmy-ds-migrated-hd5qqp">
                            <strong>{tr("Pedido:", "Order:")}</strong> {shopifyValidation.order?.name || '—'}<br/>
                            <span className="pmy-ds-migrated-19kf531">{shopifyValidation.order?.financialStatus || tr('status financeiro pendente','pending financial status')}</span>
                          </div>
                          <div className="pmy-ds-migrated-hd5qqp">
                            <strong>{tr("Tour:", "Tour:")}</strong> {shopifyValidation.slot?.tourTitle || '—'}<br/>
                            <span className="pmy-ds-migrated-19kf531">{shopifyValidation.slot?.date || '—'} · {shopifyValidation.slot?.time || '—'}</span>
                          </div>
                          <div className="pmy-ds-migrated-hd5qqp">
                            <strong>{tr("Vagas:", "Availability:")}</strong> {shopifyValidation.slot?.remainingBefore ?? '—'} → {shopifyValidation.slot?.remainingAfter ?? '—'}<br/>
                            <span className="pmy-ds-migrated-19kf531">ocupadas: {shopifyValidation.slot?.occupiedBefore ?? '—'} → {shopifyValidation.slot?.occupiedAfter ?? '—'}</span>
                          </div>
                        </div>

                        {shopifyValidation.status === 'PASSED' && (
                          <div className="pmy-ds-migrated-1hlsfhi">
                            ✅ Fluxo validado de ponta a ponta. O pedido Shopify chegou por webhook, virou Booking, entrou na Agenda e reduziu a disponibilidade.
                          </div>
                        )}
                        {shopifyValidation.status === 'WAITING' && (
                          <div className="pmy-ds-migrated-bpj82y">
                            ⏳ O pedido já foi criado. A Central verifica o webhook automaticamente a cada poucos segundos.
                          </div>
                        )}
                        {shopifyValidation.status === 'FAILED' && (
                          <div className="pmy-ds-migrated-1a0iuii">
                            ❌ O teste encontrou uma falha no processamento do webhook. Veja o Log de Sincronização abaixo.
                          </div>
                        )}
                      </div>
                    )}

                    {!shopifyValidation?.exists && !shopifyValidationError && (
                      <div className="pmy-ds-migrated-jhr15n">
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
                      <div className="pmy-ds-migrated-87tlda">
                        {cards.map(([icon,label,value,color,bg]) => (
                          <div key={label} style={{ background:bg, border:'1px solid rgba(0,0,0,0.06)', borderRadius:'12px', padding:'14px 16px' }}>
                            <div className="pmy-ds-migrated-nd1yb6">{icon} {label}</div>
                            <div style={{ fontSize:'24px', fontWeight:'900', color }}>{value}</div>
                          </div>
                        ))}
                      </div>
                    );
                  })()}

                  <div className="pmy-form-box pmy-ds-migrated-q9arce" >
                    {syncQueueLoading && syncQueueData.jobs.length === 0 ? (
                      <div className="pmy-ds-migrated-1htyqwv">{tr("⏳ Carregando histórico de sincronização...", "⏳ Loading sync history...")}</div>
                    ) : syncQueueData.jobs.length === 0 ? (
                      <div className="pmy-ds-migrated-1htyqwv">
                        <div className="pmy-ds-migrated-12lta4n">📭</div>
                        <strong className="pmy-ds-migrated-9rem7x">{tr("Nenhum evento de sincronização registrado ainda", "No sync events recorded yet")}</strong>
                        Os próximos bloqueios, reservas, cancelamentos e alterações de capacidade aparecerão aqui.
                      </div>
                    ) : (
                      <div className="pmy-ds-migrated-13izxgm">
                        <table className="pmy-ds-migrated-sq1wms">
                          <thead>
                            <tr className="pmy-ds-migrated-37kcbg">
                              {['Horário', 'Evento', 'Origem', 'Canal', 'Status', 'Tentativas', 'Detalhe', 'Ação'].map(header => (
                                <th key={header} className="pmy-ds-migrated-1o8gl9r">{header}</th>
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
                                  <td className="pmy-ds-migrated-1c9koyg">
                                    {formatSyncTime(job.lastAttemptAt || job.updatedAt || job.createdAt)}
                                  </td>
                                  <td className="pmy-ds-migrated-11ydk3t">
                                    <div className="pmy-ds-migrated-28a1ij">{syncEventLabel(job.eventType)}</div>
                                    <div className="pmy-ds-migrated-7iqvl9">{job.eventType}</div>
                                  </td>
                                  <td className="pmy-ds-migrated-1gem2sh">{source.icon} {source.label}</td>
                                  <td className="pmy-ds-migrated-cegdm0">{provider.icon} {provider.label}</td>
                                  <td className="pmy-ds-migrated-zsxq6o">
                                    <span style={{ display:'inline-flex', alignItems:'center', gap:'5px', background:status.bg, color:status.color, padding:'5px 8px', borderRadius:'20px', fontSize:'11px', fontWeight:'800', whiteSpace:'nowrap' }}>
                                      {status.icon} {status.label}
                                    </span>
                                  </td>
                                  <td className="pmy-ds-migrated-1l3cbus">
                                    {job.attempts || 0}/{job.maxAttempts || 8}
                                  </td>
                                  <td style={{ padding:'12px 14px', fontSize:'11px', color:job.error?'#b91c1c':'#666', maxWidth:'290px' }}>
                                    <div title={String(detail)} className="pmy-ds-migrated-1v5n4uc">{String(detail)}</div>
                                  </td>
                                  <td className="pmy-ds-migrated-1nr18vm">
                                    {canRetry ? (
                                      <button type="button" onClick={()=>handleRequeueSyncJob(job.id)} disabled={syncQueueActionId===job.id}
                                        style={{ border:'1px solid #f59e0b', background:'#fff7ed', color:'#9a3412', borderRadius:'7px', padding:'7px 10px', fontSize:'11px', fontWeight:'800', cursor:syncQueueActionId===job.id?'wait':'pointer' }}>
                                        {syncQueueActionId===job.id ? '⏳ Reenviando' : '↻ Reenviar'}
                                      </button>
                                    ) : (
                                      <span className="pmy-ds-migrated-1q9f6mz">—</span>
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

                  <div className="pmy-ds-migrated-kewd2o">
                    <strong className="pmy-ds-migrated-1sbb1if">{tr("Como ler:", "How to read:")}</strong> cada linha representa o envio de um mesmo evento para um canal.
                    Se um canal estiver ✅ e outro ❌/🟠, existe uma divergência. O botão <strong>{tr("Reenviar", "Retry")}</strong> recoloca apenas aquele job na fila e tenta processá-lo novamente.
                  </div>
                </div>
              )}

              {/* ── SUB-TAB: PRODUTOS POR PLATAFORMA ── */}
              {intSubTab==='produtos' && (
                <div>
                  <p className="pmy-ds-migrated-wmzod0">
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
                          <span className="pmy-ds-migrated-1hxgxx8">{p.logo}</span>
                          {p.name}
                          {conn.connected && (
                            <span style={{
                              fontSize:'10px', fontWeight:'800', padding:'2px 7px', borderRadius:'10px',
                              background: activeProdPlatform===p.key ? 'rgba(255,255,255,0.25)' : '#e6f2e6',
                              color: activeProdPlatform===p.key ? '#fff' : 'var(--primary-green)'
                            }}>{activeCount} {tr('ativos','active')}</span>
                          )}
                          {!conn.connected && (
                            <span className="pmy-ds-migrated-1cryxg8">{tr('desconectado','disconnected')}</span>
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
                        <div className="pmy-ds-migrated-8gdtsu">
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
                            <div className="pmy-ds-migrated-168v0lw">
                              <div>
                                <div className="pmy-ds-migrated-onxnsb">
                                  {differences === 0 ? tr('✅ Canais consistentes nesta verificação','✅ Channels are consistent in this check') : `⚠️ ${differences} diferença${differences===1?'':'s'} encontrada${differences===1?'':'s'}`}
                                </div>
                                <div className="pmy-ds-migrated-19rbnr9">
                                  {result?.scopeNote}
                                </div>
                              </div>
                              <span className="pmy-ds-migrated-pia19m">
                                {result?.mode === 'LIVE_API' ? tr('API AO VIVO','LIVE API') : result?.mode === 'PUSH_API' ? tr('PUSH REAL','LIVE PUSH') : tr('SUPPLIER / PULL','SUPPLIER / PULL')}
                              </span>
                            </div>

                            <div className="pmy-ds-migrated-fkpu3p">
                              <div className="pmy-ds-migrated-14p0zei">
                                <div className="pmy-ds-migrated-4zzezf">{tr("📦 PRODUTOS", "📦 PRODUCTS")}</div>
                                <div className="pmy-ds-migrated-1hnqsny">{products.remote ?? products.centralAfter ?? 0}</div>
                                <div className="pmy-ds-migrated-1a8zem5">{tr("canal / cadastro verificado", "channel / record checked")}</div>
                              </div>
                              <div className="pmy-ds-migrated-14p0zei">
                                <div className="pmy-ds-migrated-4zzezf">{tr("🎟️ RESERVAS", "🎟️ BOOKINGS")}</div>
                                <div className="pmy-ds-migrated-1hnqsny">{reservations.remoteChecked ?? reservations.centralAfter ?? 0}</div>
                                <div className="pmy-ds-migrated-1a8zem5">{reservations.remoteChecked != null ? tr('pedidos consultados','orders checked') : tr('reservas recebidas na Central','bookings received by the Central')}</div>
                              </div>
                              <div className="pmy-ds-migrated-14p0zei">
                                <div className="pmy-ds-migrated-4zzezf">{tr("🕒 DISPONIBILIDADE", "🕒 AVAILABILITY")}</div>
                                <div className="pmy-ds-migrated-1hnqsny">{availability.checked ?? 0}</div>
                                <div className="pmy-ds-migrated-1a8zem5">{tr("tours verificados", "tours checked")}</div>
                              </div>
                              <div style={{ background:differences?'#fff7ed':'#ecfdf3', border:`1px solid ${differences?'#fed7aa':'#bbf7d0'}`, borderRadius:'9px', padding:'10px 12px' }}>
                                <div className="pmy-ds-migrated-4zzezf">{tr("🔎 DIFERENÇAS", "🔎 MISMATCHES")}</div>
                                <div style={{ fontSize:'18px', fontWeight:'900', marginTop:'3px', color:differences?'#c2410c':'#166534' }}>{differences}</div>
                                <div className="pmy-ds-migrated-1a8zem5">{tr("itens que pedem atenção", "items needing attention")}</div>
                              </div>
                            </div>

                            {(products.created > 0 || products.updated > 0 || reservations.rowsTouched > 0 || availability.pushed > 0) && (
                              <div className="pmy-ds-migrated-w7ojmn">
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
                              <div className="pmy-ds-migrated-18aizyn">
                                <div className="pmy-ds-migrated-17ziuht">{tr("Diferenças encontradas", "Mismatches found")}</div>
                                {[
                                  ...(products.missingInCentral || []),
                                  ...(products.missingInChannel || []),
                                  ...(products.changed || []),
                                  ...(reservations.differences || []),
                                ].slice(0, 12).map((item, index) => (
                                  <div key={`${item.id || item.name}-${index}`} className="pmy-ds-migrated-1uejl8w">
                                    • <strong>{item.name || item.id}</strong>: {item.reason}
                                  </div>
                                ))}
                              </div>
                            )}

                            {(result?.notes || []).map((note, index) => (
                              <div key={index} className="pmy-ds-migrated-1bna0ax">• {note}</div>
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
                      <div className="pmy-ds-migrated-s6nf5g">
                        <span className="pmy-ds-migrated-u0nbu1">⚠️</span>
                        <div>
                          <strong className="pmy-ds-migrated-jgrvw9">{tr("Plataforma não conectada", "Platform not connected")}</strong>
                          <span className="pmy-ds-migrated-1g1y4zs">Conecte esta plataforma na aba <strong>{tr("Conexões", "Connections")}</strong> para gerenciar seus produtos aqui.</span>
                        </div>
                      </div>
                    );
                    const prods = platformProducts[activeProdPlatform] || [];
                    const platform = allPlatforms.find(p=>p.key===activeProdPlatform);
                    const activeCount   = prods.filter(x=>x.active).length;
                    const inactiveCount = prods.filter(x=>!x.active).length;
                    // Plataforma conectada mas sem produtos ainda (ex: Viator recém conectado)
                    if (prods.length === 0) return (
                      <div className="pmy-ds-migrated-1f6juxi">
                        <div className="pmy-ds-migrated-miwane">{platform?.logo}</div>
                        <div className="pmy-ds-migrated-1q7ll21">
                          Nenhum produto sincronizado ainda
                        </div>
                        <div className="pmy-ds-migrated-1s1fe03">
                          {platform?.key === 'shopify'
                            ? tr('Sua loja Shopify não tem produtos cadastrados ainda, ou nenhum foi retornado pela API. Cadastre produtos no painel Shopify e recarregue esta página.','Your Shopify store has no products yet, or none were returned by the API. Create products in Shopify Admin and reload this page.')
                            : (lang === 'en' ? `The ${platform?.name} integration is connected, but no products are loaded on this screen yet. Click Sync Now to query the channel and run the comparison.` : `A integração com ${platform?.name} está conectada, mas ainda não há produtos carregados nesta tela. Clique em Sincronizar Agora para consultar o canal e executar a comparação.`)
                          }
                        </div>
                        {platform?.key !== 'shopify' && (
                          <button className="pmy-btn-submit pmy-ds-migrated-akz04o" 
                            disabled={manualSyncPlatform===platform?.key}
                            onClick={() => handleSyncPlatformNow(platform?.key)}>
                            {manualSyncPlatform===platform?.key ? tr('⏳ Consultando canal...','⏳ Checking channel...') : tr('🔄 Sincronizar Agora','🔄 Sync Now')}
                          </button>
                        )}
                        {platform?.key === 'shopify' && (
                          <a href="/admin/products/new" target="_blank" rel="noreferrer"
                            className="pmy-ds-migrated-hannr">
                            + Criar Produto no Shopify ↗
                          </a>
                        )}
                      </div>
                    );

                    return (
                      <div className="pmy-form-box pmy-ds-migrated-n0ba5g" >
                        {/* Header da tabela */}
                        <div className="pmy-ds-migrated-8gqr5e">
                          <div className="pmy-ds-migrated-r410jd">
                            <span className="pmy-ds-migrated-qkuf6f">{platform?.logo}</span>
                            <div>
                              <div className="pmy-ds-migrated-gqkgde">{platform?.name}</div>
                              <div className="pmy-ds-migrated-xfo8zj">
                                <span className="pmy-ds-migrated-1lf8l32">{activeCount} {tr('ativos','active')}</span>
                                <span className="pmy-ds-migrated-16x6z7l">•</span>
                                <span className="pmy-ds-migrated-chpnty">{inactiveCount} {tr('inativos','inactive')}</span>
                                <span className="pmy-ds-migrated-16x6z7l">•</span>
                                {prods.length} {tr('produtos no total','products total')}
                              </div>
                            </div>
                          </div>
                          <div className="pmy-ds-migrated-1yhy4bd">
                            <button type="button"
                              onClick={() => handleSyncPlatformNow(platform?.key)}
                              disabled={manualSyncPlatform===platform?.key}
                              style={{ border:'1px solid #b9d2c0', background:'#f3faf5', color:'#245936', borderRadius:'8px', padding:'8px 13px', fontSize:'12px', fontWeight:'800', cursor:manualSyncPlatform===platform?.key?'wait':'pointer' }}>
                              {manualSyncPlatform===platform?.key ? tr('⏳ Consultando...','⏳ Checking...') : tr('🔄 Sincronizar agora','🔄 Sync now')}
                            </button>
                            <button className="pmy-btn-submit pmy-ds-migrated-1wmgly4" 
                              onClick={()=>alert(tr('Para adicionar um novo produto, cadastre-o primeiro no Shopify e ele será sincronizado automaticamente.','To add a new product, create it in Shopify first and it will be synced automatically.'))}>
                              + Adicionar Produto
                            </button>
                          </div>
                        </div>

                        {/* Tabela */}
                        <div className="pmy-ds-migrated-6tnpw1">
                          <table className="pmy-prod-table">
                            <thead>
                              <tr>
                                <th>{tr("Produto / Tour", "Product / Tour")}</th>
                                <th>{tr("SKU / ID Externo", "SKU / External ID")}</th>
                                <th>{tr("Preço", "Price")}</th>
                                <th>{tr("Sincronizado", "Synced")}</th>
                                <th>{tr("Status", "Status")}</th>
                                <th className="pmy-ds-migrated-1sl8cua">{tr("Ativo", "Active")}</th>
                              </tr>
                            </thead>
                            <tbody>
                              {prods.map(prod => (
                                <tr key={prod.id} className={`pmy-prod-row ${prod.active?'active-prod':''}`}>
                                  <td>
                                    <div className="pmy-ds-migrated-mplo1d">{prod.name}</div>
                                  </td>
                                  <td>
                                    <code className="pmy-ds-migrated-baxb8w">{prod.sku}</code>
                                  </td>
                                  <td className="pmy-ds-migrated-h64zcu">{prod.price}</td>
                                  <td>
                                    {prod.synced
                                      ? <span className="pmy-ds-migrated-xjumd6">{tr("✓ Sincronizado", "✓ Synced")}</span>
                                      : <span className="pmy-ds-migrated-8f66dt">{tr("— Pendente", "— Pending")}</span>
                                    }
                                  </td>
                                  <td>
                                    <span className={`pmy-prod-status ${prod.active?'on':'off'}`}>
                                      <span className="pmy-ds-migrated-1ihz847"></span>
                                      {prod.active ? tr('Ativo','Active') : tr('Inativo','Inactive')}
                                    </span>
                                  </td>
                                  <td className="pmy-ds-migrated-1sl8cua">
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
                        <div className="pmy-ds-migrated-12g27kh">
                          <div className="pmy-ds-migrated-181vluz">
                            <span className="pmy-ds-migrated-oeqypp"></span>
                            Produto ativo = aparece nas plataformas e aceita reservas
                          </div>
                          <div className="pmy-ds-migrated-181vluz">
                            <span className="pmy-ds-migrated-1yis1w6"></span>
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
