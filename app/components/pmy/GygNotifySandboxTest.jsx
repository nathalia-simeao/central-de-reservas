import { useState } from "react";
import { Button } from "./PmyUI";

export default function GygNotifySandboxTest({ lang = "pt" }) {
  const [productId, setProductId] = useState("");
  const [dateTime, setDateTime] = useState("");
  const [vacancies, setVacancies] = useState("0");
  const [adultPrice, setAdultPrice] = useState("");
  const [working, setWorking] = useState(false);
  const [result, setResult] = useState(null);
  const [deal, setDeal] = useState({dealType:"last_minute", discountPercentage:"10", start:"", end:"", maxVacancies:"", noticePeriodDays:"3", dealId:""});
  const [dealWorking, setDealWorking] = useState("");
  const [dealResult, setDealResult] = useState(null);
  const setDealField = (key) => (e) => setDeal(prev => ({...prev, [key]: e.target.value}));
  const tr = (pt,en) => lang === "en" ? en : pt;
  const valid = /^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(productId.trim())
    && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[+-]\d{2}:\d{2}$/.test(dateTime.trim())
    && /^(0|[1-9][0-9]{0,4})$/.test(vacancies.trim())
    && (!adultPrice.trim() || /^\d{1,6}([.,]\d{1,2})?$/.test(adultPrice.trim()));
  const productValid = /^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(productId.trim());
  const dateKey = /^\d{4}-\d{2}-\d{2}$/;
  const dealCreateValid = productValid && dateKey.test(deal.start) && dateKey.test(deal.end)
    && deal.end >= deal.start && Number(String(deal.discountPercentage).replace(",", ".")) > 0
    && Number(String(deal.discountPercentage).replace(",", ".")) < 100;
  const postSyncQueue = async (fields) => {
      const body = new FormData();
      for (const [key,value] of Object.entries(fields)) body.append(key,value);
      const headers = {
        Accept: "application/json",
        "X-Requested-With": "XMLHttpRequest",
      };
      // Shopify embedded admin resource actions require a fresh App Bridge session token.
      try {
        const idToken = await window.shopify?.idToken?.();
        if (idToken) headers.Authorization = `Bearer ${idToken}`;
      } catch {
        // App Bridge may handle token injection itself.
      }
      const target = new URL("/api/sync-queue", window.location.origin);
      const current = new URL(window.location.href);
      for (const key of ["shop", "host", "embedded"]) {
        const value = current.searchParams.get(key);
        if (value) target.searchParams.set(key, value);
      }
      const response = await fetch(`${target.pathname}${target.search}`, {
        method:"POST", body, credentials:"include", headers,
      });
      const text = await response.text();
      let payload;
      try { payload = JSON.parse(text); } catch {
        return ({success:false, httpStatus:response.status,
          error:tr("Resposta não JSON. Confira autenticação/roteamento da Central.", "Non-JSON response. Check Central authentication/routing."),
          responseType:response.headers.get("content-type") || "unknown",
          redirected:response.redirected,
          destination:response.url ? new URL(response.url).pathname : "unknown",
        });
      }
      return ({httpStatus:response.status, ...payload,
        error:response.status === 401
          ? tr("Sessão Shopify não autorizada. Reabra a Central pelo admin e tente novamente.", "Shopify session not authorized. Reopen Central from the admin and retry.")
          : payload.error,
      });
  };
  const run = async () => {
    if (!valid || working) return;
    setWorking(true);
    setResult(null);
    try {
      setResult(await postSyncQueue({
        _action: "testGygNotifySandbox", productId:productId.trim(),
        dateTime:dateTime.trim(), vacancies:vacancies.trim(),
        ...(adultPrice.trim() ? {adultPrice:adultPrice.trim(), currency:"EUR"} : {}),
      }));
    } catch(e) {
      setResult({success:false, error:e.message || String(e)});
    } finally { setWorking(false); }
  };
  const runDeal = async (operation) => {
    if (dealWorking) return;
    setDealWorking(operation);
    setDealResult(null);
    try {
      const out = await postSyncQueue({
        _action:"testGygDealsSandbox", operation, productId:productId.trim(),
        dealId:deal.dealId.trim(), dealType:deal.dealType,
        discountPercentage:String(deal.discountPercentage).trim(),
        start:deal.start.trim(), end:deal.end.trim(),
        maxVacancies:String(deal.maxVacancies).trim(),
        noticePeriodDays:String(deal.noticePeriodDays).trim(),
        dealName:"PMY sandbox deal",
      });
      const deals = out?.result?.payload?.deals;
      if (Array.isArray(deals) && deals[0]?.dealId != null && operation !== "delete") {
        setDeal(prev => ({...prev, dealId:String(deals[0].dealId)}));
      }
      setDealResult(out);
    } catch(e) {
      setDealResult({success:false, error:e.message || String(e)});
    } finally { setDealWorking(""); }
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
      <label>{tr("Preço adulto em € (opcional — teste \"with price\")","Adult price in € (optional — \"with price\" test)")}
        <input value={adultPrice} onChange={e=>setAdultPrice(e.target.value)} placeholder="45.00" inputMode="decimal" autoComplete="off" />
      </label>
    </div>
    <Button variant="secondary" size="sm" disabled={!valid || working} onClick={run}>
      {working ? tr("Enviando…","Sending…") : tr("Testar Notify Availability (sandbox)","Test Notify Availability (sandbox)")}
    </Button>
    {result && <div role="status" className="pmy-gyg-sandbox-test__result">
      <strong>{result.success && result.result?.status === 202 ? tr("Aceito pelo sandbox (HTTP 202)","Accepted by sandbox (HTTP 202)") : tr("Teste não aprovado / não executado","Test not approved / not executed")}</strong>
      <p>HTTP: {result.result?.status ?? result.httpStatus ?? tr("não informado","not available")}</p>
      {result.responseType && <p>Content-Type: {result.responseType}</p>}
      {result.destination && <p>Path: {result.destination} · Redirect: {String(result.redirected)}</p>}
      <p>{result.result?.reason || result.error || result.result?.payload?.data?.message || ""}</p>
    </div>}

    <div className="pmy-gyg-sandbox-test__title" style={{marginTop:20}}>{tr("Teste Deals Over API · Sandbox","Deals Over API test · Sandbox")}</div>
    <p>{tr("Usa o mesmo UUID do produto acima. Ordem do GYG: 1) Criar deal, 2) Listar deals, 3) Apagar o deal listado. Nada é criado de verdade.", "Uses the product UUID above. GYG order: 1) Create deal, 2) Get deals, 3) Delete the listed deal. Nothing real is created.")}</p>
    <div className="pmy-gyg-sandbox-test__fields">
      <label>{tr("Tipo","Type")}
        <select value={deal.dealType} onChange={setDealField("dealType")}>
          <option value="last_minute">last_minute</option>
          <option value="early_bird">early_bird</option>
          <option value="standard">standard</option>
        </select>
      </label>
      <label>{tr("Desconto %","Discount %")}
        <input value={deal.discountPercentage} onChange={setDealField("discountPercentage")} inputMode="decimal" />
      </label>
      <label>{tr("Início (AAAA-MM-DD)","Start (YYYY-MM-DD)")}
        <input value={deal.start} onChange={setDealField("start")} placeholder="2026-11-20" />
      </label>
      <label>{tr("Fim (AAAA-MM-DD)","End (YYYY-MM-DD)")}
        <input value={deal.end} onChange={setDealField("end")} placeholder="2026-11-30" />
      </label>
      <label>{tr("Máx. vagas (opcional)","Max vacancies (optional)")}
        <input value={deal.maxVacancies} onChange={setDealField("maxVacancies")} inputMode="numeric" />
      </label>
      <label>{tr("Aviso em dias","Notice period days")}
        <input value={deal.noticePeriodDays} onChange={setDealField("noticePeriodDays")} inputMode="numeric" />
      </label>
      <label>{tr("Deal ID (para apagar)","Deal ID (to delete)")}
        <input value={deal.dealId} onChange={setDealField("dealId")} placeholder={tr("preenchido ao criar/listar","filled after create/list")} />
      </label>
    </div>
    <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
      <Button variant="secondary" size="sm" disabled={!dealCreateValid || Boolean(dealWorking)} onClick={()=>runDeal("create")}>
        {dealWorking === "create" ? tr("Enviando…","Sending…") : tr("1. Criar deal","1. Create deal")}
      </Button>
      <Button variant="secondary" size="sm" disabled={!productValid || Boolean(dealWorking)} onClick={()=>runDeal("list")}>
        {dealWorking === "list" ? tr("Enviando…","Sending…") : tr("2. Listar deals","2. Get deals")}
      </Button>
      <Button variant="secondary" size="sm" disabled={!/^\d{1,19}$/.test(deal.dealId.trim()) || Boolean(dealWorking)} onClick={()=>runDeal("delete")}>
        {dealWorking === "delete" ? tr("Enviando…","Sending…") : tr("3. Apagar deal","3. Delete deal")}
      </Button>
    </div>
    {dealResult && <div role="status" className="pmy-gyg-sandbox-test__result">
      <strong>{dealResult.success ? tr("Aceito pelo sandbox","Accepted by sandbox") : tr("Teste não aprovado / não executado","Test not approved / not executed")}</strong>
      <p>{tr("Operação","Operation")}: {dealResult.result?.operation || "-"} · HTTP: {dealResult.result?.status ?? dealResult.httpStatus ?? "-"}</p>
      <p>{dealResult.result?.reason || dealResult.error || (dealResult.result?.payload ? JSON.stringify(dealResult.result.payload) : "")}</p>
    </div>}
  </section>;
}
