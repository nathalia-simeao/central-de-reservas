// Equipe da PMY: cada pessoa (cadastro Guide) tem uma ou mais áreas.
// Só quem tem GUIA aparece na escala, no Quadro, no fechamento e no portal do guia.

export const TEAM_AREAS = [
  { key: "GUIA", pt: "Guias", en: "Guides", one: ["Guia", "Guide"] },
  { key: "ADMIN", pt: "Administração", en: "Administration", one: ["Administração", "Administration"] },
  { key: "COMERCIAL", pt: "Comercial", en: "Sales", one: ["Comercial", "Sales"] },
  { key: "MARKETING", pt: "Marketing", en: "Marketing", one: ["Marketing", "Marketing"] },
  { key: "OPERACAO", pt: "Operação", en: "Operations", one: ["Operação", "Operations"] },
];

const KEYS = new Set(TEAM_AREAS.map((a) => a.key));

export function normalizeAreas(value) {
  let list = value;
  if (typeof list === "string") {
    try { list = JSON.parse(list); } catch { list = list.split(","); }
  }
  const clean = [...new Set((Array.isArray(list) ? list : []).map((v) => String(v || "").trim().toUpperCase()).filter((v) => KEYS.has(v)))];
  return TEAM_AREAS.map((a) => a.key).filter((k) => clean.includes(k));
}

/** Pessoas sem áreas salvas (cadastros antigos) contam como guia. */
export function personAreas(person) {
  const areas = normalizeAreas(person?.areas);
  return areas.length ? areas : ["GUIA"];
}

export const isGuide = (person) => personAreas(person).includes("GUIA");

export function areaLabel(key, lang = "pt") {
  const area = TEAM_AREAS.find((a) => a.key === key);
  if (!area) return key;
  return lang === "en" ? area.one[1] : area.one[0];
}
