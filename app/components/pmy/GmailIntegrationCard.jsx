// Integrações → Conexões → "Gmail": leitura das reservas que chegam por e-mail
// (Airbnb, Tiqets, Klook, Civitatis, Viator, Headout). Pedido de 13/11/2026.
// O cartão mostra a situação; a janela tem a conexão (e-mail + senha de app),
// ligar/desligar, "Ler agora", buscar e-mails antigos e a lista "Para revisar".
import { useCallback, useEffect, useMemo, useState } from "react";
import { Badge, Button, DatePicker, DropdownSelect, FormField, Icon, Input, Modal, Switch, TimeSelect } from "./PmyUI";

const PLATFORM_NAMES = { AIRBNB: "Airbnb", TIQETS: "Tiqets", KLOOK: "Klook", CIVITATIS: "Civitatis", VIATOR: "Viator", HEADOUT: "Headout", GETYOURGUIDE: "GetYourGuide" };
const LANGS = [["", "—"], ["pt", "Português"], ["en", "Inglês"], ["es", "Espanhol"], ["fr", "Francês"], ["it", "Italiano"], ["de", "Alemão"]];

const when = (value, lang, withYear = false) => (value
  ? new Intl.DateTimeFormat(lang === "en" ? "en-GB" : "pt-PT", { day: "2-digit", month: "2-digit", ...(withYear ? { year: "numeric" } : {}), hour: "2-digit", minute: "2-digit" }).format(new Date(value))
  : "");

export function gmailCardState(status) {
  if (!status?.configured) return "required";
  if (status.lastError) return "error";
  if (status.enabled) return "connected";
  return "configured";
}

/** Situação do Gmail para a página de conexões (também entra no resumo). */
export function useGmailStatus(requestJson) {
  const [status, setStatus] = useState(null);
  const load = useCallback(async () => {
    if (typeof requestJson !== "function") return;
    try {
      const result = await requestJson("/api/gmail");
      if (result?.success) setStatus(result);
    } catch { /* o cartão mostra "falta configurar" */ }
  }, [requestJson]);
  useEffect(() => { load(); }, [load]);
  return [status, load];
}

function reasonText(item, tr) {
  const r = item.result?.reason;
  const missing = item.result?.missing || [];
  if (r === "BACKFILL") return tr("E-mail de antes da conexão: confira se a reserva já não foi lançada à mão.", "E-mail from before the connection: check it wasn't entered by hand.");
  if (r === "CANCEL_NOT_FOUND") return tr("Cancelamento de uma reserva que não está na Central. Se ela foi lançada à mão no checklist, risque lá e depois clique em Ignorar.", "Cancellation for a booking that isn't in the Central. If it was added by hand, remove it there and click Ignore.");
  if (r === "CHANGE_NOT_FOUND") return tr("Alteração de uma reserva que não está na Central.", "Change for a booking that isn't in the Central.");
  const names = { tour: tr("o passeio", "the tour"), product: tr("o passeio", "the tour"), date: tr("a data", "the date"), time: tr("a hora", "the time"), pax: tr("as pessoas", "the people"), ref: tr("a referência", "the reference"), platform: tr("a plataforma", "the platform") };
  const list = [...new Set(missing.map((m) => names[m]).filter(Boolean))];
  return list.length ? tr(`Não consegui ler ${list.join(", ")}.`, `Couldn't read ${list.join(", ")}.`) : tr("Confira antes de lançar.", "Check before adding.");
}

function ReviewItem({ item, tours, busy, onResolve, onDismiss, lang }) {
  const tr = (pt, en) => (lang === "en" ? en : pt);
  const p = item.parsed || {};
  const isCancel = p.kind === "CANCEL";
  const [tourId, setTourId] = useState(item.suggestion?.tourId || "");
  const [date, setDate] = useState(p.dateKey || "");
  const [time, setTime] = useState(item.suggestion?.timeKey || p.timeKey || "");
  const [pax, setPax] = useState(String(p.pax?.total || ""));
  const [language, setLanguage] = useState(p.language || "");
  const [name, setName] = useState(p.customerName || "");
  const [showMail, setShowMail] = useState(false);
  const tour = tours.find((t) => t.id === tourId);
  const slots = (tour?.scheduleSlots || []).filter((s) => /^\d{2}:\d{2}$/.test(s));
  const disabled = Boolean(busy);
  const kindLabel = { NEW: tr("Reserva nova", "New booking"), CANCEL: tr("Cancelamento", "Cancellation"), CHANGE: tr("Alteração", "Change") }[p.kind] || p.kind;

  return (
    <li className="pmy-gmail-item">
      <div className="pmy-gmail-item__head">
        <Badge tone="info">{PLATFORM_NAMES[p.platform] || tr("Plataforma?", "Platform?")}</Badge>
        <Badge tone={isCancel ? "danger" : "neutral"}>{kindLabel}</Badge>
        {p.ref && <span className="pmy-gmail-item__ref">#{p.ref}</span>}
        <span className="pmy-gmail-item__when">{when(item.receivedAt, lang)}</span>
      </div>
      <strong className="pmy-gmail-item__subject">{item.subject || tr("(sem assunto)", "(no subject)")}</strong>
      <p className="pmy-gmail-item__reason"><Icon name="warning" size={14} /> {reasonText(item, tr)}</p>
      {p.product && <p className="pmy-gmail-item__product">{tr("No e-mail:", "In the e-mail:")} {p.product}{p.option ? ` · ${p.option}` : ""}</p>}

      {!isCancel && (
        <div className="pmy-gmail-item__form">
          <FormField label={tr("Passeio", "Tour")}>
            <DropdownSelect value={tourId} onChange={setTourId} placeholder={tr("Escolha o passeio", "Choose the tour")}
              ariaLabel={tr("Passeio", "Tour")} searchPlaceholder={tr("Buscar passeio...", "Search tour...")}
              options={tours.map((t) => ({ value: t.id, label: t.title }))} disabled={disabled} />
          </FormField>
          <FormField label={tr("Data", "Date")}>
            <DatePicker value={date} onChange={(e) => setDate(e?.target?.value ?? e ?? "")} locale={lang === "en" ? "en-GB" : "pt-PT"} />
          </FormField>
          <FormField label={tr("Hora", "Time")}>
            {slots.length ? (
              <DropdownSelect value={time} onChange={setTime} placeholder="--:--" ariaLabel={tr("Hora", "Time")}
                options={[...new Set([...slots, ...(time && !slots.includes(time) ? [time] : [])])].sort().map((s) => ({ value: s, label: s }))} disabled={disabled} />
            ) : (
              <TimeSelect value={time} onChange={setTime} lang={lang} ariaLabel={tr("Hora", "Time")} />
            )}
          </FormField>
          <FormField label={tr("Pessoas", "People")}>
            <Input type="number" min="1" max="200" inputMode="numeric" value={pax} onChange={(e) => setPax(e.target.value)} disabled={disabled} />
          </FormField>
          <FormField label={tr("Idioma", "Language")}>
            <DropdownSelect value={language} onChange={setLanguage} placeholder="—" ariaLabel={tr("Idioma", "Language")}
              options={LANGS.map(([value, label]) => ({ value, label }))} disabled={disabled} />
          </FormField>
          <FormField label={tr("Cliente", "Customer")}>
            <Input value={name} onChange={(e) => setName(e.target.value)} disabled={disabled} />
          </FormField>
        </div>
      )}

      <div className="pmy-gmail-item__actions">
        {isCancel ? (
          item.result?.reason !== "CANCEL_NOT_FOUND" && <Button size="sm" variant="primary" disabled={disabled || !p.ref} onClick={() => onResolve(item.id, {})}>{tr("Cancelar na Central", "Cancel in the Central")}</Button>
        ) : (
          <Button size="sm" variant="primary" disabled={disabled || !tourId || !date || !time || !(Number(pax) > 0)}
            onClick={() => onResolve(item.id, { tourId, date, time, pax, language, customerName: name })}>
            {p.kind === "CHANGE" ? tr("Aplicar alteração", "Apply change") : tr("Lançar reserva", "Add booking")}
          </Button>
        )}
        <Button size="sm" variant="secondary" disabled={disabled} onClick={() => onDismiss(item.id)}>{tr("Ignorar", "Ignore")}</Button>
        {item.snippet && (
          <button type="button" className="pmy-gmail-item__toggle" onClick={() => setShowMail((v) => !v)} aria-expanded={showMail}>
            {showMail ? tr("Esconder e-mail", "Hide e-mail") : tr("Ver e-mail", "Show e-mail")}
          </button>
        )}
      </div>
      {showMail && <pre className="pmy-gmail-item__mail">{item.snippet}</pre>}
    </li>
  );
}

function recentLine(item, tr) {
  const action = item.result?.action;
  const reason = item.result?.reason;
  if (item.status === "IMPORTED") {
    return {
      CREATED: tr("Reserva lançada", "Booking added"),
      CANCELED: tr("Reserva cancelada", "Booking cancelled"),
      UPDATED: tr("Reserva alterada", "Booking changed"),
      ALREADY_EXISTS: tr("Já estava na Central", "Already in the Central"),
    }[action] || tr("Lida", "Read");
  }
  if (item.status === "DISMISSED") return tr("Ignorado pela equipe", "Ignored by the team");
  return {
    NOT_A_BOOKING: tr("Não é reserva", "Not a booking"),
    DIRECT_CONNECTION: tr("Chega pela conexão direta", "Arrives via direct connection"),
    PAST_TOUR: tr("Passeio já passou", "Tour already happened"),
  }[reason] || tr("Ignorado", "Ignored");
}

export function GmailConnectionPanel({ requestJson, lang = "pt", onChanged }) {
  const tr = (pt, en) => (lang === "en" ? en : pt);
  const [state, setState] = useState(null);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [email, setEmail] = useState("");
  const [appPassword, setAppPassword] = useState("");
  const [editing, setEditing] = useState(false);

  const load = useCallback(async () => {
    try {
      const result = await requestJson("/api/gmail?inbox=1");
      setState(result);
      setEmail((v) => v || result.email || "");
    } catch (e) {
      setError(e?.message || tr("Não foi possível carregar.", "Unable to load."));
    }
  }, [requestJson]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, [load]);

  const post = async (intent, fields = {}) => {
    setBusy(intent);
    setError("");
    setNotice("");
    try {
      const fd = new FormData();
      fd.append("intent", intent);
      for (const [k, v] of Object.entries(fields)) fd.append(k, v ?? "");
      const result = await requestJson("/api/gmail", fd);
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

  const summaryText = (s) => (s ? tr(
    `${s.read} e-mail(s) lido(s): ${s.imported} lançado(s), ${s.review} para revisar, ${s.ignored} ignorado(s).`,
    `${s.read} e-mail(s) read: ${s.imported} added, ${s.review} to review, ${s.ignored} ignored.`,
  ) : "");

  const tours = useMemo(() => state?.tours || [], [state]);
  const review = state?.inbox?.review || [];
  const recent = state?.inbox?.recent || [];
  const connected = state?.configured;
  const showForm = !connected || editing;

  return (
    <div className="pmy-gmail">
      <p className="pmy-agenda-modal__lead">
        {tr(
          "A Central lê os e-mails de reserva do Airbnb, Tiqets, Klook, Civitatis, Viator e Headout e lança as reservas sozinha, a cada 5 minutos. GetYourGuide e o site continuam pela conexão direta. A Central só lê: não apaga, não marca como lido e não responde nada.",
          "The Central reads booking e-mails from Airbnb, Tiqets, Klook, Civitatis, Viator and Headout and adds the bookings every 5 minutes. GetYourGuide and the website keep their direct connection. Read-only: nothing is deleted, marked as read or answered.",
        )}
      </p>
      {error && <div className="pmy-int-connection-note is-error" role="alert">{error}</div>}
      {notice && <div className="pmy-int-connection-note" role="status">{notice}</div>}

      {state && !state.encryptionReady && (
        <div className="pmy-int-connection-note is-error">{tr("O cofre de senhas do servidor não está pronto (INTEGRATION_ENCRYPTION_KEY).", "The server password vault is not ready.")}</div>
      )}

      {showForm ? (
        <form className="pmy-gmail-connect" onSubmit={async (e) => {
          e.preventDefault();
          const result = await post("save", { email, appPassword });
          if (result) { setAppPassword(""); setEditing(false); setNotice(tr("Gmail conectado. A partir de agora as reservas novas entram sozinhas.", "Gmail connected. New bookings now come in automatically.")); }
        }}>
          <ol className="pmy-gmail-steps">
            <li>{tr("Na conta Google que recebe as reservas, deixe a verificação em duas etapas ligada.", "On the Google account that receives bookings, turn on 2-Step Verification.")}</li>
            <li>
              {tr("Crie uma senha de app com o nome \"Central PMY\" em ", "Create an app password named \"Central PMY\" at ")}
              <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noreferrer">myaccount.google.com/apppasswords</a>.
            </li>
            <li>{tr("Cole aqui o e-mail e as 16 letras da senha de app. A senha fica guardada criptografada e não aparece de novo.", "Paste the e-mail and the 16-letter app password. It is stored encrypted and never shown again.")}</li>
          </ol>
          <div className="pmy-gmail-connect__fields">
            <FormField label={tr("E-mail do Gmail", "Gmail address")}>
              <Input type="email" autoComplete="off" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="reservas@..." required />
            </FormField>
            <FormField label={tr("Senha de app (16 letras)", "App password (16 letters)")} hint={connected ? tr("Deixe vazio para manter a senha atual.", "Leave empty to keep the current one.") : null}>
              <Input type="password" autoComplete="new-password" value={appPassword} onChange={(e) => setAppPassword(e.target.value)} placeholder="abcd efgh ijkl mnop" required={!connected} />
            </FormField>
          </div>
          <div className="pmy-support-actions">
            <Button type="submit" variant="primary" icon="mail" disabled={Boolean(busy) || !email}>{busy === "save" ? tr("Testando...", "Testing...") : tr("Conectar Gmail", "Connect Gmail")}</Button>
            {connected && <Button type="button" variant="secondary" onClick={() => setEditing(false)}>{tr("Voltar", "Back")}</Button>}
          </div>
        </form>
      ) : (
        <div className="pmy-gmail-status">
          <div className="pmy-gmail-status__row">
            <span><Icon name="mail" size={16} /> <b>{state.email}</b></span>
            <Switch checked={Boolean(state.enabled)} disabled={Boolean(busy)} onChange={(checked) => post("toggle", { enabled: String(checked) })}
              label={state.enabled ? tr("Leitura ligada (a cada 5 minutos)", "Reading on (every 5 minutes)") : tr("Leitura desligada", "Reading off")} />
          </div>
          <p className="pmy-gmail-status__meta">
            {state.lastOkAt ? tr(`Última leitura: ${when(state.lastOkAt, lang)}.`, `Last read: ${when(state.lastOkAt, lang)}.`) : tr("Ainda não leu nenhuma vez.", "Not read yet.")}
            {" "}{summaryText(state.lastSummary)}
            {state.aliasCount ? ` ${tr(`${state.aliasCount} passeio(s) já reconhecido(s) pelo nome.`, `${state.aliasCount} tour name(s) remembered.`)}` : ""}
          </p>
          {state.lastError && <div className="pmy-int-connection-note is-error">{state.lastError}</div>}
          <div className="pmy-support-actions">
            <Button size="sm" variant="primary" icon="refresh" disabled={Boolean(busy)} onClick={async () => {
              const r = await post("run");
              if (r?.summary) setNotice(summaryText(r.summary));
            }}>{busy === "run" ? tr("Lendo...", "Reading...") : tr("Ler agora", "Read now")}</Button>
            <Button size="sm" variant="secondary" icon="clock" disabled={Boolean(busy)} onClick={async () => {
              const r = await post("backfill", { days: "60" });
              if (r?.summary) setNotice(tr(`Reservas dos últimos 60 dias: ${r.summary.review} foram para "Para revisar" (passeios que ainda vão acontecer).`, `Last 60 days: ${r.summary.review} went to review.`));
            }}>{busy === "backfill" ? tr("Buscando...", "Searching...") : tr("Buscar reservas já recebidas (60 dias)", "Fetch bookings already received (60 days)")}</Button>
            <Button size="sm" variant="secondary" disabled={Boolean(busy)} onClick={() => setEditing(true)}>{tr("Trocar conta ou senha", "Change account or password")}</Button>
            <button type="button" className="pmy-int-btn-disconnect" disabled={Boolean(busy)} onClick={() => post("remove")}>{tr("Desconectar", "Disconnect")}</button>
          </div>
        </div>
      )}

      {connected && (
        <section className="pmy-gmail-review" aria-label={tr("Para revisar", "To review")}>
          <h4>{tr("Para revisar", "To review")} {review.length > 0 && <span className="pmy-gmail-count">{review.length}</span>}</h4>
          {review.length === 0 ? (
            <p className="pmy-gmail-empty">{tr("Nada para revisar. Quando um e-mail não der para ler sozinho, ele aparece aqui.", "Nothing to review. E-mails that can't be read automatically show up here.")}</p>
          ) : (
            <ul className="pmy-gmail-list">
              {review.map((item) => (
                <ReviewItem key={item.id} item={item} tours={tours} busy={busy} lang={lang}
                  onResolve={async (eventId, fields) => {
                    const r = await post("resolve", { eventId, ...fields });
                    if (r?.result?.warning === "OVERBOOKED") setNotice(tr("Reserva lançada, mas a saída passou da capacidade. Confira no Quadro.", "Booking added, but the departure is over capacity."));
                    else if (r) setNotice(tr("Pronto. Os próximos e-mails deste passeio entram sozinhos.", "Done. Next e-mails for this tour come in automatically."));
                  }}
                  onDismiss={(eventId) => post("dismiss", { eventId })} />
              ))}
            </ul>
          )}
          {recent.length > 0 && (
            <>
              <h4>{tr("Últimos e-mails lidos", "Latest e-mails read")}</h4>
              <ul className="pmy-gmail-recent">
                {recent.map((item) => (
                  <li key={item.id} className={`is-${item.status.toLowerCase()}`}>
                    <span className="pmy-gmail-recent__when">{when(item.receivedAt, lang)}</span>
                    <span className="pmy-gmail-recent__plat">{PLATFORM_NAMES[item.parsed?.platform] || ""}</span>
                    <span className="pmy-gmail-recent__subject">{item.subject}</span>
                    <span className="pmy-gmail-recent__state">{recentLine(item, tr)}{item.result?.warning === "OVERBOOKED" ? ` · ${tr("passou da capacidade", "over capacity")}` : ""}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>
      )}
    </div>
  );
}

export default function GmailIntegrationCard({ requestJson, status, onReload, lang = "pt", readOnly = false }) {
  const tr = (pt, en) => (lang === "en" ? en : pt);
  const [open, setOpen] = useState(false);
  const state = gmailCardState(status);
  const label = {
    connected: tr("CONECTADO · LÊ A CADA 5 MIN", "CONNECTED · READS EVERY 5 MIN"),
    configured: tr("CONECTADO · LEITURA DESLIGADA", "CONNECTED · READING OFF"),
    error: tr("ERRO NA ÚLTIMA LEITURA", "LAST READ FAILED"),
    required: tr("FALTA CONFIGURAR", "CONFIGURATION REQUIRED"),
  }[state];
  const dot = { connected: "on", configured: "configured", error: "error", required: "required" }[state];
  const cardClass = { connected: "connected", configured: "is-configured", error: "is-error", required: "is-required" }[state];
  const reviewCount = status?.reviewCount || 0;

  return (
    <>
      <div className={`pmy-int-card-v2 ${cardClass} pmy-ds-migrated-15s4y9o`}>
        <div className="pmy-int-top">
          <span className="pmy-int-logo-v2"><Icon name="mail" size={22} /></span>
          {status?.lastOkAt && <span className="pmy-int-sync-info"><Icon name="clock" size={12} /> {when(status.lastOkAt, lang)}</span>}
        </div>
        <div className="pmy-ds-migrated-1gcp9k1">
          <span className={`pmy-int-status-dot ${dot}`} />
          <span className={`pmy-ds-connection-state is-${state === "connected" ? "connected" : state === "configured" ? "configured" : state}`}>{label}</span>
        </div>
        <div className="pmy-int-name-v2">Gmail</div>
        <div className="pmy-int-desc-v2">{tr("Reservas por e-mail: Airbnb, Tiqets, Klook, Civitatis, Viator e Headout entram sozinhas na Central.", "Bookings by e-mail: Airbnb, Tiqets, Klook, Civitatis, Viator and Headout come into the Central automatically.")}</div>
        {state === "error" && <div className="pmy-int-connection-note is-error">{status.lastError}</div>}
        {reviewCount > 0 && <div className="pmy-int-connection-note is-waiting">{tr(`${reviewCount} e-mail(s) para revisar.`, `${reviewCount} e-mail(s) to review.`)}</div>}
        {!readOnly && <div className="pmy-int-actions">
          <Button variant={state === "required" ? "primary" : "secondary"} size="sm" icon="settings" onClick={() => setOpen(true)}>
            {state === "required" ? tr("Configurar", "Configure") : reviewCount ? tr("Revisar e-mails", "Review e-mails") : tr("Gerenciar integração", "Manage integration")}
          </Button>
        </div>}
      </div>
      <Modal open={open && !readOnly} title="Gmail" onClose={() => { setOpen(false); onReload?.(); }} closeLabel={tr("Fechar", "Close")} className="pmy-ds-modal--form pmy-gmail-modal">
        <GmailConnectionPanel requestJson={requestJson} lang={lang} onChanged={onReload} />
      </Modal>
    </>
  );
}
