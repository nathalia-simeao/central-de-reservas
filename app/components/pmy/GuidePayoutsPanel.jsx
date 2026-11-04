import { useEffect, useState } from "react";
import { Button, Card, SectionHeader } from "./PmyUI";

// Visão geral → Financeiro → Fechamento dos guias (só administradores).
function currentMonth() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Lisbon", year: "numeric", month: "2-digit" }).format(new Date()).slice(0, 7);
}

function shiftMonth(month, delta) {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

export default function GuidePayoutsPanel({ loadPayouts, formatMoney, tours = [], lang = "pt" }) {
  const tr = (pt, en) => (lang === "en" ? en : pt);
  const [month, setMonth] = useState(currentMonth);
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState("");

  useEffect(() => {
    if (!loadPayouts) return undefined;
    let alive = true;
    setLoading(true);
    setError("");
    loadPayouts(month)
      .then((result) => { if (alive) setData(result); })
      .catch((e) => { if (alive) setError(e?.message || tr("Não foi possível carregar.", "Could not load.")); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month, loadPayouts]);

  const fmt = (value) => formatMoney(value, "EUR");
  const when = (iso) => new Intl.DateTimeFormat(lang === "en" ? "en-GB" : "pt-PT", { timeZone: "Europe/Lisbon", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
  const monthLabel = new Intl.DateTimeFormat(lang === "en" ? "en-GB" : "pt-PT", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${month}-01T00:00:00Z`));

  const downloadCsv = () => {
    if (!data?.guides?.length) return;
    const escape = (v) => { const t = String(v ?? ""); return /[",\n;]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t; };
    const rows = [["Guia", "Passeio", "Data/hora (Lisboa)", "Idiomas", "Pessoas", "No-show", "Valor (€)", "Encerrada pelo guia"]];
    for (const guide of data.guides) {
      for (const d of guide.departures) {
        rows.push([guide.name, d.tourTitle, when(d.startTime), d.languages.join(" "), d.pax, d.noShow, d.amount.toFixed(2), d.completed ? "sim" : "não"]);
      }
      rows.push([guide.name, "TOTAL", "", "", guide.pax, "", guide.total.toFixed(2), ""]);
    }
    const blob = new Blob(["﻿" + rows.map((r) => r.map(escape).join(",")).join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `fechamento-guias-${month}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const tourName = (id) => tours.find((t) => t.id === id)?.title || id;

  return (
    <Card>
      <SectionHeader
        eyebrow={tr("Financeiro", "Finance")}
        title={tr("Fechamento dos guias", "Guide payouts")}
        subtitle={tr("Um pagamento por saída, pela faixa de pessoas do grupo do guia (no-show não conta).", "One payment per departure, by the guide's group size tier (no-shows excluded).")}
      />
      <div className="pmy-payouts__toolbar">
        <Button type="button" size="sm" variant="secondary" onClick={() => setMonth((m) => shiftMonth(m, -1))} aria-label={tr("Mês anterior", "Previous month")}>‹</Button>
        <strong className="pmy-payouts__month">{monthLabel}</strong>
        <Button type="button" size="sm" variant="secondary" onClick={() => setMonth((m) => shiftMonth(m, 1))} aria-label={tr("Próximo mês", "Next month")}>›</Button>
        <span className="pmy-payouts__spacer" />
        {data && <span>{tr("Total do mês", "Month total")}: <strong>{fmt(data.total)}</strong> · {data.departures} {tr("saídas", "departures")}</span>}
        <Button type="button" size="sm" variant="secondary" onClick={downloadCsv} disabled={!data?.guides?.length}>{tr("Baixar planilha", "Download CSV")}</Button>
      </div>

      {loading && <p className="pmy-payouts__muted">{tr("Carregando…", "Loading…")}</p>}
      {error && <p role="alert" className="pmy-booking-list__error">{error}</p>}
      {data && !loading && !data.guides.length && <p className="pmy-payouts__muted">{tr("Nenhuma saída com guia escalado neste mês.", "No departures with a guide this month.")}</p>}

      {data && data.guides.length > 0 && (
        <ul className="pmy-payouts">
          {data.guides.map((guide) => (
            <li key={guide.guideId} className="pmy-payouts__guide">
              <button type="button" className="pmy-payouts__head" aria-expanded={open === guide.guideId} onClick={() => setOpen(open === guide.guideId ? "" : guide.guideId)}>
                <span>{guide.name}</span>
                <small>{guide.departures.length} {tr("saídas", "departures")} · {guide.pax} pax</small>
                <strong>{fmt(guide.total)}</strong>
              </button>
              {open === guide.guideId && (
                <div className="pmy-payouts__table">
                  {guide.departures.map((d) => (
                    <div key={d.id} className="pmy-payouts__row">
                      <span>{when(d.startTime)}</span>
                      <span className="pmy-payouts__tour">{d.tourTitle}{d.languages.length ? ` · ${d.languages.join("/").toUpperCase()}` : ""}</span>
                      <span>{d.pax} pax{d.noShow ? ` · ${d.noShow} no-show` : ""}{d.completed ? "" : ` · ${tr("sem Fim", "no End")}`}</span>
                      <strong>{d.priced ? fmt(d.amount) : tr("sem tabela", "no tier")}</strong>
                    </div>
                  ))}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {data?.toursWithoutTiers?.length > 0 && (
        <p className="pmy-payouts__muted">
          {tr("Passeios sem tabela de pagamento do guia (contam €0 — preencha em Configurar custos): ", "Tours without guide pay tiers (count as €0 — fill in Configure costs): ")}
          {data.toursWithoutTiers.slice(0, 6).map(tourName).join(", ")}{data.toursWithoutTiers.length > 6 ? "…" : ""}
        </p>
      )}
    </Card>
  );
}
