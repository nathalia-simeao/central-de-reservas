import { Button, Icon } from "./PmyUI";

export default function IntegrationConnectionsPanel({
  contentPlatforms,
  handleDisconnect,
  handleOpenConnect,
  lang,
  platformConnections,
  reservationPlatforms,
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
                          const isAwaitingExternal = Boolean(conn.awaitingExternalResponse) ||
                            (isConfigured && !conn.connected && !conn.validationError);
                          const statusLabel = conn.connected
                            ? tr("CONECTADO · TRÁFEGO VERIFICADO", "CONNECTED · TRAFFIC VERIFIED")
                            : conn.validationError
                              ? tr("ERRO NA CREDENCIAL", "CREDENTIAL ERROR")
                              : isAwaitingExternal
                                ? tr("AGUARDANDO RESPOSTA / VALIDAÇÃO", "AWAITING RESPONSE / VALIDATION")
                              : isPendingOnboarding
                                ? tr("ONBOARDING PENDENTE", "ONBOARDING PENDING")
                                : tr("FALTA CONFIGURAR", "CONFIGURATION REQUIRED");
                          const statusClass = conn.connected
                            ? "is-connected"
                            : conn.validationError
                              ? "is-error"
                              : isAwaitingExternal
                                ? "is-configured"
                              : isPendingOnboarding
                                ? "is-pending"
                                : "is-required";
                          const actionLabel = conn.connected
                            ? tr("Gerenciar integração", "Manage integration")
                            : isAwaitingExternal
                              ? tr("Ver andamento", "View progress")
                              : isPendingOnboarding
                                ? tr("Ver status", "View status")
                                : tr("Configurar", "Configure");
    
                          return (
                            <div
                              key={platform.key}
                              className={[
                                `pmy-int-card-v2 ${conn.connected ? "connected" : ""}`,
                                conn.validationError ? "is-error" : "",
                                isAwaitingExternal ? "is-configured" : "",
                                isPendingOnboarding && !isAwaitingExternal ? "is-pending" : "",
                                !conn.connected && !conn.validationError && !isPendingOnboarding && !isAwaitingExternal ? "is-required" : "",
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
                                  className={`pmy-int-status-dot ${conn.connected ? "on" : conn.validationError ? "error" : isAwaitingExternal ? "configured" : isPendingOnboarding ? "pending" : "required"}`}
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
                              {isAwaitingExternal && (
                                <div className="pmy-int-connection-note is-waiting">
                                  {conn.awaitingExternalResponse
                                    ? tr(
                                        "A solicitação técnica já foi enviada e agora depende de resposta/validação da plataforma.",
                                        "The technical request has already been submitted and now depends on the platform response/validation.",
                                      )
                                    : tr(
                                        "A credencial está salva no backend e o caminho técnico local foi testado. A conexão aguarda validação ou tráfego autenticado real do canal.",
                                        "The credential is stored on the backend and the local technical path was tested. The connection is waiting for validation or real authenticated traffic.",
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
                                  variant={conn.connected || isAwaitingExternal || isPendingOnboarding ? "secondary" : "primary"}
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
                          const conn = platformConnections[platform.key] || {};
                          const isConnected = Boolean(conn.connected);
                          const isConfigured = Boolean(conn.configured);
                          const statusLabel = isConnected
                            ? tr("CONECTADO · TERRA API", "CONNECTED · TERRA API")
                            : conn.validationError
                              ? tr("ERRO NA CREDENCIAL", "CREDENTIAL ERROR")
                              : isConfigured
                                ? tr("CREDENCIAL CONFIGURADA", "CREDENTIAL CONFIGURED")
                                : tr("NÃO CONFIGURADO", "NOT CONFIGURED");

                          return (
                            <div
                              key={platform.key}
                              className={[
                                "pmy-int-card-v2",
                                isConnected ? "connected" : "",
                                conn.validationError ? "is-error" : "",
                                isConfigured && !isConnected && !conn.validationError ? "is-configured" : "",
                                "pmy-ds-migrated-1btvbiy",
                              ].filter(Boolean).join(" ")}
                            >
                              <div className="pmy-int-top">
                                <span className="pmy-int-logo-v2"><Icon name={platform.icon} size={22} /></span>
                                {conn.lastSync ? (
                                  <span className="pmy-int-sync-info">
                                    <Icon name="clock" size={12} /> {conn.lastSync}
                                  </span>
                                ) : (
                                  <span className="pmy-int-sync-info">{tr("Conteúdo", "Content")}</span>
                                )}
                              </div>
                              <div className="pmy-ds-migrated-1gcp9k1">
                                <span
                                  className={"pmy-int-status-dot " + (isConnected ? "on" : conn.validationError ? "error" : isConfigured ? "configured" : "off")}
                                ></span>
                                <span className={"pmy-ds-connection-state " + (isConnected ? "is-connected" : conn.validationError ? "is-error" : isConfigured ? "is-configured" : "")}>
                                  {statusLabel}
                                </span>
                              </div>
                              <div className="pmy-int-name-v2">{platform.name}</div>
                              <div className="pmy-int-desc-v2">{lang==='pt' ? platform.desc.pt : platform.desc.en}</div>
                              {conn.validationError && (
                                <div className="pmy-int-connection-note is-error">
                                  {conn.lastValidationMessage || tr(
                                    "O último teste da credencial falhou. Abra a integração para revisar os dados.",
                                    "The last credential test failed. Open the integration to review the data.",
                                  )}
                                </div>
                              )}
                              <div className="pmy-int-actions">
                                <Button
                                  variant={isConnected || isConfigured ? "secondary" : "primary"}
                                  size="sm"
                                  icon="star"
                                  onClick={()=>handleOpenConnect(platform.key)}
                                >
                                  {isConnected
                                    ? tr("Gerenciar integração de conteúdo", "Manage content integration")
                                    : tr("Configurar integração de conteúdo", "Configure content integration")}
                                </Button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
  );
}
