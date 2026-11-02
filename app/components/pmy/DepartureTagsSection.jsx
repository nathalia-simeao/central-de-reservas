import { useState } from "react";
import { contrastText, normalizeAgendaLabels, tourColor } from "../../utils/agenda-labels.js";

export function departureKey(tourId, startTime) {
  const date = new Date(startTime);
  return `${tourId}|${Number.isNaN(date.getTime()) ? String(startTime) : date.toISOString()}`;
}

// "Saídas do dia" na Grade do Dia: cada saída (passeio + horário) é como um
// cartão do Trello — a gestão marca as etiquetas pré-criadas que se aplicam
// (Privado, Menos de 4 pessoas…). A cor do passeio continua sendo a do passeio.
export default function DepartureTagsSection({
  departures = [],
  agendaLabels,
  departureTags = {},
  onSave,
  lang = "pt",
}) {
  const tr = (pt, en) => (lang === "en" ? en : pt);
  const { tags } = normalizeAgendaLabels(agendaLabels);
  const [busyKey, setBusyKey] = useState("");
  const [pickerKey, setPickerKey] = useState("");
  const [error, setError] = useState("");

  if (!departures.length) return null;

  const toggle = async (departure, tagId) => {
    const key = departureKey(departure.tourId, departure.startTime);
    const current = departureTags[key] || [];
    const next = current.includes(tagId) ? current.filter((id) => id !== tagId) : [...current, tagId];
    setBusyKey(key);
    setError("");
    try {
      await onSave?.(departure.tourId, departure.startTime, next);
    } catch (e) {
      setError(e?.message || tr("Não foi possível salvar.", "Could not save."));
    } finally {
      setBusyKey("");
    }
  };

  return (
    <section className="pmy-departure-tags" aria-label={tr("Saídas do dia", "Departures of the day")}>
      <h4 className="pmy-ds-migrated-rg4op4">{tr("Saídas do dia e etiquetas", "Departures and tags")}</h4>
      {!tags.length && (
        <p className="pmy-departure-tags__hint">
          {tr(
            "Crie as etiquetas em Agenda → \"Cores e etiquetas dos passeios\" (ex.: Privado, Menos de 4 pessoas) para marcá-las aqui.",
            "Create tags in Agenda → \"Tour colours and tags\" to mark them here.",
          )}
        </p>
      )}
      {error && <p role="alert" className="pmy-booking-list__error">{error}</p>}
      <div className="pmy-departure-tags__list">
        {departures.map((departure) => {
          const key = departureKey(departure.tourId, departure.startTime);
          const selected = departureTags[key] || [];
          const color = tourColor(agendaLabels, departure.tourId);
          return (
            <div key={key} className="pmy-departure-tags__card" style={{ "--pmy-tour-color": color }}>
              <div className="pmy-departure-tags__head">
                <span className="pmy-departure-tags__time">{departure.timeKey}</span>
                <strong>{departure.title}</strong>
                <span className="pmy-departure-tags__pax">{departure.pax} pax</span>
              </div>
              <div className="pmy-agenda-labels__tour-tags">
                {tags.filter((tag) => selected.includes(tag.id)).map((tag) => (
                  <span key={tag.id} className="pmy-agenda-tag" style={{ background: tag.color, color: contrastText(tag.color) }}>
                    {tag.name}
                    <button type="button" disabled={busyKey === key} aria-label={tr(`Tirar ${tag.name}`, `Remove ${tag.name}`)} onClick={() => toggle(departure, tag.id)}>×</button>
                  </span>
                ))}
                {tags.length > 0 && (
                  <button
                    type="button"
                    className="pmy-agenda-tag is-toggle pmy-departure-tags__add"
                    aria-expanded={pickerKey === key}
                    onClick={() => setPickerKey(pickerKey === key ? "" : key)}
                  >
                    {pickerKey === key ? tr("Fechar", "Close") : tr("+ Etiqueta", "+ Tag")}
                  </button>
                )}
              </div>
              {pickerKey === key && (
                <div className="pmy-departure-tags__picker" role="group" aria-label={tr("Escolher etiquetas", "Choose tags")}>
                  {tags.map((tag) => {
                    const on = selected.includes(tag.id);
                    return (
                      <button
                        key={tag.id}
                        type="button"
                        aria-pressed={on}
                        disabled={busyKey === key}
                        className="pmy-departure-tags__option"
                        onClick={() => toggle(departure, tag.id)}
                      >
                        <i style={{ background: tag.color }} aria-hidden="true" />
                        <span>{tag.name}</span>
                        <b aria-hidden="true">{on ? "✓" : ""}</b>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
