import { useMemo, useState } from "react";
import { Button, Modal } from "./PmyUI";

// Item 8 (pedido do cliente): clicar num contador do Dashboard e ver quem são
// os clientes — nome, telefone, e-mail, plataforma, participantes por faixa,
// passeio, data e idioma. Item 2: marcar realizado / no-show.

const PLATFORM_LABELS = {
  SHOPIFY: "Site (Shopify)",
  GETYOURGUIDE: "GetYourGuide",
  VIATOR: "Viator",
  CIVITATIS: "Civitatis",
  HEADOUT: "Headout",
  CENTRAL: "Central",
};

function digits(value) {
  return String(value || "").replace(/[^\d+]/g, "");
}

function whatsappUrl(phone) {
  const number = digits(phone).replace(/^\+/, "");
  return number.length >= 8 ? `https://wa.me/${number}` : null;
}

function lisbonDateTime(value, lang) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat(lang === "en" ? "en-GB" : "pt-PT", {
    timeZone: "Europe/Lisbon",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function paxLabel(booking, tr) {
  const parts = [
    [booking.adults, tr("adulto", "adult"), tr("adultos", "adults")],
    [booking.children, tr("criança", "child"), tr("crianças", "children")],
    [booking.youths, tr("jovem", "youth"), tr("jovens", "youths")],
    [booking.seniors, tr("sênior", "senior"), tr("seniores", "seniors")],
  ]
    .filter(([count]) => Number(count) > 0)
    .map(([count, one, many]) => `${count} ${Number(count) === 1 ? one : many}`);
  const total = Number(booking.totalParticipants || 0) ||
    ["adults", "children", "youths", "seniors"].reduce((sum, key) => sum + Number(booking[key] || 0), 0);
  return parts.length ? `${total} pax · ${parts.join(", ")}` : `${total || "—"} pax`;
}

export function bookingsToCsv(bookings, tourTitle) {
  const header = ["Nome", "Telefone", "E-mail", "Plataforma", "Participantes", "Adultos", "Crianças", "Jovens", "Seniores", "Passeio", "Data/hora (Lisboa)", "Idioma", "Referência", "Status", "Realização"];
  const escape = (value) => {
    const text = String(value ?? "");
    return /[",\n;]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  const rows = bookings.map((b) => [
    b.customerName, b.customerPhone, b.customerEmail, PLATFORM_LABELS[b.platform] || b.platform,
    b.totalParticipants, b.adults, b.children, b.youths, b.seniors, tourTitle(b.tourId),
    lisbonDateTime(b.startTime, "pt"), b.language, b.bookingRef || b.externalBookingId, b.status, b.attendanceStatus || "",
  ]);
  return [header, ...rows].map((row) => row.map(escape).join(",")).join("\n");
}

export default function BookingListModal({
  open,
  title,
  bookings = [],
  tours = [],
  lang = "pt",
  onClose,
  onSetAttendance,
  allowAttendance = false,
}) {
  const tr = (pt, en) => (lang === "en" ? en : pt);
  const [query, setQuery] = useState("");
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");

  const tourTitle = (tourId) => tours.find((tour) => tour.id === tourId)?.title || "Tour";

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return [...bookings]
      .sort((a, b) => new Date(a.startTime) - new Date(b.startTime))
      .filter((b) => !q || [b.customerName, b.customerEmail, b.customerPhone, b.bookingRef, tourTitle(b.tourId)]
        .some((value) => String(value || "").toLowerCase().includes(q)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookings, query, tours]);

  const totalPax = rows.reduce((sum, b) => sum + (Number(b.totalParticipants || 0) ||
    ["adults", "children", "youths", "seniors"].reduce((s, k) => s + Number(b[k] || 0), 0)), 0);

  const downloadCsv = () => {
    const blob = new Blob(["﻿" + bookingsToCsv(rows, tourTitle)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "reservas.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  const mark = async (booking, attendance) => {
    setBusyId(booking.id);
    setError("");
    try {
      await onSetAttendance?.(booking.id, attendance);
    } catch (e) {
      setError(e?.message || tr("Não foi possível salvar.", "Could not save."));
    } finally {
      setBusyId("");
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={title} closeLabel={tr("Fechar", "Close")} className="pmy-booking-list-modal">
      <div className="pmy-booking-list__toolbar">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={tr("Buscar nome, e-mail, telefone, passeio…", "Search name, email, phone, tour…")}
          aria-label={tr("Buscar reservas", "Search bookings")}
        />
        <span>{rows.length} {tr("reservas", "bookings")} · {totalPax} pax</span>
        <Button type="button" variant="secondary" size="sm" onClick={downloadCsv} disabled={!rows.length}>
          {tr("Baixar planilha", "Download CSV")}
        </Button>
      </div>
      {error && <p role="alert" className="pmy-booking-list__error">{error}</p>}

      {!rows.length ? (
        <p className="pmy-booking-list__empty">{tr("Nenhuma reserva aqui.", "No bookings here.")}</p>
      ) : (
        <ul className="pmy-booking-list">
          {rows.map((b) => {
            const wa = whatsappUrl(b.customerPhone);
            const tel = digits(b.customerPhone);
            const attendance = String(b.attendanceStatus || "").toUpperCase();
            return (
              <li key={b.id} className="pmy-booking-list__item">
                <div className="pmy-booking-list__main">
                  <strong>{b.customerName || tr("Sem nome", "No name")}</strong>
                  <span>{tourTitle(b.tourId)}</span>
                  <span>
                    📅 {lisbonDateTime(b.startTime, lang)} · 👥 {paxLabel(b, tr)} · 🌐 {b.language || "—"} · 🛒 {PLATFORM_LABELS[b.platform] || b.platform || "—"}
                    {b.bookingRef ? ` · ${b.bookingRef}` : ""}
                  </span>
                  <span className="pmy-booking-list__contacts">
                    {b.customerEmail ? <a href={`mailto:${b.customerEmail}`}>✉️ {b.customerEmail}</a> : <em>{tr("sem e-mail", "no email")}</em>}
                    {tel ? <a href={`tel:${tel}`}>📞 {b.customerPhone}</a> : <em>{tr("sem telefone", "no phone")}</em>}
                    {wa && <a href={wa} target="_blank" rel="noreferrer">💬 WhatsApp</a>}
                  </span>
                </div>
                {allowAttendance && (
                  <div className="pmy-booking-list__actions">
                    {attendance === "COMPLETED" && <span className="pmy-booking-list__badge is-done">✅ {tr("Realizado", "Completed")}</span>}
                    {attendance === "NO_SHOW" && <span className="pmy-booking-list__badge is-noshow">🚫 No-show</span>}
                    {attendance !== "COMPLETED" && (
                      <Button type="button" size="sm" disabled={busyId === b.id} onClick={() => mark(b, "COMPLETED")}>
                        {tr("Realizado", "Completed")}
                      </Button>
                    )}
                    {attendance !== "NO_SHOW" && (
                      <Button type="button" size="sm" variant="secondary" disabled={busyId === b.id} onClick={() => mark(b, "NO_SHOW")}>
                        No-show
                      </Button>
                    )}
                    {attendance && (
                      <Button type="button" size="sm" variant="secondary" disabled={busyId === b.id} onClick={() => mark(b, "")}>
                        {tr("Desfazer", "Undo")}
                      </Button>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </Modal>
  );
}
