import { excludeTestBookingsWhere } from "../utils/test-bookings.js";
import { Form, Link, useActionData, useLoaderData, useNavigation } from "react-router";
import db from "../db.server";
import { GuideShell, PLATFORM_NAMES, lisbonParts } from "../components/guide/GuideShell";
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
  const assignment = await loadGuideAssignment(db, guide, params.id);
  if (!assignment) throw redirectTo("/guia");
  return { guide, assignment };
}

export const loader = async ({ request, params }) => {
  const { guide, assignment } = await load(request, params);
  const [bookings, departure] = await Promise.all([
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
  ]);

  const groupBookings = bookingsForGuideLanguages(bookings, assignment.languages, assignment.guideId);
  return {
    guide: { name: guide.name },
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
  const { guide, assignment } = await load(request, params);
  const form = await request.formData();
  const intent = String(form.get("intent") || "");
  const existing = await db.tourDeparture.findUnique({
    where: { tourId_startTime: { tourId: assignment.tourId, startTime: assignment.startTime } },
  });
  const perms = guidePermissions(existing, assignment.startTime);
  const by = `guide:${guide.id}`;

  if (intent.startsWith("check:")) {
    const step = intent.slice(6);
    const field = CHECK_FIELDS[step];
    const allowed = { start: perms.canCheckStart, mid: perms.canCheckMid, end: perms.canCheckEnd }[step];
    if (!field || !allowed) return { error: "Esse check não está disponível agora." };
    const departure = existing || (await ensureDeparture(db, assignment.tourId, assignment.startTime));
    await db.tourDeparture.update({ where: { id: departure.id }, data: { [field]: new Date(), checkedBy: by } });
    return { ok: step === "start" ? "Início registrado." : step === "mid" ? "Meio registrado." : "Fim registrado. Bom trabalho!" };
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
    if (!booking || !bookingsForGuideLanguages([booking], assignment.languages, assignment.guideId).length) {
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
    if (!booking || !bookingsForGuideLanguages([booking], assignment.languages, assignment.guideId).length) {
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

function fmtTime(value) {
  return value ? lisbonParts(value).time : "";
}

function paxDetail(b) {
  return [
    [b.adults, "adulto", "adultos"], [b.children, "criança", "crianças"],
    [b.youths, "jovem", "jovens"], [b.seniors, "sênior", "seniores"],
  ].filter(([n]) => Number(n) > 0).map(([n, one, many]) => `${n} ${Number(n) === 1 ? one : many}`).join(", ");
}

export default function GuideDeparture() {
  const { departure, permissions, bookings } = useLoaderData();
  const result = useActionData();
  const navigation = useNavigation();
  const busy = navigation.state !== "idle";
  const parts = lisbonParts(departure.startTime);
  const totalPax = bookings.reduce((sum, b) => sum + b.pax, 0);
  const present = bookings.filter((b) => b.attendanceStatus === "COMPLETED").reduce((s, b) => s + b.pax, 0);
  const noShow = bookings.filter((b) => b.attendanceStatus === "NO_SHOW").reduce((s, b) => s + b.pax, 0);

  const checks = [
    { key: "start", label: "Início", at: departure.checkStartAt, can: permissions.canCheckStart },
    { key: "mid", label: "Meio", at: departure.checkMidAt, can: permissions.canCheckMid },
    { key: "end", label: "Fim", at: departure.checkEndAt, can: permissions.canCheckEnd },
  ];

  return (
    <GuideShell title={departure.title}>
      <div className="g-top">
        <Link to="/guia" className="g-link">← Minhas saídas</Link>
      </div>

      <div className="g-card">
        <h2 style={{ fontSize: 18 }}>{departure.title}</h2>
        <div className="g-summary">
          <span><b>{parts.time}</b> · {parts.day}</span>
          <span><b>{totalPax}</b> pax · {bookings.length} reserva(s)</span>
          {departure.languages.length > 0 && <span>Seu grupo: <b>{departure.languages.map((k) => LANGUAGE_NAMES[k] || k).join(", ")}</b></span>}
          <span>Presentes <b>{present}</b> · No-show <b>{noShow}</b></span>
        </div>
      </div>

      {result?.error && <div className="g-error" role="alert">{result.error}</div>}
      {result?.ok && <div className="g-ok" role="status">{result.ok}</div>}

      <div className="g-card">
        <h2>Checklist</h2>
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
              <small>{c.at ? fmtTime(c.at) : c.can ? "toque para marcar" : "—"}</small>
            </button>
          ))}
        </Form>
      </div>

      <div className="g-card">
        <h2>Clientes</h2>
        {!bookings.length && <p className="g-empty">Nenhuma reserva nesta saída.</p>}
        {bookings.map((b) => (
          <div key={b.id} className="g-guest">
            <div className="g-guest__head">
              <strong>{b.customerName || "Sem nome"}</strong>
              {b.attendanceStatus === "COMPLETED" && <span className="g-pill ok">Presente</span>}
              {b.attendanceStatus === "NO_SHOW" && <span className="g-pill no">No-show</span>}
              {b.status === "PENDING" && <span className="g-pill wait">Pendente</span>}
            </div>
            <div className="g-guest__meta">
              {b.pax} pax{paxDetail(b) ? ` (${paxDetail(b)})` : ""} · {b.language || "idioma não informado"} · {PLATFORM_NAMES[b.platform] || b.platform}
              {b.bookingRef ? ` · ${b.bookingRef}` : ""}
            </div>
            {b.pax > 0 && (
              <details className="g-participants">
                <summary>Participantes ({b.participants.length}/{b.pax}) · opcional</summary>
                <Form method="post">
                  <input type="hidden" name="intent" value="participants" />
                  <input type="hidden" name="bookingId" value={b.id} />
                  {Array.from({ length: Math.min(b.pax, 30) }).map((_, i) => (
                    <div key={i} className="g-participant">
                      <input name={`name_${i}`} defaultValue={b.participants[i]?.name || ""} placeholder={`Nome ${i + 1}`} aria-label={`Nome do participante ${i + 1}`} disabled={!permissions.canMarkAttendance} autoComplete="off" />
                      <input name={`country_${i}`} defaultValue={b.participants[i]?.country || ""} placeholder="País" aria-label={`País do participante ${i + 1}`} disabled={!permissions.canMarkAttendance} autoComplete="off" />
                    </div>
                  ))}
                  {permissions.canMarkAttendance && <button type="submit" className="g-btn" disabled={busy}>Salvar participantes</button>}
                </Form>
              </details>
            )}
            <div className="g-row">
              {b.wa && <a className="g-btn" href={b.wa} target="_blank" rel="noreferrer">💬 WhatsApp</a>}
              {b.tel && <a className="g-btn" href={`tel:${b.tel}`}>📞 Ligar</a>}
              {b.status === "CONFIRMED" && (
                <Form method="post" className="g-row">
                  <input type="hidden" name="intent" value="attendance" />
                  <input type="hidden" name="bookingId" value={b.id} />
                  <button type="submit" name="value" value="COMPLETED" className={`g-btn ${b.attendanceStatus === "COMPLETED" ? "on" : ""}`} disabled={busy || !permissions.canMarkAttendance}>Presente</button>
                  <button type="submit" name="value" value="NO_SHOW" className={`g-btn ${b.attendanceStatus === "NO_SHOW" ? "on-no" : ""}`} disabled={busy || !permissions.canMarkAttendance}>No-show</button>
                </Form>
              )}
            </div>
          </div>
        ))}
        {!permissions.canMarkAttendance && bookings.length > 0 && (
          <p className="g-empty" style={{ marginTop: 10 }}>
            {departure.checkEndAt ? "Saída encerrada: a presença não pode mais ser alterada." : "A presença abre 3 horas antes do passeio."}
          </p>
        )}
      </div>

      <div className="g-card">
        <h2>Ingressos e arquivos</h2>
        {!departure.attachments.length && <p className="g-empty">Nenhum arquivo anexado pela gestão.</p>}
        {departure.attachments.map((file) => (
          <a key={file.id} className="g-file" href={`/guia/anexo/${file.id}`} target="_blank" rel="noreferrer">
            <span>📎 {file.fileName}</span>
            <small style={{ color: "var(--g-muted)" }}>{Math.max(1, Math.round(file.size / 1024))} KB</small>
          </a>
        ))}
      </div>

      <div className="g-card">
        <h2>Observações</h2>
        {!departure.notes.length && <p className="g-empty">Nenhuma observação ainda.</p>}
        {departure.notes.map((note, index) => (
          <div key={index} className="g-note">
            {note.text}
            <small>{note.by} · {new Date(note.at).toLocaleString("pt-PT", { timeZone: "Europe/Lisbon", dateStyle: "short", timeStyle: "short" })}</small>
          </div>
        ))}
        {permissions.canAddNote && (
          <Form method="post" style={{ marginTop: 12 }}>
            <input type="hidden" name="intent" value="note" />
            <label className="g-field">
              Nova observação (ex.: todos compareceram, atraso, ocorrência)
              <textarea name="text" rows={3} maxLength={1000} required />
            </label>
            <button type="submit" className="g-btn primary" disabled={busy}>Salvar observação</button>
          </Form>
        )}
      </div>
    </GuideShell>
  );
}
