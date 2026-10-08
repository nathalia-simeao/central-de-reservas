import { useState } from "react";
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
  const [diagnostic, setDiagnostic] = useState(null);
  const [diagnosticError, setDiagnosticError] = useState("");
  const [diagnosticBusy, setDiagnosticBusy] = useState(false);
  const runGygDiagnostic = async () => {
    setDiagnosticBusy(true);
    setDiagnosticError("");
    setDiagnostic(null);
    try {
      const token = await window.shopify?.idToken?.();
      if (!token) throw new Error(tr("Abra a Central dentro do admin Shopify para autenticar o diagnóstico.", "Open Central within Shopify admin to authenticate diagnostics."));
      const url = new URL("/api/admin-gyg-availability-diagnostic", window.location.origin);
      url.searchParams.set("productId", "9db12544-8475-4681-83a0-d02465ef88a7");
      url.searchParams.set("date", "2026-10-16");
      const response = await fetch(url.toString(), {
        credentials: "include",
        headers: { "Authorization": `Bearer ${token}`, "Accept": "application/json" },
      });
      if (!response.headers.get("content-type")?.includes("application/json")) throw new Error(tr("O servidor retornou uma página de autenticação em vez do diagnóstico.", "Server returned authentication HTML instead of diagnostics."));
      const payload = await response.json();
      if (!response.ok || payload.error) throw new Error(payload.error || `HTTP ${response.status}`);
      setDiagnostic(payload);
    } catch (e) {
      setDiagnosticError(e.message || String(e));
    } finally {
      setDiagnosticBusy(false);
    }
  };

  const gygItems = platformProducts.getyourguide || [];
  const gygGroups = Object.values(gygItems.reduce((map, product) => {
    const key = product.masterTourId || product.id;
    if (!map[key]) map[key] = { key, name: product.masterTourTitle || product.name?.split(" · ")[0] || product.name, options: [] };
    map[key].options.push(product);
    return map;
  }, {})).sort((a,b)=>a.name.localeCompare(b.name));
  const gygLinked = gygItems.filter(p=>Boolean(p.gygOptionId)).length;
  const gygUnlinked = gygItems.length - gygLinked;
  const money = (value, currency = "EUR") => {
    const amount = Number(value);
    if (!Number.isFinite(amount) || amount < 0 || value === null || value === undefined || value === "") return null;
    try { return new Intl.NumberFormat(lang === "en" ? "en-GB" : "pt-PT", { style: "currency", currency: currency || "EUR" }).format(amount); }
    catch { return String(value) + " " + currency; }
  };
  const variantLabel = (variant) => variant.passengerCategory || variant.title || variant.sku || tr("Categoria sem nome", "Unnamed category");


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
                                <span className={`pmy-ds-product-count ${activeProdPlatform===p.key ? "is-active" : ""}`}>{activeCount} {activeProdPlatform === "getyourguide" ? tr("opções internas ativas", "active internal options") : tr("ativos","active")}</span>
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
                                    {prods.length} {activeProdPlatform === "getyourguide" ? tr("opções internas no total", "internal options total") : tr("produtos no total", "products total")}
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
    
                            {activeProdPlatform === "getyourguide" && (
                              <section style={{margin:"12px 0", padding:12, border:"1px solid #cbd5d0",borderRadius:10}}>
                                <strong>{tr("Diagnóstico de bloqueio GYG · Jerónimos · 16/10/2026", "GYG availability diagnostic · Jeronimos · Oct 16, 2026")}</strong>
                                <p style={{fontSize:12}}>{tr("Leitura administrativa: não cria, altera ou cancela reservas.", "Admin read-only: no reservations created, updated or cancelled.")}</p>
                                <Button type="button" onClick={runGygDiagnostic} disabled={diagnosticBusy}>{diagnosticBusy ? tr("Consultando...", "Checking...") : tr("Verificar bloqueio e resposta da API", "Check block and API response")}</Button>
                                {diagnosticError && <p role="alert" style={{color:"#b42318",overflowWrap:"anywhere"}}>{diagnosticError}</p>}
                                {diagnostic && <pre style={{whiteSpace:"pre-wrap",overflowWrap:"anywhere",fontSize:12,maxHeight:320,overflow:"auto"}}>{JSON.stringify(diagnostic,null,2)}</pre>}
                              </section>
                            )}
                            {activeProdPlatform === "getyourguide" && (
                              <section aria-label={tr("Cadastro interno de opções GYG", "Internal GYG option catalog")} style={{ margin: "16px 0" }}>
                                <p style={{ fontSize: 13, lineHeight: 1.6, margin: "0 0 12px" }}>
                                  <strong>{gygGroups.length} {tr("passeios mestre", "master tours")} · {gygItems.length} {tr("opções internas", "internal options")} · {gygLinked} {tr("com ID GYG", "with GYG ID")} · {gygUnlinked} {tr("sem vínculo", "without mapping")}.</strong>
                                  {" "}{tr("Estes números NÃO são o catálogo publicado do portal. O estado Bookable, Deactivated ou Rejected precisa ser confirmado no GYG.", "These are NOT published portal product counts. Bookable, Deactivated or Rejected must be confirmed in GYG.")}
                                </p>
                                <div style={{ display: "grid", gap: 10 }}>
                                  {gygGroups.map(group => (
                                    <details key={group.key} style={{ border: "1px solid var(--border-color, #d6d9d8)", borderRadius: 12, padding: "12px 14px", background: "var(--card-bg, transparent)" }}>
                                      <summary style={{ cursor: "pointer", fontWeight: 700, overflowWrap: "anywhere" }}>
                                        {group.name} <span style={{ opacity: .7, fontWeight: 400 }}>· {group.options.length} {tr("opções", "options")}</span>
                                      </summary>
                                      <div style={{ display: "grid", gap: 9, marginTop: 12 }}>
                                        {group.options.map(option => (
                                          <div key={option.id} style={{ border: "1px solid var(--border-color, #ddd)", borderRadius: 10, padding: 12, minWidth: 0 }}>
                                            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8, justifyContent: "space-between" }}>
                                              <strong style={{ overflowWrap: "anywhere" }}>{option.optionTitle || option.name}</strong>
                                              <span>{option.active ? tr("Ativa na Central", "Active in Central") : tr("Inativa na Central", "Inactive in Central")}</span>
                                            </div>
                                            <p style={{ fontSize: 12, margin: "6px 0", overflowWrap: "anywhere" }}>
                                              {tr("ID interno:", "Internal ID:")} <code>{option.id}</code> · {tr("ID de vínculo GYG:", "GYG mapping ID:")} <code>{option.gygOptionId || tr("ausente", "missing")}</code>
                                            </p>
                                            <p style={{ fontSize: 12, margin: "6px 0" }}>
                                              {tr("Portal GYG: não verificado", "GYG portal: not verified")} · {tr("Horários internos:", "Internal times:")} {(option.scheduleSlots || []).join(", ") || tr("não configurados", "not configured")}
                                            </p>
                                            {(option.variants || []).length ? (
                                              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                                                {option.variants.map((variant, index) => (
                                                  <span key={variant.id || index} style={{ display: "inline-block", border: "1px solid var(--border-color, #ddd)", borderRadius: 8, padding: "5px 8px", fontSize: 12 }}>
                                                    {variantLabel(variant)}: <strong>{money(variant.price, variant.currency) || tr("Preço não cadastrado", "Price not set")}</strong>
                                                    {variant.startTimeSlot ? ` · ${variant.startTimeSlot}` : ""}
                                                    {variant.active === false ? ` · ${tr("inativa", "inactive")}` : ""}
                                                  </span>
                                                ))}
                                              </div>
                                            ) : <span style={{ fontSize: 12 }}>{tr("Sem variantes/preços vinculados à opção.", "No variants/prices mapped to this option.")}</span>}
                                          </div>
                                        ))}
                                      </div>
                                    </details>
                                  ))}
                                </div>
                              </section>
                            )}
                            {/* Tabela */}
                                                        <div style={activeProdPlatform === "getyourguide" ? {display:"none"} : undefined} className="pmy-ds-migrated-6tnpw1 pmy-ds-table-wrap" role="region" aria-label={tr("Produtos do canal", "Channel products")}>
                              <table className="pmy-prod-table">
                                <thead>
                                  <tr>
                                    <th>{tr("Produto / Tour", "Product / Tour")}</th>
                                    <th>{tr("SKU / ID Externo", "SKU / External ID")}</th>
                                    <th>{tr("Preço", "Price")}</th>
                                    <th>{activeProdPlatform === "getyourguide" ? tr("Vínculo GYG", "GYG mapping") : tr("Sincronizado", "Synced")}</th>
                                    <th>{activeProdPlatform === "getyourguide" ? tr("Status interno", "Internal status") : tr("Status no canal", "Channel status")}</th>
                                    {activeProdPlatform === "getyourguide" && <th>{tr("Status no portal GYG", "GYG portal status")}</th>}
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
                                        {activeProdPlatform === "getyourguide"
                                          ? prod.gygOptionId
                                            ? <span className="pmy-ds-migrated-xjumd6" title={tr("Opção com ID GYG configurado. Não comprova publicação no portal.", "GYG option ID configured. Does not prove portal publication.")}>{tr("ID vinculado", "ID linked")}</span>
                                            : <span className="pmy-ds-migrated-8f66dt" title={tr("Sem ID GYG para publicar disponibilidade.", "Missing GYG ID for availability updates.")}>{tr("Sem vínculo", "Not mapped")}</span>
                                          : prod.synced
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
                                      {activeProdPlatform === "getyourguide" && (
                                        <td>
                                          <span className="pmy-prod-status off" title={tr("A Supplier API não consulta diretamente se o produto está Bookable, Deactivated ou Rejected no portal GYG.", "The Supplier API does not query Bookable, Deactivated or Rejected status from the GYG portal.")}>
                                            {tr("Não verificado", "Not verified")}
                                          </span>
                                        </td>
                                      )}
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
    
                            <div className="pmy-ds-migrated-12g27kh">
                              <div className="pmy-ds-migrated-181vluz">
                                <Icon name="info" size={14} />
                                {tr(
                                  activeProdPlatform === "getyourguide"
                                    ? "GetYourGuide: a lista mostra opções internas da Central, não produtos publicados consultados no portal. ID vinculado não garante status Bookable. Confirme o status no portal GYG antes de testar bloqueios."
                                    : "O status é somente leitura e reflete o último dado retornado pelo canal. Ative ou desative produtos diretamente na plataforma de origem.",
                                  activeProdPlatform === "getyourguide" ? "GetYourGuide: these are internal Central options, not a live portal product list. A linked ID does not confirm Bookable status. Verify in the GYG portal before testing blocks." : "Status is read-only and reflects the latest value returned by the channel.",
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
  );
}
