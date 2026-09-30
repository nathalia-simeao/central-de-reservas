import {
  Badge,
  Button,
  Card,
  EmptyState,
  FormField,
  Icon,
  Input,
  SectionHeader,
  Select,
  Tabs,
} from "./PmyUI";

export default function GuidesTab(props) {
  const {
    activeTab,
    ddiList,
    getFlagUrl,
    guideDdi,
    guideEmail,
    guideName,
    guidePhoto,
    guidePhotoRef,
    guideUtmId,
    guideWhatsapp,
    guidesList,
    handleAddGuide,
    handleDeleteGuide,
    handleGuidePhotoChange,
    handleOpenEditGuide,
    openShopifyFilePicker,
    setActiveModal,
    setGuideDdi,
    setGuideEmail,
    setGuideName,
    setGuidePhoto,
    setGuideUtmId,
    setGuideWhatsapp,
    setSelectedGuideInfo,
    setUpcomingToursFilter,
    t,
    upcomingToursFilter,
    lang
  } = props;

  const tr = (pt, en) => lang === "en" ? en : pt;

  if (activeTab !== "guias") return null;

  const referralPreview =
    guideUtmId && guideName
      ? `https://portugalmeandyou.com/?utm_campaign=${guideUtmId}&utm_source=guia&utm_medium=indicacao&utm_content=${guideName
          .toLowerCase()
          .replace(/\s+/g, "_")
          .replace(/[^a-z0-9_]/g, "")}`
      : "";

  const upcomingTabs = [
    { value: "today", label: t.filter_today },
    { value: "7d", label: t.view_7d },
    { value: "15d", label: tr("15 dias", "15 days") },
    { value: "30d", label: tr("30 dias", "30 days") },
  ];

  const sampleUpcoming =
    upcomingToursFilter === "today"
      ? [
          {
            name: "Fátima, Batalha e Nazaré",
            when: tr("Hoje, 14:00 (Guia: Renan)", "Today, 14:00 (Guide: Renan)"),
            tone: "accent",
          },
        ]
      : [
          { name: "Fátima, Batalha e Nazaré", when: tr("Amanhã, 09:00", "Tomorrow, 09:00") },
          { name: "Walking Tour Lisboa", when: tr("Daqui a 3 dias", "In 3 days") },
          { name: "Sintra e Cascais", when: tr("Daqui a 5 dias", "In 5 days") },
        ];

  return (
    <div className="pmy-ds-stack">
      <Card className="pmy-ds-narrow">
        <SectionHeader
          eyebrow={tr("Equipe", "Team")}
          title={t.form_new_guide}
          subtitle={tr(
            "Cadastre os dados de contato, foto e campanha de indicação do guia.",
            "Add the guide contact details, photo and referral campaign.",
          )}
        />

        <form onSubmit={handleAddGuide} className="pmy-ds-form-stack">
          <FormField label={t.form_guide_name} required>
            <Input
              type="text"
              value={guideName}
              onChange={(event) => setGuideName(event.target.value)}
              required
            />
          </FormField>

          <FormField label={t.form_guide_email}>
            <Input
              type="email"
              value={guideEmail}
              onChange={(event) => setGuideEmail(event.target.value)}
            />
          </FormField>

          <FormField label={t.form_guide_whatsapp} required>
            <div className="pmy-ds-phone-row">
              <div className="pmy-ds-ddi">
                <img
                  src={getFlagUrl(ddiList.find((item) => item.code === guideDdi)?.iso || "pt")}
                  alt=""
                  className="pmy-ds-flag"
                />
                <Select value={guideDdi} onChange={(event) => setGuideDdi(event.target.value)}>
                  {ddiList.map((item, index) => (
                    <option key={index} value={item.code}>{item.code}</option>
                  ))}
                </Select>
              </div>
              <Input
                type="tel"
                placeholder="912 345 678"
                value={guideWhatsapp}
                onChange={(event) => setGuideWhatsapp(event.target.value)}
                required
              />
            </div>
          </FormField>

          <FormField label={t.form_guide_photo}>
            <div className="pmy-ds-media-picker">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                icon="upload"
                onClick={() => guidePhotoRef.current?.click()}
              >
                {tr("Upload", "Upload")}
              </Button>
              <input
                type="file"
                accept="image/*"
                onChange={handleGuidePhotoChange}
                className="pmy-ds-file-input"
                ref={guidePhotoRef}
              />
              <Button
                type="button"
                variant="secondary"
                size="sm"
                icon="media"
                onClick={() => openShopifyFilePicker((url) => setGuidePhoto(url))}
              >
                {tr("Escolher da biblioteca", "Choose from library")}
              </Button>
              {guidePhoto ? <img src={guidePhoto} alt="" className="pmy-ds-preview-image" /> : null}
            </div>
          </FormField>

          <FormField label={tr("ID da Campanha UTM (opcional)", "UTM Campaign ID (optional)")}>
            <Input
              type="text"
              className="pmy-ds-mono"
              placeholder="Ex: 21d91c"
              value={guideUtmId}
              onChange={(event) => setGuideUtmId(event.target.value)}
            />
            {referralPreview ? <div className="pmy-ds-code-note">{referralPreview}</div> : null}
          </FormField>

          <div className="pmy-ds-actions">
            <Button type="submit" icon="plus">{t.btn_add_guide}</Button>
          </div>
        </form>
      </Card>

      <Card>
        <SectionHeader
          eyebrow={tr("Equipe", "Team")}
          title={t.registered_guides_list}
          subtitle={tr(
            "Abra um guia para ver detalhes ou use as ações rápidas para editar e copiar o link.",
            "Open a guide to view details or use the quick actions to edit and copy the referral link.",
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

                <div className="pmy-ds-guide-actions" onClick={(event) => event.stopPropagation()}>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    icon="settings"
                    onClick={() => handleOpenEditGuide(guide)}
                  >
                    {tr("Editar", "Edit")}
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

                  <Button
                    type="button"
                    variant="danger"
                    size="sm"
                    icon="trash"
                    iconOnly
                    aria-label={tr("Excluir guia", "Delete guide")}
                    onClick={() => handleDeleteGuide(guide.id)}
                  />
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
          <div className="pmy-ds-list-plain">
            {sampleUpcoming.map((tour) => (
              <div key={`${tour.name}-${tour.when}`} className="pmy-ds-list-plain__row">
                <span className="pmy-ds-list-plain__title">
                  <Icon name="calendar" size={17} />
                  {tour.name}
                </span>
                <Badge tone={tour.tone || "neutral"}>{tour.when}</Badge>
              </div>
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
}
