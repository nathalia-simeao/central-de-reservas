// PMY Central client-side configuration and pure helpers.
// Keep route.jsx focused on orchestration and rendering.

export const getLisbonToday = () => {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: "Europe/Lisbon",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })
      .formatToParts(new Date())
      .filter(part => part.type !== "literal")
      .map(part => [part.type, part.value]),
  );

  return {
    year: Number(parts.year),
    monthIndex: Number(parts.month) - 1,
    day: Number(parts.day),
  };
};

export const getFlagUrl = (iso2) => `https://flagcdn.com/w20/${iso2.toLowerCase()}.png`;

export const getDraftOrderAttribution = () => {
  const params = new URLSearchParams(window.location.search || "");
  const sessionKey = "pmy_central_session_v1";
  let sessionId = "";

  try {
    sessionId = sessionStorage.getItem(sessionKey) || "";
    if (!sessionId) {
      sessionId =
        typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
          ? `central_${crypto.randomUUID()}`
          : `central_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
      sessionStorage.setItem(sessionKey, sessionId);
    }
  } catch {
    sessionId = `central_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
  }

  const attribution = {
    session_id: sessionId,
    order_referrer_source: "central_pmy",
    order_referrer_name: "Central PMY",
    order_referrer_channel: "backoffice",
  };

  [
    "utm_source",
    "utm_medium",
    "utm_campaign",
    "utm_term",
    "utm_content",
    "utm_id",
    "gclid",
    "gbraid",
    "wbraid",
    "fbclid",
    "msclkid",
    "ttclid",
  ].forEach((key) => {
    const value = String(params.get(key) || "").trim();
    if (value) attribution[key] = value;
  });

  return attribution;
};


export const getDashboardRangeForPeriod = (selectedPeriod, customStart, customEnd) => {
  if (selectedPeriod === "period_custom" && customStart && customEnd) {
    return {
      start: new Date(`${customStart}T00:00:00`),
      end: new Date(`${customEnd}T23:59:59.999`),
    };
  }

  const end = new Date();
  const start = new Date(end);

  if (selectedPeriod === "period_6m") {
    start.setMonth(start.getMonth() - 6);
  } else if (selectedPeriod === "period_1y") {
    start.setFullYear(start.getFullYear() - 1);
  } else {
    const days = {
      period_1w: 7,
      period_15d: 15,
      period_30d: 30,
      period_60d: 60,
      period_90d: 90,
      period_120d: 120,
    }[selectedPeriod] || 30;
    start.setDate(start.getDate() - days);
  }

  return { start, end };
};

export const ddiList = [
  { code: "+93",   iso: "AF" }, { code: "+355",  iso: "AL" }, { code: "+213",  iso: "DZ" },
  { code: "+376",  iso: "AD" }, { code: "+244",  iso: "AO" }, { code: "+1268", iso: "AG" },
  { code: "+54",   iso: "AR" }, { code: "+374",  iso: "AM" }, { code: "+61",   iso: "AU" },
  { code: "+43",   iso: "AT" }, { code: "+994",  iso: "AZ" }, { code: "+1242", iso: "BS" },
  { code: "+973",  iso: "BH" }, { code: "+880",  iso: "BD" }, { code: "+1246", iso: "BB" },
  { code: "+375",  iso: "BY" }, { code: "+32",   iso: "BE" }, { code: "+501",  iso: "BZ" },
  { code: "+229",  iso: "BJ" }, { code: "+975",  iso: "BT" }, { code: "+591",  iso: "BO" },
  { code: "+387",  iso: "BA" }, { code: "+267",  iso: "BW" }, { code: "+55",   iso: "BR" },
  { code: "+673",  iso: "BN" }, { code: "+359",  iso: "BG" }, { code: "+226",  iso: "BF" },
  { code: "+257",  iso: "BI" }, { code: "+238",  iso: "CV" }, { code: "+855",  iso: "KH" },
  { code: "+237",  iso: "CM" }, { code: "+1",    iso: "CA" }, { code: "+236",  iso: "CF" },
  { code: "+235",  iso: "TD" }, { code: "+56",   iso: "CL" }, { code: "+86",   iso: "CN" },
  { code: "+57",   iso: "CO" }, { code: "+269",  iso: "KM" }, { code: "+243",  iso: "CD" },
  { code: "+242",  iso: "CG" }, { code: "+506",  iso: "CR" }, { code: "+225",  iso: "CI" },
  { code: "+385",  iso: "HR" }, { code: "+53",   iso: "CU" }, { code: "+357",  iso: "CY" },
  { code: "+420",  iso: "CZ" }, { code: "+45",   iso: "DK" }, { code: "+253",  iso: "DJ" },
  { code: "+1767", iso: "DM" }, { code: "+1809", iso: "DO" }, { code: "+593",  iso: "EC" },
  { code: "+20",   iso: "EG" }, { code: "+503",  iso: "SV" }, { code: "+240",  iso: "GQ" },
  { code: "+291",  iso: "ER" }, { code: "+372",  iso: "EE" }, { code: "+268",  iso: "SZ" },
  { code: "+251",  iso: "ET" }, { code: "+679",  iso: "FJ" }, { code: "+358",  iso: "FI" },
  { code: "+33",   iso: "FR" }, { code: "+241",  iso: "GA" }, { code: "+220",  iso: "GM" },
  { code: "+995",  iso: "GE" }, { code: "+49",   iso: "DE" }, { code: "+233",  iso: "GH" },
  { code: "+30",   iso: "GR" }, { code: "+1473", iso: "GD" }, { code: "+502",  iso: "GT" },
  { code: "+224",  iso: "GN" }, { code: "+245",  iso: "GW" }, { code: "+592",  iso: "GY" },
  { code: "+509",  iso: "HT" }, { code: "+504",  iso: "HN" }, { code: "+36",   iso: "HU" },
  { code: "+354",  iso: "IS" }, { code: "+91",   iso: "IN" }, { code: "+62",   iso: "ID" },
  { code: "+98",   iso: "IR" }, { code: "+964",  iso: "IQ" }, { code: "+353",  iso: "IE" },
  { code: "+972",  iso: "IL" }, { code: "+39",   iso: "IT" }, { code: "+1876", iso: "JM" },
  { code: "+81",   iso: "JP" }, { code: "+962",  iso: "JO" }, { code: "+7",    iso: "KZ" },
  { code: "+254",  iso: "KE" }, { code: "+686",  iso: "KI" }, { code: "+850",  iso: "KP" },
  { code: "+82",   iso: "KR" }, { code: "+965",  iso: "KW" }, { code: "+996",  iso: "KG" },
  { code: "+856",  iso: "LA" }, { code: "+371",  iso: "LV" }, { code: "+961",  iso: "LB" },
  { code: "+266",  iso: "LS" }, { code: "+231",  iso: "LR" }, { code: "+218",  iso: "LY" },
  { code: "+423",  iso: "LI" }, { code: "+370",  iso: "LT" }, { code: "+352",  iso: "LU" },
  { code: "+261",  iso: "MG" }, { code: "+265",  iso: "MW" }, { code: "+60",   iso: "MY" },
  { code: "+960",  iso: "MV" }, { code: "+223",  iso: "ML" }, { code: "+356",  iso: "MT" },
  { code: "+692",  iso: "MH" }, { code: "+222",  iso: "MR" }, { code: "+230",  iso: "MU" },
  { code: "+52",   iso: "MX" }, { code: "+691",  iso: "FM" }, { code: "+373",  iso: "MD" },
  { code: "+377",  iso: "MC" }, { code: "+976",  iso: "MN" }, { code: "+382",  iso: "ME" },
  { code: "+212",  iso: "MA" }, { code: "+258",  iso: "MZ" }, { code: "+95",   iso: "MM" },
  { code: "+264",  iso: "NA" }, { code: "+674",  iso: "NR" }, { code: "+977",  iso: "NP" },
  { code: "+31",   iso: "NL" }, { code: "+64",   iso: "NZ" }, { code: "+505",  iso: "NI" },
  { code: "+227",  iso: "NE" }, { code: "+234",  iso: "NG" }, { code: "+389",  iso: "MK" },
  { code: "+47",   iso: "NO" }, { code: "+968",  iso: "OM" }, { code: "+92",   iso: "PK" },
  { code: "+680",  iso: "PW" }, { code: "+970",  iso: "PS" }, { code: "+507",  iso: "PA" },
  { code: "+675",  iso: "PG" }, { code: "+595",  iso: "PY" }, { code: "+51",   iso: "PE" },
  { code: "+63",   iso: "PH" }, { code: "+48",   iso: "PL" }, { code: "+351",  iso: "PT" },
  { code: "+974",  iso: "QA" }, { code: "+40",   iso: "RO" }, { code: "+7",    iso: "RU" },
  { code: "+250",  iso: "RW" }, { code: "+1869", iso: "KN" }, { code: "+1758", iso: "LC" },
  { code: "+1784", iso: "VC" }, { code: "+685",  iso: "WS" }, { code: "+378",  iso: "SM" },
  { code: "+239",  iso: "ST" }, { code: "+966",  iso: "SA" }, { code: "+221",  iso: "SN" },
  { code: "+381",  iso: "RS" }, { code: "+248",  iso: "SC" }, { code: "+232",  iso: "SL" },
  { code: "+65",   iso: "SG" }, { code: "+421",  iso: "SK" }, { code: "+386",  iso: "SI" },
  { code: "+677",  iso: "SB" }, { code: "+252",  iso: "SO" }, { code: "+27",   iso: "ZA" },
  { code: "+211",  iso: "SS" }, { code: "+34",   iso: "ES" }, { code: "+94",   iso: "LK" },
  { code: "+249",  iso: "SD" }, { code: "+597",  iso: "SR" }, { code: "+46",   iso: "SE" },
  { code: "+41",   iso: "CH" }, { code: "+963",  iso: "SY" }, { code: "+886",  iso: "TW" },
  { code: "+992",  iso: "TJ" }, { code: "+255",  iso: "TZ" }, { code: "+66",   iso: "TH" },
  { code: "+670",  iso: "TL" }, { code: "+228",  iso: "TG" }, { code: "+676",  iso: "TO" },
  { code: "+1868", iso: "TT" }, { code: "+216",  iso: "TN" }, { code: "+90",   iso: "TR" },
  { code: "+993",  iso: "TM" }, { code: "+688",  iso: "TV" }, { code: "+256",  iso: "UG" },
  { code: "+380",  iso: "UA" }, { code: "+971",  iso: "AE" }, { code: "+44",   iso: "GB" },
  { code: "+1",    iso: "US" }, { code: "+598",  iso: "UY" }, { code: "+998",  iso: "UZ" },
  { code: "+678",  iso: "VU" }, { code: "+58",   iso: "VE" }, { code: "+84",   iso: "VN" },
  { code: "+967",  iso: "YE" }, { code: "+260",  iso: "ZM" }, { code: "+263",  iso: "ZW" },
];

export const translations = {
  pt: {
    menu_dashboard: "Dashboard", menu_agenda: "Agenda Central", menu_integrations: "Integrações",
    menu_guides: "Guias", menu_automations: "Automações", menu_settings: "Configurações",
    dash_title: "Visão Geral", dash_total_sales: "Total de Vendas", dash_vs_last_month: "no período selecionado",
    dash_revenue_confirmed: "Receita Confirmada", dash_revenue_estimated: "Receita Estimada",
    dash_canceled_tours: "Tours Cancelados", dash_upcoming: "Próximos Tours", dash_performance: "Desempenho por Passeio",
    dash_bookings: "reservas", agenda_title: "Agenda Centralizada", integrations_title: "Sincronização de Plataformas",
    guides_title: "Gestão de Guias", automations_title: "Automações e Alertas", settings_title: "Configurações do Sistema",
    created_by: "Criado por Nathalia Simeão",
    period_1w: "1 semana", period_15d: "15 dias", period_30d: "30 dias", period_60d: "60 dias",
    period_90d: "90 dias", period_120d: "120 dias", period_6m: "6 meses", period_1y: "1 ano",
    period_custom: "Personalizado", date_from: "De", date_to: "Até", btn_apply: "Aplicar",
    source_site: "Site Próprio", source_viator: "Viator", source_gyg: "GetYourGuide", source_manual: "Manual",
    modal_sales_details: "Detalhamento de Vendas", modal_confirmed_details: "Detalhamento da Receita Confirmada",
    modal_estimated_details: "Detalhamento da Receita Estimada", modal_canceled_details: "Motivos de Cancelamento",
    modal_upcoming_details: "Lista de Próximos Tours", views: "visualizações", btn_format: "Formato",
    form_new_booking: "Inserir Nova Reserva", form_new_block: "Inserir Bloqueio Manual",
    form_select_tour: "Selecione o Tour", form_customer: "Nome do Cliente (Obrigatório):",
    form_email: "E-mail (Opcional):", form_phone: "Telefone / WhatsApp (Opcional):",
    form_lang: "Idioma Base do Tour:", form_qty: "Quantidade de Ingressos:",
    form_date_time: "Data do Bloqueio Específica:", form_btn_link: "Gerar Link de Pagamento",
    form_btn_block: "Bloquear Vagas / Horários", tour_capacity: "Capacidade Máxima de Vagas:",
    guide_assigned: "Guia Escalado:", no_guide: "Sem guia atribuído", registered_guides: "Equipe de Guias",
    form_new_guide: "Cadastrar Novo Guia", form_guide_name: "Nome e Sobrenome:", form_guide_email: "E-mail do Guia:",
    form_guide_whatsapp: "WhatsApp (Obrigatório):", form_guide_photo: "Foto do Guia:", btn_add_guide: "Salvar Guia",
    registered_guides_list: "Guias Cadastrados", upcoming_tours_list: "Próximos Tours Agendados", filter_today: "Hoje",
    int_subtitle: "Conecte seus canais de venda para puxar as reservas de forma automática.",
    int_connected: "Conectado", int_configure: "Configurar Conexão", int_connect: "Vincular Conta",
    int_desc_viator: "Sincronize horários, vagas e passageiros.", int_desc_gyg: "Puxe reservas e atualize a disponibilidade.",
    int_desc_ta: "Importe suas avaliações e sincronize widgets.", int_desc_shopify: "Pedidos feitos no site caem aqui na hora.",
    int_custom_title: "Conectar Nova Plataforma via API", int_custom_name: "Nome da Plataforma:",
    int_custom_url: "Endpoint da API (URL):", int_custom_key: "Chave da API / Token de Acesso:",
    int_custom_btn: "Ativar Integração Customizada",
    block_days_week: "Dias da Semana Bloqueados Sempre (ex: 0, 1, 2):", block_select_hour: "Horário para Bloqueio:",
    view_1d: "1 dia", view_3d: "3 dias", view_7d: "7 dias", view_month: "Mês todo"
  },
  en: {
    menu_dashboard: "Dashboard", menu_agenda: "Central Agenda", menu_integrations: "Integrations",
    menu_guides: "Guides", menu_automations: "Automations", menu_settings: "Settings",
    dash_title: "Overview", dash_total_sales: "Total Sales", dash_vs_last_month: "in selected period",
    dash_revenue_confirmed: "Confirmed Revenue", dash_revenue_estimated: "Estimated Revenue",
    dash_canceled_tours: "Canceled Tours", dash_upcoming: "Upcoming Tours", dash_performance: "Tour Performance",
    dash_bookings: "bookings", agenda_title: "Centralized Agenda", integrations_title: "Platform Synchronization",
    guides_title: "Guides Management", automations_title: "Automations and Alerts", settings_title: "System Settings",
    created_by: "Created by Nathalia Simeão",
    period_1w: "1 week", period_15d: "15 days", period_30d: "30 days", period_60d: "60 days",
    period_90d: "90 days", period_120d: "120 days", period_6m: "6 months", period_1y: "1 year",
    period_custom: "Custom", date_from: "From", date_to: "To", btn_apply: "Apply",
    source_site: "Own Website", source_viator: "Viator", source_gyg: "GetYourGuide", source_manual: "Manual",
    modal_sales_details: "Sales Breakdown", modal_confirmed_details: "Confirmed Revenue Breakdown",
    modal_estimated_details: "Estimated Revenue Breakdown", modal_canceled_details: "Cancellation Details",
    modal_upcoming_details: "Upcoming Tours List", views: "views", btn_format: "Shape",
    form_new_booking: "Insert New Booking", form_new_block: "Insert Manual Block",
    form_select_tour: "Select Tour", form_customer: "Customer Name (Required):",
    form_email: "Email (Optional):", form_phone: "Phone / WhatsApp (Optional):",
    form_lang: "Tour Language:", form_qty: "Ticket Quantity:",
    form_date_time: "Specific Block Date:", form_btn_link: "Generate Payment Link",
    form_btn_block: "Block Slots / Times", tour_capacity: "Max Capacity Slots:",
    guide_assigned: "Assigned Guide:", no_guide: "No guide assigned", registered_guides: "Guides Staff",
    form_new_guide: "Register New Guide", form_guide_name: "Full Name:", form_guide_email: "Guide Email:",
    form_guide_whatsapp: "WhatsApp (Required):", form_guide_photo: "Guide Photo:", btn_add_guide: "Save Guide",
    registered_guides_list: "Registered Guides", upcoming_tours_list: "Upcoming Scheduled Tours", filter_today: "Today",
    int_subtitle: "Connect your sales channels to fetch bookings automatically.",
    int_connected: "Connected", int_configure: "Configure Connection", int_connect: "Link Account",
    int_desc_viator: "Sync schedules, availability, and travelers.", int_desc_gyg: "Fetch bookings and update availability.",
    int_desc_ta: "Reviews, ratings, photos and reputation content.", int_desc_shopify: "Website orders appear here instantly.",
    int_custom_title: "Connect New Platform via API", int_custom_name: "Platform Name:",
    int_custom_url: "API Endpoint (URL):", int_custom_key: "API Key / Access Token:",
    int_custom_btn: "Activate Custom Integration",
    block_days_week: "Always Blocked Weekdays (e.g., 0, 1, 2):", block_select_hour: "Time slot to Block:",
    view_1d: "1 day", view_3d: "3 days", view_7d: "7 days", view_month: "Full month"
  }
};

export const allPlatforms = [
  { key: "shopify", icon: "store", name: "Shopify Store",
    desc: { pt: "Pedidos do site caem aqui na hora. Canal de venda próprio.", en: "Website orders appear here instantly. Your own sales channel." },
    authType: "oauth", oauthLabel: "Entrar com Shopify", oauthUrl: "https://accounts.shopify.com/",
    docsUrl: "https://shopify.dev/docs/api/admin-rest" },
  { key: "viator", icon: "ticket", name: "Viator",
    desc: { pt: "Sincronize horários, vagas e passageiros automaticamente.", en: "Sync schedules, availability and travelers automatically." },
    authType: "api", oauthLabel: "Acessar Portal Viator", oauthUrl: "https://supplier.viator.com/",
    docsUrl: "https://docs.viator.com/partner-api/" },
  { key: "getyourguide", icon: "bookings", name: "GetYourGuide",
    desc: { pt: "Puxe reservas e atualize disponibilidade em tempo real.", en: "Fetch bookings and sync availability in real time." },
    authType: "api", oauthLabel: "Acessar Portal GYG", oauthUrl: "https://supplier.getyourguide.com/",
    docsUrl: "https://integrator.getyourguide.com/documentation/overview" },
  { key: "tripadvisor", icon: "star", name: "TripAdvisor",
    desc: { pt: "Conteúdo e reputação: reviews, ratings, fotos e dados de localização. As reservas de experiências são distribuídas pela Viator.", en: "Content and reputation: reviews, ratings, photos and location data. Experience bookings are distributed through Viator." },
    authType: "content", oauthLabel: "Acessar Tripadvisor", oauthUrl: "https://www.tripadvisor.com/Owners",
    docsUrl: "https://docs.terra.tripadvisor.com/docs/overview" },
  { key: "headout", icon: "globe", name: "Headout",
    desc: { pt: "Distribua seus tours para milhões de viajantes globais.", en: "Distribute your tours to millions of global travelers." },
    authType: "api", oauthLabel: "Acessar Portal Headout", oauthUrl: "https://www.headout.com/partner/login",
    docsUrl: "https://developer.headout.com/" },
  { key: "civitatis", icon: "building", name: "Civitatis",
    desc: { pt: "Alcance viajantes de língua hispânica. Sincronize atividades e reservas.", en: "Reach Spanish-speaking travelers. Sync activities and bookings." },
    authType: "api", oauthLabel: "Acessar Portal Civitatis", oauthUrl: "https://operadores.civitatis.com/",
    docsUrl: "https://www.civitatis.com/en/partners/" },
];

export const reservationPlatforms = allPlatforms.filter((platform) => platform.key !== "tripadvisor");
export const contentPlatforms = allPlatforms.filter((platform) => platform.key === "tripadvisor");

export const internalFields = [
  { key: "customerName",  label: "Nome do Cliente",        required: true,  desc: "Nome completo do passageiro" },
  { key: "tourId",        label: "ID do Tour / Produto",   required: true,  desc: "Identificador do passeio no sistema PMY" },
  { key: "startTime",     label: "Data e Hora de Início",  required: true,  desc: "Data e horário de saída do tour" },
  { key: "status",        label: "Status da Reserva",      required: true,  desc: "Estado: CONFIRMED / CANCELED / PENDING" },
  { key: "email",         label: "E-mail do Cliente",      required: false, desc: "Contato do passageiro" },
  { key: "phone",         label: "Telefone / WhatsApp",    required: false, desc: "Número com DDI" },
  { key: "quantity",      label: "Qtd. de Ingressos",      required: true,  desc: "Total de tickets (por variante)" },
  { key: "price",         label: "Valor Total Pago",       required: false, desc: "Preço final da reserva" },
  { key: "currency",      label: "Moeda",                  required: false, desc: "EUR, USD, BRL, etc." },
  { key: "bookingRef",    label: "Referência da Reserva",  required: true,  desc: "ID único da reserva na plataforma" },
  { key: "language",      label: "Idioma do Tour",         required: false, desc: "Língua solicitada pelo cliente" },
];

export const defaultMappings = {
  viator: {
    customerName: "passengerFirstName + passengerLastName", tourId: "productCode",
    startTime: "travelDate + departureTime", status: "bookingStatus",
    email: "passengerEmail", phone: "passengerPhone", quantity: "noOfTravelers",
    price: "totalPrice.amount", currency: "totalPrice.currency", bookingRef: "bookingRef", language: "languageGuide.language",
  },
  getyourguide: {
    customerName: "travelers[0].firstName + travelers[0].lastName", tourId: "productId",
    startTime: "dateTime", status: "reserve → book → cancel",
    email: "travelers[0].email", phone: "travelers[0].phoneNumber", quantity: "bookingItems[].count",
    price: "bookingItems[].retailPrice", currency: "currency", bookingRef: "gygBookingReference", language: "supplier option",
  },
  headout: {
    customerName: "firstName + lastName", tourId: "experienceId",
    startTime: "slotDate + slotStartTime", status: "bookingStatus",
    email: "customerEmail", phone: "customerPhone", quantity: "unitItems[adults].quantity",
    price: "priceDetails.totalAmount", currency: "priceDetails.currency", bookingRef: "headoutBookingId", language: "variantLanguage",
  },
  civitatis: {
    customerName: "unitItems[].contact.fullName / contact.fullName", tourId: "productId",
    startTime: "availabilityId → localDateTimeStart", status: "hold → confirm → cancel",
    email: "unitItems[].contact.emailAddress / contact.emailAddress",
    phone: "unitItems[].contact.phoneNumber / contact.phoneNumber",
    quantity: "unitItems[].unitId",
    price: "pricing.retail (capability pricing)", currency: "currency / availableCurrencies",
    bookingRef: "resellerReference", language: "contact.locales[0]",
  },
  shopify: {
    customerName: "customer.first_name + customer.last_name", tourId: "line_items[0].product_id",
    startTime: "line_items[0].properties.tour_date", status: "financial_status + fulfillment_status",
    email: "email", phone: "phone", quantity: "line_items[0].quantity",
    price: "total_price", currency: "currency", bookingRef: "order_number", language: "line_items[0].properties.language",
  },
};

export const DEFAULT_THEME = {
  bgColor: "#F4DCDC",
  surfaceColor: "#FFFFFF",
  inputBgColor: "#FFFFFF",
  primaryColor: "#006600",
  sidebarBg: "#FFFFFF",
  sidebarTextColor: "#2B2B2B",
  sidebarMutedTextColor: "#777777",
  sidebarHoverBg: "#F2F7F2",
  sidebarActiveBg: "#006600",
  sidebarActiveTextColor: "#FFFFFF",
  sidebarBorderColor: "#E7ECE7",
  fontFamily: "Assistant",
  fontSize: "14px",
  titleColor: "#006600",
  textColor: "#2B2B2B",
};

export function isDarkThemeColor(value) {
  const color = String(value || "").trim();

  const hexMatch = color.match(/^#([0-9a-f]{6})$/i);
  if (hexMatch) {
    const hex = hexMatch[1];
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
    return luminance < 0.48;
  }

  const shortHexMatch = color.match(/^#([0-9a-f]{3})$/i);
  if (shortHexMatch) {
    const hex = shortHexMatch[1];
    const r = parseInt(hex[0] + hex[0], 16);
    const g = parseInt(hex[1] + hex[1], 16);
    const b = parseInt(hex[2] + hex[2], 16);
    const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
    return luminance < 0.48;
  }

  return false;
}
