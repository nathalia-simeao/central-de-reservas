import { Link, useLoaderData } from "react-router";
import db from "../db.server";
import { GIcon, GuideShell, useGuideLocale, useT } from "../components/guide/GuideShell";
import { addDays, buildBoardColumns, initials } from "../utils/agenda-board.js";
import { tourColor } from "../utils/agenda-labels.js";
import { excludeTestBookingsWhere } from "../utils/test-bookings.js";
import { getGuideFromRequest, redirectTo } from "../utils/guide-portal.server";
import { isPortalAdmin } from "../utils/central-auth.server";

// Aba Quadro do app: o mesmo quadro da Agenda (uma coluna por dia, um cartão
// por saída), só para consulta. O guia vê só as saídas em que está escalado
// (pedido do Renan, 12/11: nada de ver os passeios e ingressos dos colegas);
// administradores veem a operação inteira.

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
      select: { tourId: true, startTime: true, tagIds: true, checkStartAt: true, checkMidAt: true, checkEndAt: true, checklists: true, guideNotes: true, archivedAt: true },
    }),
    db.businessSetting.findFirst({ select: { agendaLabels: true } }).catch(() => null),
    db.tour.findMany({ select: { id: true, title: true, shopifySnapshot: true } }),
    db.supportCard
      .findMany({
        where: { visibleToGuides: true, dateKey: null, archivedAt: null },
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
  // Cartões arquivados na Central não aparecem para os guias.
  const seesAll = await isPortalAdmin(guide);
  const columns = buildBoardColumns({ startDateKey: start, days: DAYS, bookings, assignments, departureTags, departureInfo, tours })
    .map((col) => ({ ...col, cards: col.cards.filter((c) => !departureInfo[c.key]?.archivedAt && (seesAll || c.guides.some((g) => g.guideId === guide.id))) }));
  const labels = settings?.agendaLabels || null;

  return {
    days: DAYS,
    maxDays: MAX_DAYS,
    seesAll,
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

function columnTitle(dateKey, locale = "pt-PT") {
  const [y, m, d] = dateKey.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d, 12));
  const weekday = new Intl.DateTimeFormat(locale, { weekday: "short", timeZone: "UTC" }).format(date);
  return `${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")} (${weekday.replace(".", "")})`;
}

function Card({ card, dateKey, canEdit = false }) {
  const t = useT();
  const body = (
    <>
      <div className="g-bcard__bar" style={{ background: card.color }} />
      <strong>{card.time} · {card.title}</strong>
      {card.collection && <small className="g-bcard__collection">{card.collection}</small>}
      <small>
        {card.pax} pax{card.pending ? ` + ${card.pending} ${t("pendente(s)")}` : ""}
        {card.guides.length ? ` · ${card.guides.map((g) => g.name.split(" ")[0]).join(", ")}` : ` · ${t("sem guia")}`}
        
      </small>
    </>
  );
  // Administradores editam tudo: o cartão abre o mesmo cartão no Quadro da
  // Central (guias, checklists, mover data…), que é outra tela (fora do /guia).
  if (canEdit) {
    const href = `/?tab=quadro&de=quadro&dia=${dateKey}&cartao=${encodeURIComponent(card.uid || card.key)}`;
    return (
      <a href={href} className={`g-bcard g-bcard--edit${card.myAssignmentId ? " mine" : ""}`} aria-label={`${t("Abrir para editar")}: ${card.time} ${card.title}`}>
        {body}
        <span className="g-bcard__edit"><GIcon name="edit" /> {t("Abrir para editar")}</span>
      </a>
    );
  }
  return card.myAssignmentId ? (
    <Link to={`/guia/saida/${card.myAssignmentId}`} className="g-bcard mine">{body}</Link>
  ) : (
    <div className="g-bcard">{body}</div>
  );
}

function SupportColumn({ cards }) {
  const t = useT();
  if (!cards.length) return null;
  return (
    <section className="g-col support" aria-label={t("Documentos de suporte")}>
      <h3>{t("Documentos de suporte")} <small>{cards.length}</small></h3>
      {cards.map((card) => (
        <details key={card.id} className="g-bcard">
          <summary><strong>{card.title}</strong>{card.attachments.length > 0 && <small><GIcon name="file" /> {card.attachments.length} {t("arquivo(s)")}</small>}</summary>
          {card.body && <pre>{card.body}</pre>}
          {card.attachments.map((file) => (
            <a key={file.id} className="g-doc" href={`/suporte/anexo/${file.id}`} target="_blank" rel="noreferrer"><GIcon name="file" /> {file.fileName}</a>
          ))}
        </details>
      ))}
    </section>
  );
}

export default function GuideBoard() {
  const { columns, supportCards, days, maxDays, seesAll } = useLoaderData();
  const t = useT();
  const locale = useGuideLocale();
  return (
    <GuideShell title={t("Quadro")} wide>
      <div className="g-top">
        <div>
          <h1>{t("Quadro")}</h1>
          <small>{seesAll
            ? t("Próximos {n} dias, todas as saídas · toque num cartão para editar", { n: days })
            : t("Próximos {n} dias · só as saídas em que você está escalado", { n: days })}</small>
        </div>
      </div>
      <div className="g-board">
        <SupportColumn cards={supportCards} />
        {!columns.length && <p className="g-empty">{seesAll ? t("Nenhuma saída nos próximos {n} dias.", { n: days }) : t("Você não está escalado em nenhuma saída nos próximos {n} dias.", { n: days })}</p>}
        {columns.map((col) => (
          <section key={col.dateKey} className="g-col" aria-label={columnTitle(col.dateKey, locale)}>
            <h3>{columnTitle(col.dateKey, locale)} <small>{col.cards.length}</small></h3>
            {!col.cards.length && <p className="g-empty" style={{ margin: "0 4px 6px" }}>{t("Sem saídas.")}</p>}
            {col.cards.map((card) => <Card key={card.uid || card.key} card={card} dateKey={col.dateKey} canEdit={seesAll} />)}
          </section>
        ))}
        {days < maxDays && (
          <div className="g-col more">
            <Link to={`/guia/quadro?dias=${Math.min(days + 60, maxDays)}`} className="g-btn" preventScrollReset>{t("Ver mais 2 meses")}</Link>
          </div>
        )}
      </div>
    </GuideShell>
  );
}
