import { useEffect, useRef, useState } from "react";
import { AGENDA_PICKER_PALETTE, INACTIVE_TOUR_COLOR, colorsUsedByOtherTours, tourColor } from "../../utils/agenda-labels.js";

// Cor do passeio na Agenda, escolhida no próprio produto
// (Integrações → Produtos por Plataforma). Vale para o passeio em todos os canais.
export default function TourColorPicker({ tourId, agendaLabels, onSave, inactive = false, lang = "pt" }) {
  const tr = (pt, en) => (lang === "en" ? en : pt);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const ref = useRef(null);
  const customRef = useRef(null);
  const color = tourColor(agendaLabels, tourId, { inactive });
  const used = colorsUsedByOtherTours(agendaLabels, tourId);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (!open) return undefined;
    const close = (event) => { if (ref.current && !ref.current.contains(event.target)) setOpen(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  // Native "change" fires once when the colour dialog closes (React's onChange
  // fires on every drag step, which would save dozens of times).
  useEffect(() => {
    const input = customRef.current;
    if (!open || !input) return undefined;
    const handle = () => pick(input.value);
    input.addEventListener("change", handle);
    return () => input.removeEventListener("change", handle);
  });

  if (!tourId || !onSave) return null;

  const pick = async (value) => {
    const normalized = String(value || "").toLowerCase();
    if (used.has(normalized)) {
      setNotice(tr("Essa cor já é de outro passeio.", "That colour belongs to another tour."));
      return;
    }
    setNotice("");
    setBusy(true);
    try {
      await onSave(tourId, value);
      setOpen(false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <span
      className="pmy-tour-color"
      ref={ref}
      // Lives inside <summary> on the GYG list: keep clicks from toggling the row.
      onClick={(event) => { event.stopPropagation(); if (event.target !== customRef.current) event.preventDefault(); }}
    >
      <button
        type="button"
        className="pmy-tour-color__swatch"
        style={{ background: color }}
        aria-label={tr("Cor do passeio na Agenda", "Tour colour in the Agenda")}
        title={tr("Cor do passeio na Agenda", "Tour colour in the Agenda")}
        aria-expanded={open}
        disabled={busy}
        onClick={(event) => { event.preventDefault(); setOpen(!open); }}
      />
      {open && (
        <span className="pmy-tour-color__menu" role="group" aria-label={tr("Escolher cor", "Choose colour")}>
          {AGENDA_PICKER_PALETTE.map((value) => (
            <button
              key={value}
              type="button"
              className={`pmy-tour-color__option ${value === color ? "is-current" : ""} ${used.has(value) ? "is-used" : ""}`}
              style={{ background: value }}
              aria-label={used.has(value) ? `${value} · ${tr("já usada", "already used")}` : value}
              title={used.has(value) ? tr("Já usada por outro passeio", "Already used by another tour") : undefined}
              disabled={used.has(value)}
              onClick={() => pick(value)}
            />
          ))}
          <button
            type="button"
            className={`pmy-tour-color__inactive ${color === INACTIVE_TOUR_COLOR ? "is-current" : ""}`}
            title={tr("Cinza (passeio inativo)", "Grey (inactive tour)")}
            onClick={() => pick(INACTIVE_TOUR_COLOR)}
          >
            <i style={{ background: INACTIVE_TOUR_COLOR }} />{tr("Inativo", "Inactive")}
          </button>
          <button
            type="button"
            className="pmy-tour-color__custom"
            title={tr("Outra cor", "Custom colour")}
            aria-label={tr("Outra cor", "Custom colour")}
            onClick={() => {
              const input = customRef.current;
              if (!input) return;
              if (typeof input.showPicker === "function") { try { input.showPicker(); return; } catch { /* fall back */ } }
              input.click();
            }}
          >+</button>
          {notice && <span className="pmy-tour-color__notice" role="status">{notice}</span>}
          <input ref={customRef} className="pmy-tour-color__native" type="color" defaultValue={color} tabIndex={-1} aria-hidden="true" />
        </span>
      )}
    </span>
  );
}
