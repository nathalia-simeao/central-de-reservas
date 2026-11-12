// Foto da pessoa (Equipe → editar): passar o mouse mostra um lápis discreto;
// clicar abre "Enviar do computador" ou "Escolher da biblioteca".
// Pedido da Nathalia, 12/11/2026: nada do botão "Enviar nova foto".

import { useEffect, useRef, useState } from "react";
import { Icon } from "./PmyUI";

export default function PersonPhotoEditor({ src, name, editable = true, uploading = false, onUpload, onPickLibrary, lang = "pt" }) {
  const tr = (pt, en) => (lang === "en" ? en : pt);
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const close = (event) => { if (!wrapRef.current?.contains(event.target)) setOpen(false); };
    const onKey = (event) => { if (event.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", close); document.removeEventListener("keydown", onKey); };
  }, [open]);

  const initials = String(name || "?").split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]).join("").toUpperCase();
  const photo = src
    ? <img src={src} alt={name || ""} className="pmy-person-photo__img" />
    : <span className="pmy-person-photo__img pmy-person-photo__initials" aria-hidden="true">{initials}</span>;

  if (!editable) return <div className="pmy-person-photo">{photo}</div>;

  return (
    <div className={`pmy-person-photo is-editable${open ? " is-open" : ""}`} ref={wrapRef}>
      <button type="button" className="pmy-person-photo__trigger" onClick={() => setOpen((v) => !v)} disabled={uploading}
        aria-haspopup="menu" aria-expanded={open} aria-label={tr("Trocar foto", "Change photo")} title={tr("Trocar foto", "Change photo")}>
        {photo}
        <span className="pmy-person-photo__hover" aria-hidden="true">
          {uploading ? <span className="pmy-person-photo__spinner" /> : <Icon name="edit" size={18} />}
        </span>
      </button>
      {open && (
        <div className="pmy-person-photo__menu" role="menu">
          <button type="button" role="menuitem" onClick={() => { setOpen(false); onUpload?.(); }}>
            <Icon name="upload" size={15} /> {tr("Enviar do computador", "Upload from computer")}
          </button>
          {onPickLibrary && (
            <button type="button" role="menuitem" onClick={() => { setOpen(false); onPickLibrary(); }}>
              <Icon name="media" size={15} /> {tr("Escolher da biblioteca", "Choose from library")}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
