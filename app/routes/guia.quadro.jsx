import { Link, useFetcher, useLoaderData } from "react-router";
import db from "../db.server";
import { guideLang } from "../utils/guide-i18n.js";
import { GIcon, GuideShell, useGuideLocale, useT } from "../components/guide/GuideShell";
import { addDays, buildBoardColumns, cardCompletion, cardOwnerKey, initials, listsForCard } from "../utils/agenda-board.js";
import { cardLanguages, normalizeChecklists } from "../utils/departure-checklists.js";
import { langColor } from "../utils/language-colors.js";
import { tourColor } from "../utils/agenda-labels.js";
import { excludeTestBookingsWhere } from "../utils/test-bookings.js";
import { ensureDeparture, getGuideFromRequest, redirectTo } from "../utils/guide-portal.server";
import { departureTargetKey, logActivity } from "../services/board-activity.server.js";
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

// Admin marca/reabre o cartão como finalizado direto no Quadro (13/11/2026), sem abrir o cartão.
export const action = async ({ request }) => {
  const guide = await getGuideFromRequest(db, request);
  if (!guide) throw redirectTo("/guia/login");
  if (!(await isPortalAdmin(guide))) return { error: "Só a gestão pode finalizar cartões." };
  const form = await request.formData();
  if (String(form.get("intent") || "") !== "complete") return { error: "Ação desconhecida." };
  const uid = String(form.get("uid") || "");
  const [tourId, iso] = uid.split("#")[0].split("|");
  const startTime = new Date(iso);
  if (!tourId || Number.isNaN(startTime.getTime())) return { error: "Cartão inválido." };
  const owner = cardOwnerKey({ uid });
  const done = String(form.get("done") || "true") === "true";
  const departure = await ensureDeparture(db, tourId, startTime);
  const current = await db.tourDeparture.findUnique({ where: { id: departure.id }, select: { completed: true } });
  const completed = { ...((current?.completed && typeof current.completed === "object") ? current.completed : {}) };
  if (done) completed[owner] = { at: new Date().toISOString(), by: guide.name };
  else completed[owner] = { open: true, at: new Date().toISOString(), by: guide.name };
  await db.tourDeparture.update({ where: { id: departure.id }, data: { completed } });
  await logActivity(db, { targetType: "departure", targetKey: departureTargetKey(tourId, startTime), text: done ? "marcou este cartão como finalizado (pelo app)" : "reabriu este cartão (pelo app)", actor: { name: guide.name, personId: guide.id } });
  return { ok: true };
};

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
      select: { id: true, tourId: true, guideId: true, startTime: true, status: true, languages: true, guide: { select: { id: true, name: true, photoUrl: true, portalPhotoType: true, updatedAt: true } }, tour: { select: { id: true, title: true } } },
    }),
    db.tourDeparture.findMany({
      where: { startTime: { gte: from, lt: to } },
      select: { tourId: true, startTime: true, tagIds: true, checkStartAt: true, checkMidAt: true, checkEndAt: true, checklists: true, guideNotes: true, archivedAt: true, completed: true },
    }),
    db.businessSetting.findFirst({ select: { agendaLabels: true } }).catch(() => null),
    db.tour.findMany({ select: { id: true, title: true, shopifySnapshot: true, translations: true } }),
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
    .map((col) => ({ ...col, cards: col.cards.filter((c) => !departureInfo[c.key]?.archivedAt && (seesAll || c.guides.some((g) => g.guideId === guide.id))) }))
    // Título do passeio no idioma do app (como no site).
    .map((col) => ({ ...col, cards: col.cards.map((c) => ({ ...c, title: tours.find((t) => t.id === c.tourId)?.translations?.[guideLang(guide.portalLanguage)]?.title || c.title })) }));
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
          uid: card.uid || card.key,
          // Idiomas do tour (reservas, guias escalados e títulos do Trello), como no Quadro da Central.
          langs: (() => {
            const state = normalizeChecklists(departureInfo[card.key]?.checklists);
            return cardLanguages(card, { ...state, lists: listsForCard(state.lists, card) });
          })(),
          title: card.title,
          collection: (collections.get(card.tourId) || []).join(" · "),
          time: card.timeKey,
          pax: card.pax,
          pending: card.pending,
          color: tourColor(labels, card.tourId),
          // Foto do guia: a do app (Perfil) ou a da Equipe.
          guides: card.guides.map((g) => {
            const person = assignments.find((a) => a.guideId === g.guideId)?.guide;
            const photo = person?.portalPhotoType ? `/guia/foto/${person.id}?v=${new Date(person.updatedAt || 0).getTime()}` : person?.photoUrl || null;
            return { name: g.name, initials: initials(g.name), photo };
          }),
          checks: card.checks,
          complete: Boolean(cardCompletion(departureInfo[card.key], card)),
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

function CompleteDot({ card }) {
  const t = useT();
  const fetcher = useFetcher();
  const on = fetcher.state !== "idle" ? fetcher.formData?.get("done") === "true" : card.complete;
  return (
    <fetcher.Form method="post" className="g-complete-dot">
      <input type="hidden" name="intent" value="complete" />
      <input type="hidden" name="uid" value={card.uid || card.key} />
      <input type="hidden" name="done" value={on ? "false" : "true"} />
      <button type="submit" className={`g-complete-toggle${on ? " is-on" : ""}`} aria-pressed={on}
        aria-label={on ? t("Finalizado") : t("Marcar como finalizado")} title={on ? t("Finalizado") : t("Marcar como finalizado")}>
        <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 8.4l2.6 2.5L12 5.5" /></svg>
      </button>
    </fetcher.Form>
  );
}

function Card({ card, canEdit = false }) {
  const t = useT();
  const href = `/guia/cartao?k=${encodeURIComponent(card.uid || card.key)}`;
  const rest = (
    <>
      {card.collection && <small className="g-bcard__collection">{card.collection}</small>}
      {card.langs?.length > 0 && (
        <span className="g-bcard__langs" aria-label={t("Idioma")}>
          {card.langs.map((k) => <span key={k} className="g-lang" style={{ background: langColor(k), borderColor: langColor(k) }}>{k.toUpperCase()}</span>)}
        </span>
      )}
      <span className="g-bcard__foot">
        <small>{card.pax} pax{card.pending ? ` + ${card.pending} ${t("pendente(s)")}` : ""}{card.guides.length ? "" : ` · ${t("sem guia")}`}</small>
        {card.guides.length > 0 && (
          <span className="g-bcard__guides">
            {card.guides.map((g) => (
              <span key={g.name} className="g-bcard__guide" title={g.name}>
                {g.photo ? <img src={g.photo} alt="" loading="lazy" /> : <span className="g-bcard__initials">{g.initials}</span>}
                <span>{g.name.split(" ")[0]}</span>
              </span>
            ))}
          </span>
        )}
      </span>
    </>
  );
  // Administradores: o cartão todo abre o editor (link "esticado"), e a bolinha
  // antes do título finaliza/reabre o cartão sem abrir (como no Trello).
  if (canEdit) {
    return (
      <div className={`g-bcard g-bcard--edit g-bcard--stretch${card.myAssignmentId ? " mine" : ""}`}>
        <div className="g-bcard__bar" style={{ background: card.color }} />
        <strong className="g-bcard__title">
          <CompleteDot card={card} />
          <Link to={href} className="g-bcard__stretch" aria-label={`${t("Abrir para editar")}: ${card.time} ${card.title}`}>{card.time} · {card.title}</Link>
        </strong>
        {rest}
        <span className="g-bcard__edit"><GIcon name="edit" /> {t("Abrir para editar")}</span>
      </div>
    );
  }
  const body = (
    <>
      <div className="g-bcard__bar" style={{ background: card.color }} />
      <strong className="g-bcard__title">
        {card.complete && <span className="g-complete" role="img" aria-label={t("Finalizado")} title={t("Finalizado")}><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 8.4l2.6 2.5L12 5.5" /></svg></span>}
        <span>{card.time} · {card.title}</span>
      </strong>
      {rest}
    </>
  );
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
            {col.cards.map((card) => <Card key={card.uid || card.key} card={card} canEdit={seesAll} />)}
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
