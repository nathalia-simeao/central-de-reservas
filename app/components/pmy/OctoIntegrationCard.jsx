// Integrações → "Conexão direta OCTO": Klook, Tiqets e Headout perguntam as vagas
// para a Central e criam/cancelam as reservas aqui (pedido de 13/11/2026).
// Aqui a equipe gera a chave de cada plataforma, copia o endereço e a chave para
// mandar à plataforma e marca quando ela já está vendendo pela conexão.
import { useCallback, useEffect, useState } from "react";
import { Button, Icon, Modal, Switch } from "./PmyUI";

const when = (value, lang) => (value
  ? new Intl.DateTimeFormat(lang === "en" ? "en-GB" : "pt-PT", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }).format(new Date(value))
  : "");

export function useOctoStatus(requestJson) {
  const [status, setStatus] = useState(null);
  const load = useCallback(async () => {
    if (typeof requestJson !== "function") return;
    try {
      const result = await requestJson("/api/octo");
      if (result?.success) setStatus(result);
    } catch { /* cartão mostra "falta configurar" */ }
  }, [requestJson]);
  useEffect(() => { load(); }, [load]);
  return [status, load];
}

export function octoResellerState(reseller) {
  if (!reseller?.hasKey) return "required";
  if (reseller.live) return "connected";
  if (reseller.lastTrafficAt) return "testing";
  return "waiting";
}

async function copy(text) {
  try { await navigator.clipboard.writeText(text); return true; } catch { return false; }
}

function CopyLine({ label, value, lang }) {
  const tr = (pt, en) => (lang === "en" ? en : pt);
  const [done, setDone] = useState(false);
  return (
    <div className="pmy-octo-copy">
      <span>{label}</span>
      <code>{value}</code>
      <button type="button" onClick={async () => { if (await copy(value)) { setDone(true); setTimeout(() => setDone(false), 1500); } }}>
        <Icon name={done ? "check" : "copy"} size={14} /> {done ? tr("Copiado", "Copied") : tr("Copiar", "Copy")}
      </button>
    </div>
  );
}

export function OctoPanel({ requestJson, lang = "pt", onChanged }) {
  const tr = (pt, en) => (lang === "en" ? en : pt);
  const [state, setState] = useState(null);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [fresh, setFresh] = useState(null); // { platform, token } mostrado uma vez

  const load = useCallback(async () => {
    try { setState(await requestJson("/api/octo")); } catch (e) { setError(e?.message || ""); }
  }, [requestJson]);
  useEffect(() => { load(); }, [load]);

  const post = async (intent, platform, fields = {}) => {
    setBusy(`${intent}:${platform}`);
    setError("");
    try {
      const fd = new FormData();
      fd.append("intent", intent);
      fd.append("platform", platform);
      for (const [k, v] of Object.entries(fields)) fd.append(k, v);
      const result = await requestJson("/api/octo", fd);
      setState((s) => ({ ...s, ...result }));
      onChanged?.();
      return result;
    } catch (e) {
      setError(e?.message || "");
      return null;
    } finally {
      setBusy("");
    }
  };

  const stateLabel = {
    required: tr("Sem chave", "No key"),
    waiting: tr("Chave criada · aguardando a plataforma", "Key created · waiting for the platform"),
    testing: tr("A plataforma já chamou a Central · em teste", "Platform already called · testing"),
    connected: tr("Vendendo pela conexão", "Selling through the connection"),
  };

  return (
    <div className="pmy-octo">
      <p className="pmy-agenda-modal__lead">
        {tr(
          "Com a conexão direta, a plataforma consulta as vagas na Central antes de vender e cria ou cancela a reserva aqui. Bloqueios, capacidade e reservas dos outros canais passam a valer na hora. Para ligar: gere a chave, mande o endereço e a chave para a equipe de conectividade da plataforma e, quando ela confirmar que está no ar, ligue \"Já está vendendo\".",
          "With the direct connection, the platform checks availability in the Central before selling and creates or cancels the booking here. Generate the key, send the address and key to the platform's connectivity team and, once live, turn on \"Already selling\".",
        )}
      </p>
      {error && <div className="pmy-int-connection-note is-error" role="alert">{error}</div>}
      {state?.endpoint && <CopyLine label={tr("Endereço (OCTO)", "Endpoint (OCTO)")} value={state.endpoint} lang={lang} />}
      <ul className="pmy-octo-list">
        {(state?.resellers || []).map((r) => {
          const st = octoResellerState(r);
          return (
            <li key={r.key} className={`pmy-octo-item is-${st}`}>
              <div className="pmy-octo-item__head">
                <strong>{r.name}</strong>
                <span className={`pmy-octo-state is-${st}`}>{stateLabel[st]}</span>
              </div>
              <p className="pmy-octo-item__meta">
                {r.hasKey ? tr(`Chave terminada em …${r.keyHint} (criada ${when(r.keyCreatedAt, lang)}).`, `Key ending …${r.keyHint} (created ${when(r.keyCreatedAt, lang)}).`) : tr("Ainda sem chave.", "No key yet.")}
                {r.lastTrafficAt ? ` ${tr(`Última chamada: ${when(r.lastTrafficAt, lang)}.`, `Last call: ${when(r.lastTrafficAt, lang)}.`)}` : ""}
              </p>
              {fresh?.platform === r.key && (
                <div className="pmy-octo-fresh">
                  <CopyLine label={tr("Chave (só aparece agora)", "Key (shown only now)")} value={fresh.token} lang={lang} />
                  <small>{tr("Copie e mande para a plataforma pelo canal seguro dela. Se perder, gere outra (a antiga para de funcionar).", "Copy it and send it through the platform's secure channel. If lost, generate a new one.")}</small>
                </div>
              )}
              <div className="pmy-octo-item__actions">
                <Button size="sm" variant={r.hasKey ? "secondary" : "primary"} icon="lock" disabled={Boolean(busy)}
                  onClick={async () => { const res = await post("generate", r.key); if (res?.token) setFresh({ platform: r.key, token: res.token }); }}>
                  {r.hasKey ? tr("Gerar nova chave", "New key") : tr("Gerar chave", "Generate key")}
                </Button>
                {r.hasKey && (
                  <Switch checked={r.live} disabled={Boolean(busy)} onChange={(checked) => post("live", r.key, { live: String(checked) })}
                    label={tr("Já está vendendo pela conexão", "Already selling through the connection")} />
                )}
                {r.hasKey && <button type="button" className="pmy-int-btn-disconnect" disabled={Boolean(busy)} onClick={() => { setFresh(null); post("remove", r.key); }}>{tr("Desligar", "Disconnect")}</button>}
              </div>
            </li>
          );
        })}
      </ul>
      <p className="pmy-octo-note">{tr("Enquanto \"Já está vendendo\" estiver desligado, as reservas dessa plataforma continuam entrando pelo Gmail. Quando ligar, o Gmail para de lançar as dela (para não duplicar).", "While \"Already selling\" is off, this platform's bookings keep coming in through Gmail. When on, Gmail stops adding them to avoid duplicates.")}</p>
    </div>
  );
}

export default function OctoIntegrationCard({ requestJson, status, onReload, lang = "pt", readOnly = false }) {
  const tr = (pt, en) => (lang === "en" ? en : pt);
  const [open, setOpen] = useState(false);
  const resellers = status?.resellers || [];
  const live = resellers.filter((r) => r.live).map((r) => r.name);
  const withKey = resellers.filter((r) => r.hasKey);
  const state = live.length ? "connected" : withKey.length ? "configured" : "required";
  const label = live.length
    ? tr(`NO AR · ${live.join(", ")}`, `LIVE · ${live.join(", ")}`)
    : withKey.length ? tr("CHAVE CRIADA · AGUARDANDO A PLATAFORMA", "KEY CREATED · WAITING FOR THE PLATFORM") : tr("FALTA CONFIGURAR", "CONFIGURATION REQUIRED");
  const dot = { connected: "on", configured: "configured", required: "required" }[state];
  const cardClass = { connected: "connected", configured: "is-configured", required: "is-required" }[state];
  return (
    <>
      <div className={`pmy-int-card-v2 ${cardClass} pmy-ds-migrated-15s4y9o`}>
        <div className="pmy-int-top"><span className="pmy-int-logo-v2"><Icon name="link" size={22} /></span></div>
        <div className="pmy-ds-migrated-1gcp9k1">
          <span className={`pmy-int-status-dot ${dot}`} />
          <span className={`pmy-ds-connection-state is-${state}`}>{label}</span>
        </div>
        <div className="pmy-int-name-v2">{tr("Conexão direta OCTO", "OCTO direct connection")}</div>
        <div className="pmy-int-desc-v2">{tr("Klook, Tiqets e Headout consultam as vagas da Central e lançam as reservas aqui. Mudou na Central, muda na plataforma.", "Klook, Tiqets and Headout check the Central's availability and book here. Change it in the Central, it changes on the platform.")}</div>
        {!readOnly && <div className="pmy-int-actions">
          <Button size="sm" variant={state === "required" ? "primary" : "secondary"} icon="settings" onClick={() => setOpen(true)}>
            {state === "required" ? tr("Configurar", "Configure") : tr("Gerenciar integração", "Manage integration")}
          </Button>
        </div>}
      </div>
      <Modal open={open && !readOnly} title={tr("Conexão direta OCTO", "OCTO direct connection")} onClose={() => { setOpen(false); onReload?.(); }} closeLabel={tr("Fechar", "Close")} className="pmy-ds-modal--form">
        <OctoPanel requestJson={requestJson} lang={lang} onChanged={onReload} />
      </Modal>
    </>
  );
}
