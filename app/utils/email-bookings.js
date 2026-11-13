// Leitura das reservas que chegam por e-mail (Gmail), pedido da Nathalia em 13/11/2026.
// Vale para as plataformas sem conexão direta: Airbnb, Tiqets, Klook, Civitatis,
// Viator e Headout. GetYourGuide e Shopify já chegam pela conexão direta.
//
// Aqui só tem funções puras (sem banco e sem rede) para dar para testar:
// de qual plataforma é o e-mail, se é reserva nova / cancelamento / alteração,
// e os campos (referência, passeio, data, hora, pessoas, idioma, cliente).

export const EMAIL_PLATFORMS = [
  { key: "AIRBNB", name: "Airbnb", domains: ["airbnb.com", "airbnb.pt", "airbnb.co.uk", "airbnb.es", "airbnb.com.br"] },
  { key: "TIQETS", name: "Tiqets", domains: ["tiqets.com"] },
  { key: "KLOOK", name: "Klook", domains: ["klook.com"] },
  { key: "CIVITATIS", name: "Civitatis", domains: ["civitatis.com"] },
  { key: "VIATOR", name: "Viator", domains: ["viator.com", "tripadvisor.com"] },
  { key: "HEADOUT", name: "Headout", domains: ["headout.com"] },
  // Chega pela conexão direta: o e-mail só é registrado, nunca vira reserva.
  { key: "GETYOURGUIDE", name: "GetYourGuide", domains: ["getyourguide.com"], direct: true },
];

export const EMAIL_SENDER_DOMAINS = [...new Set(EMAIL_PLATFORMS.flatMap((p) => p.domains))];

const BY_KEY = new Map(EMAIL_PLATFORMS.map((p) => [p.key, p]));
export function emailPlatform(key) {
  return BY_KEY.get(String(key || "").toUpperCase()) || null;
}

const fold = (value) => String(value || "")
  .normalize("NFD").replace(/[̀-ͯ]/g, "")
  .toLowerCase();

function domainOf(address) {
  const match = String(address || "").toLowerCase().match(/@([a-z0-9.-]+)/);
  return match ? match[1] : "";
}

function platformForDomain(domain) {
  if (!domain) return null;
  return EMAIL_PLATFORMS.find((p) => p.domains.some((d) => domain === d || domain.endsWith(`.${d}`))) || null;
}

/** HTML do e-mail → texto com quebras de linha nos blocos (para ler "Rótulo: valor"). */
export function htmlToText(html) {
  return String(html || "")
    .replace(/<(script|style|head)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|tr|li|h[1-6]|table|section|td|th)>/gi, "\n")
    .replace(/<(td|th)[^>]*>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, "\"")
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/[ \t\u00a0]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * De qual plataforma é o e-mail. Olha o remetente; num e-mail encaminhado pela
 * equipe, olha o remetente original ("De:" / "From:" dentro do texto).
 */
export function detectPlatform({ from = "", text = "", subject = "" } = {}) {
  const direct = platformForDomain(domainOf(from));
  if (direct) return direct.key;
  const forwarded = String(text || "").slice(0, 4000).match(/(?:^|\n)\s*(?:from|de|von|da)\s*:\s*[^\n]*?@([a-z0-9.-]+\.[a-z]{2,})/i);
  const fromForward = forwarded ? platformForDomain(forwarded[1].toLowerCase()) : null;
  if (fromForward) return fromForward.key;
  // Último recurso: o nome da plataforma no assunto de um encaminhamento.
  if (/^\s*(fwd?|enc|rv|tr)\s*:/i.test(subject)) {
    const s = fold(subject);
    const hit = EMAIL_PLATFORMS.find((p) => s.includes(fold(p.name)));
    if (hit) return hit.key;
  }
  return null;
}

const CANCEL_RE = /\b(cancel+(ed|ation|led|lation)?|cancelad[ao]|cancelaci[oó]n|cancelamento|annul(e|ée|ation)|annullat[ao]|storniert|stornierung|refunded)\b/i;
const CHANGE_RE = /\b(modif(ied|ication|icad[ao]|icaci[oó]n)|amend(ed|ment)|chang(ed|e to)|alterad[ao]|altera[cç][aã]o|cambi(o|ad[ao])|updated booking|booking update|rebook(ed)?|reschedul(ed|e)|reprogramad[ao]|nueva fecha|new date)\b/i;
const NEW_RE = /\b(new booking|new reservation|new order|booking (is )?confirmed|confirmed booking|booking confirmation|reservation confirmed|you have a new|has been booked|booked your|just booked|nueva reserva|reserva confirmada|nova reserva|reserva nova|nouvelle r[eé]servation|neue buchung|nuova prenotazione|booking received|booking request accepted|ticket(s)? sold|new sale|order confirmed)\b/i;
const IGNORE_RE = /\b(review|reseña|avalia[cç][aã]o|payout|pagamento enviado|invoice|factura|fatura|statement|newsletter|webinar|password|senha|verify|verifica|message from|mensagem de|mensaje de|new message|inquiry|consulta)\b/i;

/** NEW | CANCEL | CHANGE | OTHER — pelo assunto e pelo começo do texto. */
export function classifyEmail({ subject = "", text = "" } = {}) {
  const head = `${subject}\n${String(text || "").slice(0, 600)}`;
  if (CANCEL_RE.test(subject)) return "CANCEL";
  if (CHANGE_RE.test(subject)) return "CHANGE";
  if (IGNORE_RE.test(subject)) return "OTHER";
  if (NEW_RE.test(subject)) return "NEW";
  if (CANCEL_RE.test(head)) return "CANCEL";
  if (CHANGE_RE.test(head)) return "CHANGE";
  if (NEW_RE.test(head)) return "NEW";
  return "OTHER";
}

// ---- Rótulos (EN / ES / PT / FR / IT / DE) ----
const LABELS = {
  ref: ["booking reference", "booking ref", "booking number", "booking no", "booking id", "booking code", "reference number", "reference", "ref", "confirmation code", "confirmation number", "reservation code", "reservation number", "order number", "order id", "order no", "localizador", "referencia", "referência", "codigo de reserva", "código de reserva", "numero de reserva", "número de reserva", "n.º da reserva", "buchungsnummer", "numero di prenotazione", "numéro de réservation", "voucher", "booking"],
  product: ["product", "product name", "activity", "activity name", "experience", "experience name", "tour name", "tour", "attraction", "actividad", "atividade", "experiencia", "experiência", "produto", "producto", "passeio", "activité", "attività", "aktivität"],
  option: ["option", "product option", "tour option", "package", "ticket type", "opción", "opcao", "opção", "modalidad", "modalidade", "tarifa", "rate"],
  date: ["date", "tour date", "activity date", "travel date", "date of travel", "experience date", "visit date", "date of visit", "event date", "booking date for", "fecha", "fecha de la actividad", "fecha del tour", "data", "data do passeio", "data da atividade", "datum", "date de l'activité"],
  time: ["time", "start time", "starting time", "tour time", "hora", "hora de inicio", "horário", "horario", "heure", "uhrzeit", "ora", "departure time"],
  name: ["lead traveler", "lead traveller", "lead traveler name", "lead guest", "main traveler", "customer", "customer name", "guest", "guest name", "traveler", "traveller", "traveler name", "booked by", "name", "full name", "nombre", "nombre del cliente", "titular", "cliente", "nome", "nome do cliente", "nom", "nome e cognome"],
  phone: ["phone", "phone number", "telephone", "mobile", "mobile number", "contact number", "whatsapp", "teléfono", "telefono", "telefone", "telemóvel", "celular", "téléphone", "telefonnummer"],
  email: ["email", "e-mail", "email address", "correo", "correo electrónico", "courriel"],
  language: ["language", "tour language", "guide language", "guided language", "language of the tour", "idioma", "idioma do passeio", "idioma del tour", "lengua", "langue", "sprache", "lingua"],
  pax: ["participants", "number of participants", "travelers", "travellers", "number of travelers", "number of travellers", "guests", "number of guests", "people", "persons", "pax", "tickets", "quantity", "qty", "personas", "pessoas", "participantes", "número de personas", "número de pessoas", "viajeros", "viajantes", "personnes", "teilnehmer", "persone"],
  price: ["total", "total price", "total amount", "amount", "price", "net price", "net amount", "precio", "importe", "preço", "valor", "valor total", "prix", "preis", "prezzo"],
};

const LABEL_LOOKUP = Object.entries(LABELS).flatMap(([field, labels]) => labels.map((label) => [fold(label), field]))
  // Rótulos mais longos primeiro ("booking reference" antes de "booking").
  .sort((a, b) => b[0].length - a[0].length);

function labelField(rawLabel) {
  const label = fold(rawLabel).replace(/[^a-z0-9' .º-]/g, " ").replace(/\s+/g, " ").trim();
  if (!label || label.length > 40) return null;
  for (const [key, field] of LABEL_LOOKUP) {
    if (label === key) return field;
  }
  return null;
}

/** "Rótulo: valor" (na mesma linha ou na linha seguinte) → { campo: [valores] }. */
export function labeledValues(text) {
  const lines = String(text || "").split(/\n/).map((l) => l.trim()).filter(Boolean);
  const out = {};
  const push = (field, value) => {
    const v = String(value || "").replace(/\s+/g, " ").trim().replace(/^[:\-–#\s]+/, "");
    if (!v || v.length > 200) return;
    (out[field] ||= []).push(v);
  };
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const inline = line.match(/^([^:]{2,40}?)\s*[:：]\s*(.+)$/);
    if (inline) {
      const field = labelField(inline[1]);
      if (field) { push(field, inline[2]); continue; }
    }
    // Rótulo sozinho na linha (tabelas HTML): o valor é a próxima linha.
    const bare = labelField(line.replace(/[:：]\s*$/, ""));
    if (bare && lines[i + 1] && !labelField(lines[i + 1].replace(/[:：]\s*$/, ""))) {
      push(bare, lines[i + 1]);
      i += 1;
    }
  }
  return out;
}

// ---- Datas e horas ----
const MONTHS = {
  jan: 1, january: 1, enero: 1, janeiro: 1, janvier: 1, januar: 1, gennaio: 1, ene: 1,
  feb: 2, february: 2, febrero: 2, fevereiro: 2, fev: 2, fevrier: 2, februar: 2, febbraio: 2,
  mar: 3, march: 3, marzo: 3, marco: 3, mars: 3, marz: 3,
  apr: 4, april: 4, abril: 4, abr: 4, avril: 4, aprile: 4, avr: 4,
  may: 5, mayo: 5, maio: 5, mai: 5, maggio: 5, mag: 5,
  jun: 6, june: 6, junio: 6, junho: 6, juin: 6, juni: 6, giugno: 6, giu: 6,
  jul: 7, july: 7, julio: 7, julho: 7, juillet: 7, juli: 7, luglio: 7, lug: 7, juil: 7,
  aug: 8, august: 8, agosto: 8, ago: 8, aout: 8,
  sep: 9, sept: 9, september: 9, septiembre: 9, setembro: 9, set: 9, septembre: 9, settembre: 9,
  oct: 10, october: 10, octubre: 10, outubro: 10, out: 10, octobre: 10, oktober: 10, ottobre: 10, okt: 10, ott: 10,
  nov: 11, november: 11, noviembre: 11, novembro: 11, novembre: 11,
  dec: 12, december: 12, diciembre: 12, dezembro: 12, dez: 12, dic: 12, decembre: 12, dezember: 12, dicembre: 12,
};
const MONTH_RE = Object.keys(MONTHS).sort((a, b) => b.length - a.length).join("|");
const pad = (n) => String(n).padStart(2, "0");
const validDate = (y, m, d) => {
  if (!(y >= 2020 && y <= 2100 && m >= 1 && m <= 12 && d >= 1 && d <= 31)) return null;
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCMonth() === m - 1 ? `${y}-${pad(m)}-${pad(d)}` : null;
};

/** Ano que falta ("Sat, Nov 14"): a próxima ocorrência a partir do dia do e-mail. */
function inferYear(m, d, ref) {
  const base = ref instanceof Date && !Number.isNaN(ref.getTime()) ? ref : new Date();
  const y = base.getUTCFullYear();
  const candidate = Date.UTC(y, m - 1, d);
  return candidate < base.getTime() - 3 * 86400000 ? y + 1 : y;
}

/** Primeira data do texto → "YYYY-MM-DD" (dia antes do mês nos formatos numéricos). */
export function parseDate(value, { reference = null } = {}) {
  const text = fold(value).replace(/(\d)(st|nd|rd|th)\b/g, "$1");
  let m = text.match(/\b(20\d{2})[-/.](\d{1,2})[-/.](\d{1,2})\b/);
  if (m) return validDate(+m[1], +m[2], +m[3]);
  m = text.match(/\b(\d{1,2})[/.-](\d{1,2})[/.-](20\d{2})\b/);
  if (m) return validDate(+m[3], +m[2], +m[1]) || validDate(+m[3], +m[1], +m[2]);
  m = text.match(new RegExp(`\\b(\\d{1,2})\\.?\\s*(?:de\\s+)?(${MONTH_RE})\\.?,?\\s*(?:de\\s+)?(20\\d{2})?\\b`));
  if (m) {
    const month = MONTHS[m[2]];
    const day = +m[1];
    return validDate(m[3] ? +m[3] : inferYear(month, day, reference), month, day);
  }
  m = text.match(new RegExp(`\\b(${MONTH_RE})\\.?\\s+(\\d{1,2}),?\\s*(20\\d{2})?\\b`));
  if (m) {
    const month = MONTHS[m[1]];
    const day = +m[2];
    return validDate(m[3] ? +m[3] : inferYear(month, day, reference), month, day);
  }
  return null;
}

/** Primeira hora do texto → "HH:MM" (09:30, 9:30 AM, 2 PM, 14h, 14h30, 9.30). */
export function parseTime(value) {
  const text = fold(value);
  let m = text.match(/\b(\d{1,2})[:.h](\d{2})\s*(a\.?m\.?|p\.?m\.?)?(?![\d/.-])/);
  if (m) {
    let h = +m[1];
    const min = +m[2];
    const ap = m[3]?.[0];
    if (ap === "p" && h < 12) h += 12;
    if (ap === "a" && h === 12) h = 0;
    if (h <= 23 && min <= 59) return `${pad(h)}:${pad(min)}`;
  }
  m = text.match(/\b(\d{1,2})\s*(a\.?m\.?|p\.?m\.?)/);
  if (m) {
    let h = +m[1];
    if (m[2][0] === "p" && h < 12) h += 12;
    if (m[2][0] === "a" && h === 12) h = 0;
    if (h <= 23) return `${pad(h)}:00`;
  }
  m = text.match(/\b(\d{1,2})h\b/);
  if (m && +m[1] <= 23) return `${pad(+m[1])}:00`;
  return null;
}

// ---- Pessoas ----
const PAX_KINDS = [
  ["adults", "adults?|adultos?|adultes?|erwachsene|adulti|adulto|seniors? \\(?65"],
  ["children", "child(?:ren)?|kids?|ni[nñ]os?|crian[cç]as?|enfants?|kinder|bambini|menores"],
  ["youths", "youths?|teen(?:ager)?s?|j[oó]venes|jovens|students?|estudiantes?|estudantes?"],
  ["seniors", "seniors?|s[eê]niors?|mayores|idosos?"],
  ["infants", "infants?|bebes?|beb[eê]s?|toddlers?"],
];
const PAX_GENERIC = "people|persons?|guests?|participants?|travell?ers?|pax|tickets?|personas?|pessoas?|participantes|viajeros|viajantes|personnes|teilnehmer|persone|h[oó]spedes|huespedes";

/** "2 x Adult, 1 Child" / "Adults: 2" / "3 guests" → { adults, children, youths, seniors, total }. */
export function parsePax(value) {
  const text = fold(value);
  const counts = { adults: 0, children: 0, youths: 0, seniors: 0, infants: 0 };
  let found = false;
  const allKinds = PAX_KINDS.map(([, words]) => words).join("|");
  // "Adultos: 2 Niños: 1" (rótulo e depois número) x "2 Adults, 1 Child" (número antes).
  const labelFirst = new RegExp(`\\b(?:${allKinds})\\b\\s*(?:\\([^)]*\\))?\\s*[:=x×]\\s*\\d`).test(text);
  for (const [key, words] of PAX_KINDS) {
    const before = new RegExp(`\\b(\\d{1,3})\\s*(?:x|×)?\\s*(?:${words})\\b`, "g");
    const after = new RegExp(`\\b(?:${words})\\b\\s*(?:\\([^)]*\\))?\\s*(?:x|×|:|=|-)?\\s*(\\d{1,3})\\b(?![.,]\\d|€|\\$|\\s*(?:eur|usd)\\b)`, "g");
    let n = 0;
    for (const m of text.matchAll(labelFirst ? after : before)) n += Number(m[1]);
    if (n) { counts[key] = n; found = true; }
  }
  let generic = 0;
  const g1 = text.match(new RegExp(`\\b(\\d{1,3})\\s*(?:x\\s*)?(?:${PAX_GENERIC})\\b`));
  const g2 = text.match(new RegExp(`\\b(?:${PAX_GENERIC})\\b\\s*(?::|-)?\\s*(\\d{1,3})\\b(?![.,]\\d|€|\\$|\\s*(?:eur|usd)\\b)`));
  if (g1) generic = Number(g1[1]);
  else if (g2) generic = Number(g2[1]);
  const sum = counts.adults + counts.children + counts.youths + counts.seniors + counts.infants;
  if (!found && generic) counts.adults = generic;
  const total = Math.max(sum, generic);
  return total > 0 && total < 500 ? { ...counts, total } : null;
}

// ---- Idioma ----
const LANGUAGE_WORDS = [
  ["pt", ["portuguese", "portugues", "português", "portugués", "portugais", "portugiesisch", "portoghese", "pt", "pt-br", "pt-pt"]],
  ["en", ["english", "ingles", "inglés", "inglês", "anglais", "englisch", "inglese", "en"]],
  ["es", ["spanish", "espanol", "español", "espanhol", "castellano", "espagnol", "spanisch", "spagnolo", "es"]],
  ["fr", ["french", "frances", "francés", "francês", "français", "franzosisch", "francese", "fr"]],
  ["it", ["italian", "italiano", "italien", "italienisch", "it"]],
  ["de", ["german", "aleman", "alemán", "alemao", "alemão", "allemand", "deutsch", "tedesco", "de"]],
];
export function parseLanguage(value) {
  const words = fold(value).split(/[^a-z-]+/).filter(Boolean);
  for (const [code, names] of LANGUAGE_WORDS) {
    for (const name of names) {
      const n = fold(name);
      // Siglas de 2 letras só como palavra solta (e o texto original em maiúscula).
      if (n.length <= 2) {
        if (new RegExp(`(^|[^A-Za-z])${n.toUpperCase()}([^A-Za-z]|$)`).test(String(value || ""))) return code;
        continue;
      }
      if (words.includes(n) || words.includes(n.split("-")[0])) return code;
    }
  }
  return null;
}

// ---- Referência ----
const REF_PATTERNS = {
  VIATOR: [/\bBR-\d{6,}\b/i, /\b\d{9,12}\b/],
  AIRBNB: [/\bH[A-Z0-9]{9}\b/, /\b[A-Z0-9]{10}\b/],
  KLOOK: [/\b[A-Z]{3}\d{6,}\b/, /\b\d{8,}\b/],
  TIQETS: [/\b\d{6,}\b/],
  CIVITATIS: [/\b\d{6,}\b/],
  HEADOUT: [/\b\d{6,}\b/],
};

function cleanRef(value) {
  const v = String(value || "").trim().replace(/^#/, "").split(/\s+/)[0].replace(/[.,;)]+$/, "");
  return /^[A-Za-z0-9-]{4,40}$/.test(v) && /\d/.test(v) ? v.toUpperCase() : null;
}

function firstPhone(text) {
  const m = String(text || "").match(/(?:\+|\b00)\d[\d\s().-]{6,18}\d/);
  return m ? m[0].replace(/[^\d+]/g, "").replace(/^00/, "+") : null;
}

function firstEmail(text, exclude = []) {
  for (const m of String(text || "").matchAll(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g)) {
    const d = domainOf(m[0]);
    if (!exclude.some((x) => d === x || d.endsWith(`.${x}`))) return m[0].toLowerCase();
  }
  return null;
}

function money(value) {
  const m = String(value || "").match(/(€|eur|usd|\$|£|gbp|brl|r\$)?\s*(\d{1,6}(?:[.,]\d{3})*(?:[.,]\d{1,2})?)\s*(€|eur|usd|\$|£|gbp|brl)?/i);
  if (!m) return null;
  let raw = m[2];
  if (/,\d{1,2}$/.test(raw)) raw = raw.replace(/\./g, "").replace(",", ".");
  else raw = raw.replace(/,/g, "");
  const amount = Number(raw);
  const symbol = (m[1] || m[3] || "").toLowerCase();
  const currency = { "€": "EUR", eur: "EUR", usd: "USD", $: "USD", "£": "GBP", gbp: "GBP", brl: "BRL", "r$": "BRL" }[symbol] || null;
  return Number.isFinite(amount) && amount > 0 ? { amount, currency } : null;
}

/** Produto pelo assunto: "New booking: Belém Walking Tour on 14 Nov" → "Belém Walking Tour". */
function productFromSubject(subject) {
  const s = String(subject || "").replace(/^\s*(fwd?|enc|rv|tr)\s*:\s*/i, "");
  const m = s.match(/[:–—-]\s*(.+?)(?:\s+(?:on|for|el|em|para|le|am)\s+\w+[, ]+\d{1,2}.*|\s+[-–—|]\s+.*)?$/i);
  const v = m ? m[1].trim() : "";
  return v.length >= 6 && !/^\d/.test(v) && !NEW_RE.test(v) ? v : null;
}

/**
 * E-mail → reserva lida.
 * @param mail { from, subject, text, html, date, messageId }
 * @returns { platform, kind, ref, product, option, dateKey, timeKey, pax, language, customerName, customerPhone, customerEmail, price, missing[] }
 */
export function parseBookingEmail(mail = {}) {
  const text = mail.text && mail.text.trim().length > 40 ? mail.text : htmlToText(mail.html || mail.text || "");
  const subject = String(mail.subject || "");
  const platform = detectPlatform({ from: mail.from, text, subject });
  const kind = classifyEmail({ subject, text });
  const values = labeledValues(text);
  const first = (field) => (values[field] || [])[0] || null;
  const reference = mail.date ? new Date(mail.date) : null;

  let ref = null;
  for (const value of values.ref || []) { ref = cleanRef(value); if (ref) break; }
  if (!ref && platform) {
    for (const re of REF_PATTERNS[platform] || []) {
      const hit = `${subject}\n${text}`.match(re);
      if (hit) { ref = cleanRef(hit[0]); if (ref) break; }
    }
  }

  const dateSource = [first("date"), subject, text.slice(0, 3000)].filter(Boolean);
  let dateKey = null;
  for (const src of dateSource) { dateKey = parseDate(src, { reference }); if (dateKey) break; }
  let timeKey = null;
  for (const src of [first("time"), first("date"), first("option"), subject]) {
    if (src) { timeKey = parseTime(src); if (timeKey) break; }
  }

  const paxSource = [values.pax?.join(" ; "), first("option"), text.slice(0, 4000)].filter(Boolean);
  let pax = null;
  for (const src of paxSource) { pax = parsePax(src); if (pax) break; }

  const product = first("product") || productFromSubject(subject);
  const option = first("option");
  const language = parseLanguage(first("language") || "") || parseLanguage(option || "") || null;
  const priceInfo = money(first("price"));
  const platformDomains = emailPlatform(platform)?.domains || [];

  const parsed = {
    platform,
    kind,
    ref,
    product,
    option,
    dateKey,
    timeKey,
    pax,
    language,
    customerName: first("name"),
    customerPhone: firstPhone(first("phone")) || firstPhone(text.slice(0, 6000)),
    customerEmail: firstEmail(first("email"), platformDomains) || null,
    price: priceInfo,
  };
  parsed.missing = missingFields(parsed);
  return parsed;
}

/** O que falta para a reserva entrar sozinha. */
export function missingFields(parsed) {
  const missing = [];
  if (!parsed.platform) missing.push("platform");
  if (!parsed.ref) missing.push("ref");
  if (parsed.kind === "NEW" || parsed.kind === "CHANGE") {
    if (!parsed.product && !parsed.tourId) missing.push("product");
    if (!parsed.dateKey) missing.push("date");
    if (!parsed.timeKey) missing.push("time");
    if (!parsed.pax?.total) missing.push("pax");
  }
  return missing;
}

/** Chave estável do nome do produto na plataforma (para lembrar "isto é o passeio X"). */
export function productAliasKey(platform, product, option = "") {
  const norm = (v) => fold(v).replace(/[^a-z0-9]+/g, " ").trim();
  return `${String(platform || "").toUpperCase()}|${norm(product)}${option ? `|${norm(option)}` : ""}`;
}
