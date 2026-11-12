import { useEffect, useMemo, useState } from "react";
import { Button, Card, SectionHeader } from "./PmyUI";
import { COST_PLATFORMS, TICKET_CATEGORIES, normalizeCostSettings } from "../../utils/profit.js";

const PLATFORM_NAMES = {
  SHOPIFY: "Site (Shopify)",
  GETYOURGUIDE: "GetYourGuide",
  VIATOR: "Viator",
  HEADOUT: "Headout",
  CIVITATIS: "Civitatis",
  AIRBNB: "Airbnb",
  TIQETS: "Tiqets",
  KLOOK: "Klook",
  CENTRAL: "Central / manual",
};

const CATEGORY_NAMES = { ADULT: ["Adulto", "Adult"], CHILD: ["Criança", "Child"], YOUTH: ["Jovem", "Youth"], SENIOR: ["Sênior", "Senior"] };

function numberInput(value) {
  return value === null || value === undefined ? "" : String(value);
}

function CostSettingsEditor({ tours, costSettings, onSave, tr }) {
  const initial = useMemo(() => normalizeCostSettings(costSettings), [costSettings]);
  const [draft, setDraft] = useState(initial);
  const [openTour, setOpenTour] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  useEffect(() => setDraft(initial), [initial]);

  const dirty = JSON.stringify(normalizeCostSettings(draft)) !== JSON.stringify(initial);
  const sortedTours = [...tours].sort((a, b) => String(a.title).localeCompare(String(b.title)));

  const setCommission = (platform, value) =>
    setDraft((d) => ({ ...d, platformCommissionPercent: { ...d.platformCommissionPercent, [platform]: value } }));
  const setFee = (platform, field, value) =>
    setDraft((d) => ({ ...d, paymentFees: { ...d.paymentFees, [platform]: { ...(d.paymentFees[platform] || {}), [field]: value } } }));
  const tourDraft = (tourId) => draft.tours[tourId] || { ticketCost: {}, guidePay: [] };
  const setTour = (tourId, patch) =>
    setDraft((d) => ({ ...d, tours: { ...d.tours, [tourId]: { ...tourDraft(tourId), ...patch } } }));

  const save = async () => {
    setSaving(true);
    setMessage("");
    try {
      await onSave(normalizeCostSettings(draft));
      setMessage(tr("Custos salvos.", "Costs saved."));
    } catch (error) {
      setMessage(error?.message || tr("Erro ao salvar.", "Error saving."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <details className="pmy-channel-editor pmy-cost-editor">
      <summary className="pmy-channel-editor__summary">{tr("Configurar custos", "Configure costs")}</summary>

      <h4>{tr("Comissão e taxa de pagamento por plataforma", "Commission and payment fee by platform")}</h4>
      <div className="pmy-cost-editor__grid">
        <span />
        <small>{tr("Comissão %", "Commission %")}</small>
        <small>{tr("Taxa pgto %", "Payment fee %")}</small>
        <small>{tr("Taxa fixa € / pedido", "Fixed fee € / order")}</small>
        {COST_PLATFORMS.map((platform) => (
          <div key={platform} className="pmy-cost-editor__row">
            <strong>{PLATFORM_NAMES[platform]}</strong>
            <input inputMode="decimal" value={numberInput(draft.platformCommissionPercent[platform])} onChange={(e) => setCommission(platform, e.target.value)} placeholder="0" aria-label={`${PLATFORM_NAMES[platform]} %`} />
            <input inputMode="decimal" value={numberInput(draft.paymentFees[platform]?.percent)} onChange={(e) => setFee(platform, "percent", e.target.value)} placeholder="0" aria-label={tr("Taxa %", "Fee %")} />
            <input inputMode="decimal" value={numberInput(draft.paymentFees[platform]?.fixed)} onChange={(e) => setFee(platform, "fixed", e.target.value)} placeholder="0,00" aria-label={tr("Taxa fixa", "Fixed fee")} />
          </div>
        ))}
      </div>

      <h4>{tr("Por passeio: ingressos (por pessoa) e pagamento do guia (por saída)", "Per tour: tickets (per person) and guide pay (per departure)")}</h4>
      <div className="pmy-cost-editor__tours">
        {sortedTours.map((tour) => {
          const config = tourDraft(tour.id);
          const configured = Object.keys(config.ticketCost || {}).length || (config.guidePay || []).length;
          const open = openTour === tour.id;
          return (
            <div key={tour.id} className="pmy-cost-editor__tour">
              <button type="button" className="pmy-cost-editor__tour-head" aria-expanded={open} onClick={() => setOpenTour(open ? "" : tour.id)}>
                <span>{tour.title}</span>
                <small>{configured ? tr("configurado", "configured") : tr("sem custos", "no costs")}</small>
              </button>
              {open && (
                <div className="pmy-cost-editor__tour-body">
                  <div className="pmy-cost-editor__tickets">
                    {TICKET_CATEGORIES.map((category) => (
                      <label key={category}>
                        <span>{tr(...CATEGORY_NAMES[category])} €</span>
                        <input inputMode="decimal" value={numberInput(config.ticketCost?.[category])} placeholder="0,00"
                          onChange={(e) => setTour(tour.id, { ticketCost: { ...config.ticketCost, [category]: e.target.value } })} />
                      </label>
                    ))}
                  </div>
                  <div className="pmy-cost-editor__tiers">
                    <small>{tr("Guia: de / até pessoas → valor da saída (deixe 'até' vazio para 'ou mais')", "Guide: from / to people → pay per departure (leave 'to' empty for 'or more')")}</small>
                    {(config.guidePay || []).map((tier, index) => (
                      <div key={index} className="pmy-cost-editor__tier">
                        <input inputMode="numeric" value={numberInput(tier.minPax)} placeholder={tr("de", "from")} aria-label={tr("De pessoas", "From people")}
                          onChange={(e) => setTour(tour.id, { guidePay: config.guidePay.map((t, i) => (i === index ? { ...t, minPax: e.target.value } : t)) })} />
                        <input inputMode="numeric" value={numberInput(tier.maxPax)} placeholder={tr("até", "to")} aria-label={tr("Até pessoas", "To people")}
                          onChange={(e) => setTour(tour.id, { guidePay: config.guidePay.map((t, i) => (i === index ? { ...t, maxPax: e.target.value } : t)) })} />
                        <input inputMode="decimal" value={numberInput(tier.amount)} placeholder="€" aria-label={tr("Valor", "Amount")}
                          onChange={(e) => setTour(tour.id, { guidePay: config.guidePay.map((t, i) => (i === index ? { ...t, amount: e.target.value } : t)) })} />
                        <button type="button" aria-label={tr("Remover faixa", "Remove tier")} onClick={() => setTour(tour.id, { guidePay: config.guidePay.filter((_, i) => i !== index) })}>×</button>
                      </div>
                    ))}
                    <Button type="button" variant="secondary" size="sm"
                      onClick={() => setTour(tour.id, { guidePay: [...(config.guidePay || []), { minPax: "", maxPax: "", amount: "" }] })}>
                      {tr("+ Faixa do guia", "+ Guide tier")}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="pmy-language-quota__footer">
        <span role="status">{message}</span>
        <Button type="button" size="sm" onClick={save} disabled={!dirty || saving}>{saving ? "..." : tr("Salvar custos", "Save costs")}</Button>
      </div>
    </details>
  );
}

export default function ProfitPanel({ summary, formatMoney, periodLabel, lang = "pt", tours = [], costSettings, onSaveCosts }) {
  const tr = (pt, en) => (lang === "en" ? en : pt);
  if (!summary) return null;
  const fmt = (value) => formatMoney(value, summary.currency);
  const rows = [
    { key: "revenue", label: tr("Faturamento (valor pago pelos clientes)", "Revenue (paid by customers)"), value: summary.revenue, sign: "" },
    { key: "commission", label: tr("Comissão das plataformas", "Platform commissions"), value: summary.commission, sign: "−" },
    { key: "fees", label: tr("Taxas de pagamento", "Payment fees"), value: summary.paymentFees, sign: "−" },
    { key: "net", label: tr("Receita líquida", "Net revenue"), value: summary.net, sign: "=", strong: true },
    { key: "tickets", label: tr("Ingressos", "Tickets"), value: summary.tickets, sign: "−" },
    { key: "guides", label: tr(`Guias (${summary.departureCount} saídas)`, `Guides (${summary.departureCount} departures)`), value: summary.guides, sign: "−" },
    { key: "profit", label: tr("Lucro", "Profit"), value: summary.profit, sign: "=", strong: true, profit: true },
  ];
  const tourName = (id) => tours.find((tour) => tour.id === id)?.title || id;

  return (
    <Card>
      <SectionHeader
        eyebrow={tr("Financeiro", "Finance")}
        title={tr("Faturamento × lucro", "Revenue × profit")}
        subtitle={`${periodLabel} · ${tr("passeios com data no período", "tours dated in the period")} · ${summary.bookingCount} ${tr("reservas", "bookings")}`}
      />
      <div className="pmy-profit">
        <div className="pmy-profit__table">
          {rows.map((row) => (
            <div key={row.key} className={`pmy-profit__row ${row.strong ? "is-strong" : ""} ${row.profit ? (summary.profit >= 0 ? "is-positive" : "is-negative") : ""}`}>
              <span>{row.sign && <b>{row.sign}</b>} {row.label}</span>
              <strong>{fmt(row.value)}</strong>
            </div>
          ))}
          <div className="pmy-profit__row is-muted">
            <span>{tr("Margem", "Margin")}</span>
            <strong>{summary.margin === null ? "—" : `${summary.margin.toFixed(1)}%`}</strong>
          </div>
        </div>

        {summary.byPlatform.length > 0 && (
          <div className="pmy-profit__platforms">
            <small>{tr("Por plataforma", "By platform")}</small>
            {summary.byPlatform.map((row) => (
              <div key={row.platform} className="pmy-profit__row">
                <span>{PLATFORM_NAMES[row.platform] || row.platform} · {row.bookings}</span>
                <strong>{fmt(row.revenue - row.commission - row.paymentFees)}</strong>
              </div>
            ))}
          </div>
        )}
      </div>

      {(summary.missingPriceCount > 0 || summary.toursWithoutCosts.length > 0) && (
        <div className="pmy-ds-status-note">
          {summary.missingPriceCount > 0 && (
            <p>{tr(
              `${summary.missingPriceCount} reserva(s) sem valor registrado (ex.: canais que não enviam preço) não entram no faturamento.`,
              `${summary.missingPriceCount} booking(s) without a price are not counted in revenue.`,
            )}</p>
          )}
          {summary.toursWithoutCosts.length > 0 && (
            <p>{tr("Passeios sem custos cadastrados (ingresso/guia contam como zero): ", "Tours without costs (tickets/guide count as zero): ")}
              {summary.toursWithoutCosts.slice(0, 6).map(tourName).join(", ")}{summary.toursWithoutCosts.length > 6 ? "…" : ""}</p>
          )}
        </div>
      )}

      <CostSettingsEditor tours={tours} costSettings={costSettings} onSave={onSaveCosts} tr={tr} />
    </Card>
  );
}
