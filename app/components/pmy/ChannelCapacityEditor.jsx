import { useState } from "react";

const CHANNELS = [
  ["shopify","Shopify"],["getyourguide","GetYourGuide"],
  ["viator","Viator"],["civitatis","Civitatis"],["headout","Headout"],
];
export default function ChannelCapacityEditor({ tourId, physicalCapacity, limits = {}, onSave, lang = "pt" }) {
  const [drafts,setDrafts] = useState({});
  const [saving,setSaving] = useState("");
  const en = lang === "en";
  return <details className="pmy-channel-editor">
    <summary className="pmy-channel-editor__summary">{en?"Limits by sales channel":"Limites por plataforma"}</summary>
    <p className="pmy-channel-editor__hint">{en
      ? `Shared physical capacity: ${physicalCapacity} seats per departure. Each channel cap restricts its own sales, never increases the shared total.`
      : `Capacidade física compartilhada: ${physicalCapacity} vagas por saída. O limite do canal restringe suas vendas, sem aumentar a capacidade total.`}</p>
    <div className="pmy-channel-editor__list">
      {CHANNELS.map(([key,name]) => {
        const saved = limits[key];
        const value = drafts[key] ?? (Number.isInteger(saved) ? String(saved) : "");
        return <div key={key} className="pmy-channel-editor__channel">
          <label htmlFor={`cap-${tourId}-${key}`}>{name}</label>
          <input id={`cap-${tourId}-${key}`} type="number" min="0" max="9999" step="1"
            placeholder={en?"No channel cap":"Sem limite por canal"}
            aria-label={`${name} capacity`} value={value}
            onChange={e=>setDrafts(prev=>({...prev,[key]:e.target.value}))}
            className="pmy-channel-editor__input"/>
          <button type="button" disabled={saving!=="" || value==="" || !/^[0-9]+$/.test(value) || Number(value)>9999 || Number(value)===saved}
            onClick={async()=>{setSaving(key);try{await onSave(tourId,key,Number(value));setDrafts(p=>({...p,[key]:undefined}));}finally{setSaving("");}}}
            className="pmy-channel-editor__save">
            {saving===key?"...":en?"Save":"Salvar"}
          </button>
          <span className="pmy-channel-editor__status">{Number.isInteger(saved)?(en?"Saved":"Salvo"):(en?"Shared capacity":"Capacidade compartilhada")}</span>
        </div>;
      })}
    </div>
  </details>;
}
