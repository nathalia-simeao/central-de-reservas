import { useEffect, useState } from "react";
import { Form, Link, useActionData, useLoaderData, useNavigation, useSearchParams } from "react-router";
import { DatePicker, DropdownSelect } from "../components/pmy/PmyUI";
import db from "../db.server";
import { unauthenticated } from "../shopify.server";
import { GuideShell } from "../components/guide/GuideShell";
import { createDraftCheckout } from "../services/draft-checkout.server";
import { resolvePrimaryShop } from "../utils/single-tenant.server";
import { getGuideFromRequest, redirectTo, whatsappLink } from "../utils/guide-portal.server";

// Item 13: o guia gera o link de pagamento do Shopify (com vaga segurada)
// e manda para o cliente. A venda fica marcada com o guia (origem "Guia").

const LANGUAGES = [
  ["English", "Inglês"],
  ["Português", "Português"],
  ["Español", "Espanhol"],
  ["Français", "Francês"],
  ["Italiano", "Italiano"],
  ["Deutsch", "Alemão"],
];
const GUIDE_HOLD_MINUTES = 60;

function timeFromTitle(value) {
  const match = String(value || "").match(/\b([01]?\d|2[0-3])[:hH]([0-5]\d)\b/);
  return match ? `${match[1].padStart(2, "0")}:${match[2]}` : null;
}

async function shopAdmin() {
  const { shop } = await resolvePrimaryShop(db, { allowInitialize: false });
  if (!shop) throw new Error("Loja Shopify não configurada.");
  return { shop, admin: await unauthenticated.admin(shop) };
}

async function loadProduct(admin, productId) {
  const response = await admin.graphql(
    `#graphql
      query GuidePortalProduct($id: ID!) {
        product(id: $id) {
          id
          title
          status
          variants(first: 100) { nodes { id title price availableForSale } }
        }
      }`,
    { variables: { id: productId } },
  );
  const payload = await response.json();
  return payload?.data?.product || null;
}

// Só passeios ATIVOS no Shopify (nada de rascunho, arquivado ou não listado).
async function activeProductIds(admin, ids) {
  const active = new Set();
  for (let i = 0; i < ids.length; i += 100) {
    const response = await admin.graphql(
      `#graphql
        query GuidePortalProductStatus($ids: [ID!]!) {
          nodes(ids: $ids) { ... on Product { id status } }
        }`,
      { variables: { ids: ids.slice(i, i + 100) } },
    );
    const payload = await response.json();
    for (const node of payload?.data?.nodes || []) {
      if (node?.id && node.status === "ACTIVE") active.add(node.id);
    }
  }
  return active;
}

export const loader = async ({ request }) => {
  const guide = await getGuideFromRequest(db, request);
  if (!guide) return redirectTo("/guia/login");

  const linked = (
    await db.tour.findMany({
      where: { shopifyProductId: { not: null } },
      select: { id: true, title: true, shopifyProductId: true },
      orderBy: { title: "asc" },
    })
  ).filter((tour) => /^gid:\/\/shopify\/Product\/\d+$/.test(String(tour.shopifyProductId)));

  let tours = [];
  let listError = null;
  try {
    const { admin } = await shopAdmin();
    const active = await activeProductIds(admin, [...new Set(linked.map((t) => t.shopifyProductId))]);
    tours = linked.filter((t) => active.has(t.shopifyProductId));
  } catch (e) {
    console.error("[PMY guide sell] product status load failed:", e);
    listError = "Não foi possível carregar os passeios agora. Tente de novo em instantes.";
  }

  const url = new URL(request.url);
  const tourId = url.searchParams.get("tour");
  const tour = tours.find((item) => item.id === tourId) || null;
  let product = null;
  let error = null;
  if (tour) {
    try {
      const { admin } = await shopAdmin();
      product = await loadProduct(admin, tour.shopifyProductId);
      if (!product || product.status !== "ACTIVE") error = "Este passeio não está ativo no site.";
    } catch (e) {
      console.error("[PMY guide sell] product load failed:", e);
      error = "Não foi possível carregar os ingressos agora. Tente de novo em instantes.";
    }
  }

  const variants = (product?.variants?.nodes || [])
    .filter((v) => v.availableForSale !== false)
    .map((v) => ({ id: v.id, title: v.title, price: v.price, time: timeFromTitle(v.title) }));
  const times = [...new Set(variants.map((v) => v.time).filter(Boolean))].sort();

  return {
    guide: { name: guide.name },
    tours: tours.map(({ id, title }) => ({ id, title })),
    tour: tour ? { id: tour.id, title: product?.title || tour.title } : null,
    variants,
    times,
    error: error || listError,
    today: new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Lisbon" }).format(new Date()),
  };
};

export const action = async ({ request }) => {
  const guide = await getGuideFromRequest(db, request);
  if (!guide) return redirectTo("/guia/login");
  const form = await request.formData();

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

export default function GuideSell() {
  const { tours, tour, variants, times, error, today } = useLoaderData();
  const result = useActionData();
  const navigation = useNavigation();
  const [params, setParams] = useSearchParams();
  const [date, setDate] = useState("");
  const [language, setLanguage] = useState("");
  const busy = navigation.state !== "idle";
  const [time, setTime] = useState(times.length === 1 ? times[0] : "");
  const [copied, setCopied] = useState(false);
  const tourKey = tour?.id || "";
  const singleTime = times.length === 1 ? times[0] : "";
  useEffect(() => { setTime(singleTime); }, [tourKey, singleTime]);
  const visible = variants.filter((v) => !v.time || v.time === time);

  if (result?.ok) {
    return (
      <GuideShell title="Link gerado">
        <div className="g-top"><Link to="/guia" className="g-link">← Minhas saídas</Link></div>
        <div className="g-card">
          <h2>Link de pagamento pronto</h2>
          <div className="g-ok">A vaga fica segura por {result.holdMinutes} minutos. Peça para o cliente pagar dentro desse prazo; depois disso o link vence e a vaga volta para venda.</div>
          <label className="g-field">
            Link
            <input readOnly value={result.invoiceUrl} onFocus={(e) => e.target.select()} />
          </label>
          <div className="g-row">
            <a className="g-btn primary" href={result.whatsapp} target="_blank" rel="noreferrer">💬 Enviar por WhatsApp</a>
            <button
              type="button"
              className="g-btn"
              onClick={() => {
                navigator.clipboard?.writeText(result.message).then(() => setCopied(true)).catch(() => setCopied(false));
              }}
            >
              {copied ? "Copiado ✓" : "Copiar mensagem"}
            </button>
            <a className="g-btn" href={result.invoiceUrl} target="_blank" rel="noreferrer">Abrir checkout</a>
          </div>
        </div>
        <Link to="/guia/vender" className="g-btn" style={{ width: "100%" }}>Gerar outro link</Link>
      </GuideShell>
    );
  }

  return (
    <GuideShell title="Vender">
      <div className="g-top">
        <Link to="/guia" className="g-link">← Minhas saídas</Link>
      </div>
      <div className="g-card">
        <h2 style={{ fontSize: 18 }}>Gerar link de pagamento</h2>
        <p className="g-empty">O cliente paga pelo site da PMY e a reserva entra na Central como venda sua.</p>
      </div>

      {(error || result?.error) && <div className="g-error" role="alert">{result?.error || error}</div>}

      <div className="g-card">
        <div className="g-field">
          Passeio
          <DropdownSelect
            value={tour?.id || params.get("tour") || ""}
            options={tours.map((t) => ({ value: t.id, label: t.title }))}
            placeholder="Escolha o passeio"
            searchPlaceholder="Buscar passeio..."
            emptyLabel="Nenhum passeio ativo encontrado."
            ariaLabel="Passeio"
            onChange={(value) => {
              const next = new URLSearchParams(params);
              next.set("tour", value);
              setParams(next);
              setTime("");
            }}
          />
        </div>
      </div>

      {tour && !error && (
        <Form method="post" className="g-card">
          <input type="hidden" name="tourId" value={tour.id} />
          <input type="hidden" name="date" value={date} />
          <input type="hidden" name="time" value={time} />
          <input type="hidden" name="language" value={language} />
          <div className="g-field">
            Data
            <DatePicker value={date} min={today} onChange={(value) => setDate(value || "")} />
          </div>
          <div className="g-field">
            Horário
            <DropdownSelect
              value={time}
              options={times.map((t) => ({ value: t, label: t }))}
              placeholder="Escolha o horário"
              ariaLabel="Horário"
              onChange={(value) => setTime(value)}
            />
          </div>
          <div className="g-field">
            Idioma
            <DropdownSelect
              value={language}
              options={LANGUAGES.map(([value, label]) => ({ value, label }))}
              placeholder="Escolha o idioma"
              ariaLabel="Idioma"
              onChange={(value) => setLanguage(value)}
            />
          </div>

          <div className="g-field" style={{ marginBottom: 4 }}>Ingressos</div>
          {!time && times.length > 0 && <p className="g-empty" style={{ marginBottom: 12 }}>Escolha o horário para ver os ingressos.</p>}
          {(time || !times.length) && visible.map((v) => (
            <div key={v.id} className="g-ticket">
              <span>{v.title}<small>€{Number(v.price).toFixed(2)}</small></span>
              <input type="number" name={`qty:${v.id}`} min="0" max="30" defaultValue="0" inputMode="numeric" aria-label={`Quantidade de ${v.title}`} />
            </div>
          ))}

          <div className="g-field" style={{ marginTop: 16, marginBottom: 4 }}>Cliente (opcional, ajuda a equipe)</div>
          <label className="g-field">Nome<input name="customerName" autoComplete="off" /></label>
          <label className="g-field">WhatsApp<input name="customerPhone" type="tel" inputMode="tel" placeholder="+351 912 345 678" /></label>
          <label className="g-field">E-mail<input name="customerEmail" type="email" inputMode="email" /></label>

          <button type="submit" className="g-btn primary" style={{ width: "100%" }} disabled={busy || !date || !language || (times.length > 0 && !time)}>
            {busy ? "Gerando…" : "Gerar link de pagamento"}
          </button>
        </Form>
      )}
    </GuideShell>
  );
}
