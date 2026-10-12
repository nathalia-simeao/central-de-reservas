import { useState } from "react";

export default function SharedSeatsIndicator({tourId, capacity, hours = [], lang = "pt"}) {
  const en = lang === "en";
  const [date,setDate] = useState("");
  const [time,setTime] = useState("");
  const [result,setResult] = useState(null);
  const [loading,setLoading] = useState(false);
  const [error,setError] = useState("");
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
    <strong style={{fontSize:13}}>{en?"Shared physical capacity":"Capacidade física compartilhada"}: {capacity}</strong>
    <div style={{display:"flex",flexWrap:"wrap",alignItems:"end",gap:8}}>
      <label style={{display:"grid",gap:4,fontSize:12}}>{en?"Departure date":"Data da saída"}
        <input type="date" value={date} onChange={e=>{setDate(e.target.value);setResult(null);}} style={{height:38,borderRadius:9,border:"1px solid #d9dfdb",padding:"0 9px",background:"transparent",color:"inherit"}}/>
      </label>
      <label style={{display:"grid",gap:4,fontSize:12}}>{en?"Departure time":"Horário"}
        <select value={time} onChange={e=>{setTime(e.target.value);setResult(null);}} style={{height:38,borderRadius:9,border:"1px solid #d9dfdb",padding:"0 9px",background:"transparent",color:"inherit"}}>
          <option value="">{en?"Select":"Selecione"}</option>
          {normalizedHours.map(h=><option key={h} value={h}>{h}</option>)}
        </select>
      </label>
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
