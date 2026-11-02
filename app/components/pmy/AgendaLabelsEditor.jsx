import { useEffect, useMemo, useState } from "react";
import { Button } from "./PmyUI";
import {
  AGENDA_PALETTE,
  automaticTourColor,
  contrastText,
  normalizeAgendaLabels,
} from "../../utils/agenda-labels.js";

// Gestão das cores por passeio e das etiquetas extras (privado, com barco…).
export default function AgendaLabelsEditor({ tours = [], labels, onSave, lang = "pt" }) {
  const tr = (pt, en) => (lang === "en" ? en : pt);
  const initial = useMemo(() => normalizeAgendaLabels(labels), [labels]);
  const [draft, setDraft] = useState(initial);
  const [newTagName, setNewTagName] = useState("");
  const [newTagColor, setNewTagColor] = useState(AGENDA_PALETTE[4]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => setDraft(initial), [initial]);

  const dirty = JSON.stringify(draft) !== JSON.stringify(initial);
  const sortedTours = [...tours].sort((a, b) => String(a.title).localeCompare(String(b.title)));

  const setTour = (tourId, patch) =>
    setDraft((current) => {
      const prev = current.tours[tourId] || { color: null, tagIds: [] };
      return { ...current, tours: { ...current.tours, [tourId]: { ...prev, ...patch } } };
    });

  const toggleTag = (tourId, tagId) => {
    const prev = draft.tours[tourId]?.tagIds || [];
    setTour(tourId, { tagIds: prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId] });
  };

  const addTag = () => {
    const name = newTagName.trim();
    if (!name) return;
    const id = `tag_${Date.now().toString(36)}`;
    setDraft((current) => ({ ...current, tags: [...current.tags, { id, name: name.slice(0, 30), color: newTagColor }] }));
    setNewTagName("");
  };

  const removeTag = (tagId) =>
    setDraft((current) => ({
      tags: current.tags.filter((tag) => tag.id !== tagId),
      tours: Object.fromEntries(
        Object.entries(current.tours).map(([id, value]) => [id, { ...value, tagIds: (value.tagIds || []).filter((t) => t !== tagId) }]),
      ),
    }));

  const save = async () => {
    setSaving(true);
    setMessage("");
    try {
      await onSave(normalizeAgendaLabels(draft));
      setMessage(tr("Cores salvas.", "Colours saved."));
    } catch (error) {
      setMessage(error?.message || tr("Erro ao salvar.", "Error saving."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <details className="pmy-channel-editor pmy-agenda-labels">
      <summary className="pmy-channel-editor__summary">
        {tr("Cores e etiquetas dos passeios", "Tour colours and tags")}
        {draft.tags.length ? ` · ${draft.tags.length} ${tr("etiquetas", "tags")}` : ""}
      </summary>
      <p className="pmy-channel-editor__hint">
        {tr(
          "Crie aqui as etiquetas (ex.: Privado, Menos de 4 pessoas) e escolha a cor de cada passeio. Para marcar etiquetas numa saída específica, clique no dia da Agenda → \"Saídas do dia e etiquetas\" → \"+ Etiqueta\". Marcar uma etiqueta aqui embaixo, no passeio, faz ela aparecer em todas as saídas dele.",
          "Create tags here (e.g. Private, Under 4 people) and pick each tour's colour. To tag a specific departure, click the Agenda day → \"Departures and tags\" → \"+ Tag\". Marking a tag on the tour below shows it on every departure of that tour.",
        )}
      </p>

      <div className="pmy-agenda-labels__tags">
        <strong>{tr("Etiquetas", "Tags")}</strong>
        <div className="pmy-agenda-labels__tag-list">
          {draft.tags.map((tag) => (
            <span key={tag.id} className="pmy-agenda-tag" style={{ background: tag.color, color: contrastText(tag.color) }}>
              {tag.name}
              <button type="button" aria-label={tr(`Remover ${tag.name}`, `Remove ${tag.name}`)} onClick={() => removeTag(tag.id)}>×</button>
            </span>
          ))}
          {!draft.tags.length && <small>{tr("Nenhuma etiqueta ainda.", "No tags yet.")}</small>}
        </div>
        <div className="pmy-agenda-labels__new-tag">
          <input
            value={newTagName}
            onChange={(e) => setNewTagName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }}
            placeholder={tr("Nova etiqueta (ex.: Privado)", "New tag (e.g. Private)")}
            maxLength={30}
            aria-label={tr("Nome da etiqueta", "Tag name")}
          />
          <input type="color" value={newTagColor} onChange={(e) => setNewTagColor(e.target.value)} aria-label={tr("Cor da etiqueta", "Tag colour")} />
          <Button type="button" variant="secondary" size="sm" onClick={addTag} disabled={!newTagName.trim()}>
            {tr("Criar etiqueta", "Create tag")}
          </Button>
        </div>
      </div>

      <div className="pmy-agenda-labels__tours">
        {sortedTours.map((tour) => {
          const config = draft.tours[tour.id] || {};
          const color = config.color || automaticTourColor(tour.id);
          return (
            <div key={tour.id} className="pmy-agenda-labels__tour">
              <input
                type="color"
                value={color}
                onChange={(e) => setTour(tour.id, { color: e.target.value })}
                aria-label={tr(`Cor de ${tour.title}`, `Colour of ${tour.title}`)}
              />
              <div className="pmy-agenda-labels__tour-main">
                <span className="pmy-agenda-labels__tour-title">
                  <i style={{ background: color }} aria-hidden="true" />
                  {tour.title}
                  {!config.color && <small> · {tr("automática", "automatic")}</small>}
                </span>
                {draft.tags.length > 0 && (
                  <div className="pmy-agenda-labels__tour-tags">
                    {draft.tags.map((tag) => {
                      const on = (config.tagIds || []).includes(tag.id);
                      return (
                        <button
                          key={tag.id}
                          type="button"
                          aria-pressed={on}
                          className={`pmy-agenda-tag is-toggle ${on ? "is-on" : ""}`}
                          style={on ? { background: tag.color, color: contrastText(tag.color), borderColor: tag.color } : { borderColor: tag.color, color: tag.color }}
                          onClick={() => toggleTag(tour.id, tag.id)}
                        >
                          {tag.name}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="pmy-language-quota__footer">
        <span role="status">{message}</span>
        <Button type="button" size="sm" onClick={save} disabled={!dirty || saving}>
          {saving ? "..." : tr("Salvar cores", "Save colours")}
        </Button>
      </div>
    </details>
  );
}
