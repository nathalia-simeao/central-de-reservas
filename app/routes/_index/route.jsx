import { useState, useRef, useCallback, useEffect } from "react";
import { useLoaderData } from "react-router";

import DashboardTab from "../../components/pmy/DashboardTab";
import AgendaTab from "../../components/pmy/AgendaTab";
import IntegrationsTab from "../../components/pmy/IntegrationsTab";
import GuidesTab from "../../components/pmy/GuidesTab";
import AutomationsTab from "../../components/pmy/AutomationsTab";
import SettingsTab from "../../components/pmy/SettingsTab";
import MediaTab from "../../components/pmy/MediaTab";

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
    menu_dashboard: "📊 Dashboard", menu_agenda: "📅 Agenda Central", menu_integrations: "🔗 Integrações",
    menu_guides: "👥 Guias", menu_automations: "🤖 Automações", menu_settings: "⚙️ Configurações",
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
    modal_upcoming_details: "Lista de Próximos Tours", views: "visualizações", btn_format: "⚙️ Formato",
    form_new_booking: "🎟️ Inserir Nova Reserva", form_new_block: "🔒 Inserir Bloqueio Manual",
    form_select_tour: "Selecione o Tour", form_customer: "Nome do Cliente (Obrigatório):",
    form_email: "E-mail (Opcional):", form_phone: "Telefone / WhatsApp (Opcional):",
    form_lang: "Idioma Base do Tour:", form_qty: "Quantidade de Ingressos:",
    form_date_time: "Data do Bloqueio Específica:", form_btn_link: "🔗 Gerar Link de Pagamento",
    form_btn_block: "Bloquear Vagas / Horários", tour_capacity: "Capacidade Máxima de Vagas:",
    guide_assigned: "Guia Escalado:", no_guide: "Sem guia atribuído", registered_guides: "Equipe de Guias",
    form_new_guide: "Cadastrar Novo Guia", form_guide_name: "Nome e Sobrenome:", form_guide_email: "E-mail do Guia:",
    form_guide_whatsapp: "WhatsApp (Obrigatório):", form_guide_photo: "Foto do Guia:", btn_add_guide: "Salvar Guia",
    registered_guides_list: "Guias Cadastrados", upcoming_tours_list: "Próximos Tours Agendados", filter_today: "Hoje",
    int_subtitle: "Conecte seus canais de venda para puxar as reservas de forma automática.",
    int_connected: "Conectado", int_configure: "Configurar Conexão", int_connect: "Vincular Conta",
    int_desc_viator: "Sincronize horários, vagas e passageiros.", int_desc_gyg: "Puxe reservas e atualize a disponibilidade.",
    int_desc_ta: "Importe suas avaliações e sincronize widgets.", int_desc_shopify: "Pedidos feitos no site caem aqui na hora.",
    int_custom_title: "🔗 Conectar Nova Plataforma via API", int_custom_name: "Nome da Plataforma:",
    int_custom_url: "Endpoint da API (URL):", int_custom_key: "Chave da API / Token de Acesso:",
    int_custom_btn: "Ativar Integração Customizada",
    block_days_week: "Dias da Semana Bloqueados Sempre (ex: 0, 1, 2):", block_select_hour: "Horário para Bloqueio:",
    view_1d: "1 dia", view_3d: "3 dias", view_7d: "7 dias", view_month: "Mês todo"
  },
  en: {
    menu_dashboard: "📊 Dashboard", menu_agenda: "📅 Central Agenda", menu_integrations: "🔗 Integrations",
    menu_guides: "👥 Guides", menu_automations: "🤖 Automations", menu_settings: "⚙️ Settings",
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
    modal_upcoming_details: "Upcoming Tours List", views: "views", btn_format: "⚙️ Shape",
    form_new_booking: "🎟️ Insert New Booking", form_new_block: "🔒 Insert Manual Block",
    form_select_tour: "Select Tour", form_customer: "Customer Name (Required):",
    form_email: "Email (Optional):", form_phone: "Phone / WhatsApp (Optional):",
    form_lang: "Tour Language:", form_qty: "Ticket Quantity:",
    form_date_time: "Specific Block Date:", form_btn_link: "🔗 Generate Payment Link",
    form_btn_block: "Block Slots / Times", tour_capacity: "Max Capacity Slots:",
    guide_assigned: "Assigned Guide:", no_guide: "No guide assigned", registered_guides: "Guides Staff",
    form_new_guide: "Register New Guide", form_guide_name: "Full Name:", form_guide_email: "Guide Email:",
    form_guide_whatsapp: "WhatsApp (Required):", form_guide_photo: "Guide Photo:", btn_add_guide: "Save Guide",
    registered_guides_list: "Registered Guides", upcoming_tours_list: "Upcoming Scheduled Tours", filter_today: "Today",
    int_subtitle: "Connect your sales channels to fetch bookings automatically.",
    int_connected: "Connected", int_configure: "Configure Connection", int_connect: "Link Account",
    int_desc_viator: "Sync schedules, availability, and travelers.", int_desc_gyg: "Fetch bookings and update availability.",
    int_desc_ta: "Reviews, ratings, photos and reputation content.", int_desc_shopify: "Website orders appear here instantly.",
    int_custom_title: "🔗 Connect New Platform via API", int_custom_name: "Platform Name:",
    int_custom_url: "API Endpoint (URL):", int_custom_key: "API Key / Access Token:",
    int_custom_btn: "Activate Custom Integration",
    block_days_week: "Always Blocked Weekdays (e.g., 0, 1, 2):", block_select_hour: "Time slot to Block:",
    view_1d: "1 day", view_3d: "3 days", view_7d: "7 days", view_month: "Full month"
  }
};

const allPlatforms = [
  { key: "shopify", logo: "🛍️", name: "Shopify Store",
    desc: { pt: "Pedidos do site caem aqui na hora. Canal de venda próprio.", en: "Website orders appear here instantly. Your own sales channel." },
    authType: "oauth", oauthLabel: "Entrar com Shopify", oauthUrl: "https://accounts.shopify.com/",
    docsUrl: "https://shopify.dev/docs/api/admin-rest" },
  { key: "viator", logo: "🧡", name: "Viator",
    desc: { pt: "Sincronize horários, vagas e passageiros automaticamente.", en: "Sync schedules, availability and travelers automatically." },
    authType: "api", oauthLabel: "Acessar Portal Viator", oauthUrl: "https://supplier.viator.com/",
    docsUrl: "https://docs.viator.com/partner-api/" },
  { key: "getyourguide", logo: "💛", name: "GetYourGuide",
    desc: { pt: "Puxe reservas e atualize disponibilidade em tempo real.", en: "Fetch bookings and sync availability in real time." },
    authType: "api", oauthLabel: "Acessar Portal GYG", oauthUrl: "https://supplier.getyourguide.com/",
    docsUrl: "https://integrator.getyourguide.com/documentation/overview" },
  { key: "tripadvisor", logo: "🦉", name: "TripAdvisor",
    desc: { pt: "Conteúdo e reputação: reviews, ratings, fotos e dados de localização. As reservas de experiências são distribuídas pela Viator.", en: "Content and reputation: reviews, ratings, photos and location data. Experience bookings are distributed through Viator." },
    authType: "content", oauthLabel: "Acessar Tripadvisor", oauthUrl: "https://www.tripadvisor.com/Owners",
    docsUrl: "https://docs.terra.tripadvisor.com/docs/overview" },
  { key: "headout", logo: "🌍", name: "Headout",
    desc: { pt: "Distribua seus tours para milhões de viajantes globais.", en: "Distribute your tours to millions of global travelers." },
    authType: "api", oauthLabel: "Acessar Portal Headout", oauthUrl: "https://www.headout.com/partner/login",
    docsUrl: "https://developer.headout.com/" },
  { key: "civitatis", logo: "🏛️", name: "Civitatis",
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
  primaryColor: "#006600",
  sidebarBg: "#ffffff",
  fontFamily: "Assistant",
  fontSize: "14px",
  titleColor: "#006600",
  textColor: "#2b2b2b",
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
      <div style={{ fontSize:'13px', color:'#666', marginBottom:'14px' }}>
        Busque e clique em uma imagem para selecioná-la.
      </div>

      {/* Campo de busca */}
      <div style={{ position:'relative', marginBottom:'14px' }}>
        <span style={{ position:'absolute', left:'12px', top:'50%', transform:'translateY(-50%)', fontSize:'14px', pointerEvents:'none' }}>🔍</span>
        <input
          type="text"
          placeholder="Buscar por nome da imagem..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          autoFocus
          style={{ width:'100%', padding:'9px 12px 9px 36px', border:'1.5px solid #ddd', borderRadius:'8px', fontSize:'13px', outline:'none', boxSizing:'border-box', fontFamily:'inherit' }}
          onFocus={e => e.target.style.borderColor = '#006600'}
          onBlur={e  => e.target.style.borderColor = '#ddd'}
        />
        {search && (
          <button onClick={() => setSearch("")}
            style={{ position:'absolute', right:'10px', top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', fontSize:'16px', color:'#aaa', lineHeight:1 }}>×</button>
        )}
      </div>

      {/* Contador */}
      <div style={{ fontSize:'12px', color:'#aaa', marginBottom:'10px' }}>
        {filtered.length} de {allImages.length} imagens
        {search && <span> para "<strong>{search}</strong>"</span>}
      </div>

      {/* Grid */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(100px, 1fr))', gap:'10px', maxHeight:'360px', overflowY:'auto' }}>
        {filtered.map(img => (
          <div key={img.id || img.url} onClick={() => onSelect(img.url)}
            style={{ cursor:'pointer', borderRadius:'10px', overflow:'hidden', border:'2px solid #eee', transition:'0.15s' }}
            onMouseOver={e => e.currentTarget.style.borderColor = '#006600'}
            onMouseOut={e  => e.currentTarget.style.borderColor = '#eee'}>
            <img src={img.url} alt={img.label || img.filename}
              style={{ width:'100%', height:'80px', objectFit:'cover', display:'block' }}
              onError={e => { e.target.style.display='none'; }} />
            <div style={{ padding:'4px 6px', fontSize:'10px', color:'#888', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
              {img.label || img.filename || "Sem nome"}
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div style={{ gridColumn:'1/-1', textAlign:'center', padding:'30px', color:'#aaa', fontSize:'13px' }}>
            {search ? `Nenhuma imagem encontrada para "${search}"` : "Nenhuma imagem disponível. Clique em Abrir Biblioteca acima."}
          </div>
        )}
      </div>
    </div>
  );
}

function PmyNavIcon({ name }) {
  const common = {
    width: 19,
    height: 19,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": true,
  };

  const paths = {
    dashboard: <><rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/></>,
    agenda: <><rect x="3" y="5" width="18" height="16" rx="3"/><path d="M8 3v4M16 3v4M3 10h18"/><path d="M8 14h2M14 14h2M8 18h2"/></>,
    integracoes: <><path d="M8.5 14.5l-2 2a3.5 3.5 0 105 5l2-2"/><path d="M15.5 9.5l2-2a3.5 3.5 0 10-5-5l-2 2"/><path d="M9 15l6-6"/></>,
    guias: <><path d="M16 21v-2a4 4 0 00-4-4H7a4 4 0 00-4 4v2"/><circle cx="9.5" cy="7" r="4"/><path d="M19 8v6M16 11h6"/></>,
    automacoes: <><path d="M12 2v3M12 19v3M4.93 4.93l2.12 2.12M16.95 16.95l2.12 2.12M2 12h3M19 12h3M4.93 19.07l2.12-2.12M16.95 7.05l2.12-2.12"/><circle cx="12" cy="12" r="4"/></>,
    midias: <><rect x="3" y="4" width="18" height="16" rx="3"/><circle cx="9" cy="10" r="2"/><path d="M21 15l-5-5L5 20"/></>,
    configuracoes: <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 00.34 1.88l.06.06-2.83 2.83-.06-.06A1.7 1.7 0 0015 19.4a1.7 1.7 0 00-1 .6 1.7 1.7 0 00-.4 1.1V21h-4v-.1A1.7 1.7 0 008.6 19.4a1.7 1.7 0 00-1.88.34l-.06.06-2.83-2.83.06-.06A1.7 1.7 0 004.6 15a1.7 1.7 0 00-.6-1 1.7 1.7 0 00-1.1-.4H3v-4h.1A1.7 1.7 0 004.6 8.6a1.7 1.7 0 00-.34-1.88l-.06-.06 2.83-2.83.06.06A1.7 1.7 0 009 4.6a1.7 1.7 0 001-.6 1.7 1.7 0 00.4-1.1V3h4v.1A1.7 1.7 0 0015.4 4.6a1.7 1.7 0 001.88-.34l.06-.06 2.83 2.83-.06.06A1.7 1.7 0 0019.4 9c.16.38.4.72.72 1 .3.27.7.41 1.1.4H21v4h-.1a1.7 1.7 0 00-1.5.6z"/></>,
  };

  return <svg {...common}>{paths[name] || paths.dashboard}</svg>;
}

export default function CentralDeReservas() {
  const { tours, bookings, blockedDates = [], shopifyProducts = [], shopName = "Minha Loja Shopify", shopifyStaff = [], mediaFiles = [], shopifyImages = [], dbGuides = [], shopifyWebhookStatus = null, gygIntegrationStatus = null, businessSettings = null, platformFieldMappings = [] } = useLoaderData() || { tours: [], bookings: [], blockedDates: [], shopifyProducts: [], shopName: "Minha Loja Shopify", shopifyStaff: [], mediaFiles: [], shopifyImages: [], dbGuides: [], shopifyWebhookStatus: null, gygIntegrationStatus: null, businessSettings: null, platformFieldMappings: [] };
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

  // Configurações visuais do negócio vêm do banco, não do navegador.
  const [logoUrl, setLogoUrl] = useState(businessSettings?.logoUrl || null);
  const [theme, setTheme] = useState({
    ...DEFAULT_THEME,
    ...(businessSettings?.theme && typeof businessSettings.theme === "object"
      ? businessSettings.theme
      : {}),
  });
  const [settingsSaveMessage, setSettingsSaveMessage] = useState("");
  const settingsSaveTimerRef = useRef(null);
  const settingsMessageTimerRef = useRef(null);

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

  // I. CONEXÕES DE PLATAFORMAS (NOVO)
  const [platformConnections, setPlatformConnections] = useState({
    shopify:      { connected: true,  accountName: shopName, lastSync: new Date().toLocaleTimeString("pt-PT", {hour:"2-digit",minute:"2-digit"}) },
    viator:       { connected: false },
    getyourguide: {
      connected: Boolean(gygIntegrationStatus?.credentialsReady),
      accountName: "PMY Supplier API v1",
      lastSync: gygIntegrationStatus?.credentialsReady ? "Pronto para testes" : "Credenciais pendentes",
    },
    tripadvisor:  { connected: false, contentOnly: true, accountName: "Tripadvisor Terra", lastSync: "Não é canal de reservas" },
    headout:      { connected: false },
    civitatis:    { connected: false },
  });
  const [connectingPlatform, setConnectingPlatform] = useState(null);
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [apiSecretInput, setApiSecretInput] = useState("");

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

  const fileInputRef = useRef(null);
  const guidePhotoRef = useRef(null);
  const t = translations[lang] || translations.pt;
  const navItems = [
    { key: "dashboard", icon: "dashboard", label: lang === "pt" ? "Dashboard" : "Dashboard" },
    { key: "agenda", icon: "agenda", label: lang === "pt" ? "Agenda Central" : "Central Agenda" },
    { key: "integracoes", icon: "integracoes", label: lang === "pt" ? "Integrações" : "Integrations" },
    { key: "guias", icon: "guias", label: lang === "pt" ? "Guias" : "Guides" },
    { key: "automacoes", icon: "automacoes", label: lang === "pt" ? "Automações" : "Automations" },
    { key: "midias", icon: "midias", label: lang === "pt" ? "Banco de Mídias" : "Media Library" },
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
    departure.passengers += Number(booking?.totalParticipants || 0);
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
    : (tours || []).map(t => ({ id: t.id, title: t.title, price: null, sku: null, image: null, collections: [], scheduleSlots: [] }));

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

    for (const key of ["shop", "host", "embedded", "id_token", "session"]) {
      const value = current.searchParams.get(key);
      if (value) params.set(key, value);
    }

    const query = params.toString();
    return query ? `${pathname}?${query}` : pathname;
  }, []);

  const requestResourceJson = useCallback(async (pathname, formData = null) => {
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
      if (/<!doctype|<html/i.test(bodyText)) {
        throw new Error(
          "A sessão da integração não autenticou a chamada de API. Recarregue a Central e tente novamente.",
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
    }, shopifyValidation?.status === "WAITING" ? 3000 : 15000);

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
    SHOPIFY: { label: "Shopify", icon: "🛍️" },
    GETYOURGUIDE: { label: "GetYourGuide", icon: "🎟️" },
    VIATOR: { label: "Viator", icon: "🟢" },
    CIVITATIS: { label: "Civitatis", icon: "🔴" },
    HEADOUT: { label: "Headout", icon: "🌍" },
    CENTRAL: { label: "Central PMY", icon: "🧭" },
    MANUAL: { label: "Manual", icon: "✍️" },
  };

  const syncStatusMeta = {
    COMPLETED: { icon: "✅", label: "Sincronizado", bg: "#ecfdf3", color: "#166534" },
    SKIPPED: { icon: "↪️", label: "Ignorado", bg: "#eff6ff", color: "#1d4ed8" },
    PENDING: { icon: "⏳", label: "Pendente", bg: "#fff7ed", color: "#9a3412" },
    PROCESSING: { icon: "🔄", label: "Processando", bg: "#eff6ff", color: "#1d4ed8" },
    RETRY: { icon: "🟠", label: "Nova tentativa", bg: "#fff7ed", color: "#c2410c" },
    BLOCKED: { icon: "⚠️", label: "Bloqueado", bg: "#fffbeb", color: "#92400e" },
    DEAD: { icon: "❌", label: "Falhou", bg: "#fef2f2", color: "#b91c1c" },
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
      formData.append("date", bookingDate);
      formData.append("time", bookingTime);
      formData.append("language", custLang);
      formData.append("bookingPlatforms", bookingPlatforms.join(","));
      formData.append("lineItems", JSON.stringify(lineItems));

      const payload = await requestResourceJson("/api/draft-order", formData);
      const draftOrder = payload?.draftOrder;

      if (!draftOrder?.invoiceUrl) {
        throw new Error("O Shopify não devolveu um link de checkout.");
      }

      setGeneratedLink(draftOrder.invoiceUrl);
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

      const res = await fetch(window.location.href, { method: "POST", body: fd });
      const data = await res.json();
      setMediaUploadProgress(30);

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Erro ao preparar upload no Shopify.");
      }

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

      const finalizeRes = await fetch(window.location.href, {
        method: "POST",
        body: finalizeFd,
      });
      const finalizeData = await finalizeRes.json();

      if (!finalizeRes.ok || !finalizeData.success || !finalizeData.media) {
        throw new Error(finalizeData.error || "Falha ao registrar o arquivo na biblioteca PMY.");
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
      const response = await fetch(window.location.href, { method: "POST", body: fd });
      const payload = await response.json().catch(() => null);

      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error || "Não foi possível remover a mídia.");
      }

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

    const response = await fetch(window.location.href, {
      method: "POST",
      body: fd,
      credentials: "include",
      headers: { Accept: "application/json" },
    });
    const payload = await response.json().catch(() => null);

    if (!response.ok || !payload?.success) {
      throw new Error(payload?.error || "Não foi possível salvar a configuração.");
    }

    setSettingsSaveMessage("Salvo no banco ✓");
    window.clearTimeout(settingsMessageTimerRef.current);
    settingsMessageTimerRef.current = window.setTimeout(
      () => setSettingsSaveMessage(""),
      1800,
    );
    return payload.settings;
  }, []);

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

    if (legacyLogo) setLogoUrl(legacyLogo);
    if (legacyTheme && typeof legacyTheme === "object") {
      setTheme({ ...DEFAULT_THEME, ...legacyTheme });
    }

    persistBusinessSettings({
      ...(legacyLogo ? { logoUrl: legacyLogo } : {}),
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

  const handleLogoChange = (e) => {
    const f = e.target.files[0];
    if (!f) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = String(ev.target.result || "");
      setLogoUrl(dataUrl);
      persistBusinessSettings({ logoUrl: dataUrl }).catch((error) => {
        setSettingsSaveMessage(error?.message || "Erro ao salvar logo.");
      });
    };
    reader.readAsDataURL(f);
  };

  const handleRemoveLogo = () => {
    setLogoUrl(null);
    persistBusinessSettings({ logoUrl: "" }).catch((error) => {
      setSettingsSaveMessage(error?.message || "Erro ao remover logo.");
    });
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
    const tour = tourOptions.find(t => t.id === id);

    // 1. Metafield
    if (tour?.scheduleSlots?.length > 0) {
      setModalAvailableHours(tour.scheduleSlots);
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
      setModalAvailableHours([...timesFromVariants].sort());
      return;
    }

    setModalAvailableHours(["09:00", "14:00"]);
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

    return {
      bookings: dayBookings,
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

  // HANDLERS DE PLATAFORMAS (NOVO)
  const handleOpenConnect = (key) => {
    setConnectingPlatform(key);
    setApiKeyInput("");
    setApiSecretInput("");
    if (key === "getyourguide") {
      setGygConfigMessage("");
    }
  };

  const handleConfirmConnect = (key) => {
    if (apiKeyInput.trim()) {
      setPlatformConnections(p => ({ ...p, [key]: { connected: true, accountName: `Conta ${allPlatforms.find(pl=>pl.key===key)?.name}`, lastSync: "Agora mesmo" } }));
      setConnectingPlatform(null); setApiKeyInput(""); setApiSecretInput("");
    }
  };

  const handleDisconnect = (key) => {
    if (window.confirm(`Desconectar ${allPlatforms.find(p=>p.key===key)?.name}?`))
      setPlatformConnections(p => ({ ...p, [key]: { connected: false } }));
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
      const hasBlocks = getCalendarDayBlocks(day).length > 0;

      return (
        <div key={key} className={`pmy-calendar-day ${selectedCalendarDay===day?'active':''}`}
          onClick={() => { setSelectedCalendarDay(day); setModalSelectedTour(""); setIsFormAllocating(false); setActiveModal('calendarDay'); }}>
          <div className="pmy-cal-date-line">{day} - {weekdayLabel}</div>
          <div className="pmy-cal-info-line">
            🏰 {stats.tourCount} {stats.tourCount===1 ? 'Tour com reserva' : 'Tours com reserva'}
          </div>
          <div className="pmy-cal-info-line">
            {hasBookings
              ? `👥 Vagas: ${stats.remaining}/${stats.capacity} · ${stats.passengers} pax`
              : '👥 Nenhuma reserva'}
          </div>
          {(hasBookings || hasBlocks) && <div className="pmy-calendar-dot"></div>}
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
    for (let p=0; p<pad; p++) cells.push(<div key={`e-${p}`} className="pmy-calendar-day empty" style={{opacity:0.15,cursor:'default',background:'none',border:'none'}}></div>);
    for (let day=1; day<=totalDays; day++) {
      const wn = weekdays[(day+pad-1)%7]||weekdays[0];
      cells.push(renderDayCell(day, wn.split('-')[0], `d-${day}`));
    }
    return cells;
  };

  // Instruções específicas de onde achar o token em cada plataforma
  const platformTokenGuide = {
    shopify: null, // Shopify não precisa de token — já conectado via app
    viator: {
      steps: [
        "Acesse o portal de fornecedores: supplier.viator.com",
        "Faça login com sua conta de operador",
        "Vá em Account → API Settings → Generate API Key",
        "Copie a chave e cole no campo abaixo",
      ],
      field1Label: "API Key do Fornecedor Viator",
      field1Placeholder: "Ex: PARTNER-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
      field2Label: null,
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
        "Acesse: www.headout.com/partner/login",
        "Faça login com sua conta de parceiro Headout",
        "Vá em Settings → Developer → API Keys",
        "Gere uma nova chave e copie o token",
      ],
      field1Label: "API Key Headout",
      field1Placeholder: "Ex: hdo_live_xxxxxxxxxxxxxxxxxxxxxxxx",
      field2Label: "Partner ID (obrigatório)",
      field2Placeholder: "Ex: 4821",
    },
    civitatis: {
      steps: [
        "Acesse o portal de operadores: operadores.civitatis.com",
        "Faça login com sua conta de operador Civitatis",
        "Vá em Mi Cuenta → Configuración → Acceso API",
        "Copie o Token de Acceso e cole abaixo",
      ],
      field1Label: "Token de Acceso Civitatis",
      field1Placeholder: "Ex: civ_live_xxxxxxxxxxxxxxxxxxxx",
      field2Label: "Operator ID",
      field2Placeholder: "Ex: OP-2204",
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
    const selectedGygTour = (tours || []).find((tour) => tour.id === gygConfigTourId) || null;

    return (
      <div className="pmy-modal-overlay" onClick={() => setConnectingPlatform(null)}>
        <div className="pmy-connect-modal" style={{ maxHeight:'90vh', overflowY:'auto' }} onClick={e => e.stopPropagation()}>

          {/* Header */}
          <div style={{ padding:'25px 25px 0', display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
            <div style={{ flex:1, textAlign:'center' }}>
              <span style={{ fontSize:'50px', display:'block', marginBottom:'8px' }}>{platform.logo}</span>
              <div style={{ fontSize:'21px', fontWeight:'900', color:'var(--text-dark)', marginBottom:'5px' }}>{platform.name}</div>
              <div style={{ fontSize:'13px', color:'var(--text-muted)', marginBottom:'18px' }}>
                {isTripadvisor
                  ? "Conteúdo e reputação · não é canal de reservas"
                  : conn.connected
                    ? `Conectado como: ${conn.accountName} · Último sync: ${conn.lastSync}`
                    : isShopify ? "Já conectado automaticamente via Shopify App" : "Siga as instruções abaixo para conectar"}
              </div>
            </div>
            <button onClick={() => setConnectingPlatform(null)}
              style={{ background:'none', border:'none', fontSize:'24px', cursor:'pointer', color:'#aaa', marginLeft:'10px' }}>&times;</button>
          </div>

          <div style={{ padding:'0 25px 25px' }}>

            {/* ── SHOPIFY: já conectado pelo contexto do app ── */}
            {isShopify && (
              <div>
                <div style={{ background:'#f0fdf4', border:'1px solid #b8e6b8', borderRadius:'12px', padding:'18px', marginBottom:'18px' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:'10px', marginBottom:'10px' }}>
                    <span style={{ fontSize:'22px' }}>✅</span>
                    <strong style={{ fontSize:'15px', color:'var(--primary-green)' }}>Shopify conectado automaticamente</strong>
                  </div>
                  <div style={{ fontSize:'13px', color:'#444', lineHeight:'1.8' }}>
                    <div>🏢 Loja: <strong>{conn.accountName}</strong></div>
                    <div>🔄 Último sync: <strong>{conn.lastSync}</strong></div>
                    <div>⚙️ Método: <strong>Shopify Admin API (OAuth interno do app)</strong></div>
                    <div style={{ marginTop:'6px' }}>
                      📡 Pedidos em tempo real:{' '}
                      <strong style={{ color: shopifyWebhookStatus?.ok ? '#006600' : '#b45309' }}>
                        {shopifyWebhookStatus?.ok ? 'Webhooks ativos' : 'Configuração pendente'}
                      </strong>
                    </div>
                    {shopifyWebhookStatus?.subscriptions?.length > 0 && (
                      <div style={{ fontSize:'11px', color:'#666', marginTop:'4px' }}>
                        {shopifyWebhookStatus.subscriptions.map(s => s.topic).join(' · ')}
                      </div>
                    )}
                    {!shopifyWebhookStatus?.ok && shopifyWebhookStatus?.error && (
                      <div style={{ fontSize:'11px', color:'#a40000', marginTop:'4px' }}>
                        {shopifyWebhookStatus.error}
                      </div>
                    )}
                  </div>
                </div>
                <div style={{ background:'#fffbeb', border:'1px solid #fcd34d', borderRadius:'10px', padding:'14px 16px', marginBottom:'18px', fontSize:'13px', color:'#92400e', lineHeight:'1.6' }}>
                  <strong>ℹ️ Não precisa de token manual.</strong> Este app já acessa sua loja via autenticação OAuth do Shopify. Os produtos são puxados automaticamente pelo servidor.
                  Se os produtos não aparecerem, verifique se existem produtos cadastrados em <strong>Produtos → Todos os produtos</strong> no seu painel Shopify e recarregue a página.
                </div>
                <div style={{ display:'flex', gap:'10px' }}>
                  <button className="pmy-btn-submit" onClick={() => { setConnectingPlatform(null); window.location.reload(); }} style={{ flex:1 }}>
                    🔄 Recarregar e Sincronizar Produtos
                  </button>
                  <button onClick={() => window.open('https://admin.shopify.com/store/products', '_blank')}
                    style={{ flex:1, background:'#f5f5f5', border:'1px solid #ddd', borderRadius:'8px', padding:'12px', fontWeight:'700', fontSize:'13px', cursor:'pointer', color:'#555' }}>
                    Ver Produtos ↗
                  </button>
                </div>
              </div>
            )}

            {/* ── GETYOURGUIDE: Supplier API v1 real ── */}
            {isGyg && (
              <div>
                <div style={{
                  background: gygIntegrationStatus?.credentialsReady ? '#f0fdf4' : '#fffbeb',
                  border: `1px solid ${gygIntegrationStatus?.credentialsReady ? '#b8e6b8' : '#fcd34d'}`,
                  borderRadius:'12px',
                  padding:'18px',
                  marginBottom:'16px'
                }}>
                  <div style={{ fontSize:'15px', fontWeight:'900', color:gygIntegrationStatus?.credentialsReady?'#006600':'#92400e', marginBottom:'10px' }}>
                    {gygIntegrationStatus?.credentialsReady ? '✅ Backend GYG pronto para testes' : '🟡 Credenciais do Integrator Portal pendentes'}
                  </div>
                  <div style={{ fontSize:'12px', color:'#555', lineHeight:'1.8' }}>
                    <div>🔐 Entrada GYG → PMY: <strong>{gygIntegrationStatus?.incomingAuthConfigured ? 'configurada' : 'pendente'}</strong></div>
                    <div>📤 PMY → GYG: <strong>{gygIntegrationStatus?.outgoingAuthConfigured ? 'configurada' : 'pendente'}</strong></div>
                    <div>🌐 API GYG: <strong>{gygIntegrationStatus?.apiBaseConfigured ? 'configurada' : 'pendente'}</strong></div>
                    <div>🧳 Tours mapeados: <strong>{gygIntegrationStatus?.mappedTours || 0}</strong></div>
                    <div>🟢 Tours prontos: <strong>{gygIntegrationStatus?.readyTours || 0}</strong></div>
                    <div>🕒 Sem horário real: <strong>{gygIntegrationStatus?.scheduleMissing || 0}</strong></div>
                  </div>
                </div>

                <div style={{ background:'#f8f8f8', border:'1px solid #eee', borderRadius:'10px', padding:'15px', marginBottom:'16px' }}>
                  <div style={{ fontSize:'12px', fontWeight:'800', color:'#555', marginBottom:'8px' }}>🔌 Endpoints Supplier API v1</div>
                  {[
                    'get-availabilities',
                    'reserve',
                    'cancel-reservation',
                    'book',
                    'cancel-booking',
                  ].map((endpoint) => (
                    <div key={endpoint} style={{ fontFamily:'monospace', fontSize:'11px', color:'#555', padding:'3px 0', wordBreak:'break-all' }}>
                      {gygIntegrationStatus?.endpointBase || '/1'}/{endpoint}
                    </div>
                  ))}
                  <div style={{ marginTop:'9px', fontSize:'11px', color:'#888', lineHeight:'1.5' }}>
                    As credenciais ficam somente no Northflank. Não cole usuário ou senha do GetYourGuide dentro da Central.
                  </div>
                </div>

                <div style={{ background:'#fff', border:'1px solid #e5e5e5', borderRadius:'10px', padding:'16px', marginBottom:'16px' }}>
                  <div style={{ fontSize:'13px', fontWeight:'900', color:'var(--primary-green)', marginBottom:'12px' }}>
                    🧳 Mapear tour PMY ↔ GetYourGuide
                  </div>

                  <div className="pmy-form-group" style={{ marginBottom:'10px' }}>
                    <label style={{ fontSize:'12px', fontWeight:'700', display:'block', marginBottom:'5px' }}>Tour mestre PMY</label>
                    <select className="pmy-form-input" value={gygConfigTourId} onChange={(e) => handleGygTourSelection(e.target.value)}>
                      <option value="">-- Selecione --</option>
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
                      <div style={{ background:'#f7faf7', border:'1px solid #e0eee0', borderRadius:'8px', padding:'10px', marginBottom:'10px' }}>
                        <div style={{ fontSize:'10px', color:'#888' }}>Supplier productId da PMY</div>
                        <code style={{ fontSize:'11px', color:'#006600', wordBreak:'break-all' }}>{selectedGygTour.id}</code>
                        <div style={{ fontSize:'10px', color:'#888', marginTop:'6px' }}>
                          Capacidade central: <strong>{selectedGygTour.maxCapacity}</strong> · fonte: {selectedGygTour.capacitySource}
                        </div>
                      </div>

                      <div className="pmy-form-group" style={{ marginBottom:'10px' }}>
                        <label style={{ fontSize:'12px', fontWeight:'700', display:'block', marginBottom:'5px' }}>ID da atividade/opção no GetYourGuide</label>
                        <input className="pmy-form-input" value={gygConfigActivityId} onChange={(e) => setGygConfigActivityId(e.target.value)}
                          placeholder="Cole o ID do produto/opção correspondente no GYG" />
                      </div>

                      <div className="pmy-form-group" style={{ marginBottom:'10px' }}>
                        <label style={{ fontSize:'12px', fontWeight:'700', display:'block', marginBottom:'5px' }}>
                          Horários reais <span style={{ color:'#888', fontWeight:'400' }}>(HH:MM separados por vírgula)</span>
                        </label>
                        <input className="pmy-form-input" value={gygConfigSchedule} onChange={(e) => setGygConfigSchedule(e.target.value)}
                          placeholder="Ex.: 09:30, 14:00" />
                        <div style={{ fontSize:'10px', color:'#888', marginTop:'4px' }}>
                          Fonte atual: {selectedGygTour.scheduleSource || 'UNCONFIGURED'}. Se preencher aqui, passa a ser MANUAL.
                        </div>
                      </div>

                      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px' }}>
                        <div className="pmy-form-group">
                          <label style={{ fontSize:'12px', fontWeight:'700', display:'block', marginBottom:'5px' }}>Fuso horário</label>
                          <input className="pmy-form-input" value={gygConfigTimezone} onChange={(e) => setGygConfigTimezone(e.target.value)}
                            placeholder="Europe/Lisbon" />
                        </div>
                        <div className="pmy-form-group">
                          <label style={{ fontSize:'12px', fontWeight:'700', display:'block', marginBottom:'5px' }}>Cutoff em segundos</label>
                          <input type="number" min="0" max="604800" className="pmy-form-input" value={gygConfigCutoff} onChange={(e) => setGygConfigCutoff(e.target.value)}
                            placeholder="Ex.: 3600" />
                        </div>
                      </div>

                      <label style={{
                        display:'flex',
                        gap:'8px',
                        alignItems:'flex-start',
                        marginTop:'12px',
                        padding:'10px',
                        background:'#fff9e8',
                        border:'1px solid #f2d77b',
                        borderRadius:'8px',
                        fontSize:'11px',
                        color:'#6d5510',
                        lineHeight:'1.45'
                      }}>
                        <input
                          type="checkbox"
                          checked={gygConfigPriceOverApi}
                          onChange={(e) => setGygConfigPriceOverApi(e.target.checked)}
                          style={{ marginTop:'2px' }}
                        />
                        <span>
                          <strong>Preço via API</strong>. Ative somente quando as categorias/preços deste produto estiverem idênticos aos configurados no GetYourGuide. Por padrão fica desligado.
                        </span>
                      </label>

                      {gygConfigMessage && (
                        <div style={{ fontSize:'11px', color:gygConfigMessage.includes('salva')?'#006600':'#a40000', marginTop:'10px' }}>
                          {gygConfigMessage}
                        </div>
                      )}

                      <button type="button" className="pmy-btn-submit" onClick={handleSaveGygTourConfig} disabled={gygConfigSaving}
                        style={{ marginTop:'12px', opacity:gygConfigSaving?0.6:1 }}>
                        {gygConfigSaving ? 'Salvando...' : '💾 Salvar configuração GYG'}
                      </button>
                    </>
                  )}
                </div>

                <div style={{ display:'flex', gap:'10px' }}>
                  <button type="button" onClick={() => window.open('https://integrator.getyourguide.com/', '_blank')}
                    style={{ flex:1, background:'#ffdd00', border:'1px solid #e4c400', color:'#222', borderRadius:'8px', padding:'11px', fontWeight:'800', cursor:'pointer' }}>
                    Abrir Integrator Portal ↗
                  </button>
                  <button type="button" className="pmy-btn-submit" onClick={() => setConnectingPlatform(null)} style={{ flex:1 }}>
                    Fechar
                  </button>
                </div>
              </div>
            )}

            {/* ── TRIPADVISOR: conteúdo/reputação, não canal de reservas ── */}
            {isTripadvisor && (
              <div>
                <div style={{ background:'#f5f7ff', border:'1px solid #d9def8', borderRadius:'12px', padding:'18px', marginBottom:'16px' }}>
                  <div style={{ fontSize:'15px', fontWeight:'900', color:'#3949ab', marginBottom:'10px' }}>
                    🦉 Tripadvisor = Conteúdo & Reputação
                  </div>
                  <div style={{ fontSize:'12px', color:'#555', lineHeight:'1.75' }}>
                    <div>⭐ Reviews e ratings: <strong>Tripadvisor Terra API</strong></div>
                    <div>📷 Fotos e dados da localização: <strong>Tripadvisor Terra API</strong></div>
                    <div>🎟️ Reservas de tours/atividades: <strong>geridas pela integração Viator</strong></div>
                    <div>🚫 Agenda, vagas, bloqueios e overbooking: <strong>Tripadvisor não entra como canal separado</strong></div>
                  </div>
                </div>

                <div style={{ background:'#fffbeb', border:'1px solid #fcd34d', borderRadius:'10px', padding:'14px 16px', marginBottom:'16px', fontSize:'12px', color:'#92400e', lineHeight:'1.6' }}>
                  <strong>Sem duplicar reservas.</strong> Quando uma experiência da PMY aparece no Tripadvisor, o inventário e as reservas são distribuídos pela Viator. A Central deve contabilizar essa venda como Viator, não como um segundo canal Tripadvisor.
                </div>

                <div style={{ background:'#fafafa', border:'1px solid #eee', borderRadius:'10px', padding:'16px', marginBottom:'16px' }}>
                  <div style={{ fontSize:'12px', fontWeight:'800', color:'#555', marginBottom:'10px' }}>O que poderemos integrar separadamente</div>
                  <ul style={{ margin:0, paddingLeft:'18px', fontSize:'12px', color:'#555', lineHeight:'1.7' }}>
                    <li>reviews recentes da empresa/localização</li>
                    <li>nota média e quantidade de avaliações</li>
                    <li>fotos e dados públicos da localização</li>
                    <li>widgets/links de reputação no site e na Central, quando permitido pelo plano Terra</li>
                  </ul>
                </div>

                <div style={{ display:'flex', gap:'10px' }}>
                  <button type="button" onClick={() => window.open('https://docs.terra.tripadvisor.com/docs/overview', '_blank')}
                    style={{ flex:1, background:'#34e0a1', border:'1px solid #22bd84', color:'#111', borderRadius:'8px', padding:'11px', fontWeight:'800', cursor:'pointer' }}>
                    Abrir documentação Terra ↗
                  </button>
                  <button type="button" className="pmy-btn-submit" onClick={() => setConnectingPlatform(null)} style={{ flex:1 }}>
                    Fechar
                  </button>
                </div>
              </div>
            )}

            {/* ── OUTRAS PLATAFORMAS: já conectadas ── */}
            {!isShopify && !isGyg && !isTripadvisor && conn.connected && (
              <div>
                <div style={{ background:'#f0fdf4', border:'1px solid #b8e6b8', borderRadius:'12px', padding:'18px', marginBottom:'18px' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:'10px', marginBottom:'10px' }}>
                    <span style={{ fontSize:'22px' }}>✅</span>
                    <strong style={{ fontSize:'15px', color:'var(--primary-green)' }}>Integração Ativa</strong>
                  </div>
                  <div style={{ fontSize:'13px', color:'#444', lineHeight:'1.8' }}>
                    <div>🏢 Conta: <strong>{conn.accountName}</strong></div>
                    <div>🔄 Último sync: <strong>{conn.lastSync}</strong></div>
                    <div>📋 Campos mapeados: <strong>11 / 11</strong></div>
                  </div>
                </div>
                <div style={{ display:'flex', gap:'10px' }}>
                  <button className="pmy-btn-submit" onClick={() => setConnectingPlatform(null)} style={{ flex:1 }}>Fechar</button>
                  <button onClick={() => { handleDisconnect(connectingPlatform); setConnectingPlatform(null); }}
                    style={{ flex:1, background:'#fff0f0', border:'1px solid #fcc', color:'#cc0000', borderRadius:'8px', padding:'12px', fontWeight:'700', fontSize:'13px', cursor:'pointer' }}>
                    Desconectar
                  </button>
                </div>
              </div>
            )}

            {/* ── OUTRAS PLATAFORMAS: não conectadas — passo a passo ── */}
            {!isShopify && !isGyg && !isTripadvisor && !conn.connected && guide && (
              <div>
                {/* Passo a passo */}
                <div style={{ background:'#f8f8f8', border:'1px solid #eee', borderRadius:'10px', padding:'16px', marginBottom:'18px' }}>
                  <div style={{ fontSize:'12px', fontWeight:'800', color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:'12px' }}>
                    📋 Como obter sua chave de API
                  </div>
                  <ol style={{ paddingLeft:'18px', margin:0, display:'flex', flexDirection:'column', gap:'8px' }}>
                    {guide.steps.map((step, i) => (
                      <li key={i} style={{ fontSize:'13px', color:'#444', lineHeight:'1.5' }}>
                        {step}
                        {i === 0 && (
                          <button onClick={() => window.open(platform.oauthUrl, '_blank', 'width=960,height=700')}
                            style={{ marginLeft:'8px', background:'none', border:'none', color:'var(--primary-green)', fontWeight:'700', fontSize:'12px', cursor:'pointer', textDecoration:'underline' }}>
                            Abrir ↗
                          </button>
                        )}
                      </li>
                    ))}
                  </ol>
                </div>

                {/* Campos de credencial */}
                <div style={{ background:'#fafafa', border:'1px solid #eee', borderRadius:'10px', padding:'16px', marginBottom:'16px' }}>
                  <div style={{ fontSize:'12px', fontWeight:'800', color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:'12px' }}>
                    🔑 Cole suas credenciais aqui
                  </div>
                  <div className="pmy-form-group" style={{ marginBottom:'12px' }}>
                    <label style={{ fontSize:'12px', fontWeight:'700', color:'#555', marginBottom:'5px', display:'block' }}>
                      {guide.field1Label} <span style={{ color:'#cc0000' }}>*</span>
                    </label>
                    <input type="password" className="pmy-form-input"
                      placeholder={guide.field1Placeholder}
                      value={apiKeyInput} onChange={e => setApiKeyInput(e.target.value)} />
                  </div>
                  {guide.field2Label && (
                    <div className="pmy-form-group" style={{ marginBottom:'4px' }}>
                      <label style={{ fontSize:'12px', fontWeight:'700', color:'#555', marginBottom:'5px', display:'block' }}>
                        {guide.field2Label} <span style={{ color:'#cc0000' }}>*</span>
                      </label>
                      <input type="text" className="pmy-form-input"
                        placeholder={guide.field2Placeholder || ""}
                        value={apiSecretInput} onChange={e => setApiSecretInput(e.target.value)} />
                    </div>
                  )}
                </div>

                <button className="pmy-btn-submit"
                  onClick={() => handleConfirmConnect(connectingPlatform)}
                  disabled={!apiKeyInput.trim() || (guide.field2Label && !apiSecretInput.trim())}
                  style={{ opacity: (!apiKeyInput.trim() || (guide.field2Label && !apiSecretInput.trim())) ? 0.5 : 1 }}>
                  ✓ Ativar Integração com {platform.name}
                </button>

                <div style={{ marginTop:'14px', textAlign:'center' }}>
                  <a href={platform.docsUrl} target="_blank" rel="noreferrer"
                    style={{ fontSize:'12px', color:'#888', textDecoration:'none' }}>
                    📖 Documentação oficial da API {platform.name} ↗
                  </a>
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
      title = `📅 Grade do Dia ${selectedCalendarDay} de ${currentMonthLabel} de ${currentYear}`;
      const dayBlocks = getCalendarDayBlocks(selectedCalendarDay);
      const dayBookings = getCalendarDayBookings(selectedCalendarDay);
      const dayStats = getCalendarDayStats(selectedCalendarDay);
      const isGloballyBlocked = dayBlocks.some(block => !block.tourId);
      content = (
        <div>
          <h4 style={{ fontSize:'15px', color:'#555', marginBottom:'12px' }}>Reservas confirmadas e pré-reservas ativas:</h4>
          <div style={{ background:'#f9f9f9', padding:'15px', borderRadius:'8px', border:'1px solid #eee', marginBottom:'20px' }}>
            {dayBookings.length > 0 ? (
              <>
                <div style={{
                  display:'grid',
                  gridTemplateColumns:'repeat(3,1fr)',
                  gap:'8px',
                  marginBottom:'12px'
                }}>
                  <div style={{ background:'#fff', border:'1px solid #eee', borderRadius:'8px', padding:'9px', textAlign:'center' }}>
                    <div style={{ fontSize:'17px', fontWeight:'900', color:'var(--primary-green)' }}>{dayStats.bookingCount}</div>
                    <div style={{ fontSize:'10px', color:'#888' }}>reservas</div>
                  </div>
                  <div style={{ background:'#fff', border:'1px solid #eee', borderRadius:'8px', padding:'9px', textAlign:'center' }}>
                    <div style={{ fontSize:'17px', fontWeight:'900', color:'var(--primary-green)' }}>{dayStats.passengers}</div>
                    <div style={{ fontSize:'10px', color:'#888' }}>passageiros</div>
                  </div>
                  <div style={{ background:'#fff', border:'1px solid #eee', borderRadius:'8px', padding:'9px', textAlign:'center' }}>
                    <div style={{ fontSize:'17px', fontWeight:'900', color:'var(--primary-green)' }}>{dayStats.remaining}/{dayStats.capacity}</div>
                    <div style={{ fontSize:'10px', color:'#888' }}>vagas restantes</div>
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
                    <div key={booking.id} style={{
                      display:'grid',
                      gridTemplateColumns:'1fr auto',
                      gap:'12px',
                      alignItems:'center',
                      padding:'11px 0',
                      borderBottom:i===dayBookings.length-1?'none':'1px solid #eee'
                    }}>
                      <div>
                        <div style={{ fontWeight:'800', fontSize:'14px', color:'#333' }}>
                          {tour?.title || 'Tour'}
                        </div>
                        <div style={{ fontSize:'11px', color:'#777', marginTop:'4px', lineHeight:'1.6' }}>
                          🕒 {parts?.timeKey || '—'} · 👥 {pax} pax · 🛒 {platformLabel}
                          {booking.bookingRef ? ` · ${booking.bookingRef}` : ''}
                        </div>
                        <div style={{ fontSize:'11px', color:'#777' }}>
                          {booking.adults > 0 ? `Adult ${booking.adults}  ` : ''}
                          {booking.children > 0 ? `Child ${booking.children}  ` : ''}
                          {booking.youths > 0 ? `Youth ${booking.youths}  ` : ''}
                          {booking.seniors > 0 ? `Senior ${booking.seniors}` : ''}
                        </div>
                      </div>
                      <span style={{
                        fontSize:'10px',
                        fontWeight:'800',
                        padding:'5px 8px',
                        borderRadius:'12px',
                        background:booking.status==='CONFIRMED'?'#eaf8ea':'#fff4d6',
                        color:booking.status==='CONFIRMED'?'#087a08':'#9a6700'
                      }}>
                        {booking.status==='CONFIRMED'?'CONFIRMADA':'PENDENTE'}
                      </span>
                    </div>
                  );
                })}
              </>
            ) : (
              <p style={{ color:'#999', fontSize:'14px', textAlign:'center', padding:'10px 0' }}>
                Nenhuma reserva para este dia.
              </p>
            )}
          </div>
          <hr style={{ border:'none', borderTop:'1px solid #eee', margin:'20px 0' }} />
          {dayBlocks.length > 0 && (
            <div style={{ padding:'12px 14px', background:'#fff8e8', border:'1px solid #e7c565', color:'#6d5510', borderRadius:'8px', fontSize:'12px', lineHeight:'1.5', marginBottom:'14px' }}>
              🔒 {dayBlocks.length} regra{dayBlocks.length===1?'':'s'} de disponibilidade ativa{dayBlocks.length===1?'':'s'} neste dia.
              {isGloballyBlocked ? ' O dia inteiro está bloqueado.' : ' Os bloqueios são aplicados apenas aos tours/horários configurados.'}
            </div>
          )}
          {isGloballyBlocked ? (
            <div style={{ padding:'15px', background:'#ffe6e6', border:'1px solid #cc0000', color:'#cc0000', borderRadius:'8px', fontWeight:'bold', fontSize:'13px', lineHeight:'1.4' }}>
              🔒 Alocação Suspensa: este dia possui um bloqueio global na Agenda Central.
            </div>
          ) : (
            <div>
              {!isFormAllocating ? (
                <button type="button" className="pmy-btn-submit" onClick={() => setIsFormAllocating(true)}>+ Adicionar Novo Tour a este Dia</button>
              ) : (
                <div style={{ display:'flex', flexDirection:'column', gap:'15px', background:'#f5fcf5', padding:'20px', borderRadius:'10px', border:'1px solid #e0f0e0' }}>
                  <h4 style={{ color:'var(--primary-green)', fontWeight:'bold', fontSize:'15px' }}>➕ Escalar Passeio na Folha Diária</h4>
                  <div className="pmy-form-box-item" style={{ display:'flex', flexDirection:'column', gap:'5px' }}>
                    <label style={{ fontSize:'13px', fontWeight:'700' }}>Selecione o Tour</label>
                    <select className="pmy-form-input" value={modalSelectedTour} onChange={e => handleModalTourChange(e.target.value)} required>
                      <option value="">-- Selecione o Tour --</option>
                      {tourOptions.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
                    </select>
                  </div>
                  {modalSelectedTour && (
                    <div className="pmy-form-box-item" style={{ display:'flex', flexDirection:'column', gap:'5px' }}>
                      <label style={{ fontSize:'13px', fontWeight:'700' }}>Selecione o Horário:</label>
                      <select className="pmy-form-input">
                        {modalAvailableHours.map(h => <option key={h} value={h}>{h}</option>)}
                      </select>
                    </div>
                  )}
                  <div className="pmy-form-box-item" style={{ display:'flex', flexDirection:'column', gap:'5px' }}>
                    <label style={{ fontSize:'13px', fontWeight:'700' }}>Selecione o Guia:</label>
                    <select className="pmy-form-input">
                      {guidesList.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                    </select>
                  </div>
                  <button type="button" className="pmy-btn-submit" onClick={() => { setActiveModal(null); setIsFormAllocating(false); }}>Confirmar e Publicar Escala</button>
                </div>
              )}
            </div>
          )}
        </div>
      );
    } else if (activeModal === 'pickPhotoForGuide') {
      title = "🖼️ Escolher Foto";
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
      title = `Detalhes do Guia`;
      content = (
        <div>
          <div style={{ display:'flex', gap:'20px', alignItems:'center', marginBottom:'20px', borderBottom:'1px solid #eee', paddingBottom:'20px' }}>
            <img src={selectedGuideInfo.photo} alt={selectedGuideInfo.name} style={{ width:'80px', height:'80px', borderRadius:'16px', objectFit:'cover' }} />
            <div>
              <h2 style={{ fontSize:'22px', fontWeight:'bold', color:'var(--text-dark)', margin:'0 0 5px 0' }}>{selectedGuideInfo.name}</h2>
              <div style={{ fontSize:'13px', color:'#666' }}>✉️ {selectedGuideInfo.email||'N/A'}</div>
              <div style={{ fontSize:'13px', color:'#666', marginTop:'4px' }}>📱 {selectedGuideInfo.whatsapp||'N/A'}</div>
            </div>
          </div>
          <h4 style={{ fontSize:'15px', color:'var(--primary-green)', fontWeight:'bold', marginBottom:'10px' }}>Próximos 7 Tours Atribuídos:</h4>
          <div style={{ background:'#f9f9f9', padding:'15px', borderRadius:'8px', border:'1px solid #eee', marginBottom:'20px' }}>
            <div className="pmy-list-item" style={{ padding:'8px 0' }}><span>🏰 Sintra e Cascais Completo</span><strong>Amanhã, 09:00</strong></div>
            <div className="pmy-list-item" style={{ padding:'8px 0' }}><span>🏰 Fátima, Batalha e Nazaré</span><strong>28/Maio, 08:30</strong></div>
            <div className="pmy-list-item" style={{ padding:'8px 0', borderBottom:'none' }}><span>🚶‍♂️ Lisboa Walking Tour (Baixa)</span><strong>30/Maio, 14:00</strong></div>
          </div>
          <h4 style={{ fontSize:'15px', color:'#555', fontWeight:'bold', marginBottom:'10px' }}>Horários Disponíveis Padrão:</h4>
          <div style={{ display:'flex', gap:'10px', marginBottom:'16px' }}>
            <span className="pmy-tag" style={{ background:'#e6f2e6', color:'var(--primary-green)', fontSize:'12px' }}>Segunda a Sábado</span>
            <span className="pmy-tag" style={{ background:'#e6f2e6', color:'var(--primary-green)', fontSize:'12px' }}>08:00 - 18:00</span>
          </div>

          {selectedGuideInfo?.utmId && (
            <div style={{ background:'#f0fdf4', border:'1px solid #b8e6b8', borderRadius:'10px', padding:'14px' }}>
              <h4 style={{ fontSize:'14px', fontWeight:'800', color:'var(--primary-green)', marginBottom:'10px' }}>🔗 Link de Indicação UTM</h4>
              <div style={{ display:'flex', gap:'6px', alignItems:'center', marginBottom:'8px' }}>
                <code style={{ fontSize:'11px', background:'#fff', border:'1px solid #ddd', borderRadius:'5px', padding:'4px 8px', flex:1, wordBreak:'break-all', color:'#555' }}>
                  {selectedGuideInfo.referralLink}
                </code>
                <button onClick={() => navigator.clipboard.writeText(selectedGuideInfo.referralLink).then(()=>alert('Copiado!')).catch(()=>{})}
                  style={{ padding:'6px 10px', background:'var(--primary-green)', color:'#fff', border:'none', borderRadius:'6px', fontSize:'11px', cursor:'pointer', fontWeight:'700', flexShrink:0 }}>
                  📋
                </button>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr 1fr', gap:'8px', fontSize:'11px' }}>
                {[
                  { label: 'utm_campaign', value: selectedGuideInfo.utmId },
                  { label: 'utm_source',   value: 'guia' },
                  { label: 'utm_medium',   value: 'indicacao' },
                  { label: 'utm_content',  value: selectedGuideInfo.name?.toLowerCase().replace(/\s+/g,"_").replace(/[^a-z0-9_]/g,"") },
                ].map((p,i) => (
                  <div key={i} style={{ background:'#fff', border:'1px solid #eee', borderRadius:'6px', padding:'6px 8px' }}>
                    <div style={{ color:'#aaa', marginBottom:'2px' }}>{p.label}</div>
                    <code style={{ color:'var(--primary-green)', fontWeight:'700', fontSize:'11px' }}>{p.value}</code>
                  </div>
                ))}
              </div>
              <div style={{ marginTop:'10px', fontSize:'12px', color:'#888' }}>
                💡 Acesse <strong>Shopify → Marketing → Campanhas</strong> para ver as métricas desta campanha.
              </div>
            </div>
          )}
        </div>
      );
    } else if (activeModal === 'sales') {
      title = lang === 'pt' ? "Vendas por Canal" : "Sales by Channel";
      content = (
        <div>
          <div style={{ background:'#f8faf8', border:'1px solid #e3ebe4', borderRadius:'10px', padding:'14px 16px', marginBottom:'16px' }}>
            <div style={{ fontSize:'22px', fontWeight:'900', color:'var(--primary-green)' }}>{totalSalesCount}</div>
            <div style={{ fontSize:'12px', color:'#666' }}>{lang==='pt'?'reservas confirmadas no período':'confirmed bookings in period'} · {getPeriodLabel()}</div>
          </div>
          {salesByChannel.length === 0 ? (
            <p style={{ textAlign:'center', color:'#999' }}>{lang==='pt'?'Nenhuma venda confirmada no período.':'No confirmed sales in this period.'}</p>
          ) : salesByChannel.map(channel => (
            <div className="pmy-list-item" key={channel.platform}>
              <div>
                <strong>{channel.label}</strong>
                <div style={{ fontSize:'11px', color:'#888', marginTop:'3px' }}>
                  {channel.bookings} {lang==='pt'?'reservas':'bookings'} · {channel.passengers} pax
                  {channel.missingValue > 0 ? ` · ⚠️ ${channel.missingValue} ${lang==='pt'?'sem valor':'without value'}` : ''}
                </div>
              </div>
              <div style={{ textAlign:'right' }}>
                {Object.entries(channel.revenueByCurrency).length > 0
                  ? Object.entries(channel.revenueByCurrency).map(([currency, amount]) => (
                      <div key={currency} style={{ fontWeight:'800', color:'var(--primary-green)', fontSize:'13px' }}>{formatMoney(amount, currency)}</div>
                    ))
                  : <span style={{ color:'#aaa' }}>—</span>}
              </div>
            </div>
          ))}
        </div>
      );
    } else if (activeModal === 'canceled') {
      title = lang === 'pt' ? "Cancelamentos" : "Cancellations";
      content = (
        <div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px', marginBottom:'16px' }}>
            <div style={{ background:'#fef2f2', border:'1px solid #fecaca', borderRadius:'10px', padding:'12px', textAlign:'center' }}>
              <div style={{ fontSize:'22px', fontWeight:'900', color:'#b91c1c' }}>{canceledCount}</div>
              <div style={{ fontSize:'11px', color:'#777' }}>{lang==='pt'?'cancelamentos no período':'cancellations in period'}</div>
            </div>
            <div style={{ background:'#fff7ed', border:'1px solid #fed7aa', borderRadius:'10px', padding:'12px', textAlign:'center' }}>
              <div style={{ fontSize:'22px', fontWeight:'900', color:'#c2410c' }}>{cancellationRate.toFixed(1)}%</div>
              <div style={{ fontSize:'11px', color:'#777' }}>{lang==='pt'?'taxa de cancelamento':'cancellation rate'}</div>
            </div>
          </div>
          {realCanceledBookings.length === 0
            ? <p style={{ textAlign:'center', color:'#999' }}>{lang==='pt'?'Nenhum cancelamento registrado no período.':'No cancellations in this period.'}</p>
            : realCanceledBookings.map(b => (
                <div className="pmy-list-item" key={b.id}>
                  <div>
                    <strong>{b.customerName||"N/A"}</strong>
                    <div style={{ fontSize:'11px', color:'#888', marginTop:'3px' }}>
                      {platformLabel(b.platform)} · {new Date(b.externalUpdatedAt || b.updatedAt || b.createdAt).toLocaleDateString(lang==='pt'?'pt-PT':'en-GB')}
                      {b.cancelReason ? ` · ${b.cancelReason}` : ''}
                    </div>
                  </div>
                  <span style={{ color:'#b91c1c', fontWeight:'800', fontSize:'12px' }}>
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
          <div style={{ background:'#f0fdf4', border:'1px solid #b8e6b8', borderRadius:'10px', padding:'16px', marginBottom:'16px' }}>
            <div style={{ fontSize:'24px', fontWeight:'900', color:'var(--primary-green)' }}>
              {confirmedRevenueValue > 0 ? formatMoney(confirmedRevenueValue) : '—'}
            </div>
            <div style={{ fontSize:'12px', color:'#555', marginTop:'4px' }}>
              {pricedConfirmedBookings.length} {lang==='pt'?'reservas com valor real':'bookings with real value'}
              {missingFinancialBookings.length > 0 ? ` · ${missingFinancialBookings.length} ${lang==='pt'?'sem valor financeiro':'without financial value'}` : ''}
            </div>
            {revenueCurrencies.length > 1 && (
              <div style={{ fontSize:'11px', color:'#b45309', marginTop:'6px' }}>
                ⚠️ {lang==='pt'?'Existem múltiplas moedas. O cartão principal mostra':'Multiple currencies detected. Main card shows'} {dashboardCurrency}.
              </div>
            )}
          </div>
          {realConfirmedBookings.length === 0
            ? <div style={{ textAlign:'center', padding:'30px', color:'#aaa' }}>
                <div style={{ fontSize:'32px', marginBottom:'10px' }}>📋</div>
                <div style={{ fontWeight:'700' }}>{lang==='pt'?'Nenhuma reserva confirmada no período':'No confirmed bookings in this period'}</div>
              </div>
            : realConfirmedBookings.map(b => {
                const tour = (tours || []).find(item => item.id === b.tourId);
                return (
                  <div className="pmy-list-item" key={b.id}>
                    <div>
                      <strong>{tour?.title || b.customerName || "Reserva"}</strong>
                      <div style={{ fontSize:'11px', color:'#888', marginTop:'3px' }}>
                        {platformLabel(b.platform)} · {new Date(b.startTime).toLocaleDateString(lang==='pt'?'pt-PT':'en-GB')} · {Number(b.totalParticipants || 0)} pax
                      </div>
                    </div>
                    <span style={{ color:moneyValue(b)!==null&&bookingCurrency(b)?'var(--primary-green)':'#b45309', fontWeight:'800' }}>
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
          <div style={{ background:'#fffaf0', border:'1px solid #f3d7a2', borderRadius:'10px', padding:'16px', marginBottom:'16px' }}>
            <div style={{ fontSize:'24px', fontWeight:'900', color:'#b7791f' }}>
              {averageTicketValue > 0 ? formatMoney(averageTicketValue) : '—'}
            </div>
            <div style={{ fontSize:'12px', color:'#555', marginTop:'4px' }}>
              {lang==='pt'?'Faturamento real dividido pelas reservas com valor na mesma moeda.':'Real revenue divided by bookings priced in the same currency.'}
            </div>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px' }}>
            <div style={{ background:'#f8faf8', border:'1px solid #e5e7eb', borderRadius:'9px', padding:'12px' }}>
              <div style={{ fontSize:'20px', fontWeight:'900' }}>{pricedConfirmedBookings.length}</div>
              <div style={{ fontSize:'11px', color:'#777' }}>{lang==='pt'?'reservas usadas no cálculo':'bookings used in calculation'}</div>
            </div>
            <div style={{ background:missingFinancialBookings.length?'#fff7ed':'#f0fdf4', border:'1px solid #e5e7eb', borderRadius:'9px', padding:'12px' }}>
              <div style={{ fontSize:'20px', fontWeight:'900', color:missingFinancialBookings.length?'#c2410c':'#166534' }}>{missingFinancialBookings.length}</div>
              <div style={{ fontSize:'11px', color:'#777' }}>{lang==='pt'?'reservas sem valor':'bookings without value'}</div>
            </div>
          </div>
          {revenueCurrencies.length > 1 && (
            <div style={{ marginTop:'12px', fontSize:'11px', color:'#b45309', background:'#fff7ed', border:'1px solid #fed7aa', borderRadius:'8px', padding:'9px 11px' }}>
              ⚠️ {lang==='pt'?'O ticket médio não mistura moedas. O valor principal usa':'Average ticket never mixes currencies. Main value uses'} {dashboardCurrency}.
            </div>
          )}
        </div>
      );
    } else if (activeModal === 'upcoming') {
      title = lang === 'pt' ? "Próximas Saídas — 30 dias" : "Upcoming Departures — 30 days";
      content = (
        <div>
          <div style={{ background:'#f0fdf4', border:'1px solid #b8e6b8', borderRadius:'10px', padding:'14px 16px', marginBottom:'16px' }}>
            <div style={{ fontSize:'24px', fontWeight:'900', color:'var(--primary-green)' }}>{upcomingCount}</div>
            <div style={{ fontSize:'12px', color:'#555' }}>{lang==='pt'?'saídas únicas com reservas confirmadas ou pendentes':'unique departures with confirmed or pending bookings'}</div>
          </div>
          {upcomingDepartures.length === 0 ? (
            <p style={{ textAlign:'center', color:'#999' }}>{lang==='pt'?'Nenhuma saída nos próximos 30 dias.':'No departures in the next 30 days.'}</p>
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
                  <div style={{ fontSize:'11px', color:'#888', marginTop:'3px' }}>
                    {when} · {departure.bookings} {lang==='pt'?'reservas':'bookings'} · {departure.passengers} pax
                  </div>
                  <div style={{ fontSize:'10px', color:'#999', marginTop:'2px' }}>{[...departure.platforms].join(' · ')}</div>
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
        <div style={{ background:"#fff", width:"480px", maxWidth:"95vw", borderRadius:"20px", boxShadow:"0 24px 60px rgba(0,0,0,0.18)", overflow:"hidden" }} onClick={e => e.stopPropagation()}>
          <div style={{ background:"var(--primary-green)", padding:"22px 26px 20px", position:"relative" }}>
            <div style={{ display:"flex", alignItems:"center", gap:"15px" }}>
              <div style={{ position:"relative" }}>
                <img src={editGuidePhoto || guide.photo} alt={guide.name}
                  style={{ width:"62px", height:"62px", borderRadius:"14px", objectFit:"cover", border:"2.5px solid rgba(255,255,255,0.35)", display:"block" }} />
                <button type="button" onClick={() => openShopifyFilePicker((url) => setEditGuidePhoto(url))}
                  title="Escolher do banco da Shopify"
                  style={{ position:"absolute", bottom:"-7px", right:"-7px", width:"22px", height:"22px", borderRadius:"50%", background:"#fff", border:"none", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"11px", boxShadow:"0 2px 6px rgba(0,0,0,0.2)" }}>📷</button>
                <input type="file" accept="image/*" style={{ display:"none" }} ref={editGuidePhotoRef} onChange={handleEditGuidePhotoChange} />
              </div>
              <div>
                <div style={{ color:"rgba(255,255,255,0.65)", fontSize:"11px", fontWeight:"700", marginBottom:"3px", textTransform:"uppercase", letterSpacing:"0.5px" }}>Editando guia</div>
                <div style={{ color:"#fff", fontSize:"19px", fontWeight:"900" }}>{guide.name}</div>
              </div>
            </div>
            <button onClick={() => setEditingGuide(null)}
              style={{ position:"absolute", top:"14px", right:"18px", background:"rgba(255,255,255,0.18)", border:"none", borderRadius:"50%", width:"30px", height:"30px", cursor:"pointer", color:"#fff", fontSize:"18px", display:"flex", alignItems:"center", justifyContent:"center" }}>&times;</button>
          </div>
          <form onSubmit={handleSaveEditGuide} style={{ padding:"26px" }}>
            <div style={{ display:"flex", flexDirection:"column", gap:"15px" }}>
              <div className="pmy-form-group" style={{ marginBottom:0 }}>
                <label>Nome e Sobrenome</label>
                <input type="text" className="pmy-form-input" value={editGuideName} onChange={e => setEditGuideName(e.target.value)} required />
              </div>
              <div className="pmy-form-group" style={{ marginBottom:0 }}>
                <label>E-mail</label>
                <input type="email" className="pmy-form-input" value={editGuideEmail} onChange={e => setEditGuideEmail(e.target.value)} />
              </div>
              <div className="pmy-form-group" style={{ marginBottom:0 }}>
                <label>WhatsApp</label>
                <div style={{ display:"flex", gap:"10px", alignItems:"center" }}>
                  <div style={{ position:"relative", display:"flex", alignItems:"center", flexShrink:0 }}>
                    <img src={getFlagUrl(currentDdi.iso)} alt="" style={{ position:"absolute", left:"10px", width:"20px", height:"14px", objectFit:"cover", borderRadius:"2px", zIndex:1, pointerEvents:"none", boxShadow:"0 1px 3px rgba(0,0,0,0.2)" }} />
                    <select className="pmy-form-input" style={{ width:"120px", paddingLeft:"38px" }} value={editGuideDdi} onChange={e => setEditGuideDdi(e.target.value)}>
                      {ddiList.map((d,i) => <option key={i} value={d.code}>{d.code}</option>)}
                    </select>
                  </div>
                  <input type="tel" className="pmy-form-input" placeholder="912 345 678" value={editGuideWhatsapp} onChange={e => setEditGuideWhatsapp(e.target.value)} required />
                </div>
              </div>

              <div className="pmy-form-group" style={{ marginBottom:0 }}>
                <label>ID da Campanha UTM</label>
                <input type="text" className="pmy-form-input" placeholder="Ex: 21d91c"
                  value={editGuideUtmId} onChange={e => setEditGuideUtmId(e.target.value)}
                  style={{ fontFamily:'monospace' }} />
                {editGuideUtmId && editGuideName && (
                  <div style={{ marginTop:'6px', display:'flex', alignItems:'center', gap:'8px' }}>
                    <div style={{ fontSize:'11px', color:'#555', background:'#f0fdf4', border:'1px solid #b8e6b8', borderRadius:'6px', padding:'5px 8px', flex:1, wordBreak:'break-all' }}>
                      🔗 {`https://portugalmeandyou.com/?utm_campaign=${editGuideUtmId}&utm_source=guia&utm_medium=indicacao&utm_content=${editGuideName.toLowerCase().replace(/\s+/g,"_").replace(/[^a-z0-9_]/g,"")}`}
                    </div>
                    <button type="button" onClick={() => {
                      const url = `https://portugalmeandyou.com/?utm_campaign=${editGuideUtmId}&utm_source=guia&utm_medium=indicacao&utm_content=${editGuideName.toLowerCase().replace(/\s+/g,"_").replace(/[^a-z0-9_]/g,"")}`;
                      navigator.clipboard.writeText(url).then(() => alert('Link copiado!')).catch(()=>{});
                    }} style={{ padding:'5px 10px', background:'var(--primary-green)', color:'#fff', border:'none', borderRadius:'6px', fontSize:'11px', cursor:'pointer', fontWeight:'700', flexShrink:0 }}>
                      📋 Copiar
                    </button>
                  </div>
                )}
              </div>
            </div>
            <div style={{ display:"flex", gap:"10px", marginTop:"22px", paddingTop:"18px", borderTop:"1px solid #f0f0f0" }}>
              <button type="submit" className="pmy-btn-submit" style={{ flex:1 }}>💾 Salvar Alterações</button>
              <button type="button" onClick={() => { handleDeleteGuide(editingGuide); }}
                style={{ padding:"12px 16px", background:"#fff0f0", border:"1px solid #fcc", color:"#cc0000", borderRadius:"8px", fontWeight:"700", fontSize:"13px", cursor:"pointer" }}>🗑️</button>
              <button type="button" onClick={() => setEditingGuide(null)}
                style={{ padding:"12px 16px", background:"#f5f5f5", border:"none", color:"#555", borderRadius:"8px", fontWeight:"700", fontSize:"13px", cursor:"pointer" }}>Cancelar</button>
            </div>
          </form>
        </div>
      </div>
    );
  };

    const styles = `
    :root { --bg-color:${theme.bgColor}; --primary-green:${theme.primaryColor}; --primary-hover:${theme.primaryColor}dd; --text-dark:${theme.textColor}; --text-muted:#666666; --card-bg:#ffffff; --border-radius:12px; --font-family:${theme.fontFamily},'sans-serif'; --font-size:${theme.fontSize}; --title-color:${theme.titleColor}; --sidebar-bg:${theme.sidebarBg}; }
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
      --pmy-pill: 999px;
    }

    html, body { width:100%; min-height:100%; overflow-x:hidden; background:var(--bg-color); }
    body { margin:0; }
    ::-webkit-scrollbar { width:8px; height:8px; }
    ::-webkit-scrollbar-thumb { background:rgba(24,55,34,0.18); border-radius:var(--pmy-pill); }

    .pmy-app-container {
      width:100%;
      min-height:100dvh;
      height:auto;
      margin:0;
      overflow:visible;
      display:flex;
      background:
        radial-gradient(circle at 78% 6%, color-mix(in srgb, var(--primary-green) 8%, transparent) 0, transparent 26rem),
        linear-gradient(180deg, var(--pmy-pink-soft) 0%, var(--bg-color) 42%, var(--bg-color) 100%);
      color:var(--text-dark);
    }

    .pmy-sidebar {
      width:270px;
      min-height:100dvh;
      height:100dvh;
      position:sticky;
      top:0;
      z-index:300;
      border-right:1px solid var(--pmy-border);
      box-shadow:none;
      transition:width .28s ease, transform .28s ease;
      overflow:hidden;
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
      right:-14px;
      top:82px;
      width:30px;
      height:30px;
      border-radius:50%;
      border:1px solid var(--pmy-border);
      background:#fff;
      color:var(--primary-green);
      display:flex;
      align-items:center;
      justify-content:center;
      cursor:pointer;
      box-shadow:0 8px 18px rgba(24,55,34,.10);
      z-index:5;
    }

    .pmy-menu { padding:10px 12px 18px; gap:7px; overflow-y:auto; }
    .pmy-menu-item {
      appearance:none;
      border:1px solid transparent;
      width:100%;
      margin:0;
      padding:12px 14px;
      border-radius:var(--pmy-pill);
      background:transparent;
      color:var(--text-dark);
      font-weight:700;
      display:flex;
      align-items:center;
      gap:12px;
      text-align:left;
      cursor:pointer;
      transition:transform .18s ease, background .18s ease, color .18s ease, border-color .18s ease;
    }
    .pmy-menu-item:hover {
      background:var(--pmy-green-soft);
      color:var(--primary-green);
      transform:translateX(2px);
    }
    .pmy-menu-item.active {
      background:var(--primary-green);
      color:#fff;
      box-shadow:0 10px 24px color-mix(in srgb, var(--primary-green) 22%, transparent);
    }
    .pmy-menu-icon { width:20px; height:20px; display:grid; place-items:center; flex:0 0 20px; }
    .pmy-menu-label { min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
    .pmy-sidebar-footer { padding:16px 12px 18px; gap:12px; border-top:1px solid var(--pmy-border); }
    .pmy-sidebar-footer .pmy-menu-item { width:100%; }
    .pmy-lang-pill { border-color:var(--pmy-border); background:rgba(255,255,255,.62); }
    .pmy-credit-text { font-size:11px; opacity:.82; }

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
      height:auto;
      min-height:100dvh;
      overflow:visible;
      padding:0;
    }
    .pmy-content-inner {
      width:min(100%, 1560px);
      margin:0 auto;
      padding:34px clamp(24px, 3.2vw, 54px) 64px;
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
      background:color-mix(in srgb, var(--bg-color) 86%, transparent);
      backdrop-filter:blur(18px);
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
    .pmy-card { border-radius:22px; padding:22px; }
    .pmy-card.has-hover:hover { transform:translateY(-2px); box-shadow:0 22px 48px rgba(22,44,29,.11); }
    .pmy-form-box { border-radius:22px; padding:24px; }
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
      background:rgba(255,255,255,.92);
      transition:border-color .18s ease, box-shadow .18s ease, background .18s ease;
    }
    .pmy-form-input:focus {
      border-color:var(--primary-green);
      box-shadow:0 0 0 3px color-mix(in srgb, var(--primary-green) 11%, transparent);
      background:#fff;
    }

    .pmy-grid { gap:16px; grid-template-columns:repeat(auto-fit,minmax(min(100%,220px),1fr)); }
    .pmy-agenda-form-grid { display:grid; grid-template-columns:minmax(0,1fr) minmax(0,1fr); gap:22px; margin-bottom:28px; align-items:start; }
    .pmy-booking-meta-grid { display:grid; grid-template-columns:minmax(0,1fr) minmax(0,1fr); gap:10px; margin-bottom:14px; }
    .pmy-media-layout { display:grid; grid-template-columns:minmax(0,1fr) 320px; gap:24px; align-items:start; }
    .pmy-media-upload-panel { position:sticky; top:92px; }
    .pmy-settings-color-grid { display:grid; grid-template-columns:minmax(0,1fr) minmax(0,1fr); gap:20px; margin-top:10px; }
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

    @media (max-width: 1180px) {
      .pmy-content-inner { padding-inline:24px; }
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
      .pmy-date-btn::before { content:'📅'; font-size:17px; }
      .pmy-date-dropdown { position:fixed; left:14px; right:14px; top:76px; width:auto; max-height:calc(100dvh - 96px); overflow:auto; }
      .pmy-date-custom-inputs { flex-direction:column; align-items:stretch; }
      .pmy-date-custom-inputs > span { display:none; }

      .pmy-booking-meta-grid,
      .pmy-variants-form-grid { grid-template-columns:1fr; }
      .pmy-settings-color-grid { grid-template-columns:1fr; gap:14px; }
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
              {logoUrl ? (
                <div className="pmy-logo-wrapper"><img src={logoUrl} alt="Portugal Me & You" className="pmy-logo-image" /></div>
              ) : (
                <div className="pmy-logo-placeholder"><span>Portugal Me & You</span></div>
              )}
            </div>
            <div className="pmy-logo-mini">PMY</div>
            <button
              type="button"
              className="pmy-sidebar-collapse"
              onClick={toggleSidebar}
              title={sidebarCollapsed ? "Expandir menu" : "Recolher menu"}
              aria-label={sidebarCollapsed ? "Expandir menu" : "Recolher menu"}
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
                <span className="pmy-menu-icon"><PmyNavIcon name={item.icon} /></span>
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
              <span className="pmy-menu-icon"><PmyNavIcon name="configuracoes" /></span>
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
                <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M4 7h16M4 12h16M4 17h16"/>
                </svg>
              </button>
              <div className="pmy-header-copy">
                <div className="pmy-eyebrow">Portugal Me & You · Central de Reservas</div>
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
                <button className="pmy-date-btn" onClick={() => setIsDateMenuOpen(!isDateMenuOpen)}>📅 {getPeriodLabel()} ▾</button>
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
                          <span style={{ color:'#aaa' }}>-</span>
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
            averageTicketValue, canceledCount, cancellationRate, upcomingCount, getPeriodLabel,
            salesByChannel, categoriesData, toggleCategory, openCategories, realConfirmedBookings,
            imageShape
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
            tourCapacities, tourOptions, tourVariants, tours, variantMatchesBookingTime
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
            loadShopifyValidation, startShopifyValidation, t, tours
          }} />

          <GuidesTab {...{
            activeTab, ddiList, getFlagUrl, guideDdi, guideEmail, guideName, guidePhoto,
            guidePhotoRef, guideUtmId, guideWhatsapp, guidesList, handleAddGuide,
            handleDeleteGuide, handleGuidePhotoChange, handleOpenEditGuide,
            openShopifyFilePicker, setActiveModal, setGuideDdi, setGuideEmail,
            setGuideName, setGuidePhoto, setGuideUtmId, setGuideWhatsapp,
            setSelectedGuideInfo, setUpcomingToursFilter, t, upcomingToursFilter
          }} />

          <AutomationsTab activeTab={activeTab} />

          <SettingsTab {...{
            activeMappingPlatform, activeTab, allPlatforms, defaultMappings, fieldMappings,
            fileInputRef, handleLogoChange, handleRemoveLogo, handleThemeChange,
            handleRestoreThemeDefaults, handleImageShapeChange, handleSaveFieldMappings,
            handleResetFieldMappings, handleUpdateFieldMapping, imageShape, internalFields,
            logoUrl, mappingSaveState, platformConnections, reservationPlatforms,
            setActiveMappingPlatform, settingsSaveMessage, shopifyStaff, t, theme
          }} />

          <MediaTab {...{
            activeTab, handleCopyMediaUrl, handleDeleteMedia, handleMediaUpload,
            mediaCategoryInput, mediaFilter, mediaLabelInput, mediaList, mediaPreview,
            mediaUploadError, mediaUploadProgress, mediaUploadRef, mediaUploading, setActiveModal,
            setMediaCategoryInput, setMediaFilter, setMediaLabelInput, setMediaList,
            setMediaPreview, setShowShopifySource, showShopifySource
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