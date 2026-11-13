import { excludeTestBookingsWhere } from "../utils/test-bookings.js";
import { Form, Link, data, useLoaderData } from "react-router";
import db from "../db.server";
import { isPortalAdmin } from "../utils/central-auth.server";
import { GIcon, GuideShell, lisbonParts, useGuideLocale, useT } from "../components/guide/GuideShell";
import { bookingPax, bookingsForGuideLanguages, getGuideFromRequest, redirectTo, sessionCookie, sessionTokenFromRequest } from "../utils/guide-portal.server";

export const loader = async ({ request }) => {
  const guide = await getGuideFromRequest(db, request);
  if (!guide) return redirectTo("/guia/login");

  const from = new Date(Date.now() - 18 * 3600 * 1000);
  const to = new Date(Date.now() + 30 * 24 * 3600 * 1000);
  const token = sessionTokenFromRequest(request);
  const cookie = token ? { headers: { "Set-Cookie": sessionCookie(token) } } : undefined;

  // Administradores acompanham TODAS as saídas, escalados ou não (pedido do Renan, 13/11/2026).
  if (await isPortalAdmin(guide)) {
    const items = await allDepartures({ guide, from, to });
    const mentions = await loadMentions(guide);
    return data({ guide: { name: guide.name }, items, mentions, admin: true }, cookie);
  }
  const assignments = await db.guideAssignment.findMany({
    where: { guideId: guide.id, status: "ASSIGNED", startTime: { gte: from, lte: to } },
    include: { tour: { select: { id: true, title: true } } },
    orderBy: { startTime: "asc" },
    take: 120,
  });

  const tourIds = [...new Set(assignments.map((a) => a.tourId))];
  const [bookings, departures] = tourIds.length
    ? await Promise.all([
        db.booking.findMany({
          where: { tourId: { in: tourIds }, status: { in: ["CONFIRMED", "PENDING"] }, startTime: { gte: from, lte: to }, AND: [excludeTestBookingsWhere()] },
          select: { tourId: true, startTime: true, adults: true, children: true, youths: true, seniors: true, totalParticipants: true, language: true, groupGuideId: true },
        }),
        db.tourDeparture.findMany({
          where: { tourId: { in: tourIds }, startTime: { gte: from, lte: to } },
          select: { tourId: true, startTime: true, checkStartAt: true, checkEndAt: true },
        }),
      ])
    : [[], []];

  const near = (a, b) => Math.abs(new Date(a).getTime() - new Date(b).getTime()) <= 60 * 1000;
  const items = assignments.map((a) => {
    const list = bookingsForGuideLanguages(
      bookings.filter((b) => b.tourId === a.tourId && near(b.startTime, a.startTime)),
      a.languages,
      a.guideId,
    );
    const dep = departures.find((d) => d.tourId === a.tourId && near(d.startTime, a.startTime));
    return {
      id: a.id,
      title: a.tour?.title || "Passeio",
      startTime: a.startTime.toISOString(),
      bookings: list.length,
      pax: list.reduce((sum, b) => sum + bookingPax(b), 0),
      languages: [...new Set(list.map((b) => b.language).filter(Boolean))],
      status: dep?.checkEndAt ? "done" : dep?.checkStartAt ? "running" : "todo",
    };
  });

  // Regrava o cookie com Path=/ para quem entrou antes da correção da setinha de voltar.
  const mentions = await loadMentions(guide);
  return data({ guide: { name: guide.name }, items: items.map((i) => ({ ...i, href: `/guia/saida/${i.id}` })), mentions, admin: false }, cookie);
};

// Comentários do Quadro em que marcaram este guia e que ele ainda não viu.
async function loadMentions(guide) {
  const rows = await db.boardActivity
    .findMany({ where: { mentionIds: { has: guide.id }, NOT: { readBy: { has: guide.id } } }, orderBy: { createdAt: "desc" }, take: 10 })
    .catch(() => []);
  return rows.map((m) => ({ id: m.id, text: m.text, authorName: m.authorName, createdAt: m.createdAt.toISOString() }));
}

const minuteKey = (tourId, value) => `${tourId}|${Math.round(new Date(value).getTime() / 60000)}`;

/** Todas as saídas da janela: as que têm reserva e as que têm guia escalado. */
async function allDepartures({ guide, from, to }) {
  const [assignments, bookings] = await Promise.all([
    db.guideAssignment.findMany({
      where: { status: "ASSIGNED", startTime: { gte: from, lte: to } },
      select: { id: true, tourId: true, startTime: true, guideId: true, guide: { select: { name: true } }, tour: { select: { title: true } } },
      orderBy: { startTime: "asc" },
      take: 600,
    }),
    db.booking.findMany({
      where: { status: { in: ["CONFIRMED", "PENDING"] }, startTime: { gte: from, lte: to }, AND: [excludeTestBookingsWhere()] },
      select: { tourId: true, startTime: true, adults: true, children: true, youths: true, seniors: true, totalParticipants: true, language: true, tour: { select: { title: true } } },
      take: 3000,
    }),
  ]);
  const map = new Map();
  const entry = (tourId, startTime, title) => {
    const key = minuteKey(tourId, startTime);
    if (!map.has(key)) map.set(key, { key, tourId, startTime: new Date(startTime).toISOString(), title: title || "Passeio", bookings: 0, pax: 0, languages: new Set(), guides: [], mineId: null, anyId: null });
    return map.get(key);
  };
  for (const b of bookings) {
    const e = entry(b.tourId, b.startTime, b.tour?.title);
    e.bookings += 1;
    e.pax += bookingPax(b);
    if (b.language) e.languages.add(b.language);
  }
  for (const a of assignments) {
    const e = entry(a.tourId, a.startTime, a.tour?.title);
    if (a.guide?.name && !e.guides.includes(a.guide.name)) e.guides.push(a.guide.name);
    if (a.guideId === guide.id) e.mineId = a.id;
    if (!e.anyId) e.anyId = a.id;
  }
  const list = [...map.values()].sort((x, y) => x.startTime.localeCompare(y.startTime));
  const tourIds = [...new Set(list.map((e) => e.tourId))];
  const departures = tourIds.length
    ? await db.tourDeparture.findMany({ where: { tourId: { in: tourIds }, startTime: { gte: from, lte: to } }, select: { tourId: true, startTime: true, checkStartAt: true, checkEndAt: true, archivedAt: true } })
    : [];
  const depByKey = new Map(departures.map((d) => [minuteKey(d.tourId, d.startTime), d]));
  return list
    .filter((e) => !depByKey.get(e.key)?.archivedAt)
    .map((e) => {
      const dep = depByKey.get(e.key);
      const dateKey = e.startTime.slice(0, 10);
      const cardKey = `${e.tourId}|${e.startTime}`;
      return {
        id: e.key,
        title: e.title,
        startTime: e.startTime,
        bookings: e.bookings,
        pax: e.pax,
        languages: [...e.languages],
        guides: e.guides,
        mine: Boolean(e.mineId),
        // Com guia: abre a saída no app (a dele ou a de quem está escalado). Sem guia: o cartão no Quadro da Central.
        href: e.mineId || e.anyId ? `/guia/saida/${e.mineId || e.anyId}` : `/?tab=quadro&de=quadro&dia=${dateKey}&cartao=${encodeURIComponent(cardKey)}`,
        external: !(e.mineId || e.anyId),
        status: dep?.checkEndAt ? "done" : dep?.checkStartAt ? "running" : "todo",
      };
    });
}

export const action = async ({ request }) => {
  const guide = await getGuideFromRequest(db, request);
  if (!guide) return redirectTo("/guia/login");
  const form = await request.formData();
  if (form.get("intent") === "mentionsRead") {
    const ids = String(form.get("ids") || "").split(",").filter(Boolean).slice(0, 50);
    const rows = await db.boardActivity.findMany({ where: { id: { in: ids }, mentionIds: { has: guide.id } }, select: { id: true, readBy: true } });
    for (const r of rows) if (!r.readBy.includes(guide.id)) await db.boardActivity.update({ where: { id: r.id }, data: { readBy: { push: guide.id } } });
  }
  return { ok: true };
};

export default function GuideHome() {
  const { guide, items, mentions = [], admin = false } = useLoaderData();
  const t = useT();
  const locale = useGuideLocale();
  const groups = [];
  for (const item of items) {
    const parts = lisbonParts(item.startTime, locale);
    const last = groups[groups.length - 1];
    if (last?.dayKey === parts.dayKey) last.items.push({ ...item, parts });
    else groups.push({ dayKey: parts.dayKey, day: parts.day, items: [{ ...item, parts }] });
  }
  const today = lisbonParts(Date.now()).dayKey;

  return (
    <GuideShell title={t("Minhas saídas")}>
      <div className="g-top">
        <div>
          <h1>{t("Olá, {name}", { name: guide.name?.split(" ")[0] || t("guia") })}</h1>
          <small>{admin ? t("Todas as saídas dos próximos 30 dias (você é administrador)") : t("Suas saídas dos próximos 30 dias")}</small>
        </div>
        <Form method="post" action="/guia/sair">
          <button type="submit" className="g-link" style={{ background: "none", border: 0, cursor: "pointer" }}>{t("Sair")}</button>
        </Form>
      </div>

      {mentions.length > 0 && (
        <div className="g-card g-mentions">
          <h2><GIcon name="chat" /> {t("Marcaram você")} ({mentions.length})</h2>
          {mentions.map((m) => (
            <p key={m.id}><b>{m.authorName || t("Equipe")}</b>: {m.text}<br /><small>{lisbonParts(m.createdAt, locale).day} · {lisbonParts(m.createdAt, locale).time}</small></p>
          ))}
          <Form method="post">
            <input type="hidden" name="intent" value="mentionsRead" />
            <input type="hidden" name="ids" value={mentions.map((m) => m.id).join(",")} />
            <button type="submit" className="g-btn" style={{ width: "100%" }}>{t("OK, vi")}</button>
          </Form>
        </div>
      )}

      <div className="g-row" style={{ marginBottom: 12 }}>
        <Link to="/guia/vender" className="g-btn primary" style={{ flex: "1 1 200px" }}><GIcon name="card" /> {t("Vender · gerar link")}</Link>
      </div>

      {!groups.length && (
        <div className="g-card">
          <p className="g-empty">{t("Nenhuma saída escalada para você. Quando a gestão te escalar na Agenda, ela aparece aqui.")}</p>
        </div>
      )}

      {groups.map((group) => (
        <section key={group.dayKey}>
          <div className="g-day">{group.dayKey === today ? `${t("Hoje")} · ` : ""}{group.day}</div>
          {group.items.map((item) => {
            const inner = (
              <>
                <span className="g-dep__time">{item.parts.time}</span>
                <span className="g-dep__main">
                  <strong>{item.title}</strong>
                  <span>{item.pax} pax · {item.bookings} {t("reserva(s)")}{item.languages.length ? ` · ${item.languages.join(", ")}` : ""}</span>
                  {admin && (
                    <span className="g-dep__guides">
                      {item.guides?.length ? item.guides.join(", ") : <span className="g-pill wait">{t("Sem guia")}</span>}
                      {item.mine && <span className="g-pill ok">{t("Você é o guia")}</span>}
                    </span>
                  )}
                </span>
                {item.status === "done" && <span className="g-pill ok">{t("Concluída")}</span>}
                {item.status === "running" && <span className="g-pill wait">{t("Em andamento")}</span>}
              </>
            );
            return item.external
              ? <a key={item.id} href={item.href} className="g-card g-dep" style={{ display: "flex" }}>{inner}</a>
              : <Link key={item.id} to={item.href} className="g-card g-dep" style={{ display: "flex" }}>{inner}</Link>;
          })}
        </section>
      ))}
    </GuideShell>
  );
}
