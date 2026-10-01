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
  Toast,
} from "./PmyUI";

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
    currentMonthLabel,
    currentYear,
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
    handleCapacityChange,
    handleCreateBlock,
    handleGeneratePaymentLink,
    handleNextMonth,
    handlePrevMonth,
    handleRemoveBlock,
    handleTogglePlatformSelection,
    handleTourSelectionChange,
    imageShape,
    platformConnections,
    renderCalendarDays,
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
    lang
  } = props;

  const tr = (pt, en) => lang === "en" ? en : pt;

  if (activeTab !== "agenda") return null;

  const blockMessageIsError =
    blockMessage &&
    ["erro", "selecione", "informe"].some((term) =>
      blockMessage.toLowerCase().includes(term),
    );

  const selectedBlockTour = blockTourId
    ? tourOptions.find((tour) => tour.id === blockTourId)
    : null;

  const connectedNotBlocked = reservationPlatforms.filter(
    (platform) =>
      platformConnections[platform.key]?.connected &&
      !blockPlatforms.includes(platform.key),
  ).length;

  const calendarTabs = [
    { value: "1d", label: t.view_1d },
    { value: "3d", label: t.view_3d },
    { value: "7d", label: t.view_7d },
    { value: "month", label: t.view_month },
  ];

  return (
    <div className="pmy-ds-stack">
      <div className="pmy-agenda-form-grid">
        <Card>
          <SectionHeader
            eyebrow={tr("Reservas", "Bookings")}
            title={tr("Inserir nova reserva", "Add new booking")}
            subtitle={tr(
              "Crie o checkout real no Shopify usando os dados do cliente, tour e variantes selecionadas.",
              "Create a real Shopify checkout using the selected customer, tour and variant data.",
            )}
          />

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

            <FormField label={t.form_select_tour} required>
              <Select
                value={selectedTour}
                onChange={(event) => handleTourSelectionChange(event.target.value)}
                required
              >
                <option value="">-- {t.form_select_tour} --</option>
                {tourOptions.map((tour) => (
                  <option key={tour.id} value={tour.id}>
                    {tour.title}{tour.price ? ` — ${tour.price}` : ""}
                  </option>
                ))}
              </Select>
            </FormField>

            {selectedTour ? (
              <FormField label={t.form_lang}>
                <Select value={custLang} onChange={(event) => setCustLang(event.target.value)}>
                  {activeTourLanguages.map((language) => (
                    <option key={language} value={language}>{language}</option>
                  ))}
                </Select>
              </FormField>
            ) : null}

            {selectedTour ? (() => {
              const selected = tourOptions.find((tour) => tour.id === selectedTour);
              const realVariants = selected?.variants || [];
              const timeOptions = getBookingTimesForTour(selected);
              const visibleVariants = realVariants.filter((variant) =>
                variantMatchesBookingTime(variant, bookingTime),
              );
              const today = getLisbonToday();
              const todayKey = `${today.year}-${String(today.monthIndex + 1).padStart(2, "0")}-${String(today.day).padStart(2, "0")}`;

              return (
                <div className="pmy-ds-inline-panel">
                  <div className="pmy-ds-booking-meta-grid">
                    <FormField label={tr("Data do Tour", "Tour Date")} required>
                      <Input
                        type="date"
                        min={todayKey}
                        value={bookingDate}
                        onChange={(event) => setBookingDate(event.target.value)}
                        required
                      />
                    </FormField>

                    <FormField label={tr("Horário do Tour", "Tour Time")} required>
                      {timeOptions.length > 0 ? (
                        <Select
                          value={bookingTime}
                          onChange={(event) => {
                            setBookingTime(event.target.value);
                            setTourVariants({ adulto: 0, jovem: 0, crianca: 0, senior: 0 });
                            setGeneratedLink("");
                            setDraftOrderInfo(null);
                          }}
                          required
                        >
                          <option value="">-- {tr("Horário", "Time")} --</option>
                          {timeOptions.map((slot) => (
                            <option key={slot} value={slot}>{slot}</option>
                          ))}
                        </Select>
                      ) : (
                        <Input
                          type="time"
                          value={bookingTime}
                          onChange={(event) => setBookingTime(event.target.value)}
                          required
                        />
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
        </Card>

        <Card>
          <SectionHeader
            eyebrow={tr("Disponibilidade", "Availability")}
            title={tr("Inserir bloqueio manual", "Add manual block")}
            subtitle={tr(
              "Bloqueie datas, horários e canais específicos sem afetar as demais plataformas.",
              "Block specific dates, times and channels without affecting the others.",
            )}
          />

          <form onSubmit={handleCreateBlock} className="pmy-ds-form-stack">
            <FormField label={t.form_select_tour}>
              <Select
                value={blockTourId}
                onChange={(event) => handleBlockTourSelectionChange(event.target.value)}
              >
                <option value="">-- {t.form_select_tour} --</option>
                {tourOptions.map((tour) => (
                  <option key={tour.id} value={tour.id}>
                    {tour.title}{tour.price ? ` — ${tour.price}` : ""}
                  </option>
                ))}
              </Select>
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
              <Input
                type="date"
                value={blockDateTime}
                onChange={(event) => setBlockDateTime(event.target.value)}
              />
            </FormField>

            {blockTourId && selectedBlockTour ? (
              <>
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
                      {selectedBlockTour.price ? (
                        <> · <strong className="pmy-ds-accent">{selectedBlockTour.price}</strong></>
                      ) : null}
                    </div>

                    {selectedBlockTour.variants?.length > 1 ? (
                      <div className="pmy-ds-chip-row">
                        {selectedBlockTour.variants.map((variant, index) => (
                          <Badge key={index}>
                            {variant.title === "Default Title"
                              ? tr("Ingresso", "Ticket")
                              : variant.title}: {variant.price}
                          </Badge>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </div>

                <FormField label={t.block_select_hour}>
                  <Select
                    value={blockSelectedHour}
                    onChange={(event) => setBlockSelectedHour(event.target.value)}
                  >
                    <option value="ALL">{tr("Bloquear todos os horários", "Block all times")}</option>
                    {tourAvailableHours.map((hour) => {
                      const variantsAtHour = (selectedBlockTour.variants || []).filter((variant) =>
                        (variant.title || "").includes(hour),
                      );

                      return (
                        <option key={hour} value={hour}>
                          {hour}
                          {variantsAtHour.length > 0
                            ? ` — ${variantsAtHour.length} ${tr(
                                variantsAtHour.length > 1 ? "variantes" : "variante",
                                variantsAtHour.length > 1 ? "variants" : "variant",
                              )}`
                            : ""}
                        </option>
                      );
                    })}
                  </Select>

                  {tourAvailableHours.length === 0 ? (
                    <Toast tone="warning">
                      {tr(
                        "Nenhum horário encontrado. Os horários são extraídos automaticamente das variantes do produto ou do metafield schedule.",
                        "No time found. Times are automatically extracted from product variants or from the schedule metafield.",
                      )}
                    </Toast>
                  ) : null}
                </FormField>

                {selectedBlockTour.metafields &&
                Object.keys(selectedBlockTour.metafields).length > 0 ? (
                  <div className="pmy-ds-meta-box">
                    <div className="pmy-ds-meta-box__title">
                      {tr("Metafields do Produto", "Product Metafields")}
                    </div>
                    <div className="pmy-ds-meta-list">
                      {Object.entries(selectedBlockTour.metafields).map(([key, value]) => (
                        <div key={key} className="pmy-ds-meta-row">
                          <span className="pmy-ds-meta-key">{key}</span>
                          <span className="pmy-ds-meta-value">{value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
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

                  return (
                    <button
                      key={platform.key}
                      type="button"
                      className={`pmy-platform-pill${selected ? " selected-block" : ""}${!connection.connected ? " disconnected" : ""}`}
                      onClick={() =>
                        handleTogglePlatformSelection(
                          platform.key,
                          blockPlatforms,
                          setBlockPlatforms,
                        )
                      }
                      title={
                        !connection.connected
                          ? `${platform.name} ${tr("não conectado", "not connected")}`
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
                          ? String(block.date).slice(0, 10)
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
        </Card>
      </div>

      <Card>
        <div className="pmy-ds-calendar-toolbar">
          <div className="pmy-ds-calendar-month">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              icon="chevronRight"
              iconOnly
              aria-label={tr("Mês anterior", "Previous month")}
              onClick={handlePrevMonth}
              className="pmy-calendar-prev-button"
            />
            <div className="pmy-calendar-current-month-year-label">
              {currentMonthLabel} {currentYear}
            </div>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              icon="chevronRight"
              iconOnly
              aria-label={tr("Próximo mês", "Next month")}
              onClick={handleNextMonth}
            />
          </div>

          <Tabs
            items={calendarTabs}
            value={calendarView}
            onChange={setCalendarView}
            ariaLabel={tr("Visualização da agenda", "Calendar view")}
          />
        </div>

        <div className="pmy-calendar-scroll">
          {calendarView === "month" ? (
            <div className="pmy-calendar-week-headers">
              <div>{tr("Seg", "Mon")}</div>
              <div>{tr("Ter", "Tue")}</div>
              <div>{tr("Qua", "Wed")}</div>
              <div>{tr("Qui", "Thu")}</div>
              <div>{tr("Sex", "Fri")}</div>
              <div>{tr("Sáb", "Sat")}</div>
              <div>{tr("Dom", "Sun")}</div>
            </div>
          ) : null}
          <div className={`pmy-calendar-grid ${calendarView === "month" ? "month-view" : ""}`}>
            {renderCalendarDays()}
          </div>
        </div>

        <div className="pmy-ds-subsection">
          <h3 className="pmy-ds-capacity-heading">
            {tr("Capacidade máxima por tour e horário", "Maximum capacity by tour and time")}
          </h3>
          <p className="pmy-ds-capacity-description">
            {tr(
              "A Central desconta automaticamente desta capacidade todas as reservas confirmadas e pré-reservas ativas, independentemente do canal de venda.",
              "The Central automatically deducts all confirmed bookings and active pre-bookings from this capacity, regardless of sales channel.",
            )}
          </p>

          {tourOptions.map((tour) => {
            const capacity =
              tourCapacities[tour.id] !== undefined
                ? tourCapacities[tour.id]
                : 20;

            return (
              <div className="pmy-tour-item" key={tour.id}>
                <div className="pmy-ds-tour-row-main">
                  <div className={`pmy-ds-tour-placeholder ${imageShape}`}>
                    <Icon name="calendar" size={22} />
                  </div>
                  <div>
                    <strong className="pmy-ds-tour-row__title">{tour.title}</strong>
                    <div className="pmy-ds-tour-row__meta">
                      {tour.price ? (
                        <span className="pmy-ds-accent">{tour.price} · </span>
                      ) : null}
                      {tr("Capacidade", "Capacity")}: {capacity}{" "}
                      {lang === "en"
                        ? `person${capacity === 1 ? "" : "s"} per time`
                        : `pessoa${capacity === 1 ? "" : "s"} por horário`}
                      {capacity === 0 ? (
                        <> · <span className="pmy-ds-danger-text">
                          {tr("VENDAS SUSPENSAS", "SALES SUSPENDED")}
                        </span></>
                      ) : null}
                    </div>
                  </div>
                </div>

                <div className="pmy-capacity-controls">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    icon="minus"
                    iconOnly
                    aria-label={tr("Reduzir capacidade", "Reduce capacity")}
                    onClick={() => handleCapacityChange(tour.id, -1)}
                  />
                  <span className="pmy-ds-capacity-number">{capacity}</span>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    icon="plus"
                    iconOnly
                    aria-label={tr("Aumentar capacidade", "Increase capacity")}
                    onClick={() => handleCapacityChange(tour.id, 1)}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
