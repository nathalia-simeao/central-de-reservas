// Ações de contato do app (pedido do Renan, 13/11/2026): tocar no número de um
// cliente abre WhatsApp, Ligar, SMS e Copiar, como nos sites. Na linha de um
// cliente, a mesma janela também marca Presente / No-show.

import { useEffect, useState } from "react";
import { GIcon, useT } from "./GuideShell";
import { phoneLinks } from "../../utils/phone-actions.js";

function prettyPhone(phone) {
  const d = String(phone || "");
  if (/^\+351\d{9}$/.test(d)) return `+351 ${d.slice(4, 7)} ${d.slice(7, 10)} ${d.slice(10)}`;
  return d;
}

async function copyText(value) {
  try {
    await navigator.clipboard.writeText(value);
    return true;
  } catch {
    try {
      const area = document.createElement("textarea");
      area.value = value;
      area.setAttribute("readonly", "");
      area.style.position = "fixed";
      area.style.opacity = "0";
      document.body.appendChild(area);
      area.select();
      const ok = document.execCommand("copy");
      area.remove();
      return ok;
    } catch {
      return false;
    }
  }
}

/** Janela de baixo com as ações. `extra` = botões a mais (ex.: presença). */
export function PhoneSheet({ phone, title, onClose, extra = null }) {
  const t = useT();
  const [copied, setCopied] = useState(false);
  const links = phoneLinks(phone);

  useEffect(() => {
    const onKey = (event) => { if (event.key === "Escape") onClose?.(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="g-sheet-backdrop" role="presentation" onClick={(event) => { if (event.target === event.currentTarget) onClose?.(); }}>
      <div className="g-sheet" role="dialog" aria-modal="true" aria-label={title || t("Contato")}>
        <div className="g-sheet__head">
          <span>
            {title && <strong>{title}</strong>}
            {links && <small>{prettyPhone(links.phone)}</small>}
          </span>
          <button type="button" className="g-icon-btn" onClick={onClose} aria-label={t("Fechar")}><GIcon name="x" /></button>
        </div>
        {links && (
          <>
            <a className="g-sheet__item" href={links.whatsapp} target="_blank" rel="noreferrer" onClick={onClose}><GIcon name="chat" /> WhatsApp</a>
            <a className="g-sheet__item" href={links.call} onClick={onClose}><GIcon name="phone" /> {t("Ligar")}</a>
            <a className="g-sheet__item" href={links.sms} onClick={onClose}><GIcon name="sms" /> {t("Enviar SMS")}</a>
            <button type="button" className="g-sheet__item" onClick={async () => { if (await copyText(links.phone)) { setCopied(true); setTimeout(onClose, 700); } }}>
              <GIcon name="copy" /> {copied ? t("Copiado!") : t("Copiar número")}
            </button>
          </>
        )}
        {extra && <><div className="g-sheet__sep" />{extra}</>}
      </div>
    </div>
  );
}

/** Número tocável (abre a janela). */
export function PhoneChip({ phone, title, extra }) {
  const [open, setOpen] = useState(false);
  const links = phoneLinks(phone);
  if (!links) return null;
  return (
    <>
      <button type="button" className="g-phone-chip" onClick={() => setOpen(true)} aria-haspopup="dialog">
        <GIcon name="phone" /> {prettyPhone(links.phone)}
      </button>
      {open && <PhoneSheet phone={links.phone} title={title} onClose={() => setOpen(false)} extra={typeof extra === "function" ? extra(() => setOpen(false)) : extra} />}
    </>
  );
}
