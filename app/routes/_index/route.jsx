import { useState, useRef, useCallback, useEffect } from "react";
import { useLoaderData } from "react-router";
import { AppProvider } from "@shopify/shopify-app-react-router/react";

import DashboardTab from "../../components/pmy/DashboardTab";
import AgendaTab from "../../components/pmy/AgendaTab";
import IntegrationsTab from "../../components/pmy/IntegrationsTab";
import GuidesTab from "../../components/pmy/GuidesTab";
import SettingsTab from "../../components/pmy/SettingsTab";
import MediaTab from "../../components/pmy/MediaTab";
import { ConfirmDialog, Icon, ToastViewport } from "../../components/pmy/PmyUI";
import CentralModalLayer from "../../components/pmy/CentralModalLayer";
import { buildDashboardViewModel } from "../../utils/dashboard-view-model";
import { createCalendarModel } from "../../utils/calendar-model";
import { useBookingCheckout } from "../../hooks/useBookingCheckout";
import { buildCentralStyles } from "../../styles/pmy-central-style";
import { uploadFileToPmyMediaLibrary } from "../../utils/media-library.client";
import {
  DEFAULT_THEME,
  allPlatforms,
  contentPlatforms,
  ddiList,
  defaultMappings,
  getDashboardRangeForPeriod,
  getFlagUrl,
  getLisbonToday,
  internalFields,
  isDarkThemeColor,
  reservationPlatforms,
  translations,
} from "../../config/pmy-central-config";

export { loader, action } from "../../services/central-route.server";


function CentralDeReservasContent() {
  const { tours, bookings: initialBookings = [], bookingPage = null, blockedDates = [], shopifyProducts = [], shopName = "Minha Loja Shopify", mediaFiles = [], dbGuides = [], guideAssignments = [], guideShopifySync = null, shopifyWebhookStatus = null, gygIntegrationStatus = null, integrationCredentialStatus = null, businessSettings = null, platformFieldMappings = [] } = useLoaderData() || { tours: [], bookings: [], bookingPage: null, blockedDates: [], shopifyProducts: [], shopName: "Minha Loja Shopify", mediaFiles: [], dbGuides: [], guideAssignments: [], guideShopifySync: null, shopifyWebhookStatus: null, gygIntegrationStatus: null, integrationCredentialStatus: null, businessSettings: null, platformFieldMappings: [] };
  const [bookingsList, setBookingsList] = useState(initialBookings);
  const [bookingsLoading, setBookingsLoading] = useState(false);
  const [bookingsLoadError, setBookingsLoadError] = useState("");
  const bookingsRequestIdRef = useRef(0);
  const bookingFilterMountedRef = useRef(false);
  const bookings = bookingsList;

  // Abre modal interno de seleção de imagem (picker interno com busca)
  const openMediaLibraryPicker = useCallback((onSelect) => {
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

  // Feedback centralizado: substitui alert()/confirm() nativos por UI acessível.
  const [toastItems, setToastItems] = useState([]);
  const [confirmDialog, setConfirmDialog] = useState(null);
  const toastSequenceRef = useRef(0);
  const toastTimersRef = useRef(new Map());
  const confirmResolverRef = useRef(null);

  const dismissToast = useCallback((id) => {
    setToastItems((current) => current.filter((item) => item.id !== id));
    const timer = toastTimersRef.current.get(id);
    if (timer) window.clearTimeout(timer);
    toastTimersRef.current.delete(id);
  }, []);

  const notify = useCallback((message, tone = "info", duration = 4200) => {
    if (!message) return;
    const id = `pmy-toast-${++toastSequenceRef.current}`;
    setToastItems((current) => [...current.slice(-3), { id, message, tone }]);

    const timer = window.setTimeout(() => {
      setToastItems((current) => current.filter((item) => item.id !== id));
      toastTimersRef.current.delete(id);
    }, duration);
    toastTimersRef.current.set(id, timer);
  }, []);

  const requestConfirm = useCallback((options) => new Promise((resolve) => {
    confirmResolverRef.current?.(false);
    confirmResolverRef.current = resolve;
    setConfirmDialog(options);
  }), []);

  const settleConfirm = useCallback((accepted) => {
    const resolve = confirmResolverRef.current;
    confirmResolverRef.current = null;
    setConfirmDialog(null);
    resolve?.(accepted);
  }, []);

  useEffect(() => () => {
    toastTimersRef.current.forEach((timer) => window.clearTimeout(timer));
    toastTimersRef.current.clear();
    confirmResolverRef.current?.(false);
    confirmResolverRef.current = null;
  }, []);

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
  const legacyDataLogoMigrationRef = useRef(false);

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
  const [activeTourLanguages, setActiveTourLanguages] = useState(["Português", "English"]);
  const [generatedLink, setGeneratedLink] = useState("");
  const [bookingDate, setBookingDate] = useState("");
  const [bookingTime, setBookingTime] = useState("");
  const [draftOrderLoading, setDraftOrderLoading] = useState(false);
  const [draftOrderError, setDraftOrderError] = useState("");
  const [draftOrderInfo, setDraftOrderInfo] = useState(null);
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
  const [guidePhotoMediaId, setGuidePhotoMediaId] = useState(null);
  const [guidePhotoUploading, setGuidePhotoUploading] = useState(false);
  const [guidePhotoUploadError, setGuidePhotoUploadError] = useState("");
  // Perfis editoriais vêm do metaobjeto Shopify; contato/UTM e escala
  // continuam operacionais dentro da Central.
  const [guidesList, setGuidesList] = useState(
    dbGuides.length > 0
      ? dbGuides.map(g => ({
          id: g.id,
          name: g.name,
          email: g.email || "",
          whatsapp: g.whatsapp || "",
          photo: g.photoUrl || "https://via.placeholder.com/150",
          photoMediaId: g.photoMediaId || null,
          description: g.description || "",
          videoUrl: g.videoUrl || "",
          galleryUrls: Array.isArray(g.galleryUrls) ? g.galleryUrls : [],
          exclusiveProducts: Array.isArray(g.exclusiveProducts) ? g.exclusiveProducts : [],
          shopifyMetaobjectId: g.shopifyMetaobjectId || null,
          shopifyHandle: g.shopifyHandle || "",
          shopifyActive: Boolean(g.shopifyActive),
          shopifyUpdatedAt: g.shopifyUpdatedAt || null,
          source: g.source || "CENTRAL",
          utmId: g.utmId || "",
          referralLink: g.referralLink || "",
        }))
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
  const [editGuidePhotoMediaId, setEditGuidePhotoMediaId] = useState(null);
  const editGuidePhotoRef = useRef(null);

  // H. INTEGRAÇÕES CUSTOMIZADAS

  // BANCO DE MÍDIA
  // A biblioteca é carregada somente quando a aba/picker precisa dela.
  const [mediaList, setMediaList] = useState(mediaFiles);
  const [mediaLoaded, setMediaLoaded] = useState(mediaFiles.length > 0);
  const [mediaLoading, setMediaLoading] = useState(false);
  const [mediaLoadError, setMediaLoadError] = useState("");
  const [mediaPage, setMediaPage] = useState(0);
  const [mediaHasMore, setMediaHasMore] = useState(false);
  const [showShopifySource, setShowShopifySource] = useState(true);
  const [mediaFilter, setMediaFilter] = useState("all"); // all | logo | guide | tour | general
  const [mediaUploading, setMediaUploading] = useState(false);
  const [mediaUploadProgress, setMediaUploadProgress] = useState(0);
  const [mediaUploadError, setMediaUploadError] = useState("");
  const [mediaLabelInput, setMediaLabelInput] = useState("");
  const [mediaCategoryInput, setMediaCategoryInput] = useState("general");
  const [mediaPreview, setMediaPreview] = useState(null); // modal de preview
  const mediaUploadRef = useRef(null);
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
      connected: Boolean(gygIntegrationStatus?.trafficVerified),
      configured: Boolean(gygIntegrationStatus?.credentialsReady),
      status: gygIntegrationStatus?.trafficVerified
        ? "CONNECTED"
        : gygIntegrationStatus?.credentialsReady
          ? "CONFIGURED"
          : null,
      accountName: "PMY Supplier API v1",
      lastSync: gygIntegrationStatus?.lastTrafficAt
        ? formatCredentialCheck(gygIntegrationStatus.lastTrafficAt)
        : gygIntegrationStatus?.credentialsReady
          ? "Aguardando tráfego real"
          : "Credenciais pendentes",
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
  const [gygConfigOptions, setGygConfigOptions] = useState({});
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
      try { localStorage.setItem("pmy_sidebar_collapsed", next ? "1" : "0"); } catch { /* Storage may be blocked in embedded contexts. */ }
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

  const {
    realConfirmedBookings,
    realCanceledBookings,
    dashboardBookingStatusSummary,
    moneyValue,
    bookingCurrency,
    revenueByCurrency,
    revenueCurrencies,
    dashboardCurrency,
    confirmedRevenueValue,
    pricedConfirmedBookings,
    missingFinancialBookings,
    averageTicketValue,
    formatMoney,
    platformLabel,
    salesByChannel,
    totalSalesCount,
    dashboardTrendGranularity,
    dashboardTrendData,
    canceledCount,
    cancellationRate,
    upcomingCount,
    upcomingDepartures,
    tourOptions,
    dashboardUpcomingDepartures,
    operationalCapacity,
    criticalDepartures,
    categoriesData,
  } = buildDashboardViewModel({
    bookings,
    selectedPeriod,
    customStart,
    customEnd,
    lang,
    tours,
    shopifyProducts,
  });

  // ---- HANDLERS / sincronização ----
  const resourceUrl = useCallback((pathname) => {
    const current = new URL(window.location.href);
    const target = new URL(pathname, current.origin);

    // Nunca reaproveitar id_token/session da URL: os tokens Shopify são
    // curtos e precisam ser renovados a cada chamada autenticada.
    for (const key of ["shop", "host", "embedded"]) {
      const value = current.searchParams.get(key);
      if (value && !target.searchParams.has(key)) {
        target.searchParams.set(key, value);
      }
    }

    return `${target.pathname}${target.search}`;
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

  const loadBookingsForRange = useCallback(async (start, end) => {
    const requestId = ++bookingsRequestIdRef.current;
    setBookingsLoading(true);
    setBookingsLoadError("");

    try {
      let page = 1;
      let hasMore = true;
      let collected = [];
      let lastPage = null;

      while (hasMore && page <= 20) {
        const params = new URLSearchParams({
          start: new Date(start).toISOString(),
          end: new Date(end).toISOString(),
          page: String(page),
          pageSize: "200",
        });
        const payload = await requestResourceJson(
          `/api/bookings?${params.toString()}`,
        );

        if (requestId !== bookingsRequestIdRef.current) return;

        collected = [
          ...collected,
          ...(Array.isArray(payload?.items) ? payload.items : []),
        ];
        lastPage = payload?.page || null;
        hasMore = Boolean(payload?.page?.hasMore);
        page += 1;
      }

      if (requestId !== bookingsRequestIdRef.current) return;

      const unique = new Map(
        collected
          .filter((booking) => booking?.id)
          .map((booking) => [booking.id, booking]),
      );
      setBookingsList([...unique.values()]);

      if (hasMore) {
        setBookingsLoadError(
          lang === "en"
            ? "This period has more than 4,000 bookings. Narrow the date range for a complete view."
            : "Este período possui mais de 4.000 reservas. Reduza o intervalo para uma visão completa.",
        );
      } else if (lastPage?.total != null && collected.length < Number(lastPage.total)) {
        setBookingsLoadError(
          lang === "en"
            ? "Some bookings could not be loaded for this period."
            : "Parte das reservas deste período não pôde ser carregada.",
        );
      }
    } catch (error) {
      if (requestId !== bookingsRequestIdRef.current) return;
      setBookingsLoadError(
        error?.message ||
          (lang === "en"
            ? "Could not load bookings for this period."
            : "Não foi possível carregar as reservas deste período."),
      );
    } finally {
      if (requestId === bookingsRequestIdRef.current) {
        setBookingsLoading(false);
      }
    }
  }, [lang, requestResourceJson]);

  const bookingFilterKey =
    selectedPeriod === "period_custom"
      ? `${selectedPeriod}:${customStart}:${customEnd}`
      : selectedPeriod;

  useEffect(() => {
    const firstRun = !bookingFilterMountedRef.current;
    if (firstRun) {
      bookingFilterMountedRef.current = true;
      if (!bookingPage?.hasMore) return;
    }

    if (
      selectedPeriod === "period_custom" &&
      (!customStart || !customEnd)
    ) {
      return;
    }

    const range = getDashboardRangeForPeriod(
      selectedPeriod,
      customStart,
      customEnd,
    );
    loadBookingsForRange(range.start, range.end);
  }, [
    bookingFilterKey,
    bookingPage?.hasMore,
    customEnd,
    customStart,
    loadBookingsForRange,
    selectedPeriod,
  ]);

  const loadMediaLibrary = useCallback(async ({
    reset = false,
    refreshShopify = false,
  } = {}) => {
    if (mediaLoading) return;

    setMediaLoading(true);
    setMediaLoadError("");

    try {
      let payload;
      if (refreshShopify) {
        const formData = new FormData();
        formData.append("_action", "refreshShopify");
        payload = await requestResourceJson("/api/media-library", formData);
      } else {
        const nextPage = reset ? 1 : Math.max(1, mediaPage + 1);
        const params = new URLSearchParams({
          page: String(nextPage),
          pageSize: "60",
        });
        payload = await requestResourceJson(
          `/api/media-library?${params.toString()}`,
        );
      }

      const items = Array.isArray(payload?.items) ? payload.items : [];
      setMediaList((current) => {
        if (reset || refreshShopify) return items;
        const merged = new Map(
          [...current, ...items]
            .filter((item) => item?.id)
            .map((item) => [item.id, item]),
        );
        return [...merged.values()];
      });
      setMediaPage(Number(payload?.page?.current || 1));
      setMediaHasMore(Boolean(payload?.page?.hasMore));
      setMediaLoaded(true);
    } catch (error) {
      setMediaLoadError(
        error?.message ||
          (lang === "en"
            ? "Could not load the media library."
            : "Não foi possível carregar a biblioteca de mídia."),
      );
    } finally {
      setMediaLoading(false);
    }
  }, [lang, mediaLoading, mediaPage, requestResourceJson]);

  useEffect(() => {
    const needsMedia =
      activeTab === "midias" || activeModal === "pickPhotoForGuide";
    if (!needsMedia || mediaLoaded || mediaLoading) return;
    loadMediaLibrary({ reset: true });
  }, [
    activeModal,
    activeTab,
    loadMediaLibrary,
    mediaLoaded,
    mediaLoading,
  ]);

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
    const dashboardActive = activeTab === "dashboard";
    const integrationLogsActive =
      activeTab === "integracoes" && intSubTab === "logs";

    if (!dashboardActive && !integrationLogsActive) return undefined;

    loadSyncQueue();
    if (integrationLogsActive) loadShopifyValidation();

    const queueTimer = window.setInterval(
      loadSyncQueue,
      integrationLogsActive ? 15000 : 30000,
    );
    const validationTimer = integrationLogsActive
      ? window.setInterval(() => {
          loadShopifyValidation();
        }, ["WAITING", "CANCELLATION_WAITING"].includes(shopifyValidation?.status) ? 3000 : 15000)
      : null;

    return () => {
      window.clearInterval(queueTimer);
      if (validationTimer) window.clearInterval(validationTimer);
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

  const {
    getBookingTimesForTour,
    handleGeneratePaymentLink,
    variantMatchesBookingTime,
  } = useBookingCheckout({
    bookingDate,
    bookingTime,
    custEmail,
    custLang,
    custName,
    custPhone,
    requestResourceJson,
    selectedTour,
    setDraftOrderError,
    setDraftOrderInfo,
    setDraftOrderLoading,
    setGeneratedLink,
    tourOptions,
    tourVariants,
  });

  const handleAddGuide = async (e) => {
    e.preventDefault();
    if (!guideName || !guideWhatsapp) return;
    const whatsapp = `${guideDdi} ${guideWhatsapp}`;
    const photoUrl = guidePhoto || null;
    const photoMediaId = guidePhotoMediaId || null;
    const utmContent = guideName.toLowerCase().replace(/\s+/g,"_").replace(/[^a-z0-9_]/g,"");
    const referralLink = guideUtmId
      ? `https://portugalmeandyou.com/?utm_campaign=${guideUtmId}&utm_source=guia&utm_medium=indicacao&utm_content=${utmContent}`
      : "";
    const tempId = `temp_${Date.now()}`;
    const newGuide = { id: tempId, name: guideName, email: guideEmail, whatsapp, photo: photoUrl || "https://via.placeholder.com/150", photoMediaId, utmId: guideUtmId, referralLink };
    setGuidesList(prev => [...prev, newGuide]);
    setGuideName(""); setGuideEmail(""); setGuideWhatsapp(""); setGuidePhoto(null); setGuidePhotoMediaId(null); setGuideUtmId("");
    try {
      const fd = new FormData();
      fd.append("_action", "saveGuide");
      fd.append("name", guideName);
      fd.append("email", guideEmail || "");
      fd.append("whatsapp", whatsapp);
      fd.append("utmId", guideUtmId || "");
      if (photoUrl) fd.append("photoUrl", photoUrl);
      if (photoMediaId) fd.append("photoMediaId", photoMediaId);
      const res = await fetch(window.location.href, { method: "POST", body: fd });
      const data = await res.json();
      if (data.success) window.location.reload();
    } catch { /* The form keeps its local state when the request fails. */ }
  };

  const handleOpenEditGuide = (guide) => {
    setGuidePhotoUploadError("");
    setEditingGuide(guide.id);
    setEditGuideName(guide.name);
    setEditGuideEmail(guide.email || "");
    const parts = (guide.whatsapp || "").split(" ");
    setEditGuideDdi(parts[0] || "+351");
    setEditGuideWhatsapp(parts.slice(1).join(" ") || "");
    setEditGuidePhoto(guide.photo || null);
    setEditGuidePhotoMediaId(guide.photoMediaId || null);
    setEditGuideUtmId(guide.utmId || "");
  };

  const handleSaveEditGuide = async (e) => {
    e.preventDefault();
    if (!editGuideName) return;
    const whatsapp = editGuideWhatsapp.trim()
      ? `${editGuideDdi} ${editGuideWhatsapp.trim()}`
      : "";
    const currentGuide = guidesList.find((guide) => guide.id === editingGuide);
    const shopifyManaged = Boolean(currentGuide?.shopifyMetaobjectId);
    const effectiveName = shopifyManaged ? currentGuide.name : editGuideName;
    const editUtmContent = effectiveName
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g,"_")
      .replace(/[^a-z0-9_]/g,"");
    const editReferralLink = editGuideUtmId
      ? `https://portugalmeandyou.com/?utm_campaign=${editGuideUtmId}&utm_source=guia&utm_medium=indicacao&utm_content=${editUtmContent}`
      : "";

    if (!String(editingGuide).startsWith("temp_")) {
      try {
        const fd = new FormData();
        fd.append("_action", "saveGuide");
        fd.append("id", editingGuide);
        fd.append("name", effectiveName);
        fd.append("email", editGuideEmail || "");
        fd.append("whatsapp", whatsapp);
        fd.append("utmId", editGuideUtmId || "");
        if (!shopifyManaged && editGuidePhoto) fd.append("photoUrl", editGuidePhoto);
        if (!shopifyManaged && editGuidePhotoMediaId) fd.append("photoMediaId", editGuidePhotoMediaId);

        const res = await fetch(window.location.href, { method: "POST", body: fd });
        const data = await res.json();
        if (!res.ok || !data?.success) {
          notify(data?.error || ui("Não foi possível salvar o guia.", "Could not save guide."), "danger");
          return;
        }

        setGuidesList(prev => prev.map(g =>
          g.id === editingGuide
            ? {
                ...g,
                name: shopifyManaged ? g.name : editGuideName,
                email: editGuideEmail,
                whatsapp,
                photo: shopifyManaged ? g.photo : (editGuidePhoto || g.photo),
                photoMediaId: shopifyManaged ? g.photoMediaId : editGuidePhotoMediaId,
                utmId: editGuideUtmId,
                referralLink: editReferralLink,
              }
            : g
        ));
      } catch (error) {
        notify(error?.message || ui("Erro ao salvar guia.", "Error saving guide."), "danger");
        return;
      }
    }
    setEditingGuide(null);
  };

  const handleDeleteGuide = async (id) => {
    const guide = guidesList.find((item) => item.id === id);
    if (guide?.shopifyMetaobjectId) {
      notify(
        ui(
          "Este guia é gerenciado pelo Shopify. Remova ou desative a entrada no metaobjeto Guias.",
          "This guide is managed by Shopify. Remove or disable the entry in the Guides metaobject.",
        ),
        "warning",
      );
      return;
    }
    const confirmed = await requestConfirm({
      title: ui("Remover guia?", "Remove guide?"),
      description: ui(
        "O guia será removido da Central e esta ação não poderá ser desfeita.",
        "The guide will be removed from the Central and this action cannot be undone.",
      ),
      confirmLabel: ui("Remover guia", "Remove guide"),
      cancelLabel: ui("Cancelar", "Cancel"),
      tone: "danger",
    });
    if (!confirmed) return;

    if (!String(id).startsWith("temp_")) {
      try {
        const fd = new FormData();
        fd.append("_action", "deleteGuide");
        fd.append("id", id);
        const res = await fetch(window.location.href, { method: "POST", body: fd });
        const data = await res.json();
        if (!res.ok || !data?.success) {
          notify(data?.error || ui("Não foi possível remover o guia.", "Could not remove guide."), "danger");
          return;
        }
      } catch (error) {
        notify(error?.message || ui("Erro ao remover guia.", "Error removing guide."), "danger");
        return;
      }
    }

    setGuidesList(prev => prev.filter(g => g.id !== id));
    setEditingGuide(null);
  };

  const handleEditGuidePhotoChange = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setGuidePhotoUploading(true);
    setGuidePhotoUploadError("");
    try {
      const media = await uploadFileToPmyMediaLibrary({
        file,
        category: "guide",
        label: `Foto guia - ${editGuideName || "Guia"}`,
        requestResourceJson,
      });
      setEditGuidePhoto(media.url);
      setEditGuidePhotoMediaId(media.id);
      setMediaList((current) => [
        media,
        ...current.filter((item) => item.id !== media.id),
      ]);
    } catch (error) {
      setGuidePhotoUploadError(
        error?.message || "Não foi possível enviar a foto do guia.",
      );
    } finally {
      setGuidePhotoUploading(false);
    }
  };

  // HANDLERS DE MÍDIA
  const handleMediaUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setMediaUploading(true);
    setMediaUploadError("");
    setMediaUploadProgress(20);

    try {
      const media = await uploadFileToPmyMediaLibrary({
        file,
        category: mediaCategoryInput,
        label: mediaLabelInput || file.name.replace(/\.[^/.]+$/, ""),
        requestResourceJson,
      });

      setMediaUploadProgress(100);
      setMediaList((current) => [
        media,
        ...current.filter((item) => item.id !== media.id),
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
    const confirmed = await requestConfirm({
      title: ui("Remover mídia?", "Remove media?"),
      description: ui(
        "A mídia será removida da biblioteca PMY. Referências já usadas no sistema podem deixar de exibir a imagem.",
        "The media will be removed from the PMY library. Existing references may stop displaying the image.",
      ),
      confirmLabel: ui("Remover mídia", "Remove media"),
      cancelLabel: ui("Cancelar", "Cancel"),
      tone: "danger",
    });
    if (!confirmed) return;

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
    navigator.clipboard.writeText(url)
      .then(() => notify(ui("URL copiada!", "URL copied!"), "success"))
      .catch(() => notify(ui("Não foi possível copiar a URL.", "Could not copy the URL."), "danger"));
  };

  const handleTogglePlatformSelection = (key, stateArr, setStateArr) => {
    setStateArr(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
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
    if (legacyDataLogoMigrationRef.current || !businessSettings) return;

    const candidates = [
      {
        variant: "light",
        value: businessSettings.logoOnLightUrl || businessSettings.logoUrl || "",
      },
      {
        variant: "dark",
        value: businessSettings.logoOnDarkUrl || "",
      },
    ].filter((item) => String(item.value || "").startsWith("data:"));

    if (candidates.length === 0) return;
    legacyDataLogoMigrationRef.current = true;

    let cancelled = false;

    (async () => {
      try {
        for (const candidate of candidates) {
          const response = await fetch(candidate.value);
          const blob = await response.blob();
          const extension =
            blob.type === "image/svg+xml"
              ? "svg"
              : blob.type === "image/webp"
                ? "webp"
                : blob.type === "image/jpeg"
                  ? "jpg"
                  : "png";
          const file = new File(
            [blob],
            `pmy-logo-${candidate.variant}.${extension}`,
            { type: blob.type || "image/png" },
          );

          const media = await uploadFileToPmyMediaLibrary({
            file,
            category: "logo",
            label:
              candidate.variant === "dark"
                ? "Logo para fundo escuro"
                : "Logo para fundo claro",
            requestResourceJson,
          });

          if (cancelled) return;

          const mediaField =
            candidate.variant === "dark"
              ? "logoOnDarkMediaId"
              : "logoOnLightMediaId";
          const urlField =
            candidate.variant === "dark"
              ? "logoOnDarkUrl"
              : "logoOnLightUrl";

          await persistBusinessSettings({
            [mediaField]: media.id,
            [urlField]: media.url,
            ...(candidate.variant === "light" ? { logoUrl: null } : {}),
          });

          if (cancelled) return;
          if (candidate.variant === "dark") setLogoOnDarkUrl(media.url);
          else setLogoOnLightUrl(media.url);

          setMediaList((current) => [
            media,
            ...current.filter((item) => item.id !== media.id),
          ]);
        }

        if (!cancelled) {
          setSettingsSaveMessage(
            "Logo antiga migrada para a Biblioteca PMY ✓",
          );
        }
      } catch (error) {
        console.error("[PMY] legacy Data URL logo migration failed:", error);
        if (!cancelled) {
          setSettingsSaveMessage(
            "Erro: a logo antiga precisa ser reenviada para a Biblioteca PMY.",
          );
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [businessSettings, persistBusinessSettings, requestResourceJson]);

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

    if (legacyLogo && !String(legacyLogo).startsWith("data:")) {
      setLogoOnLightUrl(legacyLogo);
    }
    if (legacyTheme && typeof legacyTheme === "object") {
      setTheme({ ...DEFAULT_THEME, ...legacyTheme });
    }

    persistBusinessSettings({
      ...(legacyLogo && !String(legacyLogo).startsWith("data:")
        ? { logoOnLightUrl: legacyLogo }
        : {}),
      ...(legacyTheme ? { theme: { ...DEFAULT_THEME, ...legacyTheme } } : {}),
    })
      .then(() => {
        try {
          localStorage.removeItem("pmy_logo_url");
          localStorage.removeItem("pmy_theme");
        } catch { /* Legacy localStorage cleanup is best-effort only. */ }
      })
      .catch((error) => {
        console.error("[PMY] legacy settings migration failed:", error);
      });
  }, [businessSettings, persistBusinessSettings]);

  // BRAND LOGO: usa exatamente o mesmo pipeline persistente da Biblioteca PMY.
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
    setSettingsSaveMessage("Enviando logo para a Biblioteca PMY...");

    try {
      const media = await uploadFileToPmyMediaLibrary({
        file,
        category: "logo",
        label:
          variant === "dark"
            ? "Logo para fundo escuro"
            : "Logo para fundo claro",
        requestResourceJson,
      });

      const mediaField =
        variant === "dark"
          ? "logoOnDarkMediaId"
          : "logoOnLightMediaId";
      const urlField =
        variant === "dark"
          ? "logoOnDarkUrl"
          : "logoOnLightUrl";

      await persistBusinessSettings({
        [mediaField]: media.id,
        [urlField]: media.url,
        ...(variant === "light" ? { logoUrl: null } : {}),
      });

      if (variant === "dark") setLogoOnDarkUrl(media.url);
      else setLogoOnLightUrl(media.url);

      setMediaList((current) => [
        media,
        ...current.filter((item) => item.id !== media.id),
      ]);
      setSettingsSaveMessage("Logo salva na Biblioteca PMY ✓");
    } catch (error) {
      console.error("[PMY] brand logo upload failed:", error);
      setSettingsSaveMessage(
        error?.message || "Erro ao salvar a logo.",
      );
    } finally {
      setLogoUploadingVariant(null);
    }
  }, [persistBusinessSettings, requestResourceJson]);

  const handleBrandLogoChange = (variant, event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    uploadBusinessLogo(variant, file);
    event.target.value = "";
  };

  const handleRemoveBrandLogo = async (variant) => {
    try {
      const mediaField =
        variant === "dark"
          ? "logoOnDarkMediaId"
          : "logoOnLightMediaId";
      const urlField =
        variant === "dark"
          ? "logoOnDarkUrl"
          : "logoOnLightUrl";

      await persistBusinessSettings({
        [mediaField]: null,
        [urlField]: null,
        ...(variant === "light" ? { logoUrl: null } : {}),
      });

      if (variant === "dark") setLogoOnDarkUrl(null);
      else setLogoOnLightUrl(null);

      setSettingsSaveMessage("Logo desvinculada ✓");
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
  const handleGuidePhotoChange = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setGuidePhotoUploading(true);
    setGuidePhotoUploadError("");
    try {
      const media = await uploadFileToPmyMediaLibrary({
        file,
        category: "guide",
        label: `Foto guia - ${guideName || "Guia"}`,
        requestResourceJson,
      });
      setGuidePhoto(media.url);
      setGuidePhotoMediaId(media.id);
      setMediaList((current) => [
        media,
        ...current.filter((item) => item.id !== media.id),
      ]);
    } catch (error) {
      setGuidePhotoUploadError(
        error?.message || "Não foi possível enviar a foto do guia.",
      );
    } finally {
      setGuidePhotoUploading(false);
    }
  };
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
      setActiveTourLanguages(["Português","English","Español"]);
    } else if (title.includes("french") || title.includes("français")) {
      setActiveTourLanguages(["Português","English","Français"]);
    } else {
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
    const timeRegex = /\b(\d{1,2}[:h]\d{2})(?:\s*[hH])?\b/g;
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

  const {
    getBookingPassengers,
    getCalendarDayAssignments,
    getCalendarDayBlocks,
    getCalendarDayBookings,
    getCalendarDayStats,
    getLisbonBookingParts,
    guideAssignmentDateKey,
  } = createCalendarModel({
    blockedDates,
    bookings,
    currentMonth,
    currentYear,
    guideAssignmentsList,
    selectedCalendarDay,
    tours,
  });

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
    const confirmed = await requestConfirm({
      title: ui("Remover escala?", "Remove assignment?"),
      description: ui(
        "A atribuição deste guia para a saída selecionada será removida.",
        "This guide assignment will be removed from the selected departure.",
      ),
      confirmLabel: ui("Remover escala", "Remove assignment"),
      cancelLabel: ui("Cancelar", "Cancel"),
      tone: "danger",
    });
    if (!confirmed) return;

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
    const confirmed = await requestConfirm({
      title: ui("Remover bloqueio?", "Remove block?"),
      description: ui(
        "A disponibilidade central voltará a considerar esta data/horário para novas reservas.",
        "Central availability will consider this date/time for new bookings again.",
      ),
      confirmLabel: ui("Remover bloqueio", "Remove block"),
      cancelLabel: ui("Cancelar", "Cancel"),
      tone: "danger",
    });
    if (!confirmed) return;

    try {
      const fd = new FormData();
      fd.append("_action", "removeBlock");
      fd.append("id", id);
      const res = await fetch(window.location.href, { method: "POST", body: fd });
      const result = await res.json();
      if (!res.ok || !result.success) {
        notify(result.error || ui("Não foi possível remover o bloqueio.", "Could not remove the block."), "danger");
        return;
      }
      window.location.reload();
    } catch (err) {
      notify(err?.message || ui("Erro ao remover bloqueio.", "Error removing block."), "danger");
    }
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
    const timeRegex = /\b(\d{1,2}[:h]\d{2})(?:\s*[hH])?\b/g;
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
        notify(result.error || ui("Não foi possível salvar a capacidade.", "Could not save capacity."), "danger");
      }
    } catch (err) {
      setTourCapacities(prev => ({ ...prev, [id]: cur }));
      notify(err?.message || ui("Erro ao salvar a capacidade.", "Error saving capacity."), "danger");
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
    setGygConfigOptions(
      Object.fromEntries(
        (tour?.variants || []).map((variant) => [
          variant.id,
          variant.gygOptionId || "",
        ]),
      ),
    );
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
      fd.append("gygOptionMappings", JSON.stringify(gygConfigOptions));
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
    const confirmed = await requestConfirm({
      title: ui("Remover credencial?", "Remove credential?"),
      description: ui(
        `A credencial armazenada de ${platformName} será apagada da Central.`,
        `The stored ${platformName} credential will be removed from the Central.`,
      ),
      confirmLabel: ui("Remover credencial", "Remove credential"),
      cancelLabel: ui("Cancelar", "Cancel"),
      tone: "danger",
    });
    if (!confirmed) return;

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
        <button
          type="button"
          key={key}
          className={`pmy-calendar-day ${selectedCalendarDay===day?'active':''}`}
          onClick={() => { setSelectedCalendarDay(day); setModalSelectedTour(""); setModalSelectedGuide(""); setGuideAssignmentMessage(""); setIsFormAllocating(false); setActiveModal('calendarDay'); }}
        >
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
        </button>
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

    const styles = buildCentralStyles(theme);



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

            <div className="pmy-lang-pill" role="group" aria-label={ui("Idioma da interface", "Interface language")}>
              <button type="button" className={lang==='pt'?'active':''} aria-pressed={lang==='pt'} aria-label="Português" onClick={() => setLang('pt')}>
                <img src="https://flagcdn.com/w40/pt.png" alt="" aria-hidden="true" className="pmy-flag-icon" />
              </button>
              <div className="pmy-lang-divider" aria-hidden="true"></div>
              <button type="button" className={lang==='en'?'active':''} aria-pressed={lang==='en'} aria-label="English" onClick={() => setLang('en')}>
                <img src="https://flagcdn.com/w40/gb.png" alt="" aria-hidden="true" className="pmy-flag-icon" />
              </button>
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
                    <button type="button" className="pmy-date-overlay" aria-label={ui("Fechar filtro de período", "Close period filter")} onClick={() => setIsDateMenuOpen(false)}></button>
                    <div className="pmy-date-dropdown">
                      <div className="pmy-date-presets">
                        {["period_1w","period_15d","period_30d","period_60d","period_90d","period_120d","period_6m","period_1y"].map(k => (
                          <button type="button" key={k} className={`pmy-date-preset-item ${selectedPeriod===k?'active':''}`} aria-pressed={selectedPeriod===k} onClick={() => handlePresetSelection(k)}>{t[k]}</button>
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
            salesByChannel, bookings, bookingsLoading, bookingsLoadError, categoriesData, toggleCategory, openCategories, realConfirmedBookings,
            dashboardBookingStatusSummary, dashboardTrendData, dashboardTrendGranularity, dashboardCurrency, imageShape,
            operationalCapacity, criticalDepartures, platformConnections, reservationPlatforms, platformLabel,
            syncQueueData, syncQueueLoading, syncQueueError
          }} />

          <AgendaTab {...{
            activeTab, activeTourLanguages, blockDateTime, blockMessage, blockPlatforms,
            blockRecurringDays, blockSaving, blockSelectedHour, blockTourId, blockedDates,
            bookingDate, bookingTime, calendarView, currentMonthLabel,
            currentYear, custEmail, custLang, custName, custPhone, draftOrderError,
            draftOrderInfo, draftOrderLoading, generatedLink, getBookingTimesForTour,
            getLisbonToday, handleBlockTourSelectionChange, handleCapacityChange,
            handleCreateBlock, handleGeneratePaymentLink, handleNextMonth, handlePrevMonth,
            handleRemoveBlock, handleTogglePlatformSelection, handleTourSelectionChange,
            imageShape, platformConnections, renderCalendarDays, reservationPlatforms,
            selectedTour, setBlockDateTime, setBlockPlatforms, setBlockRecurringDays,
            setBlockSelectedHour, setBookingDate, setBookingTime,
            setCalendarView, setCustEmail, setCustLang, setCustName, setCustPhone,
            setDraftOrderInfo, setGeneratedLink, setTourVariants, t, tourAvailableHours,
            tourCapacities, tourOptions, tourVariants, tours, variantMatchesBookingTime, lang
          }} />

          <IntegrationsTab {...{
            activeTab, activeProdPlatform, allPlatforms, bookings, contentPlatforms,
            formatSyncTime, handleDisconnect, handleOpenConnect,
            handleRequeueSyncJob, handleSyncPlatformNow, intSubTab,
            lang, loadSyncQueue, manualSyncError, manualSyncPlatform, manualSyncResult,
            platformConnections, platformProducts, reservationPlatforms, runSyncQueueNow,
            setActiveProdPlatform, setIntSubTab,
            syncEventLabel, syncProviderMeta, syncQueueActionId, syncQueueData, syncQueueError,
            syncQueueLastLoaded, syncQueueLoading, syncStatusMeta,
            shopifyValidation, shopifyValidationError, shopifyValidationLoading,
            shopifyValidationCancelLoading, cancelShopifyValidation,
            loadShopifyValidation, startShopifyValidation, t, tours
          }} />

          <GuidesTab {...{
            activeTab, ddiList, getFlagUrl, guideAssignments: guideAssignmentsList,
            guideShopifySync,
            guideDdi, guideEmail, guideName, guidePhoto,
            guidePhotoRef, guideUtmId, guideWhatsapp, guidesList, handleAddGuide,
            handleDeleteGuide, handleGuidePhotoChange, handleOpenEditGuide,
            openMediaLibraryPicker, setActiveModal, setGuideDdi, setGuideEmail,
            setGuideName, setGuidePhoto, setGuideUtmId, setGuideWhatsapp,
            setSelectedGuideInfo, setUpcomingToursFilter, t, upcomingToursFilter, lang
          }} />

          <SettingsTab {...{
            activeMappingPlatform, activeTab, allPlatforms, defaultMappings, fieldMappings,
            logoLightInputRef, logoDarkInputRef, handleBrandLogoChange, handleRemoveBrandLogo,
            handleThemeChange, handleRestoreThemeDefaults, handleImageShapeChange,
            handleSaveFieldMappings, handleResetFieldMappings, handleUpdateFieldMapping,
            imageShape, internalFields, logoOnLightUrl, logoOnDarkUrl, logoUploadingVariant,
            sidebarIsDark, activeSidebarLogoUrl, mappingSaveState, platformConnections,
            reservationPlatforms, setActiveMappingPlatform, settingsSaveMessage,
            t, theme, lang
          }} />

          <MediaTab {...{
            activeTab, handleCopyMediaUrl, handleDeleteMedia, handleMediaUpload,
            mediaCategoryInput, mediaFilter, mediaLabelInput, mediaList, mediaPreview,
            mediaLoading, mediaLoadError, mediaHasMore, loadMediaLibrary,
            mediaUploadError, mediaUploadProgress, mediaUploadRef, mediaUploading, setActiveModal,
            setMediaCategoryInput, setMediaFilter, setMediaLabelInput, setMediaList,
            setMediaPreview, setShowShopifySource, showShopifySource, lang
          }} />

          </div>
        </main>
      </div>

      <CentralModalLayer {...{
        activeModal,
        apiKeyInput,
        apiSecretInput,
        averageTicketValue,
        bookingCurrency,
        bookings,
        canceledCount,
        cancellationRate,
        confirmedRevenueValue,
        connectingPlatform,
        currentMonthLabel,
        currentYear,
        dashboardCurrency,
        editGuideDdi,
        editGuideEmail,
        editGuideName,
        editGuidePhoto,
        editGuidePhotoRef,
        editGuideUtmId,
        editGuideWhatsapp,
        editingGuide,
        formatMoney,
        getBookingPassengers,
        getCalendarDayAssignments,
        getCalendarDayBlocks,
        getCalendarDayBookings,
        getCalendarDayStats,
        getLisbonBookingParts,
        getPeriodLabel,
        guideAssignmentMessage,
        guideAssignmentSaving,
        guideAssignmentsList,
        guidePhotoUploadError,
        guidePhotoUploading,
        guidesList,
        gygConfigActivityId,
        gygConfigOptions,
        gygConfigCutoff,
        gygConfigMessage,
        gygConfigPriceOverApi,
        gygConfigSaving,
        gygConfigSchedule,
        gygConfigTimezone,
        gygConfigTourId,
        gygIntegrationStatus,
        handleConfirmConnect,
        handleDeleteGuide,
        handleDisconnect,
        handleEditGuidePhotoChange,
        handleGygTourSelection,
        handleModalTourChange,
        handleRemoveGuideAssignment,
        handleSaveEditGuide,
        handleSaveGuideAssignment,
        handleSaveGygTourConfig,
        handleSyncPlatformNow,
        handleTestIntegrationCredential,
        integrationCredentialLoading,
        integrationCredentialMessage,
        integrationCredentialStatus,
        integrationEnvironmentInput,
        isFormAllocating,
        lang,
        manualSyncPlatform,
        mediaList,
        missingFinancialBookings,
        modalAvailableHours,
        modalSelectedGuide,
        modalSelectedHour,
        modalSelectedTour,
        moneyValue,
        openMediaLibraryPicker,
        platformConnections,
        platformLabel,
        platformTokenGuide,
        pricedConfirmedBookings,
        realCanceledBookings,
        realConfirmedBookings,
        revenueByCurrency,
        revenueCurrencies,
        salesByChannel,
        selectedCalendarDay,
        selectedGuideInfo,
        setActiveModal,
        setApiKeyInput,
        setApiSecretInput,
        setConnectingPlatform,
        setEditGuideDdi,
        setEditGuideEmail,
        setEditGuideName,
        setEditGuidePhoto,
        setEditGuidePhotoMediaId,
        setGuidePhotoUploadError,
        setEditGuideUtmId,
        setEditGuideWhatsapp,
        setEditingGuide,
        setGygConfigActivityId,
        setGygConfigOptions,
        setGygConfigCutoff,
        setGygConfigPriceOverApi,
        setGygConfigSchedule,
        setGygConfigTimezone,
        setIntegrationEnvironmentInput,
        setIsFormAllocating,
        setModalSelectedGuide,
        setModalSelectedHour,
        shopifyWebhookStatus,
        t,
        totalSalesCount,
        tourOptions,
        tours,
        ui,
        upcomingCount,
        upcomingDepartures,
        notify,
      }} />

      <ToastViewport
        toasts={toastItems}
        onDismiss={dismissToast}
        closeLabel={ui("Fechar notificação", "Dismiss notification")}
      />

      <ConfirmDialog
        open={Boolean(confirmDialog)}
        title={confirmDialog?.title || ui("Confirmar ação", "Confirm action")}
        description={confirmDialog?.description || ""}
        confirmLabel={confirmDialog?.confirmLabel || ui("Confirmar", "Confirm")}
        cancelLabel={confirmDialog?.cancelLabel || ui("Cancelar", "Cancel")}
        tone={confirmDialog?.tone || "danger"}
        onConfirm={() => settleConfirm(true)}
        onCancel={() => settleConfirm(false)}
      />
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
