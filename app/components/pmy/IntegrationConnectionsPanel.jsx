import { Button, Icon } from "./PmyUI";

export default function IntegrationConnectionsPanel({
  contentPlatforms,
  customIntegrations,
  customKey,
  customName,
  customUrl,
  handleAddCustomIntegration,
  handleDisconnect,
  handleOpenConnect,
  lang,
  platformConnections,
  reservationPlatforms,
  setCustomKey,
  setCustomName,
  setCustomUrl,
}) {
  const tr = (pt, en) => lang === "en" ? en : pt;

  return (
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
                            : conn.validationError
                              ? tr("ERRO NA CREDENCIAL", "CREDENTIAL ERROR")
                              : isConfigured
                                ? tr("CREDENCIAL CONFIGURADA", "CREDENTIAL CONFIGURED")
                              : isPendingOnboarding
                                ? tr("ONBOARDING PENDENTE", "ONBOARDING PENDING")
                                : tr("NÃO CONFIGURADO", "NOT CONFIGURED");
                          const statusClass = conn.connected
                            ? "is-connected"
                            : conn.validationError
                              ? "is-error"
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
                                conn.validationError ? "is-error" : "",
                                isConfigured && !conn.connected && !conn.validationError ? "is-configured" : "",
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
                                  className={`pmy-int-status-dot ${conn.connected ? "on" : conn.validationError ? "error" : isConfigured ? "configured" : isPendingOnboarding ? "pending" : "off"}`}
                                ></span>
                                <span className={`pmy-ds-connection-state ${statusClass}`}>
                                  {statusLabel}
                                </span>
                              </div>
                              <div className="pmy-int-name-v2">{platform.name}</div>
                              <div className="pmy-int-desc-v2">{lang==='pt' ? platform.desc.pt : platform.desc.en}</div>
                              {conn.validationError && (
                                <div className="pmy-int-connection-note is-error">
                                  {conn.lastValidationMessage || tr(
                                    "O último teste da credencial falhou. Abra a integração para revisar ou substituir os dados.",
                                    "The last credential test failed. Open the integration to review or replace the data.",
                                  )}
                                </div>
                              )}
                              {isConfigured && !conn.connected && !conn.validationError && (
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
  );
}
