import { Button, EmptyState, Icon, Tabs, Toast } from "./PmyUI";

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
    shopifyValidationCancelLoading,
    cancelShopifyValidation,
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

              {/* ── SUB-TAB: CONEXÕES ── */}
              {intSubTab==='conexoes' && (
                <div>
                  <p className="pmy-ds-migrated-5553a5">
                    {lang==='pt' ? 'Canais de reserva sincronizam vendas e disponibilidade. Integrações de conteúdo, como Tripadvisor, ficam separadas.' : 'Booking channels sync sales and availability. Content integrations, such as Tripadvisor, are kept separate.'}
                  </p>
                  <div className="pmy-ds-migrated-148qhts">
                    <div className="pmy-ds-migrated-1c2aa5v">
                      <span className="pmy-ds-connection-counter-icon is-connected"><Icon name="check" size={18} /></span>
                      <div>
                        <div className="pmy-ds-migrated-m37lxr">{reservationPlatforms.filter(p=>platformConnections[p.key]?.connected).length}</div>
                        <div className="pmy-ds-migrated-htnqm2">{tr("Conectadas", "Connected")}</div>
                      </div>
                    </div>
                    <div className="pmy-ds-migrated-1c2aa5v">
                      <span className="pmy-ds-connection-counter-icon"><Icon name="clock" size={18} /></span>
                      <div>
                        <div className="pmy-ds-migrated-1ppuvw4">{reservationPlatforms.filter(p=>!platformConnections[p.key]?.connected).length}</div>
                        <div className="pmy-ds-migrated-htnqm2">{tr("Pendentes", "Pending")}</div>
                      </div>
                    </div>
                  </div>
                  <div className="pmy-ds-migrated-xqzku2">
                    {reservationPlatforms.map(platform => {
                      const conn = platformConnections[platform.key] || {};
                      const isPendingOnboarding =
                        conn.onboardingPending || conn.available === false;
                      const isConfigured = Boolean(conn.configured);
                      const statusLabel = conn.connected
                        ? tr("CONECTADO · TRÁFEGO VERIFICADO", "CONNECTED · TRAFFIC VERIFIED")
                        : isConfigured
                          ? tr("CREDENCIAL CONFIGURADA", "CREDENTIAL CONFIGURED")
                          : isPendingOnboarding
                            ? tr("ONBOARDING PENDENTE", "ONBOARDING PENDING")
                            : tr("NÃO CONFIGURADO", "NOT CONFIGURED");
                      const statusClass = conn.connected
                        ? "is-connected"
                        : isConfigured
                          ? "is-configured"
                          : isPendingOnboarding
                            ? "is-pending"
                            : "";
                      const actionLabel = conn.connected
                        ? tr("Gerenciar integração", "Manage integration")
                        : isConfigured
                          ? tr("Gerenciar credencial", "Manage credential")
                          : isPendingOnboarding
                            ? tr("Ver status", "View status")
                            : tr("Configurar", "Configure");

                      return (
                        <div
                          key={platform.key}
                          className={[
                            `pmy-int-card-v2 ${conn.connected ? "connected" : ""}`,
                            isConfigured && !conn.connected ? "is-configured" : "",
                            isPendingOnboarding ? "is-pending" : "",
                            "pmy-ds-migrated-15s4y9o",
                          ].filter(Boolean).join(" ")}
                        >
                          <div className="pmy-int-top">
                            <span className="pmy-int-logo-v2"><Icon name={platform.icon} size={22} /></span>
                            {conn.lastSync && (
                              <span className="pmy-int-sync-info">
                                <Icon name="clock" size={12} /> {conn.lastSync}
                              </span>
                            )}
                          </div>
                          <div className="pmy-ds-migrated-1gcp9k1">
                            <span
                              className={`pmy-int-status-dot ${conn.connected ? "on" : isConfigured ? "configured" : isPendingOnboarding ? "pending" : "off"}`}
                            ></span>
                            <span className={`pmy-ds-connection-state ${statusClass}`}>
                              {statusLabel}
                            </span>
                          </div>
                          <div className="pmy-int-name-v2">{platform.name}</div>
                          <div className="pmy-int-desc-v2">{lang==='pt' ? platform.desc.pt : platform.desc.en}</div>
                          {isConfigured && !conn.connected && (
                            <div className="pmy-int-connection-note">
                              {tr(
                                "A credencial está salva no backend e o caminho técnico local foi testado. O canal só vira conectado quando a Central receber uma chamada autenticada real.",
                                "The credential is stored on the backend and the local technical path was tested. The channel becomes connected only after the Central receives a real authenticated request.",
                              )}
                            </div>
                          )}
                          {isPendingOnboarding && (
                            <div className="pmy-int-connection-note">
                              {tr(
                                "Campos de credencial ocultos até existir uma API verificável para a conta PMY.",
                                "Credential fields are hidden until PMY has an API that can be verified.",
                              )}
                            </div>
                          )}
                          <div className="pmy-int-actions">
                            <Button
                              variant={conn.connected || isConfigured || isPendingOnboarding ? "secondary" : "primary"}
                              size="sm"
                              icon={isPendingOnboarding ? "clock" : "settings"}
                              onClick={()=>handleOpenConnect(platform.key)}
                            >
                              {actionLabel}
                            </Button>
                            {conn.connected && ["viator", "civitatis"].includes(platform.key) && (
                              <button
                                className="pmy-int-btn-disconnect"
                                onClick={()=>handleDisconnect(platform.key)}
                              >
                                {tr("Remover credencial", "Remove credential")}
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                    <div className="pmy-ds-migrated-1konp2u">
                      <div className="pmy-ds-migrated-166ghmy"><Icon name="star" size={15} /> {tr("Conteúdo & reputação", "Content & Reputation")}</div>
                      <div className="pmy-ds-migrated-htnqm2">{tr("Integrações que enriquecem reviews, ratings, fotos e presença da marca. Não entram na Agenda nem no inventário de reservas.", "Integrations that enrich reviews, ratings, photos, and brand presence. They do not enter the Agenda or booking inventory.")}</div>
                    </div>
                    {contentPlatforms.map(platform => {
                      const conn = platformConnections[platform.key];
                      return (
                        <div key={platform.key} className="pmy-int-card-v2 pmy-ds-migrated-1btvbiy" >
                          <div className="pmy-int-top">
                            <span className="pmy-int-logo-v2"><Icon name={platform.icon} size={22} /></span>
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
                            <Button variant="secondary" size="sm" icon="star" onClick={()=>handleOpenConnect(platform.key)}>
                              {tr("Ver integração de conteúdo", "View content integration")}
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                    {customIntegrations.map(c => (
                      <div className="pmy-int-card-v2 connected pmy-ds-migrated-15s4y9o" key={c.id} >
                        <div className="pmy-int-top"><span className="pmy-int-logo-v2"><Icon name="settings" size={22} /></span><span className="pmy-int-sync-info">Custom API</span></div>
                        <div className="pmy-int-name-v2">{c.name}</div>
                        <div className="pmy-int-desc-v2 pmy-ds-migrated-tlps5h" >Endpoint: {c.url}</div>
                      </div>
                    ))}
                  </div>
                  <div className="pmy-form-box pmy-ds-migrated-8xzf4b" >
                    <h3 className="pmy-ds-heading-with-icon"><Icon name="link" size={17} /> {tr("Conectar Nova Plataforma via API", "Connect New Platform via API")}</h3>
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
                <div className="pmy-sync-log">
                  <div className="pmy-ds-migrated-1acd7k0">
                    <div>
                      <h3 className="pmy-ds-migrated-cwjrli pmy-ds-heading-with-icon"><Icon name="refresh" size={17} /> {tr("Log de Sincronização", "Sync Log")}</h3>
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
                      <Button type="button" variant="secondary" size="sm" icon="refresh" onClick={loadSyncQueue} disabled={syncQueueLoading}>
                        {syncQueueLoading ? tr('Atualizando...','Refreshing...') : tr('Atualizar','Refresh')}
                      </Button>
                      <button type="button" onClick={runSyncQueueNow} disabled={syncQueueActionId==='run'}
                        className="pmy-btn-submit pmy-ds-migrated-15y797" >
                        {syncQueueActionId==='run' ? tr('Processando...','Processing...') : tr('Processar fila agora','Process queue now')}
                      </button>
                    </div>
                  </div>

                  {syncQueueError && (
                    <Toast tone="danger" className="pmy-u-mb-4">{syncQueueError}</Toast>
                  )}

                  <div className={`pmy-ds-validation-panel ${shopifyValidation?.status === 'FULLY_PASSED' ? "is-passed" : ""}`}>
                    <div className="pmy-ds-migrated-wwbjgp">
                      <div>
                        <div className="pmy-validation-heading">
                          <span className="pmy-validation-heading__icon"><Icon name="store" size={18} /></span>
                          <span>{tr('Validação Shopify de ponta a ponta','Shopify end-to-end validation')}</span>
                        </div>
                        <div className="pmy-validation-copy">
                          Cria um pedido Shopify de teste com 1 participante e pagamento pendente, comprova os cinco passos de entrada e, em seguida, cancela o mesmo pedido para validar Booking cancelado e vaga devolvida.
                        </div>
                      </div>
                      <div className="pmy-validation-actions">
                        <Button type="button" variant="secondary" size="sm" icon="refresh" onClick={loadShopifyValidation}>
                          {tr('Verificar','Check')}
                        </Button>
                        <button
                          type="button"
                          onClick={startShopifyValidation}
                          disabled={
                            shopifyValidationLoading ||
                            shopifyValidationCancelLoading ||
                            ['WAITING', 'PASSED', 'CANCELLATION_WAITING'].includes(shopifyValidation?.status)
                          }
                          className="pmy-btn-submit pmy-ds-compact-action"
                        >
                          {shopifyValidationLoading
                            ? tr('Criando pedido...','Creating order...')
                            : shopifyValidation?.status === 'WAITING'
                              ? tr('Aguardando webhook...','Waiting for webhook...')
                              : shopifyValidation?.status === 'PASSED'
                                ? tr('Cancele o teste atual','Cancel current test')
                                : shopifyValidation?.status === 'CANCELLATION_WAITING'
                                  ? tr('Validando cancelamento...','Validating cancellation...')
                                  : tr('Executar teste real','Run real test')}
                        </button>
                      </div>
                    </div>

                    {shopifyValidationError && (
                      <div className="pmy-validation-message is-danger" role="alert">
                        <Icon name="warning" size={18} />
                        <div>
                          <strong>{tr('Não foi possível iniciar a validação','Validation could not be started')}</strong>
                          <span>{shopifyValidationError}</span>
                        </div>
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
                            <div key={label} className={`pmy-ds-validation-step ${ok ? "is-complete" : ""}`}>
                              <div className={`pmy-ds-validation-step__label ${ok ? "is-complete" : ""}`}>
                                <Icon name={ok ? "check" : "clock"} size={13} /> {label}
                              </div>
                            </div>
                          ))}
                        </div>

                        <div className="pmy-ds-migrated-tyzer6">
                          <div className="pmy-ds-migrated-hd5qqp">
                            <strong>{tr("Pedido:", "Order:")}</strong> {shopifyValidation.order?.name || '—'}<br/>
                            <span className="pmy-ds-migrated-19kf531">
                              {shopifyValidation.order?.cancelledAt
                                ? tr('cancelado no Shopify','cancelled in Shopify')
                                : shopifyValidation.order?.financialStatus || tr('status financeiro pendente','pending financial status')}
                            </span>
                          </div>
                          <div className="pmy-ds-migrated-hd5qqp">
                            <strong>{tr("Tour:", "Tour:")}</strong> {shopifyValidation.slot?.tourTitle || '—'}<br/>
                            <span className="pmy-ds-migrated-19kf531">{shopifyValidation.slot?.date || '—'} · {shopifyValidation.slot?.time || '—'}</span>
                          </div>
                          <div className="pmy-ds-migrated-hd5qqp">
                            <strong>{tr("Vagas:", "Availability:")}</strong>{' '}
                            {shopifyValidation.slot?.remainingBefore ?? '—'} → {shopifyValidation.slot?.remainingAfterBooking ?? '—'}
                            {shopifyValidation.cancellation?.requested && (
                              <> → {shopifyValidation.slot?.remainingCurrent ?? '—'}</>
                            )}
                            <br/>
                            <span className="pmy-ds-migrated-19kf531">
                              {tr('antes → após Booking','before → after Booking')}
                              {shopifyValidation.cancellation?.requested ? tr(' → após cancelamento',' → after cancellation') : ''}
                            </span>
                          </div>
                        </div>

                        {shopifyValidation.status === 'PASSED' && (
                          <>
                            <div className="pmy-validation-message is-success">
                              <Icon name="check" size={18} />
                              <div>
                                <strong>{tr('Entrada validada','Inbound flow validated')}</strong>
                                <span>{tr('Pedido, webhook, Booking, Agenda e redução de vagas concluídos.','Order, webhook, Booking, Agenda and availability reduction completed.')}</span>
                              </div>
                            </div>
                            <div className="pmy-ds-migrated-11c3s9p">
                              <button
                                type="button"
                                onClick={cancelShopifyValidation}
                                disabled={shopifyValidationCancelLoading}
                                className="pmy-btn-submit pmy-ds-compact-action"
                              >
                                {shopifyValidationCancelLoading
                                  ? tr('Cancelando teste...','Cancelling test...')
                                  : tr('Cancelar teste e validar devolução','Cancel test and validate restoration')}
                              </button>
                            </div>
                          </>
                        )}

                        {shopifyValidation.cancellation?.requested && (
                          <div className="pmy-u-mt-4">
                            <div className="pmy-validation-subheading">
                              {tr('Fase 2 · Cancelamento e devolução da vaga','Phase 2 · Cancellation and seat restoration')}
                            </div>
                            <div className="pmy-ds-migrated-2blvc1">
                              {[
                                [tr('Pedido cancelado Shopify','Shopify order cancelled'), shopifyValidation.cancellation?.steps?.orderCancelled],
                                [tr('Webhook de cancelamento','Cancellation webhook'), shopifyValidation.cancellation?.steps?.webhookReceived],
                                [tr('Booking cancelado','Booking cancelled'), shopifyValidation.cancellation?.steps?.bookingCancelled],
                                [tr('Vaga devolvida','Seat restored'), shopifyValidation.cancellation?.steps?.capacityRestored],
                              ].map(([label,ok]) => (
                                <div key={label} className={`pmy-ds-validation-step ${ok ? "is-complete" : ""}`}>
                                  <div className={`pmy-ds-validation-step__label ${ok ? "is-complete" : ""}`}>
                                    <Icon name={ok ? "check" : "clock"} size={13} /> {label}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {shopifyValidation.status === 'WAITING' && (
                          <div className="pmy-validation-message is-info">
                            <Icon name="clock" size={18} />
                            <span>{tr('Pedido criado. A Central está aguardando e conferindo o webhook automaticamente.','Order created. The Central is waiting for and checking the webhook automatically.')}</span>
                          </div>
                        )}

                        {shopifyValidation.status === 'CANCELLATION_WAITING' && (
                          <div className="pmy-validation-message is-info">
                            <Icon name="clock" size={18} />
                            <span>{tr('Cancelamento solicitado. A Central aguarda o webhook, o Booking cancelado e a devolução da vaga.','Cancellation requested. The Central is waiting for the webhook, cancelled Booking and restored availability.')}</span>
                          </div>
                        )}

                        {shopifyValidation.status === 'FULLY_PASSED' && (
                          <div className="pmy-validation-message is-success">
                            <Icon name="check" size={18} />
                            <div>
                              <strong>{tr('Validação concluída','Validation complete')}</strong>
                              <span>{tr('O pedido ocupou a vaga, foi cancelado e a capacidade voltou à Central.','The order consumed availability, was cancelled and the capacity returned to the Central.')}</span>
                            </div>
                          </div>
                        )}

                        {shopifyValidation.status === 'FAILED' && (
                          <div className="pmy-validation-message is-danger">
                            <Icon name="warning" size={18} />
                            <span>{tr('A validação encontrou uma falha no processamento do Shopify. Consulte o log abaixo para o detalhe técnico.','The validation found a Shopify processing failure. Check the log below for technical details.')}</span>
                          </div>
                        )}
                      </div>
                    )}

                    {!shopifyValidation?.exists && !shopifyValidationError && (
                      <div className="pmy-validation-empty">
                        {tr('Nenhum teste executado ainda. A validação usa 1 participante, pagamento pendente e não realiza cobrança ao cliente.','No test has been run yet. Validation uses 1 participant, pending payment and does not charge a customer.')}
                      </div>
                    )}
                  </div>
                  {(() => {
                    const stats = syncQueueData.stats || {};
                    const divergent = Number(stats.retry || 0) + Number(stats.blocked || 0) + Number(stats.dead || 0);
                    const cards = [
                      { icon: 'check', label: tr('Concluídos','Completed'), value: stats.completed || 0, tone: 'success' },
                      { icon: 'clock', label: tr('Pendentes','Pending'), value: (stats.pending || 0) + (stats.processing || 0), tone: 'warning' },
                      { icon: 'refresh', label: tr('Em nova tentativa','Retrying'), value: stats.retry || 0, tone: 'warning' },
                      { icon: 'warning', label: tr('Divergências','Mismatches'), value: divergent, tone: divergent > 0 ? 'danger' : 'success' },
                    ];
                    return (
                      <div className="pmy-ds-migrated-87tlda">
                        {cards.map(({icon,label,value,tone}) => (
                          <div key={label} className={`pmy-ds-sync-metric is-${tone}`}>
                            <div className="pmy-ds-sync-metric__label"><Icon name={icon} size={14} /> {label}</div>
                            <div className="pmy-ds-sync-metric__value">{value}</div>
                          </div>
                        ))}
                      </div>
                    );
                  })()}

                  <div className="pmy-form-box pmy-ds-migrated-q9arce" >
                    {syncQueueLoading && syncQueueData.jobs.length === 0 ? (
                      <div className="pmy-ds-migrated-1htyqwv">{tr("Carregando histórico de sincronização...", "Loading sync history...")}</div>
                    ) : syncQueueData.jobs.length === 0 ? (
                      <EmptyState
                        icon="refresh"
                        compact
                        title={tr("Nenhum evento de sincronização registrado ainda", "No sync events recorded yet")}
                        description={tr(
                          "Os próximos bloqueios, reservas, cancelamentos e alterações de capacidade aparecerão aqui.",
                          "Upcoming blocks, bookings, cancellations, and capacity changes will appear here."
                        )}
                      />
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
                              const provider = syncProviderMeta[job.provider] || { label:job.provider || '—', icon:'link' };
                              const source = syncProviderMeta[job.sourcePlatform] || { label:job.sourcePlatform || 'Central', icon:'dashboard' };
                              const detail = job.error || job.result?.reason || job.result?.detail || (job.status === 'COMPLETED' ? 'Sincronização concluída' : '—');
                              const canRetry = ['RETRY','BLOCKED','DEAD'].includes(job.status);
                              return (
                                <tr key={job.id} className={['RETRY','BLOCKED','DEAD'].includes(job.status) ? "pmy-ds-sync-row is-problem" : "pmy-ds-sync-row"}>
                                  <td className="pmy-ds-migrated-1c9koyg">
                                    {formatSyncTime(job.lastAttemptAt || job.updatedAt || job.createdAt)}
                                  </td>
                                  <td className="pmy-ds-migrated-11ydk3t">
                                    <div className="pmy-ds-migrated-28a1ij">{syncEventLabel(job.eventType)}</div>
                                    <div className="pmy-ds-migrated-7iqvl9">{job.eventType}</div>
                                  </td>
                                  <td className="pmy-ds-migrated-1gem2sh"><span className="pmy-ds-icon-label"><Icon name={source.icon} size={13} /> {source.label}</span></td>
                                  <td className="pmy-ds-migrated-cegdm0"><span className="pmy-ds-icon-label"><Icon name={provider.icon} size={13} /> {provider.label}</span></td>
                                  <td className="pmy-ds-migrated-zsxq6o">
                                    <span className={`pmy-ds-sync-status is-${String(job.status || "pending").toLowerCase()}`}>
                                      {status.label}
                                    </span>
                                  </td>
                                  <td className="pmy-ds-migrated-1l3cbus">
                                    {job.attempts || 0}/{job.maxAttempts || 8}
                                  </td>
                                  <td className={`pmy-ds-sync-detail ${job.error ? "is-error" : ""}`}>
                                    <div title={String(detail)} className="pmy-ds-migrated-1v5n4uc">{String(detail)}</div>
                                  </td>
                                  <td className="pmy-ds-migrated-1nr18vm">
                                    {canRetry ? (
                                      <Button type="button" variant="secondary" size="sm" icon="refresh" onClick={()=>handleRequeueSyncJob(job.id)} disabled={syncQueueActionId===job.id}>
                                        {syncQueueActionId===job.id ? tr('Reenviando','Retrying') : tr('Reenviar','Retry')}
                                      </Button>
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
                    Se um canal estiver e outro falha ou nova tentativa, existe uma divergência. O botão <strong>{tr("Reenviar", "Retry")}</strong> recoloca apenas aquele job na fila e tenta processá-lo novamente.
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
                          <span className="pmy-ds-migrated-1hxgxx8"><Icon name={p.icon} size={18} /></span>
                          {p.name}
                          {conn.connected && (
                            <span className={`pmy-ds-product-count ${activeProdPlatform===p.key ? "is-active" : ""}`}>{activeCount} {tr('ativos','active')}</span>
                          )}
                          {!conn.connected && (
                            <span className="pmy-ds-migrated-1cryxg8">{tr('desconectado','disconnected')}</span>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {(manualSyncError || (manualSyncResult?.platform === activeProdPlatform)) && (
                    <div className={`pmy-ds-manual-sync-result ${manualSyncError ? "is-error" : "is-success"}`}>
                      {manualSyncError ? (
                        <div className="pmy-validation-message is-danger">
                          <Icon name="warning" size={17} />
                          <span>{manualSyncError}</span>
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
                                  {differences === 0 ? tr('Canais consistentes nesta verificação','Channels are consistent in this check') : `${differences} diferença${differences===1?'':'s'} encontrada${differences===1?'':'s'}`}
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
                                <div className="pmy-ds-migrated-4zzezf"><><Icon name="store" size={13} /> {tr("PRODUTOS", "PRODUCTS")}</></div>
                                <div className="pmy-ds-migrated-1hnqsny">{products.remote ?? products.centralAfter ?? 0}</div>
                                <div className="pmy-ds-migrated-1a8zem5">{tr("canal / cadastro verificado", "channel / record checked")}</div>
                              </div>
                              <div className="pmy-ds-migrated-14p0zei">
                                <div className="pmy-ds-migrated-4zzezf"><><Icon name="ticket" size={13} /> {tr("RESERVAS", "BOOKINGS")}</></div>
                                <div className="pmy-ds-migrated-1hnqsny">{reservations.remoteChecked ?? reservations.centralAfter ?? 0}</div>
                                <div className="pmy-ds-migrated-1a8zem5">{reservations.remoteChecked != null ? tr('pedidos consultados','orders checked') : tr('reservas recebidas na Central','bookings received by the Central')}</div>
                              </div>
                              <div className="pmy-ds-migrated-14p0zei">
                                <div className="pmy-ds-migrated-4zzezf"><><Icon name="clock" size={13} /> {tr("DISPONIBILIDADE", "AVAILABILITY")}</></div>
                                <div className="pmy-ds-migrated-1hnqsny">{availability.checked ?? 0}</div>
                                <div className="pmy-ds-migrated-1a8zem5">{tr("tours verificados", "tours checked")}</div>
                              </div>
                              <div className={`pmy-ds-mismatch-card ${differences ? "is-warning" : "is-success"}`}>
                                <div className="pmy-ds-migrated-4zzezf">{tr("Diferenças", "Mismatches")}</div>
                                <div className={`pmy-ds-mismatch-card__value ${differences ? "is-warning" : "is-success"}`}>{differences}</div>
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
                        <span className="pmy-ds-migrated-u0nbu1"><Icon name="warning" size={24} /></span>
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
                        <div className="pmy-ds-migrated-miwane"><Icon name={platform?.icon || "ticket"} size={34} /></div>
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
                            {manualSyncPlatform===platform?.key ? tr('Consultando canal...','Checking channel...') : tr('Sincronizar agora','Sync now')}
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
                            <span className="pmy-ds-migrated-qkuf6f"><Icon name={platform?.icon || "ticket"} size={24} /></span>
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
                            <Button type="button"
                              variant="secondary"
                              size="sm"
                              icon="refresh"
                              onClick={() => handleSyncPlatformNow(platform?.key)}
                              disabled={manualSyncPlatform===platform?.key}>
                              {manualSyncPlatform===platform?.key ? tr('Consultando...','Checking...') : tr('Sincronizar agora','Sync now')}
                            </Button>
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
                                      ? <span className="pmy-ds-migrated-xjumd6">{tr("Sincronizado", "Synced")}</span>
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
