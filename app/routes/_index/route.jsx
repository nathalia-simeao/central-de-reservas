import { useState, useRef, useCallback, useEffect } from "react";
import { useLoaderData } from "react-router";
import { AppProvider } from "@shopify/shopify-app-react-router/react";

import DashboardTab from "../../components/pmy/DashboardTab";
import AgendaTab from "../../components/pmy/AgendaTab";
import IntegrationsTab from "../../components/pmy/IntegrationsTab";
import GuidesTab from "../../components/pmy/GuidesTab";
import AutomationsTab from "../../components/pmy/AutomationsTab";
import SettingsTab from "../../components/pmy/SettingsTab";
import MediaTab from "../../components/pmy/MediaTab";
import { Icon } from "../../components/pmy/PmyUI";

export { loader, action } from "../../services/central-route.server";


const getLisbonToday = () => {
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

const getFlagUrl = (iso2) => `https://flagcdn.com/w20/${iso2.toLowerCase()}.png`;

const getDraftOrderAttribution = () => {
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

const ddiList = [
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

const translations = {
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

const allPlatforms = [
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

const reservationPlatforms = allPlatforms.filter((platform) => platform.key !== "tripadvisor");
const contentPlatforms = allPlatforms.filter((platform) => platform.key === "tripadvisor");

const internalFields = [
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

const defaultMappings = {
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
    customerName: "nombre + apellidos", tourId: "id_actividad",
    startTime: "fecha_salida + hora_salida", status: "estado_reserva",
    email: "email_cliente", phone: "telefono_cliente", quantity: "adultos + ninos + bebes",
    price: "importe_total", currency: "divisa", bookingRef: "localizador", language: "idioma_tour",
  },
  shopify: {
    customerName: "customer.first_name + customer.last_name", tourId: "line_items[0].product_id",
    startTime: "line_items[0].properties.tour_date", status: "financial_status + fulfillment_status",
    email: "email", phone: "phone", quantity: "line_items[0].quantity",
    price: "total_price", currency: "currency", bookingRef: "order_number", language: "line_items[0].properties.language",
  },
};

const DEFAULT_THEME = {
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



// Componente de seleção de imagem com busca — usado como fallback do picker nativo
function PickerModalContent({ allImages, onSelect }) {
  const [search, setSearch] = useState("");
  const filtered = allImages.filter(img =>
    !search || (img.label || img.filename || "").toLowerCase().includes(search.toLowerCase())
  );
  return (
    <div>
      {/* Header */}
      <div className="pmy-ds-migrated-k855nz">
        Busque e clique em uma imagem para selecioná-la.
      </div>

      {/* Campo de busca */}
      <div className="pmy-ds-migrated-5ojkha">
        <span className="pmy-ds-migrated-w4fura"><Icon name="search" size={15} /></span>
        <input
          type="text"
          placeholder="Buscar por nome da imagem..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          autoFocus
          className="pmy-ds-migrated-bitygt"
          onFocus={e => e.target.style.borderColor = '#006600'}
          onBlur={e  => e.target.style.borderColor = '#ddd'}
        />
        {search && (
          <button onClick={() => setSearch("")}
            className="pmy-ds-migrated-142l1o3">×</button>
        )}
      </div>

      {/* Contador */}
      <div className="pmy-ds-migrated-16q5nnv">
        {filtered.length} de {allImages.length} imagens
        {search && <span> para "<strong>{search}</strong>"</span>}
      </div>

      {/* Grid */}
      <div className="pmy-ds-migrated-1j056d9">
        {filtered.map(img => (
          <div key={img.id || img.url} onClick={() => onSelect(img.url)}
            className="pmy-ds-migrated-1vqm17k"
            onMouseOver={e => e.currentTarget.style.borderColor = '#006600'}
            onMouseOut={e  => e.currentTarget.style.borderColor = '#eee'}>
            <img src={img.url} alt={img.label || img.filename}
              className="pmy-ds-migrated-1595bs8"
              onError={e => { e.target.style.display='none'; }} />
            <div className="pmy-ds-migrated-1b43wd">
              {img.label || img.filename || "Sem nome"}
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="pmy-ds-migrated-1otk903">
            {search ? `Nenhuma imagem encontrada para "${search}"` : "Nenhuma imagem disponível. Clique em Abrir Biblioteca acima."}
          </div>
        )}
      </div>
    </div>
  );
}

function isDarkThemeColor(value) {
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

function CentralDeReservasContent() {
  const { tours, bookings, blockedDates = [], shopifyProducts = [], shopName = "Minha Loja Shopify", shopifyStaff = [], mediaFiles = [], shopifyImages = [], dbGuides = [], guideAssignments = [], shopifyWebhookStatus = null, gygIntegrationStatus = null, integrationCredentialStatus = null, businessSettings = null, platformFieldMappings = [] } = useLoaderData() || { tours: [], bookings: [], blockedDates: [], shopifyProducts: [], shopName: "Minha Loja Shopify", shopifyStaff: [], mediaFiles: [], shopifyImages: [], dbGuides: [], guideAssignments: [], shopifyWebhookStatus: null, gygIntegrationStatus: null, integrationCredentialStatus: null, businessSettings: null, platformFieldMappings: [] };
  // Abre modal interno de seleção de imagem (picker interno com busca)
  const openShopifyFilePicker = useCallback((onSelect) => {
    // Armazena callback para usar quando usuário selecionar
    window.__pmyPickerCallback = onSelect;
    setActiveModal('pickPhotoForGuide');
  }, []);

  // A. NAVEGAÇÃO
  const [activeTab, setActiveTab] = useState("dashboard");
  const [lang, setLang] = useState("pt");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try { return localStorage.getItem("pmy_sidebar_collapsed") === "1"; } catch { return false; }
  });
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [imageShape, setImageShape] = useState(
    ["circle", "rounded"].includes(businessSettings?.imageShape)
      ? businessSettings.imageShape
      : "rounded",
  );
  const [activeModal, setActiveModal] = useState(null);
  const [openCategories, setOpenCategories] = useState(["Day Trips", "Walking Tours"]);

  // Identidade visual persistente do negócio.
  // A logo para fundo claro e a versão para fundo escuro ficam no banco.
  const [logoOnLightUrl, setLogoOnLightUrl] = useState(
    businessSettings?.logoOnLightUrl || businessSettings?.logoUrl || null,
  );
  const [logoOnDarkUrl, setLogoOnDarkUrl] = useState(
    businessSettings?.logoOnDarkUrl || null,
  );
  const [logoUploadingVariant, setLogoUploadingVariant] = useState(null);
  const [theme, setTheme] = useState({
    ...DEFAULT_THEME,
    ...(businessSettings?.theme && typeof businessSettings.theme === "object"
      ? businessSettings.theme
      : {}),
  });
  const [settingsSaveMessage, setSettingsSaveMessage] = useState("");
  const settingsSaveTimerRef = useRef(null);
  const settingsMessageTimerRef = useRef(null);

  const sidebarIsDark = isDarkThemeColor(theme.sidebarBg);
  const activeSidebarLogoUrl = sidebarIsDark
    ? (logoOnDarkUrl || logoOnLightUrl)
    : (logoOnLightUrl || logoOnDarkUrl);
  const autoWhiteSidebarLogo =
    sidebarIsDark && !logoOnDarkUrl && Boolean(logoOnLightUrl);

  // B. FILTROS DASHBOARD
  const [isDateMenuOpen, setIsDateMenuOpen] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState("period_30d");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");

  // C. FORMULÁRIO DE RESERVAS
  const [custName, setCustName] = useState("");
  const [custEmail, setCustEmail] = useState("");
  const [custPhone, setCustPhone] = useState("");
  const [custLang, setCustLang] = useState("Português");
  const [selectedTour, setSelectedTour] = useState("");
  const [tourVariants, setTourVariants] = useState({ adulto: 0, jovem: 0, crianca: 0, senior: 0 });
  const [activeProductVariants, setActiveProductVariants] = useState(["adulto", "jovem", "crianca", "senior"]);
  const [activeTourLanguages, setActiveTourLanguages] = useState(["Português", "English"]);
  const [generatedLink, setGeneratedLink] = useState("");
  const [bookingDate, setBookingDate] = useState("");
  const [bookingTime, setBookingTime] = useState("");
  const [draftOrderLoading, setDraftOrderLoading] = useState(false);
  const [draftOrderError, setDraftOrderError] = useState("");
  const [draftOrderInfo, setDraftOrderInfo] = useState(null);
  const [bookingPlatforms, setBookingPlatforms] = useState(["shopify"]);  // plataformas da reserva
  const [blockPlatforms, setBlockPlatforms] = useState(["shopify", "viator", "getyourguide", "headout", "civitatis"]); // apenas canais reais de reserva

  // D. BLOQUEIOS MANUAIS
  const [blockTourId, setBlockTourId] = useState("");
  const [blockDateTime, setBlockDateTime] = useState("");
  const [blockRecurringDays, setBlockRecurringDays] = useState("");
  const [blockSelectedHour, setBlockSelectedHour] = useState("ALL");
  const [tourAvailableHours, setTourAvailableHours] = useState(["09:00", "14:00"]);
  const [blockSaving, setBlockSaving] = useState(false);
  const [blockMessage, setBlockMessage] = useState("");

  // E. MODAL DO CALENDÁRIO
  const [modalSelectedTour, setModalSelectedTour] = useState("");
  const [modalAvailableHours, setModalAvailableHours] = useState(["09:00", "14:00"]);
  const [modalSelectedHour, setModalSelectedHour] = useState("09:00");
  const [modalSelectedGuide, setModalSelectedGuide] = useState("");
  const [guideAssignmentSaving, setGuideAssignmentSaving] = useState(false);
  const [guideAssignmentMessage, setGuideAssignmentMessage] = useState("");
  const [guideAssignmentsList, setGuideAssignmentsList] = useState(guideAssignments || []);
  const [isFormAllocating, setIsFormAllocating] = useState(false);

  // F. NAVEGAÇÃO DO CALENDÁRIO
  // A Agenda abre sempre no mês/dia atual de Portugal, nunca em uma data fixa.
  const [currentMonth, setCurrentMonth] = useState(() => getLisbonToday().monthIndex);
  const [currentYear, setCurrentYear] = useState(() => getLisbonToday().year);
  const [calendarView, setCalendarView] = useState("month");
  const [selectedCalendarDay, setSelectedCalendarDay] = useState(() => getLisbonToday().day);

  // G. GUIAS E CAPACIDADE
  const [tourCapacities, setTourCapacities] = useState(() =>
    Object.fromEntries(
      (tours || []).map(tour => [
        tour.shopifyProductId || tour.id,
        Number(tour.maxCapacity ?? 20),
      ]),
    ),
  );
  const [guideName, setGuideName] = useState("");
  const [guideEmail, setGuideEmail] = useState("");
  const [guideDdi, setGuideDdi] = useState("+351");
  const [guideWhatsapp, setGuideWhatsapp] = useState("");
  const [guidePhoto, setGuidePhoto] = useState(null);
  // Guias vêm do banco (dinâmico) — fallback para lista vazia se banco vazio
  const [guidesList, setGuidesList] = useState(
    dbGuides.length > 0
      ? dbGuides.map(g => ({ id: g.id, name: g.name, email: g.email || "", whatsapp: g.whatsapp, photo: g.photoUrl || "https://via.placeholder.com/150", utmId: g.utmId || "", referralLink: g.referralLink || "" }))
      : []
  );
  const [selectedGuideInfo, setSelectedGuideInfo] = useState(null);
  const [upcomingToursFilter, setUpcomingToursFilter] = useState("7d");
  const [guideUtmId, setGuideUtmId] = useState("");        // campo UTM no form de cadastro
  const [editGuideUtmId, setEditGuideUtmId] = useState(""); // campo UTM no form de edição
  const [editingGuide, setEditingGuide] = useState(null);
  const [editGuideName, setEditGuideName] = useState("");
  const [editGuideEmail, setEditGuideEmail] = useState("");
  const [editGuideDdi, setEditGuideDdi] = useState("+351");
  const [editGuideWhatsapp, setEditGuideWhatsapp] = useState("");
  const [editGuidePhoto, setEditGuidePhoto] = useState(null);
  const editGuidePhotoRef = useRef(null);

  // H. INTEGRAÇÕES CUSTOMIZADAS
  const [customName, setCustomName] = useState("");

  // BANCO DE MÍDIA
  // O loader já devolve a biblioteca canônica consolidada no PostgreSQL.
  const [mediaList, setMediaList] = useState(mediaFiles);
  const [showShopifySource, setShowShopifySource] = useState(true);
  const [photoPickerTarget, setPhotoPickerTarget] = useState(null); // 'guide_add' | 'guide_edit'
  const [mediaFilter, setMediaFilter] = useState("all"); // all | logo | guide | tour | general
  const [mediaUploading, setMediaUploading] = useState(false);
  const [mediaUploadProgress, setMediaUploadProgress] = useState(0);
  const [mediaUploadError, setMediaUploadError] = useState("");
  const [mediaLabelInput, setMediaLabelInput] = useState("");
  const [mediaCategoryInput, setMediaCategoryInput] = useState("general");
  const [mediaPreview, setMediaPreview] = useState(null); // modal de preview
  const mediaUploadRef = useRef(null);
  const [customUrl, setCustomUrl] = useState("");
  const [customKey, setCustomKey] = useState("");
  const [customIntegrations, setCustomIntegrations] = useState([]);
  const [intSubTab, setIntSubTab] = useState("conexoes"); // "conexoes" | "produtos" | "logs"
  const [activeProdPlatform, setActiveProdPlatform] = useState("shopify");
  const [manualSyncPlatform, setManualSyncPlatform] = useState(null);
  const [manualSyncResult, setManualSyncResult] = useState(null);
  const [manualSyncError, setManualSyncError] = useState("");
  const [syncQueueData, setSyncQueueData] = useState({ stats: null, jobs: [] });
  const [syncQueueLoading, setSyncQueueLoading] = useState(false);
  const [syncQueueError, setSyncQueueError] = useState("");
  const [syncQueueActionId, setSyncQueueActionId] = useState(null);
  const [syncQueueLastLoaded, setSyncQueueLastLoaded] = useState(null);
  const [shopifyValidation, setShopifyValidation] = useState(null);
  const [shopifyValidationLoading, setShopifyValidationLoading] = useState(false);
  const [shopifyValidationCancelLoading, setShopifyValidationCancelLoading] = useState(false);
  const [shopifyValidationError, setShopifyValidationError] = useState("");
  // platformProducts: Shopify vem do loader (dados reais).
  // Demais plataformas ficam vazias até que a integração via API seja configurada.
  const [platformProducts, setPlatformProducts] = useState({
    shopify:      shopifyProducts,  // dados reais da sua loja Shopify
    viator:       [],               // preenchido após conectar Viator API
    getyourguide: [],               // preenchido após conectar GYG API
    headout:      [],               // preenchido após conectar Headout API
    civitatis:    [],               // preenchido após conectar Civitatis API
  });

  // I. CONEXÕES DE PLATAFORMAS
  // Uma credencial salva não significa "canal conectado". Viator/Civitatis
  // só ficam conectados depois que a Supplier API recebe tráfego autenticado real.
  const initialSecretByProvider = Object.fromEntries(
    (integrationCredentialStatus?.statuses || []).map((item) => [
      String(item.provider || "").toUpperCase(),
      item,
    ]),
  );
  const formatCredentialCheck = (value) => {
    if (!value) return null;
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return null;
    return parsed.toLocaleString("pt-PT", {
      dateStyle: "short",
      timeStyle: "short",
    });
  };
  const providerConnectionFromStatus = (provider, environmentConfigured = false) => {
    const record = initialSecretByProvider[provider] || null;
    return {
      connected: record?.status === "CONNECTED",
      configured: Boolean(record?.hasCredential || environmentConfigured),
      status: record?.status || (environmentConfigured ? "CONFIGURED" : null),
      validationError:
        record?.status === "ERROR" ||
        String(record?.lastValidationStatus || "").toUpperCase() === "ERROR",
      credentialSource: record?.hasCredential ? "ENCRYPTED" : environmentConfigured ? "ENV" : null,
      lastValidationStatus: record?.lastValidationStatus || null,
      lastValidationMessage: record?.lastValidationMessage || null,
      lastValidatedAt: record?.lastValidatedAt || null,
      lastSync: formatCredentialCheck(record?.lastValidatedAt) || null,
      fingerprint: record?.credentialFingerprint || null,
      environment: record?.environment || null,
    };
  };
  const [platformConnections, setPlatformConnections] = useState({
    shopify: {
      connected: true,
      configured: true,
      accountName: shopName,
      lastSync: new Date().toLocaleTimeString("pt-PT", {hour:"2-digit",minute:"2-digit"}),
    },
    viator: providerConnectionFromStatus(
      "VIATOR",
      Boolean(integrationCredentialStatus?.environment?.viator?.configured),
    ),
    getyourguide: {
      connected: Boolean(gygIntegrationStatus?.credentialsReady),
      configured: Boolean(gygIntegrationStatus?.credentialsReady),
      accountName: "PMY Supplier API v1",
      lastSync: gygIntegrationStatus?.credentialsReady ? "Pronto para testes" : "Credenciais pendentes",
    },
    tripadvisor: {
      connected: false,
      configured: false,
      contentOnly: true,
      accountName: "Tripadvisor Terra",
      lastSync: "Não é canal de reservas",
    },
    headout: {
      connected: false,
      configured: false,
      available: false,
      onboardingPending: true,
    },
    civitatis: providerConnectionFromStatus(
      "CIVITATIS",
      Boolean(integrationCredentialStatus?.environment?.civitatis?.configured),
    ),
  });
  const [connectingPlatform, setConnectingPlatform] = useState(null);
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [apiSecretInput, setApiSecretInput] = useState("");
  const [integrationEnvironmentInput, setIntegrationEnvironmentInput] = useState("test");
  const [integrationCredentialMessage, setIntegrationCredentialMessage] = useState("");
  const [integrationCredentialLoading, setIntegrationCredentialLoading] = useState(false);

  // Configuração GetYourGuide Supplier API v1 (sem armazenar credenciais no browser)
  const [gygConfigTourId, setGygConfigTourId] = useState("");
  const [gygConfigActivityId, setGygConfigActivityId] = useState("");
  const [gygConfigSchedule, setGygConfigSchedule] = useState("");
  const [gygConfigTimezone, setGygConfigTimezone] = useState("Europe/Lisbon");
  const [gygConfigCutoff, setGygConfigCutoff] = useState("");
  const [gygConfigPriceOverApi, setGygConfigPriceOverApi] = useState(false);
  const [gygConfigMessage, setGygConfigMessage] = useState("");
  const [gygConfigSaving, setGygConfigSaving] = useState(false);

  // J. MAPEAMENTO DE CAMPOS (NOVO)
  const [fieldMappings, setFieldMappings] = useState(() => {
    const persistedByPlatform = Object.fromEntries(
      (platformFieldMappings || []).map((item) => [
        String(item.platform || "").toLowerCase(),
        item.mappings && typeof item.mappings === "object" ? item.mappings : {},
      ]),
    );

    return {
      ...defaultMappings,
      ...persistedByPlatform,
    };
  });
  const [mappingSaveState, setMappingSaveState] = useState({ platform: null, status: "idle", message: "" });
  const [activeMappingPlatform, setActiveMappingPlatform] = useState("viator");

  const logoLightInputRef = useRef(null);
  const logoDarkInputRef = useRef(null);
  const guidePhotoRef = useRef(null);
  const t = translations[lang] || translations.pt;
  const ui = (pt, en) => lang === "en" ? en : pt;
  const navItems = [
    { key: "dashboard", icon: "dashboard", label: lang === "pt" ? "Dashboard" : "Dashboard" },
    { key: "agenda", icon: "calendar", label: lang === "pt" ? "Agenda Central" : "Central Agenda" },
    { key: "integracoes", icon: "link", label: lang === "pt" ? "Integrações" : "Integrations" },
    { key: "guias", icon: "users", label: lang === "pt" ? "Guias" : "Guides" },
    { key: "automacoes", icon: "automation", label: lang === "pt" ? "Automações" : "Automations" },
    { key: "midias", icon: "media", label: lang === "pt" ? "Banco de Mídias" : "Media Library" },
  ];

  const openNavigationTab = (key) => {
    if (key === "agenda") handleOpenAgenda();
    else setActiveTab(key);
    setMobileNavOpen(false);
  };

  const toggleSidebar = () => {
    setSidebarCollapsed((current) => {
      const next = !current;
      try { localStorage.setItem("pmy_sidebar_collapsed", next ? "1" : "0"); } catch {}
      return next;
    });
  };

  const ptMonths = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
  const enMonths = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  const currentMonthLabel = lang === 'pt' ? ptMonths[currentMonth] : enMonths[currentMonth];

  const getPeriodLabel = () => {
    if (selectedPeriod === "period_custom" && customStart && customEnd) {
      const fmt = (d) => new Date(d).toLocaleDateString(lang === 'pt' ? 'pt-BR' : 'en-US');
      return `${fmt(customStart)} - ${fmt(customEnd)}`;
    }
    return t[selectedPeriod] || t.period_30d;
  };

  // Dashboard financeiro calculado somente com dados reais persistidos em Booking.
  const dashboardNow = new Date();

  const dashboardPeriodRange = (() => {
    if (selectedPeriod === "period_custom" && customStart && customEnd) {
      const start = new Date(`${customStart}T00:00:00`);
      const end = new Date(`${customEnd}T23:59:59.999`);
      return { start, end };
    }

    const end = new Date(dashboardNow);
    const start = new Date(dashboardNow);

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
  })();

  const bookingStatus = (booking) => String(booking?.status || "").toUpperCase();
  const bookingCreatedAt = (booking) => new Date(booking?.externalCreatedAt || booking?.createdAt || 0);
  const bookingUpdatedAt = (booking) => new Date(booking?.externalUpdatedAt || booking?.updatedAt || booking?.createdAt || 0);
  const isInDashboardRange = (date) =>
    date instanceof Date &&
    !Number.isNaN(date.getTime()) &&
    date >= dashboardPeriodRange.start &&
    date <= dashboardPeriodRange.end;

  const periodBookings = (bookings || []).filter((booking) =>
    isInDashboardRange(bookingCreatedAt(booking))
  );
  const realConfirmedBookings = periodBookings.filter(
    (booking) => bookingStatus(booking) === "CONFIRMED"
  );
  const realCanceledBookings = (bookings || []).filter((booking) =>
    ["CANCELED", "CANCELLED"].includes(bookingStatus(booking)) &&
    isInDashboardRange(bookingUpdatedAt(booking))
  );

  const dashboardBookingStatusSummary = periodBookings.reduce(
    (summary, booking) => {
      const status = bookingStatus(booking);
      const startTime = new Date(booking?.startTime || 0);
      const hasValidStart = !Number.isNaN(startTime.getTime());

      if (["CANCELED", "CANCELLED"].includes(status)) {
        summary.canceled += 1;
      } else if (status === "PENDING") {
        summary.pending += 1;
      } else if (["COMPLETED", "COMPLETE", "FINISHED"].includes(status)) {
        summary.completed += 1;
      } else if (status === "CONFIRMED") {
        if (hasValidStart && startTime < dashboardNow) summary.completed += 1;
        else summary.confirmed += 1;
      } else {
        summary.unclassified += 1;
      }

      return summary;
    },
    { confirmed: 0, pending: 0, canceled: 0, completed: 0, unclassified: 0 },
  );

  dashboardBookingStatusSummary.total =
    dashboardBookingStatusSummary.confirmed +
    dashboardBookingStatusSummary.pending +
    dashboardBookingStatusSummary.canceled +
    dashboardBookingStatusSummary.completed;

  const moneyValue = (booking) => {
    if (booking?.totalPrice === null || booking?.totalPrice === undefined || booking?.totalPrice === "") return null;
    const parsed = Number(booking.totalPrice);
    return Number.isFinite(parsed) ? parsed : null;
  };
  const bookingCurrency = (booking) => String(booking?.currency || "").trim().toUpperCase();

  const revenueByCurrency = realConfirmedBookings.reduce((totals, booking) => {
    const amount = moneyValue(booking);
    const currency = bookingCurrency(booking);
    if (amount === null || !currency) return totals;
    totals[currency] = (totals[currency] || 0) + amount;
    return totals;
  }, {});

  const revenueCurrencies = Object.keys(revenueByCurrency);
  const dashboardCurrency = revenueCurrencies.includes("EUR")
    ? "EUR"
    : (revenueCurrencies[0] || "EUR");
  const confirmedRevenueValue = revenueByCurrency[dashboardCurrency] || 0;
  const pricedConfirmedBookings = realConfirmedBookings.filter(
    (booking) => moneyValue(booking) !== null && bookingCurrency(booking) === dashboardCurrency
  );
  const missingFinancialBookings = realConfirmedBookings.filter(
    (booking) => moneyValue(booking) === null || !bookingCurrency(booking)
  );
  const averageTicketValue = pricedConfirmedBookings.length > 0
    ? confirmedRevenueValue / pricedConfirmedBookings.length
    : 0;

  const formatMoney = (amount, currency = dashboardCurrency) => {
    if (!Number.isFinite(Number(amount))) return "—";
    try {
      return new Intl.NumberFormat(lang === "pt" ? "pt-PT" : "en-GB", {
        style: "currency",
        currency: currency || "EUR",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(Number(amount));
    } catch {
      return `${currency || "EUR"} ${Number(amount).toFixed(2)}`;
    }
  };

  const platformLabel = (platform) => ({
    SHOPIFY: "Shopify",
    GETYOURGUIDE: "GetYourGuide",
    VIATOR: "Viator",
    CIVITATIS: "Civitatis",
    HEADOUT: "Headout",
    MANUAL: lang === "pt" ? "Manual" : "Manual",
    CENTRAL: "Central PMY",
  }[String(platform || "").toUpperCase()] || String(platform || "Outro"));

  const salesByChannel = Object.values(
    realConfirmedBookings.reduce((groups, booking) => {
      const platform = String(booking?.platform || "OTHER").toUpperCase();
      if (!groups[platform]) {
        groups[platform] = {
          platform,
          label: platformLabel(platform),
          bookings: 0,
          passengers: 0,
          revenueByCurrency: {},
          missingValue: 0,
        };
      }

      const group = groups[platform];
      group.bookings += 1;
      group.passengers += Number(booking?.totalParticipants || 0);

      const amount = moneyValue(booking);
      const currency = bookingCurrency(booking);
      if (amount === null || !currency) {
        group.missingValue += 1;
      } else {
        group.revenueByCurrency[currency] =
          (group.revenueByCurrency[currency] || 0) + amount;
      }

      return groups;
    }, {})
  ).sort((a, b) => b.bookings - a.bookings);

  const totalSalesCount = realConfirmedBookings.length;

  // Série temporal real do Dashboard. A granularidade muda automaticamente
  // conforme a amplitude do período selecionado.
  const dashboardRangeDays = Math.max(
    1,
    Math.ceil(
      (dashboardPeriodRange.end.getTime() - dashboardPeriodRange.start.getTime()) /
        (24 * 60 * 60 * 1000),
    ),
  );
  const dashboardTrendGranularity =
    dashboardRangeDays <= 31
      ? "day"
      : dashboardRangeDays <= 150
        ? "week"
        : "month";

  const dateOnly = (value) =>
    new Date(value.getFullYear(), value.getMonth(), value.getDate());

  const startOfWeek = (value) => {
    const result = dateOnly(value);
    const mondayOffset = (result.getDay() + 6) % 7;
    result.setDate(result.getDate() - mondayOffset);
    return result;
  };

  const startOfMonth = (value) =>
    new Date(value.getFullYear(), value.getMonth(), 1);

  const bucketStartForDate = (value, granularity) => {
    if (granularity === "week") return startOfWeek(value);
    if (granularity === "month") return startOfMonth(value);
    return dateOnly(value);
  };

  const bucketKeyForDate = (value, granularity) => {
    const start = bucketStartForDate(value, granularity);
    return [
      start.getFullYear(),
      String(start.getMonth() + 1).padStart(2, "0"),
      String(start.getDate()).padStart(2, "0"),
    ].join("-");
  };

  const compactDateLabel = (value, withYear = false) =>
    new Intl.DateTimeFormat(lang === "pt" ? "pt-PT" : "en-GB", {
      day: "2-digit",
      month: "short",
      ...(withYear ? { year: "2-digit" } : {}),
    })
      .format(value)
      .replace(".", "");

  const monthLabel = (value) =>
    new Intl.DateTimeFormat(lang === "pt" ? "pt-PT" : "en-GB", {
      month: "short",
      year: "2-digit",
    })
      .format(value)
      .replace(".", "");

  const trendBuckets = new Map();
  let trendCursor = bucketStartForDate(
    dashboardPeriodRange.start,
    dashboardTrendGranularity,
  );
  const trendRangeEnd = dateOnly(dashboardPeriodRange.end);

  let trendGuard = 0;
  while (trendCursor <= trendRangeEnd && trendGuard < 500) {
    const start = new Date(trendCursor);
    const key = bucketKeyForDate(start, dashboardTrendGranularity);
    let label = compactDateLabel(start, dashboardRangeDays > 365);
    let fullLabel = label;

    if (dashboardTrendGranularity === "week") {
      const end = new Date(start);
      end.setDate(end.getDate() + 6);
      label = compactDateLabel(start);
      fullLabel = `${compactDateLabel(start, true)} – ${compactDateLabel(end, true)}`;
    } else if (dashboardTrendGranularity === "month") {
      label = monthLabel(start);
      fullLabel = new Intl.DateTimeFormat(lang === "pt" ? "pt-PT" : "en-GB", {
        month: "long",
        year: "numeric",
      }).format(start);
    } else {
      fullLabel = new Intl.DateTimeFormat(lang === "pt" ? "pt-PT" : "en-GB", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      }).format(start);
    }

    trendBuckets.set(key, {
      key,
      label,
      fullLabel,
      bookings: 0,
      revenue: 0,
    });

    if (dashboardTrendGranularity === "month") {
      trendCursor = new Date(
        trendCursor.getFullYear(),
        trendCursor.getMonth() + 1,
        1,
      );
    } else if (dashboardTrendGranularity === "week") {
      const next = new Date(trendCursor);
      next.setDate(next.getDate() + 7);
      trendCursor = next;
    } else {
      const next = new Date(trendCursor);
      next.setDate(next.getDate() + 1);
      trendCursor = next;
    }
    trendGuard += 1;
  }

  for (const booking of realConfirmedBookings) {
    const createdAt = bookingCreatedAt(booking);
    if (Number.isNaN(createdAt.getTime())) continue;

    const bucketKey = bucketKeyForDate(
      createdAt,
      dashboardTrendGranularity,
    );
    const bucket = trendBuckets.get(bucketKey);
    if (!bucket) continue;

    bucket.bookings += 1;

    const amount = moneyValue(booking);
    const currency = bookingCurrency(booking);
    if (
      amount !== null &&
      currency &&
      currency === dashboardCurrency
    ) {
      bucket.revenue += amount;
    }
  }

  const dashboardTrendData = [...trendBuckets.values()];

  const canceledCount = realCanceledBookings.length;
  const cancellationBase = totalSalesCount + canceledCount;
  const cancellationRate = cancellationBase > 0
    ? (canceledCount / cancellationBase) * 100
    : 0;

  const upcomingLimit = new Date(dashboardNow);
  upcomingLimit.setDate(upcomingLimit.getDate() + 30);
  const upcomingBookings = (bookings || [])
    .filter((booking) => {
      const status = bookingStatus(booking);
      const start = new Date(booking?.startTime);
      return ["CONFIRMED", "PENDING"].includes(status) &&
        !Number.isNaN(start.getTime()) &&
        start >= dashboardNow &&
        start <= upcomingLimit;
    })
    .sort((a, b) => new Date(a.startTime) - new Date(b.startTime));

  const upcomingDepartureMap = new Map();
  for (const booking of upcomingBookings) {
    const start = new Date(booking.startTime);
    const key = `${booking.tourId}|${start.toISOString()}`;
    if (!upcomingDepartureMap.has(key)) {
      upcomingDepartureMap.set(key, {
        key,
        tourId: booking.tourId,
        startTime: start,
        bookings: 0,
        passengers: 0,
        platforms: new Set(),
      });
    }
    const departure = upcomingDepartureMap.get(key);
    departure.bookings += 1;
    const explicitPassengers = Number(booking?.totalParticipants || 0);
    const fallbackPassengers =
      Number(booking?.adults || 0) +
      Number(booking?.children || 0) +
      Number(booking?.youths || 0) +
      Number(booking?.seniors || 0);
    departure.passengers += explicitPassengers > 0
      ? explicitPassengers
      : (fallbackPassengers > 0 ? fallbackPassengers : 1);
    departure.platforms.add(platformLabel(booking.platform));
  }
  const upcomingDepartures = [...upcomingDepartureMap.values()]
    .sort((a, b) => a.startTime - b.startTime);
  const upcomingCount = upcomingDepartures.length;

  // tourOptions: usa produtos do Shopify (reais) com todos os dados
  const tourOptions = shopifyProducts.length > 0
    ? shopifyProducts
        .filter(p => {
          const type = String(p.productType || "").toLowerCase();
          const title = String(p.name || "").toLowerCase();
          return !type.includes("internal") && !type.includes("operational") && !title.includes("rescheduling fee");
        })
        .map(p => ({
        id: p.id, title: p.name, price: p.price, priceRaw: p.priceRaw,
        masterTourId: (tours || []).find(mt => mt.shopifyProductId === p.id)?.id || null,
        maxCapacity: Number((tours || []).find(mt => mt.shopifyProductId === p.id)?.maxCapacity ?? 20),
        sku: p.sku, image: p.image, imageAlt: p.imageAlt,
        active: p.active, variants: p.variants, collections: p.collections,
        scheduleSlots: p.scheduleSlots, description: p.description,
      }))
    : (tours || []).map(t => ({
        id: t.id,
        masterTourId: t.id,
        title: t.title,
        price: null,
        sku: null,
        image: null,
        collections: [],
        scheduleSlots: t.scheduleSlots || [],
        variants: t.variants || [],
        maxCapacity: Number(t.maxCapacity ?? 20),
      }));

  const dashboardUpcomingDepartures = upcomingDepartures.map((departure) => {
    const canonicalTour = (tours || []).find((tour) => tour.id === departure.tourId) || null;
    const displayTour = tourOptions.find(
      (tour) => tour.masterTourId === departure.tourId || tour.id === departure.tourId,
    ) || null;

    const capacity = Math.max(
      0,
      Number(canonicalTour?.maxCapacity ?? displayTour?.maxCapacity ?? 20),
    );
    const availableSeats = Math.max(0, capacity - Number(departure.passengers || 0));

    return {
      key: departure.key,
      tourId: departure.tourId,
      tourTitle:
        displayTour?.title ||
        canonicalTour?.title ||
        (lang === "pt" ? "Tour sem título" : "Untitled tour"),
      image: displayTour?.image || null,
      imageAlt: displayTour?.imageAlt || displayTour?.title || canonicalTour?.title || "",
      startTime: departure.startTime.toISOString(),
      bookings: departure.bookings,
      passengers: departure.passengers,
      platforms: [...departure.platforms],
      capacity,
      capacitySource: canonicalTour?.capacitySource || "DEFAULT",
      availableSeats,
    };
  });

  // Categorias: agrupa pelas coleções do Shopify (dinâmico)
  const allCollections = [...new Set(
    tourOptions.flatMap(t => (t.collections || []).map(c => c.title))
  )].filter(Boolean);

  // Se não tiver coleções, fallback por nome
  const categoriesData = allCollections.length > 0
    ? allCollections.map(colName => ({
        name: colName,
        toursList: tourOptions.filter(t => (t.collections || []).some(c => c.title === colName))
      })).filter(c => c.toursList.length > 0)
    : [
        { name: "Day Trips", toursList: tourOptions.filter(t => !t.title.toLowerCase().includes("walking")) },
        { name: "Walking Tours", toursList: tourOptions.filter(t =>  t.title.toLowerCase().includes("walking")) },
      ];

    // ---- HANDLERS / sincronização ----
  const resourceUrl = useCallback((pathname) => {
    const current = new URL(window.location.href);
    const params = new URLSearchParams();

    // Nunca reaproveitar id_token/session da URL: os tokens Shopify são
    // curtos e precisam ser renovados a cada chamada autenticada.
    for (const key of ["shop", "host", "embedded"]) {
      const value = current.searchParams.get(key);
      if (value) params.set(key, value);
    }

    const query = params.toString();
    return query ? `${pathname}?${query}` : pathname;
  }, []);

  const requestResourceJson = useCallback(async (pathname, formData = null) => {
    // App Bridge v4 intercepta o fetch global e injeta automaticamente
    // um ID token Shopify atualizado em requisições same-origin.
    const response = await fetch(resourceUrl(pathname), {
      method: formData ? "POST" : "GET",
      body: formData || undefined,
      credentials: "include",
      headers: {
        Accept: "application/json",
        "X-Requested-With": "XMLHttpRequest",
      },
    });

    const contentType = String(response.headers.get("content-type") || "").toLowerCase();
    const bodyText = await response.text();

    if (!contentType.includes("application/json")) {
      const location = response.url || resourceUrl(pathname);
      if (/<!doctype|<html/i.test(bodyText)) {
        throw new Error(
          `A chamada autenticada foi redirecionada pelo Shopify (HTTP ${response.status}). Destino: ${location}`,
        );
      }
      throw new Error(
        bodyText?.slice(0, 220) ||
        `Resposta inesperada da integração (HTTP ${response.status}).`,
      );
    }

    let payload = {};
    try {
      payload = bodyText ? JSON.parse(bodyText) : {};
    } catch {
      throw new Error("A integração retornou JSON inválido.");
    }

    if (!response.ok || payload?.success === false) {
      throw new Error(
        payload?.error ||
        `A integração respondeu com HTTP ${response.status}.`,
      );
    }

    return payload;
  }, [resourceUrl]);

  const loadShopifyValidation = useCallback(async () => {
    try {
      const payload = await requestResourceJson("/api/shopify-validation");
      setShopifyValidation(payload);
      setShopifyValidationError("");
      return payload;
    } catch (error) {
      setShopifyValidationError(
        error?.message || "Erro ao consultar a validação Shopify.",
      );
      return null;
    }
  }, [requestResourceJson]);

  const startShopifyValidation = useCallback(async () => {
    setShopifyValidationLoading(true);
    setShopifyValidationError("");

    try {
      const formData = new FormData();
      formData.append("_action", "start");
      const payload = await requestResourceJson(
        "/api/shopify-validation",
        formData,
      );

      setShopifyValidation({
        success: true,
        exists: true,
        status: "WAITING",
        order: {
          id: payload?.test?.orderId || null,
          name: payload?.test?.orderName || null,
          financialStatus: payload?.test?.financialStatus || null,
        },
        draftOrder: {
          id: payload?.test?.draftOrderId || null,
          name: payload?.test?.draftOrderName || null,
        },
        slot: {
          tourId: payload?.test?.tourId || null,
          tourTitle: payload?.test?.tourTitle || null,
          date: payload?.test?.date || null,
          time: payload?.test?.time || null,
          startTime: payload?.test?.startTime || null,
          capacity: payload?.test?.capacity ?? null,
          occupiedBefore: payload?.test?.occupiedBefore ?? null,
          remainingBefore: payload?.test?.remainingBefore ?? null,
        },
        steps: {
          orderCreated: Boolean(payload?.test?.orderId),
          webhookReceived: false,
          bookingCreated: false,
          agendaReady: false,
          capacityReduced: false,
        },
      });

      window.setTimeout(loadShopifyValidation, 1800);
    } catch (error) {
      setShopifyValidationError(
        error?.message || "Erro ao iniciar o pedido de teste Shopify.",
      );
    } finally {
      setShopifyValidationLoading(false);
    }
  }, [loadShopifyValidation, requestResourceJson]);

  const cancelShopifyValidation = useCallback(async () => {
    const orderId = shopifyValidation?.order?.id;
    if (!orderId) {
      setShopifyValidationError("Nenhum pedido E2E Shopify disponível para cancelar.");
      return;
    }

    setShopifyValidationCancelLoading(true);
    setShopifyValidationError("");

    try {
      const formData = new FormData();
      formData.append("_action", "cancel");
      formData.append("orderId", orderId);

      const payload = await requestResourceJson(
        "/api/shopify-validation",
        formData,
      );

      setShopifyValidation(payload);
      window.setTimeout(loadShopifyValidation, 1800);
    } catch (error) {
      setShopifyValidationError(
        error?.message || "Erro ao cancelar o pedido de teste Shopify.",
      );
    } finally {
      setShopifyValidationCancelLoading(false);
    }
  }, [
    loadShopifyValidation,
    requestResourceJson,
    shopifyValidation?.order?.id,
  ]);

  const loadSyncQueue = useCallback(async () => {
    setSyncQueueLoading(true);
    try {
      const payload = await requestResourceJson("/api/sync-queue");
      setSyncQueueData({
        stats: payload.stats || null,
        jobs: Array.isArray(payload.jobs) ? payload.jobs : [],
      });
      setSyncQueueError("");
      setSyncQueueLastLoaded(new Date());
    } catch (error) {
      setSyncQueueError(error?.message || "Erro ao carregar o log de sincronização.");
    } finally {
      setSyncQueueLoading(false);
    }
  }, [requestResourceJson]);

  useEffect(() => {
    if (activeTab !== "integracoes" || intSubTab !== "logs") return undefined;

    loadSyncQueue();
    loadShopifyValidation();

    const queueTimer = window.setInterval(loadSyncQueue, 15000);
    const validationTimer = window.setInterval(() => {
      loadShopifyValidation();
    }, ["WAITING", "CANCELLATION_WAITING"].includes(shopifyValidation?.status) ? 3000 : 15000);

    return () => {
      window.clearInterval(queueTimer);
      window.clearInterval(validationTimer);
    };
  }, [
    activeTab,
    intSubTab,
    loadShopifyValidation,
    loadSyncQueue,
    shopifyValidation?.status,
  ]);

  const runSyncQueueNow = async () => {
    setSyncQueueActionId("run");
    try {
      const formData = new FormData();
      formData.append("_action", "run");
      formData.append("limit", "30");
      await requestResourceJson("/api/sync-queue", formData);
      setSyncQueueError("");
      await loadSyncQueue();
    } catch (error) {
      setSyncQueueError(error?.message || "Erro ao processar a fila.");
    } finally {
      setSyncQueueActionId(null);
    }
  };

  const handleRequeueSyncJob = async (jobId) => {
    setSyncQueueActionId(jobId);
    try {
      const formData = new FormData();
      formData.append("_action", "requeue");
      formData.append("jobId", jobId);
      await requestResourceJson("/api/sync-queue", formData);

      const runData = new FormData();
      runData.append("_action", "run");
      runData.append("limit", "10");
      await requestResourceJson("/api/sync-queue", runData);

      setSyncQueueError("");
      await loadSyncQueue();
    } catch (error) {
      setSyncQueueError(error?.message || "Erro ao reenviar a sincronização.");
    } finally {
      setSyncQueueActionId(null);
    }
  };

  const handleSyncPlatformNow = async (platformKey) => {
    setManualSyncPlatform(platformKey);
    setManualSyncError("");
    setManualSyncResult(null);

    try {
      const formData = new FormData();
      formData.append("platform", platformKey);

      const payload = await requestResourceJson("/api/manual-sync", formData);
      const result = payload.result || null;
      setManualSyncResult(result);

      if (Array.isArray(result?.products?.items)) {
        setPlatformProducts((previous) => ({
          ...previous,
          [platformKey]: result.products.items,
        }));
      }

      setPlatformConnections((previous) => ({
        ...previous,
        [platformKey]: {
          ...(previous[platformKey] || {}),
          lastSync: new Date().toLocaleTimeString("pt-PT", {
            hour: "2-digit",
            minute: "2-digit",
          }),
        },
      }));
    } catch (error) {
      setManualSyncError(error?.message || "Erro ao sincronizar a plataforma.");
    } finally {
      setManualSyncPlatform(null);
    }
  };

  const syncProviderMeta = {
    SHOPIFY: { label: "Shopify", icon: "store" },
    GETYOURGUIDE: { label: "GetYourGuide", icon: "bookings" },
    VIATOR: { label: "Viator", icon: "ticket" },
    CIVITATIS: { label: "Civitatis", icon: "building" },
    HEADOUT: { label: "Headout", icon: "globe" },
    CENTRAL: { label: "Central PMY", icon: "dashboard" },
    MANUAL: { label: "Manual", icon: "file" },
  };

  const syncStatusMeta = {
    COMPLETED: { label: "Sincronizado" },
    SKIPPED: { label: "Ignorado" },
    PENDING: { label: "Pendente" },
    PROCESSING: { label: "Processando" },
    RETRY: { label: "Nova tentativa" },
    BLOCKED: { label: "Bloqueado" },
    DEAD: { label: "Falhou" },
  };

  const formatSyncTime = (value) => {
    if (!value) return "—";
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return "—";
    return parsed.toLocaleString("pt-PT", {
      timeZone: "Europe/Lisbon",
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  const syncEventLabel = (eventType) => ({
    BOOKING_CREATED: "Reserva criada",
    BOOKING_UPDATED: "Reserva atualizada",
    BOOKING_CANCELLED: "Reserva cancelada",
    AVAILABILITY_CHANGED: "Disponibilidade alterada",
    BLOCK_CREATED: "Bloqueio criado",
    BLOCK_REMOVED: "Bloqueio removido",
    CAPACITY_CHANGED: "Capacidade alterada",
  }[eventType] || eventType || "Evento");

  const getBookingTimesForTour = useCallback((tour) => {
    const configured = Array.isArray(tour?.scheduleSlots)
      ? tour.scheduleSlots.map(String).map((value) => value.trim()).filter(Boolean)
      : [];

    if (configured.length > 0) return [...new Set(configured)].sort();

    const detected = new Set();
    for (const variant of tour?.variants || []) {
      const matches = String(variant?.title || "").matchAll(/\b([01]?\d|2[0-3])[:hH]([0-5]\d)\b/g);
      for (const match of matches) {
        detected.add(`${match[1].padStart(2, "0")}:${match[2]}`);
      }
    }

    return [...detected].sort();
  }, []);

  const variantMatchesBookingTime = useCallback((variant, selectedTime) => {
    if (!selectedTime) return true;
    const match = String(variant?.title || "").match(/\b([01]?\d|2[0-3])[:hH]([0-5]\d)\b/);
    if (!match) return true;
    const variantTime = `${match[1].padStart(2, "0")}:${match[2]}`;
    return variantTime === selectedTime;
  }, []);

  const handleGeneratePaymentLink = async (e) => {
    e.preventDefault();
    setDraftOrderError("");
    setGeneratedLink("");
    setDraftOrderInfo(null);

    const tour = tourOptions.find((item) => item.id === selectedTour);
    if (!custName || !tour) {
      setDraftOrderError("Informe o cliente e selecione um tour.");
      return;
    }
    if (!bookingDate) {
      setDraftOrderError("Informe a data do tour.");
      return;
    }
    if (!bookingTime) {
      setDraftOrderError("Selecione o horário do tour.");
      return;
    }
    if (!custLang) {
      setDraftOrderError("Selecione o idioma do tour.");
      return;
    }
    if (!bookingPlatforms.includes("shopify")) {
      setDraftOrderError("Para gerar o checkout, mantenha Shopify selecionado como plataforma.");
      return;
    }

    const realVariants = Array.isArray(tour.variants) ? tour.variants : [];
    const lineItems = realVariants
      .filter((variant) => variantMatchesBookingTime(variant, bookingTime))
      .map((variant) => ({
        variantId: variant.id,
        quantity: Number(tourVariants[variant.id] || 0),
      }))
      .filter((item) => Number.isInteger(item.quantity) && item.quantity > 0);

    if (lineItems.length === 0) {
      setDraftOrderError("Selecione pelo menos um ingresso/variante do Shopify.");
      return;
    }

    setDraftOrderLoading(true);
    try {
      const formData = new FormData();
      formData.append("productId", tour.id);
      formData.append("tourTitle", tour.title || "");
      formData.append("customerName", custName);
      formData.append("customerEmail", custEmail || "");
      formData.append("customerPhone", custPhone || "");
      formData.append("date", bookingDate);
      formData.append("time", bookingTime);
      formData.append("language", custLang);
      formData.append("bookingPlatforms", bookingPlatforms.join(","));
      formData.append("lineItems", JSON.stringify(lineItems));
      formData.append("attribution", JSON.stringify(getDraftOrderAttribution()));

      const payload = await requestResourceJson("/api/draft-order", formData);
      const draftOrder = payload?.draftOrder;

      const checkoutUrl = draftOrder?.checkoutUrl || draftOrder?.invoiceUrl;
      if (!checkoutUrl) {
        throw new Error("O Shopify não devolveu um link de checkout.");
      }

      setGeneratedLink(checkoutUrl);
      setDraftOrderInfo(draftOrder);
    } catch (error) {
      setDraftOrderError(error?.message || "Erro ao criar o Draft Order no Shopify.");
    } finally {
      setDraftOrderLoading(false);
    }
  };

  const handleAddGuide = async (e) => {
    e.preventDefault();
    if (!guideName || !guideWhatsapp) return;
    const whatsapp = `${guideDdi} ${guideWhatsapp}`;
    const photoUrl = guidePhoto || null;
    const utmContent = guideName.toLowerCase().replace(/\s+/g,"_").replace(/[^a-z0-9_]/g,"");
    const referralLink = guideUtmId
      ? `https://portugalmeandyou.com/?utm_campaign=${guideUtmId}&utm_source=guia&utm_medium=indicacao&utm_content=${utmContent}`
      : "";
    const tempId = `temp_${Date.now()}`;
    const newGuide = { id: tempId, name: guideName, email: guideEmail, whatsapp, photo: photoUrl || "https://via.placeholder.com/150", utmId: guideUtmId, referralLink };
    setGuidesList(prev => [...prev, newGuide]);
    setGuideName(""); setGuideEmail(""); setGuideWhatsapp(""); setGuidePhoto(null); setGuideUtmId("");
    try {
      const fd = new FormData();
      fd.append("_action", "saveGuide");
      fd.append("name", guideName);
      fd.append("email", guideEmail || "");
      fd.append("whatsapp", whatsapp);
      fd.append("utmId", guideUtmId || "");
      if (photoUrl) fd.append("photoUrl", photoUrl);
      const res = await fetch(window.location.href, { method: "POST", body: fd });
      const data = await res.json();
      if (data.success) window.location.reload();
    } catch {}
  };

  const handleOpenEditGuide = (guide) => {
    setEditingGuide(guide.id);
    setEditGuideName(guide.name);
    setEditGuideEmail(guide.email || "");
    const parts = (guide.whatsapp || "").split(" ");
    setEditGuideDdi(parts[0] || "+351");
    setEditGuideWhatsapp(parts.slice(1).join(" ") || "");
    setEditGuidePhoto(guide.photo || null);
    setEditGuideUtmId(guide.utmId || "");
  };

  const handleSaveEditGuide = async (e) => {
    e.preventDefault();
    if (!editGuideName || !editGuideWhatsapp) return;
    const whatsapp = `${editGuideDdi} ${editGuideWhatsapp}`;
    // Optimistic update
    const editUtmContent = editGuideName.toLowerCase().replace(/\s+/g,"_").replace(/[^a-z0-9_]/g,"");
    const editReferralLink = editGuideUtmId
      ? `https://portugalmeandyou.com/?utm_campaign=${editGuideUtmId}&utm_source=guia&utm_medium=indicacao&utm_content=${editUtmContent}`
      : "";
    setGuidesList(prev => prev.map(g =>
      g.id === editingGuide
        ? { ...g, name: editGuideName, email: editGuideEmail, whatsapp, photo: editGuidePhoto || g.photo, utmId: editGuideUtmId, referralLink: editReferralLink }
        : g
    ));
    setEditingGuide(null);
    // Persist to DB (only if real DB id, not temp)
    if (!String(editingGuide).startsWith('temp_')) {
      try {
        const fd = new FormData();
        fd.append("_action", "saveGuide");
        fd.append("id", editingGuide);
        fd.append("name", editGuideName);
        fd.append("email", editGuideEmail || "");
        fd.append("whatsapp", whatsapp);
        fd.append("utmId", editGuideUtmId || "");
        if (editGuidePhoto) fd.append("photoUrl", editGuidePhoto);
        await fetch(window.location.href, { method: "POST", body: fd });
      } catch {}
    }
  };

  const handleDeleteGuide = async (id) => {
    if (!window.confirm("Remover este guia do sistema?")) return;
    setGuidesList(prev => prev.filter(g => g.id !== id));
    setEditingGuide(null);
    if (!String(id).startsWith('temp_')) {
      try {
        const fd = new FormData();
        fd.append("_action", "deleteGuide");
        fd.append("id", id);
        await fetch(window.location.href, { method: "POST", body: fd });
      } catch {}
    }
  };

  const handleEditGuidePhotoChange = (e) => {
    const f = e.target.files[0];
    if (f) setEditGuidePhoto(URL.createObjectURL(f));
  };

  // HANDLERS DE MÍDIA
  const handleMediaUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setMediaUploading(true);
    setMediaUploadError("");
    setMediaUploadProgress(10);

    try {
      const fd = new FormData();
      fd.append("_action", "uploadMedia");
      fd.append("filename", file.name);
      fd.append("mimetype", file.type);
      fd.append("size", String(file.size));
      fd.append("category", mediaCategoryInput);

      const data = await requestResourceJson("/", fd);
      setMediaUploadProgress(30);

      const uploadForm = new FormData();
      data.parameters.forEach((param) => uploadForm.append(param.name, param.value));
      uploadForm.append("file", file);
      setMediaUploadProgress(60);

      const uploadRes = await fetch(data.uploadUrl, {
        method: "POST",
        body: uploadForm,
      });
      if (!uploadRes.ok) {
        throw new Error("Falha ao enviar o arquivo para o Shopify Files.");
      }

      setMediaUploadProgress(82);

      const finalizeFd = new FormData();
      finalizeFd.append("_action", "finalizeMediaUpload");
      finalizeFd.append("resourceUrl", data.resourceUrl);
      finalizeFd.append("filename", file.name);
      finalizeFd.append("mimetype", file.type);
      finalizeFd.append("category", mediaCategoryInput);
      finalizeFd.append(
        "label",
        mediaLabelInput || file.name.replace(/\.[^/.]+$/, ""),
      );

      const finalizeData = await requestResourceJson("/", finalizeFd);

      if (!finalizeData.media) {
        throw new Error("Falha ao registrar o arquivo na biblioteca PMY.");
      }

      setMediaUploadProgress(100);
      setMediaList((current) => [
        finalizeData.media,
        ...current.filter((item) => item.id !== finalizeData.media.id),
      ]);
      setMediaLabelInput("");
    } catch (err) {
      setMediaUploadError(err?.message || "Não foi possível enviar a mídia.");
    } finally {
      setMediaUploading(false);
      window.setTimeout(() => setMediaUploadProgress(0), 250);
      if (mediaUploadRef.current) mediaUploadRef.current.value = "";
    }
  };

  const handleDeleteMedia = async (id) => {
    if (!window.confirm("Remover esta mídia da biblioteca PMY?")) return;

    setMediaUploadError("");
    const fd = new FormData();
    fd.append("_action", "deleteMedia");
    fd.append("id", id);

    try {
      await requestResourceJson("/", fd);
      setMediaList((current) => current.filter((item) => item.id !== id));
    } catch (error) {
      setMediaUploadError(error?.message || "Erro ao remover mídia.");
    }
  };

  const handleCopyMediaUrl = (url) => {
    navigator.clipboard.writeText(url).then(() => alert("URL copiada!")).catch(() => {});
  };

  const handleTogglePlatformSelection = (key, stateArr, setStateArr) => {
    setStateArr(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  const handleToggleProduct = (platformKey, productId) => {
    setPlatformProducts(prev => ({
      ...prev,
      [platformKey]: prev[platformKey].map(p =>
        p.id === productId ? { ...p, active: !p.active, synced: !p.active } : p
      )
    }));
  };

  const handleAddCustomIntegration = (e) => {
    e.preventDefault();
    if (customName && customUrl) {
      setCustomIntegrations([...customIntegrations, { id: Date.now(), name: customName, url: customUrl, key: customKey }]);
      setCustomName(""); setCustomUrl(""); setCustomKey("");
    }
  };

  const persistBusinessSettings = useCallback(async (patch) => {
    const fd = new FormData();
    fd.append("_action", "saveBusinessSettings");

    for (const [key, value] of Object.entries(patch)) {
      if (value !== undefined) {
        fd.append(
          key,
          value !== null && typeof value === "object"
            ? JSON.stringify(value)
            : String(value ?? ""),
        );
      }
    }

    const payload = await requestResourceJson("/", fd);

    setSettingsSaveMessage("Salvo no banco ✓");
    window.clearTimeout(settingsMessageTimerRef.current);
    settingsMessageTimerRef.current = window.setTimeout(
      () => setSettingsSaveMessage(""),
      1800,
    );
    return payload.settings;
  }, [requestResourceJson]);

  const scheduleBusinessSettingsSave = useCallback((patch) => {
    window.clearTimeout(settingsSaveTimerRef.current);
    settingsSaveTimerRef.current = window.setTimeout(() => {
      persistBusinessSettings(patch).catch((error) => {
        console.error("[PMY] settings save failed:", error);
        setSettingsSaveMessage(error?.message || "Erro ao salvar configuração.");
      });
    }, 350);
  }, [persistBusinessSettings]);

  useEffect(() => {
    if (businessSettings) return;

    let legacyLogo = null;
    let legacyTheme = null;
    try {
      legacyLogo = localStorage.getItem("pmy_logo_url") || null;
      const rawTheme = localStorage.getItem("pmy_theme");
      legacyTheme = rawTheme ? JSON.parse(rawTheme) : null;
    } catch {
      return;
    }

    if (!legacyLogo && !legacyTheme) return;

    if (legacyLogo) setLogoOnLightUrl(legacyLogo);
    if (legacyTheme && typeof legacyTheme === "object") {
      setTheme({ ...DEFAULT_THEME, ...legacyTheme });
    }

    persistBusinessSettings({
      ...(legacyLogo ? { logoOnLightUrl: legacyLogo } : {}),
      ...(legacyTheme ? { theme: { ...DEFAULT_THEME, ...legacyTheme } } : {}),
    })
      .then(() => {
        try {
          localStorage.removeItem("pmy_logo_url");
          localStorage.removeItem("pmy_theme");
        } catch {}
      })
      .catch((error) => {
        console.error("[PMY] legacy settings migration failed:", error);
      });
  }, [businessSettings, persistBusinessSettings]);

  // BRAND LOGO: fluxo isolado em /api/brand-logo para não depender das actions gerais.
  const uploadBusinessLogo = useCallback(async (variant, file) => {
    if (!file) return;

    if (!String(file.type || "").startsWith("image/")) {
      setSettingsSaveMessage("Erro: selecione um arquivo de imagem.");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setSettingsSaveMessage("Erro: a logo deve ter no máximo 10 MB.");
      return;
    }

    setLogoUploadingVariant(variant);
    setSettingsSaveMessage("Enviando logo...");

    try {
      const prepareFd = new FormData();
      prepareFd.append("_action", "prepareLogoUpload");
      prepareFd.append("variant", variant);
      prepareFd.append("filename", file.name);
      prepareFd.append("mimetype", file.type || "image/png");
      prepareFd.append("size", String(file.size));

      const prepared = await requestResourceJson("/api/brand-logo", prepareFd);

      const uploadForm = new FormData();
      for (const parameter of prepared.parameters || []) {
        uploadForm.append(parameter.name, parameter.value);
      }
      uploadForm.append("file", file);

      const uploadResponse = await fetch(prepared.uploadUrl, {
        method: "POST",
        body: uploadForm,
      });

      if (!uploadResponse.ok) {
        throw new Error("Falha ao enviar a logo para o Shopify Files.");
      }

      const finalizeFd = new FormData();
      finalizeFd.append("_action", "finalizeLogoUpload");
      finalizeFd.append("variant", variant);
      finalizeFd.append("resourceUrl", prepared.resourceUrl);
      finalizeFd.append("filename", file.name);
      finalizeFd.append("mimetype", file.type || "image/png");

      const finalized = await requestResourceJson("/api/brand-logo", finalizeFd);
      const url = String(finalized?.url || finalized?.media?.url || "").trim();

      if (!url) {
        throw new Error("O Shopify não devolveu a URL final da logo.");
      }

      if (variant === "dark") setLogoOnDarkUrl(url);
      else setLogoOnLightUrl(url);

      setSettingsSaveMessage("Logo salva e sincronizada ✓");
    } catch (error) {
      console.error("[PMY] brand logo upload failed:", error);
      setSettingsSaveMessage(
        error?.message || "Erro ao salvar a logo.",
      );
    } finally {
      setLogoUploadingVariant(null);
    }
  }, [requestResourceJson]);

  const handleBrandLogoChange = (variant, event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    uploadBusinessLogo(variant, file);
    event.target.value = "";
  };

  const handleRemoveBrandLogo = async (variant) => {
    try {
      const fd = new FormData();
      fd.append("_action", "removeLogo");
      fd.append("variant", variant);
      await requestResourceJson("/api/brand-logo", fd);

      if (variant === "dark") setLogoOnDarkUrl(null);
      else setLogoOnLightUrl(null);

      setSettingsSaveMessage("Logo removida ✓");
    } catch (error) {
      setSettingsSaveMessage(error?.message || "Erro ao remover logo.");
    }
  };

  const handleThemeChange = (key, value) => {
    setTheme(prev => {
      const updated = { ...prev, [key]: value };
      scheduleBusinessSettingsSave({ theme: updated });
      return updated;
    });
  };

  const handleRestoreThemeDefaults = () => {
    setTheme(DEFAULT_THEME);
    persistBusinessSettings({ theme: DEFAULT_THEME }).catch((error) => {
      setSettingsSaveMessage(error?.message || "Erro ao restaurar tema.");
    });
  };

  const handleImageShapeChange = (value) => {
    setImageShape(value);
    persistBusinessSettings({ imageShape: value }).catch((error) => {
      setSettingsSaveMessage(error?.message || "Erro ao salvar formato.");
    });
  };

  const savePlatformFieldMapping = useCallback(async (platform, mappings) => {
    setMappingSaveState({
      platform,
      status: "saving",
      message: "Salvando...",
    });

    const fd = new FormData();
    fd.append("_action", "savePlatformFieldMapping");
    fd.append("platform", platform);
    fd.append("mappings", JSON.stringify(mappings || {}));

    try {
      const response = await fetch(window.location.href, {
        method: "POST",
        body: fd,
        credentials: "include",
        headers: { Accept: "application/json" },
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error || "Não foi possível salvar o mapeamento.");
      }

      setFieldMappings((current) => ({
        ...current,
        [platform]: payload.mapping?.mappings || mappings,
      }));
      setMappingSaveState({
        platform,
        status: "saved",
        message: "Mapeamento salvo no banco ✓",
      });
    } catch (error) {
      setMappingSaveState({
        platform,
        status: "error",
        message: error?.message || "Erro ao salvar mapeamento.",
      });
    }
  }, []);

  const handleSaveFieldMappings = () => {
    const platform = activeMappingPlatform;
    savePlatformFieldMapping(platform, fieldMappings[platform] || {});
  };

  const handleResetFieldMappings = () => {
    const platform = activeMappingPlatform;
    const resetMapping = { ...(defaultMappings[platform] || {}) };

    setFieldMappings((current) => ({
      ...current,
      [platform]: resetMapping,
    }));

    savePlatformFieldMapping(platform, resetMapping);
  };
  const handleGuidePhotoChange = (e) => { const f = e.target.files[0]; if (f) setGuidePhoto(URL.createObjectURL(f)); };
  const toggleCategory = (n) => setOpenCategories(p => p.includes(n) ? p.filter(c=>c!==n) : [...p,n]);
  const handlePresetSelection = (k) => { setSelectedPeriod(k); setIsDateMenuOpen(false); };
  const handleCustomDateApply = () => { if (customStart && customEnd) { setSelectedPeriod("period_custom"); setIsDateMenuOpen(false); } };

  const handleTourSelectionChange = (id) => {
    setSelectedTour(id);
    setTourVariants({ adulto:0, jovem:0, crianca:0, senior:0 });
    setGeneratedLink("");
    setDraftOrderInfo(null);
    setDraftOrderError("");
    const tour = tourOptions.find(t => t.id === id);
    const availableTimes = getBookingTimesForTour(tour);
    setBookingTime(availableTimes[0] || "");
    // Detecta línguas disponíveis baseado no nome do tour
    const title = (tour?.title || "").toLowerCase();
    if (title.includes("español") || title.includes("spanish") || title.includes("espanhol")) {
      setActiveProductVariants(["adulto","jovem","senior"]);
      setActiveTourLanguages(["Português","English","Español"]);
    } else if (title.includes("french") || title.includes("français")) {
      setActiveProductVariants(["adulto","jovem","crianca","senior"]);
      setActiveTourLanguages(["Português","English","Français"]);
    } else {
      setActiveProductVariants(["adulto","jovem","crianca","senior"]);
      setActiveTourLanguages(["Português","English"]);
    }
  };

  const handleModalTourChange = (id) => {
    setModalSelectedTour(id);
    setGuideAssignmentMessage("");
    const tour = tourOptions.find(t => t.id === id);

    // 1. Metafield
    if (tour?.scheduleSlots?.length > 0) {
      const hours = [...tour.scheduleSlots].sort();
      setModalAvailableHours(hours);
      setModalSelectedHour(hours[0] || "");
      return;
    }

    // 2. Extrai dos títulos das variantes
    const timeRegex = /\b(\d{1,2}[:\h]\d{2})(?:\s*[hH])?\b/g;
    const timesFromVariants = new Set();
    for (const v of (tour?.variants || [])) {
      const matches = (v.title || "").matchAll(timeRegex);
      for (const m of matches) {
        const raw = m[1].replace('h', ':').replace('H', ':');
        const parts = raw.split(':');
        if (parts.length === 2) {
          timesFromVariants.add(`${parts[0].padStart(2,'0')}:${parts[1].padStart(2,'0')}`);
        }
      }
    }

    if (timesFromVariants.size > 0) {
      const hours = [...timesFromVariants].sort();
      setModalAvailableHours(hours);
      setModalSelectedHour(hours[0] || "");
      return;
    }

    setModalAvailableHours(["09:00", "14:00"]);
    setModalSelectedHour("09:00");
  };

  const guideAssignmentDateKey = (day = selectedCalendarDay) => {
    const month = String(currentMonth + 1).padStart(2, "0");
    const date = String(day).padStart(2, "0");
    return `${currentYear}-${month}-${date}`;
  };

  const handleSaveGuideAssignment = async () => {
    if (!modalSelectedTour || !modalSelectedHour || !modalSelectedGuide) {
      setGuideAssignmentMessage("Selecione tour, horário e guia.");
      return;
    }

    setGuideAssignmentSaving(true);
    setGuideAssignmentMessage("");
    try {
      const fd = new FormData();
      fd.append("_action", "saveGuideAssignment");
      fd.append("tourId", modalSelectedTour);
      fd.append("guideId", modalSelectedGuide);
      fd.append("date", guideAssignmentDateKey());
      fd.append("time", modalSelectedHour);

      const res = await fetch(window.location.href, { method: "POST", body: fd });
      const result = await res.json();
      if (!res.ok || !result.success) {
        setGuideAssignmentMessage(result.error || "Não foi possível publicar a escala.");
        return;
      }

      setGuideAssignmentsList((current) => [
        ...current.filter((item) => item.id !== result.assignment.id),
        result.assignment,
      ].sort((a, b) => new Date(a.startTime) - new Date(b.startTime)));
      setGuideAssignmentMessage(result.message || "Escala publicada.");
      setIsFormAllocating(false);
      setModalSelectedTour("");
      setModalSelectedGuide("");
    } catch (error) {
      setGuideAssignmentMessage(error?.message || "Erro ao publicar a escala.");
    } finally {
      setGuideAssignmentSaving(false);
    }
  };

  const handleRemoveGuideAssignment = async (id) => {
    if (!window.confirm("Remover esta escala de guia?")) return;

    setGuideAssignmentSaving(true);
    setGuideAssignmentMessage("");
    try {
      const fd = new FormData();
      fd.append("_action", "removeGuideAssignment");
      fd.append("id", id);
      const res = await fetch(window.location.href, { method: "POST", body: fd });
      const result = await res.json();
      if (!res.ok || !result.success) {
        setGuideAssignmentMessage(result.error || "Não foi possível remover a escala.");
        return;
      }

      setGuideAssignmentsList((current) => current.filter((item) => item.id !== id));
      setGuideAssignmentMessage(result.message || "Escala removida.");
    } catch (error) {
      setGuideAssignmentMessage(error?.message || "Erro ao remover a escala.");
    } finally {
      setGuideAssignmentSaving(false);
    }
  };

  const handleCreateBlock = async (e) => {
    e.preventDefault();
    setBlockMessage("");

    if (!blockTourId) {
      setBlockMessage("Selecione um tour para bloquear.");
      return;
    }
    if (!blockDateTime && !blockRecurringDays.trim()) {
      setBlockMessage("Informe uma data específica ou dias recorrentes.");
      return;
    }
    if (blockPlatforms.length === 0) {
      setBlockMessage("Selecione pelo menos uma plataforma.");
      return;
    }

    setBlockSaving(true);
    try {
      const fd = new FormData();
      fd.append("_action", "createBlock");
      fd.append("tourId", blockTourId);
      fd.append("date", blockDateTime || "");
      fd.append("recurringDays", blockRecurringDays || "");
      fd.append("timeSlot", blockSelectedHour || "ALL");
      fd.append("platforms", JSON.stringify(blockPlatforms));
      fd.append("reason", "Bloqueio manual na Agenda Central");

      const res = await fetch(window.location.href, { method: "POST", body: fd });
      const result = await res.json();

      if (!res.ok || !result.success) {
        setBlockMessage(result.error || "Não foi possível salvar o bloqueio.");
        return;
      }

      setBlockMessage(result.message || "Bloqueio salvo na Agenda Central.");
      window.location.reload();
    } catch (err) {
      setBlockMessage(err?.message || "Erro ao salvar bloqueio.");
    } finally {
      setBlockSaving(false);
    }
  };

  const handleRemoveBlock = async (id) => {
    if (!window.confirm("Remover este bloqueio da disponibilidade central?")) return;

    try {
      const fd = new FormData();
      fd.append("_action", "removeBlock");
      fd.append("id", id);
      const res = await fetch(window.location.href, { method: "POST", body: fd });
      const result = await res.json();
      if (!res.ok || !result.success) {
        alert(result.error || "Não foi possível remover o bloqueio.");
        return;
      }
      window.location.reload();
    } catch (err) {
      alert(err?.message || "Erro ao remover bloqueio.");
    }
  };

  const getCalendarDayBlocks = (day) => {
    const month = String(currentMonth + 1).padStart(2, "0");
    const date = String(day).padStart(2, "0");
    const dateKey = `${currentYear}-${month}-${date}`;
    const weekday = String(new Date(currentYear, currentMonth, day, 12, 0, 0).getDay());

    return (blockedDates || []).filter((block) => {
      if (!block?.active) return false;
      const storedDate = block.date ? String(block.date).slice(0, 10) : null;
      return (storedDate && storedDate === dateKey) || (block.dayOfWeek && String(block.dayOfWeek) === weekday);
    });
  };

  const getLisbonBookingParts = (value) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;

    const parts = Object.fromEntries(
      new Intl.DateTimeFormat("en-GB", {
        timeZone: "Europe/Lisbon",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23",
      })
        .formatToParts(date)
        .filter(part => part.type !== "literal")
        .map(part => [part.type, part.value]),
    );

    return {
      dateKey: `${parts.year}-${parts.month}-${parts.day}`,
      timeKey: `${parts.hour}:${parts.minute}`,
    };
  };

  const getBookingPassengers = (booking) => {
    const explicit = Number(booking?.totalParticipants || 0);
    if (explicit > 0) return explicit;

    const fallback =
      Number(booking?.adults || 0) +
      Number(booking?.children || 0) +
      Number(booking?.youths || 0) +
      Number(booking?.seniors || 0);

    return fallback > 0 ? fallback : 1;
  };

  const isBookingActiveForCapacity = (booking) => {
    if (!booking || booking.status === "CANCELED") return false;
    if (!["CONFIRMED", "PENDING"].includes(booking.status)) return false;

    if (booking.status === "PENDING" && booking.holdExpiresAt) {
      const expires = new Date(booking.holdExpiresAt);
      if (!Number.isNaN(expires.getTime()) && expires <= new Date()) return false;
    }

    return true;
  };

  const getCalendarDayBookings = (day) => {
    const month = String(currentMonth + 1).padStart(2, "0");
    const date = String(day).padStart(2, "0");
    const dateKey = `${currentYear}-${month}-${date}`;

    return (bookings || [])
      .filter(isBookingActiveForCapacity)
      .filter(booking => getLisbonBookingParts(booking.startTime)?.dateKey === dateKey)
      .sort((a, b) => new Date(a.startTime) - new Date(b.startTime));
  };

  const getCalendarDayAssignments = (day) => {
    const dateKey = guideAssignmentDateKey(day);
    return (guideAssignmentsList || [])
      .filter((assignment) => assignment?.status === "ASSIGNED")
      .filter(
        (assignment) =>
          getLisbonBookingParts(assignment.startTime)?.dateKey === dateKey,
      )
      .sort((a, b) => new Date(a.startTime) - new Date(b.startTime));
  };

  const getCalendarDayStats = (day) => {
    const dayBookings = getCalendarDayBookings(day);
    const slots = new Map();

    for (const booking of dayBookings) {
      const parts = getLisbonBookingParts(booking.startTime);
      if (!parts) continue;

      const tour = (tours || []).find(item => item.id === booking.tourId);
      const capacity = Math.max(0, Number(tour?.maxCapacity ?? 20));
      const key = `${booking.tourId}|${parts.timeKey}`;

      if (!slots.has(key)) {
        slots.set(key, {
          tourId: booking.tourId,
          timeKey: parts.timeKey,
          capacity,
          occupied: 0,
        });
      }

      slots.get(key).occupied += getBookingPassengers(booking);
    }

    const occupied = [...slots.values()].reduce((sum, slot) => sum + slot.occupied, 0);
    const capacity = [...slots.values()].reduce((sum, slot) => sum + slot.capacity, 0);
    const remaining = Math.max(0, capacity - occupied);

    const dayAssignments = getCalendarDayAssignments(day);

    return {
      bookings: dayBookings,
      assignments: dayAssignments,
      assignmentCount: dayAssignments.length,
      bookingCount: dayBookings.length,
      tourCount: new Set(dayBookings.map(booking => booking.tourId)).size,
      passengers: occupied,
      capacity,
      remaining,
    };
  };

  const handleBlockTourSelectionChange = (id) => {
    setBlockTourId(id);
    const tour = tourOptions.find(t => t.id === id);

    // 1. Tenta metafield 'schedule' primeiro
    if (tour?.scheduleSlots?.length > 0) {
      setTourAvailableHours(tour.scheduleSlots);
      return;
    }

    // 2. Extrai horários únicos dos títulos das variantes
    // Padrão comum: "Adult / 09:30 - Description" ou "09:00 - Title"
    const timeRegex = /\b(\d{1,2}[:\h]\d{2})(?:\s*[hH])?\b/g;
    const timesFromVariants = new Set();
    for (const v of (tour?.variants || [])) {
      const matches = (v.title || "").matchAll(timeRegex);
      for (const m of matches) {
        // Normaliza para HH:MM
        const raw = m[1].replace('h', ':').replace('H', ':');
        const parts = raw.split(':');
        if (parts.length === 2) {
          const hh = parts[0].padStart(2, '0');
          const mm = parts[1].padStart(2, '0');
          timesFromVariants.add(`${hh}:${mm}`);
        }
      }
    }

    if (timesFromVariants.size > 0) {
      // Ordena cronologicamente
      setTourAvailableHours([...timesFromVariants].sort());
      return;
    }

    // 3. Fallback: sem horários definidos
    setTourAvailableHours([]);
  };

  const handleCapacityChange = async (id, change) => {
    const cur = tourCapacities[id] !== undefined ? tourCapacities[id] : 20;
    const next = Math.min(999, Math.max(0, cur + change));

    setTourCapacities(prev => ({ ...prev, [id]: next }));

    try {
      const fd = new FormData();
      fd.append("_action", "saveCapacity");
      fd.append("tourId", id);
      fd.append("maxCapacity", String(next));

      const res = await fetch(window.location.href, { method: "POST", body: fd });
      const result = await res.json();
      if (!res.ok || !result.success) {
        setTourCapacities(prev => ({ ...prev, [id]: cur }));
        alert(result.error || "Não foi possível salvar a capacidade.");
      }
    } catch (err) {
      setTourCapacities(prev => ({ ...prev, [id]: cur }));
      alert(err?.message || "Erro ao salvar a capacidade.");
    }
  };

  const handleOpenAgenda = () => {
    const today = getLisbonToday();
    setCurrentMonth(today.monthIndex);
    setCurrentYear(today.year);
    setSelectedCalendarDay(today.day);
    setActiveModal(null);
    setModalSelectedTour("");
    setIsFormAllocating(false);
    setActiveTab("agenda");
  };

  const handlePrevMonth = () => {
    if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(y=>y-1); } else setCurrentMonth(m=>m-1);
  };
  const handleNextMonth = () => {
    if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(y=>y+1); } else setCurrentMonth(m=>m+1);
  };

  const handleGygTourSelection = (id) => {
    setGygConfigTourId(id);
    setGygConfigMessage("");
    const tour = (tours || []).find((item) => item.id === id);

    setGygConfigActivityId(tour?.gygActivityId || "");
    setGygConfigSchedule((tour?.scheduleSlots || []).join(", "));
    setGygConfigTimezone(tour?.timezone || "Europe/Lisbon");
    setGygConfigCutoff(
      Number.isInteger(tour?.bookingCutoffSeconds)
        ? String(tour.bookingCutoffSeconds)
        : "",
    );
    setGygConfigPriceOverApi(Boolean(tour?.gygPriceOverApi));
  };

  const handleSaveGygTourConfig = async () => {
    if (!gygConfigTourId) {
      setGygConfigMessage("Selecione um tour.");
      return;
    }

    setGygConfigSaving(true);
    setGygConfigMessage("");

    try {
      const fd = new FormData();
      fd.append("_action", "saveGygTourConfig");
      fd.append("id", gygConfigTourId);
      fd.append("gygActivityId", gygConfigActivityId);
      fd.append("scheduleSlots", gygConfigSchedule);
      fd.append("timezone", gygConfigTimezone);
      fd.append("bookingCutoffSeconds", gygConfigCutoff);
      fd.append("gygPriceOverApi", gygConfigPriceOverApi ? "true" : "false");

      const res = await fetch(window.location.href, { method: "POST", body: fd });
      const result = await res.json();

      if (!res.ok || !result.success) {
        setGygConfigMessage(result.error || "Não foi possível salvar a configuração.");
        return;
      }

      setGygConfigMessage("Configuração do tour salva.");
      window.location.reload();
    } catch (error) {
      setGygConfigMessage(error?.message || "Erro ao salvar configuração.");
    } finally {
      setGygConfigSaving(false);
    }
  };

  // HANDLERS DE PLATAFORMAS
  const applyCredentialStatus = (key, status) => {
    if (!status) {
      setPlatformConnections((current) => ({
        ...current,
        [key]: {
          ...(current[key] || {}),
          connected: false,
          configured: false,
          status: null,
          validationError: false,
          credentialSource: null,
          lastValidationStatus: null,
          lastValidationMessage: null,
          lastValidatedAt: null,
          lastSync: null,
          fingerprint: null,
        },
      }));
      return;
    }

    setPlatformConnections((current) => ({
      ...current,
      [key]: {
        ...(current[key] || {}),
        connected: status.status === "CONNECTED",
        configured: Boolean(status.hasCredential),
        status: status.status || null,
        validationError:
          status.status === "ERROR" ||
          String(status.lastValidationStatus || "").toUpperCase() === "ERROR",
        credentialSource: "ENCRYPTED",
        lastValidationStatus: status.lastValidationStatus || null,
        lastValidationMessage: status.lastValidationMessage || null,
        lastValidatedAt: status.lastValidatedAt || null,
        lastSync: formatCredentialCheck(status.lastValidatedAt),
        fingerprint: status.credentialFingerprint || null,
        environment: status.environment || null,
      },
    }));
  };

  const handleOpenConnect = (key) => {
    setConnectingPlatform(key);
    setApiKeyInput("");
    setApiSecretInput("");
    setIntegrationCredentialMessage("");
    setIntegrationEnvironmentInput(
      platformConnections[key]?.environment === "live" ? "live" : "test",
    );
    if (key === "getyourguide") {
      setGygConfigMessage("");
    }
  };

  const callIntegrationCredentialApi = async (formData) => {
    const response = await fetch("/api/integration-credentials", {
      method: "POST",
      body: formData,
    });
    const payload = await response.json();
    if (!response.ok || !payload?.success) {
      const error = new Error(
        payload?.error || "Não foi possível atualizar a integração.",
      );
      error.integrationStatus = payload?.status || null;
      throw error;
    }
    return payload;
  };

  const handleConfirmConnect = async (key) => {
    if (!["viator", "civitatis"].includes(key)) return;

    setIntegrationCredentialLoading(true);
    setIntegrationCredentialMessage("");

    try {
      const fd = new FormData();
      fd.append("_action", "save");
      fd.append("provider", key.toUpperCase());

      if (key === "viator") {
        fd.append("apiKey", apiKeyInput.trim());
        fd.append("supplierId", apiSecretInput.trim());
      } else {
        fd.append("token", apiKeyInput.trim());
        fd.append("environment", integrationEnvironmentInput);
      }

      const payload = await callIntegrationCredentialApi(fd);
      applyCredentialStatus(key, payload.status);
      setApiKeyInput("");
      setApiSecretInput("");
      setIntegrationCredentialMessage(
        payload.message ||
          "Credencial salva · teste local concluído no backend. Aguardando tráfego real do canal.",
      );
    } catch (error) {
      if (error?.integrationStatus) {
        applyCredentialStatus(key, error.integrationStatus);
      }
      setIntegrationCredentialMessage(
        error?.message || "Falha ao salvar e testar a credencial.",
      );
    } finally {
      setIntegrationCredentialLoading(false);
    }
  };

  const handleTestIntegrationCredential = async (key) => {
    if (!["viator", "civitatis"].includes(key)) return;

    setIntegrationCredentialLoading(true);
    setIntegrationCredentialMessage("");
    try {
      const fd = new FormData();
      fd.append("_action", "test");
      fd.append("provider", key.toUpperCase());
      const payload = await callIntegrationCredentialApi(fd);
      applyCredentialStatus(key, payload.status);
      setIntegrationCredentialMessage(
        "Teste técnico local concluído. A conexão continua aguardando tráfego autenticado real do canal.",
      );
    } catch (error) {
      if (error?.integrationStatus) {
        applyCredentialStatus(key, error.integrationStatus);
      }
      setIntegrationCredentialMessage(
        error?.message || "Falha ao testar a credencial.",
      );
    } finally {
      setIntegrationCredentialLoading(false);
    }
  };

  const handleDisconnect = async (key) => {
    if (!["viator", "civitatis"].includes(key)) return;

    const platformName = allPlatforms.find((item) => item.key === key)?.name || key;
    if (!window.confirm(`Remover a credencial armazenada de ${platformName}?`)) return;

    setIntegrationCredentialLoading(true);
    setIntegrationCredentialMessage("");
    try {
      const fd = new FormData();
      fd.append("_action", "remove");
      fd.append("provider", key.toUpperCase());
      await callIntegrationCredentialApi(fd);
      applyCredentialStatus(key, null);
      setApiKeyInput("");
      setApiSecretInput("");
      setIntegrationCredentialMessage("Credencial criptografada removida.");
    } catch (error) {
      setIntegrationCredentialMessage(
        error?.message || "Falha ao remover a credencial.",
      );
    } finally {
      setIntegrationCredentialLoading(false);
    }
  };

  const handleUpdateFieldMapping = (platform, field, value) => {
    setFieldMappings((current) => ({
      ...current,
      [platform]: {
        ...(current[platform] || {}),
        [field]: value,
      },
    }));
    setMappingSaveState({
      platform,
      status: "dirty",
      message: "Alterações ainda não salvas",
    });
  };


  // ---- RENDERIZADORES ----
  const renderCalendarDays = () => {
    const ptWeekdays = ["segunda-feira","terça-feira","quarta-feira","quinta-feira","sexta-feira","sábado","domingo"];
    const enWeekdays = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];
    const weekdays = lang === 'pt' ? ptWeekdays : enWeekdays;

    const renderDayCell = (day, weekdayLabel, key) => {
      const stats = getCalendarDayStats(day);
      const hasBookings = stats.bookingCount > 0;
      const hasAssignments = stats.assignmentCount > 0;
      const hasBlocks = getCalendarDayBlocks(day).length > 0;

      return (
        <div key={key} className={`pmy-calendar-day ${selectedCalendarDay===day?'active':''}`}
          onClick={() => { setSelectedCalendarDay(day); setModalSelectedTour(""); setModalSelectedGuide(""); setGuideAssignmentMessage(""); setIsFormAllocating(false); setActiveModal('calendarDay'); }}>
          <div className="pmy-cal-date-line">{day} - {weekdayLabel}</div>
          <div className="pmy-cal-info-line">
            🏰 {stats.tourCount} {stats.tourCount===1 ? 'Tour com reserva' : 'Tours com reserva'}
          </div>
          <div className="pmy-cal-info-line">
            {hasBookings
              ? `👥 Vagas: ${stats.remaining}/${stats.capacity} · ${stats.passengers} pax`
              : '👥 Nenhuma reserva'}
          </div>
          {hasAssignments && (
            <div className="pmy-cal-info-line">
              🧭 {stats.assignmentCount} {stats.assignmentCount === 1 ? ui("escala de guia", "guide assignment") : ui("escalas de guia", "guide assignments")}
            </div>
          )}
          {(hasBookings || hasAssignments || hasBlocks) && <div className="pmy-calendar-dot"></div>}
        </div>
      );
    };

    if (calendarView !== "month") {
      const totalDays = new Date(currentYear, currentMonth + 1, 0).getDate();
      const today = new Date();
      const anchorDay =
        today.getFullYear() === currentYear && today.getMonth() === currentMonth
          ? today.getDate()
          : 1;
      const count = calendarView === "1d" ? 1 : calendarView === "3d" ? 3 : 7;
      const shortDays = Array.from({ length: count }, (_, index) => anchorDay + index)
        .filter(day => day <= totalDays);

      return shortDays.map(day => {
        const nativeDay = new Date(currentYear, currentMonth, day, 12, 0, 0).getDay();
        const mondayIndex = nativeDay === 0 ? 6 : nativeDay - 1;
        return renderDayCell(day, weekdays[mondayIndex], `short-${day}`);
      });
    }

    const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay();
    const pad = firstDayIndex === 0 ? 6 : firstDayIndex - 1;
    const totalDays = new Date(currentYear, currentMonth+1, 0).getDate();
    let cells = [];
    for (let p=0; p<pad; p++) cells.push(<div key={`e-${p}`} className="pmy-calendar-day empty pmy-ds-migrated-a68ndl" ></div>);
    for (let day=1; day<=totalDays; day++) {
      const wn = weekdays[(day+pad-1)%7]||weekdays[0];
      cells.push(renderDayCell(day, wn.split('-')[0], `d-${day}`));
    }
    return cells;
  };

  // Configuração segura por canal. Credenciais só aparecem quando existe
  // um adapter real capaz de validá-las.
  const platformTokenGuide = {
    shopify: null,
    viator: {
      steps: [
        "Use a API Key e o Supplier ID definidos no onboarding da Viator Supplier API.",
        "Ao salvar, a Central criptografa os valores no IntegrationSecret.",
        "O teste valida a mesma autenticação usada pelos endpoints reais da Viator.",
        "O canal só aparece como conectado depois de uma chamada autenticada real da Viator.",
      ],
      field1Label: "API Key da Viator Supplier API",
      field1Placeholder: "Cole a chave recebida no onboarding",
      field2Label: "Supplier ID",
      field2Placeholder: "Somente números",
    },
    getyourguide: {
      steps: [
        "Acesse o GetYourGuide Integrator Portal",
        "Cadastre o endpoint base da PMY e execute os testes oficiais",
        "Copie as credenciais de teste diretamente para os Secrets do Northflank",
      ],
      field1Label: "Credenciais configuradas no servidor",
      field1Placeholder: "Não cole segredos aqui",
      field2Label: null,
    },
    headout: {
      steps: [
        "O onboarding Headout está aguardando acesso/API concedido à conta PMY.",
        "Enquanto não houver um endpoint verificável, a Central não aceita nem exibe campos de API Key.",
        "Isso evita marcar o canal como conectado sem uma verificação real.",
      ],
      field1Label: null,
      field1Placeholder: null,
      field2Label: null,
    },
    civitatis: {
      steps: [
        "Use o token definido no onboarding da Civitatis/OCTO para a Supplier API da PMY.",
        "Ao salvar, a Central criptografa o token no IntegrationSecret.",
        "O teste valida token e ambiente usando o mesmo middleware dos endpoints reais.",
        "O canal só aparece como conectado depois de uma chamada autenticada real da Civitatis.",
      ],
      field1Label: "Token Civitatis / OCTO",
      field1Placeholder: "Cole o token recebido no onboarding",
      field2Label: null,
    },
    tripadvisor: {
      steps: [
        "Para tours e atividades, a distribuição de reservas da PMY acontece pela Viator, inclusive no Tripadvisor",
        "O Tripadvisor Terra API é uma integração separada para conteúdo, reviews, ratings, fotos e dados de localização",
        "Se ativarmos o Terra, a chave ficará somente nos Secrets do servidor e nunca será colada nesta tela",
      ],
      field1Label: null,
      field1Placeholder: null,
      field2Label: null,
    },
  };

  const renderConnectModal = () => {
    if (!connectingPlatform) return null;
    const platform = allPlatforms.find(p => p.key === connectingPlatform);
    if (!platform) return null;
    const conn    = platformConnections[connectingPlatform];
    const guide   = platformTokenGuide[connectingPlatform];
    const isShopify = connectingPlatform === 'shopify';
    const isGyg = connectingPlatform === 'getyourguide';
    const isTripadvisor = connectingPlatform === 'tripadvisor';
    const isManagedCredential = ['viator', 'civitatis'].includes(connectingPlatform);
    const isHeadout = connectingPlatform === 'headout';
    const selectedGygTour = (tours || []).find((tour) => tour.id === gygConfigTourId) || null;

    return (
      <div className="pmy-modal-overlay" onClick={() => setConnectingPlatform(null)}>
        <div className="pmy-connect-modal pmy-ds-migrated-nz4pdt"  onClick={e => e.stopPropagation()}>

          {/* Header */}
          <div className="pmy-ds-migrated-551uiq">
            <div className="pmy-ds-migrated-p1kt1o">
              <span className="pmy-ds-migrated-1o512c8"><Icon name={platform.icon} size={24} /></span>
              <div className="pmy-ds-migrated-aeaxj9">{platform.name}</div>
              <div className="pmy-ds-migrated-6r8r3f">
                {isTripadvisor
                  ? ui("Conteúdo e reputação · não é canal de reservas", "Content and reputation · not a booking channel")
                  : conn.connected
                    ? ui(
                        `Conexão confirmada por tráfego real${conn.lastSync ? ` · último teste ${conn.lastSync}` : ""}`,
                        `Connection confirmed by real traffic${conn.lastSync ? ` · last check ${conn.lastSync}` : ""}`,
                      )
                    : conn.validationError
                      ? ui(
                          `Erro no último teste${conn.lastSync ? ` · ${conn.lastSync}` : ""}`,
                          `Last test failed${conn.lastSync ? ` · ${conn.lastSync}` : ""}`,
                        )
                      : conn.configured
                        ? ui(
                            `Credencial salva · teste local concluído${conn.lastSync ? ` · último teste ${conn.lastSync}` : ""} · aguardando tráfego do canal`,
                            `Credential saved · local check completed${conn.lastSync ? ` · last check ${conn.lastSync}` : ""} · waiting for channel traffic`,
                          )
                      : isHeadout
                        ? ui("Onboarding técnico pendente · campos de credencial desativados","Technical onboarding pending · credential fields disabled")
                        : isShopify
                          ? ui("Já conectado automaticamente via Shopify App","Already connected automatically via Shopify App")
                          : ui("Configuração segura pendente","Secure configuration pending")}
              </div>
            </div>
            <button onClick={() => setConnectingPlatform(null)}
              className="pmy-ds-migrated-1g3pznn">&times;</button>
          </div>

          <div className="pmy-ds-migrated-16l5m1y">

            {/* ── SHOPIFY: já conectado pelo contexto do app ── */}
            {isShopify && (
              <div>
                <div className="pmy-ds-migrated-1bihub7">
                  <div className="pmy-ds-migrated-v4y6wx">
                    <span className="pmy-ds-migrated-i9ilnf">✅</span>
                    <strong className="pmy-ds-migrated-1451bbq">{ui("Shopify conectado automaticamente", "Shopify connected automatically")}</strong>
                  </div>
                  <div className="pmy-ds-migrated-vi0mf">
                    <div>🏢 Loja: <strong>{conn.accountName}</strong></div>
                    <div>🔄 Último sync: <strong>{conn.lastSync}</strong></div>
                    <div>⚙️ Método: <strong>Shopify Admin API (OAuth interno do app)</strong></div>
                    <div className="pmy-ds-migrated-j0srg2">
                      📡 Pedidos em tempo real:{' '}
                      <strong className={shopifyWebhookStatus?.ok ? "pmy-ds-state-text is-success" : "pmy-ds-state-text is-warning"}>
                        {shopifyWebhookStatus?.ok ? 'Webhooks ativos' : 'Configuração pendente'}
                      </strong>
                    </div>
                    {shopifyWebhookStatus?.subscriptions?.length > 0 && (
                      <div className="pmy-ds-migrated-tz10ua">
                        {shopifyWebhookStatus.subscriptions.map(s => s.topic).join(' · ')}
                      </div>
                    )}
                    {!shopifyWebhookStatus?.ok && shopifyWebhookStatus?.error && (
                      <div className="pmy-ds-migrated-6nlv6t">
                        {shopifyWebhookStatus.error}
                      </div>
                    )}
                  </div>
                </div>
                <div className="pmy-ds-migrated-1ewrw06">
                  <strong>{ui("ℹ️ Não precisa de token manual.", "ℹ️ No manual token required.")}</strong> Este app já acessa sua loja via autenticação OAuth do Shopify. Os produtos são puxados automaticamente pelo servidor.
                  Se os produtos não aparecerem, verifique se existem produtos cadastrados em <strong>Produtos → Todos os produtos</strong> no seu painel Shopify e recarregue a página.
                </div>
                <div className="pmy-ds-migrated-12y480p">
                  <button className="pmy-btn-submit pmy-ds-migrated-ckcaff" onClick={() => { setConnectingPlatform(null); window.location.reload(); }} >
                    🔄 Recarregar e Sincronizar Produtos
                  </button>
                  <button onClick={() => window.open('https://admin.shopify.com/store/products', '_blank')}
                    className="pmy-ds-migrated-14rz57k">
                    Ver Produtos ↗
                  </button>
                </div>
              </div>
            )}

            {/* ── GETYOURGUIDE: Supplier API v1 real ── */}
            {isGyg && (
              <div>
                <div className={`pmy-ds-state-panel ${gygIntegrationStatus?.credentialsReady ? "is-success" : "is-warning"}`}>
                  <div className={`pmy-ds-state-title ${gygIntegrationStatus?.credentialsReady ? "is-success" : "is-warning"}`}>
                    {gygIntegrationStatus?.credentialsReady ? '✅ Backend GYG pronto para testes' : '🟡 Credenciais do Integrator Portal pendentes'}
                  </div>
                  <div className="pmy-ds-migrated-zwhy5l">
                    <div>🔐 Entrada GYG → PMY: <strong>{gygIntegrationStatus?.incomingAuthConfigured ? 'configurada' : 'pendente'}</strong></div>
                    <div>📤 PMY → GYG: <strong>{gygIntegrationStatus?.outgoingAuthConfigured ? 'configurada' : 'pendente'}</strong></div>
                    <div>🌐 API GYG: <strong>{gygIntegrationStatus?.apiBaseConfigured ? 'configurada' : 'pendente'}</strong></div>
                    <div>🧳 Tours mapeados: <strong>{gygIntegrationStatus?.mappedTours || 0}</strong></div>
                    <div>🟢 Tours prontos: <strong>{gygIntegrationStatus?.readyTours || 0}</strong></div>
                    <div>🕒 Sem horário real: <strong>{gygIntegrationStatus?.scheduleMissing || 0}</strong></div>
                  </div>
                </div>

                <div className="pmy-ds-migrated-19khbc6">
                  <div className="pmy-ds-migrated-169rt21">{ui("🔌 Endpoints Supplier API v1", "🔌 Supplier API v1 Endpoints")}</div>
                  {[
                    'get-availabilities',
                    'reserve',
                    'cancel-reservation',
                    'book',
                    'cancel-booking',
                  ].map((endpoint) => (
                    <div key={endpoint} className="pmy-ds-migrated-imav8e">
                      {gygIntegrationStatus?.endpointBase || '/1'}/{endpoint}
                    </div>
                  ))}
                  <div className="pmy-ds-migrated-1x192bc">
                    {ui('As credenciais ficam somente no Northflank. Não cole usuário ou senha do GetYourGuide dentro da Central.','Credentials remain only in Northflank. Do not paste your GetYourGuide username or password inside the Central.')}
                  </div>
                </div>

                <div className="pmy-ds-migrated-1b0miao">
                  <div className="pmy-ds-migrated-yf6yxk">
                    🧳 Mapear tour PMY ↔ GetYourGuide
                  </div>

                  <div className="pmy-form-group pmy-ds-migrated-1bzrduz" >
                    <label className="pmy-ds-migrated-1ygjrzr">{ui("Tour mestre PMY", "PMY master tour")}</label>
                    <select className="pmy-form-input" value={gygConfigTourId} onChange={(e) => handleGygTourSelection(e.target.value)}>
                      <option value="">{ui("-- Selecione --", "-- Select --")}</option>
                      {(tours || [])
                        .filter((tour) => tour.shopifyStatus !== 'INACTIVE')
                        .map((tour) => (
                          <option key={tour.id} value={tour.id}>
                            {tour.title}{tour.gygActivityId ? ' ✓ GYG' : ''}
                          </option>
                        ))}
                    </select>
                  </div>

                  {selectedGygTour && (
                    <>
                      <div className="pmy-ds-migrated-18lu7h0">
                        <div className="pmy-ds-migrated-qric2k">{ui("Supplier productId da PMY", "PMY supplier productId")}</div>
                        <code className="pmy-ds-migrated-h8ux69">{selectedGygTour.id}</code>
                        <div className="pmy-ds-migrated-1k9dgzl">
                          Capacidade central: <strong>{selectedGygTour.maxCapacity}</strong> · fonte: {selectedGygTour.capacitySource}
                        </div>
                      </div>

                      <div className="pmy-form-group pmy-ds-migrated-1bzrduz" >
                        <label className="pmy-ds-migrated-1ygjrzr">{ui("ID da atividade/opção no GetYourGuide", "GetYourGuide activity/option ID")}</label>
                        <input className="pmy-form-input" value={gygConfigActivityId} onChange={(e) => setGygConfigActivityId(e.target.value)}
                          placeholder={ui('Cole o ID do produto/opção correspondente no GYG','Paste the corresponding product/option ID from GYG')} />
                      </div>

                      <div className="pmy-form-group pmy-ds-migrated-1bzrduz" >
                        <label className="pmy-ds-migrated-1ygjrzr">
                          {ui('Horários reais','Real times')} <span className="pmy-ds-migrated-fuwqya">({ui('HH:MM separados por vírgula','HH:MM separated by commas')})</span>
                        </label>
                        <input className="pmy-form-input" value={gygConfigSchedule} onChange={(e) => setGygConfigSchedule(e.target.value)}
                          placeholder="Ex.: 09:30, 14:00" />
                        <div className="pmy-ds-migrated-1w0i767">
                          {ui('Fonte atual:','Current source:')} {selectedGygTour.scheduleSource || 'UNCONFIGURED'}. {ui('Se preencher aqui, passa a ser MANUAL.','If you fill this in, the source becomes MANUAL.')}
                        </div>
                      </div>

                      <div className="pmy-ds-migrated-ezx7vp">
                        <div className="pmy-form-group">
                          <label className="pmy-ds-migrated-1ygjrzr">{ui("Fuso horário", "Time zone")}</label>
                          <input className="pmy-form-input" value={gygConfigTimezone} onChange={(e) => setGygConfigTimezone(e.target.value)}
                            placeholder="Europe/Lisbon" />
                        </div>
                        <div className="pmy-form-group">
                          <label className="pmy-ds-migrated-1ygjrzr">{ui("Cutoff em segundos", "Cutoff in seconds")}</label>
                          <input type="number" min="0" max="604800" className="pmy-form-input" value={gygConfigCutoff} onChange={(e) => setGygConfigCutoff(e.target.value)}
                            placeholder="Ex.: 3600" />
                        </div>
                      </div>

                      <label className="pmy-ds-migrated-10ufuqp">
                        <input
                          type="checkbox"
                          checked={gygConfigPriceOverApi}
                          onChange={(e) => setGygConfigPriceOverApi(e.target.checked)}
                          className="pmy-ds-migrated-1juj53y"
                        />
                        <span>
                          <strong>{ui("Preço via API", "Price via API")}</strong>. Ative somente quando as categorias/preços deste produto estiverem idênticos aos configurados no GetYourGuide. Por padrão fica desligado.
                        </span>
                      </label>

                      {gygConfigMessage && (
                        <div className={`pmy-ds-inline-message ${gygConfigMessage.includes('salva') ? "is-success" : "is-danger"}`}>
                          {gygConfigMessage}
                        </div>
                      )}

                      <button type="button" className="pmy-btn-submit pmy-u-mt-3" onClick={handleSaveGygTourConfig} disabled={gygConfigSaving}>
                        {gygConfigSaving ? ui('Salvando...','Saving...') : ui('💾 Salvar configuração GYG','💾 Save GYG configuration')}
                      </button>
                    </>
                  )}
                </div>

                <div className="pmy-ds-migrated-12y480p">
                  <button type="button" onClick={() => window.open('https://integrator.getyourguide.com/', '_blank')}
                    className="pmy-ds-migrated-1hgd3ce">
                    Abrir Integrator Portal ↗
                  </button>
                  <button type="button" className="pmy-btn-submit pmy-ds-migrated-ckcaff" onClick={() => setConnectingPlatform(null)} >
                    Fechar
                  </button>
                </div>
              </div>
            )}

            {/* ── TRIPADVISOR: conteúdo/reputação, não canal de reservas ── */}
            {isTripadvisor && (
              <div>
                <div className="pmy-ds-migrated-126x48q">
                  <div className="pmy-ds-migrated-1ddsok5">
                    🦉 Tripadvisor = Conteúdo & Reputação
                  </div>
                  <div className="pmy-ds-migrated-1y98iuh">
                    <div>⭐ Reviews e ratings: <strong>Tripadvisor Terra API</strong></div>
                    <div>📷 Fotos e dados da localização: <strong>Tripadvisor Terra API</strong></div>
                    <div>🎟️ Reservas de tours/atividades: <strong>{ui("geridas pela integração Viator", "managed by the Viator integration")}</strong></div>
                    <div>🚫 Agenda, vagas, bloqueios e overbooking: <strong>{ui("Tripadvisor não entra como canal separado", "Tripadvisor is not treated as a separate channel")}</strong></div>
                  </div>
                </div>

                <div className="pmy-ds-migrated-12pzgqr">
                  <strong>{ui("Sem duplicar reservas.", "No duplicate bookings.")}</strong> Quando uma experiência da PMY aparece no Tripadvisor, o inventário e as reservas são distribuídos pela Viator. A Central deve contabilizar essa venda como Viator, não como um segundo canal Tripadvisor.
                </div>

                <div className="pmy-ds-migrated-1t8mads">
                  <div className="pmy-ds-migrated-1efxhyu">{ui("O que poderemos integrar separadamente", "What we can integrate separately")}</div>
                  <ul className="pmy-ds-migrated-1dhnes7">
                    <li>{ui("reviews recentes da empresa/localização", "recent company/location reviews")}</li>
                    <li>{ui("nota média e quantidade de avaliações", "average rating and review count")}</li>
                    <li>{ui("fotos e dados públicos da localização", "public location photos and data")}</li>
                    <li>{ui("widgets/links de reputação no site e na Central, quando permitido pelo plano Terra", "reputation widgets/links on the website and in the Central, when allowed by the Terra plan")}</li>
                  </ul>
                </div>

                <div className="pmy-ds-migrated-12y480p">
                  <button type="button" onClick={() => window.open('https://docs.terra.tripadvisor.com/docs/overview', '_blank')}
                    className="pmy-ds-migrated-bhqwnz">
                    Abrir documentação Terra ↗
                  </button>
                  <button type="button" className="pmy-btn-submit pmy-ds-migrated-ckcaff" onClick={() => setConnectingPlatform(null)} >
                    Fechar
                  </button>
                </div>
              </div>
            )}

            {/* ── VIATOR / CIVITATIS: credencial real no backend ── */}
            {isManagedCredential && (
              <div>
                <div className={`pmy-ds-state-panel ${conn.connected ? "is-success" : conn.validationError ? "is-danger" : conn.configured ? "" : "is-warning"}`}>
                  <div className={`pmy-ds-state-title ${conn.connected ? "is-success" : conn.validationError ? "is-danger" : conn.configured ? "" : "is-warning"}`}>
                    {conn.connected
                      ? ui("Canal conectado por tráfego autenticado", "Channel connected by authenticated traffic")
                      : conn.validationError
                        ? ui("Erro no último teste da credencial", "Credential last test failed")
                        : conn.configured
                          ? ui("Credencial configurada · aguardando tráfego real", "Credential configured · waiting for real traffic")
                          : ui("Credencial ainda não configurada", "Credential not configured yet")}
                  </div>
                  <div className="pmy-ds-migrated-zwhy5l">
                    <div>
                      {ui("Armazenamento:", "Storage:")} <strong>{conn.credentialSource === "ENCRYPTED" ? "IntegrationSecret · AES-256-GCM" : conn.credentialSource === "ENV" ? ui("Secret do servidor (legado)", "Server secret (legacy)") : ui("não configurado", "not configured")}</strong>
                    </div>
                    <div>
                      {ui("Último teste:", "Last test:")} <strong>{conn.lastSync || ui("ainda não executado", "not run yet")}</strong>
                    </div>
                    <div>
                      {ui("Status do teste:", "Test status:")} <strong>{conn.lastValidationStatus || ui("sem registro", "no record")}</strong>
                    </div>
                    {conn.fingerprint && (
                      <div>
                        {ui("Fingerprint:", "Fingerprint:")} <code>{conn.fingerprint}</code>
                      </div>
                    )}
                    {conn.lastValidationMessage && (
                      <div className="pmy-u-mt-2">{conn.lastValidationMessage}</div>
                    )}
                  </div>
                </div>

                {!integrationCredentialStatus?.encryptionReady ? (
                  <div className="pmy-ds-state-panel is-warning">
                    <div className="pmy-ds-state-title is-warning">
                      {ui("Armazenamento criptografado indisponível", "Encrypted storage unavailable")}
                    </div>
                    <div className="pmy-ds-migrated-rhcrii">
                      {ui(
                        "Os campos ficam ocultos até INTEGRATION_ENCRYPTION_KEY estar configurada no servidor.",
                        "Fields stay hidden until INTEGRATION_ENCRYPTION_KEY is configured on the server.",
                      )}
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="pmy-ds-migrated-10tglp5">
                      <div className="pmy-ds-migrated-lqsxsk">
                        {ui("Como esta integração funciona", "How this integration works")}
                      </div>
                      <ol className="pmy-ds-migrated-1irya13">
                        {(guide?.steps || []).map((step, index) => (
                          <li key={index} className="pmy-ds-migrated-rhcrii">{step}</li>
                        ))}
                      </ol>
                    </div>

                    <div className="pmy-ds-migrated-1t8mads">
                      <div className="pmy-ds-migrated-lqsxsk">
                        {conn.configured
                          ? ui("Substituir credencial armazenada", "Replace stored credential")
                          : ui("Salvar credencial com criptografia", "Save encrypted credential")}
                      </div>

                      <div className="pmy-form-group pmy-ds-migrated-14ogarx">
                        <label className="pmy-ds-migrated-18dm9zi">{guide.field1Label}</label>
                        <input
                          type="password"
                          autoComplete="new-password"
                          className="pmy-form-input"
                          placeholder={guide.field1Placeholder}
                          value={apiKeyInput}
                          onChange={(event) => setApiKeyInput(event.target.value)}
                        />
                      </div>

                      {connectingPlatform === "viator" && (
                        <div className="pmy-form-group pmy-ds-migrated-1x7aa6i">
                          <label className="pmy-ds-migrated-18dm9zi">{guide.field2Label}</label>
                          <input
                            type="text"
                            inputMode="numeric"
                            className="pmy-form-input"
                            placeholder={guide.field2Placeholder}
                            value={apiSecretInput}
                            onChange={(event) => setApiSecretInput(event.target.value.replace(/\D/g, ""))}
                          />
                        </div>
                      )}

                      {connectingPlatform === "civitatis" && (
                        <div className="pmy-form-group pmy-ds-migrated-1x7aa6i">
                          <label className="pmy-ds-migrated-18dm9zi">{ui("Ambiente", "Environment")}</label>
                          <select
                            className="pmy-form-input"
                            value={integrationEnvironmentInput}
                            onChange={(event) => setIntegrationEnvironmentInput(event.target.value)}
                          >
                            <option value="test">test</option>
                            <option value="live">live</option>
                          </select>
                        </div>
                      )}
                    </div>

                    {integrationCredentialMessage && (
                      <div className={`pmy-ds-inline-message ${integrationCredentialMessage.toLowerCase().includes("falha") || integrationCredentialMessage.toLowerCase().includes("não ") ? "is-danger" : "is-success"}`}>
                        {integrationCredentialMessage}
                      </div>
                    )}

                    <div className="pmy-ds-actions pmy-u-mt-3">
                      <button
                        type="button"
                        className="pmy-btn-submit"
                        onClick={() => handleConfirmConnect(connectingPlatform)}
                        disabled={
                          integrationCredentialLoading ||
                          !apiKeyInput.trim() ||
                          (connectingPlatform === "viator" && !apiSecretInput.trim())
                        }
                      >
                        {integrationCredentialLoading
                          ? ui("Salvando e testando...", "Saving and testing...")
                          : ui("Salvar e testar credencial", "Save and test credential")}
                      </button>

                      {conn.configured && conn.credentialSource === "ENCRYPTED" && (
                        <>
                          <button
                            type="button"
                            className="pmy-ds-migrated-r8mbti"
                            onClick={() => handleTestIntegrationCredential(connectingPlatform)}
                            disabled={integrationCredentialLoading}
                          >
                            {ui("Testar novamente", "Test again")}
                          </button>
                          <button
                            type="button"
                            className="pmy-ds-migrated-1vibuhi"
                            onClick={() => handleDisconnect(connectingPlatform)}
                            disabled={integrationCredentialLoading}
                          >
                            {ui("Remover credencial", "Remove credential")}
                          </button>
                        </>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* ── HEADOUT: sem adapter verificável, sem campos falsos ── */}
            {isHeadout && (
              <div>
                <div className="pmy-ds-state-panel is-warning">
                  <div className="pmy-ds-state-title is-warning">
                    {ui("Integração ainda não liberada para credenciais", "Integration not yet enabled for credentials")}
                  </div>
                  <div className="pmy-ds-migrated-rhcrii">
                    {ui(
                      "A Central já possui a arquitetura de canal e mapeamento, mas ainda não há uma API Headout concedida à conta PMY que possamos testar. Por isso os campos de API Key foram removidos. O canal não será exibido como conectado até existir uma verificação real.",
                      "The Central already has the channel and mapping architecture, but PMY has not yet been granted a Headout API that can be tested. API key fields are therefore hidden. The channel will not appear as connected until a real verification exists.",
                    )}
                  </div>
                </div>
                <div className="pmy-ds-migrated-12y480p">
                  <button
                    type="button"
                    className="pmy-btn-submit pmy-ds-migrated-ckcaff"
                    onClick={() => setConnectingPlatform(null)}
                  >
                    {ui("Fechar", "Close")}
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    );
  };

  const renderModal = () => {
    if (!activeModal) return null;
    let title = "", content = null;

    if (activeModal === 'calendarDay') {
      title = lang === 'en'
        ? `📅 Schedule for ${currentMonthLabel} ${selectedCalendarDay}, ${currentYear}`
        : `📅 Grade do Dia ${selectedCalendarDay} de ${currentMonthLabel} de ${currentYear}`;
      const dayBlocks = getCalendarDayBlocks(selectedCalendarDay);
      const dayBookings = getCalendarDayBookings(selectedCalendarDay);
      const dayAssignments = getCalendarDayAssignments(selectedCalendarDay);
      const dayStats = getCalendarDayStats(selectedCalendarDay);
      const isGloballyBlocked = dayBlocks.some(block => !block.tourId);
      content = (
        <div>
          <h4 className="pmy-ds-migrated-rg4op4">{ui("Reservas confirmadas e pré-reservas ativas:", "Confirmed bookings and active pre-bookings:")}</h4>
          <div className="pmy-ds-migrated-1iaao15">
            {dayBookings.length > 0 ? (
              <>
                <div className="pmy-ds-migrated-tymypy">
                  <div className="pmy-ds-migrated-1q2shfb">
                    <div className="pmy-ds-migrated-ctpaem">{dayStats.bookingCount}</div>
                    <div className="pmy-ds-migrated-qric2k">{ui("reservas", "bookings")}</div>
                  </div>
                  <div className="pmy-ds-migrated-1q2shfb">
                    <div className="pmy-ds-migrated-ctpaem">{dayStats.passengers}</div>
                    <div className="pmy-ds-migrated-qric2k">{ui("passageiros", "passengers")}</div>
                  </div>
                  <div className="pmy-ds-migrated-1q2shfb">
                    <div className="pmy-ds-migrated-ctpaem">{dayStats.remaining}/{dayStats.capacity}</div>
                    <div className="pmy-ds-migrated-qric2k">{ui("vagas restantes", "spots remaining")}</div>
                  </div>
                </div>

                {dayBookings.map((booking, i) => {
                  const tour = (tours || []).find(item => item.id === booking.tourId);
                  const parts = getLisbonBookingParts(booking.startTime);
                  const pax = getBookingPassengers(booking);
                  const platformLabel =
                    booking.platform === 'SHOPIFY' ? 'Shopify' :
                    booking.platform === 'GETYOURGUIDE' ? 'GetYourGuide' :
                    booking.platform === 'VIATOR' ? 'Viator' :
                    booking.platform || 'Central';

                  return (
                    <div key={booking.id} className={`pmy-ds-booking-row ${i === dayBookings.length - 1 ? "is-last" : ""}`}>
                      <div>
                        <div className="pmy-ds-migrated-1i4hdds">
                          {tour?.title || 'Tour'}
                        </div>
                        <div className="pmy-ds-migrated-1guweit">
                          🕒 {parts?.timeKey || '—'} · 👥 {pax} pax · 🛒 {platformLabel}
                          {booking.bookingRef ? ` · ${booking.bookingRef}` : ''}
                        </div>
                        <div className="pmy-ds-migrated-1mlhxwo">
                          {booking.adults > 0 ? `Adult ${booking.adults}  ` : ''}
                          {booking.children > 0 ? `Child ${booking.children}  ` : ''}
                          {booking.youths > 0 ? `Youth ${booking.youths}  ` : ''}
                          {booking.seniors > 0 ? `Senior ${booking.seniors}` : ''}
                        </div>
                      </div>
                      <span className={`pmy-ds-booking-status ${booking.status === 'CONFIRMED' ? "is-confirmed" : "is-pending"}`}>
                        {booking.status==='CONFIRMED'?ui('CONFIRMADA','CONFIRMED'):ui('PENDENTE','PENDING')}
                      </span>
                    </div>
                  );
                })}
              </>
            ) : (
              <p className="pmy-ds-migrated-en208m">
                Nenhuma reserva para este dia.
              </p>
            )}
          </div>
          <hr className="pmy-ds-migrated-1gk8eya" />
          <h4 className="pmy-ds-migrated-rg4op4">
            {ui("Escala de guias:", "Guide assignments:")}
          </h4>
          <div className="pmy-ds-migrated-1iaao15">
            {dayAssignments.length > 0 ? dayAssignments.map((assignment) => {
              const parts = getLisbonBookingParts(assignment.startTime);
              return (
                <div key={assignment.id} className="pmy-list-item">
                  <div>
                    <strong>{assignment.tour?.title || ui("Tour", "Tour")}</strong>
                    <div className="pmy-ds-migrated-1imkwof">
                      🕒 {parts?.timeKey || "—"} · 🧑‍🏫 {assignment.guide?.name || ui("Guia", "Guide")}
                    </div>
                  </div>
                  <button
                    type="button"
                    className="pmy-int-btn-disconnect"
                    disabled={guideAssignmentSaving}
                    onClick={() => handleRemoveGuideAssignment(assignment.id)}
                  >
                    {ui("Remover escala", "Remove assignment")}
                  </button>
                </div>
              );
            }) : (
              <p className="pmy-ds-migrated-en208m">
                {ui("Nenhum guia escalado para este dia.", "No guide assigned for this day.")}
              </p>
            )}
          </div>
          <hr className="pmy-ds-migrated-1gk8eya" />
          {dayBlocks.length > 0 && (
            <div className="pmy-ds-migrated-9ru3fj">
              🔒 {dayBlocks.length} regra{dayBlocks.length===1?'':'s'} de disponibilidade ativa{dayBlocks.length===1?'':'s'} neste dia.
              {isGloballyBlocked ? ' O dia inteiro está bloqueado.' : ' Os bloqueios são aplicados apenas aos tours/horários configurados.'}
            </div>
          )}
          {isGloballyBlocked ? (
            <div className="pmy-ds-migrated-11ejay0">
              {ui('🔒 Alocação Suspensa: este dia possui um bloqueio global na Agenda Central.','🔒 Allocation Suspended: this day has a global block in the Central Agenda.')}
            </div>
          ) : (
            <div>
              {!isFormAllocating ? (
                <button type="button" className="pmy-btn-submit" onClick={() => setIsFormAllocating(true)}>{ui("+ Adicionar Novo Tour a este Dia", "+ Add New Tour to This Day")}</button>
              ) : (
                <div className="pmy-ds-migrated-8q1173">
                  <h4 className="pmy-ds-migrated-1j7wbnq">{ui("➕ Escalar Passeio na Folha Diária", "➕ Assign Tour to Daily Schedule")}</h4>
                  <div className="pmy-form-box-item pmy-ds-migrated-ismtyz" >
                    <label className="pmy-ds-migrated-67de2v">{ui("Selecione o Tour", "Select Tour")}</label>
                    <select className="pmy-form-input" value={modalSelectedTour} onChange={e => handleModalTourChange(e.target.value)} required>
                      <option value="">{ui("-- Selecione o Tour --", "-- Select Tour --")}</option>
                      {tourOptions.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
                    </select>
                  </div>
                  {modalSelectedTour && (
                    <div className="pmy-form-box-item pmy-ds-migrated-ismtyz" >
                      <label className="pmy-ds-migrated-67de2v">{ui("Selecione o Horário:", "Select Time:")}</label>
                      <select
                        className="pmy-form-input"
                        value={modalSelectedHour}
                        onChange={(event) => setModalSelectedHour(event.target.value)}
                      >
                        {modalAvailableHours.map(h => <option key={h} value={h}>{h}</option>)}
                      </select>
                    </div>
                  )}
                  <div className="pmy-form-box-item pmy-ds-migrated-ismtyz" >
                    <label className="pmy-ds-migrated-67de2v">{ui("Selecione o Guia:", "Select Guide:")}</label>
                    <select
                      className="pmy-form-input"
                      value={modalSelectedGuide}
                      onChange={(event) => setModalSelectedGuide(event.target.value)}
                    >
                      <option value="">{ui("-- Selecione o Guia --", "-- Select Guide --")}</option>
                      {guidesList.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                    </select>
                  </div>
                  {guideAssignmentMessage && (
                    <div className={`pmy-ds-inline-message ${guideAssignmentMessage.toLowerCase().includes("erro") || guideAssignmentMessage.toLowerCase().includes("já está") || guideAssignmentMessage.toLowerCase().includes("não foi") ? "is-danger" : "is-success"}`}>
                      {guideAssignmentMessage}
                    </div>
                  )}
                  <button
                    type="button"
                    className="pmy-btn-submit"
                    disabled={guideAssignmentSaving || !modalSelectedTour || !modalSelectedHour || !modalSelectedGuide}
                    onClick={handleSaveGuideAssignment}
                  >
                    {guideAssignmentSaving
                      ? ui("Publicando escala...", "Publishing assignment...")
                      : ui("Confirmar e Publicar Escala", "Confirm and Publish Schedule")}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      );
    } else if (activeModal === 'pickPhotoForGuide') {
      title = ui("🖼️ Escolher Foto","🖼️ Choose Photo");
      const allImages = mediaList.filter(
        (m, idx, arr) =>
          m.mimetype?.startsWith('image/') &&
          arr.findIndex((item) => item.url === m.url) === idx,
      );
      const pickerCallback = window.__pmyPickerCallback;
      content = (
        <PickerModalContent
          allImages={allImages}
          onSelect={(url) => {
            if (pickerCallback) { pickerCallback(url); window.__pmyPickerCallback = null; }
            setActiveModal(null);
          }}
        />
      );
    } else if (activeModal === 'guideDetails' && selectedGuideInfo) {
      title = ui("Detalhes do Guia","Guide Details");
      content = (
        <div>
          <div className="pmy-ds-migrated-s219yw">
            <img src={selectedGuideInfo.photo} alt={selectedGuideInfo.name} className="pmy-ds-migrated-h7rqpk" />
            <div>
              <h2 className="pmy-ds-migrated-1xc4j8f">{selectedGuideInfo.name}</h2>
              <div className="pmy-ds-migrated-llii8p">✉️ {selectedGuideInfo.email||'N/A'}</div>
              <div className="pmy-ds-migrated-1g1g73g">📱 {selectedGuideInfo.whatsapp||'N/A'}</div>
            </div>
          </div>
          <h4 className="pmy-ds-migrated-uzos4w">{ui("Próximos 7 Tours Atribuídos:", "Next 7 Assigned Tours:")}</h4>
          <div className="pmy-ds-migrated-1iaao15">
            {guideAssignmentsList
              .filter((assignment) =>
                assignment.guideId === selectedGuideInfo.id &&
                assignment.status === "ASSIGNED" &&
                new Date(assignment.startTime) >= new Date()
              )
              .sort((a, b) => new Date(a.startTime) - new Date(b.startTime))
              .slice(0, 7)
              .map((assignment) => (
                <div className="pmy-list-item pmy-ds-migrated-16en88k" key={assignment.id}>
                  <span>🧭 {assignment.tour?.title || ui("Tour", "Tour")}</span>
                  <strong>
                    {new Date(assignment.startTime).toLocaleString(
                      lang === "pt" ? "pt-PT" : "en-GB",
                      {
                        timeZone: "Europe/Lisbon",
                        day: "2-digit",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      },
                    )}
                  </strong>
                </div>
              ))}
            {guideAssignmentsList.filter((assignment) =>
              assignment.guideId === selectedGuideInfo.id &&
              assignment.status === "ASSIGNED" &&
              new Date(assignment.startTime) >= new Date()
            ).length === 0 && (
              <p className="pmy-ds-migrated-en208m">
                {ui("Nenhuma escala futura atribuída a este guia.", "No future assignment for this guide.")}
              </p>
            )}
          </div>

          {selectedGuideInfo?.utmId && (
            <div className="pmy-ds-migrated-1tqyd6n">
              <h4 className="pmy-ds-migrated-mlhmew">{ui("🔗 Link de Indicação UTM", "🔗 UTM Referral Link")}</h4>
              <div className="pmy-ds-migrated-1l6zt83">
                <code className="pmy-ds-migrated-eo31ti">
                  {selectedGuideInfo.referralLink}
                </code>
                <button onClick={() => navigator.clipboard.writeText(selectedGuideInfo.referralLink).then(()=>alert(ui('Copiado!','Copied!'))).catch(()=>{})}
                  className="pmy-ds-migrated-2ek2w0">
                  📋
                </button>
              </div>
              <div className="pmy-ds-migrated-1tivhpi">
                {[
                  { label: 'utm_campaign', value: selectedGuideInfo.utmId },
                  { label: 'utm_source',   value: 'guia' },
                  { label: 'utm_medium',   value: 'indicacao' },
                  { label: 'utm_content',  value: selectedGuideInfo.name?.toLowerCase().replace(/\s+/g,"_").replace(/[^a-z0-9_]/g,"") },
                ].map((p,i) => (
                  <div key={i} className="pmy-ds-migrated-zb4ttd">
                    <div className="pmy-ds-migrated-x2g73f">{p.label}</div>
                    <code className="pmy-ds-migrated-18qyl6w">{p.value}</code>
                  </div>
                ))}
              </div>
              <div className="pmy-ds-migrated-1v3pzky">
                💡 {ui('Acesse','Go to')} <strong>Shopify → Marketing → {ui('Campanhas','Campaigns')}</strong> {ui('para ver as métricas desta campanha.','to view this campaign’s metrics.')}
              </div>
            </div>
          )}
        </div>
      );
    } else if (activeModal === 'sales') {
      title = lang === 'pt' ? "Vendas por Canal" : "Sales by Channel";
      content = (
        <div>
          <div className="pmy-ds-migrated-15kb926">
            <div className="pmy-ds-migrated-bn454q">{totalSalesCount}</div>
            <div className="pmy-ds-migrated-q9qvqo">{lang==='pt'?'reservas confirmadas no período':'confirmed bookings in period'} · {getPeriodLabel()}</div>
          </div>
          {salesByChannel.length === 0 ? (
            <p className="pmy-ds-migrated-qx2f5l">{lang==='pt'?'Nenhuma venda confirmada no período.':'No confirmed sales in this period.'}</p>
          ) : salesByChannel.map(channel => (
            <div className="pmy-list-item" key={channel.platform}>
              <div>
                <strong>{channel.label}</strong>
                <div className="pmy-ds-migrated-1imkwof">
                  {channel.bookings} {lang==='pt'?'reservas':'bookings'} · {channel.passengers} pax
                  {channel.missingValue > 0 ? ` · ⚠️ ${channel.missingValue} ${lang==='pt'?'sem valor':'without value'}` : ''}
                </div>
              </div>
              <div className="pmy-ds-migrated-dzs10n">
                {Object.entries(channel.revenueByCurrency).length > 0
                  ? Object.entries(channel.revenueByCurrency).map(([currency, amount]) => (
                      <div key={currency} className="pmy-ds-migrated-y33mrr">{formatMoney(amount, currency)}</div>
                    ))
                  : <span className="pmy-ds-migrated-chpnty">—</span>}
              </div>
            </div>
          ))}
        </div>
      );
    } else if (activeModal === 'canceled') {
      title = lang === 'pt' ? "Cancelamentos" : "Cancellations";
      content = (
        <div>
          <div className="pmy-ds-migrated-cmwaz9">
            <div className="pmy-ds-migrated-dk3p17">
              <div className="pmy-ds-migrated-4eykw2">{canceledCount}</div>
              <div className="pmy-ds-migrated-1mlhxwo">{lang==='pt'?'cancelamentos no período':'cancellations in period'}</div>
            </div>
            <div className="pmy-ds-migrated-9plhb3">
              <div className="pmy-ds-migrated-1jgtff0">{cancellationRate.toFixed(1)}%</div>
              <div className="pmy-ds-migrated-1mlhxwo">{lang==='pt'?'taxa de cancelamento':'cancellation rate'}</div>
            </div>
          </div>
          {realCanceledBookings.length === 0
            ? <p className="pmy-ds-migrated-qx2f5l">{lang==='pt'?'Nenhum cancelamento registrado no período.':'No cancellations in this period.'}</p>
            : realCanceledBookings.map(b => (
                <div className="pmy-list-item" key={b.id}>
                  <div>
                    <strong>{b.customerName||"N/A"}</strong>
                    <div className="pmy-ds-migrated-1imkwof">
                      {platformLabel(b.platform)} · {new Date(b.externalUpdatedAt || b.updatedAt || b.createdAt).toLocaleDateString(lang==='pt'?'pt-PT':'en-GB')}
                      {b.cancelReason ? ` · ${b.cancelReason}` : ''}
                    </div>
                  </div>
                  <span className="pmy-ds-migrated-g36fy">
                    {moneyValue(b) !== null && bookingCurrency(b) ? formatMoney(moneyValue(b), bookingCurrency(b)) : '—'}
                  </span>
                </div>
              ))}
        </div>
      );
    } else if (activeModal === 'confirmed') {
      title = lang === 'pt' ? "Faturamento Confirmado" : "Confirmed Revenue";
      content = (
        <div>
          <div className="pmy-ds-migrated-v9m9mh">
            <div className="pmy-ds-migrated-ks5tu8">
              {confirmedRevenueValue > 0 ? formatMoney(confirmedRevenueValue) : '—'}
            </div>
            <div className="pmy-ds-migrated-306txk">
              {pricedConfirmedBookings.length} {lang==='pt'?'reservas com valor real':'bookings with real value'}
              {missingFinancialBookings.length > 0 ? ` · ${missingFinancialBookings.length} ${lang==='pt'?'sem valor financeiro':'without financial value'}` : ''}
            </div>
            {revenueCurrencies.length > 1 && (
              <div className="pmy-ds-migrated-1a7crin">
                ⚠️ {lang==='pt'?'Existem múltiplas moedas. O cartão principal mostra':'Multiple currencies detected. Main card shows'} {dashboardCurrency}.
              </div>
            )}
          </div>
          {realConfirmedBookings.length === 0
            ? <div className="pmy-ds-migrated-1urcfkr">
                <div className="pmy-ds-migrated-8rge5c">📋</div>
                <div className="pmy-ds-migrated-psj0ex">{lang==='pt'?'Nenhuma reserva confirmada no período':'No confirmed bookings in this period'}</div>
              </div>
            : realConfirmedBookings.map(b => {
                const tour = (tours || []).find(item => item.id === b.tourId);
                return (
                  <div className="pmy-list-item" key={b.id}>
                    <div>
                      <strong>{tour?.title || b.customerName || "Reserva"}</strong>
                      <div className="pmy-ds-migrated-1imkwof">
                        {platformLabel(b.platform)} · {new Date(b.startTime).toLocaleDateString(lang==='pt'?'pt-PT':'en-GB')} · {Number(b.totalParticipants || 0)} pax
                      </div>
                    </div>
                    <span className={moneyValue(b)!==null&&bookingCurrency(b) ? "pmy-ds-state-text is-success pmy-u-extrabold" : "pmy-ds-state-text is-warning pmy-u-extrabold"}>
                      {moneyValue(b)!==null&&bookingCurrency(b) ? formatMoney(moneyValue(b), bookingCurrency(b)) : (lang==='pt'?'Sem valor':'No value')}
                    </span>
                  </div>
                );
              })
          }
        </div>
      );
    } else if (activeModal === 'estimated') {
      title = lang === 'pt' ? "Ticket Médio" : "Average Ticket";
      content = (
        <div>
          <div className="pmy-ds-migrated-qgwi9k">
            <div className="pmy-ds-migrated-ey1tb3">
              {averageTicketValue > 0 ? formatMoney(averageTicketValue) : '—'}
            </div>
            <div className="pmy-ds-migrated-306txk">
              {lang==='pt'?'Faturamento real dividido pelas reservas com valor na mesma moeda.':'Real revenue divided by bookings priced in the same currency.'}
            </div>
          </div>
          <div className="pmy-ds-migrated-ezx7vp">
            <div className="pmy-ds-migrated-7h7616">
              <div className="pmy-ds-migrated-1edjp0n">{pricedConfirmedBookings.length}</div>
              <div className="pmy-ds-migrated-1mlhxwo">{lang==='pt'?'reservas usadas no cálculo':'bookings used in calculation'}</div>
            </div>
            <div className={`pmy-ds-metric-state ${missingFinancialBookings.length ? "is-warning" : "is-success"}`}>
              <div className={`pmy-ds-metric-state__value ${missingFinancialBookings.length ? "is-warning" : "is-success"}`}>{missingFinancialBookings.length}</div>
              <div className="pmy-ds-migrated-1mlhxwo">{lang==='pt'?'reservas sem valor':'bookings without value'}</div>
            </div>
          </div>
          {revenueCurrencies.length > 1 && (
            <div className="pmy-ds-migrated-4znly2">
              ⚠️ {lang==='pt'?'O ticket médio não mistura moedas. O valor principal usa':'Average ticket never mixes currencies. Main value uses'} {dashboardCurrency}.
            </div>
          )}
        </div>
      );
    } else if (activeModal === 'upcoming') {
      title = lang === 'pt' ? "Próximas Saídas — 30 dias" : "Upcoming Departures — 30 days";
      content = (
        <div>
          <div className="pmy-ds-migrated-1mkckx0">
            <div className="pmy-ds-migrated-ks5tu8">{upcomingCount}</div>
            <div className="pmy-ds-migrated-1trl76t">{lang==='pt'?'saídas únicas com reservas confirmadas ou pendentes':'unique departures with confirmed or pending bookings'}</div>
          </div>
          {upcomingDepartures.length === 0 ? (
            <p className="pmy-ds-migrated-qx2f5l">{lang==='pt'?'Nenhuma saída nos próximos 30 dias.':'No departures in the next 30 days.'}</p>
          ) : upcomingDepartures.map(departure => {
            const tour = (tours || []).find(item => item.id === departure.tourId);
            const when = departure.startTime.toLocaleString(lang==='pt'?'pt-PT':'en-GB', {
              timeZone:'Europe/Lisbon',
              day:'2-digit',
              month:'2-digit',
              year:'numeric',
              hour:'2-digit',
              minute:'2-digit',
            });
            return (
              <div className="pmy-list-item" key={departure.key}>
                <div>
                  <strong>{tour?.title || 'Tour'}</strong>
                  <div className="pmy-ds-migrated-1imkwof">
                    {when} · {departure.bookings} {lang==='pt'?'reservas':'bookings'} · {departure.passengers} pax
                  </div>
                  <div className="pmy-ds-migrated-1761q2k">{[...departure.platforms].join(' · ')}</div>
                </div>
              </div>
            );
          })}
        </div>
      );
    }
    return (
      <div className="pmy-modal-overlay" onClick={() => setActiveModal(null)}>
        <div className="pmy-modal" onClick={e => e.stopPropagation()}>
          <div className="pmy-modal-header">
            <div className="pmy-modal-title">{title}</div>
            <button className="pmy-modal-close" onClick={() => setActiveModal(null)}>&times;</button>
          </div>
          <div className="pmy-modal-body">{content}</div>
        </div>
      </div>
    );
  };


  const renderEditGuideModal = () => {
    if (!editingGuide) return null;
    const guide = guidesList.find(g => g.id === editingGuide);
    if (!guide) return null;
    const currentDdi = ddiList.find(d => d.code === editGuideDdi) || { iso: "PT" };
    return (
      <div className="pmy-modal-overlay" onClick={() => setEditingGuide(null)}>
        <div className="pmy-ds-migrated-zuczkc" onClick={e => e.stopPropagation()}>
          <div className="pmy-ds-migrated-1ig0zoz">
            <div className="pmy-ds-migrated-g4mnio">
              <div className="pmy-ds-migrated-otectg">
                <img src={editGuidePhoto || guide.photo} alt={guide.name}
                  className="pmy-ds-migrated-1sos9w" />
                <button type="button" onClick={() => openShopifyFilePicker((url) => setEditGuidePhoto(url))}
                  title={ui('Escolher do banco da Shopify','Choose from Shopify library')}
                  className="pmy-ds-migrated-1canwv8">📷</button>
                <input type="file" accept="image/*" className="pmy-ds-migrated-1cibdmr" ref={editGuidePhotoRef} onChange={handleEditGuidePhotoChange} />
              </div>
              <div>
                <div className="pmy-ds-migrated-1w8jk2f">{ui("Editando guia", "Editing guide")}</div>
                <div className="pmy-ds-migrated-16qi501">{guide.name}</div>
              </div>
            </div>
            <button onClick={() => setEditingGuide(null)}
              className="pmy-ds-migrated-6cymc4">&times;</button>
          </div>
          <form onSubmit={handleSaveEditGuide} className="pmy-ds-migrated-bp52w">
            <div className="pmy-ds-migrated-kxbe7g">
              <div className="pmy-form-group pmy-ds-migrated-1a0iesu" >
                <label>{ui("Nome e Sobrenome", "Full Name")}</label>
                <input type="text" className="pmy-form-input" value={editGuideName} onChange={e => setEditGuideName(e.target.value)} required />
              </div>
              <div className="pmy-form-group pmy-ds-migrated-1a0iesu" >
                <label>E-mail</label>
                <input type="email" className="pmy-form-input" value={editGuideEmail} onChange={e => setEditGuideEmail(e.target.value)} />
              </div>
              <div className="pmy-form-group pmy-ds-migrated-1a0iesu" >
                <label>WhatsApp</label>
                <div className="pmy-ds-migrated-1xq7i67">
                  <div className="pmy-ds-migrated-186wwav">
                    <img src={getFlagUrl(currentDdi.iso)} alt="" className="pmy-ds-migrated-15ma959" />
                    <select className="pmy-form-input pmy-ds-migrated-zk0se5"  value={editGuideDdi} onChange={e => setEditGuideDdi(e.target.value)}>
                      {ddiList.map((d,i) => <option key={i} value={d.code}>{d.code}</option>)}
                    </select>
                  </div>
                  <input type="tel" className="pmy-form-input" placeholder="912 345 678" value={editGuideWhatsapp} onChange={e => setEditGuideWhatsapp(e.target.value)} required />
                </div>
              </div>

              <div className="pmy-form-group pmy-ds-migrated-1a0iesu" >
                <label>{ui("ID da Campanha UTM", "UTM Campaign ID")}</label>
                <input type="text" className="pmy-form-input pmy-ds-migrated-a4ogq7" placeholder="Ex: 21d91c"
                  value={editGuideUtmId} onChange={e => setEditGuideUtmId(e.target.value)}
                   />
                {editGuideUtmId && editGuideName && (
                  <div className="pmy-ds-migrated-1b1b88p">
                    <div className="pmy-ds-migrated-ib1k9x">
                      🔗 {`https://portugalmeandyou.com/?utm_campaign=${editGuideUtmId}&utm_source=guia&utm_medium=indicacao&utm_content=${editGuideName.toLowerCase().replace(/\s+/g,"_").replace(/[^a-z0-9_]/g,"")}`}
                    </div>
                    <button type="button" onClick={() => {
                      const url = `https://portugalmeandyou.com/?utm_campaign=${editGuideUtmId}&utm_source=guia&utm_medium=indicacao&utm_content=${editGuideName.toLowerCase().replace(/\s+/g,"_").replace(/[^a-z0-9_]/g,"")}`;
                      navigator.clipboard.writeText(url).then(() => alert(ui('Link copiado!','Link copied!'))).catch(()=>{});
                    }} className="pmy-ds-migrated-1jfo6nj">
                      📋 Copiar
                    </button>
                  </div>
                )}
              </div>
            </div>
            <div className="pmy-ds-migrated-y37ip1">
              <button type="submit" className="pmy-btn-submit pmy-ds-migrated-ckcaff" >{ui("💾 Salvar Alterações", "💾 Save Changes")}</button>
              <button type="button" onClick={() => { handleDeleteGuide(editingGuide); }}
                className="pmy-ds-migrated-138e6nr">🗑️</button>
              <button type="button" onClick={() => setEditingGuide(null)}
                className="pmy-ds-migrated-2o86xe">{ui("Cancelar", "Cancel")}</button>
            </div>
          </form>
        </div>
      </div>
    );
  };

    const dashboardSurfaceIsDark = isDarkThemeColor(theme.surfaceColor || "#FFFFFF");
    const dashboardPrimaryIsDark = isDarkThemeColor(theme.primaryColor || "#006600");
    const dashboardTextIsDark = isDarkThemeColor(theme.textColor || "#2B2B2B");
    const dashboardTitleIsDark = isDarkThemeColor(theme.titleColor || "#006600");

    const dashboardAccent =
      dashboardSurfaceIsDark === dashboardPrimaryIsDark
        ? (dashboardSurfaceIsDark ? "#F5F5F2" : "#111111")
        : (theme.primaryColor || "#006600");

    const dashboardText =
      dashboardSurfaceIsDark === dashboardTextIsDark
        ? (dashboardSurfaceIsDark ? "#F5F5F2" : "#1F1F1F")
        : (theme.textColor || "#2B2B2B");

    const dashboardTitle =
      dashboardSurfaceIsDark === dashboardTitleIsDark
        ? (dashboardSurfaceIsDark ? "#FFFFFF" : "#111111")
        : (theme.titleColor || "#006600");

    const styles = `
    :root {
      --bg-color:${theme.bgColor};
      --surface-color:${theme.surfaceColor || "#FFFFFF"};
      --input-bg-color:${theme.inputBgColor || "#FFFFFF"};
      --primary-green:${theme.primaryColor};
      --primary-hover:${theme.primaryColor}dd;
      --text-dark:${theme.textColor};
      --text-muted:#666666;
      --card-bg:${theme.surfaceColor || "#FFFFFF"};
      --border-radius:12px;
      --font-family:${theme.fontFamily},'sans-serif';
      --font-size:${theme.fontSize};
      --title-color:${theme.titleColor};
      --sidebar-bg:${theme.sidebarBg};
      --sidebar-text:${theme.sidebarTextColor || theme.textColor};
      --sidebar-muted:${theme.sidebarMutedTextColor || "#777777"};
      --sidebar-hover:${theme.sidebarHoverBg || "#F2F7F2"};
      --sidebar-active-bg:${theme.sidebarActiveBg || theme.primaryColor};
      --sidebar-active-text:${theme.sidebarActiveTextColor || "#FFFFFF"};
      --sidebar-border:${theme.sidebarBorderColor || "#E7ECE7"};
      --dashboard-accent:${dashboardAccent};
      --dashboard-accent-contrast:${isDarkThemeColor(dashboardAccent) ? "#FFFFFF" : "#111111"};
      --dashboard-text:${dashboardText};
      --dashboard-title:${dashboardTitle};
      --dashboard-muted:${dashboardSurfaceIsDark ? "#B8B8B3" : "#667069"};
      --dashboard-soft:${dashboardSurfaceIsDark ? "#1F1F1F" : "#F3F5F3"};
      --dashboard-soft-strong:${dashboardSurfaceIsDark ? "#292929" : "#E9EDE9"};
      --dashboard-border:${dashboardSurfaceIsDark ? "rgba(255,255,255,0.15)" : "rgba(28,47,34,0.12)"};
      --dashboard-shadow:${dashboardSurfaceIsDark ? "0 18px 45px rgba(0,0,0,0.28)" : "0 18px 45px rgba(22,44,29,0.075)"};
    }
    * { box-sizing:border-box; margin:0; padding:0; font-family:var(--font-family); font-size:var(--font-size); }
    body, html { overflow-x:hidden; background-color:var(--bg-color); }
    .Polaris-Page { padding:0 !important; max-width:100% !important; }
    h1.Polaris-Header-Title { display:none !important; }
    ::-webkit-scrollbar { width:6px; height:0px; }
    ::-webkit-scrollbar-thumb { background:rgba(0,0,0,0.12); border-radius:10px; }

    .pmy-app-container { display:flex; height:100vh; width:100vw; margin-left:-20px; overflow:hidden; }
    .pmy-sidebar { width:260px; background-color:var(--sidebar-bg); border-right:1px solid rgba(0,0,0,0.05); display:flex; flex-direction:column; box-shadow:2px 0 15px rgba(0,0,0,0.03); flex-shrink:0; }
    .pmy-logo-area { padding:30px 20px; text-align:center; border-bottom:1px solid #f0f0f0; display:flex; justify-content:center; align-items:center; min-height:180px; }
    .pmy-logo-placeholder { width:180px; height:80px; margin:0 auto; border:2px dashed #ccc; border-radius:8px; display:flex; align-items:center; justify-content:center; color:#999; font-weight:bold; }
    .pmy-logo-wrapper { position:relative; width:180px; height:140px; margin:0 auto; display:flex; justify-content:center; align-items:center; border-radius:8px; overflow:hidden; }
    .pmy-logo-image { max-width:100%; max-height:140px; object-fit:contain; }
    .pmy-menu { padding:20px 0; display:flex; flex-direction:column; gap:5px; }
    .pmy-menu-item { padding:12px 25px; margin:0 10px; border-radius:8px; cursor:pointer; color:var(--text-dark); font-weight:600; display:flex; align-items:center; gap:12px; transition:all 0.2s; }
    .pmy-menu-item:hover { background-color:#f5f5f5; }
    .pmy-menu-item.active { background-color:var(--primary-green); color:#ffffff; }
    .pmy-sidebar-footer { margin-top:auto; padding:20px; border-top:1px solid #f0f0f0; display:flex; flex-direction:column; align-items:center; gap:15px; }
    .pmy-lang-pill { display:flex; align-items:center; gap:12px; border:1px solid rgba(0,0,0,0.15); border-radius:30px; padding:8px 16px; background:transparent; user-select:none; }
    .pmy-lang-pill span { cursor:pointer; opacity:0.3; transition:0.2s ease; display:flex; align-items:center; justify-content:center; }
    .pmy-lang-pill span.active { opacity:1; transform:scale(1.1); }
    .pmy-flag-icon { width:24px; height:16px; object-fit:cover; border-radius:2px; box-shadow:0 1px 3px rgba(0,0,0,0.2); }
    .pmy-lang-divider { width:1px; height:18px; background:rgba(0,0,0,0.15); }
    .pmy-credit-text { font-size:12px; color:#999; text-align:center; }
    .pmy-content { flex:1; padding:40px; overflow-y:auto; height:100vh; }
    .pmy-header-top { display:flex; justify-content:space-between; align-items:center; margin-bottom:30px; }
    .pmy-page-title { font-size:28px; font-weight:800; color:var(--title-color); margin:0; }

    .pmy-grid { display:grid; grid-template-columns:repeat(auto-fit, minmax(210px,1fr)); gap:20px; margin-bottom:30px; }
    .pmy-card { background:var(--card-bg); border-radius:var(--border-radius); padding:22px; box-shadow:0 8px 20px rgba(0,0,0,0.04); border:1px solid rgba(0,0,0,0.02); position:relative; transition:0.2s ease; }
    .pmy-card.has-hover { cursor:pointer; }
    .pmy-card.has-hover:hover { box-shadow:0 12px 25px rgba(0,0,0,0.08); transform:translateY(-3px); }
    .pmy-card-icon { position:absolute; top:22px; right:22px; color:#ddd; transition:0.2s ease; }
    .pmy-card.has-hover:hover .pmy-card-icon { color:var(--primary-green); }
    .pmy-card-title { font-size:14px; color:var(--text-muted); font-weight:600; margin-bottom:10px; padding-right:20px; }
    .pmy-card-value { font-size:32px; font-weight:900; color:var(--primary-green); }

    .pmy-form-box { background:#ffffff; padding:25px; border-radius:var(--border-radius); box-shadow:0 8px 20px rgba(0,0,0,0.04); margin-bottom:25px; border:1px solid rgba(0,0,0,0.02); }
    .pmy-form-box h3 { color:var(--primary-green); margin-bottom:20px; font-weight:800; font-size:18px; border-bottom:1px solid #f5f5f5; padding-bottom:8px; }
    .pmy-form-group { display:flex; flex-direction:column; gap:6px; margin-bottom:15px; }
    .pmy-form-group label { font-size:13px; font-weight:700; color:var(--text-dark); }
    .pmy-form-input { padding:10px 14px; border:1px solid #ddd; border-radius:8px; outline:none; font-size:14px; width:100%; font-family:inherit; }
    .pmy-form-input:focus { border-color:var(--primary-green); }
    .pmy-btn-submit { background:var(--primary-green); color:#fff; font-weight:bold; border:none; padding:12px; border-radius:8px; cursor:pointer; width:100%; font-size:14px; transition:0.2s; }
    .pmy-btn-submit:hover { background:var(--primary-hover); }

    .pmy-calendar-view-tabs { display:flex; gap:5px; background:#eee; padding:4px; border-radius:8px; flex-shrink:0; }
    .pmy-cal-tab { padding:6px 14px; border:none; background:transparent; font-size:12px; font-weight:bold; color:#666; cursor:pointer; border-radius:6px; transition:0.2s; white-space:nowrap; }
    .pmy-cal-tab.active { background:#fff; color:var(--primary-green); box-shadow:0 2px 6px rgba(0,0,0,0.05); }
    .pmy-calendar-month-selector-bar { display:flex; align-items:center; gap:15px; margin-bottom:15px; }
    .pmy-calendar-nav-arrow-btn { background:#ffffff; border:1px solid #ddd; border-radius:50%; width:28px; height:28px; display:flex; align-items:center; justify-content:center; cursor:pointer; font-size:11px; font-weight:bold; transition:0.2s; color:var(--text-dark); }
    .pmy-calendar-nav-arrow-btn:hover { border-color:var(--primary-green); color:var(--primary-green); }
    .pmy-calendar-current-month-year-label { font-size:18px; font-weight:800; color:var(--text-dark); min-width:140px; text-align:center; }
    .pmy-calendar-week-headers { display:grid; grid-template-columns:repeat(7,1fr); gap:8px; text-align:center; font-weight:800; font-size:12px; color:var(--text-muted); margin-bottom:5px; padding:0 15px; }
    .pmy-calendar-grid { display:grid; grid-template-columns:repeat(7,1fr); gap:8px; background:#fff; padding:15px; border-radius:12px; box-shadow:0 8px 20px rgba(0,0,0,0.04); margin-bottom:25px; }
    .pmy-calendar-day { background:#fafafa; padding:14px 12px; border-radius:8px; cursor:pointer; transition:0.2s; border:1px solid #f0f0f0; color:var(--text-dark); min-height:105px; display:flex; flex-direction:column; justify-content:flex-start; gap:6px; text-align:left; position:relative; }
    .pmy-calendar-day:hover { background:#f0f0f0; border-color:var(--primary-green); }
    .pmy-calendar-day.active { background:var(--primary-green); color:#fff; border-color:var(--primary-green); }
    .pmy-cal-date-line { font-size:13px; font-weight:800; border-bottom:1px solid rgba(0,0,0,0.04); padding-bottom:3px; margin-bottom:2px; }
    .pmy-calendar-day.active .pmy-cal-date-line { border-bottom-color:rgba(255,255,255,0.15); }
    .pmy-cal-info-line { font-size:11px; font-weight:600; opacity:0.8; }
    .pmy-calendar-dot { width:6px; height:6px; background:#c99a3c; border-radius:50%; position:absolute; bottom:6px; right:8px; }
    .pmy-calendar-day.active .pmy-calendar-dot { background:#fff; }

    .pmy-capacity-controls { display:flex; align-items:center; gap:10px; background:#f9f9f9; padding:4px 10px; border-radius:20px; border:1px solid #eee; }
    .pmy-cap-btn { background:#fff; border:1px solid #ddd; width:26px; height:26px; border-radius:50%; font-weight:bold; cursor:pointer; display:flex; align-items:center; justify-content:center; font-size:16px; }
    .pmy-cap-btn:hover { border-color:var(--primary-green); color:var(--primary-green); }
    .pmy-tour-item { display:flex; gap:15px; padding:15px 0; border-bottom:1px solid #eee; align-items:center; justify-content:space-between; }
    .pmy-tour-item:last-child { border-bottom:none; }
    .pmy-guide-mini-tag { display:flex; align-items:center; gap:6px; background:#f5f5f5; padding:4px 10px; border-radius:20px; font-size:12px; font-weight:bold; }
    .pmy-guide-mini-img { width:18px; height:18px; border-radius:50%; object-fit:cover; }

    .pmy-accordion-header { display:flex; justify-content:space-between; align-items:center; padding:15px 0; border-bottom:1px solid #eee; cursor:pointer; transition:0.2s; }
    .pmy-accordion-header:hover { color:var(--primary-green); }
    .pmy-accordion-title { font-size:16px; font-weight:700; }
    .pmy-accordion-content { display:none; padding:15px 0; border-bottom:1px solid #eee; }
    .pmy-accordion-content.open { display:block; }
    .pmy-tour-img { width:65px; height:65px; object-fit:cover; box-shadow:0 4px 10px rgba(0,0,0,0.08); transition:border-radius 0.3s ease; background:#eee; }
    .pmy-tour-img.circle { border-radius:50%; }
    .pmy-tour-img.rounded { border-radius:12px; }
    .pmy-tour-details { flex:1; }
    .pmy-tour-name { font-weight:bold; font-size:15px; margin-bottom:6px; color:var(--text-dark); }
    .pmy-format-btn { background:#f0f0f0; border:none; border-radius:20px; padding:6px 14px; font-size:13px; font-weight:bold; color:#555; cursor:pointer; transition:0.2s; }
    .pmy-format-btn:hover { background:#e0e0e0; color:var(--primary-green); }
    .pmy-list-item { display:flex; justify-content:space-between; align-items:center; padding:15px 0; border-bottom:1px solid #eee; }
    .pmy-list-item:last-child { border-bottom:none; }
    .pmy-tag { font-size:11px; padding:3px 8px; border-radius:10px; font-weight:700; }
    .pmy-tag.viator { background:#ffe4cc; color:#cc6600; }
    .pmy-tag.gyg { background:#fff4cc; color:#cc9900; }
    .pmy-tag.site { background:#e6f2e6; color:var(--primary-green); }
    .pmy-tag-row { display:flex; gap:6px; flex-wrap:wrap; margin-top:4px; }

    .pmy-date-wrapper { position:relative; z-index:101; }
    .pmy-date-btn { display:flex; align-items:center; gap:8px; background:#ffffff; border:1px solid rgba(0,0,0,0.1); padding:10px 18px; border-radius:8px; font-weight:600; color:var(--text-dark); cursor:pointer; box-shadow:0 2px 10px rgba(0,0,0,0.02); transition:0.2s; }
    .pmy-date-btn:hover { border-color:var(--primary-green); }
    .pmy-date-overlay { position:fixed; top:0; left:0; width:100vw; height:100vh; z-index:90; background:transparent; }
    .pmy-date-dropdown { position:absolute; right:0; top:calc(100% + 8px); background:#ffffff; border-radius:12px; box-shadow:0 15px 40px rgba(0,0,0,0.15); width:320px; z-index:100; border:1px solid rgba(0,0,0,0.05); display:flex; flex-direction:column; overflow:hidden; }
    .pmy-date-presets { display:grid; grid-template-columns:1fr 1fr; gap:1px; background:#eee; }
    .pmy-date-preset-item { background:#ffffff; padding:10px; font-size:12px; font-weight:bold; cursor:pointer; text-align:center; color:var(--text-dark); transition:0.2s; }
    .pmy-date-preset-item:hover { background:#f9f9f9; color:var(--primary-green); }
    .pmy-date-preset-item.active { background:#e6f2e6; color:var(--primary-green); }
    .pmy-date-custom { padding:15px; display:flex; flex-direction:column; gap:10px; background:#ffffff; }
    .pmy-date-custom-title { font-size:12px; font-weight:700; color:var(--text-muted); }
    .pmy-date-custom-inputs { display:flex; gap:8px; align-items:center; }
    .pmy-date-custom-inputs input { flex:1; padding:8px; border:1px solid #ddd; border-radius:6px; font-family:inherit; font-size:13px; color:var(--text-dark); outline:none; }
    .pmy-date-custom-inputs input:focus { border-color:var(--primary-green); }
    .pmy-date-apply-btn { background:var(--primary-green); color:#fff; border:none; padding:9px; border-radius:6px; font-weight:bold; cursor:pointer; font-size:13px; transition:0.2s; text-align:center; width:100%; }
    .pmy-date-apply-btn:hover { background:var(--primary-hover); }
    .pmy-variants-form-grid { display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-top:5px; }

    .pmy-modal-overlay { position:fixed; top:0; left:0; width:100vw; height:100vh; background:rgba(0,0,0,0.4); backdrop-filter:blur(4px); display:flex; justify-content:center; align-items:center; z-index:9999; }
    .pmy-modal { background:#ffffff; width:600px; max-width:90%; max-height:85vh; border-radius:16px; display:flex; flex-direction:column; overflow:hidden; box-shadow:0 20px 50px rgba(0,0,0,0.15); }
    .pmy-modal-header { padding:20px 25px; border-bottom:1px solid #eee; display:flex; justify-content:space-between; align-items:center; }
    .pmy-modal-title { font-size:20px; font-weight:800; color:var(--primary-green); }
    .pmy-modal-close { background:none; border:none; font-size:28px; cursor:pointer; color:#999; }
    .pmy-modal-body { padding:25px; overflow-y:auto; flex:1; }

    .pmy-guides-grid { display:grid; grid-template-columns:repeat(auto-fill, minmax(130px,1fr)); gap:20px; }
    .pmy-guide-card-square { background:#fdfdfd; border:1px solid #eee; border-radius:16px; padding:15px; display:flex; flex-direction:column; align-items:center; cursor:pointer; transition:0.2s ease; text-align:center; }
    .pmy-guide-card-square:hover { border-color:var(--primary-green); transform:translateY(-3px); box-shadow:0 8px 20px rgba(0,0,0,0.05); }
    .pmy-guide-square-img { width:90px; height:90px; border-radius:16px; object-fit:cover; margin-bottom:12px; background:#eee; }
    .pmy-guide-square-name { font-weight:800; font-size:14px; color:var(--text-dark); line-height:1.2; }
    .pmy-platform-pills { display:flex; flex-wrap:wrap; gap:7px; margin-top:6px; }
    .pmy-platform-pill { display:flex; align-items:center; gap:6px; padding:6px 12px; border-radius:20px; border:1.5px solid #e0e0e0; background:#fff; font-size:12px; font-weight:700; cursor:pointer; transition:all 0.18s; color:#666; user-select:none; }
    .pmy-platform-pill:hover { border-color:var(--primary-green); color:var(--primary-green); }
    .pmy-platform-pill.selected { background:var(--primary-green); border-color:var(--primary-green); color:#fff; }
    .pmy-platform-pill.selected-block { background:#2b2b2b; border-color:#2b2b2b; color:#fff; }
    .pmy-platform-pill.disconnected { opacity:0.35; cursor:not-allowed; }
    .pmy-platform-pill-logo { font-size:14px; line-height:1; }
    .pmy-platform-pill-check { width:14px; height:14px; border-radius:50%; background:rgba(255,255,255,0.3); display:flex; align-items:center; justify-content:center; font-size:9px; font-weight:900; flex-shrink:0; }
    .pmy-platform-count-badge { font-size:10px; background:rgba(255,255,255,0.22); padding:1px 6px; border-radius:10px; font-weight:800; }
    .pmy-guide-edit-btn { flex:1; padding:5px 0; background:#f0f8f0; border:1px solid #c5e0c5; border-radius:6px; font-size:11px; font-weight:700; color:var(--primary-green); cursor:pointer; transition:0.2s; }
    .pmy-guide-edit-btn:hover { background:var(--primary-green); color:#fff; }
    .pmy-guide-delete-btn { padding:5px 9px; background:#fff0f0; border:1px solid #fcc; border-radius:6px; font-size:13px; cursor:pointer; transition:0.2s; }
    .pmy-guide-delete-btn:hover { background:#cc0000; color:#fff; }
    .pmy-int-subtab-bar { display:flex; gap:0; background:#f0f0f0; border-radius:10px; padding:4px; margin-bottom:28px; width:fit-content; }
    .pmy-int-subtab { padding:8px 22px; border:none; background:transparent; font-size:13px; font-weight:700; color:#888; cursor:pointer; border-radius:8px; transition:0.2s; }
    .pmy-int-subtab.active { background:#fff; color:var(--primary-green); box-shadow:0 2px 8px rgba(0,0,0,0.07); }
    .pmy-prod-platform-tabs { display:flex; gap:8px; flex-wrap:wrap; margin-bottom:22px; }
    .pmy-prod-ptab { display:flex; align-items:center; gap:7px; padding:8px 16px; border-radius:20px; border:1.5px solid #ddd; background:#fff; font-size:13px; font-weight:700; cursor:pointer; transition:0.2s; color:#555; }
    .pmy-prod-ptab:hover { border-color:var(--primary-green); color:var(--primary-green); }
    .pmy-prod-ptab.active { background:var(--primary-green); color:#fff; border-color:var(--primary-green); }
    .pmy-prod-ptab.disabled { opacity:0.4; cursor:not-allowed; }
    .pmy-prod-table { width:100%; border-collapse:separate; border-spacing:0 5px; }
    .pmy-prod-table th { font-size:11px; font-weight:800; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.5px; padding:4px 14px; text-align:left; }
    .pmy-prod-row { background:#fafafa; transition:0.15s; }
    .pmy-prod-row:hover { background:#f3f3f3; }
    .pmy-prod-row td { padding:11px 14px; font-size:13px; }
    .pmy-prod-row td:first-child { border-radius:8px 0 0 8px; border-left:3px solid #e0e0e0; }
    .pmy-prod-row.active-prod td:first-child { border-left-color:var(--primary-green); }
    .pmy-prod-row td:last-child { border-radius:0 8px 8px 0; }
    .pmy-prod-status { display:inline-flex; align-items:center; gap:5px; font-size:11px; font-weight:700; padding:3px 9px; border-radius:20px; }
    .pmy-prod-status.on { background:#e6f2e6; color:var(--primary-green); }
    .pmy-prod-status.off { background:#f5f5f5; color:#aaa; }
    .pmy-prod-toggle { position:relative; width:38px; height:20px; cursor:pointer; flex-shrink:0; }
    .pmy-prod-toggle input { opacity:0; width:0; height:0; }
    .pmy-prod-toggle-slider { position:absolute; top:0; left:0; right:0; bottom:0; background:#ddd; border-radius:20px; transition:0.2s; }
    .pmy-prod-toggle-slider:before { content:''; position:absolute; width:14px; height:14px; left:3px; bottom:3px; background:#fff; border-radius:50%; transition:0.2s; }
    .pmy-prod-toggle input:checked + .pmy-prod-toggle-slider { background:var(--primary-green); }
    .pmy-prod-toggle input:checked + .pmy-prod-toggle-slider:before { transform:translateX(18px); }

    /* PLATAFORMAS - CARDS NOVOS */
    .pmy-int-card-v2 { background:#ffffff; border-radius:14px; padding:22px; box-shadow:0 4px 16px rgba(0,0,0,0.04); display:flex; flex-direction:column; border:1.5px solid transparent; transition:0.25s ease; position:relative; overflow:hidden; }
    .pmy-int-card-v2:hover { border-color:var(--primary-green); transform:translateY(-2px); box-shadow:0 10px 30px rgba(0,0,0,0.08); }
    .pmy-int-card-v2.connected { border-color:#b8e6b8; }
    .pmy-int-card-v2.connected::before { content:''; position:absolute; top:0; left:0; right:0; height:3px; background:var(--primary-green); }
    .pmy-int-status-dot { width:8px; height:8px; border-radius:50%; display:inline-block; margin-right:5px; }
    .pmy-int-status-dot.on { background:#22c55e; box-shadow:0 0 0 3px rgba(34,197,94,0.2); }
    .pmy-int-status-dot.off { background:#d1d5db; }
    .pmy-int-top { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:14px; }
    .pmy-int-logo-v2 { font-size:36px; line-height:1; }
    .pmy-int-sync-info { font-size:11px; color:#22c55e; font-weight:600; background:#f0fdf4; padding:3px 8px; border-radius:20px; }
    .pmy-int-name-v2 { font-size:17px; font-weight:800; color:var(--text-dark); margin-bottom:5px; }
    .pmy-int-desc-v2 { font-size:12px; color:var(--text-muted); line-height:1.4; margin-bottom:18px; flex:1; }
    .pmy-int-actions { display:flex; gap:8px; }
    .pmy-int-btn-connect { flex:1; background:var(--primary-green); color:#fff; border:none; padding:10px; border-radius:8px; font-weight:700; font-size:13px; cursor:pointer; transition:0.2s; }
    .pmy-int-btn-connect:hover { background:var(--primary-hover); }
    .pmy-int-btn-settings { background:#f5f5f5; border:1px solid #eee; color:#555; padding:10px 14px; border-radius:8px; font-size:13px; cursor:pointer; transition:0.2s; font-weight:600; }
    .pmy-int-btn-settings:hover { background:#eee; }
    .pmy-int-btn-disconnect { background:#fff0f0; border:1px solid #fcc; color:#cc0000; padding:10px 14px; border-radius:8px; font-size:12px; cursor:pointer; transition:0.2s; font-weight:600; }
    .pmy-int-btn-disconnect:hover { background:#ffe6e6; }

    /* MODAL DE CONEXÃO */
    .pmy-connect-modal { background:#fff; width:480px; max-width:95vw; border-radius:16px; box-shadow:0 20px 60px rgba(0,0,0,0.2); overflow:hidden; }
    .pmy-connect-oauth-btn { width:100%; padding:13px; border-radius:10px; border:1.5px solid #ddd; background:#fff; font-weight:700; font-size:14px; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:10px; transition:0.2s; color:var(--text-dark); margin-bottom:10px; }
    .pmy-connect-oauth-btn:hover { border-color:var(--primary-green); background:#f5fcf5; }

    /* MAPEAMENTO DE CAMPOS */
    .pmy-mapping-platform-tabs { display:flex; gap:6px; flex-wrap:wrap; margin-bottom:20px; }
    .pmy-mapping-tab { padding:7px 14px; border-radius:20px; border:1.5px solid #ddd; background:#fff; font-size:12px; font-weight:700; cursor:pointer; transition:0.2s; color:#555; display:flex; align-items:center; gap:6px; }
    .pmy-mapping-tab:hover { border-color:var(--primary-green); color:var(--primary-green); }
    .pmy-mapping-tab.active { background:var(--primary-green); color:#fff; border-color:var(--primary-green); }
    .pmy-mapping-table { width:100%; border-collapse:separate; border-spacing:0 6px; }
    .pmy-mapping-table th { font-size:11px; font-weight:800; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.5px; padding:0 12px 8px; text-align:left; }
    .pmy-mapping-row { background:#fafafa; }
    .pmy-mapping-row td { padding:10px 12px; font-size:13px; }
    .pmy-mapping-row td:first-child { border-radius:8px 0 0 8px; border-left:3px solid #e8e8e8; font-weight:700; color:var(--text-dark); width:200px; }
    .pmy-mapping-row.active-conn td:first-child { border-left-color:var(--primary-green); }
    .pmy-mapping-row td:last-child { border-radius:0 8px 8px 0; }
    .pmy-mapping-field-input { width:100%; padding:7px 10px; border:1px solid #e5e5e5; border-radius:6px; font-size:12px; font-family:'Courier New',monospace; color:#333; background:#fff; outline:none; transition:0.2s; }
    .pmy-mapping-field-input:focus { border-color:var(--primary-green); background:#f5fcf5; }
    .pmy-mapping-arrow { color:#bbb; font-size:16px; padding:0 8px; text-align:center; }
    .pmy-mapping-internal-label { font-size:12px; color:#888; font-family:'Courier New',monospace; background:#f0f0f0; padding:4px 8px; border-radius:4px; display:inline-block; }
    .pmy-field-badge { display:inline-flex; align-items:center; gap:4px; font-size:10px; padding:2px 7px; border-radius:10px; font-weight:700; white-space:nowrap; }
    .pmy-field-badge.required { background:#fff0f0; color:#cc0000; }
    .pmy-field-badge.optional { background:#f0f0f0; color:#888; }

    /* BANCO DE MÍDIA */
    .pmy-media-filter-tabs { display:flex; gap:6px; flex-wrap:wrap; margin-bottom:20px; }
    .pmy-media-ftab { padding:6px 14px; border-radius:20px; border:1.5px solid #ddd; background:#fff; font-size:12px; font-weight:700; cursor:pointer; transition:0.2s; color:#666; }
    .pmy-media-ftab:hover { border-color:var(--primary-color); color:var(--primary-green); }
    .pmy-media-ftab.active { background:var(--primary-green); color:#fff; border-color:var(--primary-green); }
    .pmy-media-grid { display:grid; grid-template-columns:repeat(auto-fill, minmax(160px,1fr)); gap:16px; }
    .pmy-media-card { background:#fff; border:1.5px solid #eee; border-radius:12px; overflow:hidden; transition:0.2s; position:relative; cursor:pointer; }
    .pmy-media-card:hover { border-color:var(--primary-green); box-shadow:0 6px 20px rgba(0,0,0,0.08); transform:translateY(-2px); }
    .pmy-media-thumb { width:100%; height:120px; object-fit:cover; display:block; background:#f5f5f5; }
    .pmy-media-thumb-placeholder { width:100%; height:120px; background:#f5f5f5; display:flex; align-items:center; justify-content:center; font-size:32px; }
    .pmy-media-info { padding:10px 12px; }
    .pmy-media-label { font-size:12px; font-weight:700; color:var(--text-dark); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; margin-bottom:3px; }
    .pmy-media-meta { font-size:10px; color:#aaa; }
    .pmy-media-cat-badge { display:inline-block; font-size:9px; font-weight:800; padding:2px 7px; border-radius:10px; text-transform:uppercase; margin-bottom:5px; }
    .pmy-media-cat-logo { background:#e6f2e6; color:var(--primary-green); }
    .pmy-media-cat-guide { background:#e6e6f9; color:#5e35b1; }
    .pmy-media-cat-tour { background:#fff4cc; color:#cc9900; }
    .pmy-media-cat-general { background:#f0f0f0; color:#666; }
    .pmy-media-actions { position:absolute; top:8px; right:8px; display:flex; gap:5px; opacity:0; transition:0.2s; }
    .pmy-media-card:hover .pmy-media-actions { opacity:1; }
    .pmy-media-action-btn { width:28px; height:28px; border-radius:50%; border:none; cursor:pointer; display:flex; align-items:center; justify-content:center; font-size:12px; backdrop-filter:blur(4px); }
    .pmy-media-action-copy { background:rgba(255,255,255,0.9); color:#333; }
    .pmy-media-action-delete { background:rgba(255,80,80,0.9); color:#fff; }
    .pmy-upload-zone { border:2px dashed #ddd; border-radius:12px; padding:30px; text-align:center; cursor:pointer; transition:0.2s; background:#fafafa; }
    .pmy-upload-zone:hover { border-color:var(--primary-green); background:#f5fcf5; }
    .pmy-upload-progress { height:4px; background:#eee; border-radius:4px; overflow:hidden; margin-top:10px; }
    .pmy-upload-progress-bar { height:100%; background:var(--primary-green); border-radius:4px; transition:width 0.3s; }
    .pmy-media-preview-overlay { position:fixed; top:0; left:0; width:100vw; height:100vh; background:rgba(0,0,0,0.85); display:flex; align-items:center; justify-content:center; z-index:99999; cursor:zoom-out; }
    .pmy-media-preview-img { max-width:90vw; max-height:85vh; border-radius:18px; box-shadow:0 20px 60px rgba(0,0,0,0.5); }

    /* ===== PMY RESPONSIVE SHELL 2026 ===== */
    :root {
      --pmy-pink-soft: color-mix(in srgb, var(--bg-color) 78%, #ffffff 22%);
      --pmy-green-soft: color-mix(in srgb, var(--primary-green) 10%, #ffffff 90%);
      --pmy-border: rgba(28, 47, 34, 0.10);
      --pmy-shadow: 0 18px 45px rgba(22, 44, 29, 0.075);
      --pmy-heading-font: 'Asul', Georgia, serif;
      --pmy-ui-font: 'Inter', 'Assistant', Arial, sans-serif;
      --pmy-pill: 999px;
    }

    html, body {
      width:100%;
      height:100%;
      min-height:100%;
      overflow:hidden;
      background:var(--bg-color);
    }
    body { margin:0; }
    ::-webkit-scrollbar { width:8px; height:8px; }
    ::-webkit-scrollbar-thumb { background:rgba(24,55,34,0.18); border-radius:var(--pmy-pill); }

    .pmy-app-container {
      width:100%;
      height:100dvh;
      min-height:100dvh;
      margin:0;
      overflow:hidden;
      display:flex;
      background:var(--bg-color);
      color:var(--text-dark);
    }

    .pmy-sidebar {
      width:270px;
      min-height:100dvh;
      height:100dvh;
      max-height:100dvh;
      position:relative;
      top:auto;
      z-index:300;
      border-right:1px solid var(--pmy-border);
      box-shadow:none;
      transition:width .28s ease, transform .28s ease;
      overflow:visible;
      background:color-mix(in srgb, var(--sidebar-bg) 94%, transparent);
      backdrop-filter:blur(18px);
    }
    .pmy-sidebar.is-collapsed { width:88px; }
    .pmy-sidebar.is-collapsed .pmy-logo-full,
    .pmy-sidebar.is-collapsed .pmy-menu-label,
    .pmy-sidebar.is-collapsed .pmy-credit-text,
    .pmy-sidebar.is-collapsed .pmy-lang-pill { display:none; }
    .pmy-sidebar.is-collapsed .pmy-logo-mini { display:flex; }
    .pmy-sidebar.is-collapsed .pmy-menu-item { width:48px; height:48px; margin-inline:auto; padding:0; justify-content:center; border-radius:18px; }
    .pmy-sidebar.is-collapsed .pmy-sidebar-footer { padding-inline:12px; }

    .pmy-logo-area {
      min-height:132px;
      padding:22px 18px 16px;
      border-bottom:none;
      position:relative;
    }
    .pmy-logo-wrapper { width:176px; height:92px; border-radius:18px; }
    .pmy-logo-image { max-height:88px; }
    .pmy-logo-image.is-auto-white { filter:brightness(0) invert(1); }
    .pmy-logo-placeholder { width:172px; height:72px; border-radius:18px; }
    .pmy-logo-mini {
      display:none;
      width:48px;
      height:48px;
      align-items:center;
      justify-content:center;
      border-radius:18px;
      background:var(--primary-green);
      color:#fff;
      font-family:var(--pmy-heading-font);
      font-size:16px;
      font-weight:700;
      letter-spacing:.08em;
    }
    .pmy-sidebar-collapse {
      position:absolute;
      right:-19px;
      top:78px;
      width:40px;
      height:40px;
      border-radius:50%;
      border:2px solid var(--surface-color);
      background:var(--primary-green);
      color:#fff;
      display:flex;
      align-items:center;
      justify-content:center;
      cursor:pointer;
      box-shadow:0 10px 26px color-mix(in srgb, var(--primary-green) 28%, rgba(0,0,0,.14));
      z-index:360;
      font-size:22px;
      font-weight:900;
      line-height:1;
      transition:transform .18s ease, box-shadow .18s ease, background .18s ease;
    }
    .pmy-sidebar-collapse:hover {
      transform:scale(1.07);
      box-shadow:0 12px 30px color-mix(in srgb, var(--primary-green) 36%, rgba(0,0,0,.18));
      background:color-mix(in srgb, var(--primary-green) 88%, #000 12%);
    }
    .pmy-sidebar-collapse:focus-visible {
      outline:3px solid color-mix(in srgb, var(--primary-green) 22%, transparent);
      outline-offset:3px;
    }

    .pmy-menu { padding:10px 12px 18px; gap:7px; overflow-y:auto; flex:1; min-height:0; }
    .pmy-menu-item {
      appearance:none;
      border:1px solid transparent;
      width:100%;
      margin:0;
      padding:12px 14px;
      border-radius:var(--pmy-pill);
      background:transparent;
      color:var(--sidebar-text);
      font-weight:700;
      display:flex;
      align-items:center;
      gap:12px;
      text-align:left;
      cursor:pointer;
      transition:transform .18s ease, background .18s ease, color .18s ease, border-color .18s ease;
    }
    .pmy-menu-item:hover {
      background:var(--sidebar-hover);
      color:var(--sidebar-text);
      transform:translateX(2px);
    }
    .pmy-menu-item.active {
      background:var(--sidebar-active-bg);
      color:var(--sidebar-active-text);
      box-shadow:0 10px 24px color-mix(in srgb, var(--sidebar-active-bg) 18%, transparent);
    }
    .pmy-sidebar .pmy-menu-item svg { color:inherit; }
    .pmy-sidebar .pmy-menu-item:not(.active) { color:var(--sidebar-text); }
    .pmy-sidebar .pmy-menu-item:not(.active):hover { color:var(--sidebar-text); }
    .pmy-logo-placeholder {
      border-color:var(--sidebar-border);
      color:var(--sidebar-muted);
      background:color-mix(in srgb, var(--sidebar-text) 4%, transparent);
    }
    .pmy-lang-divider { background:var(--sidebar-border); }
    .pmy-sidebar-collapse {
      border-color:var(--surface-color);
      background:var(--primary-green);
      color:#fff;
    }
    .pmy-menu-icon { width:20px; height:20px; display:grid; place-items:center; flex:0 0 20px; }
    .pmy-menu-label { min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
    .pmy-sidebar-footer { padding:16px 12px 18px; gap:12px; border-top:1px solid var(--sidebar-border); }
    .pmy-sidebar-footer .pmy-menu-item { width:100%; }
    .pmy-lang-pill { border-color:var(--sidebar-border); background:color-mix(in srgb, var(--sidebar-text) 9%, transparent); color:var(--sidebar-text); }
    .pmy-credit-text { font-size:11px; color:var(--sidebar-muted); opacity:1; }

    .pmy-mobile-menu-btn {
      display:none;
      width:42px;
      height:42px;
      border-radius:50%;
      border:1px solid var(--pmy-border);
      background:#fff;
      color:var(--primary-green);
      align-items:center;
      justify-content:center;
      cursor:pointer;
      flex:0 0 42px;
      box-shadow:0 8px 20px rgba(24,55,34,.08);
    }
    .pmy-mobile-backdrop { display:none; }

    .pmy-content {
      flex:1;
      min-width:0;
      height:100dvh;
      max-height:100dvh;
      min-height:0;
      overflow-y:auto;
      overflow-x:hidden;
      overscroll-behavior:contain;
      padding:0;
    }
    .pmy-content-inner {
      width:100%;
      max-width:none;
      margin:0;
      padding:26px 22px 56px;
    }
    .pmy-header-top {
      min-height:72px;
      margin-bottom:24px;
      display:flex;
      justify-content:space-between;
      align-items:center;
      gap:18px;
      position:sticky;
      top:0;
      z-index:120;
      padding:10px 0;
      background:var(--bg-color);
      backdrop-filter:none;
    }
    .pmy-header-title-wrap { display:flex; align-items:center; gap:12px; min-width:0; }
    .pmy-header-copy { min-width:0; }
    .pmy-eyebrow {
      font-size:10px;
      line-height:1;
      text-transform:uppercase;
      letter-spacing:.15em;
      font-weight:800;
      color:var(--primary-green);
      opacity:.78;
      margin-bottom:7px;
    }
    .pmy-page-title {
      font-family:var(--pmy-heading-font);
      font-size:clamp(26px, 2.2vw, 38px);
      line-height:1.02;
      font-weight:700;
      color:var(--title-color);
      letter-spacing:-.025em;
    }

    .pmy-card,
    .pmy-form-box,
    .pmy-calendar-grid,
    .pmy-int-card-v2,
    .pmy-connect-modal,
    .pmy-modal {
      border:1px solid var(--pmy-border);
      box-shadow:var(--pmy-shadow);
    }
    .pmy-card { border-radius:22px; padding:22px; background:var(--surface-color); }
    .pmy-card.has-hover:hover { transform:translateY(-2px); box-shadow:0 22px 48px rgba(22,44,29,.11); }
    .pmy-form-box { border-radius:22px; padding:24px; background:var(--surface-color); }
    .pmy-form-box h3 {
      font-family:var(--pmy-heading-font);
      font-size:19px;
      border-bottom:none;
      padding-bottom:0;
      margin-bottom:18px;
    }
    .pmy-btn-submit,
    .pmy-format-btn,
    .pmy-date-btn,
    .pmy-int-btn-connect,
    .pmy-int-btn-settings,
    .pmy-int-btn-disconnect,
    .pmy-cal-tab,
    .pmy-prod-ptab,
    .pmy-mapping-tab,
    .pmy-media-ftab {
      border-radius:var(--pmy-pill);
    }
    .pmy-btn-submit { min-height:44px; padding:11px 20px; }
    .pmy-form-input {
      min-height:44px;
      border-radius:14px;
      border-color:rgba(30,55,38,.14);
      background:var(--input-bg-color);
      transition:border-color .18s ease, box-shadow .18s ease, background .18s ease;
    }
    .pmy-form-input:focus {
      border-color:var(--primary-green);
      box-shadow:0 0 0 3px color-mix(in srgb, var(--primary-green) 11%, transparent);
      background:#fff;
    }

    .pmy-grid { gap:18px; grid-template-columns:repeat(auto-fit,minmax(min(100%,240px),1fr)); }

    /* ===== DESKTOP TYPOGRAPHY SCALE ===== */
    .pmy-menu-item,
    .pmy-menu-label { font-size:15px; }
    .pmy-credit-text { font-size:12px; }
    .pmy-date-btn { font-size:14px; }
    .pmy-card-title { font-size:16px; }
    .pmy-form-group label { font-size:14px; }
    .pmy-form-input { font-size:15px; }
    .pmy-btn-submit { font-size:15px; }
    .pmy-cal-tab { font-size:13px; }

    .pmy-eyebrow { font-size:12px; }
    .pmy-kpi-label { font-size:14px; }
    .pmy-kpi-detail { font-size:13px; }
    .pmy-dashboard-status-item strong { font-size:20px; }
    .pmy-dashboard-status-item span:not(.pmy-dashboard-status-dot) { font-size:13px; }

    .pmy-trend-eyebrow { font-size:12px; }
    .pmy-trend-title { font-size:30px; }
    .pmy-trend-subtitle { font-size:14px; }
    .pmy-trend-granularity { font-size:13px; }
    .pmy-trend-legend span { font-size:13px; }
    .pmy-trend-axis-label { font-size:13px; }
    .pmy-trend-x-label { font-size:12px; }
    .pmy-trend-tooltip strong,
    .pmy-trend-tooltip span { font-size:12px; }
    .pmy-trend-axis-captions { font-size:12px; }
    .pmy-trend-empty strong { font-size:15px; }
    .pmy-trend-empty span { font-size:13px; }

    /* ===== DASHBOARD / KPI SHELL ===== */
    .pmy-dashboard { display:flex; flex-direction:column; gap:22px; }
    .pmy-dashboard-kpi-grid {
      display:grid;
      grid-template-columns:repeat(6,minmax(0,1fr));
      gap:16px;
    }
    .pmy-kpi-card {
      appearance:none;
      position:relative;
      min-width:0;
      min-height:176px;
      border:1px solid var(--pmy-border);
      border-radius:22px;
      background:var(--surface-color);
      box-shadow:var(--pmy-shadow);
      padding:18px 18px 16px;
      display:flex;
      flex-direction:column;
      align-items:flex-start;
      text-align:left;
      color:var(--text-dark);
      cursor:pointer;
      transition:transform .18s ease, box-shadow .18s ease, border-color .18s ease, background .18s ease;
    }
    .pmy-kpi-card:hover {
      transform:translateY(-2px);
      box-shadow:0 22px 48px rgba(22,44,29,.11);
      border-color:color-mix(in srgb, var(--primary-green) 24%, var(--pmy-border));
    }
    .pmy-kpi-card.is-featured {
      grid-column:span 2;
      background:
        radial-gradient(circle at 86% 12%, color-mix(in srgb, var(--primary-green) 12%, transparent) 0, transparent 8rem),
        var(--surface-color);
    }
    .pmy-kpi-topline {
      width:100%;
      display:flex;
      align-items:center;
      justify-content:space-between;
      margin-bottom:20px;
    }
    .pmy-kpi-icon {
      width:42px;
      height:42px;
      border-radius:14px;
      display:grid;
      place-items:center;
      background:var(--pmy-green-soft);
      color:var(--primary-green);
    }
    .pmy-kpi-expand { color:#9ca3af; transition:color .18s ease, transform .18s ease; }
    .pmy-kpi-card:hover .pmy-kpi-expand { color:var(--primary-green); transform:translate(1px,-1px); }
    .pmy-kpi-label {
      font-size:12px;
      text-transform:uppercase;
      letter-spacing:.075em;
      font-weight:800;
      color:var(--text-muted);
      margin-bottom:8px;
    }
    .pmy-kpi-value {
      font-family:var(--pmy-heading-font);
      font-size:clamp(26px,2vw,34px);
      line-height:1;
      font-weight:700;
      color:var(--title-color);
      letter-spacing:-.03em;
      margin-bottom:9px;
      max-width:100%;
      overflow:hidden;
      text-overflow:ellipsis;
      white-space:nowrap;
    }
    .pmy-kpi-detail {
      margin-top:auto;
      font-size:12px;
      line-height:1.4;
      color:#737a75;
    }
    .pmy-kpi-gold .pmy-kpi-icon { background:#fff7e8; color:#9a6b13; }
    .pmy-kpi-gold .pmy-kpi-value { color:#8c651c; }
    .pmy-kpi-danger .pmy-kpi-icon { background:#fff1f1; color:#b42318; }
    .pmy-kpi-danger .pmy-kpi-value { color:#b42318; }
    .pmy-kpi-neutral .pmy-kpi-icon { background:#f2f3f2; color:#444; }

    .pmy-dashboard-status-strip {
      display:grid;
      grid-template-columns:repeat(4,minmax(0,1fr));
      gap:1px;
      overflow:hidden;
      border:1px solid var(--pmy-border);
      border-radius:18px;
      background:var(--pmy-border);
      box-shadow:0 10px 28px rgba(22,44,29,.045);
    }
    .pmy-dashboard-status-item {
      background:color-mix(in srgb, var(--surface-color) 96%, var(--bg-color) 4%);
      padding:12px 15px;
      display:flex;
      align-items:center;
      gap:10px;
      min-width:0;
    }
    .pmy-dashboard-status-item > div {
      display:flex;
      flex-direction:column;
      min-width:0;
    }
    .pmy-dashboard-status-item strong {
      font-size:18px;
      line-height:1.05;
      color:var(--text-dark);
      font-weight:800;
    }
    .pmy-dashboard-status-item span:not(.pmy-dashboard-status-dot) {
      font-size:11px;
      line-height:1.35;
      color:#747a76;
      white-space:nowrap;
      overflow:hidden;
      text-overflow:ellipsis;
    }
    .pmy-dashboard-status-dot {
      width:8px;
      height:8px;
      flex:0 0 8px;
      border-radius:50%;
      background:#9ca3af;
      box-shadow:0 0 0 4px rgba(156,163,175,.12);
    }
    .pmy-dashboard-status-dot.is-good { background:#16a34a; box-shadow:0 0 0 4px rgba(22,163,74,.12); }
    .pmy-dashboard-status-dot.is-info { background:#2563eb; box-shadow:0 0 0 4px rgba(37,99,235,.11); }
    .pmy-dashboard-status-dot.is-warning { background:#d97706; box-shadow:0 0 0 4px rgba(217,119,6,.12); }

    .pmy-trend-card {
      position:relative;
      overflow:hidden;
      border:1px solid var(--pmy-border);
      border-radius:24px;
      background:var(--surface-color);
      box-shadow:var(--pmy-shadow);
      padding:22px 22px 16px;
    }
    .pmy-trend-header {
      display:flex;
      justify-content:space-between;
      align-items:flex-start;
      gap:18px;
      margin-bottom:8px;
    }
    .pmy-trend-eyebrow {
      font-size:11px;
      line-height:1;
      text-transform:uppercase;
      letter-spacing:.13em;
      font-weight:800;
      color:var(--primary-green);
      opacity:.74;
      margin-bottom:7px;
    }
    .pmy-trend-title {
      font-family:var(--pmy-heading-font);
      font-size:27px;
      line-height:1.05;
      color:var(--title-color);
      font-weight:700;
      margin:0 0 5px;
      letter-spacing:-.02em;
    }
    .pmy-trend-subtitle {
      font-size:12px;
      color:#737a75;
      margin:0;
    }
    .pmy-trend-meta {
      display:flex;
      align-items:flex-end;
      flex-direction:column;
      gap:9px;
    }
    .pmy-trend-granularity {
      display:inline-flex;
      align-items:center;
      min-height:30px;
      padding:6px 11px;
      border-radius:999px;
      border:1px solid color-mix(in srgb, var(--primary-green) 15%, var(--pmy-border));
      background:var(--pmy-green-soft);
      color:var(--primary-green);
      font-size:11px;
      font-weight:800;
      letter-spacing:.03em;
    }
    .pmy-trend-legend {
      display:flex;
      align-items:center;
      gap:13px;
      flex-wrap:wrap;
      justify-content:flex-end;
    }
    .pmy-trend-legend span {
      display:inline-flex;
      align-items:center;
      gap:6px;
      font-size:11px;
      color:#676e69;
      font-weight:700;
    }
    .pmy-legend-bar {
      width:9px;
      height:9px;
      display:inline-block;
      border-radius:3px;
      background:color-mix(in srgb, var(--primary-green) 28%, transparent);
      border:1px solid color-mix(in srgb, var(--primary-green) 30%, transparent);
    }
    .pmy-legend-line {
      width:16px;
      height:2px;
      display:inline-block;
      border-radius:999px;
      background:var(--primary-green);
      position:relative;
    }
    .pmy-legend-line::after {
      content:'';
      width:5px;
      height:5px;
      border-radius:50%;
      background:var(--surface-color);
      border:1.5px solid var(--primary-green);
      position:absolute;
      right:3px;
      top:50%;
      transform:translateY(-50%);
    }
    .pmy-trend-chart-wrap {
      position:relative;
      width:100%;
      overflow:hidden;
      padding-top:8px;
    }
    .pmy-trend-chart {
      display:block;
      width:100%;
      height:auto;
      min-height:280px;
      overflow:visible;
    }
    .pmy-trend-gridline {
      stroke:color-mix(in srgb, var(--text-dark) 9%, transparent);
      stroke-width:1;
      stroke-dasharray:3 7;
    }
    .pmy-trend-axis-label,
    .pmy-trend-x-label {
      fill:color-mix(in srgb, var(--text-dark) 58%, transparent);
      font-size:11px;
      font-weight:700;
    }
    .pmy-trend-x-label { font-size:10px; }
    .pmy-trend-bar {
      fill:color-mix(in srgb, var(--primary-green) 24%, transparent);
      stroke:color-mix(in srgb, var(--primary-green) 34%, transparent);
      stroke-width:1;
      transition:opacity .16s ease;
    }
    .pmy-trend-line {
      stroke:var(--primary-green);
      stroke-width:3;
      stroke-linejoin:round;
      stroke-linecap:round;
      filter:drop-shadow(0 4px 7px color-mix(in srgb, var(--primary-green) 18%, transparent));
    }
    .pmy-trend-point {
      fill:var(--surface-color);
      stroke:var(--primary-green);
      stroke-width:2.5;
      transition:r .12s ease;
    }
    .pmy-trend-hover-line {
      stroke:color-mix(in srgb, var(--primary-green) 35%, transparent);
      stroke-width:1;
      stroke-dasharray:4 5;
      pointer-events:none;
    }
    .pmy-trend-tooltip {
      position:absolute;
      top:12px;
      z-index:5;
      transform:translateX(-50%);
      min-width:150px;
      max-width:210px;
      padding:9px 11px;
      border:1px solid var(--pmy-border);
      border-radius:12px;
      background:color-mix(in srgb, var(--surface-color) 97%, transparent);
      backdrop-filter:blur(12px);
      box-shadow:0 12px 30px rgba(22,44,29,.12);
      pointer-events:none;
      display:flex;
      flex-direction:column;
      gap:3px;
    }
    .pmy-trend-tooltip strong {
      font-size:11px;
      color:var(--text-dark);
      font-weight:800;
      margin-bottom:2px;
    }
    .pmy-trend-tooltip span {
      font-size:11px;
      color:#676e69;
      font-weight:700;
    }
    .pmy-trend-axis-captions {
      display:flex;
      justify-content:space-between;
      align-items:center;
      margin-top:-6px;
      padding:0 14px 0 8px;
      font-size:10px;
      font-weight:800;
      color:#7f8581;
      text-transform:uppercase;
      letter-spacing:.08em;
    }
    .pmy-trend-empty {
      min-height:260px;
      display:flex;
      flex-direction:column;
      align-items:center;
      justify-content:center;
      text-align:center;
      padding:32px 20px;
      color:#8b908d;
    }
    .pmy-trend-empty-icon {
      width:58px;
      height:58px;
      border-radius:20px;
      background:var(--pmy-green-soft);
      color:var(--primary-green);
      display:grid;
      place-items:center;
      margin-bottom:14px;
    }
    .pmy-trend-empty strong {
      color:var(--text-dark);
      font-size:13px;
      margin-bottom:5px;
    }
    .pmy-trend-empty span {
      max-width:440px;
      font-size:11px;
      line-height:1.5;
    }
    .pmy-agenda-form-grid { display:grid; grid-template-columns:minmax(0,1fr) minmax(0,1fr); gap:22px; margin-bottom:28px; align-items:start; }
    .pmy-booking-meta-grid { display:grid; grid-template-columns:minmax(0,1fr) minmax(0,1fr); gap:10px; margin-bottom:14px; }
    .pmy-media-layout { display:grid; grid-template-columns:minmax(0,1fr) 320px; gap:24px; align-items:start; }
    .pmy-media-upload-panel { position:sticky; top:92px; }
    .pmy-settings-color-grid { display:grid; grid-template-columns:minmax(0,1fr) minmax(0,1fr); gap:20px; margin-top:10px; }

    .pmy-brand-logo-grid {
      display:grid;
      grid-template-columns:repeat(2,minmax(0,1fr));
      gap:16px;
    }
    .pmy-brand-logo-card {
      border:1px solid var(--pmy-border);
      border-radius:18px;
      padding:16px;
      background:color-mix(in srgb, var(--surface-color) 97%, var(--bg-color) 3%);
    }
    .pmy-brand-logo-card-head {
      display:flex;
      align-items:flex-start;
      justify-content:space-between;
      gap:12px;
      margin-bottom:12px;
    }
    .pmy-brand-logo-card-head > div {
      display:flex;
      flex-direction:column;
      gap:3px;
    }
    .pmy-brand-logo-card-head strong {
      color:var(--text-dark);
      font-size:13px;
      font-weight:800;
    }
    .pmy-brand-logo-card-head span {
      color:#777;
      font-size:10px;
      line-height:1.4;
    }
    .pmy-brand-logo-status {
      flex:0 0 auto;
      border-radius:999px;
      padding:4px 7px;
      background:#ecfdf3;
      color:#166534 !important;
      font-size:9px !important;
      font-weight:800;
    }
    .pmy-brand-logo-preview {
      min-height:120px;
      border-radius:16px;
      display:flex;
      align-items:center;
      justify-content:center;
      padding:18px;
      margin-bottom:12px;
      border:1px solid rgba(0,0,0,.07);
      overflow:hidden;
    }
    .pmy-brand-logo-preview.is-light {
      background:#f6f7f5;
    }
    .pmy-brand-logo-preview.is-dark {
      background:#171717;
      border-color:#2d2d2d;
    }
    .pmy-brand-logo-preview img {
      display:block;
      max-width:100%;
      max-height:82px;
      object-fit:contain;
    }
    .pmy-brand-logo-preview img.is-auto-white,
    .pmy-brand-logo-current img.is-auto-white {
      filter:brightness(0) invert(1);
    }
    .pmy-brand-logo-preview > span {
      font-size:11px;
      color:#929792;
      font-weight:700;
    }
    .pmy-brand-logo-preview.is-dark > span {
      color:#b8b8b8;
    }
    .pmy-brand-logo-actions {
      display:flex;
      align-items:center;
      gap:8px;
      flex-wrap:wrap;
    }
    .pmy-brand-logo-actions button:disabled {
      cursor:wait;
      opacity:.6;
    }
    .pmy-brand-logo-current {
      margin-top:16px;
      padding-top:16px;
      border-top:1px solid var(--pmy-border);
      display:flex;
      align-items:center;
      justify-content:space-between;
      gap:16px;
      flex-wrap:wrap;
    }
    .pmy-brand-logo-current > span {
      color:#777;
      font-size:11px;
      font-weight:700;
    }
    .pmy-brand-logo-current > div {
      width:220px;
      min-height:72px;
      border-radius:15px;
      padding:10px 14px;
      display:flex;
      align-items:center;
      justify-content:center;
      border:1px solid var(--pmy-border);
    }
    .pmy-brand-logo-current img {
      display:block;
      max-width:100%;
      max-height:54px;
      object-fit:contain;
    }
    .pmy-brand-logo-current strong {
      font-size:12px;
      color:var(--sidebar-text);
    }
    .pmy-settings-color-grid > * { min-width:0; }
    .pmy-media-filter-tabs,
    .pmy-prod-platform-tabs,
    .pmy-mapping-platform-tabs { scrollbar-width:thin; }

    .pmy-calendar-scroll { width:100%; overflow-x:auto; padding-bottom:6px; }
    .pmy-calendar-scroll .pmy-calendar-week-headers,
    .pmy-calendar-scroll .pmy-calendar-grid { min-width:720px; }
    .pmy-calendar-grid { border-radius:22px; }
    .pmy-calendar-day { border-radius:15px; min-height:112px; }

    .pmy-prod-table,
    .pmy-mapping-table { min-width:680px; }
    .pmy-form-box:has(.pmy-prod-table),
    .pmy-form-box:has(.pmy-mapping-table) { overflow-x:auto; }

    /* ===== DASHBOARD THEME-SAFE COLORS ===== */
    .pmy-dashboard {
      color:var(--dashboard-text);
    }

    .pmy-dashboard .pmy-card,
    .pmy-dashboard .pmy-kpi-card,
    .pmy-dashboard .pmy-trend-card {
      background:var(--surface-color);
      border-color:var(--dashboard-border);
      box-shadow:var(--dashboard-shadow);
      color:var(--dashboard-text);
    }

    .pmy-dashboard .pmy-kpi-card:hover {
      border-color:color-mix(in srgb, var(--dashboard-accent) 30%, var(--dashboard-border));
    }

    .pmy-dashboard .pmy-kpi-card.is-featured {
      background:
        radial-gradient(circle at 86% 12%, color-mix(in srgb, var(--dashboard-accent) 13%, transparent) 0, transparent 8rem),
        var(--surface-color);
    }

    .pmy-dashboard .pmy-kpi-icon,
    .pmy-dashboard .pmy-trend-empty-icon {
      background:color-mix(in srgb, var(--dashboard-accent) 11%, var(--surface-color));
      color:var(--dashboard-accent);
    }

    .pmy-dashboard .pmy-kpi-expand {
      color:var(--dashboard-muted);
    }

    .pmy-dashboard .pmy-kpi-card:hover .pmy-kpi-expand,
    .pmy-dashboard .pmy-trend-eyebrow,
    .pmy-dashboard .pmy-trend-granularity {
      color:var(--dashboard-accent);
    }

    .pmy-dashboard .pmy-kpi-label,
    .pmy-dashboard .pmy-kpi-detail,
    .pmy-dashboard .pmy-trend-subtitle,
    .pmy-dashboard .pmy-trend-legend span,
    .pmy-dashboard .pmy-trend-axis-captions,
    .pmy-dashboard .pmy-trend-empty,
    .pmy-dashboard .pmy-dashboard-status-item span:not(.pmy-dashboard-status-dot) {
      color:var(--dashboard-muted) !important;
    }

    .pmy-dashboard .pmy-kpi-value,
    .pmy-dashboard .pmy-dashboard-status-item strong,
    .pmy-dashboard .pmy-trend-empty strong {
      color:var(--dashboard-text);
    }

    .pmy-dashboard .pmy-trend-title,
    .pmy-dashboard .pmy-accordion-title {
      color:var(--dashboard-title);
    }

    .pmy-dashboard .pmy-dashboard-status-strip {
      border-color:var(--dashboard-border);
      background:var(--dashboard-border);
      box-shadow:var(--dashboard-shadow);
    }

    .pmy-dashboard .pmy-dashboard-status-item {
      background:color-mix(in srgb, var(--surface-color) 94%, var(--dashboard-soft) 6%);
    }

    .pmy-dashboard .pmy-trend-granularity {
      border-color:color-mix(in srgb, var(--dashboard-accent) 24%, var(--dashboard-border));
      background:color-mix(in srgb, var(--dashboard-accent) 10%, var(--surface-color));
    }

    .pmy-dashboard .pmy-legend-bar {
      background:color-mix(in srgb, var(--dashboard-accent) 28%, transparent);
      border-color:color-mix(in srgb, var(--dashboard-accent) 45%, transparent);
    }

    .pmy-dashboard .pmy-legend-line {
      background:var(--dashboard-accent);
    }

    .pmy-dashboard .pmy-legend-line::after {
      background:var(--surface-color);
      border-color:var(--dashboard-accent);
    }

    .pmy-dashboard .pmy-trend-gridline {
      stroke:color-mix(in srgb, var(--dashboard-text) 12%, transparent);
    }

    .pmy-dashboard .pmy-trend-axis-label,
    .pmy-dashboard .pmy-trend-x-label {
      fill:color-mix(in srgb, var(--dashboard-text) 65%, transparent);
    }

    .pmy-dashboard .pmy-trend-bar {
      fill:color-mix(in srgb, var(--dashboard-accent) 28%, transparent);
      stroke:color-mix(in srgb, var(--dashboard-accent) 48%, transparent);
    }

    .pmy-dashboard .pmy-trend-line {
      stroke:var(--dashboard-accent);
      filter:drop-shadow(0 4px 7px color-mix(in srgb, var(--dashboard-accent) 22%, transparent));
    }

    .pmy-dashboard .pmy-trend-point {
      fill:var(--surface-color);
      stroke:var(--dashboard-accent);
    }

    .pmy-dashboard .pmy-trend-hover-line {
      stroke:color-mix(in srgb, var(--dashboard-accent) 42%, transparent);
    }

    .pmy-dashboard .pmy-trend-tooltip {
      border-color:var(--dashboard-border);
      background:color-mix(in srgb, var(--surface-color) 97%, transparent);
      box-shadow:var(--dashboard-shadow);
    }

    .pmy-dashboard .pmy-trend-tooltip strong {
      color:var(--dashboard-text);
    }

    .pmy-dashboard .pmy-trend-tooltip span {
      color:var(--dashboard-muted);
    }

    .pmy-dashboard .pmy-accordion-header,
    .pmy-dashboard .pmy-accordion-content {
      border-color:var(--dashboard-border);
      color:var(--dashboard-text);
    }

    .pmy-dashboard .pmy-accordion-header:hover {
      color:var(--dashboard-accent);
    }

    .pmy-dashboard .pmy-tour-name {
      color:var(--dashboard-text);
    }

    /* ===== FINAL DESKTOP READABILITY OVERRIDES ===== */
    .pmy-app-container,
    .pmy-sidebar,
    .pmy-content,
    .pmy-dashboard,
    .pmy-dashboard button,
    .pmy-dashboard input,
    .pmy-dashboard select,
    .pmy-dashboard textarea,
    .pmy-menu-item,
    .pmy-menu-label,
    .pmy-date-btn {
      font-family:var(--pmy-ui-font) !important;
    }

    .pmy-page-title,
    .pmy-trend-title {
      font-family:var(--pmy-heading-font) !important;
    }

    .pmy-menu-item,
    .pmy-menu-label {
      font-size:15px !important;
      line-height:1.3;
    }

    .pmy-eyebrow,
    .pmy-trend-eyebrow {
      font-family:var(--pmy-ui-font) !important;
      font-size:12px !important;
      line-height:1.2;
    }

    .pmy-kpi-label {
      font-family:var(--pmy-ui-font) !important;
      font-size:14px !important;
      line-height:1.25;
      letter-spacing:.065em;
    }

    .pmy-kpi-value {
      font-family:var(--pmy-ui-font) !important;
      font-size:clamp(30px, 2vw, 36px) !important;
      line-height:1.05;
      font-weight:800;
    }

    .pmy-kpi-detail {
      font-family:var(--pmy-ui-font) !important;
      font-size:14px !important;
      line-height:1.45;
      color:#68706a;
    }

    .pmy-dashboard-status-strip {
      min-height:66px;
      border-radius:18px;
    }

    .pmy-dashboard-status-item {
      min-height:66px;
      padding:14px 18px !important;
      gap:13px;
    }

    .pmy-dashboard-status-item strong {
      font-family:var(--pmy-ui-font) !important;
      font-size:22px !important;
      line-height:1.05;
      font-weight:800;
    }

    .pmy-dashboard-status-item span:not(.pmy-dashboard-status-dot) {
      font-family:var(--pmy-ui-font) !important;
      font-size:14px !important;
      line-height:1.35;
      font-weight:500;
      color:#667069;
    }

    .pmy-dashboard-status-dot {
      width:10px;
      height:10px;
      flex-basis:10px;
    }

    .pmy-trend-subtitle {
      font-family:var(--pmy-ui-font) !important;
      font-size:14px !important;
      line-height:1.4;
    }

    .pmy-trend-granularity,
    .pmy-trend-legend span {
      font-family:var(--pmy-ui-font) !important;
      font-size:13px !important;
    }

    .pmy-trend-axis-label {
      font-family:var(--pmy-ui-font) !important;
      font-size:13px !important;
      font-weight:700;
    }

    .pmy-trend-x-label {
      font-family:var(--pmy-ui-font) !important;
      font-size:12px !important;
      font-weight:700;
    }

    .pmy-trend-axis-captions {
      font-family:var(--pmy-ui-font) !important;
      font-size:12px !important;
    }

    .pmy-trend-tooltip strong,
    .pmy-trend-tooltip span {
      font-family:var(--pmy-ui-font) !important;
      font-size:13px !important;
    }

    .pmy-date-btn {
      font-size:14px !important;
    }

    @media (max-width: 1180px) {
      .pmy-dashboard-kpi-grid { grid-template-columns:repeat(3,minmax(0,1fr)); }
      .pmy-kpi-card.is-featured { grid-column:span 2; }
      .pmy-dashboard-status-strip { grid-template-columns:repeat(2,minmax(0,1fr)); }
      .pmy-trend-card { padding:20px 18px 14px; }
      .pmy-trend-chart { min-width:760px; }
      .pmy-trend-chart-wrap { overflow-x:auto; padding-bottom:6px; }
      .pmy-content-inner { padding-inline:18px; }
      .pmy-agenda-form-grid { grid-template-columns:1fr; }
      .pmy-media-layout { grid-template-columns:1fr; }
      .pmy-media-upload-panel { position:static; }
      .pmy-grid { grid-template-columns:repeat(2,minmax(0,1fr)); }
    }

    @media (max-width: 980px) {
      .pmy-sidebar {
        position:fixed;
        left:0;
        top:0;
        width:min(86vw, 310px);
        transform:translateX(-104%);
        box-shadow:24px 0 70px rgba(20,45,28,.18);
      }
      .pmy-sidebar.is-collapsed { width:min(86vw, 310px); }
      .pmy-sidebar.is-collapsed .pmy-logo-full,
      .pmy-sidebar.is-collapsed .pmy-menu-label,
      .pmy-sidebar.is-collapsed .pmy-credit-text,
      .pmy-sidebar.is-collapsed .pmy-lang-pill { display:flex; }
      .pmy-sidebar.is-collapsed .pmy-logo-mini { display:none; }
      .pmy-sidebar.is-collapsed .pmy-menu-item { width:100%; height:auto; margin:0; padding:12px 14px; justify-content:flex-start; }
      .pmy-sidebar.is-mobile-open { transform:translateX(0); }
      .pmy-sidebar-collapse { display:none; }
      .pmy-mobile-menu-btn { display:flex; }
      .pmy-mobile-backdrop {
        display:block;
        position:fixed;
        inset:0;
        border:0;
        background:rgba(14,28,18,.34);
        backdrop-filter:blur(3px);
        z-index:250;
        opacity:0;
        pointer-events:none;
        transition:opacity .22s ease;
      }
      .pmy-mobile-backdrop.is-visible { opacity:1; pointer-events:auto; }
      .pmy-content-inner { padding:20px 20px 48px; }
      .pmy-header-top {
        min-height:66px;
        margin-bottom:18px;
        padding-block:8px;
      }
      .pmy-date-btn { padding:10px 14px; }
    }

    @media (max-width: 720px) {
      .pmy-dashboard { gap:14px; }
      .pmy-dashboard-kpi-grid { grid-template-columns:repeat(2,minmax(0,1fr)); gap:10px; }
      .pmy-kpi-card,
      .pmy-kpi-card.is-featured { grid-column:span 1; min-height:150px; border-radius:18px; padding:15px; }
      .pmy-kpi-topline { margin-bottom:14px; }
      .pmy-kpi-icon { width:38px; height:38px; border-radius:13px; }
      .pmy-kpi-value { font-size:25px; }
      .pmy-dashboard-status-strip { grid-template-columns:1fr 1fr; border-radius:16px; }
      .pmy-dashboard-status-item { padding:10px 11px; }
      .pmy-trend-header { flex-direction:column; align-items:flex-start; margin-bottom:4px; }
      .pmy-trend-meta { width:100%; align-items:flex-start; }
      .pmy-trend-legend { justify-content:flex-start; }
      .pmy-trend-title { font-size:21px; }
      .pmy-trend-card { border-radius:18px; padding:17px 14px 12px; }
      .pmy-trend-chart { min-width:680px; min-height:250px; }
      .pmy-content-inner { padding:14px 14px 38px; }
      .pmy-header-top { align-items:flex-start; }
      .pmy-header-title-wrap { flex:1; }
      .pmy-eyebrow { display:none; }
      .pmy-page-title { font-size:27px; padding-top:6px; }
      .pmy-grid { grid-template-columns:1fr; gap:12px; margin-bottom:18px; }
      .pmy-card, .pmy-form-box { border-radius:18px; padding:18px; }
      .pmy-card-value { font-size:28px; }
      .pmy-date-wrapper { flex-shrink:0; }
      .pmy-date-btn { width:42px; height:42px; overflow:hidden; padding:0; justify-content:center; font-size:0; }
      .pmy-date-btn::before { content:none; }
      .pmy-date-dropdown { position:fixed; left:14px; right:14px; top:76px; width:auto; max-height:calc(100dvh - 96px); overflow:auto; }
      .pmy-date-custom-inputs { flex-direction:column; align-items:stretch; }
      .pmy-date-custom-inputs > span { display:none; }

      .pmy-booking-meta-grid,
      .pmy-variants-form-grid { grid-template-columns:1fr; }
      .pmy-settings-color-grid { grid-template-columns:1fr; gap:14px; }
      .pmy-brand-logo-grid { grid-template-columns:1fr; }
      .pmy-brand-logo-current { align-items:flex-start; }
      .pmy-brand-logo-current > div { width:100%; }
      .pmy-calendar-month-selector-bar { flex-wrap:wrap; gap:8px; }
      .pmy-calendar-view-tabs { width:100%; overflow-x:auto; }
      .pmy-cal-tab { flex:0 0 auto; }
      .pmy-calendar-current-month-year-label { min-width:0; flex:1; }
      .pmy-list-item,
      .pmy-tour-item { align-items:flex-start; gap:10px; }
      .pmy-tour-item { flex-wrap:wrap; }

      .pmy-int-subtab-bar,
      .pmy-prod-platform-tabs,
      .pmy-mapping-platform-tabs,
      .pmy-media-filter-tabs { width:100%; overflow-x:auto; flex-wrap:nowrap; scrollbar-width:thin; padding-bottom:4px; }
      .pmy-int-subtab,
      .pmy-prod-ptab,
      .pmy-mapping-tab,
      .pmy-media-ftab { flex:0 0 auto; }

      .pmy-modal-overlay { align-items:flex-end; padding:0; }
      .pmy-modal,
      .pmy-connect-modal {
        width:100%;
        max-width:100%;
        max-height:92dvh;
        border-radius:24px 24px 0 0;
      }
      .pmy-modal-header { padding:18px; }
      .pmy-modal-body { padding:18px; }
      .pmy-guides-grid { grid-template-columns:repeat(2,minmax(0,1fr)); gap:12px; }
      .pmy-media-grid { grid-template-columns:repeat(2,minmax(0,1fr)); gap:10px; }
      .pmy-media-thumb, .pmy-media-thumb-placeholder { height:110px; }
    }

    @media (max-width: 430px) {
      .pmy-dashboard-kpi-grid { grid-template-columns:1fr; }
      .pmy-dashboard-status-strip { grid-template-columns:1fr; }
      .pmy-kpi-card { min-height:138px; }
      .pmy-content-inner { padding-inline:10px; }
      .pmy-header-top { gap:8px; }
      .pmy-page-title { font-size:24px; }
      .pmy-mobile-menu-btn, .pmy-date-btn { width:40px; height:40px; flex-basis:40px; }
      .pmy-card, .pmy-form-box { padding:16px; }
      .pmy-guides-grid, .pmy-media-grid { grid-template-columns:1fr; }
      .pmy-platform-pill { padding-inline:10px; }
    }
  `;


  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Asul:wght@400;700&family=Assistant:wght@400;500;600;700;800&family=Inter:wght@400;600;700;800;900&family=Poppins:wght@400;600;700;800&family=Lato:wght@400;700&family=Roboto:wght@400;500;700&family=Open+Sans:wght@400;600;700&family=Montserrat:wght@400;600;700;800&family=Nunito:wght@400;600;700;800&display=swap');
      `}</style>
      <style>{styles}</style>
      <div className="pmy-app-container">
        <button
          type="button"
          className={`pmy-mobile-backdrop ${mobileNavOpen ? "is-visible" : ""}`}
          aria-label={lang === "pt" ? "Fechar menu" : "Close menu"}
          onClick={() => setMobileNavOpen(false)}
        />

        <aside className={`pmy-sidebar ${sidebarCollapsed ? "is-collapsed" : ""} ${mobileNavOpen ? "is-mobile-open" : ""}`}>
          <div className="pmy-logo-area">
            <div className="pmy-logo-full">
              {activeSidebarLogoUrl ? (
                <div className="pmy-logo-wrapper">
                  <img
                    src={activeSidebarLogoUrl}
                    alt="Portugal Me & You"
                    className={`pmy-logo-image ${autoWhiteSidebarLogo ? "is-auto-white" : ""}`}
                  />
                </div>
              ) : (
                <div className="pmy-logo-placeholder"><span>Portugal Me & You</span></div>
              )}
            </div>
            <div className="pmy-logo-mini">PMY</div>
            <button
              type="button"
              className="pmy-sidebar-collapse"
              onClick={toggleSidebar}
              title={sidebarCollapsed ? (lang === "pt" ? "Expandir menu" : "Expand menu") : (lang === "pt" ? "Recolher menu" : "Collapse menu")}
              aria-label={sidebarCollapsed ? (lang === "pt" ? "Expandir menu" : "Expand menu") : (lang === "pt" ? "Recolher menu" : "Collapse menu")}
            >
              {sidebarCollapsed ? "›" : "‹"}
            </button>
          </div>

          <nav className="pmy-menu" aria-label={lang === "pt" ? "Navegação principal" : "Main navigation"}>
            {navItems.map((item) => (
              <button
                key={item.key}
                type="button"
                className={`pmy-menu-item ${activeTab === item.key ? "active" : ""}`}
                onClick={() => openNavigationTab(item.key)}
                title={sidebarCollapsed ? item.label : undefined}
              >
                <span className="pmy-menu-icon"><Icon name={item.icon} size={19} /></span>
                <span className="pmy-menu-label">{item.label}</span>
              </button>
            ))}
          </nav>

          <div className="pmy-sidebar-footer">
            <button
              type="button"
              className={`pmy-menu-item ${activeTab === "configuracoes" ? "active" : ""}`}
              onClick={() => openNavigationTab("configuracoes")}
              title={sidebarCollapsed ? (lang === "pt" ? "Configurações" : "Settings") : undefined}
            >
              <span className="pmy-menu-icon"><Icon name="settings" size={19} /></span>
              <span className="pmy-menu-label">{lang === "pt" ? "Configurações" : "Settings"}</span>
            </button>

            <div className="pmy-lang-pill">
              <span className={lang==='pt'?'active':''} onClick={() => setLang('pt')}><img src="https://flagcdn.com/w40/pt.png" alt="PT" className="pmy-flag-icon" /></span>
              <div className="pmy-lang-divider"></div>
              <span className={lang==='en'?'active':''} onClick={() => setLang('en')}><img src="https://flagcdn.com/w40/gb.png" alt="EN" className="pmy-flag-icon" /></span>
            </div>
            <div className="pmy-credit-text">{t.created_by}</div>
          </div>
        </aside>

        <main className="pmy-content">
          <div className="pmy-content-inner">
          <div className="pmy-header-top">
            <div className="pmy-header-title-wrap">
              <button
                type="button"
                className="pmy-mobile-menu-btn"
                onClick={() => setMobileNavOpen(true)}
                aria-label={lang === "pt" ? "Abrir menu" : "Open menu"}
              >
                <Icon name="menu" size={19} strokeWidth={2} />
              </button>
              <div className="pmy-header-copy">
                <div className="pmy-eyebrow">{lang === 'pt' ? 'Portugal Me & You · Central de Reservas' : 'Portugal Me & You · Booking Hub'}</div>
                <h1 className="pmy-page-title">
              {activeTab==='dashboard' && t.dash_title}
              {activeTab==='agenda' && t.agenda_title}
              {activeTab==='integracoes' && t.integrations_title}
              {activeTab==='guias' && t.guides_title}
              {activeTab==='automacoes' && t.automations_title}
              {activeTab==='configuracoes' && t.settings_title}
              {activeTab==='midias' && (lang === 'pt' ? 'Banco de Mídias' : 'Media Library')}
            </h1>
              </div>
            </div>
            {activeTab==='dashboard' && (
              <div className="pmy-date-wrapper">
                <button className="pmy-date-btn" onClick={() => setIsDateMenuOpen(!isDateMenuOpen)}><Icon name="calendar" size={16} /> {getPeriodLabel()} <Icon name="chevronDown" size={14} /></button>
                {isDateMenuOpen && (
                  <>
                    <div className="pmy-date-overlay" onClick={() => setIsDateMenuOpen(false)}></div>
                    <div className="pmy-date-dropdown">
                      <div className="pmy-date-presets">
                        {["period_1w","period_15d","period_30d","period_60d","period_90d","period_120d","period_6m","period_1y"].map(k => (
                          <div key={k} className={`pmy-date-preset-item ${selectedPeriod===k?'active':''}`} onClick={() => handlePresetSelection(k)}>{t[k]}</div>
                        ))}
                      </div>
                      <div className="pmy-date-custom">
                        <div className="pmy-date-custom-title">{t.period_custom}</div>
                        <div className="pmy-date-custom-inputs">
                          <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)} />
                          <span className="pmy-ds-migrated-chpnty">-</span>
                          <input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)} />
                        </div>
                        <button className="pmy-date-apply-btn" onClick={handleCustomDateApply}>{t.btn_apply}</button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          <DashboardTab {...{
            activeTab, setActiveModal, t, totalSalesCount, confirmedRevenueValue, formatMoney,
            missingFinancialBookings, pricedConfirmedBookings, revenueCurrencies, lang,
            averageTicketValue, canceledCount, cancellationRate, upcomingCount, dashboardUpcomingDepartures, getPeriodLabel,
            salesByChannel, bookings, categoriesData, toggleCategory, openCategories, realConfirmedBookings,
            dashboardBookingStatusSummary, dashboardTrendData, dashboardTrendGranularity, dashboardCurrency, imageShape
          }} />

          <AgendaTab {...{
            activeTab, activeTourLanguages, blockDateTime, blockMessage, blockPlatforms,
            blockRecurringDays, blockSaving, blockSelectedHour, blockTourId, blockedDates,
            bookingDate, bookingPlatforms, bookingTime, calendarView, currentMonthLabel,
            currentYear, custEmail, custLang, custName, custPhone, draftOrderError,
            draftOrderInfo, draftOrderLoading, generatedLink, getBookingTimesForTour,
            getLisbonToday, handleBlockTourSelectionChange, handleCapacityChange,
            handleCreateBlock, handleGeneratePaymentLink, handleNextMonth, handlePrevMonth,
            handleRemoveBlock, handleTogglePlatformSelection, handleTourSelectionChange,
            imageShape, platformConnections, renderCalendarDays, reservationPlatforms,
            selectedTour, setBlockDateTime, setBlockPlatforms, setBlockRecurringDays,
            setBlockSelectedHour, setBookingDate, setBookingPlatforms, setBookingTime,
            setCalendarView, setCustEmail, setCustLang, setCustName, setCustPhone,
            setDraftOrderInfo, setGeneratedLink, setTourVariants, t, tourAvailableHours,
            tourCapacities, tourOptions, tourVariants, tours, variantMatchesBookingTime, lang
          }} />

          <IntegrationsTab {...{
            activeTab, activeProdPlatform, allPlatforms, bookings, contentPlatforms,
            customIntegrations, customKey, customName, customUrl, formatSyncTime,
            handleAddCustomIntegration, handleDisconnect, handleOpenConnect,
            handleRequeueSyncJob, handleSyncPlatformNow, handleToggleProduct, intSubTab,
            lang, loadSyncQueue, manualSyncError, manualSyncPlatform, manualSyncResult,
            platformConnections, platformProducts, reservationPlatforms, runSyncQueueNow,
            setActiveProdPlatform, setCustomKey, setCustomName, setCustomUrl, setIntSubTab,
            syncEventLabel, syncProviderMeta, syncQueueActionId, syncQueueData, syncQueueError,
            syncQueueLastLoaded, syncQueueLoading, syncStatusMeta,
            shopifyValidation, shopifyValidationError, shopifyValidationLoading,
            shopifyValidationCancelLoading, cancelShopifyValidation,
            loadShopifyValidation, startShopifyValidation, t, tours
          }} />

          <GuidesTab {...{
            activeTab, ddiList, getFlagUrl, guideAssignments: guideAssignmentsList,
            guideDdi, guideEmail, guideName, guidePhoto,
            guidePhotoRef, guideUtmId, guideWhatsapp, guidesList, handleAddGuide,
            handleDeleteGuide, handleGuidePhotoChange, handleOpenEditGuide,
            openShopifyFilePicker, setActiveModal, setGuideDdi, setGuideEmail,
            setGuideName, setGuidePhoto, setGuideUtmId, setGuideWhatsapp,
            setSelectedGuideInfo, setUpcomingToursFilter, t, upcomingToursFilter, lang
          }} />

          <AutomationsTab activeTab={activeTab} lang={lang} />

          <SettingsTab {...{
            activeMappingPlatform, activeTab, allPlatforms, defaultMappings, fieldMappings,
            logoLightInputRef, logoDarkInputRef, handleBrandLogoChange, handleRemoveBrandLogo,
            handleThemeChange, handleRestoreThemeDefaults, handleImageShapeChange,
            handleSaveFieldMappings, handleResetFieldMappings, handleUpdateFieldMapping,
            imageShape, internalFields, logoOnLightUrl, logoOnDarkUrl, logoUploadingVariant,
            sidebarIsDark, activeSidebarLogoUrl, mappingSaveState, platformConnections,
            reservationPlatforms, setActiveMappingPlatform, settingsSaveMessage,
            shopifyStaff, t, theme, lang
          }} />

          <MediaTab {...{
            activeTab, handleCopyMediaUrl, handleDeleteMedia, handleMediaUpload,
            mediaCategoryInput, mediaFilter, mediaLabelInput, mediaList, mediaPreview,
            mediaUploadError, mediaUploadProgress, mediaUploadRef, mediaUploading, setActiveModal,
            setMediaCategoryInput, setMediaFilter, setMediaLabelInput, setMediaList,
            setMediaPreview, setShowShopifySource, showShopifySource, lang
          }} />

          </div>
        </main>
      </div>

      {renderModal()}
      {renderConnectModal()}
      {renderEditGuideModal()}
    </>
  );
}

export default function CentralDeReservas() {
  const { apiKey = "" } = useLoaderData() || {};

  return (
    <AppProvider embedded apiKey={apiKey}>
      <CentralDeReservasContent />
    </AppProvider>
  );
}

// deployment-recovery: stable full-tree snapshot
