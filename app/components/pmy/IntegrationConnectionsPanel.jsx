import { Button, Icon } from "./PmyUI";
import TrelloIntegrationCard, { trelloCardState, useTrelloStatus } from "./TrelloIntegrationCard";

/** Situação de um canal de reserva, igual à do cartão. */
export function reservationState(conn = {}) {
  const isPendingOnboarding = conn.onboardingPending || conn.available === false;
  const isAwaitingExternal = Boolean(conn.awaitingExternalResponse) || (Boolean(conn.configured) && !conn.connected && !conn.validationError);
  if (conn.connected) return "connected";
  if (conn.validationError) return "error";
  if (isAwaitingExternal || isPendingOnboarding) return "waiting";
  return "required";
}

export default function IntegrationConnectionsPanel({
  contentPlatforms,
  handleDisconnect,
  handleOpenConnect,
  lang,
  platformConnections,
  reservationPlatforms,
  requestResourceJson = null,
  readOnly = false,
}) {
  const tr = (pt, en) => lang === "en" ? en : pt;
  const [trelloStatus, reloadTrello] = useTrelloStatus(requestResourceJson);
  // Resumo de TODAS as integrações da página: canais de reserva, Trello e conteúdo.
  const contentState = (conn = {}) => (conn.connected ? "connected" : conn.validationError ? "error" : conn.configured ? "waiting" : "required");
  const trelloState = { connected: "connected", configured: "waiting", error: "error", required: "required" }[trelloCardState(trelloStatus)];
  const allStates = [
    ...reservationPlatforms.map((p) => reservationState(platformConnections[p.key])),
    ...contentPlatforms.map((p) => contentState(platformConnections[p.key])),
    ...(requestResourceJson && trelloStatus ? [trelloState] : []),
  ];

  return (
    <div>
                      <p className="pmy-ds-migrated-5553a5">
                        {lang==='pt' ? 'Canais de reserva sincronizam vendas e disponibilidade. Agenda e conteúdo (Trello, Tripadvisor) ficam separados. O resumo abaixo conta todas as integrações.' : 'Booking channels sync sales and availability. Agenda and content tools (Trello, Tripadvisor) are separate. The summary counts every integration.'}
                      </p>
                      <div className="pmy-int-summary" role="list" aria-label={tr("Situação dos canais", "Channel status")}>
                        {[
                          { key: "connected", icon: "check", label: [tr("Conectada", "Connected"), tr("Conectadas", "Connected")] },
                          { key: "required", icon: "warning", label: [tr("Falta configurar", "Needs setup"), tr("Faltam configurar", "Need setup")] },
                          { key: "error", icon: "warning", label: [tr("Com erro", "With error"), tr("Com erro", "With errors")] },
                          { key: "waiting", icon: "clock", label: [tr("Aguardando validação", "Awaiting validation"), tr("Aguardando validação", "Awaiting validation")] },
                        ].map((item) => {
                          const count = allStates.filter((state) => state === item.key).length;
                          if (!count) return null;
                          return (
                            <div key={item.key} className={`pmy-int-summary__item is-${item.key}`} role="listitem">
                              <span className="pmy-int-summary__icon"><Icon name={item.icon} size={18} /></span>
                              <div>
                                <strong>{count}</strong>
                                <span>{count === 1 ? item.label[0] : item.label[1]}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      <div className="pmy-ds-migrated-xqzku2">
                        {reservationPlatforms.map(platform => {
                          const conn = platformConnections[platform.key] || {};
                          const isPendingOnboarding =
                            conn.onboardingPending || conn.available === false;
                          const isConfigured = Boolean(conn.configured);
                          const isAwaitingExternal = Boolean(conn.awaitingExternalResponse) ||
                            (isConfigured && !conn.connected && !conn.validationError);
                          const statusLabel = conn.noDirectApi
                            ? tr("SEM CONEXÃO DIRETA", "NO DIRECT CONNECTION")
                            : conn.connected
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
                              {conn.noDirectApi && (
                                <div className="pmy-int-connection-note is-error">
                                  {tr(
                                    "Esta plataforma ainda não tem integração com a Central. As reservas vão entrar pela leitura automática do Gmail (em construção).",
                                    "No integration with the Central yet. Bookings will come in through the automatic Gmail reading (in progress).",
                                  )}
                                </div>
                              )}
                              {isPendingOnboarding && !conn.noDirectApi && (
                                <div className="pmy-int-connection-note">
                                  {tr(
                                    "Campos de credencial ocultos até existir uma API verificável para a conta PMY.",
                                    "Credential fields are hidden until PMY has an API that can be verified.",
                                  )}
                                </div>
                              )}
                              {!readOnly && <div className="pmy-int-actions">
                                {conn.noDirectApi ? (
                                  <Button variant="secondary" size="sm" icon="mail" disabled>{tr("Via Gmail · em breve", "Via Gmail · soon")}</Button>
                                ) : (
                                <Button
                                  variant={conn.connected || isAwaitingExternal || isPendingOnboarding ? "secondary" : "primary"}
                                  size="sm"
                                  icon={isPendingOnboarding ? "clock" : "settings"}
                                  onClick={()=>handleOpenConnect(platform.key)}
                                >
                                  {actionLabel}
                                </Button>
                                )}
                                {conn.connected && ["viator", "civitatis"].includes(platform.key) && (
                                  <button
                                    className="pmy-int-btn-disconnect"
                                    onClick={()=>handleDisconnect(platform.key)}
                                  >
                                    {tr("Remover credencial", "Remove credential")}
                                  </button>
                                )}
                              </div>}
                            </div>
                          );
                        })}
                        {requestResourceJson && (
                          <>
                            <div className="pmy-ds-migrated-1konp2u">
                              <div className="pmy-ds-migrated-166ghmy"><Icon name="calendar" size={15} /> {tr("Agenda e operação", "Agenda & operations")}</div>
                              <div className="pmy-ds-migrated-htnqm2">{tr("Ferramentas que atualizam o Quadro e a Agenda da equipe. Não vendem nem mexem nas vagas.", "Tools that update the team's Board and Agenda. They don't sell or change availability.")}</div>
                            </div>
                            <TrelloIntegrationCard requestJson={requestResourceJson} status={trelloStatus} onReload={reloadTrello} lang={lang} readOnly={readOnly} />
                          </>
                        )}
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
                              {!readOnly && <div className="pmy-int-actions">
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
                              </div>}
                            </div>
                          );
                        })}
                      </div>
                    </div>
  );
}
