import { buildTourColorAliases } from "../../utils/tour-matching.js";
import { isGuide, normalizeAreas } from "../../utils/team-areas.js";
import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { useLocation } from "react-router";
import { departureKey } from "../../components/pmy/DepartureTagsSection";
import MentionsBell from "../../components/pmy/MentionsBell";
import { normalizeFeatureFlags } from "../../utils/feature-flags";
import { normalizeAgendaLabels, tourColor, contrastText } from "../../utils/agenda-labels.js";
import { useLoaderData } from "react-router";
import { AppProvider } from "@shopify/shopify-app-react-router/react";

import DashboardTab from "../../components/pmy/DashboardTab";
import GygDeactivationAlerts from "../../components/pmy/GygDeactivationAlerts";
import AgendaTab from "../../components/pmy/AgendaTab";
import IntegrationsTab from "../../components/pmy/IntegrationsTab";
import GuidesTab from "../../components/pmy/GuidesTab";
import SettingsTab from "../../components/pmy/SettingsTab";
import { ConfirmDialog, DatePicker, Icon, ToastViewport } from "../../components/pmy/PmyUI";
import CentralModalLayer from "../../components/pmy/CentralModalLayer";
import { buildDashboardViewModel } from "../../utils/dashboard-view-model";
import { createCalendarModel } from "../../utils/calendar-model";
import { extractTourLanguages } from "../../utils/tour-languages";
import { normalizeLanguageQuotaRules } from "../../utils/language-quotas";
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

export const headers = () => ({
  "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
  Pragma: "no-cache",
  Expires: "0",
});

function CentralDeReservasContent() {
  const { tours, bookings: initialBookings = [], bookingPage = null, blockedDates = [], shopifyProducts = [], shopName = "Minha Loja Shopify", mediaFiles = [], dbGuides = [], guideAssignments = [], guideShopifySync = null, shopifyWebhookStatus = null, gygIntegrationStatus = null, integrationCredentialStatus = null, businessSettings = null, platformFieldMappings = [], tourDepartures = [], supportCards: initialSupportCards = [], waitlistEntries = [], centralUser = null, centralUsers = [] } = useLoaderData() || { tours: [], bookings: [], bookingPage: null, blockedDates: [], shopifyProducts: [], shopName: "Minha Loja Shopify", mediaFiles: [], dbGuides: [], guideAssignments: [], guideShopifySync: null, shopifyWebhookStatus: null, gygIntegrationStatus: null, integrationCredentialStatus: null, businessSettings: null, platformFieldMappings: [] };
  const [bookingsList, setBookingsList] = useState(initialBookings);
  const [costSettings, setCostSettings] = useState(() => businessSettings?.costSettings || null);
  const [bookingsLoading, setBookingsLoading] = useState(false);
  const [bookingsLoadError, setBookingsLoadError] = useState("");
  const bookingsRequestIdRef = useRef(0);
  const tourLanguageRequestIdRef = useRef(0);
  const bookingFilterMountedRef = useRef(false);
  const bookings = bookingsList;

  // Abre modal interno de seleção de imagem (picker interno com busca)
  const openMediaLibraryPicker = useCallback((onSelect) => {
    // Armazena callback para usar quando usuário selecionar
    window.__pmyPickerCallback = onSelect;
    setActiveModal('pickPhotoForGuide');
  }, []);

  // A. NAVEGAÇÃO
  // A aba aberta fica no endereço (?tab=) e no navegador: recarregar volta para a mesma aba.
  const location = useLocation();
  const initialNavKey = (() => {
    const value = new URLSearchParams(location.search || "").get("tab") || "";
    return /^[a-z_-]{2,30}$/.test(value) ? value : "";
  })();
  const [activeTab, setActiveTab] = useState(initialNavKey === "quadro" ? "agenda" : (initialNavKey || "dashboard"));
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
  const [blockPlatforms, setBlockPlatforms] = useState(["shopify"]); // Default seguro: canais desconectados nunca entram automaticamente no bloqueio

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
  const [modalSelectedLanguages, setModalSelectedLanguages] = useState([]);
  const [guideAssignmentSaving, setGuideAssignmentSaving] = useState(false);
  const [guideAssignmentMessage, setGuideAssignmentMessage] = useState("");
  const [guideAssignmentsList, setGuideAssignmentsList] = useState(guideAssignments || []);
  const [isFormAllocating, setIsFormAllocating] = useState(false);

  // F. NAVEGAÇÃO DO CALENDÁRIO
  // A Agenda abre sempre no mês/dia atual de Portugal, nunca em uma data fixa.
  const [currentMonth, setCurrentMonth] = useState(() => getLisbonToday().monthIndex);
  const [currentYear, setCurrentYear] = useState(() => getLisbonToday().year);
  const [calendarView, setCalendarView] = useState(initialNavKey === "quadro" ? "board" : "month");
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
          portalEnabled: Boolean(g.portalEnabled),
          portalHasPassword: Boolean(g.portalHasPassword),
          sales90d: g.sales90d || null,
          areas: normalizeAreas(g.areas).length ? normalizeAreas(g.areas) : ["GUIA"],
        }))
      : []
  );
  // Equipe: só quem tem a área GUIA entra na escala, no Quadro e nos seletores de guia.
  const scheduleGuides = useMemo(() => guidesList.filter(isGuide), [guidesList]);
  const [centralUsersList, setCentralUsersList] = useState(centralUsers);
  const [editGuideAreas, setEditGuideAreas] = useState(["GUIA"]);
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
  const [, setMediaLoadError] = useState("");
  const [mediaPage, setMediaPage] = useState(0);
  const [, setMediaHasMore] = useState(false);
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
  // Produtos por plataforma.
  // Shopify vem do catálogo remoto. No GetYourGuide a Supplier API é inbound/push:
  // as reservas chegam normalmente, mas não existe um "listar catálogo remoto" para
  // preencher esta tela. Por isso exibimos desde o carregamento os tours mestre já
  // mapeados ao GYG, usando o mesmo conjunto auditado pelo sync manual.
  const initialGygProducts = (tours || []).flatMap((tour) =>
    (tour.gygProductOptions || [])
      .filter((option) => option.active !== false)
      .map((option) => {
        const optionVariants = (option.variants || []).filter(
          (variant) => variant.active !== false,
        );
        const prices = optionVariants
          .map((variant) => Number(variant.price))
          .filter((value) => Number.isFinite(value) && value > 0);
        const minPrice = prices.length ? Math.min(...prices) : null;
        const currency =
          optionVariants.find((variant) => variant.currency)?.currency || "EUR";
        const scheduleSlots = [
          ...new Set(
            optionVariants
              .map((variant) => variant.startTimeSlot)
              .filter(Boolean),
          ),
        ].sort();

        return {
          id: option.id,
          masterTourTitle: tour.title,
          optionTitle: option.title,
          name: option.title
            ? `${tour.title} · ${option.title}`
            : tour.title,
          active: tour.shopifyStatus !== "INACTIVE" && option.active !== false,
          synced: Boolean(option.gygOptionId),
          gygMappingStatus: option.gygOptionId ? "MAPPED" : "UNMAPPED",
          gygRemoteStatus: "NOT_VERIFIED",
          sku: option.gygOptionId || option.id,
          price:
            minPrice != null
              ? `${currency === "EUR" ? "€" : `${currency} `}${minPrice.toFixed(0)}`
              : "—",
          variants: optionVariants,
          scheduleSlots,
          masterTourId: tour.id,
          gygOptionId: option.gygOptionId || null,
        };
      }),
  );

  const [platformProducts, setPlatformProducts] = useState({
    shopify:      shopifyProducts,
    viator:       [],
    getyourguide: initialGygProducts,
    headout:      [],
    civitatis:    [],
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
      ...providerConnectionFromStatus("TRIPADVISOR", false),
      contentOnly: true,
      accountName: "Tripadvisor Terra",
      lastSync:
        providerConnectionFromStatus("TRIPADVISOR", false).lastSync ||
        "Não é canal de reservas",
    },
    headout: {
      connected: false,
      configured: false,
      available: false,
      onboardingPending: true,
      awaitingExternalResponse: true,
      requestReference: "#28980",
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
  const [viatorOnboardingStatus, setViatorOnboardingStatus] = useState(null);
  const [viatorCatalog, setViatorCatalog] = useState(null);
  const [viatorOnboardingLoading, setViatorOnboardingLoading] = useState(false);
  const [viatorOnboardingError, setViatorOnboardingError] = useState("");
  const [viatorMappingBusy, setViatorMappingBusy] = useState(null);
  const [civitatisOnboardingStatus, setCivitatisOnboardingStatus] = useState(null);
  const [civitatisOnboardingLoading, setCivitatisOnboardingLoading] = useState(false);
  const [civitatisOnboardingError, setCivitatisOnboardingError] = useState("");
  const [tripadvisorContent, setTripadvisorContent] = useState(null);
  const [tripadvisorContentLoading, setTripadvisorContentLoading] = useState(false);
  const [tripadvisorContentError, setTripadvisorContentError] = useState("");

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
  // Perfis: ADMIN vê tudo; STAFF (equipe) não vê Integrações, Configurações
  // nem as áreas restritas da Visão geral. O servidor também bloqueia.
  const isCentralAdmin = !centralUser || String(centralUser.role || "").toUpperCase() === "ADMIN";
  const ADMIN_TABS = ["integracoes", "configuracoes"];
  const navItems = [
    { key: "dashboard", icon: "dashboard", label: lang === "pt" ? "Visão geral" : "Overview" },
    { key: "agenda", icon: "calendar", label: lang === "pt" ? "Agenda Central" : "Central Agenda" },
    { key: "quadro", icon: "bookings", label: lang === "pt" ? "Quadro" : "Board" },
    { key: "integracoes", icon: "link", label: lang === "pt" ? "Integrações" : "Integrations" },
    { key: "guias", icon: "users", label: lang === "pt" ? "Equipe" : "Team" },
  ].filter((item) => isCentralAdmin || !ADMIN_TABS.includes(item.key));

  const openNavigationTab = (key) => {
    if (!isCentralAdmin && ADMIN_TABS.includes(key)) return;
    if (key === "agenda") { handleOpenAgenda(); if (calendarView === "board") setCalendarView("month"); }
    else if (key === "quadro") { handleOpenAgenda(); setCalendarView("board"); }
    else setActiveTab(key);
    setMobileNavOpen(false);
  };

  const navKey = activeTab === "agenda" && calendarView === "board" ? "quadro" : activeTab;
  // Calendário → "Editar no Quadro": abre o Quadro já no dia e no cartão.
  const [boardFocus, setBoardFocus] = useState(null);
  const openInBoard = (focus) => {
    setBoardFocus({ ...focus, nonce: Date.now() });
    setCalendarView("board");
    try { window.scrollTo({ top: 0 }); } catch { /* ok */ }
  };
  const navRestoredRef = useRef(false);
  // Sem ?tab= no endereço: volta para a última aba usada neste navegador.
  useEffect(() => {
    if (navRestoredRef.current) return;
    navRestoredRef.current = true;
    if (initialNavKey) return;
    let saved = "";
    try { saved = localStorage.getItem("pmy_active_tab") || ""; } catch { /* armazenamento bloqueado */ }
    if (!saved || saved === "dashboard" || !/^[a-z_-]{2,30}$/.test(saved)) return;
    if (!isCentralAdmin && ADMIN_TABS.includes(saved)) return;
    if (saved === "quadro") { setActiveTab("agenda"); setCalendarView("board"); }
    else setActiveTab(saved);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!navRestoredRef.current) return;
    try { localStorage.setItem("pmy_active_tab", navKey); } catch { /* armazenamento bloqueado */ }
    try {
      const url = new URL(window.location.href);
      if (url.searchParams.get("tab") !== navKey) {
        url.searchParams.set("tab", navKey);
        window.history.replaceState(window.history.state, "", url.toString());
      }
    } catch { /* sem history */ }
  }, [navKey]);

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
    dashboardStatusBookings,
    attentionDepartures,
    profitSummary,
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
    costSettings,
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
    const headers = {
      Accept: "application/json",
      "X-Requested-With": "XMLHttpRequest",
    };

    // O App Bridge normalmente intercepta fetch() e injeta o ID token sozinho,
    // mas alguns contextos embedded podem não aplicar essa interceptação.
    // Quando disponível, enviamos um token novo explicitamente para tornar
    // as resource routes determinísticas e evitar redirects HTML de autenticação.
    try {
      const idToken = await window.shopify?.idToken?.();
      if (idToken) headers.Authorization = `Bearer ${idToken}`;
    } catch {
      // Mantém o fetch compatível com a interceptação automática do App Bridge.
    }

    const targetUrl = resourceUrl(pathname);
    const response = await fetch(targetUrl, {
      method: formData ? "POST" : "GET",
      body: formData || undefined,
      credentials: "include",
      headers,
    });

    const contentType = String(response.headers.get("content-type") || "").toLowerCase();
    const bodyText = await response.text();

    if (!contentType.includes("application/json")) {
      const location = response.url || targetUrl;
      if (/<!doctype|<html/i.test(bodyText)) {
        throw new Error(
          `A chamada autenticada retornou HTML em vez de JSON (HTTP ${response.status}). Destino: ${location}`,
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
    const needsMedia = activeModal === "pickPhotoForGuide";
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

    if (!isCentralAdmin) return undefined;
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
      await requestResourceJson("/api/guides", fd);
      window.location.reload();
    } catch (error) {
      notify(
        error?.message || ui("Erro ao salvar guia.", "Error saving guide."),
        "danger",
      );
    }
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
    setEditGuideAreas(guide.areas?.length ? guide.areas : ["GUIA"]);
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
        fd.append("areas", JSON.stringify(editGuideAreas.length ? editGuideAreas : ["GUIA"]));
        if (!shopifyManaged && editGuidePhoto) fd.append("photoUrl", editGuidePhoto);
        if (!shopifyManaged && editGuidePhotoMediaId) fd.append("photoMediaId", editGuidePhotoMediaId);

        await requestResourceJson("/api/guides", fd);

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
                areas: editGuideAreas.length ? editGuideAreas : ["GUIA"],
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
        await requestResourceJson("/api/guides", fd);
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

    const payload = await requestResourceJson("/api/central-actions", fd);

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
      const payload = await requestResourceJson("/api/central-actions", fd);

      if (!payload?.success) {
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

  const handleTourSelectionChange = async (id) => {
    const requestId = ++tourLanguageRequestIdRef.current;

    setSelectedTour(id);
    setTourVariants({ adulto:0, jovem:0, crianca:0, senior:0 });
    setGeneratedLink("");
    setDraftOrderInfo(null);
    setDraftOrderError("");

    const tour = tourOptions.find(t => t.id === id);
    const availableTimes = getBookingTimesForTour(tour);
    setBookingTime(availableTimes[0] || "");

    const applyLanguages = (languages) => {
      if (requestId !== tourLanguageRequestIdRef.current) return;

      const nextLanguages = languages.length > 0
        ? languages
        : ["Português", "English"];

      setActiveTourLanguages(nextLanguages);
      setCustLang((current) =>
        nextLanguages.some(
          (language) =>
            String(language).localeCompare(String(current), undefined, {
              sensitivity: "base",
            }) === 0,
        )
          ? current
          : nextLanguages[0],
      );
    };

    // Usa o catálogo persistido para uma resposta imediata, mas sempre
    // confirma no Shopify para produtos Shopify. Assim um snapshot antigo
    // (ou um fallback PT/EN salvo antes) nunca ganha da fonte real.
    const cachedLanguages = extractTourLanguages(tour);
    if (cachedLanguages.length > 0) {
      applyLanguages(cachedLanguages);
    }

    if (String(tour?.id || "").startsWith("gid://shopify/Product/")) {
      try {
        const payload = await requestResourceJson(
          `/api/tour-languages?productId=${encodeURIComponent(tour.id)}&ts=${Date.now()}`,
        );

        if (requestId !== tourLanguageRequestIdRef.current) return;
        const liveLanguages = Array.isArray(payload?.languages)
          ? payload.languages.filter(Boolean)
          : [];

        if (liveLanguages.length > 0) {
          applyLanguages(liveLanguages);
          return;
        }
      } catch (error) {
        console.warn("[PMY] tour language lookup failed", error);
      }
    }

    // Só cai no fallback quando nenhuma fonte real trouxe idioma.
    if (cachedLanguages.length === 0) {
      applyLanguages(["Português", "English"]);
    }
  };

  const handleModalTourChange = (id) => {
    setModalSelectedTour(id);
    setModalSelectedLanguages([]);
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
      fd.append("languages", JSON.stringify(modalSelectedLanguages));

      const result = await requestResourceJson("/api/guides", fd);

      setGuideAssignmentsList((current) => [
        ...current.filter((item) => item.id !== result.assignment.id),
        result.assignment,
      ].sort((a, b) => new Date(a.startTime) - new Date(b.startTime)));
      setGuideAssignmentMessage(result.message || "Escala publicada.");
      setIsFormAllocating(false);
      setModalSelectedTour("");
      setModalSelectedGuide("");
      setModalSelectedLanguages([]);
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
      const result = await requestResourceJson("/api/guides", fd);

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

      const result = await requestResourceJson("/api/availability-blocks", fd);

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
      await requestResourceJson("/api/availability-blocks", fd);
      window.location.reload();
    } catch (err) {
      notify(err?.message || ui("Erro ao remover bloqueio.", "Error removing block."), "danger");
    }
  };

  const handleBlockTourSelectionChange = (id) => {
    setBlockTourId(id);
    setBlockSelectedHour("ALL");
    const tour = tourOptions.find(t => t.id === id);

    // Combine Shopify schedule metadata and real variant departure times.
    // A partial metafield must not conceal legitimate variant departures.
    const normalizeTime = (value) => {
      const match = String(value || "").match(/(?:^|[^0-9])(\d{1,2})[:hH](\d{2})(?!\d)/);
      if (!match) return null;
      const hour = Number(match[1]);
      const minute = Number(match[2]);
      if (hour > 23 || minute > 59) return null;
      return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
    };
    const hours = new Set();
    for (const slot of tour?.scheduleSlots || []) {
      const normalized = normalizeTime(typeof slot === "string" ? slot : slot?.time || slot?.startTime);
      if (normalized) hours.add(normalized);
    }
    for (const variant of tour?.variants || []) {
      const matches = String(variant.title || "").matchAll(/(?:^|[^0-9])(\d{1,2})[:hH](\d{2})(?!\d)/g);
      for (const match of matches) {
        const normalized = normalizeTime(match[0]);
        if (normalized) hours.add(normalized);
      }
    }
    setTourAvailableHours([...hours].sort());
  };

  const [channelCapacityLimits, setChannelCapacityLimits] = useState(() =>
    Object.fromEntries((tours || []).map(tour => [
      tour.shopifyProductId || tour.id, tour.platformCapacityLimits || {},
    ])),
  );
  const handleChannelCapacityChange = async (tourId, platform, limit) => {
    const fd = new FormData();
    fd.append("_action", "saveChannelCapacity");
    fd.append("tourId", tourId);
    fd.append("platform", platform);
    fd.append("limit", String(limit));
    try {
      const result = await requestResourceJson("/api/central-actions", fd);
      if (!result?.success) throw new Error(result?.error || "Falha ao salvar.");
      setChannelCapacityLimits(prev => ({ ...prev, [tourId]: result.limits }));
      setTourCapacities(prev => ({ ...prev, [tourId]: result.maxCapacity }));
      notify(ui("Limite do canal salvo.", "Channel limit saved."), "success");
    } catch (error) {
      notify(error?.message || ui("Falha ao salvar limite.", "Unable to save limit."), "danger");
    }
  };

  const [languageQuotaRules, setLanguageQuotaRules] = useState(() =>
    Object.fromEntries((tours || []).map(tour => [
      tour.shopifyProductId || tour.id,
      normalizeLanguageQuotaRules(tour.languageSlotQuotas),
    ])),
  );
  const handleSetGuidePortalAccess = async (guideId, patch) => {
    const fd = new FormData();
    fd.append("_action", "setGuidePortalAccess");
    fd.append("guideId", guideId);
    fd.append("enabled", patch.enabled ? "1" : "0");
    if (patch.generate) fd.append("generate", "1");
    if (patch.password) fd.append("password", patch.password);
    const result = await requestResourceJson("/api/central-actions", fd);
    if (!result?.success) throw new Error(result?.error || ui("Falha ao salvar.", "Unable to save."));
    const update = { portalEnabled: result.guide.portalEnabled, portalHasPassword: result.guide.portalHasPassword };
    setGuidesList(current => current.map(item => item.id === guideId ? { ...item, ...update } : item));
    setSelectedGuideInfo(current => current && current.id === guideId ? { ...current, ...update } : current);
    return result;
  };

  const loadGuidePayouts = useCallback(async (month) => {
    const result = await requestResourceJson(`/api/guide-payouts?month=${encodeURIComponent(month)}`);
    if (!result?.success) throw new Error(result?.error || "Não foi possível carregar o fechamento.");
    return result;
  }, [requestResourceJson]);

  const handleSetBookingGroup = async (bookingId, guideId) => {
    const fd = new FormData();
    fd.append("_action", "setBookingGroup");
    fd.append("bookingId", bookingId);
    fd.append("guideId", guideId || "");
    const result = await requestResourceJson("/api/central-actions", fd);
    if (!result?.success) throw new Error(result?.error || ui("Falha ao salvar.", "Unable to save."));
    setBookingsList(current => current.map(item => item.id === bookingId ? { ...item, groupGuideId: result.booking.groupGuideId } : item));
  };

  const handleResetDepartureCheck = async (tourId, startTime, step) => {
    const fd = new FormData();
    fd.append("_action", "resetDepartureCheck");
    fd.append("tourId", tourId);
    fd.append("startTime", new Date(startTime).toISOString());
    fd.append("step", step);
    const result = await requestResourceJson("/api/central-actions", fd);
    if (!result?.success) throw new Error(result?.error || ui("Falha ao desfazer.", "Undo failed."));
    const key = departureKey(tourId, startTime);
    setDepartureInfo(current => ({ ...current, [key]: { ...(current[key] || {}), ...result.checks } }));
  };

  const handleUploadDepartureAttachment = async (tourId, startTime, file) => {
    const fd = new FormData();
    fd.append("_action", "uploadDepartureAttachment");
    fd.append("tourId", tourId);
    fd.append("startTime", new Date(startTime).toISOString());
    fd.append("file", file);
    const result = await requestResourceJson("/api/central-actions", fd);
    if (!result?.success) throw new Error(result?.error || ui("Falha ao enviar.", "Upload failed."));
    const key = departureKey(tourId, startTime);
    setDepartureInfo(current => ({
      ...current,
      [key]: { ...(current[key] || {}), attachments: [...(current[key]?.attachments || []), result.attachment] },
    }));
  };

  const handleRemoveDepartureAttachment = async (tourId, startTime, attachmentId) => {
    const fd = new FormData();
    fd.append("_action", "removeDepartureAttachment");
    fd.append("id", attachmentId);
    const result = await requestResourceJson("/api/central-actions", fd);
    if (!result?.success) throw new Error(result?.error || ui("Falha ao remover.", "Remove failed."));
    const key = departureKey(tourId, startTime);
    setDepartureInfo(current => ({
      ...current,
      [key]: { ...(current[key] || {}), attachments: (current[key]?.attachments || []).filter(item => item.id !== attachmentId) },
    }));
  };

  const handleSaveCentralUser = async (id, patch) => {
    const fd = new FormData();
    fd.append("_action", "saveCentralUser");
    fd.append("id", id);
    if (patch.role) fd.append("role", patch.role);
    if (patch.name !== undefined) fd.append("name", patch.name || "");
    if (patch.guideId !== undefined) fd.append("guideId", patch.guideId || "");
    const result = await requestResourceJson("/api/central-actions", fd);
    if (!result?.success) throw new Error(result?.error || ui("Falha ao salvar.", "Unable to save."));
    setCentralUsersList((current) => current.map((u) => {
      if (u.id === result.user.id) return { ...u, ...result.user };
      if (patch.guideId && u.guideId === patch.guideId) return { ...u, guideId: null };
      return u;
    }));
    return result.user;
  };

  // Equipe → "Adicionar pessoa".
  const handleAddPerson = async ({ name, email, whatsapp, areas }) => {
    const fd = new FormData();
    fd.append("_action", "saveGuide");
    fd.append("name", name);
    fd.append("email", email || "");
    fd.append("whatsapp", whatsapp || "");
    fd.append("areas", JSON.stringify(areas?.length ? areas : ["GUIA"]));
    const result = await requestResourceJson("/api/guides", fd);
    if (!result?.success || !result.guide) throw new Error(result?.error || ui("Não foi possível salvar.", "Could not save."));
    const g = result.guide;
    setGuidesList((current) => [...current, {
      id: g.id, name: g.name, email: g.email || "", whatsapp: g.whatsapp || "",
      photo: g.photoUrl || "https://via.placeholder.com/150", photoMediaId: g.photoMediaId || null,
      description: "", videoUrl: "", galleryUrls: [], exclusiveProducts: [],
      shopifyMetaobjectId: null, shopifyHandle: "", shopifyActive: false, shopifyUpdatedAt: null,
      source: g.source || "CENTRAL", utmId: g.utmId || "", referralLink: g.referralLink || "",
      portalEnabled: false, portalHasPassword: false, sales90d: null,
      areas: normalizeAreas(g.areas).length ? normalizeAreas(g.areas) : ["GUIA"],
    }].sort((a, b) => a.name.localeCompare(b.name)));
  };

  const [platformPrices, setPlatformPrices] = useState(() => businessSettings?.platformPrices || null);
  const handleSavePlatformPrices = async (prices) => {
    const fd = new FormData();
    fd.append("_action", "savePlatformPrices");
    fd.append("platformPrices", JSON.stringify(prices || {}));
    const result = await requestResourceJson("/api/central-actions", fd);
    if (!result?.success) throw new Error(result?.error || ui("Falha ao salvar.", "Unable to save."));
    setPlatformPrices(result.platformPrices);
    notify(ui("Preços por plataforma salvos.", "Platform prices saved."), "success");
  };

  const handleSaveCostSettings = async (settings) => {
    const fd = new FormData();
    fd.append("_action", "saveCostSettings");
    fd.append("costSettings", JSON.stringify(settings || {}));
    const result = await requestResourceJson("/api/central-actions", fd);
    if (!result?.success) throw new Error(result?.error || ui("Falha ao salvar.", "Unable to save."));
    setCostSettings(result.costSettings);
    notify(ui("Custos salvos.", "Costs saved."), "success");
  };

  const handleSetBookingAttendance = async (bookingId, attendance) => {
    const fd = new FormData();
    fd.append("_action", "setBookingAttendance");
    fd.append("bookingId", bookingId);
    fd.append("attendance", attendance || "");
    const result = await requestResourceJson("/api/central-actions", fd);
    if (!result?.success) throw new Error(result?.error || ui("Falha ao salvar.", "Unable to save."));
    setBookingsList(current => current.map(item => item.id === bookingId ? { ...item, ...result.booking } : item));
  };

  // Checklist do guia, observações e anexos por saída (Fase 2).
  const [departureInfo, setDepartureInfo] = useState(() =>
    Object.fromEntries((tourDepartures || []).map(item => [departureKey(item.tourId, item.startTime), {
      checkStartAt: item.checkStartAt || null,
      checkMidAt: item.checkMidAt || null,
      checkEndAt: item.checkEndAt || null,
      guideNotes: Array.isArray(item.guideNotes) ? item.guideNotes : [],
      attachments: item.attachments || [],
      checklists: item.checklists || null,
      archivedAt: item.archivedAt || null,
    }])));
  // Quadro: coluna "Documentos de suporte" e importação do Trello (11/11/2026).
  const [supportCards, setSupportCards] = useState(() => initialSupportCards || []);
  const postCentral = async (fields, file = null) => {
    const fd = new FormData();
    for (const [key, value] of Object.entries(fields)) fd.append(key, typeof value === "string" ? value : JSON.stringify(value));
    if (file) fd.append("file", file);
    const result = await requestResourceJson("/api/central-actions", fd);
    if (!result?.success) throw new Error(result?.error || ui("Falha ao salvar.", "Unable to save."));
    return result;
  };
  // Quadro rolando meses à frente: reservas por data de saída (até 61 dias por vez).
  const loadBoardBookings = useCallback(async (fromKey, toKey) => {
    const items = [];
    for (let page = 1; page <= 10; page += 1) {
      const params = new URLSearchParams({ start: `${fromKey}T00:00:00Z`, end: `${toKey}T00:00:00Z`, scope: "departures", page: String(page), pageSize: "200" });
      const payload = await requestResourceJson(`/api/bookings?${params.toString()}`);
      items.push(...(Array.isArray(payload?.items) ? payload.items : []));
      if (!payload?.page?.hasMore) break;
    }
    return items;
  }, [requestResourceJson]);
  const loadTrelloBoard = async () => {
    const result = await requestResourceJson("/api/trello?board=1");
    if (!result?.success) throw new Error(result?.error || ui("Não foi possível ler o Trello.", "Could not read Trello."));
    return result.board;
  };
  const handleImportTrello = async (plan) => (await postCentral({ _action: "importTrelloBoard", plan })).summary;
  // Capas e miniaturas: busca com o token da sessão e guarda o endereço local (blob).
  const imageCacheRef = useRef(new Map());
  const loadCentralImage = useCallback(async (path) => {
    const cache = imageCacheRef.current;
    if (!cache.has(path)) {
      cache.set(path, (async () => {
        const headers = {};
        try { const token = await window.shopify?.idToken?.(); if (token) headers.Authorization = `Bearer ${token}`; } catch { /* cookie do app */ }
        const response = await fetch(resourceUrl(path), { credentials: "include", headers });
        if (!response.ok) throw new Error(String(response.status));
        return URL.createObjectURL(await response.blob());
      })().catch((e) => { cache.delete(path); throw e; }));
    }
    return cache.get(path);
  }, [resourceUrl]);
  const openSupportAttachment = (id) => openCentralFile(`/suporte/anexo/${id}`);
  const openDepartureAttachment = (id) => openCentralFile(`/saida/anexo/${id}`);
  const openCentralFile = async (path) => {
    // Abre a janela antes do fetch (bloqueador de pop-up) e troca o endereço depois.
    const win = window.open("", "_blank");
    try {
      const headers = {};
      try { const token = await window.shopify?.idToken?.(); if (token) headers.Authorization = `Bearer ${token}`; } catch { /* cookie do app */ }
      const response = await fetch(resourceUrl(path), { credentials: "include", headers });
      if (!response.ok) throw new Error(await response.text());
      const url = URL.createObjectURL(await response.blob());
      if (win) win.location.href = url; else window.location.href = url;
    } catch (e) {
      win?.close();
      window.alert(ui("Não foi possível abrir o arquivo.", "Could not open the file.") + (e?.message ? `\n${e.message}` : ""));
    }
  };
  // Toda a equipe cria e edita documentos e demandas do Quadro.
  const mergeSupportCard = (card) => setSupportCards((list) => (list.some((c) => c.id === card.id) ? list.map((c) => (c.id === card.id ? { ...c, ...card } : c)) : [...list, card]));
  const supportHandlers = {
    openAttachment: openSupportAttachment,
    save: async ({ id, ...fields }) => {
      const payload = { _action: "saveSupportCard", id: id || "" };
      for (const [key, value] of Object.entries(fields)) {
        if (value === undefined) continue;
        payload[key] = key === "assigneeIds" ? JSON.stringify(value || []) : typeof value === "boolean" ? String(value) : String(value ?? "");
      }
      const { card } = await postCentral(payload);
      mergeSupportCard(card);
      return card;
    },
    checklistOp: async (id, op) => {
      const { card } = await postCentral({ _action: "updateSupportChecklist", id, op: JSON.stringify(op) });
      mergeSupportCard(card);
    },
    remove: async (id) => {
      await postCentral({ _action: "deleteSupportCard", id });
      setSupportCards((list) => list.filter((c) => c.id !== id));
    },
    upload: async (cardId, file) => {
      const { attachment } = await postCentral({ _action: "uploadSupportAttachment", cardId }, file);
      setSupportCards((list) => list.map((c) => (c.id === cardId ? { ...c, attachments: [...(c.attachments || []), attachment] } : c)));
    },
    removeAttachment: async (cardId, id) => {
      await postCentral({ _action: "removeSupportAttachment", id });
      setSupportCards((list) => list.map((c) => (c.id === cardId ? { ...c, attachments: (c.attachments || []).filter((a) => a.id !== id) } : c)));
    },
  };

  // Quadro: arquivar / excluir o cartão de uma saída.
  const handleArchiveDeparture = async (tourId, startTime, archived) => {
    const fd = new FormData();
    fd.append("_action", "archiveDeparture");
    fd.append("tourId", tourId);
    fd.append("startTime", new Date(startTime).toISOString());
    fd.append("archived", archived ? "true" : "false");
    const result = await requestResourceJson("/api/central-actions", fd);
    if (!result?.success) throw new Error(result?.error || ui("Falha ao arquivar.", "Archive failed."));
    const key = departureKey(tourId, startTime);
    setDepartureInfo((current) => ({ ...current, [key]: { ...(current[key] || {}), archivedAt: result.departure?.archivedAt || null } }));
  };
  const handleDeleteDepartureCard = async (tourId, startTime) => {
    const fd = new FormData();
    fd.append("_action", "deleteDepartureCard");
    fd.append("tourId", tourId);
    fd.append("startTime", new Date(startTime).toISOString());
    const result = await requestResourceJson("/api/central-actions", fd);
    if (!result?.success) throw new Error(result?.error || ui("Falha ao excluir.", "Delete failed."));
    const key = departureKey(tourId, startTime);
    const at = new Date(startTime).getTime();
    setDepartureInfo((current) => { const next = { ...current }; delete next[key]; return next; });
    setDepartureTags((current) => { const next = { ...current }; delete next[key]; return next; });
    setGuideAssignmentsList((current) => current.filter((a) => !((a.tourId || a.tour?.id) === tourId && Math.abs(new Date(a.startTime).getTime() - at) < 60000)));
  };
  // Quadro: checklists do cartão (operação aplicada no servidor).
  const handleChecklistOp = async (tourId, startTime, op) => {
    const fd = new FormData();
    fd.append("_action", "updateDepartureChecklist");
    fd.append("tourId", tourId);
    fd.append("startTime", new Date(startTime).toISOString());
    fd.append("op", JSON.stringify(op));
    const result = await requestResourceJson("/api/central-actions", fd);
    if (!result?.success) throw new Error(result?.error || ui("Falha ao salvar.", "Unable to save."));
    const key = departureKey(tourId, startTime);
    setDepartureInfo((current) => ({ ...current, [key]: { ...(current[key] || {}), checklists: result.departure.checklists } }));
  };
  const [departureTags, setDepartureTags] = useState(() =>
    Object.fromEntries((tourDepartures || []).map(item => [departureKey(item.tourId, item.startTime), item.tagIds || []])));
  const handleSaveDepartureTags = async (tourId, startTime, tagIds) => {
    const key = departureKey(tourId, startTime);
    const previous = departureTags[key] || [];
    setDepartureTags(current => ({ ...current, [key]: tagIds }));
    const fd = new FormData();
    fd.append("_action", "saveDepartureTags");
    fd.append("tourId", tourId);
    fd.append("startTime", new Date(startTime).toISOString());
    fd.append("tagIds", JSON.stringify(tagIds || []));
    try {
      const result = await requestResourceJson("/api/central-actions", fd);
      if (!result?.success) throw new Error(result?.error || ui("Falha ao salvar.", "Unable to save."));
      setDepartureTags(current => ({ ...current, [key]: result.departure?.tagIds || [] }));
    } catch (error) {
      setDepartureTags(current => ({ ...current, [key]: previous }));
      throw error;
    }
  };

  const [agendaLabels, setAgendaLabels] = useState(() => normalizeAgendaLabels(businessSettings?.agendaLabels));
  // Mesma cor do passeio em todos os canais: herda do produto equivalente na Shopify.
  const colorLabels = useMemo(
    () => ({ ...agendaLabels, ...buildTourColorAliases(tours || [], platformProducts?.shopify || []) }),
    [agendaLabels, tours, platformProducts],
  );
  const handleSaveAgendaLabels = async (labels) => {
    const fd = new FormData();
    fd.append("_action", "saveAgendaLabels");
    fd.append("agendaLabels", JSON.stringify(labels || {}));
    const result = await requestResourceJson("/api/central-actions", fd);
    if (!result?.success) throw new Error(result?.error || ui("Falha ao salvar.", "Unable to save."));
    setAgendaLabels(normalizeAgendaLabels(result.agendaLabels));
    notify(ui("Cores da Agenda salvas.", "Agenda colours saved."), "success");
  };

  // Agenda → Quadro: escalar/tirar guia direto no cartão.
  const handleBoardAssignGuide = async ({ tourId, dateKey, time, guideId, languages = [] }) => {
    const fd = new FormData();
    fd.append("_action", "saveGuideAssignment");
    fd.append("tourId", tourId);
    fd.append("guideId", guideId);
    fd.append("date", dateKey);
    fd.append("time", time);
    fd.append("languages", JSON.stringify(languages));
    const result = await requestResourceJson("/api/guides", fd);
    if (!result?.success || !result.assignment) throw new Error(result?.error || ui("Falha ao escalar.", "Unable to assign."));
    setGuideAssignmentsList((current) => [
      ...current.filter((item) => item.id !== result.assignment.id),
      result.assignment,
    ].sort((a, b) => new Date(a.startTime) - new Date(b.startTime)));
  };
  // Funcionalidades opcionais: tudo novo chega desligado (Configurações → Funcionalidades).
  const [featureFlags, setFeatureFlags] = useState(() => normalizeFeatureFlags(businessSettings?.featureFlags));
  const handleSaveFeatureFlags = async (patch) => {
    const fd = new FormData();
    fd.append("_action", "saveFeatureFlags");
    fd.append("featureFlags", JSON.stringify(patch || {}));
    const result = await requestResourceJson("/api/central-actions", fd);
    if (!result?.success) throw new Error(result?.error || ui("Não foi possível salvar.", "Unable to save."));
    setFeatureFlags(normalizeFeatureFlags(result.featureFlags));
  };

  // Quadro: lista de espera por saída.
  const [waitlist, setWaitlist] = useState(waitlistEntries || []);
  const handleAddWaitlist = async (tourId, startTime, entry) => {
    const fd = new FormData();
    fd.append("_action", "addWaitlistEntry");
    fd.append("tourId", tourId);
    fd.append("startTime", new Date(startTime).toISOString());
    fd.append("entry", JSON.stringify(entry || {}));
    const result = await requestResourceJson("/api/central-actions", fd);
    if (!result?.success) throw new Error(result?.error || ui("Não foi possível adicionar.", "Unable to add."));
    setWaitlist((current) => [...current, result.entry]);
  };
  const handleWaitlistStatus = async (id, status) => {
    const fd = new FormData();
    fd.append("_action", "setWaitlistStatus");
    fd.append("id", id);
    fd.append("status", status);
    const result = await requestResourceJson("/api/central-actions", fd);
    if (!result?.success) throw new Error(result?.error || ui("Não foi possível atualizar.", "Unable to update."));
    setWaitlist((current) => current
      .map((item) => (item.id === id ? result.entry : item))
      .filter((item) => item.status !== "REMOVED"));
  };
  const loadWeather = useCallback(() => requestResourceJson("/api/weather"), [requestResourceJson]);

  // Quadro: administrador move a saída inteira para outra data (e, se quiser, outro horário).
  const handleMoveDeparture = async ({ tourId, fromStartTime, dateKey, timeKey }) => {
    const fd = new FormData();
    fd.append("_action", "moveDeparture");
    fd.append("tourId", tourId);
    fd.append("fromStartTime", new Date(fromStartTime).toISOString());
    fd.append("date", dateKey);
    fd.append("time", timeKey);
    const result = await requestResourceJson("/api/central-actions", fd);
    if (!result?.success) throw new Error(result?.error || ui("Não foi possível mover a saída.", "Unable to move the departure."));
    const to = result.toStartTime;
    const movedBookings = new Set(result.bookingIds || []);
    const movedAssignments = new Set(result.assignmentIds || []);
    setBookingsList((current) => current.map((item) => (movedBookings.has(item.id) ? { ...item, startTime: to } : item)));
    const fromIso = new Date(fromStartTime).toISOString();
    setWaitlist((current) => current.map((item) => (item.tourId === tourId && new Date(item.startTime).toISOString() === fromIso ? { ...item, startTime: to } : item)));
    setGuideAssignmentsList((current) => current
      .map((item) => (movedAssignments.has(item.id) ? { ...item, startTime: to } : item))
      .sort((a, b) => new Date(a.startTime) - new Date(b.startTime)));
    const fromKey = departureKey(tourId, fromStartTime);
    const toKey = departureKey(tourId, to);
    const dep = result.departure;
    setDepartureTags((current) => {
      const next = { ...current };
      delete next[fromKey];
      if (dep) next[toKey] = dep.tagIds || [];
      return next;
    });
    setDepartureInfo((current) => {
      const next = { ...current };
      const moved = next[fromKey];
      delete next[fromKey];
      if (dep) {
        next[toKey] = {
          ...(next[toKey] || {}),
          checkStartAt: dep.checkStartAt || null,
          checkMidAt: dep.checkMidAt || null,
          checkEndAt: dep.checkEndAt || null,
          guideNotes: Array.isArray(dep.guideNotes) ? dep.guideNotes : [],
          checklists: dep.checklists || null,
          attachments: [...(next[toKey]?.attachments || []), ...(moved?.attachments || [])],
        };
      }
      return next;
    });
    return result;
  };
  const handleBoardRemoveAssignment = async (id) => {
    if (typeof window !== "undefined" && !window.confirm(ui("Tirar este guia da saída?", "Remove this guide from the departure?"))) return;
    const fd = new FormData();
    fd.append("_action", "removeGuideAssignment");
    fd.append("id", id);
    const result = await requestResourceJson("/api/guides", fd);
    if (result?.success === false) throw new Error(result?.error || ui("Falha ao remover.", "Unable to remove."));
    setGuideAssignmentsList((current) => current.filter((item) => item.id !== id));
  };

  const handleSaveTourColor = async (tourId, color) => {
    const current = normalizeAgendaLabels(agendaLabels);
    const previous = current.tours[tourId] || { color: null, tagIds: [] };
    await handleSaveAgendaLabels({
      ...current,
      tours: { ...current.tours, [tourId]: { ...previous, color } },
    });
  };

  const handleLanguageQuotaSave = async (tourId, { date, times, languages, skipQuotas, guideId }) => {
    const fd = new FormData();
    fd.append("_action", "saveLanguageQuotas");
    fd.append("tourId", tourId);
    fd.append("date", date || "");
    fd.append("times", JSON.stringify(times));
    fd.append("languages", JSON.stringify(languages || []));
    if (skipQuotas) fd.append("skipQuotas", "1");
    if (guideId !== undefined) fd.append("guideId", guideId);
    const result = await requestResourceJson("/api/central-actions", fd);
    if (!result?.success) throw new Error(result?.error || ui("Falha ao salvar.", "Unable to save."));
    setLanguageQuotaRules(prev => ({ ...prev, [tourId]: normalizeLanguageQuotaRules(result.rules) }));
    const removed = new Set(result.removedAssignmentIds || []);
    const saved = result.assignments || [];
    if (removed.size || saved.length) {
      const savedIds = new Set(saved.map(item => item.id));
      setGuideAssignmentsList(current => [
        ...current.filter(item => !removed.has(item.id) && !savedIds.has(item.id)),
        ...saved,
      ].sort((left, right) => new Date(left.startTime) - new Date(right.startTime)));
    }
    if (result.guideErrors?.length) {
      notify(result.message, "warning", 8000);
    } else {
      notify(result.message || ui("Salvo.", "Saved."), "success");
    }
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

      const result = await requestResourceJson("/api/central-actions", fd);
      if (!result?.success) {
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
        (tour?.gygProductOptions || []).map((option) => [
          option.id,
          option.gygOptionId || "",
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

      const result = await requestResourceJson("/api/central-actions", fd);

      if (!result?.success) {
        setGygConfigMessage(result?.error || "Não foi possível salvar a configuração.");
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

  const loadViatorOnboarding = async ({ includeCatalog = false } = {}) => {
    setViatorOnboardingLoading(true);
    setViatorOnboardingError("");
    try {
      if (includeCatalog) {
        const fd = new FormData();
        fd.append("_action", "catalog");
        const payload = await requestResourceJson("/api/viator-onboarding", fd);
        setViatorOnboardingStatus(payload.status || null);
        setViatorCatalog(payload.catalog || null);
        return payload;
      }

      const payload = await requestResourceJson("/api/viator-onboarding");
      setViatorOnboardingStatus(payload.status || null);
      return payload;
    } catch (error) {
      setViatorOnboardingError(
        error?.message || "Falha ao consultar o onboarding Viator.",
      );
      return null;
    } finally {
      setViatorOnboardingLoading(false);
    }
  };

  const handleViatorConnectMapping = async ({
    key,
    productOptionId,
    productCode,
    tourGradeCode,
  }) => {
    if (!productOptionId) return;
    setViatorMappingBusy(key);
    setViatorOnboardingError("");
    try {
      const fd = new FormData();
      fd.append("_action", "connect");
      fd.append("productOptionId", productOptionId);
      fd.append("productCode", productCode);
      fd.append("tourGradeCode", tourGradeCode);
      const payload = await requestResourceJson("/api/viator-onboarding", fd);
      setViatorOnboardingStatus(payload.status || null);
      setViatorCatalog(payload.catalog || null);
      notify(ui("Mapeamento Viator conectado.", "Viator mapping connected."), "success");
    } catch (error) {
      setViatorOnboardingError(
        error?.message || "Falha ao conectar o mapeamento Viator.",
      );
    } finally {
      setViatorMappingBusy(null);
    }
  };

  const handleViatorDisconnectMapping = async ({
    key,
    productOptionId,
    productCode,
    tourGradeCode,
  }) => {
    setViatorMappingBusy(key);
    setViatorOnboardingError("");
    try {
      const fd = new FormData();
      fd.append("_action", "disconnect");
      fd.append("productOptionId", productOptionId);
      fd.append("productCode", productCode);
      fd.append("tourGradeCode", tourGradeCode);
      const payload = await requestResourceJson("/api/viator-onboarding", fd);
      setViatorOnboardingStatus(payload.status || null);
      setViatorCatalog(payload.catalog || null);
      notify(ui("Mapeamento Viator desconectado.", "Viator mapping disconnected."), "success");
    } catch (error) {
      setViatorOnboardingError(
        error?.message || "Falha ao desconectar o mapeamento Viator.",
      );
    } finally {
      setViatorMappingBusy(null);
    }
  };

  const loadCivitatisOnboarding = async () => {
    setCivitatisOnboardingLoading(true);
    setCivitatisOnboardingError("");
    try {
      const payload = await requestResourceJson("/api/civitatis-onboarding");
      setCivitatisOnboardingStatus(payload.status || null);
      return payload;
    } catch (error) {
      setCivitatisOnboardingError(
        error?.message || "Falha ao consultar o onboarding Civitatis.",
      );
      return null;
    } finally {
      setCivitatisOnboardingLoading(false);
    }
  };

  const loadTripadvisorContent = async () => {
    setTripadvisorContentLoading(true);
    setTripadvisorContentError("");
    try {
      const payload = await requestResourceJson("/api/tripadvisor-content");
      setTripadvisorContent(payload);
      return payload;
    } catch (error) {
      setTripadvisorContentError(
        error?.message || "Falha ao consultar o Tripadvisor Terra.",
      );
      return null;
    } finally {
      setTripadvisorContentLoading(false);
    }
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
    if (key === "viator") {
      setViatorOnboardingError("");
      void loadViatorOnboarding();
    }
    if (key === "civitatis") {
      setCivitatisOnboardingError("");
      void loadCivitatisOnboarding();
    }
    if (key === "tripadvisor") {
      setTripadvisorContentError("");
      void loadTripadvisorContent();
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
    if (!["viator", "civitatis", "tripadvisor"].includes(key)) return;

    setIntegrationCredentialLoading(true);
    setIntegrationCredentialMessage("");

    try {
      const fd = new FormData();
      fd.append("_action", "save");
      fd.append("provider", key.toUpperCase());

      if (key === "viator") {
        fd.append("apiKey", apiKeyInput.trim());
        fd.append("supplierId", apiSecretInput.trim());
      } else if (key === "civitatis") {
        fd.append("token", apiKeyInput.trim());
        fd.append("environment", integrationEnvironmentInput);
      } else if (key === "tripadvisor") {
        fd.append("apiKey", apiKeyInput.trim());
        fd.append("locationId", apiSecretInput.trim());
      }

      const payload = await callIntegrationCredentialApi(fd);
      applyCredentialStatus(key, payload.status);
      setApiKeyInput("");
      setApiSecretInput("");
      setIntegrationCredentialMessage(
        payload.message ||
          "Credencial salva · teste local concluído no backend. Aguardando tráfego real do canal.",
      );
      if (key === "viator") {
        void loadViatorOnboarding();
      }
      if (key === "civitatis") {
        void loadCivitatisOnboarding();
      }
      if (key === "tripadvisor") {
        void loadTripadvisorContent();
      }
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
    if (!["viator", "civitatis", "tripadvisor"].includes(key)) return;

    setIntegrationCredentialLoading(true);
    setIntegrationCredentialMessage("");
    try {
      const fd = new FormData();
      fd.append("_action", "test");
      fd.append("provider", key.toUpperCase());
      const payload = await callIntegrationCredentialApi(fd);
      applyCredentialStatus(key, payload.status);
      setIntegrationCredentialMessage(
        key === "tripadvisor"
          ? "Tripadvisor Terra validado diretamente na API."
          : "Teste técnico local concluído. A conexão continua aguardando tráfego autenticado real do canal.",
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
    if (!["viator", "civitatis", "tripadvisor"].includes(key)) return;

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
          {hasBookings && (() => {
            const byTour = new Map();
            for (const booking of getCalendarDayBookings(day)) {
              const entry = byTour.get(booking.tourId) || { pax: 0, tagIds: new Set(), title: (tours || []).find(t => t.id === booking.tourId)?.title || "Tour" };
              entry.pax += getBookingPassengers(booking);
              for (const tagId of departureTags[departureKey(booking.tourId, booking.startTime)] || []) entry.tagIds.add(tagId);
              byTour.set(booking.tourId, entry);
            }
            const tagById = new Map((agendaLabels?.tags || []).map(tag => [tag.id, tag]));
            const items = [...byTour.entries()];
            return (
              <div className="pmy-cal-tour-chips">
                {items.slice(0, 4).map(([tourId, entry]) => {
                  const color = tourColor(colorLabels, tourId);
                  return (
                    <div key={tourId} className="pmy-cal-tour-chip" style={{ background: color, color: contrastText(color) }} title={`${entry.title} · ${entry.pax} pax`}>
                      <span>{entry.title}</span>
                      {entry.tagIds.size > 0 && (
                        <span className="pmy-cal-tag-dots" aria-label={[...entry.tagIds].map(id => tagById.get(id)?.name).filter(Boolean).join(", ")}>
                          {[...entry.tagIds].filter(id => tagById.has(id)).slice(0, 4).map(id => <i key={id} style={{ background: tagById.get(id).color }} />)}
                        </span>
                      )}
                      <b>{entry.pax}</b>
                    </div>
                  );
                })}
                {items.length > 4 && <div className="pmy-cal-info-line">+{items.length - 4}</div>}
              </div>
            );
          })()}
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
        "A PMY usa a Headout como Supply Partner, não como distribuidora do inventário Headout.",
        "A API pública Headout-Auth é para Affiliate/API/Booking Partners e não deve ser usada como adapter de fornecedor da PMY.",
        "O pedido de integração do RMS próprio Reservas Unificadas já foi enviado à Headout.",
        "Credenciais só serão habilitadas quando a Headout confirmar o contrato técnico de conectividade para fornecedor.",
      ],
      field1Label: null,
      field1Placeholder: null,
      field2Label: null,
    },
    civitatis: {
      steps: [
        "A Civitatis chama a Operator API da PMY. Portanto, o token é gerado por nós e fornecido à equipa de Product Operations.",
        "Começamos no ambiente test e só mudamos para live após a validação da Civitatis.",
        "Ao salvar, a Central criptografa o token no IntegrationSecret.",
        "O canal só aparece como conectado depois de uma chamada autenticada real da Civitatis.",
      ],
      field1Label: "Token Bearer que a PMY fornecerá à Civitatis",
      field1Placeholder: "Gere um token seguro abaixo ou cole um token já acordado",
      field2Label: null,
    },
    tripadvisor: {
      steps: [
        "Crie ou acesse sua conta no Tripadvisor Developers / Terra e gere uma API Key.",
        "Cole a API Key aqui; a Central criptografa o valor no IntegrationSecret e valida a chave diretamente contra a Terra API.",
        "O Location ID é opcional no primeiro teste. Depois, informe o ID da página da Portugal Me & You no Tripadvisor para carregar nota, reviews e dados da localização.",
        "Tripadvisor continua fora da Agenda e do inventário: reservas de experiências seguem pela integração Viator.",
      ],
      field1Label: "API Key do Tripadvisor Terra",
      field1Placeholder: "Cole sua API Key Terra",
      field2Label: "Tripadvisor Location ID (opcional)",
      field2Placeholder: "Somente números",
    },
  };

    const styles = buildCentralStyles(theme);



  return (
    <>
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
                className={`pmy-menu-item ${(item.key === "quadro" ? activeTab === "agenda" && calendarView === "board" : item.key === "agenda" ? activeTab === "agenda" && calendarView !== "board" : activeTab === item.key) ? "active" : ""}`}
                onClick={() => openNavigationTab(item.key)}
                title={sidebarCollapsed ? item.label : undefined}
              >
                <span className="pmy-menu-icon"><Icon name={item.icon} size={19} /></span>
                <span className="pmy-menu-label">{item.label}</span>
              </button>
            ))}
          </nav>

          <div className="pmy-sidebar-footer">
            {isCentralAdmin && <button
              type="button"
              className={`pmy-menu-item ${activeTab === "configuracoes" ? "active" : ""}`}
              onClick={() => openNavigationTab("configuracoes")}
              title={sidebarCollapsed ? (lang === "pt" ? "Configurações" : "Settings") : undefined}
            >
              <span className="pmy-menu-icon"><Icon name="settings" size={19} /></span>
              <span className="pmy-menu-label">{lang === "pt" ? "Configurações" : "Settings"}</span>
            </button>}

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
              {activeTab==='agenda' && (calendarView === 'board' ? (lang === 'pt' ? 'Quadro' : 'Board') : t.agenda_title)}
              {activeTab==='integracoes' && t.integrations_title}
              {activeTab==='guias' && (lang === 'pt' ? 'Equipe' : 'Team')}
              {activeTab==='configuracoes' && t.settings_title}
            </h1>
              </div>
            </div>
            {activeTab==='dashboard' && (
              <div className="pmy-header-notification-actions" style={{ display: "flex", flexDirection: "row", alignItems: "center", justifyContent: "flex-end", flexWrap: "nowrap", gap: 10, width: "auto", flex: "0 0 auto", marginLeft: "auto" }}>
                <MentionsBell requestJson={requestResourceJson} lang={lang} />
                {isCentralAdmin && <GygDeactivationAlerts lang={lang} />}
                <div className="pmy-date-wrapper" style={{ display: "inline-flex", flex: "0 0 auto", width: "auto" }}>
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
                          <DatePicker
                            className="pmy-dashboard-date-picker pmy-dashboard-date-picker--start"
                            value={customStart}
                            onChange={(event) => setCustomStart(event.target.value)}
                            locale={lang === "pt" ? "pt-PT" : "en-GB"}
                            placeholder={lang === "pt" ? "Data inicial" : "Start date"}
                            todayLabel={lang === "pt" ? "Hoje" : "Today"}
                            clearLabel={lang === "pt" ? "Limpar" : "Clear"}
                            previousMonthLabel={lang === "pt" ? "Mês anterior" : "Previous month"}
                            nextMonthLabel={lang === "pt" ? "Próximo mês" : "Next month"}
                          />
                          <span className="pmy-date-custom-separator" aria-hidden="true">→</span>
                          <DatePicker
                            className="pmy-dashboard-date-picker pmy-dashboard-date-picker--end"
                            value={customEnd}
                            onChange={(event) => setCustomEnd(event.target.value)}
                            locale={lang === "pt" ? "pt-PT" : "en-GB"}
                            placeholder={lang === "pt" ? "Data final" : "End date"}
                            todayLabel={lang === "pt" ? "Hoje" : "Today"}
                            clearLabel={lang === "pt" ? "Limpar" : "Clear"}
                            previousMonthLabel={lang === "pt" ? "Mês anterior" : "Previous month"}
                            nextMonthLabel={lang === "pt" ? "Próximo mês" : "Next month"}
                          />
                        </div>
                        <button className="pmy-date-apply-btn" onClick={handleCustomDateApply}>{t.btn_apply}</button>
                      </div>
                    </div>
                  </>
                )}
              </div>
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
            syncQueueData, syncQueueLoading, syncQueueError,
            dashboardStatusBookings, tours, handleSetBookingAttendance,
            profitSummary, costSettings, handleSaveCostSettings, isCentralAdmin, loadGuidePayouts,
            attentionDepartures
          }} />

          <AgendaTab {...{
            activeTab, activeTourLanguages, blockDateTime, blockMessage, blockPlatforms,
            blockRecurringDays, blockSaving, blockSelectedHour, blockTourId, blockedDates,
            bookingDate, bookingTime, calendarView, currentMonthLabel,
            currentYear, custEmail, custLang, custName, custPhone, draftOrderError,
            draftOrderInfo, draftOrderLoading, generatedLink, getBookingTimesForTour,
            getLisbonToday, handleBlockTourSelectionChange, handleCapacityChange, handleChannelCapacityChange, channelCapacityLimits,
            handleLanguageQuotaSave, languageQuotaRules, guidesList: scheduleGuides, guideAssignmentsList,
            handleCreateBlock, handleGeneratePaymentLink, handleNextMonth, handlePrevMonth,
            handleRemoveBlock, handleTogglePlatformSelection, handleTourSelectionChange,
            imageShape, platformConnections, renderCalendarDays, reservationPlatforms,
            selectedTour, setBlockDateTime, setBlockPlatforms, setBlockRecurringDays,
            setBlockSelectedHour, setBookingDate, setBookingTime,
            setCalendarView, setCustEmail, setCustLang, setCustName, setCustPhone,
            setDraftOrderInfo, setGeneratedLink, setTourVariants, t, tourAvailableHours,
            tourCapacities, tourOptions, tourVariants, tours, variantMatchesBookingTime, lang,
            agendaLabels, handleSaveAgendaLabels, isCentralAdmin,
            calendarProps: {
              bookings: bookingsList, assignments: guideAssignmentsList, tours, guides: scheduleGuides,
              agendaLabels: colorLabels, departureTags, departureInfo, supportCards,
              loadBookings: loadBoardBookings, loadImage: loadCentralImage,
              onOpenAttachment: openDepartureAttachment, onOpenSupportAttachment: supportHandlers.openAttachment,
            },
            onOpenBoard: openInBoard,
            boardProps: {
              focus: boardFocus, onFocusHandled: () => setBoardFocus(null),
              bookings: bookingsList, assignments: guideAssignmentsList, tours, guides: scheduleGuides,
              agendaLabels: colorLabels, departureTags, departureInfo,
              onSaveDepartureTags: handleSaveDepartureTags, onSaveAgendaLabels: handleSaveAgendaLabels,
              onAssignGuide: handleBoardAssignGuide, onRemoveAssignment: handleBoardRemoveAssignment,
              onUpload: handleUploadDepartureAttachment, onRemoveAttachment: handleRemoveDepartureAttachment, onOpenAttachment: openDepartureAttachment,
              onResetCheck: isCentralAdmin ? handleResetDepartureCheck : null,
              onChecklistOp: handleChecklistOp,
              onArchiveDeparture: handleArchiveDeparture, onDeleteDepartureCard: handleDeleteDepartureCard,
              supportCards, supportHandlers, loadBookings: loadBoardBookings, loadImage: loadCentralImage, requestJson: requestResourceJson,
              onImportTrello: isCentralAdmin ? handleImportTrello : null,
              loadTrelloBoard: isCentralAdmin ? loadTrelloBoard : null,
              onMoveDeparture: isCentralAdmin && featureFlags.boardMove ? handleMoveDeparture : null,
              waitlist,
              onAddWaitlist: featureFlags.waitlist ? handleAddWaitlist : null,
              onWaitlistStatus: featureFlags.waitlist ? handleWaitlistStatus : null,
              loadWeather: featureFlags.weatherAlerts ? loadWeather : null,
              showGuestMessages: featureFlags.guestMessages,
            },
          }} />

          <IntegrationsTab {...{
            requestResourceJson,
            activeTab, activeProdPlatform, allPlatforms, bookings, contentPlatforms,
            formatSyncTime, handleDisconnect, handleOpenConnect,
            handleRequeueSyncJob, handleSyncPlatformNow, intSubTab,
            lang, loadSyncQueue, manualSyncError, manualSyncPlatform, manualSyncResult,
            platformConnections, platformProducts, reservationPlatforms, runSyncQueueNow,
            agendaLabels: colorLabels, handleSaveTourColor, platformPrices, handleSavePlatformPrices,
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
            setSelectedGuideInfo, setUpcomingToursFilter, t, upcomingToursFilter, lang,
            isCentralAdmin, centralUsers: centralUsersList, centralUser, handleSaveCentralUser, handleAddPerson,
          }} />

          <SettingsTab {...{
            activeMappingPlatform, activeTab, allPlatforms, defaultMappings, fieldMappings,
            logoLightInputRef, logoDarkInputRef, handleBrandLogoChange, handleRemoveBrandLogo,
            handleThemeChange, handleRestoreThemeDefaults, handleImageShapeChange,
            handleSaveFieldMappings, handleResetFieldMappings, handleUpdateFieldMapping,
            imageShape, internalFields, logoOnLightUrl, logoOnDarkUrl, logoUploadingVariant,
            sidebarIsDark, activeSidebarLogoUrl, mappingSaveState, platformConnections,
            reservationPlatforms, setActiveMappingPlatform, settingsSaveMessage,
            t, theme, lang, centralUsers, centralUser, handleSaveCentralUser, requestResourceJson,
            featureFlags, handleSaveFeatureFlags
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
        agendaLabels: colorLabels,
        departureTags,
        handleSaveDepartureTags,
        departureInfo,
        handleUploadDepartureAttachment,
        handleRemoveDepartureAttachment,
        openDepartureAttachment,
        loadCentralImage,
        handleSetGuidePortalAccess,
        handleSetBookingGroup,
        handleResetDepartureCheck,
        isCentralAdmin,
        guideAssignmentMessage,
        guideAssignmentSaving,
        guideAssignmentsList,
        guidePhotoUploadError,
        guidePhotoUploading,
        guidesList,
        scheduleGuides,
        editGuideAreas,
        setEditGuideAreas,
        centralUsers: centralUsersList,
        centralUser,
        handleSaveCentralUser,
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
        viatorCatalog,
        viatorMappingBusy,
        viatorOnboardingError,
        viatorOnboardingLoading,
        viatorOnboardingStatus,
        civitatisOnboardingError,
        civitatisOnboardingLoading,
        civitatisOnboardingStatus,
        tripadvisorContent,
        tripadvisorContentError,
        tripadvisorContentLoading,
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
        handleViatorConnectMapping,
        handleViatorDisconnectMapping,
        loadViatorOnboarding,
        loadCivitatisOnboarding,
        loadTripadvisorContent,
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
        modalSelectedLanguages,
        setModalSelectedLanguages,
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

// Fontes no <head> (antes ficavam num @import no meio da página e a tela
// aparecia primeiro com a fonte errada). display=block evita a troca visível.
const CENTRAL_FONTS_URL = "https://fonts.googleapis.com/css2?family=Asul:wght@400;700&family=Assistant:wght@400;500;600;700;800&family=Inter:wght@400;600;700;800;900&family=Poppins:wght@400;600;700;800&family=Lato:wght@400;700&family=Roboto:wght@400;500;700&family=Open+Sans:wght@400;600;700&family=Montserrat:wght@400;600;700;800&family=Nunito:wght@400;600;700;800&display=block";
export const links = () => [
  { rel: "preconnect", href: "https://fonts.googleapis.com" },
  { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
  { rel: "stylesheet", href: CENTRAL_FONTS_URL },
];

export default function CentralDeReservas() {
  const { apiKey = "", portalMode = false } = useLoaderData() || {};

  // portalMode: adm aberto pelo app do celular, fora do admin do Shopify (sem App Bridge).
  return (
    <AppProvider embedded={!portalMode} apiKey={apiKey}>
      <CentralDeReservasContent />
    </AppProvider>
  );
}

// deployment-recovery: stable full-tree snapshot
