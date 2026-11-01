import { useMemo, useState } from "react";
import { DatePicker, DropdownSelect } from "./PmyUI";
import {
  extractTourLanguages,
  languageKey,
  languageLabel,
  QUOTA_LANGUAGE_KEYS,
} from "../../utils/tour-languages";
import { normalizeTimeKey } from "../../utils/language-quotas";

// "Vagas por idioma": release N seats per language for one departure time of one tour,
// either on a specific date or on every day at that time.
export default function LanguageQuotaEditor({ tour, hours = [], rules = [], onSave, lang = "pt" }) {
  const en = lang === "en";
  const tr = (pt, english) => (en ? english : pt);

  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [drafts, setDrafts] = useState({});
  const [extraKeys, setExtraKeys] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const normalizedHours = useMemo(
    () => [...new Set(hours.map(normalizeTimeKey).filter(Boolean))].sort(),
    [hours],
  );

  const tourLanguageKeys = useMemo(() => {
    const keys = [];
    for (const label of extractTourLanguages(tour)) {
      const key = languageKey(label);
      if (key && !keys.includes(key)) keys.push(key);
    }
    return keys;
  }, [tour]);

  const currentRule = rules.find((rule) => rule.time === time && (rule.date || "") === date) || null;
  const savedSeats = Object.fromEntries((currentRule?.languages || []).map((item) => [item.key, item.seats]));

  const rowKeys = [
    ...new Set([...tourLanguageKeys, ...Object.keys(savedSeats), ...extraKeys]),
  ];
  const addableKeys = QUOTA_LANGUAGE_KEYS.filter((key) => !rowKeys.includes(key));

  const valueFor = (key) =>
    drafts[key] !== undefined ? drafts[key] : savedSeats[key] !== undefined ? String(savedSeats[key]) : "";

  const filled = rowKeys
    .map((key) => ({ key, raw: valueFor(key).trim() }))
    .filter(({ raw }) => raw !== "");
  const invalid = filled.some(({ raw }) => !/^\d{1,3}$/.test(raw));
  const total = invalid ? 0 : filled.reduce((sum, { raw }) => sum + Number(raw), 0);

  const resetDrafts = () => {
    setDrafts({});
    setExtraKeys([]);
    setError("");
  };

  const save = async (languages) => {
    setSaving(true);
    setError("");
    try {
      await onSave(tour.id, { date, time, languages });
      resetDrafts();
    } catch (saveError) {
      setError(saveError?.message || tr("Erro ao salvar.", "Error saving."));
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (value) => {
    if (!value) return tr("Todos os dias", "Every day");
    const [year, month, day] = value.split("-");
    return `${day}/${month}/${year}`;
  };

  return (
    <details className="pmy-channel-editor pmy-language-quota">
      <summary className="pmy-channel-editor__summary">
        {tr("Vagas por idioma", "Seats by language")}
        {rules.length ? ` · ${rules.length} ${tr(rules.length === 1 ? "regra ativa" : "regras ativas", rules.length === 1 ? "active rule" : "active rules")}` : ""}
      </summary>
      <p className="pmy-channel-editor__hint">
        {tr(
          "Libere vagas por idioma para um horário. Quando um horário tem vagas por idioma, só os idiomas liberados podem ser vendidos, cada um até o seu limite, sem ultrapassar a capacidade total. Deixe a data vazia para valer todos os dias nesse horário; uma data específica tem prioridade.",
          "Release seats per language for a departure time. When a time has language seats, only released languages can be sold, each up to its limit, never above total capacity. Leave the date empty to apply every day at that time; a specific date takes priority.",
        )}
      </p>

      <div className="pmy-language-quota__slot">
        <div className="pmy-language-quota__field">
          <span>{tr("Data (opcional)", "Date (optional)")}</span>
          <DatePicker
            value={date}
            onChange={(event) => { setDate(event?.target?.value ?? ""); resetDrafts(); }}
            locale={en ? "en-GB" : "pt-PT"}
            placeholder={tr("Todos os dias", "Every day")}
            todayLabel={tr("Hoje", "Today")}
            clearLabel={tr("Limpar", "Clear")}
          />
        </div>
        <div className="pmy-language-quota__field">
          <span>{tr("Horário", "Time")}</span>
          <DropdownSelect
            value={time}
            onChange={(value) => { setTime(value); resetDrafts(); }}
            ariaLabel={tr("Horário da saída", "Departure time")}
            placeholder={tr("Selecione", "Select")}
            options={normalizedHours.map((hour) => ({ value: hour, label: hour }))}
          />
        </div>
      </div>

      {normalizedHours.length === 0 ? (
        <small>{tr("Sem horários cadastrados: confira as variantes Shopify.", "No departure times: check the Shopify variants.")}</small>
      ) : null}

      {time ? (
        <>
          <div className="pmy-channel-editor__list">
            {rowKeys.map((key) => (
              <div key={key} className="pmy-channel-editor__channel pmy-language-quota__row">
                <label htmlFor={`langq-${tour.id}-${key}`}>{languageLabel(key, lang)}</label>
                <input
                  id={`langq-${tour.id}-${key}`}
                  type="number" min="0" max="999" step="1"
                  className="pmy-channel-editor__input"
                  placeholder={tr("Não liberado", "Not released")}
                  value={valueFor(key)}
                  onChange={(event) => setDrafts((prev) => ({ ...prev, [key]: event.target.value }))}
                />
                <span className="pmy-channel-editor__status">
                  {savedSeats[key] !== undefined ? tr("Salvo", "Saved") : ""}
                </span>
              </div>
            ))}
          </div>

          {addableKeys.length ? (
            <div className="pmy-language-quota__add">
              <DropdownSelect
                key={`add-${rowKeys.join("-")}`}
                value=""
                onChange={(value) => value && setExtraKeys((prev) => [...prev, value])}
                ariaLabel={tr("Adicionar idioma", "Add language")}
                placeholder={tr("+ Adicionar idioma", "+ Add language")}
                options={addableKeys.map((key) => ({ value: key, label: languageLabel(key, lang) }))}
              />
            </div>
          ) : null}

          <div className="pmy-language-quota__footer">
            <span>
              {tr("Total liberado", "Total released")}: <b>{total}</b>
              {" · "}
              {formatDate(date)} · {time}
            </span>
            <div className="pmy-language-quota__actions">
              {currentRule ? (
                <button type="button" className="pmy-channel-editor__save pmy-language-quota__remove"
                  disabled={saving} onClick={() => save([])}>
                  {tr("Remover controle", "Remove control")}
                </button>
              ) : null}
              <button type="button" className="pmy-channel-editor__save"
                disabled={saving || invalid || filled.length === 0}
                onClick={() => save(filled.map(({ key, raw }) => ({ key, label: languageLabel(key, "pt"), seats: Number(raw) })))}>
                {saving ? "..." : tr("Salvar vagas", "Save seats")}
              </button>
            </div>
          </div>
          {invalid ? <span role="alert" className="pmy-language-quota__error">{tr("Use números inteiros de 0 a 999.", "Use whole numbers from 0 to 999.")}</span> : null}
        </>
      ) : null}

      {error ? <span role="alert" className="pmy-language-quota__error">{error}</span> : null}

      {rules.length ? (
        <div className="pmy-language-quota__rules">
          <strong>{tr("Regras ativas", "Active rules")}</strong>
          {rules.map((rule) => (
            <button
              type="button"
              key={rule.id}
              className="pmy-language-quota__rule"
              onClick={() => { setDate(rule.date || ""); setTime(rule.time); resetDrafts(); }}
              title={tr("Clique para editar", "Click to edit")}
            >
              <span>{formatDate(rule.date)} · {rule.time}</span>
              <span>
                {rule.languages.map((item) => `${languageLabel(item.key, lang)} ${item.seats}`).join(" · ")}
              </span>
            </button>
          ))}
        </div>
      ) : null}
    </details>
  );
}
