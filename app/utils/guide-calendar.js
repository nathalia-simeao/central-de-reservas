// Agenda do guia em formato iCalendar (.ics): o Google Agenda, o iPhone e o
// Outlook "assinam" o link e mostram as saídas do guia junto da agenda pessoal.
// O guia não precisa informar e-mail nem conectar conta (pedido do Renan, 13/11/2026).

const esc = (value) => String(value ?? "").replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
const bytes = (text) => new TextEncoder().encode(text).length;
const stamp = (date) => new Date(date).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

// Linhas de no máximo 75 bytes (regra do formato).
function fold(line) {
  const out = [];
  let rest = line;
  while (bytes(rest) > 74) {
    let cut = 74;
    while (bytes(rest.slice(0, cut)) > 74) cut -= 1;
    out.push(rest.slice(0, cut));
    rest = ` ${rest.slice(cut)}`;
  }
  out.push(rest);
  return out.join("\r\n");
}

/**
 * @param events [{ uid, start, minutes, title, description, url }]
 */
export function buildIcs({ name = "Central de Reservas", events = [], now = new Date() }) {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Portugal Me & You//Central de Reservas//PT",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${esc(name)}`,
    "X-WR-TIMEZONE:Europe/Lisbon",
    "REFRESH-INTERVAL;VALUE=DURATION:PT1H",
    "X-PUBLISHED-TTL:PT1H",
  ];
  for (const event of events) {
    const start = new Date(event.start);
    if (Number.isNaN(start.getTime())) continue;
    const end = new Date(start.getTime() + Math.max(15, Number(event.minutes) || 120) * 60000);
    lines.push(
      "BEGIN:VEVENT",
      `UID:${esc(event.uid)}@central.portugalmeandyou.com`,
      `DTSTAMP:${stamp(now)}`,
      `DTSTART:${stamp(start)}`,
      `DTEND:${stamp(end)}`,
      `SUMMARY:${esc(event.title)}`,
      ...(event.description ? [`DESCRIPTION:${esc(event.description)}`] : []),
      ...(event.url ? [`URL:${esc(event.url)}`] : []),
      "END:VEVENT",
    );
  }
  lines.push("END:VCALENDAR");
  return `${lines.map(fold).join("\r\n")}\r\n`;
}

/** Links para assinar: Google Agenda (abre a tela de adicionar) e webcal (iPhone/Outlook). */
export function calendarLinks(httpsUrl) {
  const webcal = httpsUrl.replace(/^https?:\/\//, "webcal://");
  return {
    https: httpsUrl,
    webcal,
    google: `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(webcal)}`,
  };
}
