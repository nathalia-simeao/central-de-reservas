import { useMemo, useState } from "react";
import { DatePicker, DropdownSelect } from "./PmyUI";
import {
  extractTourLanguages,
  languageKey,
  languageLabel,
  QUOTA_LANGUAGE_KEYS,
} from "../../utils/tour-languages";
import { normalizeTimeKey } from "../../utils/language-quotas";

const KEEP_GUIDE = "__keep";

function slotOf(startTime, timeZone = "Europe/Lisbon") {
  const date = new Date(startTime);
  if (Number.isNaN(date.getTime())) return null;
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone, year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", hourCycle: "h23",
    }).formatToParts(date).map((part) => [part.type, part.value]),
  );
  return { date: `${parts.year}-${parts.month}-${parts.day}`, time: `${parts.hour}:${parts.minute}` };
}

// "Vagas por idioma": release N seats per language for one or more departure times of a tour,
// on a specific date or on every day, and (for a specific date) schedule the guide.
export default function LanguageQuotaEditor({
  tour, hours = [], rules = [], guides = [], assignments = [], onSave, lang = "pt",
}) {
  const en = lang === "en";
  const tr = (pt, english) => (en ? english : pt);

  const [date, setDate] = useState("");
  const [times, setTimes] = useState([]);
  const [drafts, setDrafts] = useState({});
  const [extraKeys, setExtraKeys] = useState([]);
  const [guideDraft, setGuideDraft] = useState(null);
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

  // Guide currently scheduled for each selected time on the chosen date.
  const guideByTime = useMemo(() => {
    const map = {};
    if (!date) return map;
    for (const assignment of assignments) {
      if (assignment?.status && assignment.status !== "ASSIGNED") continue;
      if (String(assignment?.tour?.shopifyProductId || "") !== String(tour.id)) continue;
      const slot = slotOf(assignment.startTime, assignment.tour?.timezone || "Europe/Lisbon");
      if (slot?.date === date) map[slot.time] = assignment.guide?.id || assignment.guideId || "";
    }
    return map;
  }, [assignments, date, tour.id]);

  const selectedRules = times
    .map((time) => rules.find((rule) => rule.time === time && (rule.date || "") === date))
    .filter(Boolean);
  // Values shown come from the first selected time that already has a rule.
  const baseRule = selectedRules[0] || null;
  const savedSeats = Object.fromEntries((baseRule?.languages || []).map((item) => [item.key, item.seats]));
  const rulesDiffer = selectedRules.some(
    (rule) => JSON.stringify(rule.languages) !== JSON.stringify(baseRule.languages),
  ) || (selectedRules.length > 0 && selectedRules.length < times.length);

  const currentGuides = [...new Set(times.map((time) => guideByTime[time] || ""))];
  const sharedGuide = currentGuides.length === 1 ? currentGuides[0] : KEEP_GUIDE;
  const guideValue = guideDraft !== null ? guideDraft : sharedGuide;
  const guideTouched = guideDraft !== null && guideDraft !== sharedGuide;

  const rowKeys = [...new Set([...tourLanguageKeys, ...Object.keys(savedSeats), ...extraKeys])];
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
    setGuideDraft(null);
    setError("");
  };

  const toggleTime = (hour) => {
    setTimes((prev) => (prev.includes(hour) ? prev.filter((item) => item !== hour) : [...prev, hour].sort()));
  };

  const save = async ({ removeQuotas = false } = {}) => {
    setSaving(true);
    setError("");
    try {
      const sendQuotas = removeQuotas || filled.length > 0;
      await onSave(tour.id, {
        date,
        times,
        languages: removeQuotas
          ? []
          : filled.map(({ key, raw }) => ({ key, label: languageLabel(key, "pt"), seats: Number(raw) })),
        skipQuotas: !sendQuotas,
        guideId: !removeQuotas && date && guideTouched && guideValue !== KEEP_GUIDE ? guideValue : undefined,
      });
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

  const guideName = (id) => guides.find((guide) => guide.id === id)?.name || "";
  const canSave = !saving && !invalid && times.length > 0 && (filled.length > 0 || (date && guideTouched));

  return (
    <details className="pmy-channel-editor pmy-language-quota">
      <summary className="pmy-channel-editor__summary">
        {tr("Vagas por idioma e guia", "Seats by language and guide")}
        {rules.length ? ` · ${rules.length} ${tr(rules.length === 1 ? "regra ativa" : "regras ativas", rules.length === 1 ? "active rule" : "active rules")}` : ""}
      </summary>
      <p className="pmy-channel-editor__hint">
        {tr(
          "Escolha um ou mais horários e libere vagas por idioma. Nesses horários só os idiomas liberados vendem, cada um até o seu limite, sem passar da capacidade total. Sem data, vale todos os dias; uma data específica tem prioridade. Com data escolhida, você também escala o guia da saída.",
          "Pick one or more times and release seats per language. On those times only released languages sell, each up to its limit, never above total capacity. Without a date it applies every day; a specific date takes priority. With a date selected you can also schedule the guide.",
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
      </div>

      <div className="pmy-language-quota__field pmy-language-quota__times">
        <span>
          {tr("Horários", "Times")}
          {times.length ? ` · ${times.length} ${tr(times.length === 1 ? "selecionado" : "selecionados", "selected")}` : ""}
        </span>
        <div className="pmy-language-quota__chips" role="group" aria-label={tr("Horários da saída", "Departure times")}>
          {normalizedHours.map((hour) => (
            <button
              key={hour}
              type="button"
              aria-pressed={times.includes(hour)}
              className={`pmy-language-quota__chip${times.includes(hour) ? " is-selected" : ""}`}
              onClick={() => { toggleTime(hour); setDrafts({}); setExtraKeys([]); setGuideDraft(null); }}
            >
              {hour}
            </button>
          ))}
          {normalizedHours.length > 1 ? (
            <button
              type="button"
              className="pmy-language-quota__chip pmy-language-quota__chip--all"
              onClick={() => {
                setTimes(times.length === normalizedHours.length ? [] : [...normalizedHours]);
                resetDrafts();
              }}
            >
              {times.length === normalizedHours.length ? tr("Limpar", "Clear") : tr("Todos", "All")}
            </button>
          ) : null}
        </div>
      </div>

      {normalizedHours.length === 0 ? (
        <small>{tr("Sem horários cadastrados: confira as variantes Shopify.", "No departure times: check the Shopify variants.")}</small>
      ) : null}

      {times.length ? (
        <>
          {rulesDiffer ? (
            <small className="pmy-language-quota__note">
              {tr(
                "Os horários selecionados têm configurações diferentes. Ao salvar, os valores abaixo valem para todos eles.",
                "The selected times have different settings. Saving applies the values below to all of them.",
              )}
            </small>
          ) : null}

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
                  {savedSeats[key] !== undefined && !rulesDiffer ? tr("Salvo", "Saved") : ""}
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

          <div className="pmy-language-quota__field pmy-language-quota__guide">
            <span>{tr("Guia da saída", "Departure guide")}</span>
            {date ? (
              <DropdownSelect
                key={`guide-${date}-${times.join("-")}`}
                value={guideValue}
                onChange={(value) => setGuideDraft(value)}
                ariaLabel={tr("Guia da saída", "Departure guide")}
                placeholder={tr("Selecione o guia", "Select guide")}
                options={[
                  ...(sharedGuide === KEEP_GUIDE
                    ? [{ value: KEEP_GUIDE, label: tr("Manter guias atuais", "Keep current guides"), meta: tr("Os horários têm guias diferentes", "Times have different guides") }]
                    : []),
                  { value: "", label: tr("Sem guia", "No guide") },
                  ...guides.map((guide) => ({ value: guide.id, label: guide.name })),
                ]}
              />
            ) : (
              <small className="pmy-language-quota__note">
                {tr(
                  "Para escalar o guia, escolha uma data acima (a escala é feita por data e horário).",
                  "To schedule the guide, pick a date above (guides are scheduled per date and time).",
                )}
              </small>
            )}
            {date && guides.length === 0 ? (
              <small className="pmy-language-quota__note">{tr("Nenhum guia cadastrado ainda (aba Guias).", "No guides registered yet (Guides tab).")}</small>
            ) : null}
          </div>

          <div className="pmy-language-quota__footer">
            <span>
              {tr("Total liberado por horário", "Released per time")}: <b>{total}</b>
              {" · "}
              {formatDate(date)} · {times.join(", ")}
            </span>
            <div className="pmy-language-quota__actions">
              {selectedRules.length ? (
                <button type="button" className="pmy-channel-editor__save pmy-language-quota__remove"
                  disabled={saving} onClick={() => save({ removeQuotas: true })}>
                  {tr("Remover controle", "Remove control")}
                </button>
              ) : null}
              <button type="button" className="pmy-channel-editor__save" disabled={!canSave}
                onClick={() => save()}>
                {saving ? "..." : tr("Salvar", "Save")}
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
          {rules.map((rule) => {
            const scheduled = rule.date
              ? assignments.find((assignment) => {
                  if (assignment?.status && assignment.status !== "ASSIGNED") return false;
                  if (String(assignment?.tour?.shopifyProductId || "") !== String(tour.id)) return false;
                  const slot = slotOf(assignment.startTime, assignment.tour?.timezone || "Europe/Lisbon");
                  return slot?.date === rule.date && slot?.time === rule.time;
                })
              : null;
            const scheduledName = scheduled ? scheduled.guide?.name || guideName(scheduled.guideId) : "";
            return (
              <button
                type="button"
                key={rule.id}
                className="pmy-language-quota__rule"
                onClick={() => { setDate(rule.date || ""); setTimes([rule.time]); resetDrafts(); }}
                title={tr("Clique para editar", "Click to edit")}
              >
                <span>{formatDate(rule.date)} · {rule.time}{scheduledName ? ` · ${tr("Guia", "Guide")}: ${scheduledName}` : ""}</span>
                <span>
                  {rule.languages.map((item) => `${languageLabel(item.key, lang)} ${item.seats}`).join(" · ")}
                </span>
              </button>
            );
          })}
        </div>
      ) : null}
    </details>
  );
}
