import { useEffect, useMemo, useState } from "react";
import { Button, Card, SectionHeader } from "./PmyUI";
import { PRICE_CATEGORIES, PRICE_PLATFORMS, normalizePlatformPrices } from "../../utils/platform-prices.js";

const PLATFORM_NAMES = { GETYOURGUIDE: "GetYourGuide", VIATOR: "Viator", HEADOUT: "Headout", CIVITATIS: "Civitatis" };
const CATEGORY_NAMES = { ADULT: ["Adulto", "Adult"], CHILD: ["Criança", "Child"], YOUTH: ["Jovem", "Youth"], SENIOR: ["Sênior", "Senior"] };

// Integrações → Preços por plataforma (item 3). Só administradores.
export default function PlatformPricesPanel({ tours = [], platformPrices, onSave, lang = "pt" }) {
  const tr = (pt, en) => (lang === "en" ? en : pt);
  const initial = useMemo(() => normalizePlatformPrices(platformPrices), [platformPrices]);
  const [draft, setDraft] = useState(initial);
  const [tourId, setTourId] = useState("");
  const [percent, setPercent] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  useEffect(() => setDraft(initial), [initial]);

  const sortedTours = [...tours].sort((a, b) => String(a.title).localeCompare(String(b.title)));
  const configured = new Set(Object.keys(draft.tours));
  const current = draft.tours[tourId] || {};
  const dirty = JSON.stringify(normalizePlatformPrices(draft)) !== JSON.stringify(initial);

  const setPrice = (platform, category, value) =>
    setDraft((d) => {
      const tour = { ...(d.tours[tourId] || {}) };
      tour[platform] = { ...(tour[platform] || {}), [category]: value };
      return { ...d, tours: { ...d.tours, [tourId]: tour } };
    });

  // Copia os preços do GYG para outra plataforma com um ajuste em % (ex.: -5).
  const copyFromGyg = (platform) => {
    const base = current.GETYOURGUIDE || {};
    const factor = 1 + (Number(String(percent).replace(",", ".")) || 0) / 100;
    for (const category of PRICE_CATEGORIES) {
      const value = Number(String(base[category] ?? "").replace(",", "."));
      if (Number.isFinite(value) && base[category] !== "" && base[category] !== undefined) {
        setPrice(platform, category, (Math.round(value * factor * 100) / 100).toFixed(2));
      }
    }
  };

  const save = async () => {
    setSaving(true);
    setMessage("");
    try {
      await onSave(normalizePlatformPrices(draft));
      setMessage(tr("Preços salvos.", "Prices saved."));
    } catch (e) {
      setMessage(e?.message || tr("Erro ao salvar.", "Error saving."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <SectionHeader
        eyebrow={tr("Preços", "Prices")}
        title={tr("Preço por plataforma", "Price by platform")}
        subtitle={tr(
          "Defina quanto cobrar em cada canal (ex.: GYG €69, Headout €65). Em branco = mesmo preço do site. O GetYourGuide recebe estes valores automaticamente quando o passeio tem “Preço via API” ligado; as demais plataformas usam quando forem conectadas.",
          "Set what to charge on each channel. Blank = same as the website. GetYourGuide receives these automatically when the tour has “Price via API” on; other platforms use them once connected.",
        )}
      />
      <label className="pmy-prices__tour">
        {tr("Passeio", "Tour")}
        <select value={tourId} onChange={(e) => setTourId(e.target.value)}>
          <option value="">{tr("Escolha o passeio", "Choose a tour")}</option>
          {sortedTours.map((t) => (
            <option key={t.id} value={t.id}>{configured.has(t.id) ? "● " : ""}{t.title}</option>
          ))}
        </select>
      </label>

      {tourId && (
        <div className="pmy-prices__grid" role="table" aria-label={tr("Preços por plataforma", "Prices by platform")}>
          <div className="pmy-prices__row is-head" role="row">
            <span role="columnheader">{tr("Plataforma", "Platform")}</span>
            {PRICE_CATEGORIES.map((c) => <span key={c} role="columnheader">{tr(...CATEGORY_NAMES[c])} €</span>)}
            <span role="columnheader" />
          </div>
          {PRICE_PLATFORMS.map((platform) => (
            <div key={platform} className="pmy-prices__row" role="row">
              <strong role="cell">{PLATFORM_NAMES[platform]}</strong>
              {PRICE_CATEGORIES.map((category) => (
                <input
                  key={category}
                  role="cell"
                  inputMode="decimal"
                  value={current[platform]?.[category] ?? ""}
                  onChange={(e) => setPrice(platform, category, e.target.value)}
                  placeholder={tr("site", "site")}
                  aria-label={`${PLATFORM_NAMES[platform]} · ${tr(...CATEGORY_NAMES[category])}`}
                />
              ))}
              <span role="cell">
                {platform !== "GETYOURGUIDE" && (
                  <Button type="button" size="sm" variant="secondary" onClick={() => copyFromGyg(platform)} disabled={!current.GETYOURGUIDE}>
                    {tr("Copiar do GYG", "Copy from GYG")}
                  </Button>
                )}
              </span>
            </div>
          ))}
          <label className="pmy-prices__percent">
            {tr("Ajuste ao copiar do GYG (%)", "Adjustment when copying from GYG (%)")}
            <input inputMode="decimal" value={percent} onChange={(e) => setPercent(e.target.value)} placeholder="-5" />
          </label>
        </div>
      )}

      <div className="pmy-language-quota__footer">
        <span role="status">{message}</span>
        <Button type="button" size="sm" onClick={save} disabled={!dirty || saving}>{saving ? "..." : tr("Salvar preços", "Save prices")}</Button>
      </div>
    </Card>
  );
}
