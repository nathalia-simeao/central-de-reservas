import { useEffect, useState } from "react";
import { Form, Link, useActionData, useLoaderData, useNavigation, useSearchParams } from "react-router";
import { DatePicker, DropdownSelect, TimeSelect } from "../components/pmy/PmyUI";
import db from "../db.server";
import { unauthenticated } from "../shopify.server";
import { GIcon, GuideShell, useGuideLang, useGuideLocale, useT } from "../components/guide/GuideShell";
import { displayLanguageName, translateTicketTitle } from "../utils/ticket-labels.js";
import { createDemandCheckout, createDraftCheckout } from "../services/draft-checkout.server";
import { getCentralAvailability } from "../utils/capacity.server";
import { blockMatchesCalendarSlot, getActiveAvailabilityBlocks } from "../utils/availability.server";
import { lisbonLocalDateTimeToUtc } from "../utils/shopify-orders.server";
import { ticketsFor, tourSellOptions } from "../utils/sell-options.js";
import { resolvePrimaryShop } from "../utils/single-tenant.server";
import { getGuideFromRequest, redirectTo, whatsappLink } from "../utils/guide-portal.server";

// Item 13: o guia gera o link de pagamento do Shopify (com vaga segurada)
// e manda para o cliente. A venda fica marcada com o guia (origem "Guia").

const GUIDE_HOLD_MINUTES = 60;


async function shopAdmin() {
  const { shop } = await resolvePrimaryShop(db, { allowInitialize: false });
  if (!shop) throw new Error("Loja Shopify não configurada.");
  // unauthenticated.admin devolve { admin, session }: o cliente GraphQL é o .admin.
  const { admin } = await unauthenticated.admin(shop);
  return { shop, admin };
}

export const loader = async ({ request }) => {
  const guide = await getGuideFromRequest(db, request);
  if (!guide) return redirectTo("/guia/login");

  // Passeios e ingressos vêm da cópia local do Shopify (sincronizada pela Central):
  // não depende de chamar a Shopify na hora, que falhava no app (12/11).
  // Só passeios ATIVOS no site (nada de rascunho, arquivado ou não listado).
  const tours = (
    await db.tour.findMany({
      where: { shopifyProductId: { not: null }, shopifyStatus: "ACTIVE" },
      select: { id: true, title: true, shopifyProductId: true },
      orderBy: { title: "asc" },
    })
  ).filter((tour) => /^gid:\/\/shopify\/Product\/\d+$/.test(String(tour.shopifyProductId)));
  const listError = tours.length ? null : "Nenhum passeio ativo encontrado. Peça para a gestão sincronizar os produtos do Shopify na Central.";

  const url = new URL(request.url);
  const tourId = url.searchParams.get("tour");
  const day = /^\d{4}-\d{2}-\d{2}$/.test(url.searchParams.get("dia") || "") ? url.searchParams.get("dia") : "";
  const listed = tours.find((item) => item.id === tourId) || null;
  let error = null;
  let sell = null;
  if (listed) {
    const tour = await db.tour.findUnique({ where: { id: listed.id }, select: { id: true, title: true, shopifySnapshot: true, scheduleSlots: true } });
    const rows = await db.tourVariant.findMany({
      where: { tourId: listed.id, active: true, shopifyVariantId: { not: null } },
      select: { shopifyVariantId: true, title: true, price: true, startTimeSlot: true },
      orderBy: { title: "asc" },
    });
    const variants = rows
      .filter((v) => /^gid:\/\/shopify\/ProductVariant\/\d+$/.test(String(v.shopifyVariantId)))
      .map((v) => ({ id: v.shopifyVariantId, title: v.title || "Ingresso", price: v.price == null ? null : String(v.price), startTimeSlot: v.startTimeSlot }));
    if (!variants.length) error = "Este passeio ainda não tem ingressos sincronizados. Avise a gestão.";
    // Horários, idiomas e ingressos como estão nas variantes da Shopify.
    sell = tourSellOptions({ snapshot: tour?.shopifySnapshot || {}, variants, scheduleSlots: tour?.scheduleSlots || [] });
    // Dias bloqueados pela gestão (Agenda da Central ou bloqueio do site): o guia não vende.
    // Bloqueado = todos os horários do passeio bloqueados naquele dia.
    const blocks = await getActiveAvailabilityBlocks(db, listed.id);
    const times = sell.freeTime ? ["ALL"] : [...new Set(sell.sessions.map((x) => x.time))];
    const blockedDays = [];
    const todayKey = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Lisbon" }).format(new Date());
    for (let i = 0; i < 366; i += 1) {
      const d = new Date(`${todayKey}T12:00:00Z`);
      d.setUTCDate(d.getUTCDate() + i);
      const dateKey = d.toISOString().slice(0, 10);
      const dayOfWeek = d.getUTCDay();
      const blocked = times.every((timeKey) => blocks.some((b) => blockMatchesCalendarSlot(b, { tourId: listed.id, dateKey, timeKey, dayOfWeek, platform: "SHOPIFY" })));
      if (blocked) blockedDays.push(dateKey);
    }
    sell.blockedDays = blockedDays;
    // Vagas de cada horário na data escolhida (bloqueios e capacidade da Central).
    if (day) {
      const seats = {};
      for (const time of [...new Set(sell.sessions.map((s) => s.time))]) {
        try {
          const a = await getCentralAvailability(db, { tourId: listed.id, startTime: lisbonLocalDateTimeToUtc(day, time), platform: "SHOPIFY" });
          seats[time] = { remaining: a.remainingSeats ?? null, blocked: Boolean(a.blocked) };
        } catch {
          seats[time] = null;
        }
      }
      sell.sessions = sell.sessions.map((s) => ({ ...s, seats: seats[s.time] || null }));
    }
  }

  return {
    guide: { name: guide.name },
    tours: tours.map(({ id, title }) => ({ id, title })),
    tour: listed ? { id: listed.id, title: listed.title } : null,
    sell,
    day,
    error: error || listError,
    today: new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Lisbon" }).format(new Date()),
  };
};

export const action = async ({ request }) => {
  const guide = await getGuideFromRequest(db, request);
  if (!guide) return redirectTo("/guia/login");
  const form = await request.formData();

  // Link de demanda: serviço fora do catálogo (ex.: transfer), preço digitado.
  if (form.get("intent") === "demand") {
    try {
      const { admin } = await shopAdmin();
      const result = await createDemandCheckout({
        admin,
        seller: { id: guide.id, name: guide.name, utmId: guide.utmId || null },
        demand: Object.fromEntries(["title", "details", "price", "quantity", "date", "time", "customerName", "customerEmail", "customerPhone"].map((k) => [k, String(form.get(k) || "")])),
      });
      if (!result.success) return { error: result.error };
      const link = result.draftOrder.checkoutUrl;
      const phone = String(form.get("customerPhone") || "");
      const first = String(form.get("customerName") || "").split(" ")[0];
      const message = `Olá${first ? ` ${first}` : ""}! Aqui está o link para pagamento de ${String(form.get("title") || "").trim()}: ${link}`;
      return {
        ok: true,
        demand: true,
        invoiceUrl: link,
        message,
        whatsapp: whatsappLink(phone) ? `${whatsappLink(phone)}?text=${encodeURIComponent(message)}` : `https://wa.me/?text=${encodeURIComponent(message)}`,
      };
    } catch (e) {
      console.error("[PMY guide demand] checkout failed:", e);
      return { error: "Não foi possível gerar o link agora. Tente de novo em instantes." };
    }
  }

  const tour = await db.tour.findUnique({
    where: { id: String(form.get("tourId") || "") },
    select: { id: true, title: true, shopifyProductId: true },
  });
  if (!tour?.shopifyProductId) return { error: "Escolha o passeio." };

  const lineItems = [];
  for (const [key, value] of form.entries()) {
    if (!key.startsWith("qty:")) continue;
    const quantity = Number.parseInt(String(value), 10);
    if (Number.isInteger(quantity) && quantity > 0) lineItems.push({ variantId: key.slice(4), quantity });
  }
  if (!lineItems.length) return { error: "Escolha pelo menos um ingresso." };

  const checkoutForm = new FormData();
  checkoutForm.set("productId", tour.shopifyProductId);
  checkoutForm.set("tourTitle", tour.title);
  checkoutForm.set("customerName", String(form.get("customerName") || ""));
  checkoutForm.set("customerEmail", String(form.get("customerEmail") || ""));
  checkoutForm.set("customerPhone", String(form.get("customerPhone") || ""));
  checkoutForm.set("date", String(form.get("date") || ""));
  checkoutForm.set("time", String(form.get("time") || ""));
  checkoutForm.set("language", String(form.get("language") || ""));
  checkoutForm.set("lineItems", JSON.stringify(lineItems));
  checkoutForm.set("attribution", JSON.stringify({
    commercial_source: "guia",
    utm_source: "guide",
    utm_medium: "guide_portal",
    ...(guide.utmId ? { utm_id: guide.utmId } : {}),
  }));

  try {
    const { shop, admin } = await shopAdmin();
    const result = await createDraftCheckout({
      admin,
      session: { shop },
      formData: checkoutForm,
      requestUrl: request.url,
      seller: { id: guide.id, name: guide.name, utmId: guide.utmId || null },
      holdMinutes: GUIDE_HOLD_MINUTES,
    });
    const body = result?.data ?? result;
    const link = body?.draftOrder?.checkoutUrl;
    if (!body?.success || !link) return { error: body?.error || "Não foi possível gerar o link." };
    const phone = String(form.get("customerPhone") || "");
    const message = `Olá${form.get("customerName") ? ` ${String(form.get("customerName")).split(" ")[0]}` : ""}! Aqui está o link para confirmar a sua reserva de ${tour.title} (${form.get("date")} às ${form.get("time")}): ${link}`;
    return {
      ok: true,
      invoiceUrl: link,
      message,
      whatsapp: whatsappLink(phone)
        ? `${whatsappLink(phone)}?text=${encodeURIComponent(message)}`
        : `https://wa.me/?text=${encodeURIComponent(message)}`,
      holdMinutes: GUIDE_HOLD_MINUTES,
    };
  } catch (e) {
    console.error("[PMY guide sell] checkout failed:", e);
    return { error: "Não foi possível gerar o link agora. Tente de novo em instantes." };
  }
};

function sessionLabel(session, t) {
  const seats = session.seats;
  if (seats?.blocked) return `${session.label} · ${t("bloqueado")}`;
  if (seats && seats.remaining === 0) return `${session.label} · ${t("esgotado")}`;
  return session.label;
}

function SuccessCard({ result, t }) {
  const [copied, setCopied] = useState(false);
  return (
    <GuideShell title={t("Link gerado")}>
      <div className="g-top"><Link to="/guia" className="g-link">← {t("Minhas saídas")}</Link></div>
      <div className="g-card">
        <h2>{t("Link de pagamento pronto")}</h2>
        {result.demand
          ? <div className="g-ok">{t("O pagamento cai na Shopify como venda da Central em seu nome, e a demanda aparece no Quadro.")}</div>
          : <div className="g-ok">{t("A vaga fica segura por {n} minutos. Peça para o cliente pagar dentro desse prazo; depois disso o link vence e a vaga volta para venda.", { n: result.holdMinutes })}</div>}
        <label className="g-field">
          {t("Link")}
          <input readOnly value={result.invoiceUrl} onFocus={(e) => e.target.select()} />
        </label>
        <div className="g-row">
          <a className="g-btn primary" href={result.whatsapp} target="_blank" rel="noreferrer"><GIcon name="chat" /> {t("Enviar por WhatsApp")}</a>
          <button type="button" className="g-btn" onClick={() => { navigator.clipboard?.writeText(result.message).then(() => setCopied(true)).catch(() => setCopied(false)); }}>
            {copied ? `${t("Copiado")} ✓` : t("Copiar mensagem")}
          </button>
          <a className="g-btn" href={result.invoiceUrl} target="_blank" rel="noreferrer">{t("Abrir checkout")}</a>
        </div>
      </div>
      <a href="/guia/vender" className="g-btn" style={{ width: "100%" }}>{t("Gerar outro link")}</a>
    </GuideShell>
  );
}

function CustomerFields({ t }) {
  return (
    <>
      <div className="g-field" style={{ marginTop: 16, marginBottom: 4 }}>{t("Cliente (opcional, ajuda a equipe)")}</div>
      <label className="g-field">{t("Nome")}<input name="customerName" autoComplete="off" /></label>
      <label className="g-field">WhatsApp<input name="customerPhone" type="tel" inputMode="tel" placeholder="+351 912 345 678" /></label>
      <label className="g-field">{t("E-mail")}<input name="customerEmail" type="email" inputMode="email" /></label>
    </>
  );
}

// Demanda fora do catálogo (ex.: transfer): o que é, preço, data e cliente.
function DemandForm({ today, busy, t, locale }) {
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  return (
    <Form method="post" className="g-card">
      <input type="hidden" name="intent" value="demand" />
      <input type="hidden" name="date" value={date} />
      <input type="hidden" name="time" value={time} />
      <p className="g-empty" style={{ marginTop: 0 }}>{t("Para um serviço que não está no site (ex.: transfer, passeio privado). O cliente paga pela Shopify e a demanda aparece no Quadro.")}</p>
      <label className="g-field">{t("O que está sendo vendido")}<input name="title" required maxLength={200} placeholder={t("Ex.: Transfer aeroporto → hotel (4 pessoas)")} /></label>
      <label className="g-field">{t("Detalhes (opcional)")}<textarea name="details" rows={2} maxLength={1000} placeholder={t("Endereço, voo, observações…")} /></label>
      <div className="g-row" style={{ alignItems: "flex-end" }}>
        <label className="g-field" style={{ flex: "1 1 140px" }}>{t("Preço (€)")}<input name="price" required inputMode="decimal" placeholder="80,00" /></label>
        <label className="g-field" style={{ flex: "0 1 110px" }}>{t("Quantidade")}<input name="quantity" type="number" min="1" max="100" defaultValue="1" inputMode="numeric" /></label>
      </div>
      <div className="g-row">
        <div className="g-field" style={{ flex: "1 1 160px" }}>
          {t("Data (opcional)")}
          <DatePicker value={date} min={today} onChange={(e) => setDate(e?.target?.value ?? (typeof e === "string" ? e : ""))} locale={locale} todayLabel={t("Hoje")} clearLabel={t("Limpar")} />
        </div>
        <div className="g-field" style={{ flex: "1 1 120px" }}>
          {t("Horário (opcional)")}
          <TimeSelect value={time} onChange={setTime} placeholder={t("Horário")} ariaLabel={t("Horário")} />
        </div>
      </div>
      <CustomerFields t={t} />
      <button type="submit" className="g-btn primary" style={{ width: "100%" }} disabled={busy}>
        {busy ? t("Gerando…") : t("Gerar link da demanda")}
      </button>
    </Form>
  );
}

export default function GuideSell() {
  const { tours, tour, sell, day, error, today } = useLoaderData();
  const result = useActionData();
  const navigation = useNavigation();
  const [params, setParams] = useSearchParams();
  const t = useT();
  const locale = useGuideLocale();
  const appLang = useGuideLang();
  const busy = navigation.state !== "idle";
  const mode = params.get("modo") === "demanda" ? "demand" : "tour";
  const sessions = sell?.sessions || [];
  const [session, setSession] = useState("");
  const [freeTime, setFreeTime] = useState("");
  const [language, setLanguage] = useState("");
  const tourKey = tour?.id || "";
  // Trocar de passeio limpa as escolhas; um horário só já vem escolhido.
  useEffect(() => {
    setSession(sessions.length === 1 ? sessions[0].value : "");
    setFreeTime("");
    setLanguage(sell?.languages?.length === 1 ? sell.languages[0] : "");
  }, [tourKey]); // eslint-disable-line react-hooks/exhaustive-deps
  const chosen = sessions.find((s) => s.value === session) || null;
  const blockedSet = new Set(sell?.blockedDays || []);
  const dayBlocked = Boolean(day && blockedSet.has(day));
  const time = sell?.freeTime ? freeTime : chosen?.time || "";
  const visible = sell ? ticketsFor(sell.tickets, { session: sell.freeTime ? "" : session, language }) : [];
  const setParam = (key, value) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value); else next.delete(key);
    setParams(next, { preventScrollReset: true, replace: true });
  };

  if (result?.ok) return <SuccessCard result={result} t={t} />;

  return (
    <GuideShell title={t("Vender")}>
      <div className="g-top">
        <Link to="/guia" className="g-link">← {t("Minhas saídas")}</Link>
      </div>
      <div className="g-card">
        <h2 style={{ fontSize: 18 }}>{t("Gerar link de pagamento")}</h2>
        <p className="g-empty">{t("O cliente paga pelo site da PMY e a venda entra na Shopify e na Central em seu nome.")}</p>
        <div className="g-seg" role="tablist" aria-label={t("Tipo de venda")}>
          <button type="button" role="tab" aria-selected={mode === "tour"} className={mode === "tour" ? "on" : ""} onClick={() => setParam("modo", "")}>{t("Passeio do site")}</button>
          <button type="button" role="tab" aria-selected={mode === "demand"} className={mode === "demand" ? "on" : ""} onClick={() => setParam("modo", "demanda")}>{t("Demanda (fora do catálogo)")}</button>
        </div>
      </div>

      {result?.error && <div className="g-error" role="alert">{t(result.error)}</div>}

      {mode === "demand" ? <DemandForm today={today} busy={busy} t={t} locale={locale} /> : (
        <>
          {error && <div className="g-error" role="alert">{t(error)}</div>}
          <div className="g-card">
            <div className="g-field">
              {t("Passeio")}
              <DropdownSelect
                value={tour?.id || params.get("tour") || ""}
                options={tours.map((item) => ({ value: item.id, label: item.title }))}
                placeholder={t("Escolha o passeio")}
                searchPlaceholder={t("Buscar passeio...")}
                emptyLabel={t("Nenhum passeio ativo encontrado.")}
                ariaLabel={t("Passeio")}
                onChange={(value) => setParam("tour", value)}
              />
            </div>
          </div>

          {tour && sell && !error && (
            <Form method="post" className="g-card">
              <input type="hidden" name="tourId" value={tour.id} />
              <input type="hidden" name="date" value={day} />
              <input type="hidden" name="time" value={time} />
              <input type="hidden" name="language" value={language} />
              <div className="g-field">
                {t("Data")}
                <DatePicker value={day} min={today} isDateDisabled={(key) => blockedSet.has(key)} onChange={(e) => setParam("dia", e?.target?.value ?? (typeof e === "string" ? e : ""))} locale={locale} todayLabel={t("Hoje")} clearLabel={t("Limpar")} />
                {day && blockedSet.has(day) && <small className="g-error" style={{ margin: 0 }}>{t("Este dia está bloqueado pela gestão. Escolha outra data.")}</small>}
              </div>
              <div className="g-field">
                {t("Horário")}
                {sell.freeTime ? (
                  <TimeSelect value={freeTime} onChange={setFreeTime} placeholder={t("Escolha o horário")} ariaLabel={t("Horário")} />
                ) : (
                  <DropdownSelect
                    value={session}
                    options={sessions.map((s) => ({ value: s.value, label: sessionLabel(s, t), disabled: Boolean(s.seats && (s.seats.blocked || s.seats.remaining === 0)) }))}
                    placeholder={t("Escolha o horário")}
                    ariaLabel={t("Horário")}
                    onChange={(value) => setSession(value)}
                  />
                )}
              </div>
              {!sell.freeTime && (
                <div className="g-field">
                  {t("Vagas")}
                  <div className="g-seats" aria-live="polite">
                    {!day ? t("Escolha a data para ver as vagas.")
                      : !chosen ? t("Escolha o horário.")
                      : chosen.seats?.blocked ? t("Horário bloqueado pela gestão.")
                      : chosen.seats?.remaining != null ? (chosen.seats.remaining === 1 ? t("1 vaga") : t("{n} vagas", { n: chosen.seats.remaining }))
                      : "—"}
                  </div>
                </div>
              )}
              <div className="g-field">
                {t("Idioma")}
                <DropdownSelect
                  value={language}
                  options={sell.languages.map((value) => ({ value, label: displayLanguageName(value, locale) }))}
                  placeholder={t("Escolha o idioma")}
                  ariaLabel={t("Idioma")}
                  onChange={(value) => setLanguage(value)}
                />
              </div>

              <div className="g-field" style={{ marginBottom: 4 }}>{t("Ingressos")}</div>
              {!time && <p className="g-empty" style={{ marginBottom: 12 }}>{t("Escolha o horário para ver os ingressos.")}</p>}
              {time && visible.map((v) => (
                <div key={v.id} className="g-ticket">
                  <span>{translateTicketTitle(v.title, appLang)}<small>€{Number(v.price).toFixed(2)}</small></span>
                  <input type="number" name={`qty:${v.id}`} min="0" max="30" defaultValue="0" inputMode="numeric" aria-label={t("Quantidade de {name}", { name: translateTicketTitle(v.title, appLang) })} />
                </div>
              ))}

              <CustomerFields t={t} />

              <button type="submit" className="g-btn primary" style={{ width: "100%" }} disabled={busy || !day || dayBlocked || !language || !time || Boolean(chosen?.seats?.blocked) || chosen?.seats?.remaining === 0}>
                {busy ? t("Gerando…") : t("Gerar link de pagamento")}
              </button>
            </Form>
          )}
        </>
      )}
    </GuideShell>
  );
}
