import { Button, EmptyState, Icon, Toast } from "./PmyUI";

export default function IntegrationSyncLogPanel({
  bookings,
  cancelShopifyValidation,
  formatSyncTime,
  handleRequeueSyncJob,
  lang,
  loadShopifyValidation,
  loadSyncQueue,
  runSyncQueueNow,
  shopifyValidation,
  shopifyValidationCancelLoading,
  shopifyValidationError,
  shopifyValidationLoading,
  startShopifyValidation,
  syncEventLabel,
  syncProviderMeta,
  syncQueueActionId,
  syncQueueData,
  syncQueueError,
  syncQueueLastLoaded,
  syncQueueLoading,
  syncStatusMeta,
  tours,
}) {
  const tr = (pt, en) => lang === "en" ? en : pt;

  return (
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
                          <EmptyState
                            icon="refresh"
                            compact
                            title={tr("Carregando histórico", "Loading history")}
                            description={tr(
                              "Buscando os eventos mais recentes da fila de sincronização.",
                              "Fetching the latest synchronization queue events.",
                            )}
                          />
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
                          <div
                            className="pmy-ds-migrated-13izxgm pmy-ds-table-scroll-region"
                            role="region"
                            aria-label={tr("Histórico de sincronização", "Synchronization history")}
                            tabIndex={0}
                          >
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
                        Se o mesmo evento tiver status diferentes entre os canais, existe uma divergência. O botão <strong>{tr("Reenviar", "Retry")}</strong> recoloca apenas aquele job na fila e tenta processá-lo novamente.
                      </div>
                    </div>
  );
}
