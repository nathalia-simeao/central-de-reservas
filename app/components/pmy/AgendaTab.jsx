import AgendaBoard from "./AgendaBoard";
import CalendarMirror from "./CalendarMirror";
import CapacityPanel from "./CapacityPanel";
import AgendaLabelsEditor from "./AgendaLabelsEditor";
import TourCountryFlag from "./TourCountryFlag";
import "../../styles/pmy-tour-info.css";
import { useMemo, useState } from "react";

import { variantMatchesTourLanguage } from "../../utils/tour-languages";

import { Badge, Button, Card, DatePicker, DropdownSelect, EmptyState, FormField, Icon, Input, Modal, SectionHeader, Toast, TimeSelect } from "./PmyUI";


const TOUR_FIELD_LABELS = {
  location: ["Localização", "Location"],
  group_size: ["Tamanho do grupo", "Group size"],
  duration_info: ["Duração", "Duration"],
  what_to_bring: ["O que levar", "What to bring"],
  activity_level: ["Nível de atividade", "Activity level"],
  card_highlight: ["Destaques do passeio", "Tour highlights"],
  languages_info: ["Idiomas disponíveis", "Available languages"],
  what_is_included_info: ["O que está incluído", "What's included"],
};

function readableTourFieldLabel(key, english) {
  const raw = String(key || "").split(".").pop();
  const configured = TOUR_FIELD_LABELS[raw];
  if (configured) return configured[english ? 1 : 0];
  return raw.replace(/[_-]+/g, " ").replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/^./, (letter) => letter.toUpperCase());
}

function readableTourFieldValue(value) {
  if (value == null) return "";
  if (Array.isArray(value)) return value.map(readableTourFieldValue).filter(Boolean).join(", ");
  if (typeof value === "object") {
    if ("value" in value) return readableTourFieldValue(value.value);
    return JSON.stringify(value);
  }
  return String(value).trim();
}

function TourInformationCard({ metafields, lang }) {
  const english = lang === "en";
  const fields = Object.entries(metafields || {})
    .map(([key, value]) => ({
      key,
      label: readableTourFieldLabel(key, english),
      value: readableTourFieldValue(value),
    }))
    .filter(({ value }) => value !== "");

  if (!fields.length) return null;

  return (
    <section className="pmy-tour-info" aria-label={english ? "Tour information" : "Informações do passeio"}>
      <div className="pmy-tour-info__header">
        <div>
          <h3 className="pmy-tour-info__heading">
            <Icon name="info" size={18} />
            {english ? "Tour information" : "Informações do passeio"}
          </h3>
          <p className="pmy-tour-info__subtitle">
            {english ? "Information synced from Shopify" : "Informações sincronizadas com a Shopify"}
          </p>
        </div>
        <span className="pmy-tour-info__readonly">
          {english ? "Read only" : "Somente leitura"}
        </span>
      </div>
      <div className="pmy-tour-info__grid">
        {fields.map(({ key, label, value }) => (
          <div className="pmy-tour-info__field" key={key}>
            <span className="pmy-tour-info__label">{label}</span>
            <span className="pmy-tour-info__value">{value}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

export default function AgendaTab(props) {
  const {
    activeTab,
    activeTourLanguages,
    blockDateTime,
    blockMessage,
    blockPlatforms,
    blockRecurringDays,
    blockSaving,
    blockSelectedHour,
    blockTourId,
    blockedDates,
    bookingDate,
    bookingTime,
    calendarView,
    custEmail,
    custLang,
    custName,
    custPhone,
    draftOrderError,
    draftOrderInfo,
    draftOrderLoading,
    generatedLink,
    getBookingTimesForTour,
    getLisbonToday,
    handleBlockTourSelectionChange,
    handleChannelCapacityChange,
    channelCapacityLimits = {},
    handleLanguageQuotaSave,
    languageQuotaRules = {},
    agendaLabels = null,
    boardProps = null,
    handleSaveAgendaLabels,
    guidesList = [],
    guideAssignmentsList = [],
    handleCreateBlock,
    handleGeneratePaymentLink,
    handleRemoveBlock,
    handleTogglePlatformSelection,
    handleTourSelectionChange,
    platformConnections,
    reservationPlatforms,
    selectedTour,
    setBlockDateTime,
    setBlockPlatforms,
    setBlockRecurringDays,
    setBlockSelectedHour,
    setBookingDate,
    setBookingTime,
    setCalendarView,
    setCustEmail,
    setCustLang,
    setCustName,
    setCustPhone,
    setDraftOrderInfo,
    setGeneratedLink,
    setTourVariants,
    t,
    tourAvailableHours,
    tourCapacities,
    tourOptions,
    tourVariants,
    variantMatchesBookingTime,
    calendarProps = null,
    onOpenBoard,
    lang
  } = props;

  const tr = (pt, en) => lang === "en" ? en : pt;

  const [blockTourSearch, setBlockTourSearch] = useState("");
  const [boardLabelsOpen, setBoardLabelsOpen] = useState(false);
  const [blockTourPickerOpen, setBlockTourPickerOpen] = useState(false);
  // "Nova reserva", "Bloqueio manual" e "Capacidade" abrem em janelas (pedido 12/11).
  const [panel, setPanel] = useState("");
  const closePanel = () => setPanel("");

  const normalizedBlockTourSearch = blockTourSearch
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

  const filteredBlockTours = useMemo(() => {
    const source = [...(tourOptions || [])].sort((left, right) =>
      String(left.title || "").localeCompare(String(right.title || ""), lang === "pt" ? "pt" : "en"),
    );

    if (!normalizedBlockTourSearch) return source.slice(0, 12);

    return source
      .filter((tour) =>
        String(tour.title || "")
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .toLowerCase()
          .includes(normalizedBlockTourSearch),
      )
      .slice(0, 12);
  }, [lang, normalizedBlockTourSearch, tourOptions]);

  if (activeTab !== "agenda") return null;

  const blockMessageIsError =
    blockMessage &&
    ["erro", "selecione", "informe"].some((term) =>
      blockMessage.toLowerCase().includes(term),
    );

  const formatBlockDate = (value) => {
    if (!value) return "";

    let dateKey = "";
    if (typeof value === "string") {
      const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
      if (match) dateKey = `${match[1]}-${match[2]}-${match[3]}`;
    } else if (value instanceof Date && !Number.isNaN(value.getTime())) {
      dateKey = value.toISOString().slice(0, 10);
    }

    if (!dateKey) return String(value);
    const [year, month, day] = dateKey.split("-");
    return `${day}/${month}/${year}`;
  };

  const selectedBlockTour = blockTourId
    ? tourOptions.find((tour) => tour.id === blockTourId)
    : null;

  const connectedNotBlocked = reservationPlatforms.filter(
    (platform) =>
      platformConnections[platform.key]?.connected &&
      !blockPlatforms.includes(platform.key),
  ).length;

  // Quadro estilo Trello: ocupa a tela inteira da Agenda, sem os formulários.
  if (calendarView === "board" && boardProps) {
    return (
      <div className="pmy-ds-stack">
        <Card>
          <div className="pmy-board__top">
            <SectionHeader
              eyebrow={tr("Operação", "Operations")}
              title={tr("Quadro", "Board")}
              subtitle={tr("Uma coluna por dia, um cartão por saída. Clique no cartão para etiquetas, guias, clientes e anexos.", "One column per day, one card per departure.")}
            />
            <Button type="button" variant={boardLabelsOpen ? "primary" : "secondary"} size="sm" onClick={() => setBoardLabelsOpen(!boardLabelsOpen)} aria-expanded={boardLabelsOpen}>
              {boardLabelsOpen ? tr("Fechar etiquetas", "Close labels") : tr("Etiquetas", "Labels")}
            </Button>
          </div>
          {boardLabelsOpen && (
            <div className="pmy-board__labels-panel">
              <AgendaLabelsEditor labels={agendaLabels} onSave={handleSaveAgendaLabels} lang={lang} />
            </div>
          )}
          <AgendaBoard {...boardProps} lang={lang} />
        </Card>
      </div>
    );
  }

  return (
    <div className="pmy-ds-stack">
      <Card>
        <div className="pmy-agenda-actions">
          <Button type="button" variant="primary" icon="plus" onClick={() => setPanel("booking")}>
            {tr("Nova reserva", "New booking")}
          </Button>
          <Button type="button" variant="secondary" icon="lock" onClick={() => setPanel("block")}>
            {tr("Bloqueio manual", "Manual block")}
            {blockedDates.length > 0 ? <Badge>{blockedDates.length}</Badge> : null}
          </Button>
          <Button type="button" variant="secondary" icon="users" onClick={() => setPanel("capacity")}>
            {tr("Capacidade e vagas", "Capacity and seats")}
          </Button>
        </div>
        <CalendarMirror
          {...(calendarProps || {})}
          blockedDates={blockedDates}
          view={["1d", "3d", "7d", "month", "quarter", "semester", "year"].includes(calendarView) ? calendarView : "month"}
          onViewChange={setCalendarView}
          onOpenBoard={onOpenBoard}
          lang={lang}
        />
      </Card>

      <Modal
        open={panel === "booking"}
        title={tr("Nova reserva", "New booking")}
        onClose={closePanel}
        closeLabel={tr("Fechar", "Close")}
        className="pmy-ds-modal--form"
      >
          <p className="pmy-agenda-modal__lead">
            {tr(
              "Crie o checkout real no Shopify usando os dados do cliente, tour e variantes selecionadas.",
              "Create a real Shopify checkout using the selected customer, tour and variant data.",
            )}
          </p>

          {/* Booking controls intentionally use PMY DropdownSelect instead of native <select>.
              Keep generic/lowest variant prices out of the tour picker; prices belong to ticket variants below. */}
          <form onSubmit={handleGeneratePaymentLink} className="pmy-ds-form-stack">
            <FormField label={t.form_customer} required>
              <Input
                type="text"
                value={custName}
                onChange={(event) => setCustName(event.target.value)}
                required
              />
            </FormField>

            <FormField label={t.form_email}>
              <Input
                type="email"
                value={custEmail}
                onChange={(event) => setCustEmail(event.target.value)}
              />
            </FormField>

            <FormField label={t.form_phone}>
              <Input
                type="tel"
                value={custPhone}
                onChange={(event) => setCustPhone(event.target.value)}
              />
            </FormField>

            <FormField
              label={t.form_select_tour}
              hint={tr(
                "Pesquise pelo nome do passeio. O preço geral foi removido porque podia representar a variante infantil/mais barata.",
                "Search by tour name. The generic price was removed because it could represent the child/lowest-priced variant.",
              )}
              required
            >
              <DropdownSelect
                key={`booking-tour-${lang}`}
                className="pmy-booking-tour-dropdown"
                value={selectedTour}
                onChange={(value) => handleTourSelectionChange(value)}
                placeholder={tr("Selecione um passeio", "Select a tour")}
                searchable
                searchPlaceholder={tr("Pesquisar passeio...", "Search tour...")}
                emptyLabel={tr("Nenhum passeio encontrado.", "No tours found.")}
                ariaLabel={t.form_select_tour}
                required
                options={tourOptions.map((tour) => ({
                  value: tour.id,
                  label: tour.title,
                }))}
              />
            </FormField>

            {selectedTour ? (
              <FormField
                label={t.form_lang}
                hint={tr(
                  "Idiomas disponíveis neste passeio, carregados das opções e variantes do Shopify.",
                  "Languages available for this tour, loaded from Shopify product options and variants.",
                )}
              >
                <DropdownSelect
                  key={`booking-language-${selectedTour}`}
                  className="pmy-booking-language-dropdown"
                  value={custLang}
                  onChange={setCustLang}
                  placeholder={tr("Selecione o idioma", "Select language")}
                  ariaLabel={t.form_lang}
                  options={activeTourLanguages.map((language) => ({
                    value: language,
                    label: language,
                  }))}
                />
              </FormField>
            ) : null}

            {selectedTour ? (() => {
              const selected = tourOptions.find((tour) => tour.id === selectedTour);
              const realVariants = selected?.variants || [];
              const timeOptions = getBookingTimesForTour(selected);
              const visibleVariants = realVariants.filter(
                (variant) =>
                  variantMatchesBookingTime(variant, bookingTime) &&
                  variantMatchesTourLanguage(variant, custLang),
              );
              const today = getLisbonToday();
              const todayKey = `${today.year}-${String(today.monthIndex + 1).padStart(2, "0")}-${String(today.day).padStart(2, "0")}`;

              return (
                <div className="pmy-ds-inline-panel">
                  <div className="pmy-ds-booking-meta-grid">
                    <FormField label={tr("Data do Tour", "Tour Date")} required>
                      <DatePicker
                        min={todayKey}
                        value={bookingDate}
                        onChange={(event) => setBookingDate(event?.target?.value ?? event)}
                        locale={lang === "en" ? "en-GB" : "pt-PT"}
                        placeholder={lang === "en" ? "dd/mm/yyyy" : "dd/mm/aaaa"}
                        todayLabel={tr("Hoje", "Today")}
                        clearLabel={tr("Limpar", "Clear")}
                      />
                    </FormField>

                    <FormField label={tr("Horário do Tour", "Tour Time")} required>
                      {timeOptions.length > 0 ? (
                        <DropdownSelect
                          key={`booking-time-${selectedTour}`}
                          className="pmy-booking-time-dropdown"
                          value={bookingTime}
                          onChange={(value) => {
                            setBookingTime(value);
                            setTourVariants({ adulto: 0, jovem: 0, crianca: 0, senior: 0 });
                            setGeneratedLink("");
                            setDraftOrderInfo(null);
                          }}
                          placeholder={tr("Selecione o horário", "Select time")}
                          ariaLabel={tr("Horário do Tour", "Tour Time")}
                          required
                          options={timeOptions.map((slot) => ({
                            value: slot,
                            label: slot,
                          }))}
                        />
                      ) : (
                        <TimeSelect value={bookingTime} onChange={setBookingTime} lang={lang} />
                      )}
                    </FormField>
                  </div>

                  <div className="pmy-ds-variant-heading">
                    <Icon name="ticket" size={17} />
                    {tr("Ingressos por variante Shopify", "Tickets by Shopify variant")}
                  </div>

                  {visibleVariants.length > 0 ? (
                    <div className="pmy-variants-form-grid">
                      {visibleVariants.map((variant) => (
                        <div key={variant.id}>
                          <label className="pmy-ds-variant-label">
                            <span>
                              {variant.title === "Default Title"
                                ? tr("Quantidade", "Quantity")
                                : variant.title}
                            </span>
                            <span className="pmy-ds-variant-price">{variant.price}</span>
                          </label>
                          <Input
                            type="number"
                            min="0"
                            value={tourVariants[variant.id] || 0}
                            onChange={(event) =>
                              setTourVariants({
                                ...tourVariants,
                                [variant.id]: parseInt(event.target.value, 10) || 0,
                              })
                            }
                          />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <Toast tone="warning">
                      {tr(
                        "Nenhuma variante Shopify real foi carregada para este horário. O checkout não será criado com item genérico.",
                        "No real Shopify variant was loaded for this time. The checkout will not be created with a generic item.",
                      )}
                    </Toast>
                  )}

                  {selected?.image ? (
                    <div className="pmy-ds-tour-summary pmy-ds-mt-3">
                      <img src={selected.image} alt={selected.imageAlt} className="pmy-ds-thumb-sm" />
                      <div className="pmy-ds-tour-summary__title">{selected.title}</div>
                    </div>
                  ) : null}
                </div>
              );
            })() : null}

            {draftOrderError ? <Toast tone="danger">{draftOrderError}</Toast> : null}

            <Button
              type="submit"
              size="lg"
              icon="external"
              disabled={draftOrderLoading}
            >
              {draftOrderLoading
                ? tr("Criando Draft Order no Shopify...", "Creating Shopify Draft Order...")
                : tr("Criar checkout Shopify", "Create Shopify checkout")}
            </Button>
          </form>

          {generatedLink ? (
            <div className="pmy-ds-success-panel">
              <div className="pmy-ds-success-panel__title">
                {tr("Checkout criado e vagas reservadas", "Checkout created and seats held")}
                {draftOrderInfo?.name ? ` · ${draftOrderInfo.name}` : ""}
              </div>

              {draftOrderInfo?.total ? (
                <div className="pmy-ds-success-panel__meta">
                  Total: <strong>{draftOrderInfo.total} {draftOrderInfo.currency || ""}</strong>
                  {" · "}{draftOrderInfo.date} · {draftOrderInfo.time} · {draftOrderInfo.language}
                </div>
              ) : null}

              {draftOrderInfo?.holdExpiresAt ? (
                <div className="pmy-ds-success-panel__meta">
                  {tr("Vagas reservadas até", "Seats held until")}{" "}
                  <strong>
                    {new Date(draftOrderInfo.holdExpiresAt).toLocaleTimeString(
                      lang === "pt" ? "pt-PT" : "en-GB",
                      {
                        timeZone: "Europe/Lisbon",
                        hour: "2-digit",
                        minute: "2-digit",
                      },
                    )}
                  </strong>{" "}
                  {tr(
                    `(${draftOrderInfo.holdMinutes || 15} min). Depois disso, a Central libera a capacidade automaticamente.`,
                    `(${draftOrderInfo.holdMinutes || 15} min). After that, the Central releases capacity automatically.`,
                  )}
                </div>
              ) : null}

              <a href={generatedLink} target="_blank" rel="noreferrer" className="pmy-ds-link">
                {tr("Abrir checkout seguro do Shopify", "Open secure Shopify checkout")}
                <Icon name="external" size={14} />
              </a>

              <div className="pmy-ds-success-panel__meta">
                {tr(
                  "Este link passa primeiro pela Central: se o hold já tiver expirado, o checkout é bloqueado e um novo link precisa ser gerado.",
                  "This link first checks the Central: if the hold has expired, checkout is blocked and a new link must be generated.",
                )}
              </div>
            </div>
          ) : null}
      </Modal>

      <Modal
        open={panel === "block"}
        title={tr("Bloqueio manual", "Manual block")}
        onClose={closePanel}
        closeLabel={tr("Fechar", "Close")}
        className="pmy-ds-modal--form"
      >
          <p className="pmy-agenda-modal__lead">
            {tr(
              "Bloqueie datas, horários e canais específicos sem afetar as demais plataformas.",
              "Block specific dates, times and channels without affecting the others.",
            )}
          </p>

          <form onSubmit={handleCreateBlock} className="pmy-ds-form-stack">
            <FormField
              label={t.form_select_tour}
              hint={tr(
                "Pesquise pelo nome do passeio. Preços não aparecem aqui porque não interferem no bloqueio.",
                "Search by tour name. Prices are hidden here because they do not affect availability blocks.",
              )}
            >
              <div className="pmy-ds-tour-picker">
                <Input
                  type="search"
                  value={blockTourSearch}
                  placeholder={tr("Pesquisar passeio...", "Search tour...")}
                  autoComplete="off"
                  onFocus={() => setBlockTourPickerOpen(true)}
                  onKeyDown={(event) => {
                    if (event.key === "Escape") setBlockTourPickerOpen(false);
                  }}
                  onChange={(event) => {
                    const nextValue = event.target.value;
                    setBlockTourSearch(nextValue);
                    setBlockTourPickerOpen(true);

                    if (
                      blockTourId &&
                      nextValue !== String(selectedBlockTour?.title || "")
                    ) {
                      handleBlockTourSelectionChange("");
                    }
                  }}
                />

                {blockTourPickerOpen ? (
                  <div className="pmy-ds-tour-picker__results">
                    {filteredBlockTours.length > 0 ? (
                      filteredBlockTours.map((tour) => (
                        <button
                          key={tour.id}
                          type="button"
                          className={`pmy-ds-tour-picker__option${blockTourId === tour.id ? " is-selected" : ""}`}
                          onClick={() => {
                            handleBlockTourSelectionChange(tour.id);
                            setBlockTourSearch(tour.title || "");
                            setBlockTourPickerOpen(false);
                          }}
                        >
                          <span><TourCountryFlag tour={tour} lang={lang}/>{tour.title}</span>
                          {blockTourId === tour.id ? (
                            <Badge tone="success">{tr("Selecionado", "Selected")}</Badge>
                          ) : null}
                        </button>
                      ))
                    ) : (
                      <div className="pmy-ds-tour-picker__empty">
                        {tr("Nenhum passeio encontrado.", "No tours found.")}
                      </div>
                    )}
                  </div>
                ) : null}
              </div>
            </FormField>

            <FormField label={t.block_days_week}>
              <Input
                type="text"
                placeholder={tr(
                  "Ex: 0, 1 (Domingo e Segunda)",
                  "E.g. 0, 1 (Sunday and Monday)",
                )}
                value={blockRecurringDays}
                onChange={(event) => setBlockRecurringDays(event.target.value)}
              />
            </FormField>

            <FormField label={t.form_date_time}>
              <DatePicker
                value={blockDateTime}
                onChange={(event) => setBlockDateTime(event.target.value)}
                locale={lang === "pt" ? "pt-PT" : "en-GB"}
                placeholder={tr("Selecione uma data", "Select a date")}
                todayLabel={tr("Hoje", "Today")}
                clearLabel={tr("Limpar", "Clear")}
                previousMonthLabel={tr("Mês anterior", "Previous month")}
                nextMonthLabel={tr("Próximo mês", "Next month")}
              />
            </FormField>

            {blockTourId && selectedBlockTour ? (
              <>
                <FormField
                  label={tr("Horário a bloquear", "Time to block")}
                  hint={tr(
                    "As opções abaixo são extraídas das variantes reais do passeio. Ao escolher 14:00, todas as variantes daquele horário ficam indisponíveis e os demais horários continuam vendáveis.",
                    "The options below are extracted from the tour's real variants. Choosing 14:00 makes every variant at that time unavailable while the other times remain sellable.",
                  )}
                >
                  <DropdownSelect
                    key={`block-time-${blockTourId}-${lang}`}
                    className="pmy-block-time-dropdown"
                    value={blockSelectedHour}
                    onChange={setBlockSelectedHour}
                    placeholder={tr("Selecione o horário", "Select time")}
                    ariaLabel={tr("Horário a bloquear", "Time to block")}
                    options={[
                      {
                        value: "ALL",
                        label: tr("Todos os horários do dia", "All times that day"),
                        meta: tr("Bloqueia todas as saídas desta data", "Blocks every departure on this date"),
                      },
                      ...tourAvailableHours.map((hour) => {
                        const variantsAtHour = (selectedBlockTour.variants || []).filter((variant) =>
                          (variant.title || "").includes(hour),
                        );
                        return {
                          value: hour,
                          label: hour,
                          meta: variantsAtHour.length > 0
                            ? `${variantsAtHour.length} ${tr(
                                variantsAtHour.length > 1 ? "variantes vinculadas" : "variante vinculada",
                                variantsAtHour.length > 1 ? "linked variants" : "linked variant",
                              )}`
                            : tr("Saída específica", "Specific departure"),
                        };
                      }),
                    ]}
                  />

                  {tourAvailableHours.length === 0 ? (
                    <Toast tone="warning">
                      {tr(
                        "Nenhum horário foi encontrado nas variantes ou no metafield schedule deste passeio.",
                        "No time was found in this tour's variants or schedule metafield.",
                      )}
                    </Toast>
                  ) : null}

                  {blockSelectedHour !== "ALL" ? (
                    <Toast tone="info">
                      {tr(
                        `Bloqueio pontual: ${blockSelectedHour}. Os demais horários deste passeio continuam disponíveis neste dia.`,
                        `Time-specific block: ${blockSelectedHour}. The tour's other times remain available on this day.`,
                      )}
                    </Toast>
                  ) : null}
                </FormField>

                <div className="pmy-ds-tour-summary">
                  {selectedBlockTour.image ? (
                    <img
                      src={selectedBlockTour.image}
                      alt={selectedBlockTour.imageAlt}
                      className="pmy-ds-thumb-sm"
                    />
                  ) : (
                    <span className="pmy-ds-preview-image">
                      <Icon name="calendar" size={18} />
                    </span>
                  )}

                  <div className="pmy-ds-grow">
                    <div className="pmy-ds-tour-summary__title">{selectedBlockTour.title}</div>
                    <div className="pmy-ds-tour-summary__meta">
                      {selectedBlockTour.collections?.map((collection) => collection.title).join(" · ")}
                    </div>
                    <div className="pmy-ds-chip-row">
                      {tourAvailableHours.length > 0 ? (
                        tourAvailableHours.map((hour) => (
                          <Badge
                            key={hour}
                            tone={blockSelectedHour === hour ? "accent" : "neutral"}
                          >
                            {hour}
                          </Badge>
                        ))
                      ) : (
                        <Badge>{tr("Sem horários detectados", "No times detected")}</Badge>
                      )}
                    </div>
                  </div>
                </div>

                <TourInformationCard metafields={selectedBlockTour.metafields} lang={lang} />
              </>
            ) : null}

            <FormField
              label={tr(
                "Bloquear em quais plataformas?",
                "Which platforms should be blocked?",
              )}
              hint={tr("Selecione uma ou mais.", "Select one or more.")}
            >
              <div className="pmy-platform-pills">
                {reservationPlatforms.map((platform) => {
                  const connection = platformConnections[platform.key];
                  const selected = blockPlatforms.includes(platform.key);
                  const connected = Boolean(connection?.connected);
                  // Permitir retirar seleção antiga de canais desconectados, mas nunca adicioná-los.
                  const disabled = !connected && !selected;

                  return (
                    <button
                      key={platform.key}
                      type="button"
                      disabled={disabled}
                      aria-pressed={selected}
                      className={`pmy-platform-pill${selected ? " selected-block" : ""}${!connected ? " disconnected" : ""}`}
                      onClick={() =>
                        handleTogglePlatformSelection(
                          platform.key,
                          blockPlatforms,
                          setBlockPlatforms,
                        )
                      }
                      title={
                        !connected
                          ? `${platform.name}: ${tr("não conectado", "not connected")}`
                          : ""
                      }
                    >
                      <span className="pmy-platform-pill-logo">{platform.logo}</span>
                      {platform.name}
                      {selected ? <Icon name="check" size={13} /> : null}
                    </button>
                  );
                })}
              </div>

              {blockPlatforms.length > 0 ? (
                <div className="pmy-ds-selection-summary">
                  <Badge tone="accent">{blockPlatforms.length}</Badge>
                  <span>
                    {tr(
                      `${blockPlatforms.length === 1 ? "plataforma será bloqueada" : "plataformas serão bloqueadas"}`,
                      `${blockPlatforms.length === 1 ? "platform will be blocked" : "platforms will be blocked"}`,
                    )}
                    {connectedNotBlocked > 0
                      ? tr(
                          ` · ${connectedNotBlocked} continuará${connectedNotBlocked > 1 ? "ão" : ""} aberta${connectedNotBlocked > 1 ? "s" : ""}`,
                          ` · ${connectedNotBlocked} will remain open`,
                        )
                      : ""}
                  </span>
                </div>
              ) : (
                <Toast tone="warning">
                  {tr(
                    "Nenhuma plataforma selecionada. O bloqueio não terá efeito.",
                    "No platform selected. This block will have no effect.",
                  )}
                </Toast>
              )}
            </FormField>

            {blockMessage ? (
              <Toast tone={blockMessageIsError ? "danger" : "success"}>
                {blockMessage}
              </Toast>
            ) : null}

            <Button
              type="submit"
              size="lg"
              variant="primary"
              icon="lock"
              disabled={blockPlatforms.length === 0 || blockSaving}
            >
              {blockSaving
                ? tr("Salvando bloqueio...", "Saving block...")
                : t.form_btn_block}
            </Button>
          </form>

          <div className="pmy-ds-subsection">
            <div className="pmy-ds-subsection__header">
              <strong className="pmy-ds-subsection__title">
                <Icon name="lock" size={16} />
                {tr("Bloqueios ativos no banco", "Active blocks in the database")}
              </strong>
              <Badge>{blockedDates.length} {tr("regras", "rules")}</Badge>
            </div>

            {blockedDates.length === 0 ? (
              <EmptyState
                compact
                icon="lock"
                title={tr("Nenhum bloqueio ativo", "No active blocks")}
                description={tr(
                  "Bloqueios criados aparecerão aqui para remoção rápida.",
                  "Created blocks will appear here for quick removal.",
                )}
              />
            ) : (
              <div className="pmy-ds-block-list">
                {blockedDates.slice(0, 30).map((block) => (
                  <div key={block.id} className="pmy-ds-block-row">
                    <div>
                      <div className="pmy-ds-block-row__title">
                        {block.tour?.title || tr("Todos os tours", "All tours")}
                      </div>
                      <div className="pmy-ds-block-row__meta">
                        {block.date
                          ? formatBlockDate(block.date)
                          : `${tr("dia da semana", "weekday")} ${block.dayOfWeek}`}
                        {" · "}
                        {block.timeSlot === "ALL" || !block.timeSlot
                          ? tr("todos os horários", "all times")
                          : block.timeSlot}
                        {" · "}
                        {(block.platforms || []).length
                          ? block.platforms.join(", ")
                          : tr("todas as plataformas", "all platforms")}
                      </div>
                    </div>

                    <Button
                      type="button"
                      variant="danger"
                      size="sm"
                      icon="trash"
                      onClick={() => handleRemoveBlock(block.id)}
                    >
                      {tr("Remover", "Remove")}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
      </Modal>

      <Modal
        open={panel === "capacity"}
        title={tr("Capacidade e vagas", "Capacity and seats")}
        onClose={closePanel}
        closeLabel={tr("Fechar", "Close")}
        className="pmy-ds-modal--wide"
      >
        <CapacityPanel
          tours={tourOptions}
          tourCapacities={tourCapacities}
          channelCapacityLimits={channelCapacityLimits}
          handleChannelCapacityChange={handleChannelCapacityChange}
          languageQuotaRules={languageQuotaRules}
          handleLanguageQuotaSave={handleLanguageQuotaSave}
          guidesList={guidesList}
          guideAssignmentsList={guideAssignmentsList}
          lang={lang}
        />
      </Modal>
    </div>
  );
}
