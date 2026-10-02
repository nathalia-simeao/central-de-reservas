/* eslint-disable jsx-a11y/no-static-element-interactions -- media preview backdrop dismisses only on direct backdrop press */
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  FormField,
  Icon,
  Input,
  LoadingState,
  SectionHeader,
  Select,
  Switch,
  Tabs,
  Toast,
} from "./PmyUI";

// PMY unified media library: PostgreSQL catalog + Shopify Files/product references.
export default function MediaTab(props) {
  const {
    activeTab,
    handleCopyMediaUrl,
    handleDeleteMedia,
    handleMediaUpload,
    mediaCategoryInput,
    mediaFilter,
    mediaLabelInput,
    mediaList,
    mediaPreview,
    mediaLoading,
    mediaLoadError,
    mediaHasMore,
    loadMediaLibrary,
    mediaUploadError,
    mediaUploadProgress,
    mediaUploadRef,
    mediaUploading,
    setMediaCategoryInput,
    setMediaFilter,
    setMediaLabelInput,
    setMediaPreview,
    setShowShopifySource,
    showShopifySource,
    lang
  } = props;

  const tr = (pt, en) => lang === "en" ? en : pt;

  if (activeTab !== "midias") return null;

  const shopifyMediaCount = mediaList.filter((item) =>
    String(item.source || "").startsWith("shopify_"),
  ).length;
  const pmyUploadCount = mediaList.filter(
    (item) => !String(item.source || "").startsWith("shopify_"),
  ).length;

  const visibleMedia = mediaList.filter((media) => {
    if (!showShopifySource && media.source?.startsWith("shopify")) return false;
    if (mediaFilter !== "all" && media.category !== mediaFilter) return false;
    return true;
  });

  const countFor = (category) =>
    mediaList.filter((media) => {
      if (!showShopifySource && media.source?.startsWith("shopify")) return false;
      return category === "all" || media.category === category;
    }).length;

  const filterItems = [
    { value: "all", label: `${tr("Todas", "All")} (${countFor("all")})`, icon: "media" },
    { value: "logo", label: `${tr("Logos", "Logos")} (${countFor("logo")})` },
    { value: "guide", label: `${tr("Guias", "Guides")} (${countFor("guide")})`, icon: "users" },
    { value: "tour", label: `${tr("Tours", "Tours")} (${countFor("tour")})`, icon: "calendar" },
    { value: "general", label: `${tr("Geral", "General")} (${countFor("general")})`, icon: "file" },
  ];

  const categoryLabel = (category) => {
    if (category === "logo") return "Logo";
    if (category === "guide") return tr("Guia", "Guide");
    if (category === "tour") return "Tour";
    return tr("Geral", "General");
  };

  const sourceLabel = (source) => {
    if (source === "shopify_product") return tr("Produto", "Product");
    if (source === "shopify_files") return "Shopify Files";
    return "PMY";
  };

  return (
    <>
      {mediaPreview ? (
        <div
            className="pmy-media-preview-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setMediaPreview(null);
          }}
        >
          <img
            src={mediaPreview}
            alt=""
            className="pmy-media-preview-img"
          />
        </div>
      ) : null}

      <div className="pmy-media-layout">
        <div>
          <div className="pmy-ds-media-toolbar">
            <Tabs
              items={filterItems}
              value={mediaFilter}
              onChange={setMediaFilter}
              ariaLabel={tr("Categorias da biblioteca", "Library categories")}
            />

            <div className="pmy-ds-media-source-control">
              <Switch
                checked={showShopifySource}
                onChange={setShowShopifySource}
                label={tr("Fontes Shopify", "Shopify sources")}
                meta={`${shopifyMediaCount} ${tr("itens", "items")}`}
              />
            </div>
          </div>

          {mediaLoadError && mediaList.length > 0 ? (
            <Toast tone="danger">{mediaLoadError}</Toast>
          ) : null}

          {mediaLoadError && mediaList.length === 0 ? (
            <Card>
              <ErrorState
                title={tr("Não foi possível carregar a biblioteca", "Could not load the library")}
                description={mediaLoadError}
                action={(
                  <Button type="button" variant="secondary" icon="refresh" onClick={() => loadMediaLibrary({ reset: true })}>
                    {tr("Tentar novamente", "Try again")}
                  </Button>
                )}
              />
            </Card>
          ) : mediaLoading && mediaList.length === 0 ? (
            <Card>
              <LoadingState
                title={tr("Carregando biblioteca", "Loading library")}
                description={tr(
                  "Buscando somente a primeira página de mídias.",
                  "Fetching only the first page of media.",
                )}
              />
            </Card>
          ) : visibleMedia.length === 0 ? (
            <Card>
              <EmptyState
                icon="media"
                title={tr("Nenhuma mídia nesta categoria", "No media in this category")}
                description={tr(
                  "Use o painel de upload para adicionar arquivos à biblioteca PMY.",
                  "Use the upload panel to add files to the PMY library.",
                )}
              />
            </Card>
          ) : (
            <>
            <div className="pmy-media-grid">
              {visibleMedia.map((media) => (
                <div
                  key={media.id}
                  className="pmy-media-card"
                  onClick={() => setMediaPreview(media.url)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      setMediaPreview(media.url);
                    }
                  }}
                >
                  <div className="pmy-ds-source-badge">
                    <Icon name={media.source?.startsWith("shopify") ? "external" : "media"} size={11} />
                    {sourceLabel(media.source)}
                  </div>

                  <div className="pmy-media-actions">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      icon="copy"
                      iconOnly
                      title={tr("Copiar URL", "Copy URL")}
                      aria-label={tr("Copiar URL", "Copy URL")}
                      onClick={() => handleCopyMediaUrl(media.url)}
                    />
                    {!media.source?.startsWith("shopify") ? (
                      <Button
                        type="button"
                        variant="danger"
                        size="sm"
                        icon="trash"
                        iconOnly
                        title={tr("Remover", "Remove")}
                        aria-label={tr("Remover", "Remove")}
                        onClick={() => handleDeleteMedia(media.id)}
                      />
                    ) : null}
                  </div>

                  {media.mimetype?.startsWith("image/") ? (
                    <img
                      src={media.url}
                      alt={media.label || media.filename}
                      className="pmy-media-thumb"
                      onError={(event) => {
                        event.currentTarget.style.display = "none";
                        event.currentTarget.nextElementSibling?.classList.remove("is-hidden");
                      }}
                    />
                  ) : null}

                  <div
                    className={[
                      "pmy-media-thumb-placeholder",
                      "pmy-ds-media-placeholder",
                      media.mimetype?.startsWith("image/") ? "is-hidden" : "",
                    ].filter(Boolean).join(" ")}
                  >
                    <Icon name="file" size={28} />
                  </div>

                  <div className="pmy-media-info">
                    <Badge tone="neutral">{categoryLabel(media.category)}</Badge>
                    <div className="pmy-media-label" title={media.label || media.filename}>
                      {media.label || media.filename}
                    </div>
                    <div className="pmy-media-meta">
                      {media.source === "shopify_product" ? (
                        <span className="pmy-ds-media-meta-accent">{media.productTitle} · </span>
                      ) : null}
                      {media.filename?.length > 25
                        ? `${media.filename.slice(0, 22)}...`
                        : media.filename}
                      {media.width && media.height ? (
                        <span> · {media.width}×{media.height}</span>
                      ) : null}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {mediaHasMore ? (
              <div className="pmy-ds-actions pmy-ds-mt-3">
                <Button
                  type="button"
                  variant="secondary"
                  icon="refresh"
                  disabled={mediaLoading}
                  onClick={() => loadMediaLibrary?.({ reset: false })}
                >
                  {mediaLoading
                    ? tr("Carregando...", "Loading...")
                    : tr("Carregar mais mídias", "Load more media")}
                </Button>
              </div>
            ) : null}
            </>
          )}
        </div>

        <div className="pmy-media-upload-panel">
          <Card className="pmy-ds-upload-panel">
            <SectionHeader
              eyebrow={tr("Biblioteca", "Library")}
              title={tr("Adicionar mídia", "Add media")}
              subtitle={tr(
                "Uploads próprios são armazenados no Shopify Files e catalogados pela Central.",
                "Your uploads are stored in Shopify Files and catalogued by the Central.",
              )}
            />

            <div className="pmy-ds-form-stack">
              <FormField label={tr("Categoria", "Category")}>
                <Select
                  value={mediaCategoryInput}
                  onChange={(event) => setMediaCategoryInput(event.target.value)}
                >
                  <option value="logo">Logo</option>
                  <option value="guide">{tr("Foto de Guia", "Guide Photo")}</option>
                  <option value="tour">{tr("Imagem de Tour", "Tour Image")}</option>
                  <option value="general">{tr("Geral", "General")}</option>
                </Select>
              </FormField>

              <FormField label={tr("Nome/Etiqueta (opcional)", "Name/Label (optional)")}>
                <Input
                  type="text"
                  placeholder={tr("Ex: Logo PMY 2024", "E.g. PMY Logo 2024")}
                  value={mediaLabelInput}
                  onChange={(event) => setMediaLabelInput(event.target.value)}
                />
              </FormField>

              <input
                type="file"
                accept="image/*,application/pdf"
                ref={mediaUploadRef}
                className="pmy-ds-file-input"
                onChange={handleMediaUpload}
              />

              <Button
                type="button"
                variant="secondary"
                icon="refresh"
                disabled={mediaLoading}
                onClick={() =>
                  loadMediaLibrary?.({ reset: true, refreshShopify: true })
                }
              >
                {mediaLoading
                  ? tr("Atualizando fontes...", "Refreshing sources...")
                  : tr("Atualizar fontes Shopify", "Refresh Shopify sources")}
              </Button>

              <span className="pmy-ds-muted pmy-ds-text-xs">
                {tr(
                  "Shopify Files e imagens de produtos são atualizados em segundo plano e também podem ser sincronizados manualmente aqui.",
                  "Shopify Files and product images refresh in the background and can also be synced manually here.",
                )}
              </span>

              {mediaUploadError ? (
                <Toast tone="danger">{mediaUploadError}</Toast>
              ) : null}

              <div
                className="pmy-upload-zone"
                onClick={() => !mediaUploading && mediaUploadRef.current?.click()}
                role="button"
                tabIndex={0}
                onKeyDown={(event) => {
                  if (!mediaUploading && (event.key === "Enter" || event.key === " ")) {
                    event.preventDefault();
                    mediaUploadRef.current?.click();
                  }
                }}
              >
                {mediaUploading ? (
                  <div className="pmy-ds-upload-zone-copy">
                    <Icon name="upload" size={24} />
                    <div className="pmy-ds-upload-zone-title">
                      {tr("Enviando", "Uploading")} · {mediaUploadProgress}%
                    </div>
                    <div className="pmy-ds-progress">
                      <div
                        className="pmy-ds-progress__bar"
                        style={{ "--pmy-progress": `${mediaUploadProgress}%` }}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="pmy-ds-upload-zone-copy">
                    <Icon name="upload" size={28} />
                    <div className="pmy-ds-upload-zone-title">
                      {tr("Clique para selecionar arquivo", "Click to select a file")}
                    </div>
                    <div className="pmy-ds-upload-zone-meta">
                      PNG, JPG, GIF, PDF · {tr("Máx", "Max")} 10MB
                    </div>
                  </div>
                )}
              </div>

              <div className="pmy-ds-help-box">
                <strong>{tr("Biblioteca única PMY", "Unified PMY Library")}</strong>
                <div>{tr("Uploads feitos aqui são gravados no ", "Uploads made here are stored in ")}<strong>Shopify Files + PostgreSQL</strong>.</div>
                <div><strong>Logo</strong> · {tr("usada na identidade da Central", "used in the Central identity")}</div>
                <div><strong>{tr("Guia", "Guide")}</strong> · {tr("foto de perfil dos guias", "guide profile photo")}</div>
                <div><strong>Tour</strong> · {tr("imagem dos passeios", "tour image")}</div>
                <div>{tr("Use o botão de copiar para obter a URL e clique na imagem para ampliar.", "Use the copy button to get the URL and click an image to enlarge it.")}</div>
              </div>

              <div className="pmy-ds-stat-grid">
                {[
                  { label: tr("Total", "Total"), count: mediaList.length, tone: "accent" },
                  { label: "PMY", count: pmyUploadCount, tone: "accent" },
                  { label: "Shopify", count: shopifyMediaCount, tone: "warning" },
                  {
                    label: tr("Tours", "Tours"),
                    count: mediaList.filter((media) => media.category === "tour").length,
                    tone: "warning",
                  },
                ].map((stat) => (
                  <div key={stat.label} className="pmy-ds-stat">
                    <strong className={`pmy-ds-stat__value ${stat.tone === "warning" ? "pmy-ds-stat__value--warning" : ""}`}>
                      {stat.count}
                    </strong>
                    <span className="pmy-ds-stat__label">{stat.label}</span>
                  </div>
                ))}
              </div>

              <div className="pmy-ds-source-legend">
                <div className="pmy-ds-source-legend__row">
                  <span className="pmy-ds-source-legend__dot" />
                  <strong>PMY</strong>
                  <span>{tr("uploads gerenciados pela Central", "uploads managed by the Central")}</span>
                </div>
                <div className="pmy-ds-source-legend__row">
                  <span className="pmy-ds-source-legend__dot pmy-ds-source-legend__dot--shopify" />
                  <strong>Shopify</strong>
                  <span>{tr("referências sincronizadas de Files e produtos", "synced Files and product references")}</span>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}
