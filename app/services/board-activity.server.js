// Comentários e atividade dos cartões do Quadro. Registrar atividade nunca
// pode quebrar a ação principal: erros só vão para o log.
import { cardChecklists } from "../utils/board-tasks.js";
import { normalizeChecklists } from "../utils/departure-checklists.js";

const q = (text) => `“${String(text || "").replace(/\s+/g, " ").trim().slice(0, 120)}”`;

export function departureTargetKey(tourId, startTime) {
  return `${tourId}|${new Date(startTime).toISOString()}`;
}

/** Nome de quem está agindo: pessoa da Equipe ligada ao acesso, nome do acesso ou "Equipe". */
export async function actorFor(prisma, centralUser) {
  if (centralUser?.portal) return { name: centralUser.name || "Equipe", personId: centralUser.guideId || null };
  if (centralUser?.guideId) {
    const person = await prisma.guide.findUnique({ where: { id: centralUser.guideId }, select: { name: true } }).catch(() => null);
    if (person?.name) return { name: person.name, personId: centralUser.guideId };
  }
  return { name: centralUser?.name || "Equipe", personId: centralUser?.guideId || null };
}

export async function logActivity(prisma, { targetType, targetKey, text, actor, kind = "event", mentionIds = [] }) {
  if (!targetType || !targetKey || !text) return null;
  try {
    return await prisma.boardActivity.create({
      data: {
        targetType,
        targetKey: String(targetKey).slice(0, 200),
        kind,
        text: String(text).slice(0, 4000),
        authorName: actor?.name || null,
        authorPersonId: actor?.personId || null,
        mentionIds,
      },
    });
  } catch (error) {
    console.error("[PMY] logActivity failed:", error?.message || error);
    return null;
  }
}

/** Frase da atividade para uma operação de checklist (antes de aplicar). */
export function describeChecklistOp(raw, op = {}, { card = false } = {}) {
  const state = card ? cardChecklists(raw) : normalizeChecklists(raw);
  const list = state.lists.find((l) => l.id === op.listId);
  const item = list?.items.find((i) => i.id === op.itemId);
  const label = op.label || item?.text;
  switch (op.type) {
    case "toggleItem": return item ? (item.done ? `desmarcou ${q(label)}` : `marcou ${q(label)} como concluído`) : null;
    case "toggleAuto": {
      const done = Boolean(state.auto[op.key]?.done);
      return label ? (done ? `desmarcou ${q(label)}` : `marcou ${q(label)} como concluído`) : null;
    }
    case "addList": return `criou o checklist ${q(op.title)}`;
    case "deleteList": return list ? `excluiu o checklist ${q(list.title)}` : null;
    case "renameList": return list ? `renomeou o checklist ${q(list.title)} para ${q(op.title)}` : null;
    case "addItem": return list ? `adicionou ${q(op.text)} em ${q(list.title)}` : null;
    case "deleteItem": return item ? `apagou ${q(item.text)} de ${q(list.title)}` : null;
    case "editItem": return item ? `alterou ${q(item.text)} para ${q(op.text)}` : null;
    case "moveItem": {
      if (!item) return null;
      const to = state.lists.find((l) => l.id === (op.toListId || op.listId));
      return to && to.id !== list.id ? `moveu ${q(item.text)} para ${q(to.title)}` : `mudou a ordem de ${q(item.text)}`;
    }
    default: return null;
  }
}
