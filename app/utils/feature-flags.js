// Funcionalidades opcionais da Central. Tudo o que é novo chega DESLIGADO:
// o administrador liga em Configurações → Funcionalidades quando quiser.
// Nada que envolva dinheiro de terceiros (comissão, conta bancária, gorjeta)
// é ligado ou integrado sem a gestão configurar.

export const FEATURES = [
  {
    key: "boardMove",
    defaultOn: true, // pedido da gestão em 08/11
    pt: ["Mover saídas no Quadro", "Administradores arrastam o cartão para outra data (ou usam o botão no cartão)."],
    en: ["Move departures on the Board", "Admins drag a card to another date (or use the button on the card)."],
  },
  {
    key: "weatherAlerts",
    defaultOn: false,
    pt: ["Alerta de clima", "Previsão do tempo no Quadro e alerta de mau tempo em passeios ao ar livre (Open-Meteo, gratuito)."],
    en: ["Weather alerts", "Forecast on the Board and bad-weather alerts for outdoor tours (Open-Meteo, free)."],
  },
  {
    key: "guestMessages",
    defaultOn: false,
    pt: ["Avisar clientes da saída", "Modelos de mensagem com WhatsApp por cliente e e-mail para todos. Nada é enviado sozinho: cada envio é um clique da equipe."],
    en: ["Message departure guests", "Message templates with WhatsApp per guest and email to all. Nothing is sent automatically."],
  },
  {
    key: "waitlist",
    defaultOn: false,
    pt: ["Lista de espera", "Fila por saída esgotada, com destaque quando abre vaga."],
    en: ["Waiting list", "Queue per sold-out departure, highlighted when seats open."],
  },
];

export function normalizeFeatureFlags(raw) {
  const source = raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {};
  return Object.fromEntries(FEATURES.map((f) => [f.key, typeof source[f.key] === "boolean" ? source[f.key] : f.defaultOn]));
}

/** Só aceita chaves conhecidas com valor booleano. */
export function sanitizeFeatureFlagsPatch(raw) {
  const known = new Set(FEATURES.map((f) => f.key));
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new Error("Funcionalidades inválidas.");
  const out = {};
  for (const [key, value] of Object.entries(raw)) {
    if (known.has(key) && typeof value === "boolean") out[key] = value;
  }
  return out;
}
