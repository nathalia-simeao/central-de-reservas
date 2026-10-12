import { useState } from "react";

const CHANNELS = [
  ["shopify","Shopify"],["getyourguide","GetYourGuide"],
  ["viator","Viator"],["civitatis","Civitatis"],["headout","Headout"],
];
export default function ChannelCapacityEditor({ tourId, physicalCapacity, limits = {}, onSave, lang = "pt" }) {
  const [drafts,setDrafts] = useState({});
  const [saving,setSaving] = useState("");
  const en = lang === "en";
  return <details style={{width:"100%",marginTop:8,borderTop:"1px solid var(--border-color,#ddd)",paddingTop:8}}>
    <summary style={{cursor:"pointer",fontWeight:600,fontSize:13}}>{en?"Limits by sales channel":"Limites por plataforma"}</summary>
    <p style={{fontSize:12,opacity:.8,margin:"8px 0"}}>{en
      ? `Shared physical capacity: ${physicalCapacity} seats per departure. Each channel cap restricts its own sales, never increases the shared total.`
      : `Capacidade física compartilhada: ${physicalCapacity} vagas por saída. O limite do canal restringe suas vendas, sem aumentar a capacidade total.`}</p>
    <div style={{display:"grid",gap:8}}>
      {CHANNELS.map(([key,name]) => {
        const saved = limits[key];
        const value = drafts[key] ?? (Number.isInteger(saved) ? String(saved) : "");
        return <div key={key} style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
          <label htmlFor={`cap-${tourId}-${key}`} style={{minWidth:112,fontSize:13}}>{name}</label>
          <input id={`cap-${tourId}-${key}`} type="number" min="0" max="9999" step="1"
            placeholder={en?"No channel cap":"Sem limite por canal"}
            aria-label={`${name} capacity`} value={value}
            onChange={e=>setDrafts(prev=>({...prev,[key]:e.target.value}))}
            style={{width:150,padding:"8px",border:"1px solid var(--border-color,#ddd)",borderRadius:8}}/>
          <button type="button" disabled={saving!=="" || value==="" || !/^\\d+$/.test(value) || Number(value)>9999 || Number(value)===saved}
            onClick={async()=>{setSaving(key);try{await onSave(tourId,key,Number(value));setDrafts(p=>({...p,[key]:undefined}));}finally{setSaving("");}}}
            style={{padding:"7px 12px",borderRadius:8,border:"1px solid var(--border-color,#ccc)",cursor:"pointer"}}>
            {saving===key?"...":en?"Save":"Salvar"}
          </button>
          <span style={{fontSize:11,opacity:.7}}>{Number.isInteger(saved)?(en?"Saved":"Salvo"):(en?"Shared capacity":"Capacidade compartilhada")}</span>
        </div>;
      })}
    </div>
  </details>;
}
