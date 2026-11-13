// Editar um cartão do Quadro dentro do app, sem carregar a Central (pedido da
// Nathalia, 13/11/2026). Só administradores. Guias, checklists (o mesmo editor
// do Quadro da Central), no-show, presença e observações. Mover data, etiquetas
// e arquivar continuam na Central (link no fim da tela).

import { useState } from "react";
import { Link, useFetcher, useFetchers, useLoaderData, useSubmit } from "react-router";
import db from "../db.server";
import { isPortalAdmin } from "../utils/central-auth.server";
import { assignGuideToDeparture } from "../services/central-route.server";
import { departureTargetKey, describeChecklistOp, logActivity } from "../services/board-activity.server.js";
import { applyChecklistOp, autoChecklists, cardLanguages, listPeopleSummary, normalizeChecklists } from "../utils/departure-checklists.js";
import { lisbonParts as boardParts, cardCompletion, cardOwnerKey, listsForCard, splitCardByGuide } from "../utils/agenda-board.js";
import { excludeTestBookingsWhere } from "../utils/test-bookings.js";
import { appendNote, bookingPax, departureBookingWhere, ensureDeparture, getGuideFromRequest, redirectTo } from "../utils/guide-portal.server";
import { isGuide } from "../utils/team-areas.js";
import { langColor } from "../utils/language-colors.js";
import { languageLabel } from "../utils/tour-languages.js";
import { guideLang } from "../utils/guide-i18n.js";
import { GIcon, GuideShell, lisbonParts, useGuideLocale, useT } from "../components/guide/GuideShell";
import { ChecklistBlock, ChecklistEditor } from "../components/pmy/ChecklistBlock";
import { DropdownSelect } from "../components/pmy/PmyUI";
import { PhoneChip } from "../components/guide/PhoneActions";

const LANGS = ["pt", "en", "es", "fr", "it", "de"];

function parseKey(raw) {
  const value = String(raw || "");
  const [base] = value.split("#");
  const cut = base.indexOf("|");
  if (cut < 1) return null;
  const tourId = base.slice(0, cut);
  const startTime = new Date(base.slice(cut + 1));
  if (Number.isNaN(startTime.getTime())) return null;
  return { uid: value, key: base, tourId, startTime };
}

async function load(request) {
  const guide = await getGuideFromRequest(db, request);
  if (!guide) throw redirectTo("/guia/login");
  if (!(await isPortalAdmin(guide))) throw redirectTo("/guia/quadro");
  const parsed = parseKey(new URL(request.url).searchParams.get("k"));
  if (!parsed) throw redirectTo("/guia/quadro");
  return { guide, ...parsed };
}

export const loader = async ({ request }) => {
  const { guide, uid, key, tourId, startTime } = await load(request);
  const lang = guideLang(guide.portalLanguage);
  const [tour, bookings, assignments, departure, people] = await Promise.all([
    db.tour.findUnique({ where: { id: tourId }, select: { id: true, title: true, translations: true } }),
    db.booking.findMany({
      where: { AND: [departureBookingWhere(tourId, startTime), excludeTestBookingsWhere()], status: { in: ["CONFIRMED", "PENDING"] } },
      orderBy: { customerName: "asc" },
      select: { id: true, customerName: true, customerPhone: true, language: true, platform: true, status: true, attendanceStatus: true, groupGuideId: true, adults: true, children: true, youths: true, seniors: true, totalParticipants: true },
    }),
    db.guideAssignment.findMany({
      where: { tourId, startTime, status: "ASSIGNED" },
      select: { id: true, guideId: true, languages: true, guide: { select: { id: true, name: true, photoUrl: true, portalPhotoType: true, updatedAt: true } } },
    }),
    db.tourDeparture.findUnique({ where: { tourId_startTime: { tourId, startTime } }, select: { checklists: true, guideNotes: true, completed: true } }),
    db.guide.findMany({ select: { id: true, name: true, areas: true }, orderBy: { name: "asc" } }),
  ]);
  if (!tour) throw redirectTo("/guia/quadro");

  const base = {
    key, tourId, startTime: startTime.toISOString(), timeKey: boardParts(startTime)?.timeKey || "",
    bookings,
    guides: assignments.map((a) => ({ assignmentId: a.id, guideId: a.guideId, name: a.guide?.name || "Guia", languages: a.languages || [] })),
  };
  // Saída dividida (um cartão por guia): mostra só o cartão aberto.
  const pieces = splitCardByGuide(base);
  const card = pieces.find((p) => p.uid === uid) || pieces[0];
  const state = normalizeChecklists(departure?.checklists);
  const raw = { ...state, lists: listsForCard(state.lists, card) };
  const photoOf = (g) => (g?.portalPhotoType ? `/guia/foto/${g.id}?v=${new Date(g.updatedAt || 0).getTime()}` : g?.photoUrl || null);

  return {
    uid: card.uid,
    complete: Boolean(cardCompletion(departure, card)),
    tourId,
    startTime: startTime.toISOString(),
    title: tour.translations?.[lang]?.title || tour.title,
    langs: cardLanguages(card, raw),
    pax: card.bookings.filter((b) => b.status === "CONFIRMED").reduce((sum, b) => sum + bookingPax(b), 0),
    ownerGuideId: card.split ? card.guides[0]?.guideId || "" : "",
    guides: card.guides.map((g) => ({ ...g, photo: photoOf(assignments.find((a) => a.id === g.assignmentId)?.guide) })),
    team: people.filter((p) => isGuide(p)).map((p) => ({ id: p.id, name: p.name })),
    bookings: card.bookings.map((b) => ({ id: b.id, name: b.customerName || "Cliente", phone: b.customerPhone || "", language: b.language || "", platform: b.platform, status: b.status, attendanceStatus: b.attendanceStatus, pax: bookingPax(b) })),
    autos: autoChecklists(card),
    raw,
    notes: (Array.isArray(departure?.guideNotes) ? departure.guideNotes : []).slice(-20).reverse(),
    centralHref: `/?tab=quadro&de=quadro&dia=${boardParts(startTime)?.dateKey || ""}&cartao=${encodeURIComponent(card.uid)}`,
  };
};

export const action = async ({ request }) => {
  const { guide, tourId, startTime } = await load(request);
  const form = await request.formData();
  const intent = String(form.get("intent") || "");
  const target = departureTargetKey(tourId, startTime);
  const actor = { name: guide.name, personId: guide.id };

  if (intent === "op") {
    let op;
    try { op = JSON.parse(String(form.get("op") || "{}")); } catch { op = null; }
    if (!op?.type) return { error: "Checklist inválido." };
    const owner = String(form.get("owner") || "");
    if (op.type === "addList" && owner) op.guideId = owner;
    const departure = await ensureDeparture(db, tourId, startTime);
    const described = describeChecklistOp(departure.checklists, op);
    try {
      const checklists = applyChecklistOp(departure.checklists, op, guide.name);
      await db.tourDeparture.update({ where: { id: departure.id }, data: { checklists } });
    } catch (e) {
      return { error: e?.message || "Não foi possível salvar o checklist." };
    }
    await logActivity(db, { targetType: "departure", targetKey: target, text: described ? `${described} (pelo app)` : null, actor });
    return { ok: true };
  }

  if (intent === "assign") {
    const [tour, person] = await Promise.all([
      db.tour.findUnique({ where: { id: tourId } }),
      db.guide.findUnique({ where: { id: String(form.get("guideId") || "") } }),
    ]);
    if (!tour || !person) return { error: "Escolha o guia." };
    let languages = [];
    try { languages = JSON.parse(String(form.get("languages") || "[]")); } catch { languages = []; }
    const result = await assignGuideToDeparture({ tour, guide: person, startTime, languages });
    if (!result.ok) return { error: result.error };
    const langs = (result.assignment?.languages || []).map((k) => languageLabel(k, "pt")).join(", ");
    await logActivity(db, { targetType: "departure", targetKey: target, text: `escalou ${person.name}${langs ? ` (${langs})` : ""} (pelo app)`, actor });
    return { ok: true };
  }

  if (intent === "unassign") {
    const existing = await db.guideAssignment.findFirst({ where: { id: String(form.get("id") || ""), tourId, startTime }, include: { guide: { select: { name: true } } } });
    if (!existing) return { error: "Escala não encontrada." };
    await db.guideAssignment.update({ where: { id: existing.id }, data: { status: "CANCELLED" } });
    await logActivity(db, { targetType: "departure", targetKey: target, text: `tirou ${existing.guide?.name || "o guia"} da saída (pelo app)`, actor });
    return { ok: true };
  }

  // Cartão finalizado (check do Trello), o mesmo da Central.
  if (intent === "complete") {
    const owner = cardOwnerKey({ uid: String(form.get("uid") || "") });
    const done = String(form.get("done") || "true") === "true";
    const departure = await ensureDeparture(db, tourId, startTime);
    const current = await db.tourDeparture.findUnique({ where: { id: departure.id }, select: { completed: true } });
    const completed = { ...((current?.completed && typeof current.completed === "object") ? current.completed : {}) };
    if (done) completed[owner] = { at: new Date().toISOString(), by: guide.name };
    else { delete completed[owner]; if (owner !== "all") delete completed.all; }
    await db.tourDeparture.update({ where: { id: departure.id }, data: { completed } });
    await logActivity(db, { targetType: "departure", targetKey: target, text: done ? "marcou este cartão como finalizado (pelo app)" : "reabriu este cartão (pelo app)", actor });
    return { ok: true };
  }

  if (intent === "attendance") {
    const value = String(form.get("value") || "").toUpperCase();
    if (!["COMPLETED", "NO_SHOW"].includes(value)) return { error: "Marcação inválida." };
    const booking = await db.booking.findFirst({ where: { id: String(form.get("bookingId") || ""), ...departureBookingWhere(tourId, startTime) }, select: { id: true } });
    if (!booking) return { error: "Reserva não encontrada nesta saída." };
    await db.booking.update({ where: { id: booking.id }, data: { attendanceStatus: value, attendanceMarkedAt: new Date(), attendanceMarkedBy: `guide:${guide.id}` } });
    return { ok: true };
  }

  if (intent === "note") {
    const text = String(form.get("text") || "").trim();
    if (!text) return { error: "Escreva a observação." };
    const departure = await ensureDeparture(db, tourId, startTime);
    await db.tourDeparture.update({ where: { id: departure.id }, data: { guideNotes: appendNote(departure.guideNotes, { by: guide.name, text }) } });
    return { ok: true, noteSaved: true };
  }

  return { error: "Ação desconhecida." };
};

function GuideRow({ g }) {
  const t = useT();
  const fetcher = useFetcher();
  const [confirm, setConfirm] = useState(false);
  return (
    <div className="g-card-guide">
      {g.photo ? <img src={g.photo} alt="" /> : <span className="g-bcard__initials">{g.name.split(" ").map((w) => w[0]).slice(0, 2).join("")}</span>}
      <span className="g-card-guide__name">
        <b>{g.name}</b>
        <span className="g-bcard__langs" style={{ margin: 0 }}>
          {(g.languages || []).length
            ? g.languages.map((k) => <span key={k} className="g-lang" style={{ background: langColor(k) }}>{k.toUpperCase()}</span>)
            : <small>{t("todos os idiomas")}</small>}
        </span>
      </span>
      {confirm ? (
        <span className="g-row" style={{ gap: 6 }}>
          <button type="button" className="g-btn danger" disabled={fetcher.state !== "idle"} onClick={() => fetcher.submit({ intent: "unassign", id: g.assignmentId }, { method: "post" })}>{t("Tirar")}</button>
          <button type="button" className="g-btn" onClick={() => setConfirm(false)}>{t("Cancelar")}</button>
        </span>
      ) : (
        <button type="button" className="g-icon-btn" aria-label={t("Tirar {name} da saída", { name: g.name })} onClick={() => setConfirm(true)}><GIcon name="x" /></button>
      )}
    </div>
  );
}

function AssignForm({ team, assigned }) {
  const t = useT();
  const fetcher = useFetcher();
  const [guideId, setGuideId] = useState("");
  const [langs, setLangs] = useState([]);
  const options = team.filter((p) => !assigned.includes(p.id)).map((p) => ({ value: p.id, label: p.name }));
  const error = fetcher.data?.error;
  return (
    <div className="g-assign">
      <DropdownSelect value={guideId} options={options} onChange={setGuideId} placeholder={t("Escalar guia…")} searchPlaceholder={t("Buscar guia…")} ariaLabel={t("Guia")} />
      <div className="g-assign__langs" role="group" aria-label={t("Idiomas do grupo")}>
        {LANGS.map((k) => {
          const on = langs.includes(k);
          return (
            <button key={k} type="button" aria-pressed={on} className={`g-lang-toggle${on ? " on" : ""}`} style={on ? { background: langColor(k), borderColor: langColor(k) } : undefined}
              onClick={() => setLangs(on ? langs.filter((x) => x !== k) : [...langs, k])}>{k.toUpperCase()}</button>
          );
        })}
      </div>
      <small className="g-hint" style={{ margin: 0 }}>{t("Sem idioma marcado = o guia atende todos os idiomas da saída.")}</small>
      {error && <div className="g-error" role="alert">{t(error)}</div>}
      <button type="button" className="g-btn primary" disabled={!guideId || fetcher.state !== "idle"}
        onClick={() => { fetcher.submit({ intent: "assign", guideId, languages: JSON.stringify(langs) }, { method: "post" }); setGuideId(""); setLangs([]); }}>
        {fetcher.state !== "idle" ? t("Salvando…") : t("Escalar")}
      </button>
    </div>
  );
}

function Attendance({ booking }) {
  const fetcher = useFetcher();
  const t = useT();
  const pending = fetcher.formData?.get("value");
  const value = pending || booking.attendanceStatus;
  if (booking.status !== "CONFIRMED") return <span className="g-pill wait">{t("Pendente")}</span>;
  const send = (v) => fetcher.submit({ intent: "attendance", bookingId: booking.id, value: v }, { method: "post" });
  return (
    <span className="g-row" style={{ gap: 6 }}>
      <button type="button" className={`g-noshow${value === "COMPLETED" ? " on-ok" : ""}`} onClick={() => send("COMPLETED")}>{t("Presente")}</button>
      <button type="button" className={`g-noshow${value === "NO_SHOW" ? " on" : ""}`} onClick={() => send("NO_SHOW")}>No-show</button>
    </span>
  );
}

function CompleteToggle({ uid, complete }) {
  const t = useT();
  const fetcher = useFetcher();
  const pending = fetcher.state !== "idle";
  const on = pending ? fetcher.formData?.get("done") === "true" : complete;
  return (
    <fetcher.Form method="post" className="g-complete-form">
      <input type="hidden" name="intent" value="complete" />
      <input type="hidden" name="uid" value={uid} />
      <input type="hidden" name="done" value={on ? "false" : "true"} />
      <button type="submit" className={`g-complete-btn${on ? " is-on" : ""}`} aria-pressed={on} disabled={pending}>
        <span className="g-complete"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 8.4l2.6 2.5L12 5.5" /></svg></span>
        {on ? t("Finalizado") : t("Marcar como finalizado")}
      </button>
    </fetcher.Form>
  );
}

export default function GuideCardEditor() {
  const data = useLoaderData();
  const t = useT();
  const locale = useGuideLocale();
  const submit = useSubmit();
  const fetchers = useFetchers();
  const noteFetcher = useFetcher();
  const saving = fetchers.some((f) => f.key?.startsWith("op-") && f.state !== "idle");
  const opError = fetchers.find((f) => f.key?.startsWith("op-") && f.data?.error)?.data?.error;
  const parts = lisbonParts(data.startTime, locale);
  // Mesmo editor de checklists do Quadro da Central; cada mudança vai para o servidor.
  // Cada mudança tem o seu envio (vários toques seguidos não se atropelam).
  const onOp = (op) => submit(
    { intent: "op", op: JSON.stringify(op), owner: data.ownerGuideId },
    { method: "post", navigate: false, fetcherKey: `op-${Date.now()}-${Math.random().toString(36).slice(2, 7)}` },
  );
  const state = data.raw;
  const people = listPeopleSummary(data.autos.flatMap((l) => l.items).concat(state.lists.flatMap((l) => l.items)));

  return (
    <GuideShell title={data.title}>
      <div className="g-top"><Link to="/guia/quadro" className="g-link">← {t("Quadro")}</Link></div>

      <div className="g-card">
        <h2 style={{ fontSize: 18 }}>{data.title}</h2>
        <CompleteToggle uid={data.uid} complete={data.complete} />
        <div className="g-summary">
          <span><b>{parts.time}</b> · {parts.day}</span>
          <span><b>{data.pax}</b> pax{people.total ? ` · ${people.label}` : ""}</span>
        </div>
        {data.langs.length > 0 && (
          <span className="g-bcard__langs">{data.langs.map((k) => <span key={k} className="g-lang" style={{ background: langColor(k) }}>{k.toUpperCase()}</span>)}</span>
        )}
        {opError && <div className="g-error" role="alert">{t(opError)}</div>}
      </div>

      <div className="g-card">
        <h2>{t("Guias")}</h2>
        {!data.guides.length && <p className="g-empty">{t("Nenhum guia escalado.")}</p>}
        {data.guides.map((g) => <GuideRow key={g.assignmentId} g={g} />)}
        <AssignForm team={data.team} assigned={data.guides.map((g) => g.guideId)} />
      </div>

      <div className="g-card g-card-checklists">
        <ChecklistEditor raw={state} onOp={onOp} lang={locale.startsWith("en") ? "en" : "pt"}
          empty={t("Ainda não há checklist. Toque em “+ Checklist” para criar.")}
          before={data.autos.map((list) => (
            <ChecklistBlock key={list.id} list={list} busy={saving} lang="pt"
              hidden={Boolean(state.hideDone?.[list.id])}
              isDone={(item) => Boolean(state.auto?.[item.key]?.done)}
              onToggle={(item) => onOp({ type: "toggleAuto", key: item.key, label: item.text })}
              onToggleHide={() => onOp({ type: "toggleHideDone", listId: list.id })} />
          ))} />
      </div>

      {data.bookings.length > 0 && (
        <div className="g-card">
          <h2>{t("Clientes")}</h2>
          {data.bookings.map((b) => (
            <div key={b.id} className="g-guest">
              <div className="g-guest__head"><strong>{b.name}</strong></div>
              <div className="g-guest__meta">{b.pax} pax · {b.language || t("idioma não informado")}</div>
              <div className="g-row">
                {b.phone && <PhoneChip phone={b.phone} title={b.name} />}
                <Attendance booking={b} />
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="g-card">
        <h2>{t("Observações")}</h2>
        <noteFetcher.Form method="post" className="g-note-form" key={noteFetcher.data?.noteSaved ? Date.now() : "note"}>
          <input type="hidden" name="intent" value="note" />
          <textarea name="text" rows={2} placeholder={t("Escreva uma observação para a equipe…")} />
          <button type="submit" className="g-btn" disabled={noteFetcher.state !== "idle"}>{t("Salvar")}</button>
        </noteFetcher.Form>
        {data.notes.map((n, i) => (
          <p key={`${n.at}-${i}`} className="g-note"><b>{n.by || t("Equipe")}</b>: {n.text}<br /><small>{n.at ? lisbonParts(n.at, locale).day : ""}</small></p>
        ))}
      </div>

      <a href={data.centralHref} className="g-btn" style={{ width: "100%" }}>{t("Mover data, etiquetas e arquivar (abre a Central)")}</a>
    </GuideShell>
  );
}
