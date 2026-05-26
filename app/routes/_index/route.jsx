import { useState, useRef } from "react";
import { useLoaderData, useFetcher, data } from "react-router";
import { authenticate } from "../../shopify.server";
import db from "../../db.server";

const prisma = db;
const json = (body, init) => data(body, init);

// COMPONENTE DA SETINHA DE EXPANDIR OS CARDS DO DASHBOARD
const ExpandIcon = () => (
  <svg className="pmy-card-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M7 17l9.2-9.2M17 17V7H7"/>
  </svg>
);

// 1. BACKEND: Loader para buscar dados reais do banco de dados
export const loader = async ({ request }) => {
  await authenticate.admin(request);
  
  const tours = await prisma.tour.findMany({ 
    include: { bookings: true } 
  });

  const bookings = await prisma.booking.findMany({ 
    orderBy: { startTime: "asc" } 
  });

  return json({ tours, bookings });
};

// 2. BACKEND: Action para processar os cadastros do sistema
export const action = async ({ request }) => {
  await authenticate.admin(request);
  const formData = await request.formData();
  const _action = formData.get("_action");

  if (_action === "createTour") {
    const title = formData.get("title");
    await prisma.tour.create({ data: { title } });
    return json({ success: true });
  }

  if (_action === "createBooking") {
    const tourId = formData.get("tourId");
    const customerName = formData.get("customerName");
    const startTime = new Date(formData.get("startTime"));
    const platform = formData.get("platform");

    await prisma.booking.create({
      data: { tourId, customerName, startTime, platform, status: "CONFIRMED" }
    });
    return json({ success: true });
  }

  return json({ success: true });
};

// --- DDI LIST COM PROTEÇÃO PARA WINDOWS (Exibindo Sigla ISO) ---
const ddiList = [
  { code: "+351", flag: "🇵🇹", iso: "PT", name: "Portugal" },
  { code: "+55",  flag: "🇧🇷", iso: "BR", name: "Brasil" },
  { code: "+1",   flag: "🇺🇸", iso: "US", name: "EUA/Canadá" },
  { code: "+34",  flag: "🇪🇸", iso: "ES", name: "Espanha" },
  { code: "+33",  flag: "🇫🇷", iso: "FR", name: "França" },
  { code: "+44",  flag: "🇬🇧", iso: "UK", name: "Reino Unido" },
  { code: "+49",  flag: "🇩🇪", iso: "DE", name: "Alemanha" },
  { code: "+39",  flag: "🇮🇹", iso: "IT", name: "Itália" },
  { code: "+41",  flag: "🇨🇭", iso: "CH", name: "Suíça" },
  { code: "+31",  flag: "🇳🇱", iso: "NL", name: "Holanda" }
];

// --- DICIONÁRIO DE TRADUÇÕES DO SISTEMA ---
const translations = {
  pt: {
    menu_dashboard: "📊 Dashboard",
    menu_agenda: "📅 Agenda Central",
    menu_integrations: "🔗 Integrações",
    menu_guides: "👥 Guias",
    menu_automations: "🤖 Automações",
    menu_settings: "⚙️ Configurações",
    dash_title: "Visão Geral",
    dash_total_sales: "Total de Vendas",
    dash_vs_last_month: "no período selecionado",
    dash_revenue_confirmed: "Receita Confirmada",
    dash_revenue_estimated: "Receita Estimada",
    dash_canceled_tours: "Tours Cancelados",
    dash_upcoming: "Próximos Tours",
    dash_performance: "Desempenho por Passeio",
    dash_bookings: "reservas",
    agenda_title: "Agenda Centralizada",
    integrations_title: "Sincronização de Plataformas",
    guides_title: "Gestão de Guias",
    automations_title: "Automações e Alertas",
    settings_title: "Configurações do Sistema",
    created_by: "Criado por Nathalia Simeão",
    period_1w: "1 semana", period_15d: "15 dias", period_30d: "30 dias", period_60d: "60 dias",
    period_90d: "90 dias", period_120d: "120 dias", period_6m: "6 meses", period_1y: "1 ano",
    period_custom: "Personalizado", date_from: "De", date_to: "Até", btn_apply: "Aplicar",
    source_site: "Site Próprio", source_viator: "Viator", source_gyg: "GetYourGuide", source_manual: "Manual",
    modal_sales_details: "Detalhamento de Vendas",
    modal_confirmed_details: "Detalhamento da Receita Confirmada",
    modal_estimated_details: "Detalhamento da Receita Estimada",
    modal_canceled_details: "Motivos de Cancelamento",
    modal_upcoming_details: "Lista de Próximos Tours",
    views: "visualizações",
    btn_format: "⚙️ Formato",
    form_new_booking: "🎟️ Inserir Nova Reserva",
    form_new_block: "🔒 Inserir Bloqueio Manual",
    form_select_tour: "Selecione o Tour",
    form_customer: "Nome do Cliente (Obrigatório):",
    form_email: "E-mail (Opcional):",
    form_phone: "Telefone / WhatsApp (Opcional):",
    form_lang: "Idioma Base do Tour:",
    form_qty: "Quantidade de Ingressos:",
    form_date_time: "Data do Bloqueio Específica:",
    form_btn_link: "🔗 Gerar Link de Pagamento",
    form_btn_block: "Bloquear Vagas / Horários",
    tour_capacity: "Capacidade Máxima de Vagas:",
    guide_assigned: "Guia Escalado:",
    no_guide: "Sem guia atribuído",
    registered_guides: "Equipe de Guias",
    form_new_guide: "Cadastrar Novo Guia", form_guide_name: "Nome e Sobrenome:", form_guide_email: "E-mail do Guia:",
    form_guide_whatsapp: "WhatsApp (Obrigatório):", form_guide_photo: "Foto do Guia:", btn_add_guide: "Salvar Guia", 
    registered_guides_list: "Guias Cadastrados",
    upcoming_tours_list: "Próximos Tours Agendados", filter_today: "Hoje",
    int_subtitle: "Conecte seus canais de venda para puxar as reservas de forma automática.",
    int_connected: "Conectado", int_configure: "Configurar Conexão", int_connect: "Vincular Conta",
    int_desc_viator: "Sincronize horários, vagas e passageiros.",
    int_desc_gyg: "Puxe reservas e atualize a disponibilidade.",
    int_desc_ta: "Importe suas avaliações e sincronize widgets.",
    int_desc_shopify: "Pedidos feitos no site caem aqui na hora.",
    int_custom_title: "🔗 Conectar Nova Plataforma via API (Plataforma X)",
    int_custom_name: "Nome da Plataforma:",
    int_custom_url: "Endpoint da API (URL):",
    int_custom_key: "Chave da API / Token de Acesso:",
    int_custom_btn: "Ativar Integração Customizada",
    block_days_week: "Dias da Semana Bloqueados Sempre (ex: 0, 1, 2):",
    block_select_hour: "Horário para Bloqueio:",
    view_1d: "1 dia", view_3d: "3 dias", view_7d: "7 dias", view_month: "Mês todo"
  },
  en: {
    menu_dashboard: "📊 Dashboard",
    menu_agenda: "📅 Central Agenda",
    menu_integrations: "🔗 Integrations",
    menu_guides: "👥 Guides",
    menu_automations: "🤖 Automations",
    menu_settings: "⚙️ Settings",
    dash_title: "Overview",
    dash_total_sales: "Total Sales",
    dash_vs_last_month: "in selected period",
    dash_revenue_confirmed: "Confirmed Revenue",
    dash_revenue_estimated: "Estimated Revenue",
    dash_canceled_tours: "Canceled Tours",
    dash_upcoming: "Upcoming Tours",
    dash_performance: "Tour Performance",
    dash_bookings: "bookings",
    agenda_title: "Centralized Agenda",
    integrations_title: "Platform Synchronization",
    guides_title: "Guides Management",
    automations_title: "Automations and Alerts",
    settings_title: "System Settings",
    created_by: "Created by Nathalia Simeão",
    period_1w: "1 week", period_15d: "15 days", period_30d: "30 days", period_60d: "60 days",
    period_90d: "90 days", period_120d: "120 days", period_6m: "6 months", period_1y: "1 year",
    period_custom: "Custom", date_from: "From", date_to: "To", btn_apply: "Apply",
    source_site: "Own Website", source_viator: "Viator", source_gyg: "GetYourGuide", source_manual: "Manual",
    modal_sales_details: "Sales Breakdown",
    modal_confirmed_details: "Confirmed Revenue Breakdown",
    modal_estimated_details: "Estimated Revenue Breakdown",
    modal_canceled_details: "Cancellation Details",
    modal_upcoming_details: "Upcoming Tours List",
    views: "views",
    btn_format: "⚙️ Shape",
    form_new_booking: "🎟️ Insert New Booking",
    form_new_block: "🔒 Insert Manual Block",
    form_select_tour: "Select Tour",
    form_customer: "Customer Name (Required):",
    form_email: "Email (Optional):",
    form_phone: "Phone / WhatsApp (Optional):",
    form_lang: "Tour Language:",
    form_qty: "Ticket Quantity:",
    form_date_time: "Specific Block Date:",
    form_btn_link: "🔗 Generate Payment Link",
    form_btn_block: "Block Slots / Times",
    tour_capacity: "Max Capacity Slots:",
    guide_assigned: "Assigned Guide:",
    no_guide: "No guide assigned",
    registered_guides: "Guides Staff",
    form_new_guide: "Register New Guide", form_guide_name: "Full Name:", form_guide_email: "Guide Email:",
    form_guide_whatsapp: "WhatsApp (Required):", form_guide_photo: "Guide Photo:", btn_add_guide: "Save Guide", 
    registered_guides_list: "Registered Guides", upcoming_tours_list: "Upcoming Scheduled Tours", filter_today: "Today",
    int_subtitle: "Connect your sales channels to fetch bookings automatically.",
    int_connected: "Connected", int_configure: "Configure Connection", int_connect: "Link Account",
    int_desc_viator: "Sync schedules, availability, and travelers.",
    int_desc_gyg: "Fetch bookings and update availability.",
    int_desc_ta: "Import your reviews and sync widgets.",
    int_desc_shopify: "Website orders appear here instantly.",
    int_custom_title: "🔗 Connect New Platform via API (Platform X)",
    int_custom_name: "Platform Name:",
    int_custom_url: "API Endpoint (URL):",
    int_custom_key: "API Key / Access Token:",
    int_custom_btn: "Activate Custom Integration",
    block_days_week: "Always Blocked Weekdays (e.g., 0, 1, 2):",
    block_select_hour: "Time slot to Block:",
    view_1d: "1 day", view_3d: "3 days", view_7d: "7 days", view_month: "Full month"
  }
};

export default function CentralDeReservas() {
  const { tours, bookings } = useLoaderData() || { tours: [], bookings: [] };
  const fetcher = useFetcher();
  
  // A. ESTADOS DE CONTROLE DE NAVEGAÇÃO DE ABAS E CONFIGS GERAIS
  const [activeTab, setActiveTab] = useState("dashboard");
  const [logoUrl, setLogoUrl] = useState(null);
  const [lang, setLang] = useState("pt"); 
  const [imageShape, setImageShape] = useState("rounded"); 
  const [activeModal, setActiveModal] = useState(null);
  const [openCategories, setOpenCategories] = useState(["Day Trips", "Walking Tours"]);

  // B. ESTADOS DOS FILTROS DE DATAS DO DASHBOARD (BI)
  const [isDateMenuOpen, setIsDateMenuOpen] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState("period_30d");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");

  // C. ESTADOS DO FORMULÁRIO DE INSERÇÃO DE RESERVAS
  const [custName, setCustName] = useState("");
  const [custEmail, setCustEmail] = useState("");
  const [custPhone, setCustPhone] = useState("");
  const [custLang, setCustLang] = useState("Português");
  const [selectedTour, setSelectedTour] = useState("");
  const [tourVariants, setTourVariants] = useState({ adulto: 0, jovem: 0, crianca: 0, senior: 0 });
  const [activeProductVariants, setActiveProductVariants] = useState(["adulto", "jovem", "crianca", "senior"]);
  const [activeTourLanguages, setActiveTourLanguages] = useState(["Português", "English"]);
  const [generatedLink, setGeneratedLink] = useState("");

  // D. ESTADOS DO FORMULÁRIO DE BLOQUEIOS MANUAIS OPERACIONAIS
  const [blockTourId, setBlockTourId] = useState("");
  const [blockDateTime, setBlockDateTime] = useState("");
  const [blockRecurringDays, setBlockRecurringDays] = useState(""); 
  const [blockSelectedHour, setBlockSelectedHour] = useState("ALL"); 
  const [tourAvailableHours, setTourAvailableHours] = useState(["09:00", "14:00"]); 

  // E. ESTADOS DO MODAL DE AGENDAMENTO E ALOCAÇÃO DIÁRIA DO CALENDÁRIO
  const [modalSelectedTour, setModalSelectedTour] = useState("");
  const [modalAvailableHours, setModalAvailableHours] = useState(["09:00", "14:00"]);
  const [isFormAllocating, setIsFormAllocating] = useState(false);

  // F. ESTADOS DE NAVEGAÇÃO TEMPORAL DO GOOGLE CALENDAR
  const [currentMonth, setCurrentMonth] = useState(4); // Maio
  const [currentYear, setCurrentYear] = useState(2026); 
  const [calendarView, setCalendarView] = useState("month"); 
  const [selectedCalendarDay, setSelectedCalendarDay] = useState(26);

  // G. ESTADOS DE GESTÃO DE CAPACIDADE DE VAGAS E EQUIPE DE GUIAS
  const [tourCapacities, setTourCapacities] = useState({});
  const [guideName, setGuideName] = useState("");
  const [guideEmail, setGuideEmail] = useState("");
  const [guideDdi, setGuideDdi] = useState("+351");
  const [guideWhatsapp, setGuideWhatsapp] = useState("");
  const [guidePhoto, setGuidePhoto] = useState(null);
  const [guidesList, setGuidesList] = useState([
    { id: 1, name: "Renan Silva", email: "renan@portugalmeandyou.com", whatsapp: "+351 912345678", photo: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&q=80" }
  ]);
  const [selectedGuideInfo, setSelectedGuideInfo] = useState(null);
  const [upcomingToursFilter, setUpcomingToursFilter] = useState("7d");

  // H. ESTADOS DAS CONEXÕES DE CANAIS EXTERNOS VIA API MASTER
  const [customName, setCustomName] = useState("");
  const [customUrl, setCustomUrl] = useState("");
  const [customKey, setCustomKey] = useState("");
  const [customIntegrations, setCustomIntegrations] = useState([]);
  
  const fileInputRef = useRef(null);
  const guidePhotoRef = useRef(null);
  const t = translations[lang] || translations.pt; 

  // --- 1. DECLARAÇÕES E ESTRUTURAÇÕES GERAIS DE DADOS (TOPO DO ESCOPO) ---
  const ptMonths = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
  const enMonths = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const currentMonthLabel = lang === 'pt' ? ptMonths[currentMonth] : enMonths[currentMonth];

  const getPeriodLabel = () => {
    if (selectedPeriod === "period_custom" && customStart && customEnd) {
      const formatData = (d) => new Date(d).toLocaleDateString(lang === 'pt' ? 'pt-BR' : 'en-US');
      return `${formatData(customStart)} - ${formatData(customEnd)}`;
    }
    return t[selectedPeriod] || t.period_30d;
  };

  const realConfirmedBookings = bookings?.filter((b) => b?.status === "CONFIRMED") || [];
  const realCanceledBookings = bookings?.filter((b) => b?.status === "CANCELED") || [];
  
  const totalSalesCount = realConfirmedBookings.length;
  const canceledCount = realCanceledBookings.length;
  const upcomingCount = realConfirmedBookings.length; 

  const confirmedRevenueValue = realConfirmedBookings.length * 80;
  const estimatedRevenueValue = realConfirmedBookings.length * 25; 

  const dynamicDayTrips = tours?.filter(tour => !(tour?.title || "").toLowerCase().includes("walking")) || [];
  const dynamicWalkingTours = tours?.filter(tour => (tour?.title || "").toLowerCase().includes("walking")) || [];

  const categoriesData = [
    { name: "Day Trips", toursList: dynamicDayTrips },
    { name: "Walking Tours", toursList: dynamicWalkingTours }
  ];

  // --- 2. RESTAURAÇÃO DAS FUNÇÕES CRÍTICAS DOS FORMULÁRIOS ---
  const handleGeneratePaymentLink = (e) => {
    e.preventDefault();
    if(custName && selectedTour) {
      const totalTickets = Object.values(tourVariants).reduce((a, b) => a + b, 0);
      setGeneratedLink(`https://portugalmeandyou.com/checkout/draft_order_pmy_${Date.now()}?qty=${totalTickets}`);
    }
  };

  const handleAddGuide = (e) => {
    e.preventDefault();
    if(guideName && guideWhatsapp) {
      setGuidesList([...guidesList, { 
        id: Date.now(), 
        name: guideName, 
        email: guideEmail, 
        whatsapp: `${guideDdi} ${guideWhatsapp}`,
        photo: guidePhoto || "https://via.placeholder.com/150" 
      }]);
      setGuideName(""); setGuideEmail(""); setGuideWhatsapp(""); setGuidePhoto(null);
    }
  };

  const handleAddCustomIntegration = (e) => {
    e.preventDefault();
    if (customName && customUrl) {
      setCustomIntegrations([...customIntegrations, { id: Date.now(), name: customName, url: customUrl, key: customKey }]);
      setCustomName(""); setCustomUrl(""); setCustomKey("");
    }
  };

  // --- 3. DEMAIS HANDLERS INTERNOS DE TELA ---
  const handleLogoChange = (event) => {
    const file = event.target.files[0];
    if (file) setLogoUrl(URL.createObjectURL(file));
  };

  const handleGuidePhotoChange = (event) => {
    const file = event.target.files[0];
    if (file) setGuidePhoto(URL.createObjectURL(file));
  };

  const toggleCategory = (catName) => {
    setOpenCategories(prev => 
      prev.includes(catName) ? prev.filter(c => c !== catName) : [...prev, catName]
    );
  };

  const toggleImageShape = () => {
    setImageShape(prev => prev === "rounded" ? "circle" : "rounded");
  };

  const handlePresetSelection = (periodKey) => {
    setSelectedPeriod(periodKey);
    setIsDateMenuOpen(false);
  };

  const handleCustomDateApply = () => {
    if(customStart && customEnd) {
      setSelectedPeriod("period_custom");
      setIsDateMenuOpen(false);
    }
  };

  const handleTourSelectionChange = (tourId) => {
    setSelectedTour(tourId);
    setTourVariants({ adulto: 0, jovem: 0, crianca: 0, senior: 0 });
    
    if (tourId.charCodeAt(0) % 2 === 0) {
      setActiveProductVariants(["adulto", "jovem", "senior"]); 
      setActiveTourLanguages(["Português", "English", "Español"]);
    } else {
      setActiveProductVariants(["adulto", "jovem", "crianca", "senior"]); 
      setActiveTourLanguages(["Português", "English", "Français"]);
    }
  };

  const handleModalTourChange = (tourId) => {
    setModalSelectedTour(tourId);
    if (tourId.charCodeAt(0) % 2 === 0) {
      setModalAvailableHours(["08:30", "13:00", "17:30"]);
    } else {
      setModalAvailableHours(["09:00", "14:00"]);
    }
  };

  const handleBlockTourSelectionChange = (tourId) => {
    setBlockTourId(tourId);
    if (tourId.charCodeAt(0) % 2 === 0) {
      setTourAvailableHours(["08:30", "13:00", "17:30"]);
    } else {
      setTourAvailableHours(["09:00", "14:00"]);
    }
  };

  const handleCapacityChange = (tourId, change) => {
    const currentCap = tourCapacities[tourId] !== undefined ? tourCapacities[tourId] : 20;
    let newCap = currentCap + change;
    if (newCap < 0) newCap = 0;
    if (newCap > 20) newCap = 20; 
    setTourCapacities({ ...tourCapacities, [tourId]: newCap });
  };

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(prev => prev - 1);
    } else {
      setCurrentMonth(prev => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(prev => prev + 1);
    } else {
      setCurrentMonth(prev => prev + 1);
    }
  };

  // --- 4. RENDERIZADORES COMPACTOS DE TELA ---
  const renderCalendarDays = () => {
    const ptWeekdays = ["segunda-feira", "terça-feira", "quarta-feira", "quinta-feira", "sexta-feira", "sábado", "domingo"];
    const enWeekdays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
    const weekdays = lang === 'pt' ? ptWeekdays : enWeekdays;

    if (calendarView !== "month") {
      let shortDays = [];
      if (calendarView === "1d") { shortDays = [26]; } 
      else if (calendarView === "3d") { shortDays = [25, 26, 27]; } 
      else if (calendarView === "7d") { shortDays = [24, 25, 26, 27, 28, 29, 30]; }

      return shortDays.map(day => {
        const weekdayIndex = (day + 3) % 7; 
        const currentWeekdayName = weekdays[weekdayIndex];
        return (
          <div key={day} className={`pmy-calendar-day ${selectedCalendarDay === day ? 'active' : ''}`} onClick={() => { setSelectedCalendarDay(day); setModalSelectedTour(""); setIsFormAllocating(false); setActiveModal('calendarDay'); }}>
            <div className="pmy-cal-date-line">{day} - {currentWeekdayName}</div>
            <div className="pmy-cal-info-line">🏰 2 Tours Ativos</div>
            <div className="pmy-cal-info-line">👥 Vagas: 14/20</div>
            {(day === 26 || day === 28) && <div className="pmy-calendar-dot"></div>}
          </div>
        );
      });
    }

    const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay();
    const paddingCellsNeeded = firstDayIndex === 0 ? 6 : firstDayIndex - 1;
    const totalDaysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

    let fullGridCells = [];
    for (let p = 0; p < paddingCellsNeeded; p++) {
      fullGridCells.push(<div key={`empty-${p}`} className="pmy-calendar-day empty" style={{ opacity: 0.15, cursor: 'default', background: 'none', border: 'none' }}></div>);
    }

    for (let day = 1; day <= totalDaysInMonth; day++) {
      const currentWeekdayName = weekdays[(day + paddingCellsNeeded - 1) % 7] || weekdays[0];
      fullGridCells.push(
        <div key={`day-${day}`} className={`pmy-calendar-day ${selectedCalendarDay === day ? 'active' : ''}`} onClick={() => { setSelectedCalendarDay(day); setModalSelectedTour(""); setIsFormAllocating(false); setActiveModal('calendarDay'); }}>
          <div className="pmy-cal-date-line">{day} - {currentWeekdayName.split('-')[0]}</div>
          <div className="pmy-cal-info-line">🏰 2 Tours Ativos</div>
          <div className="pmy-cal-info-line">👥 Vagas: 14/20</div>
          {(day === 26 || day === 12 || day === 18) && <div className="pmy-calendar-dot"></div>}
        </div>
      );
    }

    return fullGridCells;
  };

  const renderModal = () => {
    if (!activeModal) return null;
    let title = "";
    let content = null;

    if (activeModal === 'calendarDay') {
      title = `📅 Grade do Dia ${selectedCalendarDay} de ${currentMonthLabel} de ${currentYear}`;
      
      const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay();
      const paddingCellsNeeded = firstDayIndex === 0 ? 6 : firstDayIndex - 1;
      const currentDayOfWeekIndex = (selectedCalendarDay + paddingCellsNeeded - 1) % 7;
      
      const isDayOfWeekBlocked = blockRecurringDays && blockRecurringDays.replace(/\s/g, '').split(',').includes(String(currentDayOfWeekIndex));
      const isSpecificDateBlocked = blockDateTime && new Date(blockDateTime + "T00:00:00").getDate() === selectedCalendarDay && new Date(blockDateTime + "T00:00:00").getMonth() === currentMonth;
      const isSystemDayFullyBlocked = isDayOfWeekBlocked || isSpecificDateBlocked;

      content = (
        <div>
          <h4 style={{ fontSize: '15px', color: '#555', marginBottom: '12px' }}>Eventos Ativos Agendados:</h4>
          <div style={{ background: '#f9f9f9', padding: '15px', borderRadius: '8px', border: '1px solid #eee', marginBottom: '20px' }}>
            {selectedCalendarDay === 26 ? (
              tours?.map((tour, index) => (
                <div key={tour.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: index === tours.length - 1 ? 'none' : '1px solid #eee' }}>
                  <span style={{ fontWeight: 'bold', fontSize: '14px' }}>{tour.title}</span>
                  <div className="pmy-guide-mini-tag">
                    <img src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=50&q=80" alt="Renan" className="pmy-guide-mini-img" />
                    <span>Renan (09:00)</span>
                  </div>
                </div>
              ))
            ) : (
              <p style={{ color: '#999', fontSize: '14px', textAlign: 'center', padding: '10px 0' }}>Nenhum tour escalado para este dia.</p>
            )}
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid #eee', margin: '20px 0' }} />

          {isSystemDayFullyBlocked ? (
            <div style={{ padding: '15px', background: '#ffe6e6', border: '1px solid #cc0000', color: '#cc0000', borderRadius: '8px', fontWeight: 'bold', fontSize: '13px', lineHeight: '1.4' }}>
              🔒 Alocação Suspensa: Este dia está bloqueado nas configurações centrais do sistema (Bloqueio Geral da semana ou Data Específica configurada no painel).
            </div>
          ) : (
            <div>
              {!isFormAllocating ? (
                <button type="button" className="pmy-btn-submit" onClick={() => setIsFormAllocating(true)}>+ Adicionar Novo Tour a este Dia</button>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', background: '#f5fcf5', padding: '20px', borderRadius: '10px', border: '1px solid #e0f0e0' }}>
                  <h4 style={{ color: 'var(--primary-green)', fontWeight: 'bold', fontSize: '15px' }}>➕ Escalar Passeio na Folha Diária</h4>
                  
                  <div className="pmy-form-box-item" style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    <label style={{ fontSize: '13px', fontWeight: '700' }}>Selecione o Tour</label>
                    <select className="pmy-form-input" value={modalSelectedTour} onChange={(e) => handleModalTourChange(e.target.value)} required>
                      <option value="">-- Selecione o Tour --</option>
                      {tours?.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
                    </select>
                  </div>

                  {modalSelectedTour && (
                    <div className="pmy-form-box-item" style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                      <label style={{ fontSize: '13px', fontWeight: '700' }}>Selecione o Horário:</label>
                      <select className="pmy-form-input">
                        {modalAvailableHours.map(hour => (
                          <option key={hour} value={hour}>{hour}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className="pmy-form-box-item" style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    <label style={{ fontSize: '13px', fontWeight: '700' }}>Selecione o Guia:</label>
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
    } else if (activeModal === 'guideDetails' && selectedGuideInfo) {
      title = `Detalhes do Guia`;
      content = (
        <div>
          <div style={{ display: 'flex', gap: '20px', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid #eee', paddingBottom: '20px' }}>
            <img src={selectedGuideInfo.photo} alt={selectedGuideInfo.name} style={{ width: '80px', height: '80px', borderRadius: '16px', objectFit: 'cover' }} />
            <div>
              <h2 style={{ fontSize: '22px', fontWeight: 'bold', color: 'var(--text-dark)', margin: '0 0 5px 0' }}>{selectedGuideInfo.name}</h2>
              <div style={{ fontSize: '13px', color: '#666' }}>✉️ {selectedGuideInfo.email || 'N/A'}</div>
              <div style={{ fontSize: '13px', color: '#666', marginTop: '4px' }}>📱 {selectedGuideInfo.whatsapp || 'N/A'}</div>
            </div>
          </div>
          
          <h4 style={{ fontSize: '15px', color: 'var(--primary-green)', fontWeight: 'bold', marginBottom: '10px' }}>Próximos 7 Tours Atribuídos:</h4>
          <div style={{ background: '#f9f9f9', padding: '15px', borderRadius: '8px', border: '1px solid #eee', marginBottom: '20px' }}>
            <div className="pmy-list-item" style={{ padding: '8px 0' }}><span>🏰 Sintra e Cascais Completo</span> <strong>Amanhã, 09:00</strong></div>
            <div className="pmy-list-item" style={{ padding: '8px 0' }}><span>🏰 Fátima, Batalha e Nazaré</span> <strong>28/Maio, 08:30</strong></div>
            <div className="pmy-list-item" style={{ padding: '8px 0', borderBottom: 'none' }}><span>🚶‍♂️ Lisboa Walking Tour (Baixa)</span> <strong>30/Maio, 14:00</strong></div>
          </div>

          <h4 style={{ fontSize: '15px', color: '#555', fontWeight: 'bold', marginBottom: '10px' }}>Horários Disponíveis Padrão:</h4>
          <div style={{ display: 'flex', gap: '10px' }}>
            <span className="pmy-tag" style={{ background: '#e6f2e6', color: 'var(--primary-green)', fontSize: '12px' }}>Segunda a Sábado</span>
            <span className="pmy-tag" style={{ background: '#e6f2e6', color: 'var(--primary-green)', fontSize: '12px' }}>08:00 - 18:00</span>
          </div>
        </div>
      );
    } else if (activeModal === 'sales') {
      title = t.modal_sales_details;
      content = (
        <div>
          {tours?.length === 0 ? (
            <p>Nenhum passeio cadastrado para listar no detalhamento.</p>
          ) : (
            tours?.map(tour => {
              const tourBookings = tour?.bookings || [];
              const viator = tourBookings.filter(b => b.platform === 'VIATOR' && b.status === 'CONFIRMED').length;
              const gyg = tourBookings.filter(b => b.platform === 'GETYOURGUIDE' && b.status === 'CONFIRMED').length;
              const shopify = tourBookings.filter(b => b.platform === 'SHOPIFY' && b.status === 'CONFIRMED').length;
              const manual = tourBookings.filter(b => b.platform === 'MANUAL' && b.status === 'CONFIRMED').length;
              return (
                <div className="pmy-list-item" style={{ flexDirection: 'column', alignItems: 'flex-start' }} key={tour.id}>
                  <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between' }}>
                    <strong>{tour.title || "Tour sem título"}</strong>
                    <span style={{ fontWeight: 'bold', color: 'var(--primary-green)' }}>{viator+gyg+shopify+manual} {t.dash_bookings}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      );
    } else if (activeModal === 'canceled') {
      title = t.modal_canceled_details;
      content = (
        <div>
          {realCanceledBookings.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#999' }}>Nenhum cancelamento registrado no banco de dados.</p>
          ) : (
            realCanceledBookings.map(b => (
              <div className="pmy-list-item" key={b.id}>
                <div><strong>{b.customerName || "N/A"}</strong></div>
                <span className="pmy-tag gyg">{b.platform}</span>
              </div>
            ))
          )}
        </div>
      );
    } else if (activeModal === 'confirmed' || activeModal === 'estimated' || activeModal === 'upcoming') {
      title = activeModal === 'confirmed' ? t.modal_confirmed_details : (activeModal === 'estimated' ? t.modal_estimated_details : t.modal_upcoming_details);
      content = <div style={{ textAlign: 'center', padding: '40px 0', color: '#888' }}>Detalhamentos aparecerão nesta seção.</div>;
    }

    return (
      <div className="pmy-modal-overlay" onClick={() => setActiveModal(null)}>
        <div className="pmy-modal" onClick={(e) => e.stopPropagation()}>
          <div className="pmy-modal-header">
            <div className="pmy-modal-title">{title}</div>
            <button className="pmy-modal-close" onClick={() => setActiveModal(null)}>&times;</button>
          </div>
          <div className="pmy-modal-body">{content}</div>
        </div>
      </div>
    );
  };

  const styles = `
    :root {
      --bg-color: #F4DCDC;
      --primary-green: #006600;
      --primary-hover: #004d00;
      --text-dark: #2b2b2b;
      --text-muted: #666666;
      --card-bg: #ffffff;
      --border-radius: 12px;
    }
    
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Assistant', sans-serif; }
    
    body, html { overflow-x: hidden; background-color: var(--bg-color); }
    .Polaris-Page { padding: 0 !important; max-width: 100% !important; }
    h1.Polaris-Header-Title { display: none !important; }
    ::-webkit-scrollbar { width: 6px; height: 0px; }
    ::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.12); border-radius: 10px; }
    
    .pmy-app-container { display: flex; height: 100vh; width: 100vw; margin-left: -20px; overflow: hidden; }
    .pmy-sidebar { width: 260px; background-color: #ffffff; border-right: 1px solid rgba(0,0,0,0.05); display: flex; flex-direction: column; box-shadow: 2px 0 15px rgba(0,0,0,0.03); flex-shrink: 0; }
    
    /* LOGO AREA LIMPA SEM EDIÇÃO NA SIDEBAR */
    .pmy-logo-area { padding: 30px 20px; text-align: center; border-bottom: 1px solid #f0f0f0; display: flex; justify-content: center; align-items: center; min-height: 180px; }
    .pmy-logo-placeholder { width: 180px; height: 80px; margin: 0 auto; border: 2px dashed #ccc; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: #999; font-weight: bold; }
    .pmy-logo-wrapper { position: relative; width: 180px; height: 140px; margin: 0 auto; display: flex; justify-content: center; align-items: center; border-radius: 8px; overflow: hidden; }
    .pmy-logo-image { max-width: 100%; max-height: 140px; object-fit: contain; }

    .pmy-menu { padding: 20px 0; display: flex; flex-direction: column; gap: 5px; }
    .pmy-menu-item { padding: 12px 25px; margin: 0 10px; border-radius: 8px; cursor: pointer; color: var(--text-dark); font-weight: 600; display: flex; align-items: center; gap: 12px; transition: all 0.2s; }
    .pmy-menu-item:hover { background-color: #f5f5f5; }
    .pmy-menu-item.active { background-color: var(--primary-green); color: #ffffff; }

    .pmy-sidebar-footer { margin-top: auto; padding: 20px; border-top: 1px solid #f0f0f0; display: flex; flex-direction: column; align-items: center; gap: 15px; }
    .pmy-lang-pill { display: flex; align-items: center; gap: 12px; border: 1px solid rgba(0,0,0,0.15); border-radius: 30px; padding: 8px 16px; background: transparent; user-select: none; }
    .pmy-lang-pill span { cursor: pointer; opacity: 0.3; transition: 0.2s ease; display: flex; align-items: center; justify-content: center; }
    .pmy-lang-pill span.active { opacity: 1; transform: scale(1.1); }
    .pmy-flag-icon { width: 24px; height: 16px; object-fit: cover; border-radius: 2px; box-shadow: 0 1px 3px rgba(0,0,0,0.2); }
    .pmy-lang-divider { width: 1px; height: 18px; background: rgba(0,0,0,0.15); }
    .pmy-credit-text { font-size: 12px; color: #999; text-align: center; }

    .pmy-content { flex: 1; padding: 40px; overflow-y: auto; height: 100vh; }
    .pmy-header-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px; }
    .pmy-page-title { font-size: 28px; font-weight: 800; color: var(--primary-green); margin: 0; }

    /* DASHBOARD CARDS COM HOVER RESTAURADOS */
    .pmy-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); gap: 20px; margin-bottom: 30px; }
    .pmy-card { background: var(--card-bg); border-radius: var(--border-radius); padding: 22px; box-shadow: 0 8px 20px rgba(0,0,0,0.04); border: 1px solid rgba(0,0,0,0.02); position: relative; transition: 0.2s ease; }
    .pmy-card.has-hover { cursor: pointer; }
    .pmy-card.has-hover:hover { box-shadow: 0 12px 25px rgba(0,0,0,0.08); transform: translateY(-3px); }
    .pmy-card-icon { position: absolute; top: 22px; right: 22px; color: #ddd; font-weight: bold; font-size: 16px; transition: 0.2s ease; }
    .pmy-card.has-hover:hover .pmy-card-icon { color: var(--primary-green); }
    .pmy-card-title { font-size: 14px; color: var(--text-muted); font-weight: 600; margin-bottom: 10px; padding-right: 20px; }
    .pmy-card-value { font-size: 32px; font-weight: 900; color: var(--primary-green); }

    .pmy-form-box { background: #ffffff; padding: 25px; border-radius: var(--border-radius); box-shadow: 0 8px 20px rgba(0,0,0,0.04); margin-bottom: 25px; border: 1px solid rgba(0,0,0,0.02); }
    .pmy-form-box h3 { color: var(--primary-green); margin-bottom: 20px; font-weight: 800; font-size: 18px; border-bottom: 1px solid #f5f5f5; padding-bottom: 8px; }
    .pmy-form-group { display: flex; flex-direction: column; gap: 6px; margin-bottom: 15px; }
    .pmy-form-group label { font-size: 13px; font-weight: 700; color: var(--text-dark); }
    .pmy-form-input { padding: 10px 14px; border: 1px solid #ddd; border-radius: 8px; outline: none; font-size: 14px; width: 100%; font-family: inherit; }
    .pmy-form-input:focus { border-color: var(--primary-green); }
    .pmy-btn-submit { background: var(--primary-green); color: #fff; font-weight: bold; border: none; padding: 12px; border-radius: 8px; cursor: pointer; width: 100%; font-size: 14px; transition: 0.2s; }
    .pmy-btn-submit:hover { background: var(--primary-hover); }

    .pmy-calendar-view-tabs { display: flex; gap: 5px; background: #eee; padding: 4px; border-radius: 8px; width: auto; flex-shrink: 0; }
    .pmy-cal-tab { padding: 6px 14px; border: none; background: transparent; font-size: 12px; font-weight: bold; color: #666; cursor: pointer; border-radius: 6px; transition: 0.2s; white-space: nowrap; }
    .pmy-cal-tab.active { background: #fff; color: var(--primary-green); box-shadow: 0 2px 6px rgba(0,0,0,0.05); }

    .pmy-calendar-month-selector-bar { display: flex; align-items: center; gap: 15px; margin-bottom: 15px; }
    .pmy-calendar-nav-arrow-btn { background: #ffffff; border: 1px solid #ddd; border-radius: 50%; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; cursor: pointer; font-size: 11px; font-weight: bold; transition: 0.2s; color: var(--text-dark); }
    .pmy-calendar-nav-arrow-btn:hover { border-color: var(--primary-green); color: var(--primary-green); }
    .pmy-calendar-current-month-year-label { font-size: 18px; font-weight: 800; color: var(--text-dark); min-width: 140px; text-align: center; }

    .pmy-calendar-week-headers { display: grid; grid-template-columns: repeat(7, 1fr); gap: 8px; text-align: center; font-weight: 800; font-size: 12px; color: var(--text-muted); margin-bottom: 5px; padding: 0 15px; }

    .pmy-calendar-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 8px; background: #fff; padding: 15px; border-radius: 12px; box-shadow: 0 8px 20px rgba(0,0,0,0.04); margin-bottom: 25px; transition: all 0.3s ease; }
    .pmy-calendar-grid.month-view { grid-template-columns: repeat(7, 1fr); gap: 6px; }
    
    .pmy-calendar-day { 
      background: #fafafa; padding: 14px 12px; border-radius: 8px; cursor: pointer; 
      transition: 0.2s; border: 1px solid #f0f0f0; color: var(--text-dark);
      min-height: 105px; display: flex; flex-direction: column; justify-content: flex-start; gap: 6px; text-align: left;
      position: relative;
    }
    .pmy-calendar-day:hover { background: #f0f0f0; border-color: var(--primary-green); }
    .pmy-calendar-day.active { background: var(--primary-green); color: #fff; border-color: var(--primary-green); }
    
    .pmy-cal-date-line { font-size: 13px; font-weight: 800; border-bottom: 1px solid rgba(0,0,0,0.04); padding-bottom: 3px; margin-bottom: 2px; }
    .pmy-calendar-day.active .pmy-cal-date-line { border-bottom-color: rgba(255,255,255,0.15); }
    
    .pmy-cal-info-line { font-size: 11px; font-weight: 600; opacity: 0.8; }
    
    .pmy-calendar-dot { width: 6px; height: 6px; background: #c99a3c; border-radius: 50%; position: absolute; bottom: 6px; right: 8px; }
    .pmy-calendar-day.active .pmy-calendar-dot { background: #fff; }

    .pmy-capacity-controls { display: flex; align-items: center; gap: 10px; background: #f9f9f9; padding: 4px 10px; border-radius: 20px; border: 1px solid #eee; }
    .pmy-cap-btn { background: #fff; border: 1px solid #ddd; width: 26px; height: 26px; border-radius: 50%; font-weight: bold; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 16px; }
    .pmy-cap-btn:hover { border-color: var(--primary-green); color: var(--primary-green); }

    .pmy-tour-item { display: flex; gap: 15px; padding: 15px 0; border-bottom: 1px solid #eee; align-items: center; justify-content: space-between; }
    .pmy-tour-item:last-child { border-bottom: none; }
    .pmy-guide-mini-tag { display: flex; align-items: center; gap: 6px; background: #f5f5f5; padding: 4px 10px; border-radius: 20px; font-size: 12px; font-weight: bold; }
    .pmy-guide-mini-img { width: 18px; height: 18px; border-radius: 50%; object-fit: cover; }

    .pmy-integration-card { background: #ffffff; border-radius: var(--border-radius); padding: 30px 20px; box-shadow: 0 8px 20px rgba(0,0,0,0.04); display: flex; flex-direction: column; align-items: center; text-align: center; border: 1px solid rgba(0,0,0,0.02); position: relative; }
    .pmy-int-badge { position: absolute; top: 15px; right: 15px; font-size: 11px; padding: 4px 10px; border-radius: 20px; font-weight: 700; background: #e6f2e6; color: var(--primary-green); }
    .pmy-int-logo { font-size: 44px; margin-bottom: 15px; }
    .pmy-int-name { font-size: 18px; font-weight: 800; color: var(--text-dark); margin-bottom: 8px; }
    .pmy-int-desc { font-size: 13px; color: var(--text-muted); margin-bottom: 25px; line-height: 1.4; flex: 1; }
    .pmy-int-btn { width: 100%; border: 1px solid var(--primary-green); background: transparent; color: var(--primary-green); font-weight: 700; padding: 10px; border-radius: 8px; cursor: pointer; transition: 0.2s; font-size: 13px; }
    .pmy-int-btn:hover { background: var(--primary-green); color: #ffffff; }

    .pmy-accordion-header { display: flex; justify-content: space-between; align-items: center; padding: 15px 0; border-bottom: 1px solid #eee; cursor: pointer; transition: 0.2s; }
    .pmy-accordion-header:hover { color: var(--primary-green); }
    .pmy-accordion-title { font-size: 16px; font-weight: 700; }
    .pmy-accordion-arrow { font-size: 14px; }
    .pmy-accordion-content { display: none; padding: 15px 0; border-bottom: 1px solid #eee; }
    .pmy-accordion-content.open { display: block; }
    
    .pmy-tour-img { width: 65px; height: 65px; object-fit: cover; box-shadow: 0 4px 10px rgba(0,0,0,0.08); transition: border-radius 0.3s ease; background: #eee; }
    .pmy-tour-img.circle { border-radius: 50%; }
    .pmy-tour-img.rounded { border-radius: 12px; }
    .pmy-tour-details { flex: 1; }
    .pmy-tour-name { font-weight: bold; font-size: 15px; margin-bottom: 6px; color: var(--text-dark); }
    
    .pmy-format-btn { background: #f0f0f0; border: none; border-radius: 20px; padding: 6px 14px; font-size: 13px; font-weight: bold; color: #555; cursor: pointer; transition: 0.2s; }
    .pmy-format-btn:hover { background: #e0e0e0; color: var(--primary-green); }

    .pmy-list-item { display: flex; justify-content: space-between; align-items: center; padding: 15px 0; border-bottom: 1px solid #eee; }
    .pmy-list-item:last-child { border-bottom: none; }
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
    @keyframes slideUp { from { transform: translateY(20px); } to { transform: translateY(0); } }

    /* ESTILOS DE COMPORTAMENTO DO SELETOR DE ATALHOS DE PERÍODOS DE BI DO DASHBOARD */
    .pmy-date-wrapper { position: relative; z-index: 101; }
    .pmy-date-btn { display: flex; align-items: center; gap: 8px; background: #ffffff; border: 1px solid rgba(0,0,0,0.1); padding: 10px 18px; border-radius: 8px; font-weight: 600; color: var(--text-dark); cursor: pointer; box-shadow: 0 2px 10px rgba(0,0,0,0.02); transition: 0.2s; }
    .pmy-date-btn:hover { border-color: var(--primary-green); }
    .pmy-date-overlay { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; z-index: 90; background: transparent; }
    .pmy-date-dropdown { position: absolute; right: 0; top: calc(100% + 8px); background: #ffffff; border-radius: 12px; box-shadow: 0 15px 40px rgba(0,0,0,0.15); width: 320px; z-index: 100; border: 1px solid rgba(0,0,0,0.05); display: flex; flex-direction: column; overflow: hidden; }
    .pmy-date-presets { display: grid; grid-template-columns: 1fr 1fr; gap: 1px; background: #eee; }
    .pmy-date-preset-item { background: #ffffff; padding: 10px; font-size: 12px; font-weight: bold; cursor: pointer; text-align: center; color: var(--text-dark); transition: 0.2s; }
    .pmy-date-preset-item:hover { background: #f9f9f9; color: var(--primary-green); }
    .pmy-date-preset-item.active { background: #e6f2e6; color: var(--primary-green); }
    .pmy-date-custom { padding: 15px; display: flex; flex-direction: column; gap: 10px; background: #ffffff; }
    .pmy-date-custom-title { font-size: 12px; font-weight: 700; color: var(--text-muted); }
    .pmy-date-custom-inputs { display: flex; gap: 8px; align-items: center; }
    .pmy-date-custom-inputs input { flex: 1; padding: 8px; border: 1px solid #ddd; border-radius: 6px; font-family: inherit; font-size: 13px; color: var(--text-dark); outline: none; }
    .pmy-date-custom-inputs input:focus { border-color: var(--primary-green); }
    .pmy-date-apply-btn { background: var(--primary-green); color: #fff; border: none; padding: 9px; border-radius: 6px; font-weight: bold; cursor: pointer; font-size: 13px; transition: 0.2s; text-align: center; width: 100%; }
    .pmy-date-apply-btn:hover { background: var(--primary-hover); }
    .pmy-variants-form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 5px; }

    /* ESTILOS DO MODAL OPERACIONAL DE ALOCAÇÃO */
    .pmy-modal-overlay { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.4); backdrop-filter: blur(4px); display: flex; justify-content: center; align-items: center; z-index: 9999; }
    .pmy-modal { background: #ffffff; width: 600px; max-width: 90%; max-height: 85vh; border-radius: 16px; display: flex; flex-direction: column; overflow: hidden; box-shadow: 0 20px 50px rgba(0,0,0,0.15); }
    .pmy-modal-header { padding: 20px 25px; border-bottom: 1px solid #eee; display: flex; justify-content: space-between; align-items: center; }
    .pmy-modal-title { font-size: 20px; font-weight: 800; color: var(--primary-green); }
    .pmy-modal-close { background: none; border: none; font-size: 28px; cursor: pointer; color: #999; }
    .pmy-modal-body { padding: 25px; overflow-y: auto; flex: 1; }

    /* ESTILO DO GRID QUADRADO PARA A ABA DE GUIAS */
    .pmy-guides-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(130px, 1fr)); gap: 20px; }
    .pmy-guide-card-square { background: #fdfdfd; border: 1px solid #eee; border-radius: 16px; padding: 15px; display: flex; flex-direction: column; align-items: center; cursor: pointer; transition: 0.2s ease; text-align: center; }
    .pmy-guide-card-square:hover { border-color: var(--primary-green); transform: translateY(-3px); box-shadow: 0 8px 20px rgba(0,0,0,0.05); }
    .pmy-guide-square-img { width: 90px; height: 90px; border-radius: 16px; object-fit: cover; margin-bottom: 12px; background: #eee; }
    .pmy-guide-square-name { font-weight: 800; font-size: 14px; color: var(--text-dark); line-height: 1.2; }
  `;

  return (
    <>
      <style>{styles}</style>
      <div className="pmy-app-container">
        
        <aside className="pmy-sidebar">
          {/* LOGO AREA LIMPA SEM EDIT NA SIDEBAR */}
          <div className="pmy-logo-area">
            {logoUrl ? (
              <div className="pmy-logo-wrapper" style={{ cursor: 'default' }}>
                <img src={logoUrl} alt="Logo" className="pmy-logo-image" />
              </div>
            ) : (
              <div className="pmy-logo-placeholder" style={{ cursor: 'default' }}><span>PMY Logo</span></div>
            )}
          </div>

          <nav className="pmy-menu">
            <div className={`pmy-menu-item ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveTab('dashboard')}>{t.menu_dashboard}</div>
            <div className={`pmy-menu-item ${activeTab === 'agenda' ? 'active' : ''}`} onClick={() => setActiveTab('agenda')}>{t.menu_agenda}</div>
            <div className={`pmy-menu-item ${activeTab === 'integracoes' ? 'active' : ''}`} onClick={() => setActiveTab('integracoes')}>{t.menu_integrations}</div>
            <div className={`pmy-menu-item ${activeTab === 'guias' ? 'active' : ''}`} onClick={() => setActiveTab('guias')}>{t.menu_guides}</div>
            <div className={`pmy-menu-item ${activeTab === 'automacoes' ? 'active' : ''}`} onClick={() => setActiveTab('automacoes')}>{t.menu_automations || "🤖 Automações"}</div>
          </nav>

          <div className="pmy-sidebar-footer">
            <div style={{ width: '100%', padding: '5px 0' }}>
              <div className={`pmy-menu-item ${activeTab === 'configuracoes' ? 'active' : ''}`} style={{ margin: 0 }} onClick={() => setActiveTab('configuracoes')}>{t.menu_settings}</div>
            </div>
            <div className="pmy-lang-pill">
              <span className={lang === 'pt' ? 'active' : ''} onClick={() => setLang('pt')}><img src="https://flagcdn.com/w40/pt.png" alt="PT" className="pmy-flag-icon" /></span>
              <div className="pmy-lang-divider"></div>
              <span className={lang === 'en' ? 'active' : ''} onClick={() => setLang('en')}><img src="https://flagcdn.com/w40/gb.png" alt="EN" className="pmy-flag-icon" /></span>
            </div>
            <div className="pmy-credit-text">{t.created_by}</div>
          </div>
        </aside>

        <main className="pmy-content">
          
          <div className="pmy-header-top">
            <h1 className="pmy-page-title">
              {activeTab === 'dashboard' && t.dash_title}
              {activeTab === 'agenda' && t.agenda_title}
              {activeTab === 'integracoes' && t.integrations_title}
              {activeTab === 'guias' && t.guides_title}
              {activeTab === 'automacoes' && (t.automations_title || "Automações e Alertas")}
              {activeTab === 'configuracoes' && t.settings_title}
            </h1>
            
            {activeTab === 'dashboard' && (
              <div className="pmy-date-wrapper">
                <button className="pmy-date-btn" onClick={() => setIsDateMenuOpen(!isDateMenuOpen)}>📅 {getPeriodLabel()} ▾</button>
                {isDateMenuOpen && (
                  <>
                    <div className="pmy-date-overlay" onClick={() => setIsDateMenuOpen(false)}></div>
                    <div className="pmy-date-dropdown">
                      <div className="pmy-date-presets">
                        {["period_1w", "period_15d", "period_30d", "period_60d", "period_90d", "period_120d", "period_6m", "period_1y"].map(key => (
                          <div key={key} className={`pmy-date-preset-item ${selectedPeriod === key ? 'active' : ''}`} onClick={() => handlePresetSelection(key)}>{t[key]}</div>
                        ))}
                      </div>
                      <div className="pmy-date-custom">
                        <div className="pmy-date-custom-title">{t.period_custom}</div>
                        <div className="pmy-date-custom-inputs">
                          <input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)} title={t.date_from} />
                          <span style={{color: '#aaa'}}>-</span>
                          <input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} title={t.date_to} />
                        </div>
                        <button className="pmy-date-apply-btn" onClick={handleCustomDateApply}>{t.btn_apply}</button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {/* TAB 1: DASHBOARD COM HOVER RESTAURADOS */}
          {activeTab === 'dashboard' && (
            <div>
              <div className="pmy-grid">
                <div className="pmy-card has-hover" onClick={() => setActiveModal('sales')}><ExpandIcon /><div className="pmy-card-title">{t.dash_total_sales}</div><div className="pmy-card-value">{totalSalesCount}</div><div style={{ fontSize: '12px', color: '#888', marginTop: '5px' }}>+12% {t.dash_vs_last_month}</div></div>
                <div className="pmy-card has-hover" onClick={() => setActiveModal('confirmed')}><ExpandIcon /><div className="pmy-card-title">{t.dash_revenue_confirmed}</div><div className="pmy-card-value">€ {confirmedRevenueValue.toLocaleString('pt-BR')}</div></div>
                <div className="pmy-card has-hover" onClick={() => setActiveModal('estimated')}><ExpandIcon /><div className="pmy-card-title">{t.dash_revenue_estimated}</div><div className="pmy-card-value" style={{ color: '#c99a3c' }}>€ {estimatedRevenueValue.toLocaleString('pt-BR')}</div></div>
                <div className="pmy-card has-hover" onClick={() => setActiveModal('canceled')}><ExpandIcon /><div className="pmy-card-title">{t.dash_canceled_tours}</div><div className="pmy-card-value" style={{ color: '#cc0000' }}>{canceledCount}</div></div>
                <div className="pmy-card has-hover" onClick={() => setActiveModal('upcoming')}><ExpandIcon /><div className="pmy-card-title">{t.dash_upcoming}</div><div className="pmy-card-value">{upcomingCount}</div></div>
              </div>

              <div className="pmy-grid" style={{ gridTemplateColumns: '1fr' }}>
                <div className="pmy-card" style={{ padding: '0 25px 25px 25px' }}>
                  <div style={{ padding: '25px 0 10px 0', borderBottom: '2px solid #f0f0f0' }}>
                    <div className="pmy-card-title" style={{ fontSize: '18px', color: '#000', margin: 0 }}>{t.dash_performance}</div>
                  </div>

                  {categoriesData.map(category => {
                    const isOpen = openCategories.includes(category.name);
                    return (
                      <div key={category.name}>
                        <div className="pmy-accordion-header" onClick={() => toggleCategory(category.name)}>
                          <span className="pmy-accordion-title">{category.name}</span>
                          <span className="pmy-accordion-arrow">▼</span>
                        </div>
                        
                        <div className={`pmy-accordion-content ${isOpen ? 'open' : ''}`}>
                          {category.toursList.length === 0 ? (
                            <p style={{ padding: '10px 0', color: '#999', fontSize: '14px' }}>Nenhum passeio nesta categoria no banco de dados.</p>
                          ) : (
                            category.toursList.map(tour => {
                              const tourBookings = tour?.bookings || [];
                              const viatorViews = tourBookings.filter(b => b.platform === 'VIATOR').length * 24; 
                              const gygViews = tourBookings.filter(b => b.platform === 'GETYOURGUIDE').length * 32;
                              const siteViews = tourBookings.filter(b => b.platform === 'SHOPIFY').length * 12;

                              return (
                                <div className="pmy-tour-item" key={tour.id}>
                                  <div className={`pmy-tour-img ${imageShape}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', background: '#f9f2f2' }}>🏰</div>
                                  <div className="pmy-tour-details">
                                    <div className="pmy-tour-name">{tour.title || "Tour sem título"}</div>
                                    <div className="pmy-tag-row">
                                      <span className="pmy-tag viator">{t.source_viator}: {viatorViews || 120} {t.views}</span>
                                      <span className="pmy-tag gyg">{t.source_gyg}: {gygViews || 340} {t.views}</span>
                                      <span className="pmy-tag site">{t.source_site}: {siteViews || 45} {t.views}</span>
                                    </div>
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: AGENDA CENTRALIZADA */}
          {activeTab === 'agenda' && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px', marginBottom: '30px' }}>
                
                <div className="pmy-form-box">
                  <h3>{t.form_new_booking}</h3>
                  <form onSubmit={handleGeneratePaymentLink}>
                    <div className="pmy-form-group">
                      <label>{t.form_customer}</label>
                      <input type="text" className="pmy-form-input" value={custName} onChange={(e)=>setCustName(e.target.value)} required />
                    </div>
                    <div className="pmy-form-group">
                      <label>{t.form_email}</label>
                      <input type="email" className="pmy-form-input" value={custEmail} onChange={(e)=>setCustEmail(e.target.value)} />
                    </div>
                    <div className="pmy-form-group">
                      <label>{t.form_phone}</label>
                      <input type="tel" className="pmy-form-input" value={custPhone} onChange={(e)=>setCustPhone(e.target.value)} />
                    </div>
                    <div className="pmy-form-group">
                      <label>{t.form_select_tour}</label>
                      <select className="pmy-form-input" value={selectedTour} onChange={(e)=>handleTourSelectionChange(e.target.value)} required>
                        <option value="">-- {t.form_select_tour} --</option>
                        {tours?.map(tour => <option key={tour.id} value={tour.id}>{tour.title}</option>)}
                      </select>
                    </div>

                    {selectedTour && (
                      <div className="pmy-form-group">
                        <label>{t.form_lang}</label>
                        <select className="pmy-form-input" value={custLang} onChange={(e)=>setCustLang(e.target.value)}>
                          {activeTourLanguages.map(language => (
                            <option key={language} value={language}>{language}</option>
                          ))}
                        </select>
                      </div>
                    )}

                    {selectedTour && (
                      <div className="pmy-form-group" style={{ background: '#fefefe', padding: '15px', borderRadius: '8px', border: '1px solid #eee' }}>
                        <label style={{ color: 'var(--primary-green)' }}>🛒 Ingressos por Variantes do Produto:</label>
                        <div className="pmy-variants-form-grid">
                          {activeProductVariants.includes("adulto") && (
                            <div>
                              <label style={{ fontSize: '11px' }}>Adulto</label>
                              <input type="number" className="pmy-form-input" min="0" value={tourVariants.adulto} onChange={(e)=>setTourVariants({...tourVariants, adulto: parseInt(e.target.value) || 0})} />
                            </div>
                          )}
                          {activeProductVariants.includes("jovem") && (
                            <div>
                              <label style={{ fontSize: '11px' }}>Jovem</label>
                              <input type="number" className="pmy-form-input" min="0" value={tourVariants.jovem} onChange={(e)=>setTourVariants({...tourVariants, jovem: parseInt(e.target.value) || 0})} />
                            </div>
                          )}
                          {activeProductVariants.includes("crianca") && (
                            <div>
                              <label style={{ fontSize: '11px' }}>Criança</label>
                              <input type="number" className="pmy-form-input" min="0" value={tourVariants.crianca} onChange={(e)=>setTourVariants({...tourVariants, crianca: parseInt(e.target.value) || 0})} />
                            </div>
                          )}
                          {activeProductVariants.includes("senior") && (
                            <div>
                              <label style={{ fontSize: '11px' }}>Senior</label>
                              <input type="number" className="pmy-form-input" min="0" value={tourVariants.senior} onChange={(e)=>setTourVariants({...tourVariants, senior: parseInt(e.target.value) || 0})} />
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    <button type="submit" className="pmy-btn-submit">{t.form_btn_link}</button>
                  </form>

                  {generatedLink && (
                    <div style={{ marginTop: '15px', padding: '12px', background: '#e6f2e6', border: '1px solid var(--primary-green)', borderRadius: '8px', wordBreak: 'break-all' }}>
                      <strong style={{ fontSize: '13px', color: 'var(--primary-green)', display: 'block', marginBottom: '4px' }}>Link de Rascunho de Pedido (Shopify Checkout):</strong>
                      <a href={generatedLink} target="_blank" rel="noreferrer" style={{ fontSize: '13px', color: '#0055cc' }}>{generatedLink}</a>
                    </div>
                  )}
                </div>

                <div className="pmy-form-box">
                  <h3>{t.form_new_block}</h3>
                  <form onSubmit={(e) => e.preventDefault()}>
                    <div className="pmy-form-group">
                      <label>{t.form_select_tour}</label>
                      <select className="pmy-form-input" value={blockTourId} onChange={(e)=>handleBlockTourSelectionChange(e.target.value)} required>
                        <option value="">-- {t.form_select_tour} --</option>
                        {tours?.map(tour => <option key={tour.id} value={tour.id}>{tour.title}</option>)}
                      </select>
                    </div>

                    <div className="pmy-form-group">
                      <label>{t.block_days_week}</label>
                      <input type="text" className="pmy-form-input" placeholder="Ex: 0, 1 (Travar Domingo e Segunda Sempre)" value={blockRecurringDays} onChange={(e)=>setBlockRecurringDays(e.target.value)} />
                    </div>

                    <div className="pmy-form-group">
                      <label>{t.form_date_time}</label>
                      <input type="date" className="pmy-form-input" value={blockDateTime} onChange={(e)=>setBlockDateTime(e.target.value)} />
                    </div>

                    {blockTourId && (
                      <div className="pmy-form-group">
                        <label>{t.block_select_hour}</label>
                        <select className="pmy-form-input" value={blockSelectedHour} onChange={(e)=>setBlockSelectedHour(e.target.value)}>
                          <option value="ALL">Bloquear Todos os Horários</option>
                          {tourAvailableHours.map(hour => (
                            <option key={hour} value={hour}>Bloquear apenas {hour}</option>
                          ))}
                        </select>
                      </div>
                    )}

                    <button type="submit" className="pmy-btn-submit" style={{ background: '#2b2b2b' }}>{t.form_btn_block}</button>
                  </form>
                </div>
              </div>

              <div className="pmy-form-box">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '15px' }}>
                  
                  <div className="pmy-calendar-month-selector-bar">
                    <button type="button" className="pmy-calendar-nav-arrow-btn" onClick={handlePrevMonth}>◀</button>
                    <div className="pmy-calendar-current-month-year-label">{currentMonthLabel} {currentYear}</div>
                    <button type="button" className="pmy-calendar-nav-arrow-btn" onClick={handleNextMonth}>▶</button>
                  </div>
                  
                  <div className="pmy-calendar-view-tabs">
                    <button type="button" className={`pmy-cal-tab ${calendarView === '1d' ? 'active' : ''}`} onClick={() => setCalendarView('1d')}>{t.view_1d}</button>
                    <button type="button" className={`pmy-cal-tab ${calendarView === '3d' ? 'active' : ''}`} onClick={() => setCalendarView('3d')}>{t.view_3d}</button>
                    <button type="button" className={`pmy-cal-tab ${calendarView === '7d' ? 'active' : ''}`} onClick={() => setCalendarView('7d')}>{t.view_7d}</button>
                    <button type="button" className={`pmy-cal-tab ${calendarView === 'month' ? 'active' : ''}`} onClick={() => setCalendarView('month')}>{t.view_month}</button>
                  </div>
                </div>

                {calendarView === "month" && (
                  <div className="pmy-calendar-week-headers">
                    <div>Seg</div><div>Ter</div><div>Qua</div><div>Qui</div><div>Sex</div><div>Sáb</div><div>Dom</div>
                  </div>
                )}

                <div className={`pmy-calendar-grid ${calendarView === 'month' ? 'month-view' : ''}`}>
                  {renderCalendarDays()}
                </div>

                <div style={{ borderTop: '1px solid #eee', paddingTop: '20px' }}>
                  <h4 style={{ fontSize: '16px', fontWeight: 'bold', color: 'var(--primary-green)', marginBottom: '15px' }}>📊 Controle Manual de Vagas por Tour (Vagas Ativas)</h4>
                  {tours?.map(tour => {
                    const capacity = tourCapacities[tour.id] !== undefined ? tourCapacities[tour.id] : 20;
                    return (
                      <div className="pmy-tour-item" key={tour.id}>
                        <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                          <div className={`pmy-tour-img ${imageShape}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>🏰</div>
                          <div>
                            <strong style={{ fontSize: '15px' }}>{tour.title}</strong>
                            <div style={{ fontSize: '12px', color: '#888', marginTop: '4px' }}>
                              Capacidade: {capacity} / 20 
                              {capacity === 0 && <span style={{ color: '#cc0000', fontWeight: 'bold', marginLeft: '10px' }}>🔒 BLOQUEADO AUTOMATICAMENTE (Lotação Esgotada)</span>}
                            </div>
                          </div>
                        </div>
                        <div className="pmy-capacity-controls">
                          <button type="button" className="pmy-cap-btn" onClick={() => handleCapacityChange(tour.id, -1)}>−</button>
                          <span style={{ fontWeight: 'bold', fontSize: '14px', width: '20px', textAlign: 'center' }}>{capacity}</span>
                          <button type="button" className="pmy-cap-btn" onClick={() => handleCapacityChange(tour.id, 1)}>+</button>
                        </div>
                      </div>
                    );
                  })}
                </div>

              </div>
            </div>
          )}

          {/* TAB 3: INTEGRAÇÕES */}
          {activeTab === 'integracoes' && (
            <div>
              <p style={{ color: 'var(--text-muted)', marginBottom: '30px', fontSize: '15px' }}>{t.int_subtitle}</p>
              <div className="pmy-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', marginBottom: '40px' }}>
                <div className="pmy-integration-card"><span className="pmy-int-badge">Active</span><div className="pmy-int-logo">🛍️</div><div className="pmy-int-name">Shopify Store</div><div className="pmy-int-desc">{t.int_desc_shopify}</div><button className="pmy-int-btn primary">{t.int_connected}</button></div>
                <div className="pmy-integration-card"><div className="pmy-int-logo">🧡</div><div className="pmy-int-name">Viator API</div><div className="pmy-int-desc">{t.int_desc_viator}</div><button className="pmy-int-btn">{t.int_configure}</button></div>
                <div className="pmy-integration-card"><div className="pmy-int-logo">💛</div><div className="pmy-int-name">GetYourGuide</div><div className="pmy-int-desc">{t.int_desc_gyg}</div><button className="pmy-int-btn">{t.int_connect}</button></div>
                <div className="pmy-integration-card"><div className="pmy-int-logo">🦉</div><div className="pmy-int-name">TripAdvisor</div><div className="pmy-int-desc">{t.int_desc_ta}</div><button className="pmy-int-btn">{t.int_connect}</button></div>
                {customIntegrations.map(custom => (
                  <div className="pmy-integration-card" key={custom.id}><span className="pmy-int-badge" style={{ background: '#fff0e6', color: '#ff6600' }}>Custom API</span><div className="pmy-int-logo">⚙️</div><div className="pmy-int-name">{custom.name}</div><div className="pmy-int-desc">Endpoint: {custom.url}</div></div>
                ))}
              </div>

              <div className="pmy-form-box" style={{ maxWidth: '600px', margin: '0 auto' }}>
                <h3>{t.int_custom_title}</h3>
                <form onSubmit={handleAddCustomIntegration}>
                  <div className="pmy-form-group"><label>{t.int_custom_name}</label><input type="text" className="pmy-form-input" placeholder="Ex: Agência Parceira LX" value={customName} onChange={(e) => setCustomName(e.target.value)} required /></div>
                  <div className="pmy-form-group"><label>{t.int_custom_url}</label><input type="url" className="pmy-form-input" placeholder="https://api.parceiro.com/v1/bookings" value={customUrl} onChange={(e) => setCustomUrl(e.target.value)} required /></div>
                  <div className="pmy-form-group"><label>{t.int_custom_key}</label><input type="password" className="pmy-form-input" placeholder="pmy_live_key_..." value={customKey} onChange={(e) => setCustomKey(e.target.value)} /></div>
                  <button type="submit" className="pmy-btn-submit" style={{ background: '#ff6600' }}>{t.int_custom_btn}</button>
                </form>
              </div>
            </div>
          )}

          {/* TAB 4: GUIAS */}
          {activeTab === 'guias' && (
            <div>
              <div className="pmy-form-box" style={{ maxWidth: '600px', margin: '0 auto 40px auto' }}>
                <h3>{t.form_new_guide}</h3>
                <form onSubmit={handleAddGuide}>
                  <div className="pmy-form-group">
                    <label>{t.form_guide_name}</label>
                    <input type="text" className="pmy-form-input" value={guideName} onChange={(e) => setGuideName(e.target.value)} required />
                  </div>
                  <div className="pmy-form-group">
                    <label>{t.form_guide_email}</label>
                    <input type="email" className="pmy-form-input" value={guideEmail} onChange={(e) => setGuideEmail(e.target.value)} />
                  </div>
                  
                  {/* SELETOR COM ISO GARANTIDO PARA WINDOWS */}
                  <div className="pmy-form-group">
                    <label>{translations[lang].form_guide_whatsapp || t.form_guide_whatsapp}</label>
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <select className="pmy-form-input" style={{ width: '130px' }} value={guideDdi} onChange={(e) => setGuideDdi(e.target.value)}>
                        {ddiList.map((ddi, idx) => (
                          <option key={idx} value={ddi.code}>{ddi.flag} {ddi.iso} {ddi.code}</option>
                        ))}
                      </select>
                      <input type="tel" className="pmy-form-input" placeholder="912 345 678" value={guideWhatsapp} onChange={(e) => setGuideWhatsapp(e.target.value)} required />
                    </div>
                  </div>

                  <div className="pmy-form-group">
                    <label>{t.form_guide_photo}</label>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                      <button type="button" className="pmy-format-btn" onClick={() => guidePhotoRef.current.click()}>Escolher Foto</button>
                      <input type="file" accept="image/*" onChange={handleGuidePhotoChange} style={{ display: 'none' }} ref={guidePhotoRef} />
                      {guidePhoto && <img src={guidePhoto} alt="preview" style={{ width: '40px', height: '40px', borderRadius: '8px', objectFit: 'cover' }} />}
                    </div>
                  </div>
                  <button type="submit" className="pmy-btn-submit" style={{ marginTop: '10px' }}>{t.btn_add_guide}</button>
                </form>
              </div>

              <div className="pmy-form-box">
                <h3 style={{ marginBottom: '25px' }}>{t.registered_guides_list}</h3>
                {guidesList.length === 0 ? (
                  <p style={{ color: '#999' }}>Nenhum guia cadastrado.</p>
                ) : (
                  <div className="pmy-guides-grid">
                    {guidesList.map(guide => (
                      <div className="pmy-guide-card-square" key={guide.id} onClick={() => { setSelectedGuideInfo(guide); setActiveModal('guideDetails'); }}>
                        <img src={guide.photo} alt={guide.name} className="pmy-guide-square-img" />
                        <div className="pmy-guide-square-name">{guide.name.split(' ')[0]}<br/>{guide.name.split(' ').slice(1).join(' ')}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="pmy-form-box">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f5f5f5', paddingBottom: '15px', marginBottom: '15px' }}>
                  <h3 style={{ borderBottom: 'none', margin: 0, padding: 0 }}>🚐 {translations[lang].upcoming_tours_list || t.upcoming_tours_list}</h3>
                  <div className="pmy-calendar-view-tabs" style={{ margin: 0 }}>
                    <button className={`pmy-cal-tab ${upcomingToursFilter === 'today' ? 'active' : ''}`} onClick={() => setUpcomingToursFilter('today')}>{translations[lang].filter_today || t.filter_today}</button>
                    <button className={`pmy-cal-tab ${upcomingToursFilter === '7d' ? 'active' : ''}`} onClick={() => setUpcomingToursFilter('7d')}>{t.view_7d}</button>
                    <button className={`pmy-cal-tab ${upcomingToursFilter === '15d' ? 'active' : ''}`} onClick={() => setUpcomingToursFilter('15d')}>15 dias</button>
                    <button className={`pmy-cal-tab ${upcomingToursFilter === '30d' ? 'active' : ''}`} onClick={() => setUpcomingToursFilter('30d')}>30 dias</button>
                  </div>
                </div>
                
                <div style={{ background: '#fdfdfd', padding: '15px', borderRadius: '8px', border: '1px solid #eee' }}>
                  {upcomingToursFilter === 'today' ? (
                    <div className="pmy-list-item" style={{ borderBottom: 'none' }}>
                      <span style={{ fontWeight: 'bold' }}>🏰 Fátima, Batalha e Nazaré</span>
                      <span style={{ fontSize: '12px', background: '#e6f2e6', color: 'var(--primary-green)', padding: '4px 10px', borderRadius: '20px' }}>Hoje, 14:00 (Guia: Renan)</span>
                    </div>
                  ) : (
                    <div>
                      <div className="pmy-list-item">
                        <span style={{ fontWeight: 'bold' }}>🏰 Fátima, Batalha e Nazaré</span>
                        <span style={{ fontSize: '12px', background: '#f5f5f5', padding: '4px 10px', borderRadius: '20px' }}>Amanhã, 09:00</span>
                      </div>
                      <div className="pmy-list-item">
                        <span style={{ fontWeight: 'bold' }}>🚶‍♂️ Walking Tour Lisboa</span>
                        <span style={{ fontSize: '12px', background: '#f5f5f5', padding: '4px 10px', borderRadius: '20px' }}>Daqui a 3 dias</span>
                      </div>
                      <div className="pmy-list-item" style={{ borderBottom: 'none' }}>
                        <span style={{ fontWeight: 'bold' }}>🏰 Sintra e Cascais</span>
                        <span style={{ fontSize: '12px', background: '#f5f5f5', padding: '4px 10px', borderRadius: '20px' }}>Daqui a 5 dias</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB NOVA: AUTOMAÇÕES */}
          {activeTab === 'automacoes' && (
            <div className="pmy-form-box">
              <h3>🤖 Automação de Alertas para Guias</h3>
              <p style={{ fontSize: '13px', color: '#666', marginBottom: '25px' }}>Configure as regras de envio de mensagens automáticas via WhatsApp e E-mail quando um guia for escalado.</p>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                <div style={{ padding: '20px', background: '#f9f9f9', border: '1px solid #eee', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <strong style={{ display: 'block', fontSize: '15px', color: 'var(--text-dark)' }}>Notificação de Novo Agendamento</strong>
                    <span style={{ fontSize: '13px', color: '#888' }}>Dispara um alerta imediato para o guia assim que você o colocar na escala da Agenda Central.</span>
                  </div>
                  <input type="checkbox" style={{ transform: 'scale(1.5)', cursor: 'pointer' }} defaultChecked />
                </div>

                <div style={{ padding: '20px', background: '#f9f9f9', border: '1px solid #eee', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <strong style={{ display: 'block', fontSize: '15px', color: 'var(--text-dark)' }}>Lembrete de Tour Próximo (24 horas antes)</strong>
                    <span style={{ fontSize: '13px', color: '#888' }}>Avisa o guia no dia anterior enviando dados do cliente e local de encontro.</span>
                  </div>
                  <input type="checkbox" style={{ transform: 'scale(1.5)', cursor: 'pointer' }} defaultChecked />
                </div>
                
                <button type="button" className="pmy-btn-submit" style={{ marginTop: '15px', width: 'auto', alignSelf: 'flex-start', padding: '10px 25px' }}>Salvar Regras de Automação</button>
              </div>
            </div>
          )}

          {/* TAB 5: CONFIGURAÇÕES OPERACIONAIS (LOGO E USUÁRIOS) */}
          {activeTab === 'configuracoes' && (
            <div style={{ display: 'grid', gap: '30px' }}>
              <div className="pmy-form-box">
                <h3>🎨 Configurações de Layout</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '25px', marginTop: '15px' }}>
                  
                  <div className="pmy-form-group">
                    <label>Logo da Agência (Aparecerá na barra lateral):</label>
                    <div style={{ display: 'flex', gap: '15px', alignItems: 'center', marginTop: '5px' }}>
                      <input type="file" accept="image/*" onChange={handleLogoChange} style={{ display: 'none' }} ref={fileInputRef} />
                      {logoUrl && <img src={logoUrl} alt="Logo Preview" style={{ height: '45px', objectFit: 'contain', background: '#f5f5f5', padding: '5px', borderRadius: '4px' }} />}
                      <button type="button" className="pmy-format-btn" onClick={() => fileInputRef.current.click()}>Carregar Nova Logo</button>
                      {logoUrl && <button type="button" className="pmy-format-btn" style={{ color: '#cc0000', background: '#ffe6e6' }} onClick={() => setLogoUrl(null)}>Remover</button>}
                    </div>
                  </div>

                  <div className="pmy-form-group">
                    <label>Formato de Recorte das Imagens de Perfil:</label>
                    <div style={{ display: 'flex', gap: '10px', marginTop: '5px' }}>
                      <button type="button" className="pmy-format-btn" style={{ background: imageShape === 'circle' ? 'var(--primary-green)' : '#f0f0f0', color: imageShape === 'circle' ? '#fff' : '#555' }} onClick={() => setImageShape('circle')}>Redonda</button>
                      <button type="button" className="pmy-format-btn" style={{ background: imageShape === 'rounded' ? 'var(--primary-green)' : '#f0f0f0', color: imageShape === 'rounded' ? '#fff' : '#555' }} onClick={() => setImageShape('rounded')}>Arredondada</button>
                    </div>
                  </div>

                  <div className="pmy-form-group">
                    <label>Tamanho da Fonte da Interface:</label>
                    <select className="pmy-form-input" style={{ maxWidth: '240px' }}><option>Padrão (Assistant)</option><option>Compacta</option></select>
                  </div>
                </div>
              </div>

              <div className="pmy-form-box">
                <h3>👥 Gestão de Usuários (Acessos)</h3>
                <p style={{ fontSize: '13px', color: '#666', marginBottom: '15px' }}>Gerencie quem da sua equipe administrativa pode acessar e editar a Agenda Central.</p>
                <div style={{ background: '#f9f9f9', padding: '15px', borderRadius: '8px', border: '1px solid #eee', marginBottom: '15px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <strong style={{ fontSize: '14px', display: 'block' }}>Nathalia Simeão</strong>
                      <span style={{ fontSize: '12px', color: '#888' }}>Admin (Acesso Total)</span>
                    </div>
                  </div>
                </div>
                <button type="button" className="pmy-btn-submit" style={{ width: 'auto', padding: '10px 20px', background: '#2b2b2b' }}>+ Convidar Novo Usuário</button>
              </div>
            </div>
          )}

        </main>
      </div>

      {renderModal()}
    </>
  );
}