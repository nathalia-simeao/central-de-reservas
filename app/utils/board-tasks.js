// Cartões avulsos do Quadro (SupportCard): documentos de suporte (sem dia) e
// demandas externas (com dia). Checklists no mesmo formato das saídas.
import { normalizeChecklists } from "./departure-checklists.js";

/** Checklists do cartão com ids estáveis (os importados do Trello vinham sem id). */
export function cardChecklists(raw) {
  if (Array.isArray(raw)) {
    return normalizeChecklists({
      lists: raw.map((list, i) => ({
        id: list?.id || `s${i}`,
        title: list?.title,
        items: (Array.isArray(list?.items) ? list.items : []).map((item, j) => ({ ...item, id: item?.id || `s${i}_${j}` })),
      })),
    });
  }
  return normalizeChecklists(raw);
}

export const isDateKey = (value) => /^20\d{2}-\d{2}-\d{2}$/.test(String(value || ""));
export const isTimeKey = (value) => /^([01]\d|2[0-3]):[0-5]\d$/.test(String(value || ""));
