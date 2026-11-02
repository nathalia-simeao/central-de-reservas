import { useEffect, useMemo, useState } from "react";
import { Button } from "./PmyUI";
import { AGENDA_PALETTE, contrastText, normalizeAgendaLabels } from "../../utils/agenda-labels.js";

// Painel de etiquetas da Agenda (estilo Trello): a gestão cria e mantém as
// etiquetas aqui; elas são marcadas em cada saída pela Grade do Dia.
// A cor de cada passeio é escolhida em Integrações → Produtos por Plataforma.
export default function AgendaLabelsEditor({ labels, onSave, lang = "pt" }) {
  const tr = (pt, en) => (lang === "en" ? en : pt);
  const initial = useMemo(() => normalizeAgendaLabels(labels), [labels]);
  const [tags, setTags] = useState(initial.tags);
  const [newTagName, setNewTagName] = useState("");
  const [newTagColor, setNewTagColor] = useState(AGENDA_PALETTE[4]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => setTags(initial.tags), [initial]);

  const dirty = JSON.stringify(tags) !== JSON.stringify(initial.tags);

  const addTag = () => {
    const name = newTagName.trim();
    if (!name) return;
    setTags((current) => [...current, { id: `tag_${Date.now().toString(36)}`, name: name.slice(0, 30), color: newTagColor }]);
    setNewTagName("");
  };

  const updateTag = (id, patch) => setTags((current) => current.map((tag) => (tag.id === id ? { ...tag, ...patch } : tag)));
  const removeTag = (id) => setTags((current) => current.filter((tag) => tag.id !== id));

  const save = async () => {
    setSaving(true);
    setMessage("");
    try {
      // Keeps tour colours untouched; removed tags disappear from departures automatically.
      await onSave(normalizeAgendaLabels({ ...initial, tags }));
      setMessage(tr("Etiquetas salvas.", "Tags saved."));
    } catch (error) {
      setMessage(error?.message || tr("Erro ao salvar.", "Error saving."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="pmy-tags-panel" aria-label={tr("Etiquetas", "Tags")}>
      <div className="pmy-tags-panel__header">
        <strong>{tr("Etiquetas", "Tags")}</strong>
        <small>{tr("Marque nas saídas clicando no dia → \"+ Etiqueta\"", "Mark them on departures: click a day → \"+ Tag\"")}</small>
      </div>

      <div className="pmy-tags-panel__list">
        {tags.map((tag) => (
          <span key={tag.id} className="pmy-tags-panel__tag" style={{ background: tag.color, color: contrastText(tag.color) }}>
            <input
              type="color"
              value={tag.color}
              onChange={(e) => updateTag(tag.id, { color: e.target.value })}
              aria-label={tr(`Cor de ${tag.name}`, `Colour of ${tag.name}`)}
              title={tr("Trocar cor", "Change colour")}
            />
            <input
              className="pmy-tags-panel__name"
              value={tag.name}
              maxLength={30}
              onChange={(e) => updateTag(tag.id, { name: e.target.value })}
              aria-label={tr("Nome da etiqueta", "Tag name")}
              style={{ color: contrastText(tag.color) }}
              size={Math.max(4, tag.name.length)}
            />
            <button type="button" aria-label={tr(`Apagar ${tag.name}`, `Delete ${tag.name}`)} onClick={() => removeTag(tag.id)}>×</button>
          </span>
        ))}
        {!tags.length && <small className="pmy-tags-panel__empty">{tr("Nenhuma etiqueta ainda.", "No tags yet.")}</small>}
      </div>

      <div className="pmy-tags-panel__new">
        <input type="color" value={newTagColor} onChange={(e) => setNewTagColor(e.target.value)} aria-label={tr("Cor da nova etiqueta", "New tag colour")} />
        <input
          className="pmy-tags-panel__new-name"
          value={newTagName}
          onChange={(e) => setNewTagName(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }}
          placeholder={tr("Nova etiqueta (ex.: Privado, Menos de 4 pessoas)", "New tag (e.g. Private, Under 4 people)")}
          maxLength={30}
          aria-label={tr("Nome da nova etiqueta", "New tag name")}
        />
        <Button type="button" variant="secondary" size="sm" onClick={addTag} disabled={!newTagName.trim()}>
          {tr("Criar", "Create")}
        </Button>
        <Button type="button" size="sm" onClick={save} disabled={!dirty || saving || tags.some((tag) => !tag.name.trim())}>
          {saving ? "..." : tr("Salvar etiquetas", "Save tags")}
        </Button>
        {message && <span role="status" className="pmy-tags-panel__msg">{message}</span>}
      </div>
    </section>
  );
}
