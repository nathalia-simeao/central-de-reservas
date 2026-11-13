import AuthedImage, { isPreviewableImage } from "./AuthedImage";
import { languageLabel } from "../../utils/tour-languages.js";
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
  departureInfo = {},
  assignments = [],
  onUpload,
  ownerGuide = null, // cartão de um guia (saída com um cartão por guia)
  onSetAttachmentGuide,
  onRemoveAttachment,
  onOpenAttachment,
  loadImage = null,
  hideTags = false,
  lang = "pt",
}) {
  const tr = (pt, en) => (lang === "en" ? en : pt);
  const { tags } = normalizeAgendaLabels(agendaLabels);
  const [busyKey, setBusyKey] = useState("");
  const [pickerKey, setPickerKey] = useState("");
  const [error, setError] = useState("");
  const [uploadingKey, setUploadingKey] = useState("");

  const near = (a, b) => Math.abs(new Date(a).getTime() - new Date(b).getTime()) <= 60 * 1000;
  const timeOf = (value) => (value ? new Intl.DateTimeFormat("pt-PT", { timeZone: "Europe/Lisbon", hour: "2-digit", minute: "2-digit" }).format(new Date(value)) : "");

  const upload = async (departure, fileList) => {
    const files = [...(fileList || [])];
    if (!files.length || !onUpload) return;
    const key = departureKey(departure.tourId, departure.startTime);
    setUploadingKey(key);
    setError("");
    try {
      for (const file of files) await onUpload(departure.tourId, departure.startTime, file);
    } catch (e) {
      setError(e?.message || tr("Não foi possível enviar.", "Upload failed."));
    } finally {
      setUploadingKey("");
    }
  };

  const remove = async (departure, attachment) => {
    if (!onRemoveAttachment) return;
    if (typeof window !== "undefined" && !window.confirm(tr(`Remover ${attachment.fileName}?`, `Remove ${attachment.fileName}?`))) return;
    setError("");
    try {
      await onRemoveAttachment(departure.tourId, departure.startTime, attachment.id);
    } catch (e) {
      setError(e?.message || tr("Não foi possível remover.", "Could not remove."));
    }
  };

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
      {!hideTags && <h4 className="pmy-ds-migrated-rg4op4">{tr("Saídas do dia", "Departures of the day")}</h4>}
      {!hideTags && !tags.length && (
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
            <div key={key} className={`pmy-departure-tags__card ${hideTags ? "is-embedded" : ""}`} style={{ "--pmy-tour-color": color }}>
              <div className="pmy-departure-tags__head">
                <span className="pmy-departure-tags__time">{departure.timeKey}</span>
                <strong>{departure.title}</strong>
                <span className="pmy-departure-tags__pax">{departure.pax} pax</span>
              </div>
              {!hideTags && <div className="pmy-agenda-labels__tour-tags">
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
              </div>}
              {(() => {
                const info = departureInfo[key] || {};
                const guides = assignments
                  .filter((a) => (a.tourId || a.tour?.id) === departure.tourId && near(a.startTime, departure.startTime))
                  .map((a) => a.guide?.name
                    ? `${a.guide.name}${(a.languages || []).length ? ` (${a.languages.map((key) => languageLabel(key, lang)).join(", ")})` : ""}`
                    : null)
                  .filter(Boolean);
                const notes = info.guideNotes || [];
                const files = info.attachments || [];
                return (
                  <div className="pmy-departure-tags__ops">
                    <div className="pmy-departure-tags__line">
                      <span>🧭 {guides.length ? guides.join(", ") : tr("sem guia escalado", "no guide assigned")}</span>
                    </div>
                    {notes.length > 0 && (
                      <div className="pmy-departure-tags__notes">
                        {notes.map((note, index) => (
                          <p key={index}>📝 {note.text} <small>— {note.by}, {timeOf(note.at)}</small></p>
                        ))}
                      </div>
                    )}
                    {loadImage && files.some(isPreviewableImage) && (
                      <div className="pmy-attach-thumbs">
                        {files.filter(isPreviewableImage).map((file) => (
                          <AuthedImage key={file.id} path={`/saida/anexo/${file.id}`} loadImage={loadImage} alt={file.fileName} className="pmy-attach-thumb" onClick={onOpenAttachment ? () => onOpenAttachment(file.id) : undefined} />
                        ))}
                      </div>
                    )}
                    <div className="pmy-departure-tags__files">
                      {files.map((file) => (
                        <span key={file.id} className="pmy-departure-file">
                          {onOpenAttachment
                            ? <button type="button" className="pmy-departure-file__open" title={tr("Abrir arquivo", "Open file")} onClick={() => onOpenAttachment(file.id)}>📎 {file.fileName}</button>
                            : <>📎 {file.fileName}</>}
                          {ownerGuide && onSetAttachmentGuide && (
                            file.guideId === ownerGuide.guideId
                              ? <button type="button" className="pmy-departure-file__owner" title={tr("Mostrar este arquivo em todos os cartões desta saída", "Show this file on every card of this departure")}
                                  onClick={() => onSetAttachmentGuide(departure.tourId, departure.startTime, file.id, null).catch(() => {})}>{tr(`só ${ownerGuide.name.split(" ")[0]}`, `${ownerGuide.name.split(" ")[0]} only`)}</button>
                              : <button type="button" className="pmy-departure-file__owner is-shared" title={tr(`Deixar este arquivo só no cartão de ${ownerGuide.name}`, `Keep this file only on ${ownerGuide.name}'s card`)}
                                  onClick={() => onSetAttachmentGuide(departure.tourId, departure.startTime, file.id, ownerGuide.guideId).catch(() => {})}>{tr("todos os cartões", "all cards")}</button>
                          )}
                          {onRemoveAttachment && (
                            <button type="button" aria-label={tr(`Remover ${file.fileName}`, `Remove ${file.fileName}`)} onClick={() => remove(departure, file)}>×</button>
                          )}
                        </span>
                      ))}
                      {onUpload && (
                        <label className={`pmy-departure-file is-upload ${uploadingKey === key ? "is-busy" : ""}`}>
                          {uploadingKey === key ? tr("Enviando…", "Uploading…") : tr("+ Anexar ingressos (PDF/foto)", "+ Attach tickets (PDF/photo)")}
                          <input
                            type="file"
                            accept="application/pdf,image/*"
                            multiple
                            disabled={uploadingKey === key}
                            onChange={(e) => { upload(departure, e.target.files); e.target.value = ""; }}
                          />
                        </label>
                      )}
                    </div>
                  </div>
                );
              })()}
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
