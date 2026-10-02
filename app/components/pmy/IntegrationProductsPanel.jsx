import { Button, Icon } from "./PmyUI";

export default function IntegrationProductsPanel({
  activeProdPlatform,
  allPlatforms,
  handleSyncPlatformNow,
  lang,
  manualSyncError,
  manualSyncPlatform,
  manualSyncResult,
  platformConnections,
  platformProducts,
  reservationPlatforms,
  setActiveProdPlatform,
}) {
  const tr = (pt, en) => lang === "en" ? en : pt;

  return (
    <div>
                      <p className="pmy-ds-migrated-wmzod0">
                        {tr(
                          "Visualize o catálogo e o status retornados pelos canais de venda e reserva. Alterações de produto continuam sendo feitas na plataforma de origem.",
                          "View the catalog and status returned by booking and sales channels. Product changes remain managed in the source platform.",
                        )}
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
                              <span className="pmy-ds-migrated-1g1y4zs">
                                {tr("Conecte esta plataforma na aba ", "Connect this platform in the ")}
                                <strong>{tr("Conexões", "Connections")}</strong>
                                {tr(" para consultar o catálogo sincronizado.", " tab to view the synchronized catalog.")}
                              </span>
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

                              </div>
                            </div>
    
                            {/* Tabela */}
                                                        <div className="pmy-ds-migrated-6tnpw1 pmy-ds-table-wrap" role="region" aria-label={tr("Produtos do canal", "Channel products")}>
                              <table className="pmy-prod-table">
                                <thead>
                                  <tr>
                                    <th>{tr("Produto / Tour", "Product / Tour")}</th>
                                    <th>{tr("SKU / ID Externo", "SKU / External ID")}</th>
                                    <th>{tr("Preço", "Price")}</th>
                                    <th>{tr("Sincronizado", "Synced")}</th>
                                    <th>{tr("Status no canal", "Channel status")}</th>
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
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
    
                            <div className="pmy-ds-migrated-12g27kh">
                              <div className="pmy-ds-migrated-181vluz">
                                <Icon name="info" size={14} />
                                {tr(
                                  "O status é somente leitura e reflete o último dado retornado pelo canal. Ative ou desative produtos diretamente na plataforma de origem.",
                                  "Status is read-only and reflects the latest value returned by the channel. Activate or deactivate products in the source platform.",
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
  );
}
