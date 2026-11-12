// Capacidade e vagas (janela da Agenda): escolher um ou mais passeios e editar
// só eles; "Ver todos" abre a lista inteira. Antes era uma lista enorme abaixo do calendário.

import { useMemo, useState } from "react";
import SharedSeatsIndicator from "./SharedSeatsIndicator";
import ChannelCapacityEditor from "./ChannelCapacityEditor";
import LanguageQuotaEditor from "./LanguageQuotaEditor";
import TourCountryFlag from "./TourCountryFlag";
import { Button, Icon, Input } from "./PmyUI";

const normalize = (value) => String(value || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

export default function CapacityPanel({
  tours = [], tourCapacities = {}, channelCapacityLimits = {}, handleChannelCapacityChange,
  languageQuotaRules = {}, handleLanguageQuotaSave, guidesList = [], guideAssignmentsList = [], lang = "pt",
}) {
  const tr = (pt, en) => (lang === "en" ? en : pt);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState([]);
  const [mode, setMode] = useState("pick"); // pick | edit | all

  const sorted = useMemo(
    () => [...tours].sort((a, b) => String(a.title || "").localeCompare(String(b.title || ""), lang === "en" ? "en" : "pt")),
    [tours, lang],
  );
  const matches = useMemo(() => {
    const q = normalize(query);
    return q ? sorted.filter((tour) => normalize(tour.title).includes(q)) : sorted;
  }, [sorted, query]);

  const toggle = (id) => setSelected((list) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id]));
  const editing = mode === "all" ? sorted : mode === "edit" ? sorted.filter((tour) => selected.includes(tour.id)) : [];
  const capacityOf = (tour) => (tourCapacities[tour.id] !== undefined ? tourCapacities[tour.id] : 20);

  if (editing.length) {
    return (
      <div className="pmy-capacity-panel">
        <div className="pmy-capacity-panel__bar">
          <Button type="button" variant="secondary" size="sm" onClick={() => setMode("pick")}>
            ‹ {tr("Escolher outros passeios", "Pick other tours")}
          </Button>
          <span>{mode === "all" ? tr(`Todos os ${sorted.length} passeios`, `All ${sorted.length} tours`) : tr(`${editing.length} passeio(s) selecionado(s)`, `${editing.length} tour(s) selected`)}</span>
        </div>
        <p className="pmy-capacity-panel__lead">
          {tr(
            "A Central desconta desta capacidade todas as reservas confirmadas e pré-reservas ativas, de qualquer canal.",
            "The Central deducts confirmed bookings and active pre-bookings from any channel.",
          )}
        </p>
        {editing.map((tour) => {
          const capacity = capacityOf(tour);
          const hours = [...(tour.scheduleSlots || []), ...(tour.variants || []).map((v) => v.title)];
          return (
            <div className="pmy-capacity-vertical-item pmy-capacity-card" key={tour.id}>
              <div className="pmy-ds-tour-row-main">
                <div className="pmy-ds-tour-placeholder pmy-capacity-card__thumb">
                  {tour.image ? <img src={tour.image} alt={tour.imageAlt || tour.title} loading="lazy" /> : <Icon name="calendar" size={22} />}
                </div>
                <div className="pmy-capacity-card__info">
                  <strong className="pmy-ds-tour-row__title pmy-capacity-card__title"><TourCountryFlag tour={tour} lang={lang} />{tour.title}</strong>
                  <div className="pmy-ds-tour-row__meta">
                    {tr("Capacidade", "Capacity")}: {capacity} {lang === "en" ? `person${capacity === 1 ? "" : "s"} per time` : `pessoa${capacity === 1 ? "" : "s"} por horário`}
                    {capacity === 0 ? <> · <span className="pmy-ds-danger-text">{tr("VENDAS SUSPENSAS", "SALES SUSPENDED")}</span></> : null}
                  </div>
                </div>
              </div>
              <div className="pmy-capacity-card__sections">
                <div className="pmy-capacity-card__section">
                  <span className="pmy-capacity-card__label">{tr("Vagas e consulta por data", "Seats and date lookup")}</span>
                  <SharedSeatsIndicator tourId={tour.id} capacity={capacity} limits={channelCapacityLimits[tour.id] || {}} hours={hours} lang={lang} />
                </div>
                <div className="pmy-capacity-card__section">
                  <ChannelCapacityEditor tourId={tour.id} physicalCapacity={capacity} limits={channelCapacityLimits[tour.id] || {}} onSave={handleChannelCapacityChange} lang={lang} />
                </div>
                <div className="pmy-capacity-card__section">
                  <LanguageQuotaEditor tour={tour} hours={hours} rules={languageQuotaRules[tour.id] || []} guides={guidesList} assignments={guideAssignmentsList} onSave={handleLanguageQuotaSave} lang={lang} />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="pmy-capacity-panel">
      <p className="pmy-capacity-panel__lead">
        {tr("Escolha um ou mais passeios para ver e mudar a capacidade, os limites por plataforma e as vagas por idioma.", "Pick one or more tours to edit capacity, platform limits and language seats.")}
      </p>
      <div className="pmy-capacity-panel__search">
        <Input type="search" value={query} placeholder={tr("Buscar passeio...", "Search tour...")} aria-label={tr("Buscar passeio", "Search tour")} onChange={(e) => setQuery(e.target.value)} />
      </div>
      <ul className="pmy-capacity-panel__list" aria-label={tr("Passeios", "Tours")}>
        {matches.map((tour) => {
          const on = selected.includes(tour.id);
          return (
            <li key={tour.id}>
              <button type="button" className={`pmy-capacity-panel__option${on ? " is-selected" : ""}`} aria-pressed={on} onClick={() => toggle(tour.id)}>
                <span className="pmy-capacity-panel__check" aria-hidden="true">{on ? <Icon name="check" size={13} /> : null}</span>
                <span className="pmy-capacity-panel__name"><TourCountryFlag tour={tour} lang={lang} />{tour.title}</span>
                <small>{capacityOf(tour)} {tr("por horário", "per time")}</small>
              </button>
            </li>
          );
        })}
        {!matches.length && <li className="pmy-capacity-panel__empty">{tr("Nenhum passeio encontrado.", "No tours found.")}</li>}
      </ul>
      <div className="pmy-capacity-panel__actions">
        <Button type="button" variant="secondary" onClick={() => setMode("all")}>{tr("Ver todos", "See all")}</Button>
        <Button type="button" variant="primary" disabled={!selected.length} onClick={() => setMode("edit")}>
          {selected.length ? tr(`Editar ${selected.length} selecionado(s)`, `Edit ${selected.length} selected`) : tr("Selecione passeios", "Select tours")}
        </Button>
      </div>
    </div>
  );
}
