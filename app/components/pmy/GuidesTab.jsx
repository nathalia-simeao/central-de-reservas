import {
  Badge,
  Button,
  Card,
  EmptyState,
  Icon,
  SectionHeader,
  Tabs,
} from "./PmyUI";

export default function GuidesTab(props) {
  const {
    activeTab,
    guideAssignments = [],
    guideShopifySync,
    guidesList,
    handleDeleteGuide,
    handleOpenEditGuide,
    setActiveModal,
    setSelectedGuideInfo,
    setUpcomingToursFilter,
    t,
    upcomingToursFilter,
    lang,
  } = props;

  const tr = (pt, en) => lang === "en" ? en : pt;

  if (activeTab !== "guias") return null;

  const upcomingTabs = [
    { value: "today", label: t.filter_today },
    { value: "7d", label: t.view_7d },
    { value: "15d", label: tr("15 dias", "15 days") },
    { value: "30d", label: tr("30 dias", "30 days") },
  ];

  const lisbonDateKey = (value) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    const parts = Object.fromEntries(
      new Intl.DateTimeFormat("en-GB", {
        timeZone: "Europe/Lisbon",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      })
        .formatToParts(date)
        .filter((part) => part.type !== "literal")
        .map((part) => [part.type, part.value]),
    );
    return `${parts.year}-${parts.month}-${parts.day}`;
  };

  const now = new Date();
  const todayLisbon = lisbonDateKey(now);
  const filterDays =
    upcomingToursFilter === "today"
      ? 0
      : Number.parseInt(upcomingToursFilter, 10) || 7;
  const filterLimit = new Date(now);
  filterLimit.setDate(filterLimit.getDate() + filterDays);

  const upcomingAssignments = (guideAssignments || [])
    .filter((assignment) => assignment?.status === "ASSIGNED")
    .filter((assignment) => {
      const start = new Date(assignment.startTime);
      if (Number.isNaN(start.getTime()) || start < now) return false;
      if (upcomingToursFilter === "today") {
        return lisbonDateKey(start) === todayLisbon;
      }
      return start <= filterLimit;
    })
    .sort((a, b) => new Date(a.startTime) - new Date(b.startTime));

  const formatAssignmentWhen = (assignment) => {
    const start = new Date(assignment.startTime);
    const datePart = start.toLocaleDateString(
      lang === "pt" ? "pt-PT" : "en-GB",
      {
        timeZone: "Europe/Lisbon",
        day: "2-digit",
        month: "short",
      },
    );
    const timePart = start.toLocaleTimeString(
      lang === "pt" ? "pt-PT" : "en-GB",
      {
        timeZone: "Europe/Lisbon",
        hour: "2-digit",
        minute: "2-digit",
      },
    );
    return `${datePart} · ${timePart} · ${assignment.guide?.name || tr("Guia não encontrado", "Guide unavailable")}`;
  };

  return (
    <div className="pmy-ds-stack">
      <Card>
        <SectionHeader
          eyebrow={tr("Fonte dos perfis", "Profile source")}
          title={tr("Guias sincronizados do Shopify", "Guides synced from Shopify")}
          subtitle={tr(
            "Nome, foto, descrição, vídeo, passeio exclusivo e galeria vêm do metaobjeto Guias. A Central mantém contato, UTM e escala.",
            "Name, photo, description, video, exclusive tour and gallery come from the Guides metaobject. The Central keeps contact, UTM and scheduling.",
          )}
          actions={
            <Button
              type="button"
              variant="secondary"
              size="sm"
              icon="refresh"
              onClick={() => window.location.reload()}
            >
              {tr("Atualizar status", "Refresh status")}
            </Button>
          }
        />

        <div className={["pmy-ds-state-panel", guideShopifySync?.success ? "is-success" : "is-warning"].filter(Boolean).join(" ")}>
          <div className={["pmy-ds-state-title", guideShopifySync?.success ? "is-success" : "is-warning"].filter(Boolean).join(" ")}>
            {guideShopifySync?.success === null
              ? tr("Atualização do Shopify em segundo plano", "Shopify refresh running in background")
              : guideShopifySync?.success
                ? tr(
                    String(guideShopifySync.total || 0) + " perfis encontrados no Shopify",
                    String(guideShopifySync.total || 0) + " profiles found in Shopify",
                  )
                : tr("Sincronização do Shopify precisa de atenção", "Shopify sync needs attention")}
          </div>
          <div className="pmy-ds-migrated-rhcrii">
            {guideShopifySync?.success === null
              ? tr(
                  "A Central abriu com os dados salvos e está atualizando os perfis sem bloquear a página.",
                  "The Central opened with cached data and is refreshing profiles without blocking the page.",
                )
              : guideShopifySync?.success
                ? tr(
                    "Os perfis ficam salvos na Central e são reconciliados em segundo plano. Alterações editoriais devem ser feitas no Shopify.",
                    "Profiles stay cached in the Central and are reconciled in the background. Editorial changes should be made in Shopify.",
                  )
                : (guideShopifySync?.error || tr(
                    "A Central continuará mostrando os guias já salvos e tentará sincronizar novamente em segundo plano.",
                    "The Central will keep showing saved guides and retry the sync in the background.",
                  ))}
          </div>
        </div>
      </Card>

      <Card>
        <SectionHeader
          eyebrow={tr("Equipe", "Team")}
          title={t.registered_guides_list}
          subtitle={tr(
            "Os perfis editoriais vêm do Shopify; dados operacionais e escalas continuam na Central.",
            "Editorial profiles come from Shopify; operational data and assignments remain in the Central.",
          )}
        />

        {guidesList.length === 0 ? (
          <EmptyState
            icon="users"
            title={tr("Nenhum guia cadastrado", "No guides registered")}
            description={tr(
              "Os guias cadastrados aparecerão aqui com foto e ações rápidas.",
              "Registered guides will appear here with their photo and quick actions.",
            )}
          />
        ) : (
          <div className="pmy-guides-grid">
            {guidesList.map((guide) => (
              <div
                key={guide.id}
                className="pmy-guide-card-square"
                role="button"
                tabIndex={0}
                onClick={() => {
                  setSelectedGuideInfo(guide);
                  setActiveModal("guideDetails");
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    setSelectedGuideInfo(guide);
                    setActiveModal("guideDetails");
                  }
                }}
              >
                <img src={guide.photo} alt={guide.name} className="pmy-guide-square-img" />
                <div className="pmy-guide-square-name">
                  {guide.name.split(" ")[0]}<br />
                  {guide.name.split(" ").slice(1).join(" ")}
                </div>
                <div className="pmy-u-mt-2">
                  <Badge tone={guide.shopifyMetaobjectId ? "accent" : "neutral"}>
                    {guide.shopifyMetaobjectId ? "Shopify" : tr("Local", "Local")}
                  </Badge>
                </div>

                <div className="pmy-ds-guide-actions" onClick={(event) => event.stopPropagation()}>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    icon="settings"
                    onClick={() => handleOpenEditGuide(guide)}
                  >
                    {guide.shopifyMetaobjectId
                      ? tr("Dados operacionais", "Operational data")
                      : tr("Editar", "Edit")}
                  </Button>

                  {guide.referralLink ? (
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      icon="link"
                      iconOnly
                      aria-label={tr("Copiar link de indicação", "Copy referral link")}
                      title={tr("Copiar link de indicação", "Copy referral link")}
                      onClick={() =>
                        navigator.clipboard
                          .writeText(guide.referralLink)
                          .then(() => alert(tr("Link copiado!", "Link copied!")))
                          .catch(() => {})
                      }
                    />
                  ) : null}

                  {!guide.shopifyMetaobjectId ? (
                    <Button
                      type="button"
                      variant="danger"
                      size="sm"
                      icon="trash"
                      iconOnly
                      aria-label={tr("Excluir guia", "Delete guide")}
                      onClick={() => handleDeleteGuide(guide.id)}
                    />
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card>
        <SectionHeader
          eyebrow={tr("Agenda", "Schedule")}
          title={t.upcoming_tours_list}
          actions={
            <Tabs
              items={upcomingTabs}
              value={upcomingToursFilter}
              onChange={setUpcomingToursFilter}
              ariaLabel={tr("Período dos próximos tours", "Upcoming tours period")}
            />
          }
        />

        <div className="pmy-ds-panel-soft">
          {upcomingAssignments.length === 0 ? (
            <EmptyState
              icon="calendar"
              title={tr("Nenhuma escala neste período", "No assignments in this period")}
              description={tr(
                "As escalas publicadas na Agenda Central aparecerão aqui automaticamente.",
                "Assignments published in the Central Agenda will appear here automatically.",
              )}
            />
          ) : (
            <div className="pmy-ds-list-plain">
              {upcomingAssignments.map((assignment) => (
                <div key={assignment.id} className="pmy-ds-list-plain__row">
                  <span className="pmy-ds-list-plain__title">
                    <Icon name="calendar" size={17} />
                    {assignment.tour?.title || tr("Tour sem título", "Untitled tour")}
                  </span>
                  <Badge tone={lisbonDateKey(assignment.startTime) === todayLisbon ? "accent" : "neutral"}>
                    {formatAssignmentWhen(assignment)}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
