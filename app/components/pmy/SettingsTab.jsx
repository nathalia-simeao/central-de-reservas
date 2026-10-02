import {
  Badge,
  Button,
  Card,
  FormField,
  Icon,
  Input,
  SectionHeader,
  Select,
  Table,
  Tabs,
  Toast,
} from "./PmyUI";

export default function SettingsTab(props) {
  const {
    activeMappingPlatform,
    activeTab,
    allPlatforms,
    fieldMappings,
    logoLightInputRef,
    logoDarkInputRef,
    handleBrandLogoChange,
    handleRemoveBrandLogo,
    handleThemeChange,
    handleRestoreThemeDefaults,
    handleImageShapeChange,
    handleSaveFieldMappings,
    handleResetFieldMappings,
    handleUpdateFieldMapping,
    imageShape,
    internalFields,
    logoOnLightUrl,
    logoOnDarkUrl,
    logoUploadingVariant,
    sidebarIsDark,
    activeSidebarLogoUrl,
    mappingSaveState,
    platformConnections,
    reservationPlatforms,
    setActiveMappingPlatform,
    settingsSaveMessage,
    theme,
    lang
  } = props;

  const tr = (pt, en) => lang === "en" ? en : pt;

  if (activeTab !== "configuracoes") return null;

  const fieldEnglish = {
    customerName: { label: "Customer Name", desc: "Passenger full name" },
    tourId: { label: "Tour / Product ID", desc: "Tour identifier in the PMY system" },
    startTime: { label: "Start Date and Time", desc: "Tour departure date and time" },
    status: { label: "Booking Status", desc: "State: CONFIRMED / CANCELED / PENDING" },
    email: { label: "Customer Email", desc: "Passenger contact email" },
    phone: { label: "Phone / WhatsApp", desc: "Number including country code" },
    quantity: { label: "Ticket Quantity", desc: "Total tickets by variant" },
    price: { label: "Total Amount Paid", desc: "Final booking amount" },
    currency: { label: "Currency", desc: "EUR, USD, BRL, etc." },
    bookingRef: { label: "Booking Reference", desc: "Unique booking ID from the platform" },
    language: { label: "Language", desc: "Tour or booking language" },
  };

  const fieldLabel = (field) =>
    lang === "en" ? (fieldEnglish[field.key]?.label || field.label) : field.label;
  const fieldDesc = (field) =>
    lang === "en" ? (fieldEnglish[field.key]?.desc || field.desc) : field.desc;

  const presets = [
    {
      key: "pmy",
      name: tr("Verde PMY", "PMY Green"),
      values: {
        bgColor: "#F4DCDC",
        surfaceColor: "#FFFFFF",
        inputBgColor: "#FFFFFF",
        primaryColor: "#006600",
        sidebarBg: "#FFFFFF",
        titleColor: "#006600",
        textColor: "#2B2B2B",
        sidebarTextColor: "#2B2B2B",
        sidebarMutedTextColor: "#777777",
        sidebarHoverBg: "#F2F7F2",
        sidebarActiveBg: "#006600",
        sidebarActiveTextColor: "#FFFFFF",
        sidebarBorderColor: "#E7ECE7",
      },
    },
    {
      key: "ocean",
      name: tr("Azul Oceano", "Ocean Blue"),
      values: {
        bgColor: "#DCE8F4",
        surfaceColor: "#FFFFFF",
        inputBgColor: "#FFFFFF",
        primaryColor: "#004E9A",
        sidebarBg: "#F0F6FF",
        titleColor: "#003377",
        textColor: "#1A2B3C",
        sidebarTextColor: "#17324A",
        sidebarMutedTextColor: "#60778D",
        sidebarHoverBg: "#E3EFFB",
        sidebarActiveBg: "#004E9A",
        sidebarActiveTextColor: "#FFFFFF",
        sidebarBorderColor: "#CADAEA",
      },
    },
    {
      key: "earth",
      name: tr("Laranja Terra", "Earth Orange"),
      values: {
        bgColor: "#FDF0E6",
        surfaceColor: "#FFFFFF",
        inputBgColor: "#FFFFFF",
        primaryColor: "#C45E00",
        sidebarBg: "#FFF8F2",
        titleColor: "#A04A00",
        textColor: "#2B2010",
        sidebarTextColor: "#3A2918",
        sidebarMutedTextColor: "#806A56",
        sidebarHoverBg: "#FCEBDD",
        sidebarActiveBg: "#C45E00",
        sidebarActiveTextColor: "#FFFFFF",
        sidebarBorderColor: "#EED8C5",
      },
    },
    {
      key: "purple",
      name: tr("Roxo Moderno", "Modern Purple"),
      values: {
        bgColor: "#F0ECF9",
        surfaceColor: "#FFFFFF",
        inputBgColor: "#FFFFFF",
        primaryColor: "#5E35B1",
        sidebarBg: "#FAF8FF",
        titleColor: "#4527A0",
        textColor: "#1A0A3B",
        sidebarTextColor: "#291A45",
        sidebarMutedTextColor: "#74638D",
        sidebarHoverBg: "#EEE8FA",
        sidebarActiveBg: "#5E35B1",
        sidebarActiveTextColor: "#FFFFFF",
        sidebarBorderColor: "#DDD3EE",
      },
    },
    {
      key: "black",
      name: tr("Preto Elegante", "Elegant Black"),
      values: {
        bgColor: "#F5F5F2",
        surfaceColor: "#FFFFFF",
        inputBgColor: "#FFFFFF",
        primaryColor: "#111111",
        sidebarBg: "#111111",
        titleColor: "#111111",
        textColor: "#1F1F1F",
        sidebarTextColor: "#F5F5F2",
        sidebarMutedTextColor: "#B8B8B3",
        sidebarHoverBg: "#2A2A2A",
        sidebarActiveBg: "#FFFFFF",
        sidebarActiveTextColor: "#111111",
        sidebarBorderColor: "#343434",
      },
    },
    {
      key: "minimal",
      name: tr("Minimalista", "Minimalist"),
      values: {
        bgColor: "#F8F8F6",
        surfaceColor: "#FFFFFF",
        inputBgColor: "#FFFFFF",
        primaryColor: "#333333",
        sidebarBg: "#FFFFFF",
        titleColor: "#111111",
        textColor: "#444444",
        sidebarTextColor: "#333333",
        sidebarMutedTextColor: "#7A7A7A",
        sidebarHoverBg: "#F1F1EF",
        sidebarActiveBg: "#333333",
        sidebarActiveTextColor: "#FFFFFF",
        sidebarBorderColor: "#E8E8E5",
      },
    },
  ];

  const colorFields = [
    ["bgColor", tr("Cor de Fundo Principal", "Main Background Color"), "#F4DCDC"],
    ["primaryColor", tr("Cor Primária", "Primary Color"), "#006600"],
    ["sidebarBg", tr("Cor de Fundo da Sidebar", "Sidebar Background Color"), "#FFFFFF"],
    ["titleColor", tr("Cor dos Títulos", "Heading Color"), "#006600"],
    ["textColor", tr("Cor do Texto Principal", "Main Text Color"), "#2B2B2B"],
    ["sidebarTextColor", tr("Texto da Sidebar", "Sidebar Text"), "#2B2B2B"],
    ["sidebarMutedTextColor", tr("Texto Secundário da Sidebar", "Secondary Sidebar Text"), "#777777"],
    ["sidebarActiveBg", tr("Fundo do Menu Ativo", "Active Menu Background"), theme.primaryColor || "#006600"],
    ["sidebarActiveTextColor", tr("Texto do Menu Ativo", "Active Menu Text"), "#FFFFFF"],
  ];

  const mappingTone =
    mappingSaveState?.status === "error"
      ? "danger"
      : mappingSaveState?.status === "dirty"
        ? "warning"
        : mappingSaveState?.status === "saving"
          ? "info"
          : "success";

  const activePlatformName =
    allPlatforms.find((platform) => platform.key === activeMappingPlatform)?.name ||
    activeMappingPlatform;

  return (
    <div className="pmy-ds-settings-stack">
      <Card>
        <SectionHeader
          eyebrow={tr("Marca", "Brand")}
          title={tr("Identidade da Agência", "Agency Identity")}
          subtitle={tr(
            "Configure uma versão para fundos claros e outra para fundos escuros. Os arquivos são salvos na Biblioteca PMY e a Central persiste apenas a referência da mídia.",
            "Configure one version for light backgrounds and another for dark backgrounds. Files are stored in the PMY Media Library and the Central persists only the media reference.",
          )}
          actions={
            <span className={`pmy-ds-theme-state ${sidebarIsDark ? "is-dark" : ""}`}>
              <Icon name={sidebarIsDark ? "eye" : "media"} size={14} />
              {sidebarIsDark
                ? tr("Sidebar escura · logo clara", "Dark sidebar · light logo")
                : tr("Sidebar clara · logo colorida", "Light sidebar · colored logo")}
            </span>
          }
        />

        {settingsSaveMessage ? (
          <Toast tone={settingsSaveMessage.includes("Erro") ? "danger" : "success"}>
            {settingsSaveMessage}
          </Toast>
        ) : null}

        <div className="pmy-brand-logo-grid pmy-ds-mt-4">
          <div className="pmy-brand-logo-card">
            <div className="pmy-brand-logo-card-head">
              <div>
                <strong>{tr("Logo para fundo claro", "Logo for light backgrounds")}</strong>
                <span>{tr("Use a versão verde/colorida da marca.", "Use the green/colored version of the brand.")}</span>
              </div>
              {logoOnLightUrl ? <Badge tone="success">{tr("Salva", "Saved")}</Badge> : null}
            </div>

            <div className="pmy-brand-logo-preview is-light">
              {logoOnLightUrl
                ? <img src={logoOnLightUrl} alt={tr("Logo para fundo claro", "Logo for light backgrounds")} />
                : <span>{tr("Sem logo clara", "No light-background logo")}</span>}
            </div>

            <input
              type="file"
              accept="image/png,image/jpeg,image/webp,image/svg+xml"
              onChange={(event) => handleBrandLogoChange("light", event)}
              className="pmy-ds-file-input"
              ref={logoLightInputRef}
            />

            <div className="pmy-brand-logo-actions">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                icon="upload"
                disabled={logoUploadingVariant === "light"}
                onClick={() => logoLightInputRef.current?.click()}
              >
                {logoUploadingVariant === "light"
                  ? tr("Salvando...", "Saving...")
                  : tr("Carregar versão clara", "Upload colored version")}
              </Button>

              {logoOnLightUrl ? (
                <Button
                  type="button"
                  variant="danger"
                  size="sm"
                  icon="trash"
                  onClick={() => handleRemoveBrandLogo("light")}
                >
                  {tr("Remover", "Remove")}
                </Button>
              ) : null}
            </div>
          </div>

          <div className="pmy-brand-logo-card">
            <div className="pmy-brand-logo-card-head">
              <div>
                <strong>{tr("Logo para fundo escuro", "Logo for dark backgrounds")}</strong>
                <span>{tr("Use a versão branca/negativa da marca.", "Use the white/reversed version of the brand.")}</span>
              </div>
              {logoOnDarkUrl ? <Badge tone="success">{tr("Salva", "Saved")}</Badge> : null}
            </div>

            <div className="pmy-brand-logo-preview is-dark">
              {logoOnDarkUrl
                ? <img src={logoOnDarkUrl} alt={tr("Logo para fundo escuro", "Logo for dark backgrounds")} />
                : logoOnLightUrl
                  ? <img
                      src={logoOnLightUrl}
                      alt={tr("Prévia branca automática", "Automatic white preview")}
                      className="is-auto-white"
                    />
                  : <span>{tr("Sem logo escura", "No dark-background logo")}</span>}
            </div>

            <input
              type="file"
              accept="image/png,image/jpeg,image/webp,image/svg+xml"
              onChange={(event) => handleBrandLogoChange("dark", event)}
              className="pmy-ds-file-input"
              ref={logoDarkInputRef}
            />

            <div className="pmy-brand-logo-actions">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                icon="upload"
                disabled={logoUploadingVariant === "dark"}
                onClick={() => logoDarkInputRef.current?.click()}
              >
                {logoUploadingVariant === "dark"
                  ? tr("Salvando...", "Saving...")
                  : tr("Carregar versão branca", "Upload white version")}
              </Button>

              {logoOnDarkUrl ? (
                <Button
                  type="button"
                  variant="danger"
                  size="sm"
                  icon="trash"
                  onClick={() => handleRemoveBrandLogo("dark")}
                >
                  {tr("Remover", "Remove")}
                </Button>
              ) : null}
            </div>

            {!logoOnDarkUrl && logoOnLightUrl ? (
              <div className="pmy-ds-list-item__description pmy-ds-mt-2">
                {tr(
                  "Sem versão branca enviada. A Central cria uma versão branca automaticamente enquanto isso.",
                  "No white version has been uploaded. The Central automatically generates a white version in the meantime.",
                )}
              </div>
            ) : null}
          </div>
        </div>

        <div className="pmy-brand-logo-current">
          <span>{tr("Logo usada agora na sidebar", "Logo currently used in the sidebar")}</span>
          <div
            className="pmy-ds-logo-current-preview"
            style={{ "--current-sidebar-bg": theme.sidebarBg }}
          >
            {activeSidebarLogoUrl
              ? <img
                  src={activeSidebarLogoUrl}
                  alt={tr("Logo ativa", "Active logo")}
                  className={sidebarIsDark && !logoOnDarkUrl && logoOnLightUrl ? "is-auto-white" : ""}
                />
              : <strong>Portugal Me & You</strong>}
          </div>
        </div>
      </Card>

      <Card>
        <SectionHeader
          eyebrow={tr("Aparência", "Appearance")}
          title={tr("Personalização Visual", "Visual Customization")}
          subtitle={tr(
            "Adapte cores, tipografia e imagens à identidade da sua marca. As alterações são salvas automaticamente.",
            "Adapt colors, typography and images to your brand. Changes are saved automatically.",
          )}
        />

        <FormField label={tr("Esquemas prontos", "Ready-made schemes")}>
          <div className="pmy-ds-theme-presets">
            {presets.map((preset) => (
              <button
                key={preset.key}
                type="button"
                className={`pmy-ds-theme-preset is-${preset.key}`}
                onClick={() =>
                  Object.entries(preset.values).forEach(([key, value]) =>
                    handleThemeChange(key, value),
                  )
                }
              >
                <span className="pmy-ds-theme-swatches" aria-hidden="true">
                  <span className="pmy-ds-theme-swatch" />
                  <span className="pmy-ds-theme-swatch" />
                  <span className="pmy-ds-theme-swatch" />
                </span>
                {preset.name}
              </button>
            ))}
          </div>
        </FormField>

        <div className="pmy-settings-color-grid pmy-ds-mt-5">
          {colorFields.map(([key, label, fallback]) => {
            const value = theme[key] || fallback;
            return (
              <div key={key} className="pmy-ds-color-field">
                <span className="pmy-ds-color-field__label">{label}</span>
                <div className="pmy-ds-color-control">
                  <input
                    type="color"
                    value={value}
                    onChange={(event) => handleThemeChange(key, event.target.value)}
                    className="pmy-ds-color-picker"
                  />
                  <Input
                    type="text"
                    className="pmy-ds-mono"
                    value={theme[key] || ""}
                    onChange={(event) => handleThemeChange(key, event.target.value)}
                  />
                </div>
              </div>
            );
          })}

          <FormField label={tr("Tipo de Fonte", "Font Family")}>
            <Select
              className="pmy-ds-theme-field-select"
              value={theme.fontFamily}
              onChange={(event) => handleThemeChange("fontFamily", event.target.value)}
            >
              <option value="Assistant">{tr("Assistant (Padrão)", "Assistant (Default)")}</option>
              <option value="Inter">Inter</option>
              <option value="Roboto">Roboto</option>
              <option value="Poppins">Poppins</option>
              <option value="Lato">Lato</option>
              <option value="Open Sans">Open Sans</option>
              <option value="Montserrat">Montserrat</option>
              <option value="Nunito">Nunito</option>
              <option value="Georgia">Georgia (Serif)</option>
            </Select>
          </FormField>

          <FormField label={tr("Tamanho da Fonte", "Font Size")}>
            <Select
              className="pmy-ds-theme-field-select"
              value={theme.fontSize}
              onChange={(event) => handleThemeChange("fontSize", event.target.value)}
            >
              <option value="12px">{tr("Pequena (12px)", "Small (12px)")}</option>
              <option value="13px">{tr("Compacta (13px)", "Compact (13px)")}</option>
              <option value="14px">{tr("Padrão (14px)", "Default (14px)")}</option>
              <option value="15px">{tr("Média (15px)", "Medium (15px)")}</option>
              <option value="16px">{tr("Grande (16px)", "Large (16px)")}</option>
            </Select>
          </FormField>

          <FormField label={tr("Formato das Imagens de Perfil", "Profile Image Shape")}>
            <Tabs
              className="pmy-ds-theme-shape-tabs"
              items={[
                { value: "circle", label: tr("Redonda", "Circle") },
                { value: "rounded", label: tr("Arredondada", "Rounded") },
              ]}
              value={imageShape}
              onChange={handleImageShapeChange}
              ariaLabel={tr("Formato das imagens", "Image shape")}
            />
          </FormField>
        </div>

        <div
          className="pmy-ds-theme-preview"
          style={{
            "--preview-bg": theme.bgColor,
            "--preview-sidebar": theme.sidebarBg,
            "--preview-sidebar-border": theme.sidebarBorderColor || "#E7ECE7",
            "--preview-sidebar-muted": theme.sidebarMutedTextColor || "#777777",
            "--preview-sidebar-text": theme.sidebarTextColor || theme.textColor,
            "--preview-sidebar-active": theme.sidebarActiveBg || theme.primaryColor,
            "--preview-sidebar-active-text": theme.sidebarActiveTextColor || "#FFFFFF",
            "--preview-title": theme.titleColor,
            "--preview-text": theme.textColor,
            "--preview-primary": theme.primaryColor,
            "--preview-primary-contrast": theme.sidebarActiveTextColor || "#FFFFFF",
            "--preview-font": theme.fontFamily,
            "--preview-size": theme.fontSize,
          }}
        >
          <div className="pmy-ds-theme-preview__label">Preview</div>
          <div className="pmy-ds-theme-preview__body">
            <div className="pmy-ds-theme-preview__sidebar">
              <div className="pmy-ds-theme-preview__brand">PMY</div>
              <div className="pmy-ds-theme-preview__menu">Dashboard</div>
              <div className="pmy-ds-theme-preview__menu is-active">
                {tr("Configurações", "Settings")}
              </div>
              <div className="pmy-ds-theme-preview__credit">Portugal Me & You</div>
            </div>

            <div>
              <div className="pmy-ds-theme-preview__title">
                {tr("Visão Geral", "Overview")}
              </div>
              <div className="pmy-ds-theme-preview__text">
                {tr(
                  "Texto de exemplo com a fonte e cor selecionadas.",
                  "Sample text using the selected font and color.",
                )}
              </div>
              <span className="pmy-ds-theme-preview__button">
                {tr("Botão Primário", "Primary Button")}
              </span>
            </div>
          </div>
        </div>

        <div className="pmy-ds-settings-actions">
          <Button
            type="button"
            variant="secondary"
            icon="refresh"
            onClick={handleRestoreThemeDefaults}
          >
            {tr("Restaurar padrões", "Restore defaults")}
          </Button>
        </div>
      </Card>

      <Card>
        <SectionHeader
          eyebrow={tr("Integrações", "Integrations")}
          title={tr("Mapeamento de Campos entre Plataformas", "Field Mapping Across Platforms")}
          subtitle={tr(
            "Defina como os campos de cada plataforma externa correspondem aos campos internos da PMY. Cada canal possui seu próprio mapeamento persistido.",
            "Define how fields from each external platform map to PMY internal fields. Each channel has its own persisted mapping.",
          )}
        />

        {mappingSaveState?.platform === activeMappingPlatform && mappingSaveState?.message ? (
          <Toast tone={mappingTone}>{mappingSaveState.message}</Toast>
        ) : null}

        <div className="pmy-mapping-platform-tabs pmy-ds-mt-4">
          {reservationPlatforms.map((platform) => (
            <button
              key={platform.key}
              className={`pmy-mapping-tab ${activeMappingPlatform === platform.key ? "active" : ""}`}
              onClick={() => setActiveMappingPlatform(platform.key)}
            >
              <span>{platform.logo}</span>
              {platform.name}
              {platformConnections[platform.key]?.connected ? (
                <Icon name="check" size={12} />
              ) : null}
            </button>
          ))}
        </div>

        {!platformConnections[activeMappingPlatform]?.connected ? (
          <Toast tone="warning">
            {tr(
              "Esta plataforma não está conectada. Você pode pré-configurar o mapeamento agora e ativar a conexão depois.",
              "This platform is not connected. You can preconfigure the mapping now and activate the connection later.",
            )}
          </Toast>
        ) : null}

        <div className="pmy-ds-mapping-legend pmy-ds-mt-4">
          <span className="pmy-ds-row">
            <code className="pmy-ds-code-chip">campo_pmy</code>
            {tr("campo fixo interno", "fixed internal field")}
          </span>
          <span className="pmy-ds-row">
            <code className="pmy-ds-code-chip">campo.api</code>
            {tr("campo da plataforma", "platform field")}
          </span>
          <Badge tone="danger">{tr("Obrigatório", "Required")}</Badge>
          <Badge>{tr("Opcional", "Optional")}</Badge>
        </div>

        <Table className="pmy-mapping-table">
          <thead>
            <tr>
              <th>{tr("Campo Interno PMY", "PMY Internal Field")}</th>
              <th className="pmy-ds-mapping-arrow-col" />
              <th>{tr("Campo na API", "API field")} {activePlatformName}</th>
              <th className="pmy-ds-mapping-type-col">{tr("Tipo", "Type")}</th>
            </tr>
          </thead>
          <tbody>
            {internalFields.map((field) => (
              <tr
                key={field.key}
                className={`pmy-mapping-row ${platformConnections[activeMappingPlatform]?.connected ? "active-conn" : ""}`}
              >
                <td>
                  <div className="pmy-ds-mapping-description">
                    <span className="pmy-mapping-internal-label">{field.key}</span>
                    <strong>{fieldLabel(field)}</strong>
                    <span className="pmy-ds-mapping-description__copy">{fieldDesc(field)}</span>
                  </div>
                </td>
                <td className="pmy-mapping-arrow">
                  <Icon name="chevronRight" size={14} />
                </td>
                <td>
                  <input
                    type="text"
                    className="pmy-mapping-field-input"
                    value={fieldMappings[activeMappingPlatform]?.[field.key] || ""}
                    onChange={(event) =>
                      handleUpdateFieldMapping(
                        activeMappingPlatform,
                        field.key,
                        event.target.value,
                      )
                    }
                    placeholder={`${tr("Nome do campo em", "Field name in")} ${activePlatformName}`}
                  />
                </td>
                <td>
                  <Badge tone={field.required ? "danger" : "neutral"}>
                    {field.required ? tr("Obrig.", "Req.") : tr("Opc.", "Opt.")}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>

        <div className="pmy-ds-meta-box pmy-ds-mt-5">
          <h4 className="pmy-ds-capacity-heading">
            {tr("Transformações de Status Automáticas", "Automatic Status Transformations")}
          </h4>
          <div className="pmy-ds-transform-grid">
            {[
              { label: "CONFIRMED", values: ["confirmed", "CONFIRMED", "accepted", "aceptada", "booked"] },
              { label: "CANCELED", values: ["cancelled", "canceled", "CANCELLED", "cancelada", "rejected"] },
              { label: "PENDING", values: ["pending", "PENDING", "awaiting", "pendiente", "on_hold"] },
              { label: "EUR €", values: ["EUR", "Eur", "€", "euro", "euros"] },
            ].map((transform) => (
              <div key={transform.label} className="pmy-ds-transform-card">
                <div className="pmy-ds-transform-card__title">→ {transform.label}</div>
                <div className="pmy-ds-transform-values">
                  {transform.values.map((value) => (
                    <span key={value} className="pmy-ds-transform-value">{value}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="pmy-ds-settings-actions">
          <Button
            type="button"
            icon="check"
            onClick={handleSaveFieldMappings}
            disabled={mappingSaveState?.status === "saving"}
          >
            {mappingSaveState?.status === "saving" &&
            mappingSaveState?.platform === activeMappingPlatform
              ? tr("Salvando...", "Saving...")
              : `${tr("Salvar", "Save")} · ${activePlatformName}`}
          </Button>

          <Button
            type="button"
            variant="secondary"
            icon="refresh"
            onClick={handleResetFieldMappings}
            disabled={mappingSaveState?.status === "saving"}
          >
            {tr("Restaurar e salvar padrões", "Restore and save defaults")}
          </Button>
        </div>
      </Card>
    </div>
  );
}
