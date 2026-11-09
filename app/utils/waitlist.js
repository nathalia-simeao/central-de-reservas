// Lista de espera e mensagens para os clientes de uma saída.
// Funções puras (sem banco), usadas no servidor e na tela.

export const WAITLIST_STATUSES = ["WAITING", "NOTIFIED", "BOOKED", "REMOVED"];

function clean(value, max = 200) {
  return String(value ?? "").trim().slice(0, max);
}

/** Valida e normaliza uma entrada da lista de espera. Lança Error com mensagem em português. */
export function normalizeWaitlistInput(input = {}) {
  const customerName = clean(input.customerName, 120);
  if (!customerName) throw new Error("Informe o nome do cliente.");
  const customerPhone = clean(input.customerPhone, 40) || null;
  const customerEmail = clean(input.customerEmail, 160).toLowerCase() || null;
  if (!customerPhone && !customerEmail) throw new Error("Informe WhatsApp ou e-mail para avisar o cliente.");
  if (customerEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail)) throw new Error("E-mail inválido.");
  const pax = input.pax === undefined || input.pax === null || input.pax === "" ? 1 : Math.trunc(Number(input.pax));
  if (!Number.isFinite(pax) || pax < 1 || pax > 50) throw new Error("Número de pessoas inválido.");
  return {
    customerName,
    customerPhone,
    customerEmail,
    language: clean(input.language, 20) || null,
    pax,
    notes: clean(input.notes, 1000) || null,
  };
}

/** Lugares livres aproximados da saída (capacidade do passeio − confirmados − aguardando pagamento). */
export function freeSeats(card, tour) {
  const capacity = Number(tour?.maxCapacity || 0);
  if (!capacity) return null;
  return Math.max(0, capacity - Number(card?.pax || 0) - Number(card?.pending || 0));
}

/** Quem da fila cabe nas vagas abertas, na ordem de chegada. */
export function waitlistMatches(entries = [], seats) {
  if (!seats) return [];
  const out = [];
  let left = seats;
  for (const e of [...entries].filter((x) => x.status === "WAITING").sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)))) {
    if (e.pax <= left) { out.push(e); left -= e.pax; }
  }
  return out;
}

export function whatsappLink(phone, text) {
  const digits = String(phone || "").replace(/[^\d]/g, "");
  if (digits.length < 8) return null;
  return `https://wa.me/${digits}?text=${encodeURIComponent(text || "")}`;
}

export function mailtoLink(emails, subject, body) {
  const list = [...new Set((emails || []).map((e) => String(e || "").trim()).filter(Boolean))];
  if (!list.length) return null;
  const params = new URLSearchParams({ bcc: list.join(","), subject: subject || "", body: body || "" });
  return `mailto:?${params.toString().replace(/\+/g, "%20")}`;
}

function firstName(name) {
  return String(name || "").trim().split(/\s+/)[0] || "";
}

/** Modelos de mensagem para os clientes da saída. {name} vira o primeiro nome do cliente. */
export function messageTemplates({ title, dateLabel, timeKey, lang = "en" }) {
  const en = lang !== "pt";
  return [
    {
      key: "delay",
      label: en ? "Delay" : "Atraso",
      text: en
        ? `Hi {name}, this is Portugal Me & You about your ${title} on ${dateLabel} at ${timeKey}. We are running about 15 minutes late. Sorry for the wait — see you soon!`
        : `Olá {name}, aqui é a Portugal Me & You sobre o seu ${title} em ${dateLabel} às ${timeKey}. Estamos com cerca de 15 minutos de atraso. Desculpe a espera, até já!`,
    },
    {
      key: "meeting",
      label: en ? "Meeting point" : "Ponto de encontro",
      text: en
        ? `Hi {name}, this is Portugal Me & You about your ${title} on ${dateLabel} at ${timeKey}. The meeting point has changed to: [new meeting point]. See you there!`
        : `Olá {name}, aqui é a Portugal Me & You sobre o seu ${title} em ${dateLabel} às ${timeKey}. O ponto de encontro mudou para: [novo ponto]. Até lá!`,
    },
    {
      key: "weather",
      label: en ? "Weather" : "Clima",
      text: en
        ? `Hi {name}, this is Portugal Me & You about your ${title} on ${dateLabel} at ${timeKey}. The forecast shows bad weather that day. We'd like to offer you a new date at no extra cost — just reply with the day that suits you best.`
        : `Olá {name}, aqui é a Portugal Me & You sobre o seu ${title} em ${dateLabel} às ${timeKey}. A previsão indica mau tempo nesse dia. Podemos remarcar sem custo: responda com a data que fica melhor para você.`,
    },
    {
      key: "waitlist",
      label: en ? "Seat available" : "Vaga aberta",
      text: en
        ? `Hi {name}, good news from Portugal Me & You: a seat opened up on the ${title} on ${dateLabel} at ${timeKey}. Would you like to book it? Reply and we'll send you the payment link.`
        : `Olá {name}, boa notícia da Portugal Me & You: abriu vaga no ${title} em ${dateLabel} às ${timeKey}. Quer reservar? Responda e enviamos o link de pagamento.`,
    },
  ];
}

export function personalize(text, name) {
  return String(text || "").replaceAll("{name}", firstName(name) || "");
}
