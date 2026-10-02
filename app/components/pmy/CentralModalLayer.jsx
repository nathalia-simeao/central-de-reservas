import { useEffect, useRef } from "react";
import { Icon } from "./PmyUI";
import PickerModalContent from "./PickerModalContent";
import {
  allPlatforms,
  ddiList,
  getFlagUrl,
} from "../../config/pmy-central-config";

export default function CentralModalLayer(props) {
  const {
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
    notify,
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
  } = props;

  const previousFocusRef = useRef(null);

  useEffect(() => {
    if (!connectingPlatform && !activeModal && !editingGuide) return undefined;

    previousFocusRef.current = document.activeElement;
    const dialogs = [...document.querySelectorAll('[data-pmy-dialog="true"]')];
    const dialog = dialogs[dialogs.length - 1] || null;
    const focusableSelector = [
      "a[href]",
      "button:not([disabled])",
      "input:not([disabled])",
      "select:not([disabled])",
      "textarea:not([disabled])",
      "[tabindex]:not([tabindex='-1'])",
    ].join(",");

    const focusDialog = () => {
      const first = dialog?.querySelector(focusableSelector);
      (first || dialog)?.focus?.();
    };

    const closeCurrentDialog = () => {
      if (editingGuide) {
        setEditingGuide(null);
      } else if (activeModal) {
        setActiveModal(null);
      } else if (connectingPlatform) {
        setConnectingPlatform(null);
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeCurrentDialog();
        return;
      }

      if (event.key !== "Tab" || !dialog) return;
      const focusable = [...dialog.querySelectorAll(focusableSelector)].filter(
        (element) => !element.hasAttribute("disabled") && element.tabIndex !== -1,
      );

      if (focusable.length === 0) {
        event.preventDefault();
        dialog.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleKeyDown);
    window.requestAnimationFrame(focusDialog);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
      previousFocusRef.current?.focus?.();
    };
  }, [
    activeModal,
    connectingPlatform,
    editingGuide,
    setActiveModal,
    setConnectingPlatform,
    setEditingGuide,
  ]);

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
        <div
          className="pmy-connect-modal pmy-ds-migrated-nz4pdt"
          data-pmy-dialog="true"
          role="dialog"
          aria-modal="true"
          aria-label={ui("Configurar integração", "Configure integration")}
          tabIndex={-1}
          onClick={e => e.stopPropagation()}
        >
  
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
                      <strong className={shopifyWebhookStatus?.ok === true ? "pmy-ds-state-text is-success" : "pmy-ds-state-text is-warning"}>
                        {shopifyWebhookStatus?.ok === null
                          ? ui("Verificando em segundo plano...", "Checking in background...")
                          : shopifyWebhookStatus?.ok
                            ? ui("Webhooks ativos", "Webhooks active")
                            : ui("Configuração pendente", "Configuration pending")}
                      </strong>
                    </div>
                    {shopifyWebhookStatus?.subscriptions?.length > 0 && (
                      <div className="pmy-ds-migrated-tz10ua">
                        {shopifyWebhookStatus.subscriptions.map(s => s.topic).join(' · ')}
                      </div>
                    )}
                    {shopifyWebhookStatus?.ok === false && shopifyWebhookStatus?.error && (
                      <div className="pmy-ds-migrated-6nlv6t">
                        {shopifyWebhookStatus.error}
                      </div>
                    )}
                  </div>
                </div>
                <div className="pmy-ds-migrated-1ewrw06">
                  <strong>{ui("ℹ️ Não precisa de token manual.", "ℹ️ No manual token required.")}</strong> {ui(
                    "A Central abre com o catálogo salvo no banco e atualiza o Shopify em segundo plano, sem travar a página.",
                    "The Central opens from the cached catalog and refreshes Shopify in the background without blocking the page.",
                  )}
                  {" "}{ui(
                    "Use a sincronização manual apenas quando quiser forçar uma atualização imediata.",
                    "Use manual sync only when you want to force an immediate refresh.",
                  )}
                </div>
                <div className="pmy-ds-migrated-12y480p">
                  <button
                    className="pmy-btn-submit pmy-ds-migrated-ckcaff"
                    disabled={manualSyncPlatform === "shopify"}
                    onClick={async () => {
                      await handleSyncPlatformNow("shopify");
                      window.location.reload();
                    }}
                  >
                    {manualSyncPlatform === "shopify"
                      ? ui("Sincronizando...", "Syncing...")
                      : ui("🔄 Sincronizar Shopify agora", "🔄 Sync Shopify now")}
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
          onSelect={(media) => {
            if (pickerCallback) { pickerCallback(media); window.__pmyPickerCallback = null; }
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
              {selectedGuideInfo.shopifyMetaobjectId && (
                <div className="pmy-u-mt-2">
                  <span className="pmy-tag">Shopify · metaobjeto Guias</span>
                </div>
              )}
            </div>
          </div>
  
          {selectedGuideInfo.description && (
            <div className="pmy-ds-panel-soft pmy-u-mt-3">
              <h4 className="pmy-u-mb-2">{ui("Perfil do guia", "Guide profile")}</h4>
              <p>{selectedGuideInfo.description}</p>
            </div>
          )}
  
          {selectedGuideInfo.videoUrl && (
            <div className="pmy-u-mt-3">
              <h4 className="pmy-u-mb-2">{ui("Vídeo", "Video")}</h4>
              <video
                controls
                preload="metadata"
                src={selectedGuideInfo.videoUrl}
                className="pmy-guide-profile-video"
              />
            </div>
          )}
  
          {selectedGuideInfo.exclusiveProducts?.length > 0 && (
            <div className="pmy-u-mt-3">
              <h4 className="pmy-u-mb-2">{ui("Passeios exclusivos", "Exclusive tours")}</h4>
              <div className="pmy-ds-list-plain">
                {selectedGuideInfo.exclusiveProducts.map((product) => (
                  <div className="pmy-ds-list-plain__row" key={product.id}>
                    <span className="pmy-ds-list-plain__title">
                      <Icon name="mapPin" size={17} />
                      {product.title}
                    </span>
                    <span className="pmy-tag">Shopify</span>
                  </div>
                ))}
              </div>
            </div>
          )}
  
          {selectedGuideInfo.galleryUrls?.length > 0 && (
            <div className="pmy-u-mt-3">
              <h4 className="pmy-u-mb-2">{ui("Galeria", "Gallery")}</h4>
              <div className="pmy-guide-profile-gallery">
                {selectedGuideInfo.galleryUrls.map((url) => (
                  <img key={url} src={url} alt={selectedGuideInfo.name} loading="lazy" />
                ))}
              </div>
            </div>
          )}
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
                <button
                  type="button"
                  aria-label={ui("Copiar link de indicação", "Copy referral link")}
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(selectedGuideInfo.referralLink);
                      notify?.(ui("Link copiado.", "Link copied."), "success");
                    } catch {
                      notify?.(ui("Não foi possível copiar o link.", "Could not copy the link."), "danger");
                    }
                  }}
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
        <div
          className="pmy-modal"
          data-pmy-dialog="true"
          role="dialog"
          aria-modal="true"
          aria-label={title}
          tabIndex={-1}
          onClick={e => e.stopPropagation()}
        >
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
    const shopifyManaged = Boolean(guide.shopifyMetaobjectId);
    return (
      <div className="pmy-modal-overlay" onClick={() => setEditingGuide(null)}>
        <div
          className="pmy-ds-migrated-zuczkc"
          data-pmy-dialog="true"
          role="dialog"
          aria-modal="true"
          aria-label={ui("Editar guia", "Edit guide")}
          tabIndex={-1}
          onClick={e => e.stopPropagation()}
        >
          <div className="pmy-ds-migrated-1ig0zoz">
            <div className="pmy-ds-migrated-g4mnio">
              <div className="pmy-ds-migrated-otectg">
                <img src={editGuidePhoto || guide.photo} alt={guide.name}
                  className="pmy-ds-migrated-1sos9w" />
                {!shopifyManaged && (
                  <>
                    <button
                      type="button"
                      onClick={() =>
                        openMediaLibraryPicker((media) => {
                          setGuidePhotoUploadError("");
                          setEditGuidePhoto(media?.url || null);
                          setEditGuidePhotoMediaId(media?.id || null);
                        })
                      }
                      title={ui("Escolher da Biblioteca PMY", "Choose from PMY Media Library")}
                      className="pmy-ds-migrated-1canwv8"
                    >
                      <Icon name="media" size={16} />
                    </button>
                    <button
                      type="button"
                      className="pmy-btn-secondary pmy-ds-compact-action"
                      disabled={guidePhotoUploading}
                      onClick={() => editGuidePhotoRef.current?.click()}
                    >
                      {guidePhotoUploading
                        ? ui("Enviando...", "Uploading...")
                        : ui("Enviar nova foto", "Upload new photo")}
                    </button>
                    <input
                      type="file"
                      accept="image/*"
                      className="pmy-ds-migrated-1cibdmr"
                      ref={editGuidePhotoRef}
                      onChange={handleEditGuidePhotoChange}
                    />
                  </>
                )}
              </div>
              <div>
                <div className="pmy-ds-migrated-1w8jk2f">
                  {shopifyManaged
                    ? ui("Dados operacionais do guia", "Guide operational data")
                    : ui("Editando guia", "Editing guide")}
                </div>
                <div className="pmy-ds-migrated-16qi501">{guide.name}</div>
              </div>
            </div>
            <button onClick={() => setEditingGuide(null)}
              className="pmy-ds-migrated-6cymc4">&times;</button>
          </div>
          {guidePhotoUploadError && !shopifyManaged && (
            <div className="pmy-ds-inline-message is-danger pmy-u-mx-4 pmy-u-mt-3">
              {guidePhotoUploadError}
            </div>
          )}
          {shopifyManaged && (
            <div className="pmy-ds-state-panel pmy-u-mx-4 pmy-u-mt-3">
              <div className="pmy-ds-state-title">
                {ui("Perfil sincronizado do Shopify", "Profile synced from Shopify")}
              </div>
              <div className="pmy-ds-migrated-rhcrii">
                {ui(
                  "Nome, foto, descrição, vídeo, passeio exclusivo e galeria são gerenciados no metaobjeto Guias. Aqui ficam apenas e-mail, WhatsApp, UTM e escala.",
                  "Name, photo, description, video, exclusive tour and gallery are managed in the Guides metaobject. Only email, WhatsApp, UTM and scheduling are managed here.",
                )}
              </div>
            </div>
          )}
          <form onSubmit={handleSaveEditGuide} className="pmy-ds-migrated-bp52w">
            <div className="pmy-ds-migrated-kxbe7g">
              <div className="pmy-form-group pmy-ds-migrated-1a0iesu" >
                <label>{ui("Nome e Sobrenome", "Full Name")}</label>
                <input
                  type="text"
                  className="pmy-form-input"
                  value={shopifyManaged ? guide.name : editGuideName}
                  onChange={e => setEditGuideName(e.target.value)}
                  disabled={shopifyManaged}
                  required
                />
                {shopifyManaged && (
                  <div className="pmy-ds-code-note">
                    {ui("Alterações de nome são feitas no Shopify.", "Name changes are made in Shopify.")}
                  </div>
                )}
              </div>
              <div className="pmy-form-group pmy-ds-migrated-1a0iesu" >
                <label>E-mail</label>
                <input type="email" className="pmy-form-input" value={editGuideEmail} onChange={e => setEditGuideEmail(e.target.value)} />
              </div>
              <div className="pmy-form-group pmy-ds-migrated-1a0iesu" >
                <label>WhatsApp</label>
                <div className="pmy-guide-phone-row">
                  <div className="pmy-guide-phone-prefix">
                    <img
                      src={getFlagUrl(currentDdi.iso)}
                      alt={currentDdi.iso || ""}
                      className="pmy-guide-phone-flag"
                    />
                    <select
                      className="pmy-form-input pmy-guide-phone-select"
                      value={editGuideDdi}
                      onChange={e => setEditGuideDdi(e.target.value)}
                      aria-label={ui("DDI do WhatsApp", "WhatsApp country code")}
                    >
                      {ddiList.map((d,i) => <option key={i} value={d.code}>{d.code}</option>)}
                    </select>
                  </div>
                  <input
                    type="tel"
                    className="pmy-form-input"
                    placeholder="912 345 678"
                    value={editGuideWhatsapp}
                    onChange={e => setEditGuideWhatsapp(e.target.value)}
                  />
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
                      navigator.clipboard.writeText(url)
                        .then(() => notify?.(ui("Link copiado.", "Link copied."), "success"))
                        .catch(() => notify?.(ui("Não foi possível copiar o link.", "Could not copy the link."), "danger"));
                    }} className="pmy-ds-migrated-1jfo6nj">
                      📋 Copiar
                    </button>
                  </div>
                )}
              </div>
            </div>
            <div className="pmy-ds-migrated-y37ip1">
              <button type="submit" className="pmy-btn-submit pmy-ds-migrated-ckcaff">
                {ui("Salvar dados operacionais", "Save operational data")}
              </button>
              {!shopifyManaged && (
                <button type="button" onClick={() => { handleDeleteGuide(editingGuide); }}
                  className="pmy-ds-migrated-138e6nr" aria-label={ui("Excluir guia", "Delete guide")}>
                  <Icon name="trash" size={16} />
                </button>
              )}
              <button type="button" onClick={() => setEditingGuide(null)}
                className="pmy-ds-migrated-2o86xe">{ui("Cancelar", "Cancel")}</button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  return (
    <>
      {renderConnectModal()}
      {renderModal()}
      {renderEditGuideModal()}
    </>
  );
}
