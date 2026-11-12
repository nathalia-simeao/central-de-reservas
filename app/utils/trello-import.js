// Importação do quadro do Trello "Tours (Portugal, Me & You)" para o Quadro
// da Central (pedido da reunião de 11/11/2026: "replicar cartão a cartão").
//
// Como o quadro do Trello está montado:
//   - uma lista por dia ("12/11 (Thursday)", "21/02", "03/01/27 (Sunday)");
//   - listas que não são data ("Doc Suportc") guardam documentos de apoio;
//   - cada cartão é um passeio no dia (nome = passeio, membros = guias);
//   - cada checklist é um grupo: "09h30 ENG (12p) 11A 1C Luis | T1",
//     com um item por cliente.
//
// Este arquivo só lê e organiza (roda no navegador, na prévia, e no servidor).
// Quem grava é a ação importTrelloBoard da Central.

const WEEKDAYS = {
  sunday: 0, domingo: 0, sun: 0, dom: 0,
  monday: 1, segunda: 1, mon: 1, seg: 1,
  tuesday: 2, terca: 2, tue: 2, ter: 2,
  wednesday: 3, quarta: 3, wed: 3, qua: 3, wedneadasy: 3,
  thursday: 4, quinta: 4, thu: 4, qui: 4,
  friday: 5, sexta: 5, fri: 5, sex: 5,
  saturday: 6, sabado: 6, sat: 6, sab: 6,
};

const LANGUAGE_TOKENS = {
  eng: "en", en: "en", ing: "en", ingles: "en", english: "en",
  pt: "pt", por: "pt", ptbr: "pt", portugues: "pt",
  esp: "es", es: "es", spa: "es", espanhol: "es",
  it: "it", ita: "it", italiano: "it",
  fr: "fr", fra: "fr", fre: "fr", frances: "fr",
  de: "de", ale: "de", ger: "de", deu: "de", alemao: "de",
};

const MAX_TEXT = 200;
const MAX_NOTE = 4000;

export function normalizeText(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

const pad = (n) => String(n).padStart(2, "0");
const clip = (value, max = MAX_TEXT) => String(value ?? "").replace(/\s+/g, " ").trim().slice(0, max);

function weekdayOf(year, month, day) {
  return new Date(Date.UTC(year, month - 1, day, 12)).getUTCDay();
}

function validDate(year, month, day) {
  const d = new Date(Date.UTC(year, month - 1, day, 12));
  return d.getUTCFullYear() === year && d.getUTCMonth() === month - 1 && d.getUTCDate() === day;
}

/** "12/11 (Thursday)" → { day, month, year|null, weekday|null }; null se não for data. */
export function parseListDate(name) {
  const text = String(name || "").trim();
  const match = text.match(/^(\d{1,2})\s*\/\s*(\d{1,2})(?:\s*\/\s*(\d{2,4}))?(.*)$/);
  if (!match) return null;
  const day = Number(match[1]);
  const month = Number(match[2]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  let year = match[3] ? Number(match[3]) : null;
  if (year !== null && year < 100) year += 2000;
  const rest = normalizeText(match[4]);
  let weekday = null;
  for (const word of rest.split(" ")) {
    if (word in WEEKDAYS) { weekday = WEEKDAYS[word]; break; }
  }
  return { day, month, year, weekday };
}

const keyOf = (y, m, d) => `${y}-${pad(m)}-${pad(d)}`;
const dayNumber = (dateKey) => Math.round(Date.parse(`${dateKey}T12:00:00Z`) / 86400000);

/**
 * Datas das listas na ordem do quadro. Sem ano: usa o dia da semana do nome
 * quando houver ("Thursday") e, se não, o próximo ano em que a data vem
 * depois da lista anterior. Marca como "suspeita" a data com ano escrito que
 * fura a ordem do quadro ou cujo dia da semana não bate.
 */
export function resolveListDates(lists, today = new Date()) {
  const todayKey = today.toISOString().slice(0, 10);
  const baseYear = Number(todayKey.slice(0, 4));
  let previous = dayNumber(todayKey) - 45;
  const out = new Map();

  for (const list of lists) {
    const parsed = parseListDate(list.name);
    if (!parsed) continue;
    const { day, month, weekday } = parsed;
    const candidates = [];
    if (parsed.year) {
      candidates.push(parsed.year);
    } else {
      for (let y = baseYear - 1; y <= baseYear + 2; y += 1) candidates.push(y);
    }
    const valid = candidates.filter((y) => validDate(y, month, day));
    if (!valid.length) {
      out.set(list.id, { dateKey: null, warning: "Data inválida no nome da lista." });
      continue;
    }

    let year;
    let warning = null;
    if (parsed.year) {
      year = valid[0];
      if (weekday !== null && weekdayOf(year, month, day) !== weekday) warning = "O dia da semana do nome não bate com a data.";
    } else {
      const byWeekday = weekday === null ? valid : valid.filter((y) => weekdayOf(y, month, day) === weekday);
      const pool = byWeekday.length ? byWeekday : valid;
      if (weekday !== null && !byWeekday.length) warning = "O dia da semana do nome não bate com a data.";
      year = pool.find((y) => dayNumber(keyOf(y, month, day)) >= previous - 7) ?? pool[pool.length - 1];
    }

    const dateKey = keyOf(year, month, day);
    const number = dayNumber(dateKey);
    const gap = number - previous;
    // As listas do quadro são dias seguidos: sem ano escrito, um salto de mais de
    // 4 meses quer dizer data trocada (ex.: "12/12" no meio de fevereiro).
    if (!warning && gap < -7) warning = "Fora da ordem do quadro: confira a data no Trello.";
    if (!warning && !parsed.year && gap > 120) warning = "Fora da ordem do quadro: confira a data no Trello.";
    out.set(list.id, { dateKey, warning, explicit: Boolean(parsed.year) });
    // Ano escrito que salta muito à frente não puxa as datas seguintes.
    if (!warning && (!parsed.year || gap <= 60)) previous = Math.max(previous, number);
  }

  // Ano escrito que salta muito à frente da lista seguinte (ex.: "01/07/2027" entre 31/12 e 02/01).
  const ordered = lists.map((l) => ({ id: l.id, ...(out.get(l.id) || {}) })).filter((l) => l.dateKey);
  for (let i = 0; i < ordered.length - 1; i += 1) {
    const current = ordered[i];
    const next = ordered[i + 1];
    if (!current.warning && !next.warning && dayNumber(current.dateKey) - dayNumber(next.dateKey) > 60) {
      out.set(current.id, { ...current, warning: "Fora da ordem do quadro: confira a data no Trello." });
    }
  }
  return out;
}

/** "09h30 ENG (12p) 11A 1C Luis | T1" → { time: "09:30", languages: ["en"] } */
export function parseGroupTitle(title) {
  const text = String(title || "");
  const timeMatch = text.match(/(?:^|\s)([01]?\d|2[0-3])\s*(?:h|:|H)\s*([0-5]\d)?(?![0-9])/);
  const time = timeMatch ? `${pad(Number(timeMatch[1]))}:${timeMatch[2] || "00"}` : null;
  const languages = [];
  for (const word of normalizeText(text).split(" ")) {
    const key = LANGUAGE_TOKENS[word];
    if (key && !languages.includes(key)) languages.push(key);
  }
  const paxMatch = text.match(/\((\d{1,3})\s*p\)/i);
  return { time, languages, pax: paxMatch ? Number(paxMatch[1]) : null };
}

const STOPWORDS = new Set(["tour", "tours", "the", "of", "with", "and", "e", "de", "da", "do", "das", "dos", "a", "o", "em", "in", "to", "ao", "guided", "walking", "experience", "visit", "skip", "line", "ticket", "tickets", "private", "small", "group", "portugal"]);

function tokens(value) {
  return normalizeText(value).split(" ").filter((t) => t && !STOPWORDS.has(t) && !/^\d+$/.test(t));
}

/** Sugere o passeio da Central para o nome do cartão do Trello. */
export function suggestTour(cardName, tours = []) {
  const wanted = tokens(String(cardName || "").replace(/\(.*?\)/g, " "));
  if (!wanted.length) return null;
  const scored = [];
  for (const tour of tours) {
    const have = new Set(tokens(tour.title));
    if (!have.size) continue;
    const hits = wanted.filter((t) => have.has(t) || [...have].some((h) => h.length > 4 && (h.startsWith(t) || t.startsWith(h)))).length;
    if (!hits) continue;
    scored.push({ tourId: tour.id, ratio: hits / wanted.length, score: hits / wanted.length + hits / (have.size * 4) });
  }
  scored.sort((a, b) => b.score - a.score);
  const [best, second] = scored;
  // Empate técnico (ex.: "Belem Tour" × "Torre de Belém"): melhor não chutar.
  // Precisa bater quase todas as palavras do nome do Trello ("Lisboa ao Porto" não é o tour do Porto).
  if (!best || best.ratio < 0.75 || (second && best.score - second.score < 0.15)) return null;
  return best.tourId;
}

/** Chave do passeio no Trello: nome sem o que vem entre parênteses ("(Mosteiro encerrado)"). */
export function trelloTourKey(cardName) {
  return normalizeText(String(cardName || "").replace(/\(.*?\)/g, " "));
}

function attachmentsOf(card) {
  return (Array.isArray(card.attachments) ? card.attachments : [])
    .map((a) => ({ name: clip(a?.name || a?.fileName || "Anexo", 160), url: String(a?.url || "").slice(0, 1000) }))
    .filter((a) => a.url);
}

/**
 * Lê o JSON exportado do Trello (menu ⋯ → Imprimir, exportar e compartilhar →
 * Exportar como JSON) e devolve o que importar.
 */
export function parseTrelloBoard(board, { today = new Date() } = {}) {
  if (!board || typeof board !== "object" || !Array.isArray(board.lists) || !Array.isArray(board.cards)) {
    throw new Error("Arquivo não parece um quadro do Trello exportado em JSON.");
  }
  const lists = board.lists.filter((l) => !l.closed).sort((a, b) => (a.pos ?? 0) - (b.pos ?? 0));
  const listById = new Map(lists.map((l) => [l.id, l]));
  const dates = resolveListDates(lists, today);
  const members = new Map((board.members || []).map((m) => [m.id, m.fullName || m.username || ""]));
  const labels = new Map((board.labels || []).map((l) => [l.id, { color: l.color || null, name: l.name || "" }]));
  const checklistsByCard = new Map();
  for (const cl of board.checklists || []) {
    if (!checklistsByCard.has(cl.idCard)) checklistsByCard.set(cl.idCard, []);
    checklistsByCard.get(cl.idCard).push(cl);
  }

  const cards = [];
  const support = [];
  const cardsOpen = board.cards
    .filter((c) => !c.closed && listById.has(c.idList))
    .sort((a, b) => (listById.get(a.idList).pos - listById.get(b.idList).pos) || ((a.pos ?? 0) - (b.pos ?? 0)));

  for (const card of cardsOpen) {
    const list = listById.get(card.idList);
    const checklists = (checklistsByCard.get(card.id) || [])
      .sort((a, b) => (a.pos ?? 0) - (b.pos ?? 0))
      .map((cl) => ({
        trelloId: cl.id,
        title: clip(cl.name, 120) || "Checklist",
        items: (cl.checkItems || [])
          .sort((a, b) => (a.pos ?? 0) - (b.pos ?? 0))
          .map((it) => ({ text: clip(it.name), done: it.state === "complete" }))
          .filter((it) => it.text),
      }));
    const base = {
      trelloId: card.id,
      name: clip(card.name, 160) || "Cartão",
      listName: clip(list.name, 80),
      desc: String(card.desc || "").trim().slice(0, MAX_NOTE),
      attachments: attachmentsOf(card),
      members: (card.idMembers || []).map((id) => members.get(id)).filter(Boolean),
      labelColors: (card.idLabels || []).map((id) => labels.get(id)?.color).filter(Boolean),
    };

    const date = dates.get(list.id);
    if (!date) {
      support.push({ ...base, checklists: checklists.map(({ title, items }) => ({ title, items })) });
      continue;
    }
    cards.push({
      ...base,
      tourKey: trelloTourKey(card.name),
      dateKey: date.dateKey,
      dateWarning: date.warning || null,
      groups: checklists.map((cl) => ({ ...cl, ...parseGroupTitle(cl.title) })),
    });
  }

  return {
    boardName: clip(board.name, 120),
    cards,
    support,
    stats: {
      lists: lists.length,
      dateLists: [...dates.values()].filter((d) => d.dateKey).length,
      cards: cards.length,
      support: support.length,
      checklists: cards.reduce((sum, c) => sum + c.groups.length, 0),
    },
  };
}

/** Guia do Trello → guia da Central (nome completo, ou primeiro + último nome, ou primeiro nome único). */
export function matchGuide(memberName, guides = [], aliases = {}) {
  const wanted = normalizeText(memberName);
  if (!wanted) return null;
  // Apelidos usados no Trello ("Dee" → Maria Aldina), salvos em Integrações → Trello.
  const aliasId = aliases?.[wanted] || aliases?.[wanted.split(" ")[0]];
  if (aliasId) {
    const byAlias = guides.find((g) => g.id === aliasId);
    if (byAlias) return byAlias;
  }
  const exact = guides.find((g) => normalizeText(g.name) === wanted);
  if (exact) return exact;
  const parts = wanted.split(" ");
  if (parts.length > 1) {
    const firstLast = guides.filter((g) => {
      const p = normalizeText(g.name).split(" ");
      return p[0] === parts[0] && p[p.length - 1] === parts[parts.length - 1];
    });
    if (firstLast.length === 1) return firstLast[0];
  }
  const byFirst = guides.filter((g) => normalizeText(g.name).split(" ")[0] === parts[0]);
  return byFirst.length === 1 ? byFirst[0] : null;
}

const NOT_NAMES = new Set(["evening", "afternoon", "morning", "night", "sunset", "horario", "combinar", "checklist", "grupo", "privado", "private", "tour", "transfer", "pm", "am", "pax", "teste"]);

/**
 * Nome do guia escrito no título do checklist do Trello:
 * "09h30 ENG (15p) 12A 2S 1C Luis | T1" → "Luis"; "14h PT e ESP (5p) 4A 1Y Dee" → "Dee".
 * Pega as palavras com inicial maiúscula que não são horário, idioma, faixas nem códigos.
 */
export function guideNameFromTitle(title) {
  const head = String(title || "").split("|")[0].replace(/\(.*?\)/g, " ");
  const words = head.split(/\s+/).filter((w) => {
    if (!/^[A-ZÀ-Ý][a-zà-ÿ]+$/.test(w)) return false;
    const key = normalizeText(w);
    return !LANGUAGE_TOKENS[key] && !NOT_NAMES.has(key);
  });
  return words.length ? words.join(" ") : null;
}

/** Qual membro do cartão guia este grupo: o nome dele aparece no título do checklist. */
export function memberForGroup(groupTitle, members = []) {
  const words = new Set(normalizeText(groupTitle).split(" "));
  const found = members.filter((m) => {
    const first = normalizeText(m).split(" ")[0];
    return first && first.length > 1 && words.has(first);
  });
  return found.length === 1 ? found[0] : null;
}

/** Texto da observação que vai para a saída (descrição + anexos do Trello). */
export function noteTextForCard(card) {
  const parts = [];
  if (card.desc) parts.push(card.desc);
  if (card.attachments?.length) {
    parts.push(`Anexos no Trello:\n${card.attachments.map((a) => `• ${a.name}: ${a.url}`).join("\n")}`);
  }
  return parts.join("\n\n").slice(0, MAX_NOTE);
}
