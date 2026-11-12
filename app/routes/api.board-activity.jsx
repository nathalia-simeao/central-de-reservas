import { data } from "react-router";
import db from "../db.server";
import { authenticateCentral } from "../utils/central-auth.server";
import { isAdmin, resolveCentralUser } from "../utils/central-access.server.js";
import { actorFor, logActivity } from "../services/board-activity.server.js";

// Comentários e atividade de um cartão do Quadro + menções da pessoa logada.
const json = (body, init) => data(body, init);
const TYPES = new Set(["departure", "card"]);
const fmtDay = (d) => new Intl.DateTimeFormat("pt-PT", { timeZone: "Europe/Lisbon", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }).format(d);

async function who(request) {
  const auth = await authenticateCentral(request);
  const user = await resolveCentralUser(db, auth);
  return { user, actor: await actorFor(db, user) };
}

/** "Belém Walking Tour · 12/11 14:00" ou o título da demanda. */
async function targetLabels(rows) {
  const labels = new Map();
  const cardIds = [...new Set(rows.filter((r) => r.targetType === "card").map((r) => r.targetKey))];
  const cards = cardIds.length ? await db.supportCard.findMany({ where: { id: { in: cardIds } }, select: { id: true, title: true, dateKey: true } }) : [];
  for (const c of cards) labels.set(`card|${c.id}`, `${c.title}${c.dateKey ? ` · ${c.dateKey.split("-").reverse().slice(0, 2).join("/")}` : ""}`);
  const tourIds = [...new Set(rows.filter((r) => r.targetType === "departure").map((r) => r.targetKey.split("|")[0]))];
  const tours = tourIds.length ? await db.tour.findMany({ where: { id: { in: tourIds } }, select: { id: true, title: true } }) : [];
  const titles = new Map(tours.map((t) => [t.id, t.title]));
  for (const r of rows.filter((x) => x.targetType === "departure")) {
    const [tourId, iso] = r.targetKey.split("|");
    labels.set(`departure|${r.targetKey}`, `${titles.get(tourId) || "Saída"} · ${fmtDay(new Date(iso))}`);
  }
  return labels;
}

export const loader = async ({ request }) => {
  const { actor } = await who(request);
  const url = new URL(request.url);

  if (url.searchParams.get("mentions") === "1") {
    if (!actor.personId) return json({ success: true, mentions: [], unread: 0, linked: false });
    const rows = await db.boardActivity.findMany({
      where: { mentionIds: { has: actor.personId } },
      orderBy: { createdAt: "desc" },
      take: 40,
    });
    const labels = await targetLabels(rows);
    const mentions = rows.map((r) => ({
      id: r.id, text: r.text, authorName: r.authorName, createdAt: r.createdAt,
      targetType: r.targetType, targetKey: r.targetKey, where: labels.get(`${r.targetType}|${r.targetKey}`) || "",
      read: r.readBy.includes(actor.personId),
    }));
    return json({ success: true, mentions, unread: mentions.filter((m) => !m.read).length, linked: true });
  }

  const type = String(url.searchParams.get("type") || "");
  const key = String(url.searchParams.get("key") || "");
  if (!TYPES.has(type) || !key) return json({ success: false, error: "Cartão inválido." }, { status: 400 });
  const [items, people] = await Promise.all([
    db.boardActivity.findMany({ where: { targetType: type, targetKey: key }, orderBy: { createdAt: "desc" }, take: 200 }),
    db.guide.findMany({ select: { id: true, name: true, photoUrl: true }, orderBy: { name: "asc" } }),
  ]);
  return json({ success: true, items, people, me: actor });
};

export const action = async ({ request }) => {
  const { user, actor } = await who(request);
  const form = await request.formData();
  const intent = String(form.get("intent") || "");

  if (intent === "comment") {
    const type = String(form.get("type") || "");
    const key = String(form.get("key") || "").slice(0, 200);
    const text = String(form.get("text") || "").trim().slice(0, 4000);
    if (!TYPES.has(type) || !key || !text) return json({ success: false, error: "Escreva o comentário." }, { status: 400 });
    let ids = [];
    try { ids = JSON.parse(String(form.get("mentionIds") || "[]")); } catch { ids = []; }
    const wanted = [...new Set((Array.isArray(ids) ? ids : []).map(String))].slice(0, 20);
    const valid = wanted.length ? (await db.guide.findMany({ where: { id: { in: wanted } }, select: { id: true } })).map((g) => g.id) : [];
    const item = await logActivity(db, { targetType: type, targetKey: key, text, actor, kind: "comment", mentionIds: valid });
    if (!item) return json({ success: false, error: "Não foi possível salvar o comentário." }, { status: 500 });
    return json({ success: true, item });
  }

  if (intent === "delete") {
    const id = String(form.get("id") || "");
    const row = await db.boardActivity.findUnique({ where: { id } });
    if (!row || row.kind !== "comment") return json({ success: false, error: "Comentário não encontrado." }, { status: 404 });
    const mine = actor.personId ? row.authorPersonId === actor.personId : row.authorName === actor.name;
    if (!mine && !isAdmin(user)) return json({ success: false, error: "Só quem escreveu (ou um administrador) pode apagar." }, { status: 403 });
    await db.boardActivity.delete({ where: { id } });
    return json({ success: true, id });
  }

  if (intent === "read") {
    if (!actor.personId) return json({ success: true });
    const ids = String(form.get("ids") || "").split(",").filter(Boolean).slice(0, 100);
    const rows = await db.boardActivity.findMany({ where: { id: { in: ids }, mentionIds: { has: actor.personId } }, select: { id: true, readBy: true } });
    for (const r of rows) if (!r.readBy.includes(actor.personId)) await db.boardActivity.update({ where: { id: r.id }, data: { readBy: { push: actor.personId } } });
    return json({ success: true });
  }

  return json({ success: false, error: "Ação inválida." }, { status: 400 });
};
