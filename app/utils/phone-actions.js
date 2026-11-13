// Números de telefone dentro de textos (checklists, reservas) viram ações:
// WhatsApp, Ligar, SMS e Copiar — pedido do Renan, 13/11/2026. Tocar no número
// não pode marcar o item do checklist como feito.
//
// Conta como telefone: começa com + ou 00 e tem 8 a 15 dígitos, ou é um
// celular português de 9 dígitos começando com 9. Assim datas, horários e
// códigos de reserva não viram "telefone".

const PHONE_RE = /(?:\+|\b00)\d[\d\s().-]{6,20}\d|\b9\d{2}[\s.-]?\d{3}[\s.-]?\d{3}\b/g;

function digitsOf(raw) {
  const text = String(raw || "").trim();
  const plus = text.startsWith("+") || text.startsWith("00");
  const digits = text.replace(/\D/g, "").replace(/^00/, "");
  return { plus, digits };
}

/** Número limpo para links: "+351912345678" (celular PT sem código ganha +351). */
export function normalizePhone(raw) {
  const { plus, digits } = digitsOf(raw);
  if (!digits) return "";
  if (plus) return digits.length >= 8 && digits.length <= 15 ? `+${digits}` : "";
  if (/^9\d{8}$/.test(digits)) return `+351${digits}`;
  return digits.length >= 8 && digits.length <= 15 ? `+${digits}` : "";
}

/** Divide um texto em pedaços: { text } e { phone, raw }. */
export function splitPhones(text) {
  const source = String(text || "");
  const parts = [];
  let last = 0;
  for (const match of source.matchAll(PHONE_RE)) {
    const phone = normalizePhone(match[0]);
    if (!phone) continue;
    if (match.index > last) parts.push({ text: source.slice(last, match.index) });
    parts.push({ phone, raw: match[0].trim() });
    last = match.index + match[0].length;
  }
  if (last < source.length) parts.push({ text: source.slice(last) });
  return parts;
}

export function findPhones(text) {
  return splitPhones(text).filter((p) => p.phone);
}

/** Texto sem os telefones (para a linha do checklist) e a lista de telefones. */
export function textWithoutPhones(text) {
  const parts = splitPhones(text);
  return {
    text: parts.filter((p) => !p.phone).map((p) => p.text).join("").replace(/\s{2,}/g, " ").trim(),
    phones: [...new Set(parts.filter((p) => p.phone).map((p) => p.phone))],
  };
}

export function phoneLinks(phone, message = "") {
  const clean = normalizePhone(phone);
  if (!clean) return null;
  const digits = clean.slice(1);
  const text = message ? `?text=${encodeURIComponent(message)}` : "";
  return {
    phone: clean,
    whatsapp: `https://wa.me/${digits}${text}`,
    call: `tel:${clean}`,
    sms: `sms:${clean}${message ? `?&body=${encodeURIComponent(message)}` : ""}`,
  };
}
