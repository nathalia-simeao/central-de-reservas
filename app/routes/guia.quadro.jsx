import { Link, useLoaderData } from "react-router";
import db from "../db.server";
import { GuideShell } from "../components/guide/GuideShell";
import { addDays, buildBoardColumns, initials } from "../utils/agenda-board.js";
import { tourColor } from "../utils/agenda-labels.js";
import { excludeTestBookingsWhere } from "../utils/test-bookings.js";
import { getGuideFromRequest, redirectTo } from "../utils/guide-portal.server";

// Aba Quadro do app: o mesmo quadro da Agenda (uma coluna por dia, um cartão
// por saída), só para consulta. O guia vê a operação inteira, mas sem dados
// de clientes de outras saídas; os cartões dele aparecem destacados e abrem
// a tela da saída.

const DEFAULT_DAYS = 30;
const MAX_DAYS = 430;

function todayKey() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Lisbon" }).format(new Date());
}

export const loader = async ({ request }) => {
  const guide = await getGuideFromRequest(db, request);
  if (!guide) return redirectTo("/guia/login");

  const asked = Number(new URL(request.url).searchParams.get("dias"));
  const DAYS = Number.isFinite(asked) && asked > 0 ? Math.min(Math.round(asked), MAX_DAYS) : DEFAULT_DAYS;
  const start = todayKey();
  const from = new Date(`${start}T00:00:00Z`);
  from.setUTCHours(from.getUTCHours() - 2);
  const to = new Date(`${addDays(start, DAYS)}T02:00:00Z`);

  const [bookings, assignments, departures, settings, tours, supportCards] = await Promise.all([
    db.booking.findMany({
      where: { status: { in: ["CONFIRMED", "PENDING"] }, startTime: { gte: from, lt: to }, AND: [excludeTestBookingsWhere()] },
      select: { tourId: true, startTime: true, status: true, syncStatus: true, attendanceStatus: true, adults: true, children: true, youths: true, seniors: true, totalParticipants: true },
    }),
    db.guideAssignment.findMany({
      where: { status: "ASSIGNED", startTime: { gte: from, lt: to } },
      select: { id: true, tourId: true, guideId: true, startTime: true, status: true, languages: true, guide: { select: { id: true, name: true } }, tour: { select: { id: true, title: true } } },
    }),
    db.tourDeparture.findMany({
      where: { startTime: { gte: from, lt: to } },
      select: { tourId: true, startTime: true, tagIds: true, checkStartAt: true, checkMidAt: true, checkEndAt: true, checklists: true, guideNotes: true },
    }),
    db.businessSetting.findFirst({ select: { agendaLabels: true } }).catch(() => null),
    db.tour.findMany({ select: { id: true, title: true, shopifySnapshot: true } }),
    db.supportCard
      .findMany({
        where: { visibleToGuides: true, dateKey: null },
        orderBy: [{ position: "asc" }, { createdAt: "asc" }],
        select: { id: true, title: true, body: true, attachments: { select: { id: true, fileName: true }, orderBy: { createdAt: "asc" } } },
      })
      .catch(() => []),
  ]);

  const key = (tourId, startTime) => `${tourId}|${new Date(startTime).toISOString()}`;
  const departureTags = {};
  const departureInfo = {};
  for (const d of departures) {
    departureTags[key(d.tourId, d.startTime)] = d.tagIds || [];
    departureInfo[key(d.tourId, d.startTime)] = d;
  }

  const collections = new Map(tours.map((t) => [t.id, (Array.isArray(t.shopifySnapshot?.collections) ? t.shopifySnapshot.collections : []).map((c) => c?.title || c).filter(Boolean)]));
  const columns = buildBoardColumns({ startDateKey: start, days: DAYS, bookings, assignments, departureTags, departureInfo, tours });
  const labels = settings?.agendaLabels || null;

  return {
    days: DAYS,
    maxDays: MAX_DAYS,
    supportCards,
    // Só os dias com saída (como as listas do Trello).
    columns: columns.filter((col) => col.cards.length).map((col) => ({
      dateKey: col.dateKey,
      cards: col.cards.map((card) => {
        const mine = card.guides.find((g) => g.guideId === guide.id);
        return {
          key: card.key,
          title: card.title,
          collection: (collections.get(card.tourId) || []).join(" · "),
          time: card.timeKey,
          pax: card.pax,
          pending: card.pending,
          color: tourColor(labels, card.tourId),
          guides: card.guides.map((g) => ({ name: g.name, initials: initials(g.name) })),
          checks: card.checks,
          myAssignmentId: mine?.assignmentId || null,
        };
      }),
    })),
  };
};

function columnTitle(dateKey) {
  const [y, m, d] = dateKey.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d, 12));
  const weekday = new Intl.DateTimeFormat("pt-PT", { weekday: "short", timeZone: "UTC" }).format(date);
  return `${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")} (${weekday.replace(".", "")})`;
}

function Card({ card }) {
  const body = (
    <>
      <div className="g-bcard__bar" style={{ background: card.color }} />
      <strong>{card.time} · {card.title}</strong>
      {card.collection && <small className="g-bcard__collection">{card.collection}</small>}
      <small>
        {card.pax} pax{card.pending ? ` + ${card.pending} pendente(s)` : ""}
        {card.guides.length ? ` · ${card.guides.map((g) => g.name.split(" ")[0]).join(", ")}` : " · sem guia"}
        {card.checks ? ` · ✓ ${card.checks}/3` : ""}
      </small>
    </>
  );
  return card.myAssignmentId ? (
    <Link to={`/guia/saida/${card.myAssignmentId}`} className="g-bcard mine">{body}</Link>
  ) : (
    <div className="g-bcard">{body}</div>
  );
}

function SupportColumn({ cards }) {
  if (!cards.length) return null;
  return (
    <section className="g-col support" aria-label="Documentos de suporte">
      <h3>Documentos de suporte <small>{cards.length}</small></h3>
      {cards.map((card) => (
        <details key={card.id} className="g-bcard">
          <summary><strong>{card.title}</strong>{card.attachments.length > 0 && <small>📄 {card.attachments.length} arquivo(s)</small>}</summary>
          {card.body && <pre>{card.body}</pre>}
          {card.attachments.map((file) => (
            <a key={file.id} className="g-doc" href={`/suporte/anexo/${file.id}`} target="_blank" rel="noreferrer">📄 {file.fileName}</a>
          ))}
        </details>
      ))}
    </section>
  );
}

export default function GuideBoard() {
  const { columns, supportCards, days, maxDays } = useLoaderData();
  return (
    <GuideShell title="Quadro" wide>
      <div className="g-top">
        <div>
          <h1>Quadro</h1>
          <small>Próximos {days} dias, só os dias com saída · deslize para o lado · seus cartões em verde</small>
        </div>
      </div>
      <div className="g-board">
        <SupportColumn cards={supportCards} />
        {!columns.length && <p className="g-empty">Nenhuma saída nos próximos {days} dias.</p>}
        {columns.map((col) => (
          <section key={col.dateKey} className="g-col" aria-label={columnTitle(col.dateKey)}>
            <h3>{columnTitle(col.dateKey)} <small>{col.cards.length}</small></h3>
            {!col.cards.length && <p className="g-empty" style={{ margin: "0 4px 6px" }}>Sem saídas.</p>}
            {col.cards.map((card) => <Card key={card.key} card={card} />)}
          </section>
        ))}
        {days < maxDays && (
          <div className="g-col more">
            <Link to={`/guia/quadro?dias=${Math.min(days + 60, maxDays)}`} className="g-btn" preventScrollReset>Ver mais 2 meses</Link>
          </div>
        )}
      </div>
    </GuideShell>
  );
}
