import { useState } from "react";
import { DatePicker, DropdownSelect } from "./PmyUI";

export default function SharedSeatsIndicator({tourId, capacity, hours = [], limits = {}, lang = "pt"}) {
  const en = lang === "en";
  const [date,setDate] = useState("");
  const [time,setTime] = useState("");
  const [result,setResult] = useState(null);
  const [loading,setLoading] = useState(false);
  const [error,setError] = useState("");
  const configuredCaps = Object.entries(limits || {}).filter(([,v]) => Number.isInteger(v) && v >= 0);
  const offeredTotal = configuredCaps.reduce((sum,[,v]) => sum + v,0);
  const hasUnset = ["shopify","getyourguide","viator","civitatis","headout"].some(key => !Number.isInteger(limits?.[key]));
  const normalizedHours = [...new Set((hours || []).map(value => String(value).match(/(?:^|[^0-9])([01]?\d|2[0-3]):([0-5]\d)/)?.slice(1,3).join(":")).filter(Boolean))].sort();
  const check = async () => {
    if(!date || !time) return;
    setLoading(true);setError("");setResult(null);
    try {
      const body=new FormData();
      for (const [k,v] of Object.entries({_action:"getSharedSeats",tourId,date,time})) body.append(k,v);
      const response=await fetch("/api/central-actions",{method:"POST",body,credentials:"same-origin",headers:{Accept:"application/json"}});
      const value=await response.json();
      if (!response.ok || !value.success) throw new Error(value.error || "Consulta indisponível");
      setResult(value);
    } catch(e) {setError(e.message || "Erro de consulta");}
    finally {setLoading(false);}
  };
  return <section className="pmy-shared-seats-indicator" style={{display:"grid",gap:9,maxWidth:"100%"}}>
    <div style={{display:"flex",gap:16,flexWrap:"wrap",alignItems:"center",fontSize:13}}>
      <strong>{en?"Physical capacity":"Capacidade física"}: {capacity}</strong>
      <strong>{en?"Configured channel caps (sum)":"Soma dos limites dos canais"}: {offeredTotal}{hasUnset ? "+" : ""}</strong>
    </div>
    <small style={{opacity:.75}}>{en?"Channel caps are commercial ceilings, not additive physical seats. Unset channels are excluded.":"A soma representa limites comerciais, não vagas físicas adicionais. Canais sem limite definido não entram na soma."}</small>
    <div style={{display:"flex",flexWrap:"wrap",alignItems:"end",gap:8}}>
      <div style={{display:"grid",gap:4,fontSize:12,minWidth:180}}>
        <span>{en?"Departure date":"Data da saída"}</span>
        <DatePicker value={date} onChange={v=>{setDate(v);setResult(null);}} locale={en?"en-GB":"pt-PT"} placeholder={en?"dd/mm/yyyy":"dd/mm/aaaa"}/>
      </div>
      <div style={{display:"grid",gap:4,fontSize:12,minWidth:156}}>
        <span>{en?"Departure time":"Horário"}</span>
        <DropdownSelect value={time} onChange={v=>{setTime(v);setResult(null);}}
          ariaLabel={en?"Departure time":"Horário da saída"}
          placeholder={en?"Select":"Selecione"}
          options={normalizedHours.map(h=>({value:h,label:h}))}/>
      </div>
      <button type="button" disabled={loading || !date || !time} onClick={check} style={{height:38,padding:"0 14px",border:"1px solid #0a7525",borderRadius:9,color:"#0a7525",background:"transparent",cursor:"pointer"}}>{loading?"...":en?"Check seats":"Consultar vagas"}</button>
    </div>
    {normalizedHours.length===0&&<small>{en?"No departure schedule registered; verify Shopify variants.":"Sem horários cadastrados: confira as variantes Shopify."}</small>}
    {error&&<span role="alert" style={{color:"#bd2020",fontSize:12}}>{error}</span>}
    {result&&<div aria-live="polite" style={{display:"flex",flexWrap:"wrap",gap:14,fontSize:13}}>
      <span>{en?"Capacity":"Capacidade"}: <b>{result.capacity}</b></span>
      <span>{en?"Reserved (all channels)":"Reservadas (todos os canais)"}: <b>{result.occupiedSeats}</b></span>
      <span>{en?"Available seats":"Vagas disponíveis"}: <b>{result.remainingSeats}</b></span>
    </div>}
    <small style={{opacity:.7}}>{en?"Availability is per departure, using bookings from all channels.":"Vagas calculadas por data e horário, considerando reservas de todos os canais."}</small>
  </section>;
}
