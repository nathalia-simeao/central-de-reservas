import { useState } from "react";
import { isOutdoorTour, weatherAlert, weatherIcon, weatherSummary } from "../../utils/weather.js";
import { freeSeats, mailtoLink, messageTemplates, personalize, waitlistMatches, whatsappLink } from "../../utils/waitlist.js";

// Seções extras do cartão no Quadro: clima, avisar clientes e lista de espera.

function dateLabel(dateKey, lang) {
  const [y, m, d] = String(dateKey).split("-").map(Number);
  return new Intl.DateTimeFormat(lang === "en" ? "en-GB" : "pt-PT", { day: "numeric", month: "long", timeZone: "UTC" }).format(new Date(Date.UTC(y, m - 1, d, 12)));
}

/* ---------- Clima ---------- */
export function WeatherNote({ card, day, onNotify, onMove, lang }) {
  const tr = (pt, en) => (lang === "en" ? en : pt);
  if (!day) return null;
  const level = isOutdoorTour(card.title) ? weatherAlert(day) : null;
  return (
    <div className={`pmy-weather-note${level ? ` is-${level}` : ""}`}>
      <span>{weatherIcon(day)} {weatherSummary(day, lang)}</span>
      {level === "bad" && <strong>{tr("Mau tempo previsto. Avalie remarcar.", "Bad weather forecast. Consider rescheduling.")}</strong>}
      {level === "watch" && <strong>{tr("Atenção à previsão.", "Keep an eye on the forecast.")}</strong>}
      {level && (onNotify || onMove) && (
        <span className="pmy-weather-note__actions">
          {onNotify && <button type="button" className="pmy-board-btn" onClick={onNotify}>{tr("Avisar clientes", "Notify guests")}</button>}
          {onMove && <button type="button" className="pmy-board-btn" onClick={onMove}>{tr("Remarcar saída", "Reschedule")}</button>}
        </span>
      )}
    </div>
  );
}

/* ---------- Avisar clientes da saída ---------- */
export function GuestMessages({ card, initialTemplate = "delay", lang }) {
  const tr = (pt, en) => (lang === "en" ? en : pt);
  const [msgLang, setMsgLang] = useState("en");
  const templates = messageTemplates({ title: card.title, dateLabel: dateLabel(card.dateKey, msgLang), timeKey: card.timeKey, lang: msgLang });
  const [templateKey, setTemplateKey] = useState(initialTemplate);
  const [text, setText] = useState(() => templates.find((t) => t.key === initialTemplate)?.text || templates[0].text);
  const [copied, setCopied] = useState(false);

  const pick = (key, language = msgLang) => {
    const list = messageTemplates({ title: card.title, dateLabel: dateLabel(card.dateKey, language), timeKey: card.timeKey, lang: language });
    setTemplateKey(key);
    setText(list.find((t) => t.key === key)?.text || "");
  };
  const guests = card.bookings.filter((b) => String(b.status).toUpperCase() === "CONFIRMED");
  const emails = guests.map((b) => b.customerEmail).filter(Boolean);
  const mailto = mailtoLink(emails, `${card.title} · ${dateLabel(card.dateKey, msgLang)} ${card.timeKey}`, personalize(text, ""));

  const copyEmails = async () => {
    try { await navigator.clipboard.writeText(emails.join(", ")); setCopied(true); setTimeout(() => setCopied(false), 2000); }
    catch { setCopied(false); }
  };

  return (
    <div className="pmy-guest-msg">
      <div className="pmy-board-pop__scope" role="group" aria-label={tr("Modelo", "Template")}>
        {templates.filter((t) => t.key !== "waitlist").map((t) => (
          <button key={t.key} type="button" className={templateKey === t.key ? "is-on" : ""} onClick={() => pick(t.key)}>{t.label}</button>
        ))}
      </div>
      <div className="pmy-board-pop__scope" role="group" aria-label={tr("Idioma da mensagem", "Message language")}>
        <button type="button" className={msgLang === "en" ? "is-on" : ""} onClick={() => { setMsgLang("en"); pick(templateKey, "en"); }}>English</button>
        <button type="button" className={msgLang === "pt" ? "is-on" : ""} onClick={() => { setMsgLang("pt"); pick(templateKey, "pt"); }}>Português</button>
      </div>
      <label className="pmy-board-pop__field">
        {tr("Mensagem ({name} vira o primeiro nome do cliente)", "Message ({name} becomes the guest's first name)")}
        <textarea rows={4} value={text} onChange={(e) => setText(e.target.value)} />
      </label>
      {!guests.length && <p className="pmy-board-pop__empty">{tr("Nenhum cliente confirmado nesta saída.", "No confirmed guests on this departure.")}</p>}
      <ul className="pmy-board-guests">
        {guests.map((b) => {
          const wa = whatsappLink(b.customerPhone, personalize(text, b.customerName));
          return (
            <li key={b.id}>
              <span>{b.customerName || tr("Cliente", "Guest")}</span>
              <small>
                {wa ? <a href={wa} target="_blank" rel="noreferrer">💬 WhatsApp</a> : tr("sem WhatsApp", "no WhatsApp")}
                {b.customerEmail ? ` · ${b.customerEmail}` : ""}
              </small>
            </li>
          );
        })}
      </ul>
      {emails.length > 0 && (
        <div className="pmy-board-pop__actions">
          {mailto && <a className="pmy-board-btn is-primary" href={mailto}>✉️ {tr(`E-mail para todos (${emails.length})`, `Email everyone (${emails.length})`)}</a>}
          <button type="button" className="pmy-board-btn" onClick={copyEmails}>{copied ? tr("Copiado!", "Copied!") : tr("Copiar e-mails", "Copy emails")}</button>
        </div>
      )}
      <p className="pmy-board-hint">{tr("Reservas da GYG e Viator costumam vir sem telefone: para elas, use a mensagem pela própria plataforma.", "GYG and Viator bookings often have no phone: message them through the platform.")}</p>
    </div>
  );
}

/* ---------- Lista de espera ---------- */
const EMPTY = { customerName: "", customerPhone: "", customerEmail: "", pax: 1, language: "" };

export function WaitlistSection({ card, tour, entries, onAdd, onStatus, lang }) {
  const tr = (pt, en) => (lang === "en" ? en : pt);
  const [form, setForm] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const seats = freeSeats(card, tour);
  const matches = waitlistMatches(entries, seats);
  const matchIds = new Set(matches.map((m) => m.id));
  const seatText = messageTemplates({ title: card.title, dateLabel: dateLabel(card.dateKey, "en"), timeKey: card.timeKey, lang: "en" }).find((t) => t.key === "waitlist").text;

  const run = async (fn) => {
    setBusy(true);
    setError("");
    try { await fn(); } catch (e) { setError(e?.message || tr("Não foi possível salvar.", "Could not save.")); }
    finally { setBusy(false); }
  };

  return (
    <div className="pmy-waitlist">
      {seats != null && (
        <p className="pmy-board-hint">
          {tr(`Vagas livres: ${seats} de ${tour.maxCapacity} (pela capacidade do passeio).`, `Free seats: ${seats} of ${tour.maxCapacity} (tour capacity).`)}
        </p>
      )}
      {matches.length > 0 && (
        <p className="pmy-waitlist__open" role="status">
          {tr(`Abriu vaga: avise ${matches.length === 1 ? "o primeiro" : `os ${matches.length} primeiros`} da fila.`, `Seats opened: notify the first ${matches.length} in line.`)}
        </p>
      )}
      {error && <p role="alert" className="pmy-board-pop__error">{error}</p>}
      {!entries.length && !form && <p className="pmy-board-pop__empty">{tr("Ninguém na lista de espera.", "Nobody on the waiting list.")}</p>}
      <ul className="pmy-board-guests">
        {entries.map((e, i) => {
          const wa = whatsappLink(e.customerPhone, personalize(seatText, e.customerName));
          return (
            <li key={e.id} className={matchIds.has(e.id) ? "is-match" : ""}>
              <span>{i + 1}. {e.customerName} · {e.pax} pax{e.language ? ` · ${e.language}` : ""}</span>
              <small>
                {e.status === "NOTIFIED" ? tr("avisado", "notified") : e.status === "BOOKED" ? tr("reservou", "booked") : tr("na fila", "waiting")}
                {wa && <> · <a href={wa} target="_blank" rel="noreferrer" onClick={() => { if (e.status === "WAITING") run(() => onStatus(e.id, "NOTIFIED")); }}>💬 {tr("Avisar", "Notify")}</a></>}
                {e.customerEmail && <> · <a href={mailtoLink([e.customerEmail], card.title, personalize(seatText, e.customerName))}>✉️</a></>}
              </small>
              <span className="pmy-waitlist__actions">
                {e.status !== "BOOKED" && <button type="button" className="pmy-board-btn" disabled={busy} onClick={() => run(() => onStatus(e.id, "BOOKED"))}>{tr("Reservou", "Booked")}</button>}
                <button type="button" className="pmy-board-btn is-danger" disabled={busy} onClick={() => run(() => onStatus(e.id, "REMOVED"))}>{tr("Tirar", "Remove")}</button>
              </span>
            </li>
          );
        })}
      </ul>
      {form ? (
        <div className="pmy-waitlist__form">
          <input aria-label={tr("Nome", "Name")} placeholder={tr("Nome do cliente", "Guest name")} value={form.customerName} onChange={(e) => setForm({ ...form, customerName: e.target.value })} />
          <input aria-label="WhatsApp" placeholder="WhatsApp (+351…)" value={form.customerPhone} onChange={(e) => setForm({ ...form, customerPhone: e.target.value })} />
          <input aria-label="E-mail" type="email" placeholder="E-mail" value={form.customerEmail} onChange={(e) => setForm({ ...form, customerEmail: e.target.value })} />
          <input aria-label={tr("Pessoas", "People")} type="number" min={1} max={50} value={form.pax} onChange={(e) => setForm({ ...form, pax: e.target.value })} />
          <input aria-label={tr("Idioma", "Language")} placeholder={tr("Idioma (ex.: EN)", "Language (e.g. EN)")} value={form.language} onChange={(e) => setForm({ ...form, language: e.target.value })} />
          <div className="pmy-board-pop__actions">
            <button type="button" className="pmy-board-btn is-primary" disabled={busy || !form.customerName.trim()} onClick={() => run(async () => { await onAdd(card.tourId, card.startTime, form); setForm(null); })}>{tr("Adicionar à fila", "Add to list")}</button>
            <button type="button" className="pmy-board-btn" disabled={busy} onClick={() => setForm(null)}>{tr("Cancelar", "Cancel")}</button>
          </div>
        </div>
      ) : (
        <button type="button" className="pmy-board-btn" onClick={() => setForm({ ...EMPTY })}>+ {tr("Adicionar à lista de espera", "Add to waiting list")}</button>
      )}
    </div>
  );
}
