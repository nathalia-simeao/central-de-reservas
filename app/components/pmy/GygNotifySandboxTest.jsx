import { useState } from "react";
import { Button } from "./PmyUI";

export default function GygNotifySandboxTest({ lang = "pt" }) {
  const [productId, setProductId] = useState("");
  const [dateTime, setDateTime] = useState("");
  const [vacancies, setVacancies] = useState("0");
  const [working, setWorking] = useState(false);
  const [result, setResult] = useState(null);
  const tr = (pt,en) => lang === "en" ? en : pt;
  const valid = /^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(productId.trim())
    && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[+-]\d{2}:\d{2}$/.test(dateTime.trim())
    && /^(0|[1-9][0-9]{0,4})$/.test(vacancies.trim());
  const run = async () => {
    if (!valid || working) return;
    setWorking(true);
    setResult(null);
    try {
      const body = new FormData();
      for (const [key,value] of Object.entries({
        _action: "testGygNotifySandbox", productId:productId.trim(),
        dateTime:dateTime.trim(), vacancies:vacancies.trim(),
      })) body.append(key,value);
      const response = await fetch("/api/sync-queue", {
        method:"POST", body, credentials:"same-origin",
        headers:{Accept:"application/json"},
      });
      const text = await response.text();
      let payload;
      try { payload = JSON.parse(text); } catch {
        throw new Error(tr("Servidor retornou HTML ou resposta não JSON. Verifique a sessão Shopify.", "Server returned HTML or non-JSON response. Check Shopify session."));
      }
      setResult({httpStatus:response.status, ...payload});
    } catch(e) {
      setResult({success:false, error:e.message || String(e)});
    } finally { setWorking(false); }
  };
  return <section className="pmy-gyg-sandbox-test" aria-label={tr("Homologação de disponibilidade GYG","GYG availability certification")}>
    <div className="pmy-gyg-sandbox-test__title">{tr("Teste Notify Availability · Sandbox","Notify Availability test · Sandbox")}</div>
    <p>{tr("Envio manual exclusivo ao sandbox. Não altera reservas ou vagas na Central. Use o UUID externo e uma saída de teste.", "Manual sandbox-only send. Does not change Central bookings or seats. Use external UUID and a test departure.")}</p>
    <div className="pmy-gyg-sandbox-test__fields">
      <label>{tr("UUID externo do produto","External product UUID")}
        <input value={productId} onChange={e=>setProductId(e.target.value)} placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" autoComplete="off" />
      </label>
      <label>{tr("Data e horário ISO com fuso","ISO datetime with offset")}
        <input value={dateTime} onChange={e=>setDateTime(e.target.value)} placeholder="2026-10-22T09:30:00+01:00" autoComplete="off" />
      </label>
      <label>{tr("Vagas de teste","Test vacancies")}
        <input type="number" min="0" max="99999" step="1" value={vacancies} onChange={e=>setVacancies(e.target.value)} />
      </label>
    </div>
    <Button variant="secondary" size="sm" disabled={!valid || working} onClick={run}>
      {working ? tr("Enviando…","Sending…") : tr("Testar Notify Availability (sandbox)","Test Notify Availability (sandbox)")}
    </Button>
    {result && <div role="status" className="pmy-gyg-sandbox-test__result">
      <strong>{result.success && result.result?.status === 202 ? tr("Aceito pelo sandbox (HTTP 202)","Accepted by sandbox (HTTP 202)") : tr("Teste não aprovado / não executado","Test not approved / not executed")}</strong>
      <p>HTTP: {result.result?.status ?? result.httpStatus ?? tr("não informado","not available")}</p>
      <p>{result.result?.reason || result.error || result.result?.payload?.data?.message || ""}</p>
    </div>}
  </section>;
}
