// Texto com telefone clicável (checklists do Quadro da Central e do app):
// o número vira um botão que abre WhatsApp, Ligar, SMS e Copiar (pedido do Renan, 13/11/2026).
// Fica dentro de <label> do checklist: o clique no número não marca o item.

import { useEffect, useRef, useState } from "react";
import { phoneLinks, splitPhones } from "../../utils/phone-actions.js";

function pretty(phone) {
  return /^\+351\d{9}$/.test(phone) ? `+351 ${phone.slice(4, 7)} ${phone.slice(7, 10)} ${phone.slice(10)}` : phone;
}

export function PhoneMenu({ phone, lang }) {
  const tr = (pt, en) => (lang === "en" ? en : pt);
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const ref = useRef(null);
  const links = phoneLinks(phone);
  useEffect(() => {
    if (!open) return undefined;
    const close = (e) => { if (!ref.current?.contains(e.target)) setOpen(false); };
    const esc = (e) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", close); document.removeEventListener("keydown", esc); };
  }, [open]);
  if (!links) return null;
  const stop = (e) => { e.preventDefault(); e.stopPropagation(); };
  const copy = async (e) => {
    stop(e);
    try { await navigator.clipboard.writeText(links.phone); setCopied(true); setTimeout(() => { setCopied(false); setOpen(false); }, 800); } catch { /* sem permissão */ }
  };
  const go = (url, newTab) => (e) => { stop(e); setOpen(false); if (newTab) window.open(url, "_blank", "noopener"); else window.location.href = url; };
  return (
    <span className="pmy-phone" ref={ref}>
      <button type="button" className="pmy-phone__chip" aria-haspopup="menu" aria-expanded={open} onClick={(e) => { stop(e); setOpen(!open); }}>
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 4h3.5l1.5 4-2 1.5a10 10 0 0 0 6.5 6.5L16 14l4 1.5V19a1.5 1.5 0 0 1-1.6 1.5C10.6 20 4 13.4 3.5 5.6A1.5 1.5 0 0 1 5 4Z" /></svg>
        {pretty(links.phone)}
      </button>
      {open && (
        <span className="pmy-phone__menu" role="menu">
          <button type="button" role="menuitem" onClick={go(links.whatsapp, true)}>WhatsApp</button>
          <button type="button" role="menuitem" onClick={go(links.call, false)}>{tr("Ligar", "Call")}</button>
          <button type="button" role="menuitem" onClick={go(links.sms, false)}>{tr("Enviar SMS", "Send SMS")}</button>
          <button type="button" role="menuitem" onClick={copy}>{copied ? tr("Copiado!", "Copied!") : tr("Copiar número", "Copy number")}</button>
        </span>
      )}
    </span>
  );
}

export default function PhoneText({ text, lang = "pt" }) {
  const parts = splitPhones(text);
  if (!parts.some((p) => p.phone)) return text;
  return parts.map((p, i) => (p.phone ? <PhoneMenu key={i} phone={p.phone} lang={lang} /> : <span key={i}>{p.text}</span>));
}
