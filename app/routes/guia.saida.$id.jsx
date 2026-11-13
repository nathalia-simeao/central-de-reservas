import { checklistPlatform } from "../utils/checklist-platforms.js";
import { excludeTestBookingsWhere } from "../utils/test-bookings.js";
import { Form, Link, useActionData, useFetcher, useLoaderData, useNavigation } from "react-router";
import { applyChecklistOp, autoChecklists, normalizeChecklists } from "../utils/departure-checklists.js";
import { normalizeText } from "../utils/trello-import.js";
import { departureTargetKey, describeChecklistOp, logActivity } from "../services/board-activity.server.js";
import db from "../db.server";
import { isPortalAdmin } from "../utils/central-auth.server";
import { PhoneChip } from "../components/guide/PhoneActions";
import { textWithoutPhones } from "../utils/phone-actions.js";
import { GIcon, GuideShell, PLATFORM_NAMES, lisbonParts, useGuideLocale, useT } from "../components/guide/GuideShell";
import {
  CHECK_FIELDS,
  appendNote,
  bookingPax,
  bookingsForGuideLanguages,
  cleanParticipants,
  departureBookingWhere,
  ensureDeparture,
  getGuideFromRequest,
  guidePermissions,
  loadGuideAssignment,
  phoneDigits,
  redirectTo,
  whatsappLink,
} from "../utils/guide-portal.server";

async function load(request, params) {
  const guide = await getGuideFromRequest(db, request);
  if (!guide) throw redirectTo("/guia/login");
  const admin = await isPortalAdmin(guide);
  const assignment = await loadGuideAssignment(db, guide, params.id, { anyGuide: admin });
  if (!assignment) throw redirectTo("/guia");
  // Admin acompanhando a saída de outro guia: vê e marca tudo da saída (todos os idiomas).
  const viewAll = admin && assignment.guideId !== guide.id;
  return { guide, assignment, viewAll, admin };
}

// Checklists da saída, iguais aos do Quadro (e do Trello): os automáticos por
// grupo de idioma (pronto → um item por cliente → fim de tour) e os da equipe /
// importados do Trello. O guia vê os do grupo dele primeiro e só marca/desmarca.
function guideChecklists({ guide, assignment, bookings, departure, teammates, viewAll = false }) {
  const state = normalizeChecklists(departure?.checklists);
  const card = {
    timeKey: lisbonParts(assignment.startTime).time,
    bookings,
    guides: teammates.map((t) => ({ guideId: t.guideId, name: t.guide?.name || "Guia", languages: t.languages || [] })),
  };
  const myLanguages = viewAll ? [] : assignment.languages || [];
  const auto = autoChecklists(card)
    .filter((list) => !myLanguages.length || myLanguages.includes(list.id.replace("auto:", "")))
    .map((list) => ({
      id: list.id, title: list.title, auto: true, mine: true,
      items: list.items.map((item) => ({
        id: item.key, text: item.text, platform: item.platform || null, done: Boolean(state.auto[item.key]?.done),
        bookingId: item.key.startsWith("booking:") ? item.key.slice(8) : null,
      })),
    }));
  const firstName = normalizeText(guide.name).split(" ")[0];
  const manual = state.lists.map((list) => ({
    id: list.id, title: list.title, auto: false,
    mine: list.guideId ? list.guideId === assignment.guideId : Boolean(firstName) && normalizeText(list.title).split(" ").includes(firstName),
    items: list.items.map((item) => ({ id: item.id, text: item.text, platform: item.platform || null, done: item.done })),
  }));
  return [...auto, ...manual].sort((a, b) => Number(b.mine) - Number(a.mine));
}

export const loader = async ({ request, params }) => {
  const { guide, assignment, viewAll, admin } = await load(request, params);
  const [bookings, departure, teammates] = await Promise.all([
    db.booking.findMany({
      where: { AND: [departureBookingWhere(assignment.tourId, assignment.startTime), excludeTestBookingsWhere()] },
      orderBy: { customerName: "asc" },
      select: {
        id: true, customerName: true, customerPhone: true, language: true, platform: true, bookingRef: true,
        adults: true, children: true, youths: true, seniors: true, totalParticipants: true, attendanceStatus: true, status: true, groupGuideId: true, participants: true,
      },
    }),
    db.tourDeparture.findUnique({
      where: { tourId_startTime: { tourId: assignment.tourId, startTime: assignment.startTime } },
      include: { attachments: { select: { id: true, fileName: true, mimeType: true, size: true }, orderBy: { createdAt: "asc" } } },
    }),
    db.guideAssignment.findMany({
      where: { tourId: assignment.tourId, startTime: assignment.startTime, status: "ASSIGNED" },
      select: { guideId: true, languages: true, guide: { select: { name: true } } },
    }),
  ]);

  const groupBookings = viewAll ? bookings : bookingsForGuideLanguages(bookings, assignment.languages, assignment.guideId);
  return {
    checklists: guideChecklists({ guide, assignment, bookings, departure, teammates, viewAll }),
    guide: { name: guide.name },
    viewAll,
    canUndoChecks: admin,
    guideNames: teammates.map((tm) => tm.guide?.name).filter(Boolean),
    departure: {
      languages: assignment.languages || [],
      id: assignment.id,
      title: assignment.tour?.title || "Passeio",
      startTime: assignment.startTime.toISOString(),
      checkStartAt: departure?.checkStartAt?.toISOString() || null,
      checkMidAt: departure?.checkMidAt?.toISOString() || null,
      checkEndAt: departure?.checkEndAt?.toISOString() || null,
      notes: Array.isArray(departure?.guideNotes) ? departure.guideNotes : [],
      attachments: departure?.attachments || [],
    },
    permissions: guidePermissions(departure, assignment.startTime),
    bookings: groupBookings.map((b) => ({
      ...b,
      pax: bookingPax(b),
      participants: Array.isArray(b.participants) ? b.participants : [],
      tel: phoneDigits(b.customerPhone),
      wa: whatsappLink(b.customerPhone),
    })),
  };
};

export const action = async ({ request, params }) => {
  const { guide, assignment, viewAll, admin } = await load(request, params);
  const form = await request.formData();
  const intent = String(form.get("intent") || "");
  const existing = await db.tourDeparture.findUnique({
    where: { tourId_startTime: { tourId: assignment.tourId, startTime: assignment.startTime } },
  });
  const perms = guidePermissions(existing, assignment.startTime);
  const by = `guide:${guide.id}`;

  // Administradores desfazem um check marcado sem querer (pedido da Nathalia, 13/11/2026).
  if (intent.startsWith("uncheck:")) {
    const step = intent.slice(8);
    const field = CHECK_FIELDS[step];
    if (!admin) return { error: "Só administradores podem desfazer um check." };
    if (!field || !existing?.[field]) return { error: "Esse check não está marcado." };
    // Desfazer o Início também desfaz Meio e Fim (a ordem é Início → Meio → Fim).
    const fields = step === "start" ? ["checkStartAt", "checkMidAt", "checkEndAt"] : step === "mid" ? ["checkMidAt", "checkEndAt"] : ["checkEndAt"];
    await db.tourDeparture.update({ where: { id: existing.id }, data: Object.fromEntries(fields.map((f) => [f, null])) });
    const label = step === "start" ? "Início" : step === "mid" ? "Meio" : "Fim";
    await logActivity(db, { targetType: "departure", targetKey: departureTargetKey(assignment.tourId, assignment.startTime), text: `desfez o check de ${label} (pelo app)`, actor: { name: guide.name, personId: guide.id } });
    return { ok: "Check desfeito." };
  }

  if (intent.startsWith("check:")) {
    const step = intent.slice(6);
    const field = CHECK_FIELDS[step];
    const allowed = { start: perms.canCheckStart, mid: perms.canCheckMid, end: perms.canCheckEnd }[step];
    if (!field || !allowed) return { error: "Esse check não está disponível agora." };
    const departure = existing || (await ensureDeparture(db, assignment.tourId, assignment.startTime));
    await db.tourDeparture.update({ where: { id: departure.id }, data: { [field]: new Date(), checkedBy: by } });
    await logActivity(db, { targetType: "departure", targetKey: departureTargetKey(assignment.tourId, assignment.startTime), text: `registrou o check de ${step === "start" ? "Início" : step === "mid" ? "Meio" : "Fim"} (pelo app)`, actor: { name: guide.name, personId: guide.id } });
    return { ok: step === "start" ? "Início registrado." : step === "mid" ? "Meio registrado." : "Fim registrado. Bom trabalho!" };
  }

  if (intent === "checklist") {
    const listId = String(form.get("listId") || "");
    const itemId = String(form.get("itemId") || "");
    const op = listId.startsWith("auto:") ? { type: "toggleAuto", key: itemId, label: String(form.get("label") || "").slice(0, 160) } : { type: "toggleItem", listId, itemId };
    const departure = existing || (await ensureDeparture(db, assignment.tourId, assignment.startTime));
    const described = describeChecklistOp(departure.checklists, op);
    const checklists = applyChecklistOp(departure.checklists, op, guide.name);
    await logActivity(db, { targetType: "departure", targetKey: departureTargetKey(assignment.tourId, assignment.startTime), text: described ? `${described} (pelo app)` : null, actor: { name: guide.name, personId: guide.id } });
    await db.tourDeparture.update({ where: { id: departure.id }, data: { checklists } });
    return { checklistSaved: true };
  }

  if (intent === "attendance") {
    if (!perms.canMarkAttendance) return { error: "A presença só pode ser marcada no dia do passeio, até o check de Fim." };
    const bookingId = String(form.get("bookingId") || "");
    const value = String(form.get("value") || "").toUpperCase();
    if (!["COMPLETED", "NO_SHOW"].includes(value)) return { error: "Marcação inválida." };
    const booking = await db.booking.findFirst({
      where: { id: bookingId, ...departureBookingWhere(assignment.tourId, assignment.startTime), status: "CONFIRMED" },
      select: { id: true, language: true, groupGuideId: true },
    });
    if (!booking || (!viewAll && !bookingsForGuideLanguages([booking], assignment.languages, assignment.guideId).length)) {
      return { error: "Reserva não encontrada no seu grupo desta saída." };
    }
    await db.booking.update({
      where: { id: booking.id },
      data: { attendanceStatus: value, attendanceMarkedAt: new Date(), attendanceMarkedBy: by },
    });
    return null;
  }

  if (intent === "participants") {
    if (!perms.canMarkAttendance) return { error: "Os participantes só podem ser registrados no dia do passeio, até o check de Fim." };
    const bookingId = String(form.get("bookingId") || "");
    const booking = await db.booking.findFirst({
      where: { id: bookingId, ...departureBookingWhere(assignment.tourId, assignment.startTime) },
      select: { id: true, language: true, groupGuideId: true, adults: true, children: true, youths: true, seniors: true, totalParticipants: true },
    });
    if (!booking || (!viewAll && !bookingsForGuideLanguages([booking], assignment.languages, assignment.guideId).length)) {
      return { error: "Reserva não encontrada no seu grupo desta saída." };
    }
    const rows = [];
    for (let i = 0; i < 30; i += 1) {
      if (!form.has(`name_${i}`) && !form.has(`country_${i}`)) continue;
      rows.push({ name: form.get(`name_${i}`), country: form.get(`country_${i}`) });
    }
    await db.booking.update({
      where: { id: booking.id },
      data: { participants: cleanParticipants(rows, bookingPax(booking)) },
    });
    return { ok: "Participantes salvos." };
  }

  if (intent === "note") {
    if (!perms.canAddNote) return { error: "Observações só podem ser adicionadas perto do dia do passeio." };
    const text = String(form.get("text") || "").trim();
    if (!text) return { error: "Escreva a observação." };
    const departure = existing || (await ensureDeparture(db, assignment.tourId, assignment.startTime));
    await db.tourDeparture.update({
      where: { id: departure.id },
      data: { guideNotes: appendNote(departure.guideNotes, { by: guide.name, text }) },
    });
    return { ok: "Observação salva." };
  }

  return { error: "Ação desconhecida." };
};

const LANGUAGE_NAMES = { en: "Inglês", pt: "Português", es: "Espanhol", fr: "Francês", it: "Italiano", de: "Alemão", nl: "Holandês", zh: "Chinês", ja: "Japonês", ru: "Russo", ar: "Árabe", he: "Hebraico", ko: "Coreano", pl: "Polonês" };

function fmtTime(value, locale) {
  return value ? lisbonParts(value, locale).time : "";
}

function paxDetail(b, t = (x) => x) {
  return [
    [b.adults, "adulto", "adultos"], [b.children, "criança", "crianças"],
    [b.youths, "jovem", "jovens"], [b.seniors, "sênior", "seniores"],
  ].filter(([n]) => Number(n) > 0).map(([n, one, many]) => `${n} ${t(Number(n) === 1 ? one : many)}`).join(", ");
}

function AttendanceActions({ booking, canMark, close }) {
  const t = useT();
  const fetcher = useFetcher();
  if (!booking || booking.status !== "CONFIRMED") return null;
  const send = (value) => {
    fetcher.submit({ intent: "attendance", bookingId: booking.id, value }, { method: "post" });
    close?.();
  };
  return (
    <>
      <button type="button" className="g-sheet__item" disabled={!canMark} onClick={() => send("COMPLETED")}>
        <GIcon name="userCheck" /> {booking.attendanceStatus === "COMPLETED" ? `✓ ${t("Presente")}` : t("Marcar presente")}
      </button>
      <button type="button" className="g-sheet__item is-danger" disabled={!canMark} onClick={() => send("NO_SHOW")}>
        <GIcon name="userX" /> {booking.attendanceStatus === "NO_SHOW" ? "✓ No-show" : t("Marcar no-show")}
      </button>
      {!canMark && <p className="g-sheet__note">{t("A presença abre 3 horas antes do passeio.")}</p>}
    </>
  );
}

// Só a caixinha e o texto marcam o item; o número é um botão à parte
// (abrir o WhatsApp não pode marcar o cliente como feito).
function ChecklistItem({ listId, item, booking, canMark }) {
  const fetcher = useFetcher();
  const done = fetcher.formData ? !item.done : item.done;
  const { text, phones } = textWithoutPhones(item.text);
  const plat = checklistPlatform(item.platform);
  const title = booking?.customerName || text;
  return (
    <div className="g-cl-row">
      <fetcher.Form method="post">
        <input type="hidden" name="intent" value="checklist" />
        <input type="hidden" name="listId" value={listId} />
        <input type="hidden" name="itemId" value={item.id} />
        <input type="hidden" name="label" value={item.text} />
        <button type="submit" className={`g-cl-item${done ? " done" : ""}`} aria-pressed={done}>
          <span className="g-cl-box" aria-hidden="true">{done ? "✓" : ""}</span>
          <span className="g-cl-text">{text || item.text}</span>
          {booking?.attendanceStatus === "NO_SHOW" && <span className="g-pill no">No-show</span>}
        </button>
      </fetcher.Form>
      {(plat || phones.length > 0) && (
        <span className="g-cl-side">
          {phones.map((phone) => (
            <PhoneChip key={phone} phone={phone} title={title}
              extra={booking ? (close) => <AttendanceActions booking={booking} canMark={canMark} close={close} /> : null} />
          ))}
          {plat && <span className="g-plat" style={{ background: plat.color }} title={plat.name}>{plat.label}</span>}
        </span>
      )}
    </div>
  );
}

export default function GuideDeparture() {
  const { departure, permissions, bookings, checklists, viewAll, canUndoChecks = false, guideNames = [] } = useLoaderData();
  const bookingById = new Map(bookings.map((b) => [b.id, b]));
  const result = useActionData();
  const navigation = useNavigation();
  const t = useT();
  const locale = useGuideLocale();
  const busy = navigation.state !== "idle";
  const parts = lisbonParts(departure.startTime, locale);
  const totalPax = bookings.reduce((sum, b) => sum + b.pax, 0);
  const present = bookings.filter((b) => b.attendanceStatus === "COMPLETED").reduce((s, b) => s + b.pax, 0);
  const noShow = bookings.filter((b) => b.attendanceStatus === "NO_SHOW").reduce((s, b) => s + b.pax, 0);

  const checks = [
    { key: "start", label: t("Início"), at: departure.checkStartAt, can: permissions.canCheckStart },
    { key: "mid", label: t("Meio"), at: departure.checkMidAt, can: permissions.canCheckMid },
    { key: "end", label: t("Fim"), at: departure.checkEndAt, can: permissions.canCheckEnd },
  ];

  return (
    <GuideShell title={departure.title}>
      <div className="g-top">
        <Link to="/guia" className="g-link">← {t("Minhas saídas")}</Link>
      </div>

      <div className="g-card">
        <h2 style={{ fontSize: 18 }}>{departure.title}</h2>
        <div className="g-summary">
          <span><b>{parts.time}</b> · {parts.day}</span>
          <span><b>{totalPax}</b> pax · {bookings.length} {t("reserva(s)")}</span>
          {viewAll && <span>{t("Acompanhando como administrador")} · {t("Guias")}: <b>{guideNames.join(", ") || "—"}</b></span>}
          {!viewAll && departure.languages.length > 0 && <span>{t("Seu grupo:")} <b>{departure.languages.map((k) => t(LANGUAGE_NAMES[k] || k)).join(", ")}</b></span>}
          <span>{t("Presentes")} <b>{present}</b> · No-show <b>{noShow}</b></span>
        </div>
      </div>

      {result?.error && <div className="g-error" role="alert">{t(result.error)}</div>}
      {result?.ok && <div className="g-ok" role="status">{t(result.ok)}</div>}

      <div className="g-card">
        <h2>{t("Checklist")}</h2>
        <Form method="post" className="g-checks">
          {checks.map((c) => (
            <button
              key={c.key}
              type="submit"
              name="intent"
              value={`check:${c.key}`}
              className={`g-check ${c.at ? "done" : ""}`}
              disabled={busy || !c.can}
            >
              {c.at ? "✓ " : ""}{c.label}
              <small>{c.at ? fmtTime(c.at, locale) : c.can ? t("toque para marcar") : "—"}</small>
            </button>
          ))}
        </Form>
        {canUndoChecks && checks.some((c) => c.at) && (
          <Form method="post" className="g-undo-checks">
            <span>{t("Marcou sem querer?")}</span>
            {checks.filter((c) => c.at).map((c) => (
              <button key={c.key} type="submit" name="intent" value={`uncheck:${c.key}`} className="g-link-btn" disabled={busy}>
                {t("Desfazer {step}", { step: c.label })}
              </button>
            ))}
          </Form>
        )}
      </div>

      {checklists.length > 0 && (
        <div className="g-card">
          <h2>{t("Checklists do grupo")}</h2>
          {checklists.map((list) => {
            const doneCount = list.items.filter((i) => i.done).length;
            return (
              <section key={list.id} className={`g-cl${list.mine ? " mine" : ""}`} aria-label={list.title}>
                <h3>{list.title}<small>{doneCount}/{list.items.length}</small></h3>
                {list.items.map((item) => <ChecklistItem key={item.id} listId={list.id} item={item} booking={item.bookingId ? bookingById.get(item.bookingId) : null} canMark={permissions.canMarkAttendance} />)}
              </section>
            );
          })}
        </div>
      )}

      <div className="g-card">
        <h2>{t("Clientes")}</h2>
        {!bookings.length && <p className="g-empty">{t("Nenhuma reserva nesta saída.")}</p>}
        {bookings.map((b) => (
          <div key={b.id} className="g-guest">
            <div className="g-guest__head">
              <strong>{b.customerName || t("Sem nome")}</strong>
              {b.attendanceStatus === "COMPLETED" && <span className="g-pill ok">{t("Presente")}</span>}
              {b.attendanceStatus === "NO_SHOW" && <span className="g-pill no">No-show</span>}
              {b.status === "PENDING" && <span className="g-pill wait">{t("Pendente")}</span>}
            </div>
            <div className="g-guest__meta">
              {b.pax} pax{paxDetail(b, t) ? ` (${paxDetail(b, t)})` : ""} · {b.language || t("idioma não informado")} · {PLATFORM_NAMES[b.platform] || b.platform}
              {b.bookingRef ? ` · ${b.bookingRef}` : ""}
            </div>
            {b.pax > 0 && (
              <details className="g-participants">
                <summary>{t("Participantes")} ({b.participants.length}/{b.pax}) · {t("opcional")}</summary>
                <Form method="post">
                  <input type="hidden" name="intent" value="participants" />
                  <input type="hidden" name="bookingId" value={b.id} />
                  {Array.from({ length: Math.min(b.pax, 30) }).map((_, i) => (
                    <div key={i} className="g-participant">
                      <input name={`name_${i}`} defaultValue={b.participants[i]?.name || ""} placeholder={`${t("Nome")} ${i + 1}`} aria-label={t("Nome do participante {n}", { n: i + 1 })} disabled={!permissions.canMarkAttendance} autoComplete="off" />
                      <input name={`country_${i}`} defaultValue={b.participants[i]?.country || ""} placeholder={t("País")} aria-label={t("País do participante {n}", { n: i + 1 })} disabled={!permissions.canMarkAttendance} autoComplete="off" />
                    </div>
                  ))}
                  {permissions.canMarkAttendance && <button type="submit" className="g-btn" disabled={busy}>{t("Salvar participantes")}</button>}
                </Form>
              </details>
            )}
            <div className="g-row">
              {b.tel && <PhoneChip phone={b.customerPhone} title={b.customerName} />}
              {b.status === "CONFIRMED" && (
                <Form method="post" className="g-row">
                  <input type="hidden" name="intent" value="attendance" />
                  <input type="hidden" name="bookingId" value={b.id} />
                  <button type="submit" name="value" value="COMPLETED" className={`g-btn ${b.attendanceStatus === "COMPLETED" ? "on" : ""}`} disabled={busy || !permissions.canMarkAttendance}>{t("Presente")}</button>
                  <button type="submit" name="value" value="NO_SHOW" className={`g-btn ${b.attendanceStatus === "NO_SHOW" ? "on-no" : ""}`} disabled={busy || !permissions.canMarkAttendance}>No-show</button>
                </Form>
              )}
            </div>
          </div>
        ))}
        {!permissions.canMarkAttendance && bookings.length > 0 && (
          <p className="g-empty" style={{ marginTop: 10 }}>
            {departure.checkEndAt ? t("Saída encerrada: a presença não pode mais ser alterada.") : t("A presença abre 3 horas antes do passeio.")}
          </p>
        )}
      </div>

      <div className="g-card">
        <h2>{t("Ingressos e arquivos")}</h2>
        {!departure.attachments.length && <p className="g-empty">{t("Nenhum arquivo anexado pela gestão.")}</p>}
        {departure.attachments.map((file) => (
          <a key={file.id} className="g-file" href={`/guia/anexo/${file.id}`} target="_blank" rel="noreferrer">
            <span><GIcon name="clip" /> {file.fileName}</span>
            <small style={{ color: "var(--g-muted)" }}>{Math.max(1, Math.round(file.size / 1024))} KB</small>
          </a>
        ))}
      </div>

      <div className="g-card">
        <h2>{t("Observações")}</h2>
        {!departure.notes.length && <p className="g-empty">{t("Nenhuma observação ainda.")}</p>}
        {departure.notes.map((note, index) => (
          <div key={index} className="g-note">
            {note.text}
            <small>{note.by} · {new Date(note.at).toLocaleString(locale, { timeZone: "Europe/Lisbon", dateStyle: "short", timeStyle: "short" })}</small>
          </div>
        ))}
        {permissions.canAddNote && (
          <Form method="post" style={{ marginTop: 12 }}>
            <input type="hidden" name="intent" value="note" />
            <label className="g-field">
              {t("Nova observação (ex.: todos compareceram, atraso, ocorrência)")}
              <textarea name="text" rows={3} maxLength={1000} required />
            </label>
            <button type="submit" className="g-btn primary" disabled={busy}>{t("Salvar observação")}</button>
          </Form>
        )}
      </div>
    </GuideShell>
  );
}
