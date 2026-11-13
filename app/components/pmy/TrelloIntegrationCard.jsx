// Integrações → Conexões → "Agenda e operação": o Trello como cartão, igual às
// outras plataformas. "Gerenciar integração" abre a janela com a conexão,
// a leitura automática (uma vez por dia), os apelidos e os anexos.
import { useCallback, useEffect, useState } from "react";
import TrelloConnectionPanel from "./TrelloConnectionPanel";
import { Button, Icon, Modal } from "./PmyUI";

const when = (value, lang) => (value
  ? new Intl.DateTimeFormat(lang === "en" ? "en-GB" : "pt-PT", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }).format(new Date(value))
  : "");

export function trelloCardState(status) {
  if (!status?.configured) return "required";
  if (status.sync?.lastError) return "error";
  if (status.sync?.enabled) return "connected";
  return "configured";
}

/** Situação do Trello, lida uma vez pela página de conexões (também entra no resumo). */
export function useTrelloStatus(requestJson) {
  const [status, setStatus] = useState(null);
  const load = useCallback(async () => {
    if (typeof requestJson !== "function") return;
    try {
      const result = await requestJson("/api/trello");
      if (result?.success) setStatus(result);
    } catch { /* o cartão mostra "falta configurar" */ }
  }, [requestJson]);
  useEffect(() => { load(); }, [load]);
  return [status, load];
}

export default function TrelloIntegrationCard({ requestJson, status, onReload, lang = "pt", readOnly = false }) {
  const tr = (pt, en) => (lang === "en" ? en : pt);
  const [open, setOpen] = useState(false);
  const load = onReload || (() => {});

  const state = trelloCardState(status);
  const label = {
    connected: tr("CONECTADO · LEITURA DIÁRIA", "CONNECTED · DAILY READ"),
    configured: tr("CONECTADO · LEITURA AUTOMÁTICA DESLIGADA", "CONNECTED · AUTO-READ OFF"),
    error: tr("ERRO NA ÚLTIMA LEITURA", "LAST READ FAILED"),
    required: tr("FALTA CONFIGURAR", "CONFIGURATION REQUIRED"),
  }[state];
  const dot = { connected: "on", configured: "configured", error: "error", required: "required" }[state];
  const cardClass = { connected: "connected", configured: "is-configured", error: "is-error", required: "is-required" }[state];

  return (
    <>
      <div className={`pmy-int-card-v2 ${cardClass} pmy-ds-migrated-15s4y9o`}>
        <div className="pmy-int-top">
          <span className="pmy-int-logo-v2"><Icon name="calendar" size={22} /></span>
          {status?.sync?.lastOkAt && <span className="pmy-int-sync-info"><Icon name="clock" size={12} /> {when(status.sync.lastOkAt, lang)}</span>}
        </div>
        <div className="pmy-ds-migrated-1gcp9k1">
          <span className={`pmy-int-status-dot ${dot}`} />
          <span className={`pmy-ds-connection-state is-${state === "configured" ? "configured" : state === "required" ? "required" : state}`}>{label}</span>
        </div>
        <div className="pmy-int-name-v2">Trello</div>
        <div className="pmy-int-desc-v2">{tr("Atualização da agenda: traz do quadro do Trello checklists, guias, descrições e anexos para o Quadro da Central.", "Agenda updates: brings checklists, guides, notes and files from the Trello board.")}</div>
        {state === "error" && <div className="pmy-int-connection-note is-error">{status.sync.lastError}</div>}
        {status?.sync?.lastSummary?.guideWarnings?.length > 0 && state !== "error" && (
          <div className="pmy-int-connection-note">{tr(`${status.sync.lastSummary.guideWarnings.length} aviso(s) de guias na última leitura.`, `${status.sync.lastSummary.guideWarnings.length} guide warning(s) in the last read.`)}</div>
        )}
        {!readOnly && <div className="pmy-int-actions">
          <Button variant={state === "required" ? "primary" : "secondary"} size="sm" icon="settings" onClick={() => setOpen(true)}>
            {state === "required" ? tr("Configurar", "Configure") : tr("Gerenciar integração", "Manage integration")}
          </Button>
        </div>}
      </div>
      <Modal open={open && !readOnly} title="Trello" onClose={() => { setOpen(false); load(); }} closeLabel={tr("Fechar", "Close")} className="pmy-ds-modal--form">
        <TrelloConnectionPanel requestJson={requestJson} lang={lang} bare />
      </Modal>
    </>
  );
}
