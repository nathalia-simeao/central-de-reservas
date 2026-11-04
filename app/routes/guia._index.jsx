import { Form, Link, useLoaderData } from "react-router";
import db from "../db.server";
import { GuideShell, lisbonParts } from "../components/guide/GuideShell";
import { bookingPax, bookingsForGuideLanguages, getGuideFromRequest, redirectTo } from "../utils/guide-portal.server";

export const loader = async ({ request }) => {
  const guide = await getGuideFromRequest(db, request);
  if (!guide) return redirectTo("/guia/login");

  const from = new Date(Date.now() - 18 * 3600 * 1000);
  const to = new Date(Date.now() + 30 * 24 * 3600 * 1000);
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
          where: { tourId: { in: tourIds }, status: { in: ["CONFIRMED", "PENDING"] }, startTime: { gte: from, lte: to } },
          select: { tourId: true, startTime: true, adults: true, children: true, youths: true, seniors: true, totalParticipants: true, language: true },
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

  return { guide: { name: guide.name }, items };
};

export default function GuideHome() {
  const { guide, items } = useLoaderData();
  const groups = [];
  for (const item of items) {
    const parts = lisbonParts(item.startTime);
    const last = groups[groups.length - 1];
    if (last?.dayKey === parts.dayKey) last.items.push({ ...item, parts });
    else groups.push({ dayKey: parts.dayKey, day: parts.day, items: [{ ...item, parts }] });
  }
  const today = lisbonParts(Date.now()).dayKey;

  return (
    <GuideShell title="Minhas saídas">
      <div className="g-top">
        <div>
          <h1>Olá, {guide.name?.split(" ")[0] || "guia"}</h1>
          <small>Suas saídas dos próximos 30 dias</small>
        </div>
        <Form method="post" action="/guia/sair">
          <button type="submit" className="g-link" style={{ background: "none", border: 0, cursor: "pointer" }}>Sair</button>
        </Form>
      </div>

      {!groups.length && (
        <div className="g-card">
          <p className="g-empty">Nenhuma saída escalada para você. Quando a gestão te escalar na Agenda, ela aparece aqui.</p>
        </div>
      )}

      {groups.map((group) => (
        <section key={group.dayKey}>
          <div className="g-day">{group.dayKey === today ? "Hoje · " : ""}{group.day}</div>
          {group.items.map((item) => (
            <Link key={item.id} to={`/guia/saida/${item.id}`} className="g-card g-dep" style={{ display: "flex" }}>
              <span className="g-dep__time">{item.parts.time}</span>
              <span className="g-dep__main">
                <strong>{item.title}</strong>
                <span>{item.pax} pax · {item.bookings} reserva(s){item.languages.length ? ` · ${item.languages.join(", ")}` : ""}</span>
              </span>
              {item.status === "done" && <span className="g-pill ok">Concluída</span>}
              {item.status === "running" && <span className="g-pill wait">Em andamento</span>}
            </Link>
          ))}
        </section>
      ))}
    </GuideShell>
  );
}
