var _a;
import { jsx, jsxs, Fragment } from "react/jsx-runtime";
import { PassThrough } from "stream";
import { renderToPipeableStream } from "react-dom/server";
import { ServerRouter, UNSAFE_withComponentProps, Meta, Links, Outlet, ScrollRestoration, Scripts, useLoaderData, useActionData, Form, useFetcher, data, UNSAFE_withErrorBoundaryProps, useRouteError } from "react-router";
import { createReadableStreamFromReadable } from "@react-router/node";
import { isbot } from "isbot";
import "@shopify/shopify-app-react-router/adapters/node";
import { shopifyApp, AppDistribution, ApiVersion, LoginErrorType, boundary } from "@shopify/shopify-app-react-router/server";
import { PrismaSessionStorage } from "@shopify/shopify-app-session-storage-prisma";
import { PrismaClient } from "@prisma/client";
import { AppProvider } from "@shopify/shopify-app-react-router/react";
import { useState, useRef, useEffect } from "react";
import { useAppBridge } from "@shopify/app-bridge-react";
if (process.env.NODE_ENV !== "production") {
  if (!global.prismaGlobal) {
    global.prismaGlobal = new PrismaClient();
  }
}
const prisma$1 = global.prismaGlobal ?? new PrismaClient();
const shopify = shopifyApp({
  apiKey: process.env.SHOPIFY_API_KEY,
  apiSecretKey: process.env.SHOPIFY_API_SECRET || "",
  apiVersion: ApiVersion.October25,
  scopes: (_a = process.env.SCOPES) == null ? void 0 : _a.split(","),
  appUrl: process.env.SHOPIFY_APP_URL || "",
  authPathPrefix: "/auth",
  sessionStorage: new PrismaSessionStorage(prisma$1),
  distribution: AppDistribution.AppStore,
  future: {
    expiringOfflineAccessTokens: true
  },
  ...process.env.SHOP_CUSTOM_DOMAIN ? { customShopDomains: [process.env.SHOP_CUSTOM_DOMAIN] } : {}
});
ApiVersion.October25;
const addDocumentResponseHeaders = shopify.addDocumentResponseHeaders;
const authenticate = shopify.authenticate;
shopify.unauthenticated;
const login = shopify.login;
shopify.registerWebhooks;
shopify.sessionStorage;
const streamTimeout = 5e3;
async function handleRequest(request, responseStatusCode, responseHeaders, reactRouterContext) {
  addDocumentResponseHeaders(request, responseHeaders);
  const userAgent = request.headers.get("user-agent");
  const callbackName = isbot(userAgent ?? "") ? "onAllReady" : "onShellReady";
  return new Promise((resolve, reject) => {
    const { pipe, abort } = renderToPipeableStream(
      /* @__PURE__ */ jsx(ServerRouter, { context: reactRouterContext, url: request.url }),
      {
        [callbackName]: () => {
          const body = new PassThrough();
          const stream = createReadableStreamFromReadable(body);
          responseHeaders.set("Content-Type", "text/html");
          resolve(
            new Response(stream, {
              headers: responseHeaders,
              status: responseStatusCode
            })
          );
          pipe(body);
        },
        onShellError(error) {
          reject(error);
        },
        onError(error) {
          responseStatusCode = 500;
          console.error(error);
        }
      }
    );
    setTimeout(abort, streamTimeout + 1e3);
  });
}
const entryServer = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: handleRequest,
  streamTimeout
}, Symbol.toStringTag, { value: "Module" }));
const root = UNSAFE_withComponentProps(function App() {
  return /* @__PURE__ */ jsxs("html", {
    lang: "en",
    children: [/* @__PURE__ */ jsxs("head", {
      children: [/* @__PURE__ */ jsx("meta", {
        charSet: "utf-8"
      }), /* @__PURE__ */ jsx("meta", {
        name: "viewport",
        content: "width=device-width,initial-scale=1"
      }), /* @__PURE__ */ jsx("link", {
        rel: "preconnect",
        href: "https://cdn.shopify.com/"
      }), /* @__PURE__ */ jsx("link", {
        rel: "stylesheet",
        href: "https://cdn.shopify.com/static/fonts/inter/v4/styles.css"
      }), /* @__PURE__ */ jsx(Meta, {}), /* @__PURE__ */ jsx(Links, {})]
    }), /* @__PURE__ */ jsxs("body", {
      children: [/* @__PURE__ */ jsx(Outlet, {}), /* @__PURE__ */ jsx(ScrollRestoration, {}), /* @__PURE__ */ jsx(Scripts, {})]
    })]
  });
});
const route0 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: root
}, Symbol.toStringTag, { value: "Module" }));
const action$4 = async ({
  request
}) => {
  const {
    payload,
    session,
    topic,
    shop
  } = await authenticate.webhook(request);
  console.log(`Received ${topic} webhook for ${shop}`);
  const current = payload.current;
  if (session) {
    await prisma$1.session.update({
      where: {
        id: session.id
      },
      data: {
        scope: current.toString()
      }
    });
  }
  return new Response();
};
const route1 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  action: action$4
}, Symbol.toStringTag, { value: "Module" }));
const action$3 = async ({
  request
}) => {
  const {
    shop,
    session,
    topic
  } = await authenticate.webhook(request);
  console.log(`Received ${topic} webhook for ${shop}`);
  if (session) {
    await prisma$1.session.deleteMany({
      where: {
        shop
      }
    });
  }
  return new Response();
};
const route2 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  action: action$3
}, Symbol.toStringTag, { value: "Module" }));
function loginErrorMessage(loginErrors) {
  if ((loginErrors == null ? void 0 : loginErrors.shop) === LoginErrorType.MissingShop) {
    return { shop: "Please enter your shop domain to log in" };
  } else if ((loginErrors == null ? void 0 : loginErrors.shop) === LoginErrorType.InvalidShop) {
    return { shop: "Please enter a valid shop domain to log in" };
  }
  return {};
}
const loader$4 = async ({
  request
}) => {
  const errors = loginErrorMessage(await login(request));
  return {
    errors
  };
};
const action$2 = async ({
  request
}) => {
  const errors = loginErrorMessage(await login(request));
  return {
    errors
  };
};
const route$1 = UNSAFE_withComponentProps(function Auth() {
  const loaderData = useLoaderData();
  const actionData = useActionData();
  const [shop, setShop] = useState("");
  const {
    errors
  } = actionData || loaderData;
  return /* @__PURE__ */ jsx(AppProvider, {
    embedded: false,
    children: /* @__PURE__ */ jsx("s-page", {
      children: /* @__PURE__ */ jsx(Form, {
        method: "post",
        children: /* @__PURE__ */ jsxs("s-section", {
          heading: "Log in",
          children: [/* @__PURE__ */ jsx("s-text-field", {
            name: "shop",
            label: "Shop domain",
            details: "example.myshopify.com",
            value: shop,
            onChange: (e) => setShop(e.currentTarget.value),
            autocomplete: "on",
            error: errors.shop
          }), /* @__PURE__ */ jsx("s-button", {
            type: "submit",
            children: "Log in"
          })]
        })
      })
    })
  });
});
const route3 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  action: action$2,
  default: route$1,
  loader: loader$4
}, Symbol.toStringTag, { value: "Module" }));
const loader$3 = async ({
  request
}) => {
  await authenticate.admin(request);
  return null;
};
const headers$2 = (headersArgs) => {
  return boundary.headers(headersArgs);
};
const route4 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  headers: headers$2,
  loader: loader$3
}, Symbol.toStringTag, { value: "Module" }));
const prisma = prisma$1;
const json = (body, init) => data(body, init);
const ExpandIcon = () => /* @__PURE__ */ jsx("svg", {
  className: "pmy-card-icon",
  width: "18",
  height: "18",
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: "2",
  strokeLinecap: "round",
  strokeLinejoin: "round",
  children: /* @__PURE__ */ jsx("path", {
    d: "M7 17l9.2-9.2M17 17V7H7"
  })
});
const loader$2 = async ({
  request
}) => {
  var _a2, _b, _c, _d;
  const {
    admin,
    session
  } = await authenticate.admin(request);
  const tours = await prisma.tour.findMany({
    include: {
      bookings: true
    }
  });
  const bookings = await prisma.booking.findMany({
    orderBy: {
      startTime: "asc"
    }
  });
  let shopifyProducts = [];
  let shopName = (session == null ? void 0 : session.shop) || "Minha Loja Shopify";
  try {
    const gqlResponse = await admin.graphql(`
      query {
        shop {
          name
          myshopifyDomain
        }
        products(first: 100) {
          edges {
            node {
              id
              title
              status
              variants(first: 1) {
                edges {
                  node {
                    sku
                    price
                  }
                }
              }
            }
          }
        }
      }
    `);
    const gqlData = await gqlResponse.json();
    shopName = ((_b = (_a2 = gqlData == null ? void 0 : gqlData.data) == null ? void 0 : _a2.shop) == null ? void 0 : _b.name) || shopName;
    shopifyProducts = (((_d = (_c = gqlData == null ? void 0 : gqlData.data) == null ? void 0 : _c.products) == null ? void 0 : _d.edges) || []).map(({
      node
    }) => {
      var _a3, _b2, _c2, _d2, _e, _f, _g, _h;
      return {
        id: node.id,
        name: node.title,
        sku: ((_d2 = (_c2 = (_b2 = (_a3 = node.variants) == null ? void 0 : _a3.edges) == null ? void 0 : _b2[0]) == null ? void 0 : _c2.node) == null ? void 0 : _d2.sku) || "—",
        price: ((_h = (_g = (_f = (_e = node.variants) == null ? void 0 : _e.edges) == null ? void 0 : _f[0]) == null ? void 0 : _g.node) == null ? void 0 : _h.price) ? "€" + parseFloat(node.variants.edges[0].node.price).toFixed(0) : "—",
        active: node.status === "ACTIVE",
        synced: true
      };
    });
  } catch (e) {
    shopifyProducts = [];
  }
  return json({
    tours,
    bookings,
    shopifyProducts,
    shopName
  });
};
const action$1 = async ({
  request
}) => {
  await authenticate.admin(request);
  const formData = await request.formData();
  const _action = formData.get("_action");
  if (_action === "createTour") {
    const title = formData.get("title");
    await prisma.tour.create({
      data: {
        title
      }
    });
    return json({
      success: true
    });
  }
  if (_action === "createBooking") {
    const tourId = formData.get("tourId");
    const customerName = formData.get("customerName");
    const startTime = new Date(formData.get("startTime"));
    const platform = formData.get("platform");
    await prisma.booking.create({
      data: {
        tourId,
        customerName,
        startTime,
        platform,
        status: "CONFIRMED"
      }
    });
    return json({
      success: true
    });
  }
  return json({
    success: true
  });
};
const getFlagUrl = (iso2) => `https://flagcdn.com/w20/${iso2.toLowerCase()}.png`;
const ddiList = [{
  code: "+93",
  iso: "AF"
}, {
  code: "+355",
  iso: "AL"
}, {
  code: "+213",
  iso: "DZ"
}, {
  code: "+376",
  iso: "AD"
}, {
  code: "+244",
  iso: "AO"
}, {
  code: "+1268",
  iso: "AG"
}, {
  code: "+54",
  iso: "AR"
}, {
  code: "+374",
  iso: "AM"
}, {
  code: "+61",
  iso: "AU"
}, {
  code: "+43",
  iso: "AT"
}, {
  code: "+994",
  iso: "AZ"
}, {
  code: "+1242",
  iso: "BS"
}, {
  code: "+973",
  iso: "BH"
}, {
  code: "+880",
  iso: "BD"
}, {
  code: "+1246",
  iso: "BB"
}, {
  code: "+375",
  iso: "BY"
}, {
  code: "+32",
  iso: "BE"
}, {
  code: "+501",
  iso: "BZ"
}, {
  code: "+229",
  iso: "BJ"
}, {
  code: "+975",
  iso: "BT"
}, {
  code: "+591",
  iso: "BO"
}, {
  code: "+387",
  iso: "BA"
}, {
  code: "+267",
  iso: "BW"
}, {
  code: "+55",
  iso: "BR"
}, {
  code: "+673",
  iso: "BN"
}, {
  code: "+359",
  iso: "BG"
}, {
  code: "+226",
  iso: "BF"
}, {
  code: "+257",
  iso: "BI"
}, {
  code: "+238",
  iso: "CV"
}, {
  code: "+855",
  iso: "KH"
}, {
  code: "+237",
  iso: "CM"
}, {
  code: "+1",
  iso: "CA"
}, {
  code: "+236",
  iso: "CF"
}, {
  code: "+235",
  iso: "TD"
}, {
  code: "+56",
  iso: "CL"
}, {
  code: "+86",
  iso: "CN"
}, {
  code: "+57",
  iso: "CO"
}, {
  code: "+269",
  iso: "KM"
}, {
  code: "+243",
  iso: "CD"
}, {
  code: "+242",
  iso: "CG"
}, {
  code: "+506",
  iso: "CR"
}, {
  code: "+225",
  iso: "CI"
}, {
  code: "+385",
  iso: "HR"
}, {
  code: "+53",
  iso: "CU"
}, {
  code: "+357",
  iso: "CY"
}, {
  code: "+420",
  iso: "CZ"
}, {
  code: "+45",
  iso: "DK"
}, {
  code: "+253",
  iso: "DJ"
}, {
  code: "+1767",
  iso: "DM"
}, {
  code: "+1809",
  iso: "DO"
}, {
  code: "+593",
  iso: "EC"
}, {
  code: "+20",
  iso: "EG"
}, {
  code: "+503",
  iso: "SV"
}, {
  code: "+240",
  iso: "GQ"
}, {
  code: "+291",
  iso: "ER"
}, {
  code: "+372",
  iso: "EE"
}, {
  code: "+268",
  iso: "SZ"
}, {
  code: "+251",
  iso: "ET"
}, {
  code: "+679",
  iso: "FJ"
}, {
  code: "+358",
  iso: "FI"
}, {
  code: "+33",
  iso: "FR"
}, {
  code: "+241",
  iso: "GA"
}, {
  code: "+220",
  iso: "GM"
}, {
  code: "+995",
  iso: "GE"
}, {
  code: "+49",
  iso: "DE"
}, {
  code: "+233",
  iso: "GH"
}, {
  code: "+30",
  iso: "GR"
}, {
  code: "+1473",
  iso: "GD"
}, {
  code: "+502",
  iso: "GT"
}, {
  code: "+224",
  iso: "GN"
}, {
  code: "+245",
  iso: "GW"
}, {
  code: "+592",
  iso: "GY"
}, {
  code: "+509",
  iso: "HT"
}, {
  code: "+504",
  iso: "HN"
}, {
  code: "+36",
  iso: "HU"
}, {
  code: "+354",
  iso: "IS"
}, {
  code: "+91",
  iso: "IN"
}, {
  code: "+62",
  iso: "ID"
}, {
  code: "+98",
  iso: "IR"
}, {
  code: "+964",
  iso: "IQ"
}, {
  code: "+353",
  iso: "IE"
}, {
  code: "+972",
  iso: "IL"
}, {
  code: "+39",
  iso: "IT"
}, {
  code: "+1876",
  iso: "JM"
}, {
  code: "+81",
  iso: "JP"
}, {
  code: "+962",
  iso: "JO"
}, {
  code: "+7",
  iso: "KZ"
}, {
  code: "+254",
  iso: "KE"
}, {
  code: "+686",
  iso: "KI"
}, {
  code: "+850",
  iso: "KP"
}, {
  code: "+82",
  iso: "KR"
}, {
  code: "+965",
  iso: "KW"
}, {
  code: "+996",
  iso: "KG"
}, {
  code: "+856",
  iso: "LA"
}, {
  code: "+371",
  iso: "LV"
}, {
  code: "+961",
  iso: "LB"
}, {
  code: "+266",
  iso: "LS"
}, {
  code: "+231",
  iso: "LR"
}, {
  code: "+218",
  iso: "LY"
}, {
  code: "+423",
  iso: "LI"
}, {
  code: "+370",
  iso: "LT"
}, {
  code: "+352",
  iso: "LU"
}, {
  code: "+261",
  iso: "MG"
}, {
  code: "+265",
  iso: "MW"
}, {
  code: "+60",
  iso: "MY"
}, {
  code: "+960",
  iso: "MV"
}, {
  code: "+223",
  iso: "ML"
}, {
  code: "+356",
  iso: "MT"
}, {
  code: "+692",
  iso: "MH"
}, {
  code: "+222",
  iso: "MR"
}, {
  code: "+230",
  iso: "MU"
}, {
  code: "+52",
  iso: "MX"
}, {
  code: "+691",
  iso: "FM"
}, {
  code: "+373",
  iso: "MD"
}, {
  code: "+377",
  iso: "MC"
}, {
  code: "+976",
  iso: "MN"
}, {
  code: "+382",
  iso: "ME"
}, {
  code: "+212",
  iso: "MA"
}, {
  code: "+258",
  iso: "MZ"
}, {
  code: "+95",
  iso: "MM"
}, {
  code: "+264",
  iso: "NA"
}, {
  code: "+674",
  iso: "NR"
}, {
  code: "+977",
  iso: "NP"
}, {
  code: "+31",
  iso: "NL"
}, {
  code: "+64",
  iso: "NZ"
}, {
  code: "+505",
  iso: "NI"
}, {
  code: "+227",
  iso: "NE"
}, {
  code: "+234",
  iso: "NG"
}, {
  code: "+389",
  iso: "MK"
}, {
  code: "+47",
  iso: "NO"
}, {
  code: "+968",
  iso: "OM"
}, {
  code: "+92",
  iso: "PK"
}, {
  code: "+680",
  iso: "PW"
}, {
  code: "+970",
  iso: "PS"
}, {
  code: "+507",
  iso: "PA"
}, {
  code: "+675",
  iso: "PG"
}, {
  code: "+595",
  iso: "PY"
}, {
  code: "+51",
  iso: "PE"
}, {
  code: "+63",
  iso: "PH"
}, {
  code: "+48",
  iso: "PL"
}, {
  code: "+351",
  iso: "PT"
}, {
  code: "+974",
  iso: "QA"
}, {
  code: "+40",
  iso: "RO"
}, {
  code: "+7",
  iso: "RU"
}, {
  code: "+250",
  iso: "RW"
}, {
  code: "+1869",
  iso: "KN"
}, {
  code: "+1758",
  iso: "LC"
}, {
  code: "+1784",
  iso: "VC"
}, {
  code: "+685",
  iso: "WS"
}, {
  code: "+378",
  iso: "SM"
}, {
  code: "+239",
  iso: "ST"
}, {
  code: "+966",
  iso: "SA"
}, {
  code: "+221",
  iso: "SN"
}, {
  code: "+381",
  iso: "RS"
}, {
  code: "+248",
  iso: "SC"
}, {
  code: "+232",
  iso: "SL"
}, {
  code: "+65",
  iso: "SG"
}, {
  code: "+421",
  iso: "SK"
}, {
  code: "+386",
  iso: "SI"
}, {
  code: "+677",
  iso: "SB"
}, {
  code: "+252",
  iso: "SO"
}, {
  code: "+27",
  iso: "ZA"
}, {
  code: "+211",
  iso: "SS"
}, {
  code: "+34",
  iso: "ES"
}, {
  code: "+94",
  iso: "LK"
}, {
  code: "+249",
  iso: "SD"
}, {
  code: "+597",
  iso: "SR"
}, {
  code: "+46",
  iso: "SE"
}, {
  code: "+41",
  iso: "CH"
}, {
  code: "+963",
  iso: "SY"
}, {
  code: "+886",
  iso: "TW"
}, {
  code: "+992",
  iso: "TJ"
}, {
  code: "+255",
  iso: "TZ"
}, {
  code: "+66",
  iso: "TH"
}, {
  code: "+670",
  iso: "TL"
}, {
  code: "+228",
  iso: "TG"
}, {
  code: "+676",
  iso: "TO"
}, {
  code: "+1868",
  iso: "TT"
}, {
  code: "+216",
  iso: "TN"
}, {
  code: "+90",
  iso: "TR"
}, {
  code: "+993",
  iso: "TM"
}, {
  code: "+688",
  iso: "TV"
}, {
  code: "+256",
  iso: "UG"
}, {
  code: "+380",
  iso: "UA"
}, {
  code: "+971",
  iso: "AE"
}, {
  code: "+44",
  iso: "GB"
}, {
  code: "+1",
  iso: "US"
}, {
  code: "+598",
  iso: "UY"
}, {
  code: "+998",
  iso: "UZ"
}, {
  code: "+678",
  iso: "VU"
}, {
  code: "+58",
  iso: "VE"
}, {
  code: "+84",
  iso: "VN"
}, {
  code: "+967",
  iso: "YE"
}, {
  code: "+260",
  iso: "ZM"
}, {
  code: "+263",
  iso: "ZW"
}];
const translations = {
  pt: {
    menu_dashboard: "📊 Dashboard",
    menu_agenda: "📅 Agenda Central",
    menu_integrations: "🔗 Integrações",
    menu_guides: "👥 Guias",
    menu_automations: "🤖 Automações",
    menu_settings: "⚙️ Configurações",
    dash_title: "Visão Geral",
    dash_total_sales: "Total de Vendas",
    dash_vs_last_month: "no período selecionado",
    dash_revenue_confirmed: "Receita Confirmada",
    dash_revenue_estimated: "Receita Estimada",
    dash_canceled_tours: "Tours Cancelados",
    dash_upcoming: "Próximos Tours",
    dash_performance: "Desempenho por Passeio",
    dash_bookings: "reservas",
    agenda_title: "Agenda Centralizada",
    integrations_title: "Sincronização de Plataformas",
    guides_title: "Gestão de Guias",
    automations_title: "Automações e Alertas",
    settings_title: "Configurações do Sistema",
    created_by: "Criado por Nathalia Simeão",
    period_1w: "1 semana",
    period_15d: "15 dias",
    period_30d: "30 dias",
    period_60d: "60 dias",
    period_90d: "90 dias",
    period_120d: "120 dias",
    period_6m: "6 meses",
    period_1y: "1 ano",
    period_custom: "Personalizado",
    date_from: "De",
    date_to: "Até",
    btn_apply: "Aplicar",
    source_site: "Site Próprio",
    source_viator: "Viator",
    source_gyg: "GetYourGuide",
    source_manual: "Manual",
    modal_sales_details: "Detalhamento de Vendas",
    modal_confirmed_details: "Detalhamento da Receita Confirmada",
    modal_estimated_details: "Detalhamento da Receita Estimada",
    modal_canceled_details: "Motivos de Cancelamento",
    modal_upcoming_details: "Lista de Próximos Tours",
    views: "visualizações",
    btn_format: "⚙️ Formato",
    form_new_booking: "🎟️ Inserir Nova Reserva",
    form_new_block: "🔒 Inserir Bloqueio Manual",
    form_select_tour: "Selecione o Tour",
    form_customer: "Nome do Cliente (Obrigatório):",
    form_email: "E-mail (Opcional):",
    form_phone: "Telefone / WhatsApp (Opcional):",
    form_lang: "Idioma Base do Tour:",
    form_qty: "Quantidade de Ingressos:",
    form_date_time: "Data do Bloqueio Específica:",
    form_btn_link: "🔗 Gerar Link de Pagamento",
    form_btn_block: "Bloquear Vagas / Horários",
    tour_capacity: "Capacidade Máxima de Vagas:",
    guide_assigned: "Guia Escalado:",
    no_guide: "Sem guia atribuído",
    registered_guides: "Equipe de Guias",
    form_new_guide: "Cadastrar Novo Guia",
    form_guide_name: "Nome e Sobrenome:",
    form_guide_email: "E-mail do Guia:",
    form_guide_whatsapp: "WhatsApp (Obrigatório):",
    form_guide_photo: "Foto do Guia:",
    btn_add_guide: "Salvar Guia",
    registered_guides_list: "Guias Cadastrados",
    upcoming_tours_list: "Próximos Tours Agendados",
    filter_today: "Hoje",
    int_subtitle: "Conecte seus canais de venda para puxar as reservas de forma automática.",
    int_connected: "Conectado",
    int_configure: "Configurar Conexão",
    int_connect: "Vincular Conta",
    int_desc_viator: "Sincronize horários, vagas e passageiros.",
    int_desc_gyg: "Puxe reservas e atualize a disponibilidade.",
    int_desc_ta: "Importe suas avaliações e sincronize widgets.",
    int_desc_shopify: "Pedidos feitos no site caem aqui na hora.",
    int_custom_title: "🔗 Conectar Nova Plataforma via API",
    int_custom_name: "Nome da Plataforma:",
    int_custom_url: "Endpoint da API (URL):",
    int_custom_key: "Chave da API / Token de Acesso:",
    int_custom_btn: "Ativar Integração Customizada",
    block_days_week: "Dias da Semana Bloqueados Sempre (ex: 0, 1, 2):",
    block_select_hour: "Horário para Bloqueio:",
    view_1d: "1 dia",
    view_3d: "3 dias",
    view_7d: "7 dias",
    view_month: "Mês todo"
  },
  en: {
    menu_dashboard: "📊 Dashboard",
    menu_agenda: "📅 Central Agenda",
    menu_integrations: "🔗 Integrations",
    menu_guides: "👥 Guides",
    menu_automations: "🤖 Automations",
    menu_settings: "⚙️ Settings",
    dash_title: "Overview",
    dash_total_sales: "Total Sales",
    dash_vs_last_month: "in selected period",
    dash_revenue_confirmed: "Confirmed Revenue",
    dash_revenue_estimated: "Estimated Revenue",
    dash_canceled_tours: "Canceled Tours",
    dash_upcoming: "Upcoming Tours",
    dash_performance: "Tour Performance",
    dash_bookings: "bookings",
    agenda_title: "Centralized Agenda",
    integrations_title: "Platform Synchronization",
    guides_title: "Guides Management",
    automations_title: "Automations and Alerts",
    settings_title: "System Settings",
    created_by: "Created by Nathalia Simeão",
    period_1w: "1 week",
    period_15d: "15 days",
    period_30d: "30 days",
    period_60d: "60 days",
    period_90d: "90 days",
    period_120d: "120 days",
    period_6m: "6 months",
    period_1y: "1 year",
    period_custom: "Custom",
    date_from: "From",
    date_to: "To",
    btn_apply: "Apply",
    source_site: "Own Website",
    source_viator: "Viator",
    source_gyg: "GetYourGuide",
    source_manual: "Manual",
    modal_sales_details: "Sales Breakdown",
    modal_confirmed_details: "Confirmed Revenue Breakdown",
    modal_estimated_details: "Estimated Revenue Breakdown",
    modal_canceled_details: "Cancellation Details",
    modal_upcoming_details: "Upcoming Tours List",
    views: "views",
    btn_format: "⚙️ Shape",
    form_new_booking: "🎟️ Insert New Booking",
    form_new_block: "🔒 Insert Manual Block",
    form_select_tour: "Select Tour",
    form_customer: "Customer Name (Required):",
    form_email: "Email (Optional):",
    form_phone: "Phone / WhatsApp (Optional):",
    form_lang: "Tour Language:",
    form_qty: "Ticket Quantity:",
    form_date_time: "Specific Block Date:",
    form_btn_link: "🔗 Generate Payment Link",
    form_btn_block: "Block Slots / Times",
    tour_capacity: "Max Capacity Slots:",
    guide_assigned: "Assigned Guide:",
    no_guide: "No guide assigned",
    registered_guides: "Guides Staff",
    form_new_guide: "Register New Guide",
    form_guide_name: "Full Name:",
    form_guide_email: "Guide Email:",
    form_guide_whatsapp: "WhatsApp (Required):",
    form_guide_photo: "Guide Photo:",
    btn_add_guide: "Save Guide",
    registered_guides_list: "Registered Guides",
    upcoming_tours_list: "Upcoming Scheduled Tours",
    filter_today: "Today",
    int_subtitle: "Connect your sales channels to fetch bookings automatically.",
    int_connected: "Connected",
    int_configure: "Configure Connection",
    int_connect: "Link Account",
    int_desc_viator: "Sync schedules, availability, and travelers.",
    int_desc_gyg: "Fetch bookings and update availability.",
    int_desc_ta: "Import your reviews and sync widgets.",
    int_desc_shopify: "Website orders appear here instantly.",
    int_custom_title: "🔗 Connect New Platform via API",
    int_custom_name: "Platform Name:",
    int_custom_url: "API Endpoint (URL):",
    int_custom_key: "API Key / Access Token:",
    int_custom_btn: "Activate Custom Integration",
    block_days_week: "Always Blocked Weekdays (e.g., 0, 1, 2):",
    block_select_hour: "Time slot to Block:",
    view_1d: "1 day",
    view_3d: "3 days",
    view_7d: "7 days",
    view_month: "Full month"
  }
};
const allPlatforms = [{
  key: "shopify",
  logo: "🛍️",
  name: "Shopify Store",
  desc: {
    pt: "Pedidos do site caem aqui na hora. Canal de venda próprio.",
    en: "Website orders appear here instantly. Your own sales channel."
  },
  authType: "oauth",
  oauthLabel: "Entrar com Shopify",
  oauthUrl: "https://accounts.shopify.com/",
  docsUrl: "https://shopify.dev/docs/api/admin-rest"
}, {
  key: "viator",
  logo: "🧡",
  name: "Viator",
  desc: {
    pt: "Sincronize horários, vagas e passageiros automaticamente.",
    en: "Sync schedules, availability and travelers automatically."
  },
  authType: "api",
  oauthLabel: "Acessar Portal Viator",
  oauthUrl: "https://supplier.viator.com/",
  docsUrl: "https://docs.viator.com/partner-api/"
}, {
  key: "getyourguide",
  logo: "💛",
  name: "GetYourGuide",
  desc: {
    pt: "Puxe reservas e atualize disponibilidade em tempo real.",
    en: "Fetch bookings and sync availability in real time."
  },
  authType: "api",
  oauthLabel: "Acessar Portal GYG",
  oauthUrl: "https://supplier.getyourguide.com/",
  docsUrl: "https://api.getyourguide.com/"
}, {
  key: "tripadvisor",
  logo: "🦉",
  name: "TripAdvisor",
  desc: {
    pt: "Importe avaliações e sincronize seus widgets de reserva.",
    en: "Import your reviews and sync booking widgets."
  },
  authType: "api",
  oauthLabel: "Acessar TripAdvisor Owners",
  oauthUrl: "https://www.tripadvisor.com/Owners",
  docsUrl: "https://developer-tripadvisor.com/"
}, {
  key: "headout",
  logo: "🌍",
  name: "Headout",
  desc: {
    pt: "Distribua seus tours para milhões de viajantes globais.",
    en: "Distribute your tours to millions of global travelers."
  },
  authType: "api",
  oauthLabel: "Acessar Portal Headout",
  oauthUrl: "https://www.headout.com/partner/login",
  docsUrl: "https://developer.headout.com/"
}, {
  key: "civitatis",
  logo: "🏛️",
  name: "Civitatis",
  desc: {
    pt: "Alcance viajantes de língua hispânica. Sincronize atividades e reservas.",
    en: "Reach Spanish-speaking travelers. Sync activities and bookings."
  },
  authType: "api",
  oauthLabel: "Acessar Portal Civitatis",
  oauthUrl: "https://operadores.civitatis.com/",
  docsUrl: "https://www.civitatis.com/en/partners/"
}];
const internalFields = [{
  key: "customerName",
  label: "Nome do Cliente",
  required: true,
  desc: "Nome completo do passageiro"
}, {
  key: "tourId",
  label: "ID do Tour / Produto",
  required: true,
  desc: "Identificador do passeio no sistema PMY"
}, {
  key: "startTime",
  label: "Data e Hora de Início",
  required: true,
  desc: "Data e horário de saída do tour"
}, {
  key: "status",
  label: "Status da Reserva",
  required: true,
  desc: "Estado: CONFIRMED / CANCELED / PENDING"
}, {
  key: "email",
  label: "E-mail do Cliente",
  required: false,
  desc: "Contato do passageiro"
}, {
  key: "phone",
  label: "Telefone / WhatsApp",
  required: false,
  desc: "Número com DDI"
}, {
  key: "quantity",
  label: "Qtd. de Ingressos",
  required: true,
  desc: "Total de tickets (por variante)"
}, {
  key: "price",
  label: "Valor Total Pago",
  required: false,
  desc: "Preço final da reserva"
}, {
  key: "currency",
  label: "Moeda",
  required: false,
  desc: "EUR, USD, BRL, etc."
}, {
  key: "bookingRef",
  label: "Referência da Reserva",
  required: true,
  desc: "ID único da reserva na plataforma"
}, {
  key: "language",
  label: "Idioma do Tour",
  required: false,
  desc: "Língua solicitada pelo cliente"
}];
const defaultMappings = {
  viator: {
    customerName: "passengerFirstName + passengerLastName",
    tourId: "productCode",
    startTime: "travelDate + departureTime",
    status: "bookingStatus",
    email: "passengerEmail",
    phone: "passengerPhone",
    quantity: "noOfTravelers",
    price: "totalPrice.amount",
    currency: "totalPrice.currency",
    bookingRef: "bookingRef",
    language: "languageGuide.language"
  },
  getyourguide: {
    customerName: "traveler.firstName + traveler.lastName",
    tourId: "activity.activityId",
    startTime: "bookingDate + timeslot.startTime",
    status: "status",
    email: "customer.email",
    phone: "customer.phone",
    quantity: "participants.adults + participants.children",
    price: "price.amount",
    currency: "price.currency",
    bookingRef: "bookingId",
    language: "languageCode"
  },
  headout: {
    customerName: "firstName + lastName",
    tourId: "experienceId",
    startTime: "slotDate + slotStartTime",
    status: "bookingStatus",
    email: "customerEmail",
    phone: "customerPhone",
    quantity: "unitItems[adults].quantity",
    price: "priceDetails.totalAmount",
    currency: "priceDetails.currency",
    bookingRef: "headoutBookingId",
    language: "variantLanguage"
  },
  civitatis: {
    customerName: "nombre + apellidos",
    tourId: "id_actividad",
    startTime: "fecha_salida + hora_salida",
    status: "estado_reserva",
    email: "email_cliente",
    phone: "telefono_cliente",
    quantity: "adultos + ninos + bebes",
    price: "importe_total",
    currency: "divisa",
    bookingRef: "localizador",
    language: "idioma_tour"
  },
  tripadvisor: {
    customerName: "travelerFirstName + travelerLastName",
    tourId: "productCode",
    startTime: "travelDate",
    status: "reservationStatus",
    email: "travelerEmail",
    phone: "travelerPhone",
    quantity: "numberOfTravelers",
    price: "orderPrice.amount",
    currency: "orderPrice.currencyCode",
    bookingRef: "itineraryId",
    language: "lang"
  },
  shopify: {
    customerName: "customer.first_name + customer.last_name",
    tourId: "line_items[0].product_id",
    startTime: "line_items[0].properties.tour_date",
    status: "financial_status + fulfillment_status",
    email: "email",
    phone: "phone",
    quantity: "line_items[0].quantity",
    price: "total_price",
    currency: "currency",
    bookingRef: "order_number",
    language: "line_items[0].properties.language"
  }
};
const route = UNSAFE_withComponentProps(function CentralDeReservas() {
  var _a2, _b, _c, _d;
  const {
    tours,
    bookings,
    shopifyProducts = [],
    shopName = "Minha Loja Shopify"
  } = useLoaderData() || {
    tours: [],
    bookings: [],
    shopifyProducts: [],
    shopName: "Minha Loja Shopify"
  };
  useFetcher();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [logoUrl, setLogoUrl] = useState(null);
  const [lang, setLang] = useState("pt");
  const [imageShape, setImageShape] = useState("rounded");
  const [activeModal, setActiveModal] = useState(null);
  const [openCategories, setOpenCategories] = useState(["Day Trips", "Walking Tours"]);
  const [isDateMenuOpen, setIsDateMenuOpen] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState("period_30d");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [custName, setCustName] = useState("");
  const [custEmail, setCustEmail] = useState("");
  const [custPhone, setCustPhone] = useState("");
  const [custLang, setCustLang] = useState("Português");
  const [selectedTour, setSelectedTour] = useState("");
  const [tourVariants, setTourVariants] = useState({
    adulto: 0,
    jovem: 0,
    crianca: 0,
    senior: 0
  });
  const [activeProductVariants, setActiveProductVariants] = useState(["adulto", "jovem", "crianca", "senior"]);
  const [activeTourLanguages, setActiveTourLanguages] = useState(["Português", "English"]);
  const [generatedLink, setGeneratedLink] = useState("");
  const [bookingPlatforms, setBookingPlatforms] = useState(["shopify"]);
  const [blockPlatforms, setBlockPlatforms] = useState(["shopify", "viator", "getyourguide", "headout", "civitatis", "tripadvisor"]);
  const [blockTourId, setBlockTourId] = useState("");
  const [blockDateTime, setBlockDateTime] = useState("");
  const [blockRecurringDays, setBlockRecurringDays] = useState("");
  const [blockSelectedHour, setBlockSelectedHour] = useState("ALL");
  const [tourAvailableHours, setTourAvailableHours] = useState(["09:00", "14:00"]);
  const [modalSelectedTour, setModalSelectedTour] = useState("");
  const [modalAvailableHours, setModalAvailableHours] = useState(["09:00", "14:00"]);
  const [isFormAllocating, setIsFormAllocating] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(4);
  const [currentYear, setCurrentYear] = useState(2026);
  const [calendarView, setCalendarView] = useState("month");
  const [selectedCalendarDay, setSelectedCalendarDay] = useState(26);
  const [tourCapacities, setTourCapacities] = useState({});
  const [guideName, setGuideName] = useState("");
  const [guideEmail, setGuideEmail] = useState("");
  const [guideDdi, setGuideDdi] = useState("+351");
  const [guideWhatsapp, setGuideWhatsapp] = useState("");
  const [guidePhoto, setGuidePhoto] = useState(null);
  const [guidesList, setGuidesList] = useState([{
    id: 1,
    name: "Renan Silva",
    email: "renan@portugalmeandyou.com",
    whatsapp: "+351 912345678",
    photo: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&q=80"
  }]);
  const [selectedGuideInfo, setSelectedGuideInfo] = useState(null);
  const [upcomingToursFilter, setUpcomingToursFilter] = useState("7d");
  const [editingGuide, setEditingGuide] = useState(null);
  const [editGuideName, setEditGuideName] = useState("");
  const [editGuideEmail, setEditGuideEmail] = useState("");
  const [editGuideDdi, setEditGuideDdi] = useState("+351");
  const [editGuideWhatsapp, setEditGuideWhatsapp] = useState("");
  const [editGuidePhoto, setEditGuidePhoto] = useState(null);
  const editGuidePhotoRef = useRef(null);
  const [customName, setCustomName] = useState("");
  const [customUrl, setCustomUrl] = useState("");
  const [customKey, setCustomKey] = useState("");
  const [customIntegrations, setCustomIntegrations] = useState([]);
  const [intSubTab, setIntSubTab] = useState("conexoes");
  const [activeProdPlatform, setActiveProdPlatform] = useState("shopify");
  const [platformProducts, setPlatformProducts] = useState({
    shopify: shopifyProducts,
    // dados reais da sua loja Shopify
    viator: [],
    // preenchido após conectar Viator API
    getyourguide: [],
    // preenchido após conectar GYG API
    headout: [],
    // preenchido após conectar Headout API
    civitatis: [],
    // preenchido após conectar Civitatis API
    tripadvisor: []
    // preenchido após conectar TripAdvisor API
  });
  const [platformConnections, setPlatformConnections] = useState({
    shopify: {
      connected: true,
      accountName: shopName,
      lastSync: (/* @__PURE__ */ new Date()).toLocaleTimeString("pt-PT", {
        hour: "2-digit",
        minute: "2-digit"
      })
    },
    viator: {
      connected: false
    },
    getyourguide: {
      connected: false
    },
    tripadvisor: {
      connected: false
    },
    headout: {
      connected: false
    },
    civitatis: {
      connected: false
    }
  });
  const [connectingPlatform, setConnectingPlatform] = useState(null);
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [apiSecretInput, setApiSecretInput] = useState("");
  const [fieldMappings, setFieldMappings] = useState(defaultMappings);
  const [activeMappingPlatform, setActiveMappingPlatform] = useState("viator");
  const fileInputRef = useRef(null);
  const guidePhotoRef = useRef(null);
  const t = translations[lang] || translations.pt;
  const ptMonths = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
  const enMonths = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const currentMonthLabel = lang === "pt" ? ptMonths[currentMonth] : enMonths[currentMonth];
  const getPeriodLabel = () => {
    if (selectedPeriod === "period_custom" && customStart && customEnd) {
      const fmt = (d) => new Date(d).toLocaleDateString(lang === "pt" ? "pt-BR" : "en-US");
      return `${fmt(customStart)} - ${fmt(customEnd)}`;
    }
    return t[selectedPeriod] || t.period_30d;
  };
  const realConfirmedBookings = (bookings == null ? void 0 : bookings.filter((b) => (b == null ? void 0 : b.status) === "CONFIRMED")) || [];
  const realCanceledBookings = (bookings == null ? void 0 : bookings.filter((b) => (b == null ? void 0 : b.status) === "CANCELED")) || [];
  const totalSalesCount = realConfirmedBookings.length;
  const canceledCount = realCanceledBookings.length;
  const upcomingCount = realConfirmedBookings.length;
  const confirmedRevenueValue = realConfirmedBookings.length * 80;
  const estimatedRevenueValue = realConfirmedBookings.length * 25;
  const dynamicDayTrips = (tours == null ? void 0 : tours.filter((t2) => !((t2 == null ? void 0 : t2.title) || "").toLowerCase().includes("walking"))) || [];
  const dynamicWalkingTours = (tours == null ? void 0 : tours.filter((t2) => ((t2 == null ? void 0 : t2.title) || "").toLowerCase().includes("walking"))) || [];
  const categoriesData = [{
    name: "Day Trips",
    toursList: dynamicDayTrips
  }, {
    name: "Walking Tours",
    toursList: dynamicWalkingTours
  }];
  const handleGeneratePaymentLink = (e) => {
    e.preventDefault();
    if (custName && selectedTour) {
      const total = Object.values(tourVariants).reduce((a, b) => a + b, 0);
      setGeneratedLink(`https://portugalmeandyou.com/checkout/draft_order_pmy_${Date.now()}?qty=${total}`);
    }
  };
  const handleAddGuide = (e) => {
    e.preventDefault();
    if (guideName && guideWhatsapp) {
      setGuidesList([...guidesList, {
        id: Date.now(),
        name: guideName,
        email: guideEmail,
        whatsapp: `${guideDdi} ${guideWhatsapp}`,
        photo: guidePhoto || "https://via.placeholder.com/150"
      }]);
      setGuideName("");
      setGuideEmail("");
      setGuideWhatsapp("");
      setGuidePhoto(null);
    }
  };
  const handleOpenEditGuide = (guide) => {
    setEditingGuide(guide.id);
    setEditGuideName(guide.name);
    setEditGuideEmail(guide.email || "");
    const parts = (guide.whatsapp || "").split(" ");
    setEditGuideDdi(parts[0] || "+351");
    setEditGuideWhatsapp(parts.slice(1).join(" ") || "");
    setEditGuidePhoto(guide.photo || null);
  };
  const handleSaveEditGuide = (e) => {
    e.preventDefault();
    if (!editGuideName || !editGuideWhatsapp) return;
    setGuidesList(guidesList.map((g) => g.id === editingGuide ? {
      ...g,
      name: editGuideName,
      email: editGuideEmail,
      whatsapp: `${editGuideDdi} ${editGuideWhatsapp}`,
      photo: editGuidePhoto || g.photo
    } : g));
    setEditingGuide(null);
  };
  const handleDeleteGuide = (id) => {
    if (window.confirm("Remover este guia do sistema?")) {
      setGuidesList(guidesList.filter((g) => g.id !== id));
      setEditingGuide(null);
    }
  };
  const handleEditGuidePhotoChange = (e) => {
    const f = e.target.files[0];
    if (f) setEditGuidePhoto(URL.createObjectURL(f));
  };
  const handleTogglePlatformSelection = (key, stateArr, setStateArr) => {
    setStateArr((prev) => prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]);
  };
  const handleToggleProduct = (platformKey, productId) => {
    setPlatformProducts((prev) => ({
      ...prev,
      [platformKey]: prev[platformKey].map((p) => p.id === productId ? {
        ...p,
        active: !p.active,
        synced: !p.active
      } : p)
    }));
  };
  const handleAddCustomIntegration = (e) => {
    e.preventDefault();
    if (customName && customUrl) {
      setCustomIntegrations([...customIntegrations, {
        id: Date.now(),
        name: customName,
        url: customUrl,
        key: customKey
      }]);
      setCustomName("");
      setCustomUrl("");
      setCustomKey("");
    }
  };
  const handleLogoChange = (e) => {
    const f = e.target.files[0];
    if (f) setLogoUrl(URL.createObjectURL(f));
  };
  const handleGuidePhotoChange = (e) => {
    const f = e.target.files[0];
    if (f) setGuidePhoto(URL.createObjectURL(f));
  };
  const toggleCategory = (n) => setOpenCategories((p) => p.includes(n) ? p.filter((c) => c !== n) : [...p, n]);
  const handlePresetSelection = (k) => {
    setSelectedPeriod(k);
    setIsDateMenuOpen(false);
  };
  const handleCustomDateApply = () => {
    if (customStart && customEnd) {
      setSelectedPeriod("period_custom");
      setIsDateMenuOpen(false);
    }
  };
  const handleTourSelectionChange = (id) => {
    setSelectedTour(id);
    setTourVariants({
      adulto: 0,
      jovem: 0,
      crianca: 0,
      senior: 0
    });
    if (id.charCodeAt(0) % 2 === 0) {
      setActiveProductVariants(["adulto", "jovem", "senior"]);
      setActiveTourLanguages(["Português", "English", "Español"]);
    } else {
      setActiveProductVariants(["adulto", "jovem", "crianca", "senior"]);
      setActiveTourLanguages(["Português", "English", "Français"]);
    }
  };
  const handleModalTourChange = (id) => {
    setModalSelectedTour(id);
    setModalAvailableHours(id.charCodeAt(0) % 2 === 0 ? ["08:30", "13:00", "17:30"] : ["09:00", "14:00"]);
  };
  const handleBlockTourSelectionChange = (id) => {
    setBlockTourId(id);
    setTourAvailableHours(id.charCodeAt(0) % 2 === 0 ? ["08:30", "13:00", "17:30"] : ["09:00", "14:00"]);
  };
  const handleCapacityChange = (id, change) => {
    const cur = tourCapacities[id] !== void 0 ? tourCapacities[id] : 20;
    setTourCapacities({
      ...tourCapacities,
      [id]: Math.min(20, Math.max(0, cur + change))
    });
  };
  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((y) => y - 1);
    } else setCurrentMonth((m) => m - 1);
  };
  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((y) => y + 1);
    } else setCurrentMonth((m) => m + 1);
  };
  const handleOpenConnect = (key) => {
    setConnectingPlatform(key);
    setApiKeyInput("");
    setApiSecretInput("");
  };
  const handleConfirmConnect = (key) => {
    if (apiKeyInput.trim()) {
      setPlatformConnections((p) => {
        var _a3;
        return {
          ...p,
          [key]: {
            connected: true,
            accountName: `Conta ${(_a3 = allPlatforms.find((pl) => pl.key === key)) == null ? void 0 : _a3.name}`,
            lastSync: "Agora mesmo"
          }
        };
      });
      setConnectingPlatform(null);
      setApiKeyInput("");
      setApiSecretInput("");
    }
  };
  const handleDisconnect = (key) => {
    var _a3;
    if (window.confirm(`Desconectar ${(_a3 = allPlatforms.find((p) => p.key === key)) == null ? void 0 : _a3.name}?`)) setPlatformConnections((p) => ({
      ...p,
      [key]: {
        connected: false
      }
    }));
  };
  const handleUpdateFieldMapping = (platform, field, value) => {
    setFieldMappings((p) => ({
      ...p,
      [platform]: {
        ...p[platform],
        [field]: value
      }
    }));
  };
  const renderCalendarDays = () => {
    const ptWeekdays = ["segunda-feira", "terça-feira", "quarta-feira", "quinta-feira", "sexta-feira", "sábado", "domingo"];
    const enWeekdays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
    const weekdays = lang === "pt" ? ptWeekdays : enWeekdays;
    if (calendarView !== "month") {
      let shortDays = [];
      if (calendarView === "1d") shortDays = [26];
      else if (calendarView === "3d") shortDays = [25, 26, 27];
      else if (calendarView === "7d") shortDays = [24, 25, 26, 27, 28, 29, 30];
      return shortDays.map((day) => {
        const wi = (day + 3) % 7;
        return /* @__PURE__ */ jsxs("div", {
          className: `pmy-calendar-day ${selectedCalendarDay === day ? "active" : ""}`,
          onClick: () => {
            setSelectedCalendarDay(day);
            setModalSelectedTour("");
            setIsFormAllocating(false);
            setActiveModal("calendarDay");
          },
          children: [/* @__PURE__ */ jsxs("div", {
            className: "pmy-cal-date-line",
            children: [day, " - ", weekdays[wi]]
          }), /* @__PURE__ */ jsx("div", {
            className: "pmy-cal-info-line",
            children: "🏰 2 Tours Ativos"
          }), /* @__PURE__ */ jsx("div", {
            className: "pmy-cal-info-line",
            children: "👥 Vagas: 14/20"
          }), (day === 26 || day === 28) && /* @__PURE__ */ jsx("div", {
            className: "pmy-calendar-dot"
          })]
        }, day);
      });
    }
    const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay();
    const pad = firstDayIndex === 0 ? 6 : firstDayIndex - 1;
    const totalDays = new Date(currentYear, currentMonth + 1, 0).getDate();
    let cells = [];
    for (let p = 0; p < pad; p++) cells.push(/* @__PURE__ */ jsx("div", {
      className: "pmy-calendar-day empty",
      style: {
        opacity: 0.15,
        cursor: "default",
        background: "none",
        border: "none"
      }
    }, `e-${p}`));
    for (let day = 1; day <= totalDays; day++) {
      const wn = weekdays[(day + pad - 1) % 7] || weekdays[0];
      cells.push(/* @__PURE__ */ jsxs("div", {
        className: `pmy-calendar-day ${selectedCalendarDay === day ? "active" : ""}`,
        onClick: () => {
          setSelectedCalendarDay(day);
          setModalSelectedTour("");
          setIsFormAllocating(false);
          setActiveModal("calendarDay");
        },
        children: [/* @__PURE__ */ jsxs("div", {
          className: "pmy-cal-date-line",
          children: [day, " - ", wn.split("-")[0]]
        }), /* @__PURE__ */ jsx("div", {
          className: "pmy-cal-info-line",
          children: "🏰 2 Tours Ativos"
        }), /* @__PURE__ */ jsx("div", {
          className: "pmy-cal-info-line",
          children: "👥 Vagas: 14/20"
        }), (day === 26 || day === 12 || day === 18) && /* @__PURE__ */ jsx("div", {
          className: "pmy-calendar-dot"
        })]
      }, `d-${day}`));
    }
    return cells;
  };
  const platformTokenGuide = {
    shopify: null,
    // Shopify não precisa de token — já conectado via app
    viator: {
      steps: ["Acesse o portal de fornecedores: supplier.viator.com", "Faça login com sua conta de operador", "Vá em Account → API Settings → Generate API Key", "Copie a chave e cole no campo abaixo"],
      field1Label: "API Key do Fornecedor Viator",
      field1Placeholder: "Ex: PARTNER-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
      field2Label: null
    },
    getyourguide: {
      steps: ["Acesse o Supplier Portal: supplier.getyourguide.com", "Faça login e vá em Settings → API Access", "Clique em Create Token e copie o Bearer Token gerado", "Cole no campo abaixo"],
      field1Label: "Bearer Token GetYourGuide",
      field1Placeholder: "Ex: eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
      field2Label: null
    },
    headout: {
      steps: ["Acesse: www.headout.com/partner/login", "Faça login com sua conta de parceiro Headout", "Vá em Settings → Developer → API Keys", "Gere uma nova chave e copie o token"],
      field1Label: "API Key Headout",
      field1Placeholder: "Ex: hdo_live_xxxxxxxxxxxxxxxxxxxxxxxx",
      field2Label: "Partner ID (obrigatório)",
      field2Placeholder: "Ex: 4821"
    },
    civitatis: {
      steps: ["Acesse o portal de operadores: operadores.civitatis.com", "Faça login com sua conta de operador Civitatis", "Vá em Mi Cuenta → Configuración → Acceso API", "Copie o Token de Acceso e cole abaixo"],
      field1Label: "Token de Acceso Civitatis",
      field1Placeholder: "Ex: civ_live_xxxxxxxxxxxxxxxxxxxx",
      field2Label: "Operator ID",
      field2Placeholder: "Ex: OP-2204"
    },
    tripadvisor: {
      steps: ["Acesse: developer-tripadvisor.com/register", "Registe-se como parceiro e aguarde aprovação (1-3 dias úteis)", "Após aprovado, vá em Dashboard → My Apps → API Key", "Copie a chave e cole abaixo"],
      field1Label: "API Key TripAdvisor",
      field1Placeholder: "Ex: XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
      field2Label: null
    }
  };
  const renderConnectModal = () => {
    if (!connectingPlatform) return null;
    const platform = allPlatforms.find((p) => p.key === connectingPlatform);
    if (!platform) return null;
    const conn = platformConnections[connectingPlatform];
    const guide = platformTokenGuide[connectingPlatform];
    const isShopify = connectingPlatform === "shopify";
    return /* @__PURE__ */ jsx("div", {
      className: "pmy-modal-overlay",
      onClick: () => setConnectingPlatform(null),
      children: /* @__PURE__ */ jsxs("div", {
        className: "pmy-connect-modal",
        style: {
          maxHeight: "90vh",
          overflowY: "auto"
        },
        onClick: (e) => e.stopPropagation(),
        children: [/* @__PURE__ */ jsxs("div", {
          style: {
            padding: "25px 25px 0",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start"
          },
          children: [/* @__PURE__ */ jsxs("div", {
            style: {
              flex: 1,
              textAlign: "center"
            },
            children: [/* @__PURE__ */ jsx("span", {
              style: {
                fontSize: "50px",
                display: "block",
                marginBottom: "8px"
              },
              children: platform.logo
            }), /* @__PURE__ */ jsx("div", {
              style: {
                fontSize: "21px",
                fontWeight: "900",
                color: "var(--text-dark)",
                marginBottom: "5px"
              },
              children: platform.name
            }), /* @__PURE__ */ jsx("div", {
              style: {
                fontSize: "13px",
                color: "var(--text-muted)",
                marginBottom: "18px"
              },
              children: conn.connected ? `Conectado como: ${conn.accountName} · Último sync: ${conn.lastSync}` : isShopify ? "Já conectado automaticamente via Shopify App" : "Siga as instruções abaixo para conectar"
            })]
          }), /* @__PURE__ */ jsx("button", {
            onClick: () => setConnectingPlatform(null),
            style: {
              background: "none",
              border: "none",
              fontSize: "24px",
              cursor: "pointer",
              color: "#aaa",
              marginLeft: "10px"
            },
            children: "×"
          })]
        }), /* @__PURE__ */ jsxs("div", {
          style: {
            padding: "0 25px 25px"
          },
          children: [isShopify && /* @__PURE__ */ jsxs("div", {
            children: [/* @__PURE__ */ jsxs("div", {
              style: {
                background: "#f0fdf4",
                border: "1px solid #b8e6b8",
                borderRadius: "12px",
                padding: "18px",
                marginBottom: "18px"
              },
              children: [/* @__PURE__ */ jsxs("div", {
                style: {
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  marginBottom: "10px"
                },
                children: [/* @__PURE__ */ jsx("span", {
                  style: {
                    fontSize: "22px"
                  },
                  children: "✅"
                }), /* @__PURE__ */ jsx("strong", {
                  style: {
                    fontSize: "15px",
                    color: "var(--primary-green)"
                  },
                  children: "Shopify conectado automaticamente"
                })]
              }), /* @__PURE__ */ jsxs("div", {
                style: {
                  fontSize: "13px",
                  color: "#444",
                  lineHeight: "1.8"
                },
                children: [/* @__PURE__ */ jsxs("div", {
                  children: ["🏢 Loja: ", /* @__PURE__ */ jsx("strong", {
                    children: conn.accountName
                  })]
                }), /* @__PURE__ */ jsxs("div", {
                  children: ["🔄 Último sync: ", /* @__PURE__ */ jsx("strong", {
                    children: conn.lastSync
                  })]
                }), /* @__PURE__ */ jsxs("div", {
                  children: ["⚙️ Método: ", /* @__PURE__ */ jsx("strong", {
                    children: "Shopify Admin API (OAuth interno do app)"
                  })]
                })]
              })]
            }), /* @__PURE__ */ jsxs("div", {
              style: {
                background: "#fffbeb",
                border: "1px solid #fcd34d",
                borderRadius: "10px",
                padding: "14px 16px",
                marginBottom: "18px",
                fontSize: "13px",
                color: "#92400e",
                lineHeight: "1.6"
              },
              children: [/* @__PURE__ */ jsx("strong", {
                children: "ℹ️ Não precisa de token manual."
              }), " Este app já acessa sua loja via autenticação OAuth do Shopify. Os produtos são puxados automaticamente pelo servidor. Se os produtos não aparecerem, verifique se existem produtos cadastrados em ", /* @__PURE__ */ jsx("strong", {
                children: "Produtos → Todos os produtos"
              }), " no seu painel Shopify e recarregue a página."]
            }), /* @__PURE__ */ jsxs("div", {
              style: {
                display: "flex",
                gap: "10px"
              },
              children: [/* @__PURE__ */ jsx("button", {
                className: "pmy-btn-submit",
                onClick: () => {
                  setConnectingPlatform(null);
                  window.location.reload();
                },
                style: {
                  flex: 1
                },
                children: "🔄 Recarregar e Sincronizar Produtos"
              }), /* @__PURE__ */ jsx("button", {
                onClick: () => window.open("https://admin.shopify.com/store/products", "_blank"),
                style: {
                  flex: 1,
                  background: "#f5f5f5",
                  border: "1px solid #ddd",
                  borderRadius: "8px",
                  padding: "12px",
                  fontWeight: "700",
                  fontSize: "13px",
                  cursor: "pointer",
                  color: "#555"
                },
                children: "Ver Produtos ↗"
              })]
            })]
          }), !isShopify && conn.connected && /* @__PURE__ */ jsxs("div", {
            children: [/* @__PURE__ */ jsxs("div", {
              style: {
                background: "#f0fdf4",
                border: "1px solid #b8e6b8",
                borderRadius: "12px",
                padding: "18px",
                marginBottom: "18px"
              },
              children: [/* @__PURE__ */ jsxs("div", {
                style: {
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  marginBottom: "10px"
                },
                children: [/* @__PURE__ */ jsx("span", {
                  style: {
                    fontSize: "22px"
                  },
                  children: "✅"
                }), /* @__PURE__ */ jsx("strong", {
                  style: {
                    fontSize: "15px",
                    color: "var(--primary-green)"
                  },
                  children: "Integração Ativa"
                })]
              }), /* @__PURE__ */ jsxs("div", {
                style: {
                  fontSize: "13px",
                  color: "#444",
                  lineHeight: "1.8"
                },
                children: [/* @__PURE__ */ jsxs("div", {
                  children: ["🏢 Conta: ", /* @__PURE__ */ jsx("strong", {
                    children: conn.accountName
                  })]
                }), /* @__PURE__ */ jsxs("div", {
                  children: ["🔄 Último sync: ", /* @__PURE__ */ jsx("strong", {
                    children: conn.lastSync
                  })]
                }), /* @__PURE__ */ jsxs("div", {
                  children: ["📋 Campos mapeados: ", /* @__PURE__ */ jsx("strong", {
                    children: "11 / 11"
                  })]
                })]
              })]
            }), /* @__PURE__ */ jsxs("div", {
              style: {
                display: "flex",
                gap: "10px"
              },
              children: [/* @__PURE__ */ jsx("button", {
                className: "pmy-btn-submit",
                onClick: () => setConnectingPlatform(null),
                style: {
                  flex: 1
                },
                children: "Fechar"
              }), /* @__PURE__ */ jsx("button", {
                onClick: () => {
                  handleDisconnect(connectingPlatform);
                  setConnectingPlatform(null);
                },
                style: {
                  flex: 1,
                  background: "#fff0f0",
                  border: "1px solid #fcc",
                  color: "#cc0000",
                  borderRadius: "8px",
                  padding: "12px",
                  fontWeight: "700",
                  fontSize: "13px",
                  cursor: "pointer"
                },
                children: "Desconectar"
              })]
            })]
          }), !isShopify && !conn.connected && guide && /* @__PURE__ */ jsxs("div", {
            children: [/* @__PURE__ */ jsxs("div", {
              style: {
                background: "#f8f8f8",
                border: "1px solid #eee",
                borderRadius: "10px",
                padding: "16px",
                marginBottom: "18px"
              },
              children: [/* @__PURE__ */ jsx("div", {
                style: {
                  fontSize: "12px",
                  fontWeight: "800",
                  color: "var(--text-muted)",
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                  marginBottom: "12px"
                },
                children: "📋 Como obter sua chave de API"
              }), /* @__PURE__ */ jsx("ol", {
                style: {
                  paddingLeft: "18px",
                  margin: 0,
                  display: "flex",
                  flexDirection: "column",
                  gap: "8px"
                },
                children: guide.steps.map((step, i) => /* @__PURE__ */ jsxs("li", {
                  style: {
                    fontSize: "13px",
                    color: "#444",
                    lineHeight: "1.5"
                  },
                  children: [step, i === 0 && /* @__PURE__ */ jsx("button", {
                    onClick: () => window.open(platform.oauthUrl, "_blank", "width=960,height=700"),
                    style: {
                      marginLeft: "8px",
                      background: "none",
                      border: "none",
                      color: "var(--primary-green)",
                      fontWeight: "700",
                      fontSize: "12px",
                      cursor: "pointer",
                      textDecoration: "underline"
                    },
                    children: "Abrir ↗"
                  })]
                }, i))
              })]
            }), /* @__PURE__ */ jsxs("div", {
              style: {
                background: "#fafafa",
                border: "1px solid #eee",
                borderRadius: "10px",
                padding: "16px",
                marginBottom: "16px"
              },
              children: [/* @__PURE__ */ jsx("div", {
                style: {
                  fontSize: "12px",
                  fontWeight: "800",
                  color: "var(--text-muted)",
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                  marginBottom: "12px"
                },
                children: "🔑 Cole suas credenciais aqui"
              }), /* @__PURE__ */ jsxs("div", {
                className: "pmy-form-group",
                style: {
                  marginBottom: "12px"
                },
                children: [/* @__PURE__ */ jsxs("label", {
                  style: {
                    fontSize: "12px",
                    fontWeight: "700",
                    color: "#555",
                    marginBottom: "5px",
                    display: "block"
                  },
                  children: [guide.field1Label, " ", /* @__PURE__ */ jsx("span", {
                    style: {
                      color: "#cc0000"
                    },
                    children: "*"
                  })]
                }), /* @__PURE__ */ jsx("input", {
                  type: "password",
                  className: "pmy-form-input",
                  placeholder: guide.field1Placeholder,
                  value: apiKeyInput,
                  onChange: (e) => setApiKeyInput(e.target.value)
                })]
              }), guide.field2Label && /* @__PURE__ */ jsxs("div", {
                className: "pmy-form-group",
                style: {
                  marginBottom: "4px"
                },
                children: [/* @__PURE__ */ jsxs("label", {
                  style: {
                    fontSize: "12px",
                    fontWeight: "700",
                    color: "#555",
                    marginBottom: "5px",
                    display: "block"
                  },
                  children: [guide.field2Label, " ", /* @__PURE__ */ jsx("span", {
                    style: {
                      color: "#cc0000"
                    },
                    children: "*"
                  })]
                }), /* @__PURE__ */ jsx("input", {
                  type: "text",
                  className: "pmy-form-input",
                  placeholder: guide.field2Placeholder || "",
                  value: apiSecretInput,
                  onChange: (e) => setApiSecretInput(e.target.value)
                })]
              })]
            }), /* @__PURE__ */ jsxs("button", {
              className: "pmy-btn-submit",
              onClick: () => handleConfirmConnect(connectingPlatform),
              disabled: !apiKeyInput.trim() || guide.field2Label && !apiSecretInput.trim(),
              style: {
                opacity: !apiKeyInput.trim() || guide.field2Label && !apiSecretInput.trim() ? 0.5 : 1
              },
              children: ["✓ Ativar Integração com ", platform.name]
            }), /* @__PURE__ */ jsx("div", {
              style: {
                marginTop: "14px",
                textAlign: "center"
              },
              children: /* @__PURE__ */ jsxs("a", {
                href: platform.docsUrl,
                target: "_blank",
                rel: "noreferrer",
                style: {
                  fontSize: "12px",
                  color: "#888",
                  textDecoration: "none"
                },
                children: ["📖 Documentação oficial da API ", platform.name, " ↗"]
              })
            })]
          })]
        })]
      })
    });
  };
  const renderModal = () => {
    if (!activeModal) return null;
    let title = "", content = null;
    if (activeModal === "calendarDay") {
      title = `📅 Grade do Dia ${selectedCalendarDay} de ${currentMonthLabel} de ${currentYear}`;
      const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay();
      const pad = firstDayIndex === 0 ? 6 : firstDayIndex - 1;
      const dowIndex = (selectedCalendarDay + pad - 1) % 7;
      const isDOWBlocked = blockRecurringDays && blockRecurringDays.replace(/\s/g, "").split(",").includes(String(dowIndex));
      const isDateBlocked = blockDateTime && (/* @__PURE__ */ new Date(blockDateTime + "T00:00:00")).getDate() === selectedCalendarDay && (/* @__PURE__ */ new Date(blockDateTime + "T00:00:00")).getMonth() === currentMonth;
      const isBlocked = isDOWBlocked || isDateBlocked;
      content = /* @__PURE__ */ jsxs("div", {
        children: [/* @__PURE__ */ jsx("h4", {
          style: {
            fontSize: "15px",
            color: "#555",
            marginBottom: "12px"
          },
          children: "Eventos Ativos Agendados:"
        }), /* @__PURE__ */ jsx("div", {
          style: {
            background: "#f9f9f9",
            padding: "15px",
            borderRadius: "8px",
            border: "1px solid #eee",
            marginBottom: "20px"
          },
          children: selectedCalendarDay === 26 ? tours == null ? void 0 : tours.map((tour, i) => /* @__PURE__ */ jsxs("div", {
            style: {
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "10px 0",
              borderBottom: i === tours.length - 1 ? "none" : "1px solid #eee"
            },
            children: [/* @__PURE__ */ jsx("span", {
              style: {
                fontWeight: "bold",
                fontSize: "14px"
              },
              children: tour.title
            }), /* @__PURE__ */ jsxs("div", {
              className: "pmy-guide-mini-tag",
              children: [/* @__PURE__ */ jsx("img", {
                src: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=50&q=80",
                alt: "Renan",
                className: "pmy-guide-mini-img"
              }), /* @__PURE__ */ jsx("span", {
                children: "Renan (09:00)"
              })]
            })]
          }, tour.id)) : /* @__PURE__ */ jsx("p", {
            style: {
              color: "#999",
              fontSize: "14px",
              textAlign: "center",
              padding: "10px 0"
            },
            children: "Nenhum tour escalado para este dia."
          })
        }), /* @__PURE__ */ jsx("hr", {
          style: {
            border: "none",
            borderTop: "1px solid #eee",
            margin: "20px 0"
          }
        }), isBlocked ? /* @__PURE__ */ jsx("div", {
          style: {
            padding: "15px",
            background: "#ffe6e6",
            border: "1px solid #cc0000",
            color: "#cc0000",
            borderRadius: "8px",
            fontWeight: "bold",
            fontSize: "13px",
            lineHeight: "1.4"
          },
          children: "🔒 Alocação Suspensa: Este dia está bloqueado nas configurações centrais do sistema."
        }) : /* @__PURE__ */ jsx("div", {
          children: !isFormAllocating ? /* @__PURE__ */ jsx("button", {
            type: "button",
            className: "pmy-btn-submit",
            onClick: () => setIsFormAllocating(true),
            children: "+ Adicionar Novo Tour a este Dia"
          }) : /* @__PURE__ */ jsxs("div", {
            style: {
              display: "flex",
              flexDirection: "column",
              gap: "15px",
              background: "#f5fcf5",
              padding: "20px",
              borderRadius: "10px",
              border: "1px solid #e0f0e0"
            },
            children: [/* @__PURE__ */ jsx("h4", {
              style: {
                color: "var(--primary-green)",
                fontWeight: "bold",
                fontSize: "15px"
              },
              children: "➕ Escalar Passeio na Folha Diária"
            }), /* @__PURE__ */ jsxs("div", {
              className: "pmy-form-box-item",
              style: {
                display: "flex",
                flexDirection: "column",
                gap: "5px"
              },
              children: [/* @__PURE__ */ jsx("label", {
                style: {
                  fontSize: "13px",
                  fontWeight: "700"
                },
                children: "Selecione o Tour"
              }), /* @__PURE__ */ jsxs("select", {
                className: "pmy-form-input",
                value: modalSelectedTour,
                onChange: (e) => handleModalTourChange(e.target.value),
                required: true,
                children: [/* @__PURE__ */ jsx("option", {
                  value: "",
                  children: "-- Selecione o Tour --"
                }), tours == null ? void 0 : tours.map((t2) => /* @__PURE__ */ jsx("option", {
                  value: t2.id,
                  children: t2.title
                }, t2.id))]
              })]
            }), modalSelectedTour && /* @__PURE__ */ jsxs("div", {
              className: "pmy-form-box-item",
              style: {
                display: "flex",
                flexDirection: "column",
                gap: "5px"
              },
              children: [/* @__PURE__ */ jsx("label", {
                style: {
                  fontSize: "13px",
                  fontWeight: "700"
                },
                children: "Selecione o Horário:"
              }), /* @__PURE__ */ jsx("select", {
                className: "pmy-form-input",
                children: modalAvailableHours.map((h) => /* @__PURE__ */ jsx("option", {
                  value: h,
                  children: h
                }, h))
              })]
            }), /* @__PURE__ */ jsxs("div", {
              className: "pmy-form-box-item",
              style: {
                display: "flex",
                flexDirection: "column",
                gap: "5px"
              },
              children: [/* @__PURE__ */ jsx("label", {
                style: {
                  fontSize: "13px",
                  fontWeight: "700"
                },
                children: "Selecione o Guia:"
              }), /* @__PURE__ */ jsx("select", {
                className: "pmy-form-input",
                children: guidesList.map((g) => /* @__PURE__ */ jsx("option", {
                  value: g.id,
                  children: g.name
                }, g.id))
              })]
            }), /* @__PURE__ */ jsx("button", {
              type: "button",
              className: "pmy-btn-submit",
              onClick: () => {
                setActiveModal(null);
                setIsFormAllocating(false);
              },
              children: "Confirmar e Publicar Escala"
            })]
          })
        })]
      });
    } else if (activeModal === "guideDetails" && selectedGuideInfo) {
      title = `Detalhes do Guia`;
      content = /* @__PURE__ */ jsxs("div", {
        children: [/* @__PURE__ */ jsxs("div", {
          style: {
            display: "flex",
            gap: "20px",
            alignItems: "center",
            marginBottom: "20px",
            borderBottom: "1px solid #eee",
            paddingBottom: "20px"
          },
          children: [/* @__PURE__ */ jsx("img", {
            src: selectedGuideInfo.photo,
            alt: selectedGuideInfo.name,
            style: {
              width: "80px",
              height: "80px",
              borderRadius: "16px",
              objectFit: "cover"
            }
          }), /* @__PURE__ */ jsxs("div", {
            children: [/* @__PURE__ */ jsx("h2", {
              style: {
                fontSize: "22px",
                fontWeight: "bold",
                color: "var(--text-dark)",
                margin: "0 0 5px 0"
              },
              children: selectedGuideInfo.name
            }), /* @__PURE__ */ jsxs("div", {
              style: {
                fontSize: "13px",
                color: "#666"
              },
              children: ["✉️ ", selectedGuideInfo.email || "N/A"]
            }), /* @__PURE__ */ jsxs("div", {
              style: {
                fontSize: "13px",
                color: "#666",
                marginTop: "4px"
              },
              children: ["📱 ", selectedGuideInfo.whatsapp || "N/A"]
            })]
          })]
        }), /* @__PURE__ */ jsx("h4", {
          style: {
            fontSize: "15px",
            color: "var(--primary-green)",
            fontWeight: "bold",
            marginBottom: "10px"
          },
          children: "Próximos 7 Tours Atribuídos:"
        }), /* @__PURE__ */ jsxs("div", {
          style: {
            background: "#f9f9f9",
            padding: "15px",
            borderRadius: "8px",
            border: "1px solid #eee",
            marginBottom: "20px"
          },
          children: [/* @__PURE__ */ jsxs("div", {
            className: "pmy-list-item",
            style: {
              padding: "8px 0"
            },
            children: [/* @__PURE__ */ jsx("span", {
              children: "🏰 Sintra e Cascais Completo"
            }), /* @__PURE__ */ jsx("strong", {
              children: "Amanhã, 09:00"
            })]
          }), /* @__PURE__ */ jsxs("div", {
            className: "pmy-list-item",
            style: {
              padding: "8px 0"
            },
            children: [/* @__PURE__ */ jsx("span", {
              children: "🏰 Fátima, Batalha e Nazaré"
            }), /* @__PURE__ */ jsx("strong", {
              children: "28/Maio, 08:30"
            })]
          }), /* @__PURE__ */ jsxs("div", {
            className: "pmy-list-item",
            style: {
              padding: "8px 0",
              borderBottom: "none"
            },
            children: [/* @__PURE__ */ jsx("span", {
              children: "🚶‍♂️ Lisboa Walking Tour (Baixa)"
            }), /* @__PURE__ */ jsx("strong", {
              children: "30/Maio, 14:00"
            })]
          })]
        }), /* @__PURE__ */ jsx("h4", {
          style: {
            fontSize: "15px",
            color: "#555",
            fontWeight: "bold",
            marginBottom: "10px"
          },
          children: "Horários Disponíveis Padrão:"
        }), /* @__PURE__ */ jsxs("div", {
          style: {
            display: "flex",
            gap: "10px"
          },
          children: [/* @__PURE__ */ jsx("span", {
            className: "pmy-tag",
            style: {
              background: "#e6f2e6",
              color: "var(--primary-green)",
              fontSize: "12px"
            },
            children: "Segunda a Sábado"
          }), /* @__PURE__ */ jsx("span", {
            className: "pmy-tag",
            style: {
              background: "#e6f2e6",
              color: "var(--primary-green)",
              fontSize: "12px"
            },
            children: "08:00 - 18:00"
          })]
        })]
      });
    } else if (activeModal === "sales") {
      title = t.modal_sales_details;
      content = /* @__PURE__ */ jsx("div", {
        children: (tours == null ? void 0 : tours.length) === 0 ? /* @__PURE__ */ jsx("p", {
          children: "Nenhum passeio cadastrado."
        }) : tours == null ? void 0 : tours.map((tour) => {
          const tb = (tour == null ? void 0 : tour.bookings) || [];
          const total = tb.filter((b) => b.status === "CONFIRMED").length;
          return /* @__PURE__ */ jsx("div", {
            className: "pmy-list-item",
            style: {
              flexDirection: "column",
              alignItems: "flex-start"
            },
            children: /* @__PURE__ */ jsxs("div", {
              style: {
                width: "100%",
                display: "flex",
                justifyContent: "space-between"
              },
              children: [/* @__PURE__ */ jsx("strong", {
                children: tour.title || "Tour sem título"
              }), /* @__PURE__ */ jsxs("span", {
                style: {
                  fontWeight: "bold",
                  color: "var(--primary-green)"
                },
                children: [total, " ", t.dash_bookings]
              })]
            })
          }, tour.id);
        })
      });
    } else if (activeModal === "canceled") {
      title = t.modal_canceled_details;
      content = /* @__PURE__ */ jsx("div", {
        children: realCanceledBookings.length === 0 ? /* @__PURE__ */ jsx("p", {
          style: {
            textAlign: "center",
            color: "#999"
          },
          children: "Nenhum cancelamento registrado."
        }) : realCanceledBookings.map((b) => /* @__PURE__ */ jsxs("div", {
          className: "pmy-list-item",
          children: [/* @__PURE__ */ jsx("div", {
            children: /* @__PURE__ */ jsx("strong", {
              children: b.customerName || "N/A"
            })
          }), /* @__PURE__ */ jsx("span", {
            className: "pmy-tag gyg",
            children: b.platform
          })]
        }, b.id))
      });
    } else if (["confirmed", "estimated", "upcoming"].includes(activeModal)) {
      title = activeModal === "confirmed" ? t.modal_confirmed_details : activeModal === "estimated" ? t.modal_estimated_details : t.modal_upcoming_details;
      content = /* @__PURE__ */ jsx("div", {
        style: {
          textAlign: "center",
          padding: "40px 0",
          color: "#888"
        },
        children: "Detalhamentos aparecerão nesta seção."
      });
    }
    return /* @__PURE__ */ jsx("div", {
      className: "pmy-modal-overlay",
      onClick: () => setActiveModal(null),
      children: /* @__PURE__ */ jsxs("div", {
        className: "pmy-modal",
        onClick: (e) => e.stopPropagation(),
        children: [/* @__PURE__ */ jsxs("div", {
          className: "pmy-modal-header",
          children: [/* @__PURE__ */ jsx("div", {
            className: "pmy-modal-title",
            children: title
          }), /* @__PURE__ */ jsx("button", {
            className: "pmy-modal-close",
            onClick: () => setActiveModal(null),
            children: "×"
          })]
        }), /* @__PURE__ */ jsx("div", {
          className: "pmy-modal-body",
          children: content
        })]
      })
    });
  };
  const renderEditGuideModal = () => {
    if (!editingGuide) return null;
    const guide = guidesList.find((g) => g.id === editingGuide);
    if (!guide) return null;
    const currentDdi = ddiList.find((d) => d.code === editGuideDdi) || {
      iso: "PT"
    };
    return /* @__PURE__ */ jsx("div", {
      className: "pmy-modal-overlay",
      onClick: () => setEditingGuide(null),
      children: /* @__PURE__ */ jsxs("div", {
        style: {
          background: "#fff",
          width: "480px",
          maxWidth: "95vw",
          borderRadius: "20px",
          boxShadow: "0 24px 60px rgba(0,0,0,0.18)",
          overflow: "hidden"
        },
        onClick: (e) => e.stopPropagation(),
        children: [/* @__PURE__ */ jsxs("div", {
          style: {
            background: "var(--primary-green)",
            padding: "22px 26px 20px",
            position: "relative"
          },
          children: [/* @__PURE__ */ jsxs("div", {
            style: {
              display: "flex",
              alignItems: "center",
              gap: "15px"
            },
            children: [/* @__PURE__ */ jsxs("div", {
              style: {
                position: "relative"
              },
              children: [/* @__PURE__ */ jsx("img", {
                src: editGuidePhoto || guide.photo,
                alt: guide.name,
                style: {
                  width: "62px",
                  height: "62px",
                  borderRadius: "14px",
                  objectFit: "cover",
                  border: "2.5px solid rgba(255,255,255,0.35)",
                  display: "block"
                }
              }), /* @__PURE__ */ jsx("button", {
                type: "button",
                onClick: () => editGuidePhotoRef.current.click(),
                style: {
                  position: "absolute",
                  bottom: "-7px",
                  right: "-7px",
                  width: "22px",
                  height: "22px",
                  borderRadius: "50%",
                  background: "#fff",
                  border: "none",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "11px",
                  boxShadow: "0 2px 6px rgba(0,0,0,0.2)"
                },
                children: "📷"
              }), /* @__PURE__ */ jsx("input", {
                type: "file",
                accept: "image/*",
                style: {
                  display: "none"
                },
                ref: editGuidePhotoRef,
                onChange: handleEditGuidePhotoChange
              })]
            }), /* @__PURE__ */ jsxs("div", {
              children: [/* @__PURE__ */ jsx("div", {
                style: {
                  color: "rgba(255,255,255,0.65)",
                  fontSize: "11px",
                  fontWeight: "700",
                  marginBottom: "3px",
                  textTransform: "uppercase",
                  letterSpacing: "0.5px"
                },
                children: "Editando guia"
              }), /* @__PURE__ */ jsx("div", {
                style: {
                  color: "#fff",
                  fontSize: "19px",
                  fontWeight: "900"
                },
                children: guide.name
              })]
            })]
          }), /* @__PURE__ */ jsx("button", {
            onClick: () => setEditingGuide(null),
            style: {
              position: "absolute",
              top: "14px",
              right: "18px",
              background: "rgba(255,255,255,0.18)",
              border: "none",
              borderRadius: "50%",
              width: "30px",
              height: "30px",
              cursor: "pointer",
              color: "#fff",
              fontSize: "18px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            },
            children: "×"
          })]
        }), /* @__PURE__ */ jsxs("form", {
          onSubmit: handleSaveEditGuide,
          style: {
            padding: "26px"
          },
          children: [/* @__PURE__ */ jsxs("div", {
            style: {
              display: "flex",
              flexDirection: "column",
              gap: "15px"
            },
            children: [/* @__PURE__ */ jsxs("div", {
              className: "pmy-form-group",
              style: {
                marginBottom: 0
              },
              children: [/* @__PURE__ */ jsx("label", {
                children: "Nome e Sobrenome"
              }), /* @__PURE__ */ jsx("input", {
                type: "text",
                className: "pmy-form-input",
                value: editGuideName,
                onChange: (e) => setEditGuideName(e.target.value),
                required: true
              })]
            }), /* @__PURE__ */ jsxs("div", {
              className: "pmy-form-group",
              style: {
                marginBottom: 0
              },
              children: [/* @__PURE__ */ jsx("label", {
                children: "E-mail"
              }), /* @__PURE__ */ jsx("input", {
                type: "email",
                className: "pmy-form-input",
                value: editGuideEmail,
                onChange: (e) => setEditGuideEmail(e.target.value)
              })]
            }), /* @__PURE__ */ jsxs("div", {
              className: "pmy-form-group",
              style: {
                marginBottom: 0
              },
              children: [/* @__PURE__ */ jsx("label", {
                children: "WhatsApp"
              }), /* @__PURE__ */ jsxs("div", {
                style: {
                  display: "flex",
                  gap: "10px",
                  alignItems: "center"
                },
                children: [/* @__PURE__ */ jsxs("div", {
                  style: {
                    position: "relative",
                    display: "flex",
                    alignItems: "center",
                    flexShrink: 0
                  },
                  children: [/* @__PURE__ */ jsx("img", {
                    src: getFlagUrl(currentDdi.iso),
                    alt: "",
                    style: {
                      position: "absolute",
                      left: "10px",
                      width: "20px",
                      height: "14px",
                      objectFit: "cover",
                      borderRadius: "2px",
                      zIndex: 1,
                      pointerEvents: "none",
                      boxShadow: "0 1px 3px rgba(0,0,0,0.2)"
                    }
                  }), /* @__PURE__ */ jsx("select", {
                    className: "pmy-form-input",
                    style: {
                      width: "120px",
                      paddingLeft: "38px"
                    },
                    value: editGuideDdi,
                    onChange: (e) => setEditGuideDdi(e.target.value),
                    children: ddiList.map((d, i) => /* @__PURE__ */ jsx("option", {
                      value: d.code,
                      children: d.code
                    }, i))
                  })]
                }), /* @__PURE__ */ jsx("input", {
                  type: "tel",
                  className: "pmy-form-input",
                  placeholder: "912 345 678",
                  value: editGuideWhatsapp,
                  onChange: (e) => setEditGuideWhatsapp(e.target.value),
                  required: true
                })]
              })]
            })]
          }), /* @__PURE__ */ jsxs("div", {
            style: {
              display: "flex",
              gap: "10px",
              marginTop: "22px",
              paddingTop: "18px",
              borderTop: "1px solid #f0f0f0"
            },
            children: [/* @__PURE__ */ jsx("button", {
              type: "submit",
              className: "pmy-btn-submit",
              style: {
                flex: 1
              },
              children: "💾 Salvar Alterações"
            }), /* @__PURE__ */ jsx("button", {
              type: "button",
              onClick: () => {
                handleDeleteGuide(editingGuide);
              },
              style: {
                padding: "12px 16px",
                background: "#fff0f0",
                border: "1px solid #fcc",
                color: "#cc0000",
                borderRadius: "8px",
                fontWeight: "700",
                fontSize: "13px",
                cursor: "pointer"
              },
              children: "🗑️"
            }), /* @__PURE__ */ jsx("button", {
              type: "button",
              onClick: () => setEditingGuide(null),
              style: {
                padding: "12px 16px",
                background: "#f5f5f5",
                border: "none",
                color: "#555",
                borderRadius: "8px",
                fontWeight: "700",
                fontSize: "13px",
                cursor: "pointer"
              },
              children: "Cancelar"
            })]
          })]
        })]
      })
    });
  };
  const styles = `
    :root { --bg-color:#F4DCDC; --primary-green:#006600; --primary-hover:#004d00; --text-dark:#2b2b2b; --text-muted:#666666; --card-bg:#ffffff; --border-radius:12px; }
    * { box-sizing:border-box; margin:0; padding:0; font-family:'Assistant',sans-serif; }
    body, html { overflow-x:hidden; background-color:var(--bg-color); }
    .Polaris-Page { padding:0 !important; max-width:100% !important; }
    h1.Polaris-Header-Title { display:none !important; }
    ::-webkit-scrollbar { width:6px; height:0px; }
    ::-webkit-scrollbar-thumb { background:rgba(0,0,0,0.12); border-radius:10px; }

    .pmy-app-container { display:flex; height:100vh; width:100vw; margin-left:-20px; overflow:hidden; }
    .pmy-sidebar { width:260px; background-color:#ffffff; border-right:1px solid rgba(0,0,0,0.05); display:flex; flex-direction:column; box-shadow:2px 0 15px rgba(0,0,0,0.03); flex-shrink:0; }
    .pmy-logo-area { padding:30px 20px; text-align:center; border-bottom:1px solid #f0f0f0; display:flex; justify-content:center; align-items:center; min-height:180px; }
    .pmy-logo-placeholder { width:180px; height:80px; margin:0 auto; border:2px dashed #ccc; border-radius:8px; display:flex; align-items:center; justify-content:center; color:#999; font-weight:bold; }
    .pmy-logo-wrapper { position:relative; width:180px; height:140px; margin:0 auto; display:flex; justify-content:center; align-items:center; border-radius:8px; overflow:hidden; }
    .pmy-logo-image { max-width:100%; max-height:140px; object-fit:contain; }
    .pmy-menu { padding:20px 0; display:flex; flex-direction:column; gap:5px; }
    .pmy-menu-item { padding:12px 25px; margin:0 10px; border-radius:8px; cursor:pointer; color:var(--text-dark); font-weight:600; display:flex; align-items:center; gap:12px; transition:all 0.2s; }
    .pmy-menu-item:hover { background-color:#f5f5f5; }
    .pmy-menu-item.active { background-color:var(--primary-green); color:#ffffff; }
    .pmy-sidebar-footer { margin-top:auto; padding:20px; border-top:1px solid #f0f0f0; display:flex; flex-direction:column; align-items:center; gap:15px; }
    .pmy-lang-pill { display:flex; align-items:center; gap:12px; border:1px solid rgba(0,0,0,0.15); border-radius:30px; padding:8px 16px; background:transparent; user-select:none; }
    .pmy-lang-pill span { cursor:pointer; opacity:0.3; transition:0.2s ease; display:flex; align-items:center; justify-content:center; }
    .pmy-lang-pill span.active { opacity:1; transform:scale(1.1); }
    .pmy-flag-icon { width:24px; height:16px; object-fit:cover; border-radius:2px; box-shadow:0 1px 3px rgba(0,0,0,0.2); }
    .pmy-lang-divider { width:1px; height:18px; background:rgba(0,0,0,0.15); }
    .pmy-credit-text { font-size:12px; color:#999; text-align:center; }
    .pmy-content { flex:1; padding:40px; overflow-y:auto; height:100vh; }
    .pmy-header-top { display:flex; justify-content:space-between; align-items:center; margin-bottom:30px; }
    .pmy-page-title { font-size:28px; font-weight:800; color:var(--primary-green); margin:0; }

    .pmy-grid { display:grid; grid-template-columns:repeat(auto-fit, minmax(210px,1fr)); gap:20px; margin-bottom:30px; }
    .pmy-card { background:var(--card-bg); border-radius:var(--border-radius); padding:22px; box-shadow:0 8px 20px rgba(0,0,0,0.04); border:1px solid rgba(0,0,0,0.02); position:relative; transition:0.2s ease; }
    .pmy-card.has-hover { cursor:pointer; }
    .pmy-card.has-hover:hover { box-shadow:0 12px 25px rgba(0,0,0,0.08); transform:translateY(-3px); }
    .pmy-card-icon { position:absolute; top:22px; right:22px; color:#ddd; transition:0.2s ease; }
    .pmy-card.has-hover:hover .pmy-card-icon { color:var(--primary-green); }
    .pmy-card-title { font-size:14px; color:var(--text-muted); font-weight:600; margin-bottom:10px; padding-right:20px; }
    .pmy-card-value { font-size:32px; font-weight:900; color:var(--primary-green); }

    .pmy-form-box { background:#ffffff; padding:25px; border-radius:var(--border-radius); box-shadow:0 8px 20px rgba(0,0,0,0.04); margin-bottom:25px; border:1px solid rgba(0,0,0,0.02); }
    .pmy-form-box h3 { color:var(--primary-green); margin-bottom:20px; font-weight:800; font-size:18px; border-bottom:1px solid #f5f5f5; padding-bottom:8px; }
    .pmy-form-group { display:flex; flex-direction:column; gap:6px; margin-bottom:15px; }
    .pmy-form-group label { font-size:13px; font-weight:700; color:var(--text-dark); }
    .pmy-form-input { padding:10px 14px; border:1px solid #ddd; border-radius:8px; outline:none; font-size:14px; width:100%; font-family:inherit; }
    .pmy-form-input:focus { border-color:var(--primary-green); }
    .pmy-btn-submit { background:var(--primary-green); color:#fff; font-weight:bold; border:none; padding:12px; border-radius:8px; cursor:pointer; width:100%; font-size:14px; transition:0.2s; }
    .pmy-btn-submit:hover { background:var(--primary-hover); }

    .pmy-calendar-view-tabs { display:flex; gap:5px; background:#eee; padding:4px; border-radius:8px; flex-shrink:0; }
    .pmy-cal-tab { padding:6px 14px; border:none; background:transparent; font-size:12px; font-weight:bold; color:#666; cursor:pointer; border-radius:6px; transition:0.2s; white-space:nowrap; }
    .pmy-cal-tab.active { background:#fff; color:var(--primary-green); box-shadow:0 2px 6px rgba(0,0,0,0.05); }
    .pmy-calendar-month-selector-bar { display:flex; align-items:center; gap:15px; margin-bottom:15px; }
    .pmy-calendar-nav-arrow-btn { background:#ffffff; border:1px solid #ddd; border-radius:50%; width:28px; height:28px; display:flex; align-items:center; justify-content:center; cursor:pointer; font-size:11px; font-weight:bold; transition:0.2s; color:var(--text-dark); }
    .pmy-calendar-nav-arrow-btn:hover { border-color:var(--primary-green); color:var(--primary-green); }
    .pmy-calendar-current-month-year-label { font-size:18px; font-weight:800; color:var(--text-dark); min-width:140px; text-align:center; }
    .pmy-calendar-week-headers { display:grid; grid-template-columns:repeat(7,1fr); gap:8px; text-align:center; font-weight:800; font-size:12px; color:var(--text-muted); margin-bottom:5px; padding:0 15px; }
    .pmy-calendar-grid { display:grid; grid-template-columns:repeat(7,1fr); gap:8px; background:#fff; padding:15px; border-radius:12px; box-shadow:0 8px 20px rgba(0,0,0,0.04); margin-bottom:25px; }
    .pmy-calendar-day { background:#fafafa; padding:14px 12px; border-radius:8px; cursor:pointer; transition:0.2s; border:1px solid #f0f0f0; color:var(--text-dark); min-height:105px; display:flex; flex-direction:column; justify-content:flex-start; gap:6px; text-align:left; position:relative; }
    .pmy-calendar-day:hover { background:#f0f0f0; border-color:var(--primary-green); }
    .pmy-calendar-day.active { background:var(--primary-green); color:#fff; border-color:var(--primary-green); }
    .pmy-cal-date-line { font-size:13px; font-weight:800; border-bottom:1px solid rgba(0,0,0,0.04); padding-bottom:3px; margin-bottom:2px; }
    .pmy-calendar-day.active .pmy-cal-date-line { border-bottom-color:rgba(255,255,255,0.15); }
    .pmy-cal-info-line { font-size:11px; font-weight:600; opacity:0.8; }
    .pmy-calendar-dot { width:6px; height:6px; background:#c99a3c; border-radius:50%; position:absolute; bottom:6px; right:8px; }
    .pmy-calendar-day.active .pmy-calendar-dot { background:#fff; }

    .pmy-capacity-controls { display:flex; align-items:center; gap:10px; background:#f9f9f9; padding:4px 10px; border-radius:20px; border:1px solid #eee; }
    .pmy-cap-btn { background:#fff; border:1px solid #ddd; width:26px; height:26px; border-radius:50%; font-weight:bold; cursor:pointer; display:flex; align-items:center; justify-content:center; font-size:16px; }
    .pmy-cap-btn:hover { border-color:var(--primary-green); color:var(--primary-green); }
    .pmy-tour-item { display:flex; gap:15px; padding:15px 0; border-bottom:1px solid #eee; align-items:center; justify-content:space-between; }
    .pmy-tour-item:last-child { border-bottom:none; }
    .pmy-guide-mini-tag { display:flex; align-items:center; gap:6px; background:#f5f5f5; padding:4px 10px; border-radius:20px; font-size:12px; font-weight:bold; }
    .pmy-guide-mini-img { width:18px; height:18px; border-radius:50%; object-fit:cover; }

    .pmy-accordion-header { display:flex; justify-content:space-between; align-items:center; padding:15px 0; border-bottom:1px solid #eee; cursor:pointer; transition:0.2s; }
    .pmy-accordion-header:hover { color:var(--primary-green); }
    .pmy-accordion-title { font-size:16px; font-weight:700; }
    .pmy-accordion-content { display:none; padding:15px 0; border-bottom:1px solid #eee; }
    .pmy-accordion-content.open { display:block; }
    .pmy-tour-img { width:65px; height:65px; object-fit:cover; box-shadow:0 4px 10px rgba(0,0,0,0.08); transition:border-radius 0.3s ease; background:#eee; }
    .pmy-tour-img.circle { border-radius:50%; }
    .pmy-tour-img.rounded { border-radius:12px; }
    .pmy-tour-details { flex:1; }
    .pmy-tour-name { font-weight:bold; font-size:15px; margin-bottom:6px; color:var(--text-dark); }
    .pmy-format-btn { background:#f0f0f0; border:none; border-radius:20px; padding:6px 14px; font-size:13px; font-weight:bold; color:#555; cursor:pointer; transition:0.2s; }
    .pmy-format-btn:hover { background:#e0e0e0; color:var(--primary-green); }
    .pmy-list-item { display:flex; justify-content:space-between; align-items:center; padding:15px 0; border-bottom:1px solid #eee; }
    .pmy-list-item:last-child { border-bottom:none; }
    .pmy-tag { font-size:11px; padding:3px 8px; border-radius:10px; font-weight:700; }
    .pmy-tag.viator { background:#ffe4cc; color:#cc6600; }
    .pmy-tag.gyg { background:#fff4cc; color:#cc9900; }
    .pmy-tag.site { background:#e6f2e6; color:var(--primary-green); }
    .pmy-tag-row { display:flex; gap:6px; flex-wrap:wrap; margin-top:4px; }

    .pmy-date-wrapper { position:relative; z-index:101; }
    .pmy-date-btn { display:flex; align-items:center; gap:8px; background:#ffffff; border:1px solid rgba(0,0,0,0.1); padding:10px 18px; border-radius:8px; font-weight:600; color:var(--text-dark); cursor:pointer; box-shadow:0 2px 10px rgba(0,0,0,0.02); transition:0.2s; }
    .pmy-date-btn:hover { border-color:var(--primary-green); }
    .pmy-date-overlay { position:fixed; top:0; left:0; width:100vw; height:100vh; z-index:90; background:transparent; }
    .pmy-date-dropdown { position:absolute; right:0; top:calc(100% + 8px); background:#ffffff; border-radius:12px; box-shadow:0 15px 40px rgba(0,0,0,0.15); width:320px; z-index:100; border:1px solid rgba(0,0,0,0.05); display:flex; flex-direction:column; overflow:hidden; }
    .pmy-date-presets { display:grid; grid-template-columns:1fr 1fr; gap:1px; background:#eee; }
    .pmy-date-preset-item { background:#ffffff; padding:10px; font-size:12px; font-weight:bold; cursor:pointer; text-align:center; color:var(--text-dark); transition:0.2s; }
    .pmy-date-preset-item:hover { background:#f9f9f9; color:var(--primary-green); }
    .pmy-date-preset-item.active { background:#e6f2e6; color:var(--primary-green); }
    .pmy-date-custom { padding:15px; display:flex; flex-direction:column; gap:10px; background:#ffffff; }
    .pmy-date-custom-title { font-size:12px; font-weight:700; color:var(--text-muted); }
    .pmy-date-custom-inputs { display:flex; gap:8px; align-items:center; }
    .pmy-date-custom-inputs input { flex:1; padding:8px; border:1px solid #ddd; border-radius:6px; font-family:inherit; font-size:13px; color:var(--text-dark); outline:none; }
    .pmy-date-custom-inputs input:focus { border-color:var(--primary-green); }
    .pmy-date-apply-btn { background:var(--primary-green); color:#fff; border:none; padding:9px; border-radius:6px; font-weight:bold; cursor:pointer; font-size:13px; transition:0.2s; text-align:center; width:100%; }
    .pmy-date-apply-btn:hover { background:var(--primary-hover); }
    .pmy-variants-form-grid { display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-top:5px; }

    .pmy-modal-overlay { position:fixed; top:0; left:0; width:100vw; height:100vh; background:rgba(0,0,0,0.4); backdrop-filter:blur(4px); display:flex; justify-content:center; align-items:center; z-index:9999; }
    .pmy-modal { background:#ffffff; width:600px; max-width:90%; max-height:85vh; border-radius:16px; display:flex; flex-direction:column; overflow:hidden; box-shadow:0 20px 50px rgba(0,0,0,0.15); }
    .pmy-modal-header { padding:20px 25px; border-bottom:1px solid #eee; display:flex; justify-content:space-between; align-items:center; }
    .pmy-modal-title { font-size:20px; font-weight:800; color:var(--primary-green); }
    .pmy-modal-close { background:none; border:none; font-size:28px; cursor:pointer; color:#999; }
    .pmy-modal-body { padding:25px; overflow-y:auto; flex:1; }

    .pmy-guides-grid { display:grid; grid-template-columns:repeat(auto-fill, minmax(130px,1fr)); gap:20px; }
    .pmy-guide-card-square { background:#fdfdfd; border:1px solid #eee; border-radius:16px; padding:15px; display:flex; flex-direction:column; align-items:center; cursor:pointer; transition:0.2s ease; text-align:center; }
    .pmy-guide-card-square:hover { border-color:var(--primary-green); transform:translateY(-3px); box-shadow:0 8px 20px rgba(0,0,0,0.05); }
    .pmy-guide-square-img { width:90px; height:90px; border-radius:16px; object-fit:cover; margin-bottom:12px; background:#eee; }
    .pmy-guide-square-name { font-weight:800; font-size:14px; color:var(--text-dark); line-height:1.2; }
    .pmy-platform-pills { display:flex; flex-wrap:wrap; gap:7px; margin-top:6px; }
    .pmy-platform-pill { display:flex; align-items:center; gap:6px; padding:6px 12px; border-radius:20px; border:1.5px solid #e0e0e0; background:#fff; font-size:12px; font-weight:700; cursor:pointer; transition:all 0.18s; color:#666; user-select:none; }
    .pmy-platform-pill:hover { border-color:var(--primary-green); color:var(--primary-green); }
    .pmy-platform-pill.selected { background:var(--primary-green); border-color:var(--primary-green); color:#fff; }
    .pmy-platform-pill.selected-block { background:#2b2b2b; border-color:#2b2b2b; color:#fff; }
    .pmy-platform-pill.disconnected { opacity:0.35; cursor:not-allowed; }
    .pmy-platform-pill-logo { font-size:14px; line-height:1; }
    .pmy-platform-pill-check { width:14px; height:14px; border-radius:50%; background:rgba(255,255,255,0.3); display:flex; align-items:center; justify-content:center; font-size:9px; font-weight:900; flex-shrink:0; }
    .pmy-platform-count-badge { font-size:10px; background:rgba(255,255,255,0.22); padding:1px 6px; border-radius:10px; font-weight:800; }
    .pmy-guide-edit-btn { flex:1; padding:5px 0; background:#f0f8f0; border:1px solid #c5e0c5; border-radius:6px; font-size:11px; font-weight:700; color:var(--primary-green); cursor:pointer; transition:0.2s; }
    .pmy-guide-edit-btn:hover { background:var(--primary-green); color:#fff; }
    .pmy-guide-delete-btn { padding:5px 9px; background:#fff0f0; border:1px solid #fcc; border-radius:6px; font-size:13px; cursor:pointer; transition:0.2s; }
    .pmy-guide-delete-btn:hover { background:#cc0000; color:#fff; }
    .pmy-int-subtab-bar { display:flex; gap:0; background:#f0f0f0; border-radius:10px; padding:4px; margin-bottom:28px; width:fit-content; }
    .pmy-int-subtab { padding:8px 22px; border:none; background:transparent; font-size:13px; font-weight:700; color:#888; cursor:pointer; border-radius:8px; transition:0.2s; }
    .pmy-int-subtab.active { background:#fff; color:var(--primary-green); box-shadow:0 2px 8px rgba(0,0,0,0.07); }
    .pmy-prod-platform-tabs { display:flex; gap:8px; flex-wrap:wrap; margin-bottom:22px; }
    .pmy-prod-ptab { display:flex; align-items:center; gap:7px; padding:8px 16px; border-radius:20px; border:1.5px solid #ddd; background:#fff; font-size:13px; font-weight:700; cursor:pointer; transition:0.2s; color:#555; }
    .pmy-prod-ptab:hover { border-color:var(--primary-green); color:var(--primary-green); }
    .pmy-prod-ptab.active { background:var(--primary-green); color:#fff; border-color:var(--primary-green); }
    .pmy-prod-ptab.disabled { opacity:0.4; cursor:not-allowed; }
    .pmy-prod-table { width:100%; border-collapse:separate; border-spacing:0 5px; }
    .pmy-prod-table th { font-size:11px; font-weight:800; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.5px; padding:4px 14px; text-align:left; }
    .pmy-prod-row { background:#fafafa; transition:0.15s; }
    .pmy-prod-row:hover { background:#f3f3f3; }
    .pmy-prod-row td { padding:11px 14px; font-size:13px; }
    .pmy-prod-row td:first-child { border-radius:8px 0 0 8px; border-left:3px solid #e0e0e0; }
    .pmy-prod-row.active-prod td:first-child { border-left-color:var(--primary-green); }
    .pmy-prod-row td:last-child { border-radius:0 8px 8px 0; }
    .pmy-prod-status { display:inline-flex; align-items:center; gap:5px; font-size:11px; font-weight:700; padding:3px 9px; border-radius:20px; }
    .pmy-prod-status.on { background:#e6f2e6; color:var(--primary-green); }
    .pmy-prod-status.off { background:#f5f5f5; color:#aaa; }
    .pmy-prod-toggle { position:relative; width:38px; height:20px; cursor:pointer; flex-shrink:0; }
    .pmy-prod-toggle input { opacity:0; width:0; height:0; }
    .pmy-prod-toggle-slider { position:absolute; top:0; left:0; right:0; bottom:0; background:#ddd; border-radius:20px; transition:0.2s; }
    .pmy-prod-toggle-slider:before { content:''; position:absolute; width:14px; height:14px; left:3px; bottom:3px; background:#fff; border-radius:50%; transition:0.2s; }
    .pmy-prod-toggle input:checked + .pmy-prod-toggle-slider { background:var(--primary-green); }
    .pmy-prod-toggle input:checked + .pmy-prod-toggle-slider:before { transform:translateX(18px); }

    /* PLATAFORMAS - CARDS NOVOS */
    .pmy-int-card-v2 { background:#ffffff; border-radius:14px; padding:22px; box-shadow:0 4px 16px rgba(0,0,0,0.04); display:flex; flex-direction:column; border:1.5px solid transparent; transition:0.25s ease; position:relative; overflow:hidden; }
    .pmy-int-card-v2:hover { border-color:var(--primary-green); transform:translateY(-2px); box-shadow:0 10px 30px rgba(0,0,0,0.08); }
    .pmy-int-card-v2.connected { border-color:#b8e6b8; }
    .pmy-int-card-v2.connected::before { content:''; position:absolute; top:0; left:0; right:0; height:3px; background:var(--primary-green); }
    .pmy-int-status-dot { width:8px; height:8px; border-radius:50%; display:inline-block; margin-right:5px; }
    .pmy-int-status-dot.on { background:#22c55e; box-shadow:0 0 0 3px rgba(34,197,94,0.2); }
    .pmy-int-status-dot.off { background:#d1d5db; }
    .pmy-int-top { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:14px; }
    .pmy-int-logo-v2 { font-size:36px; line-height:1; }
    .pmy-int-sync-info { font-size:11px; color:#22c55e; font-weight:600; background:#f0fdf4; padding:3px 8px; border-radius:20px; }
    .pmy-int-name-v2 { font-size:17px; font-weight:800; color:var(--text-dark); margin-bottom:5px; }
    .pmy-int-desc-v2 { font-size:12px; color:var(--text-muted); line-height:1.4; margin-bottom:18px; flex:1; }
    .pmy-int-actions { display:flex; gap:8px; }
    .pmy-int-btn-connect { flex:1; background:var(--primary-green); color:#fff; border:none; padding:10px; border-radius:8px; font-weight:700; font-size:13px; cursor:pointer; transition:0.2s; }
    .pmy-int-btn-connect:hover { background:var(--primary-hover); }
    .pmy-int-btn-settings { background:#f5f5f5; border:1px solid #eee; color:#555; padding:10px 14px; border-radius:8px; font-size:13px; cursor:pointer; transition:0.2s; font-weight:600; }
    .pmy-int-btn-settings:hover { background:#eee; }
    .pmy-int-btn-disconnect { background:#fff0f0; border:1px solid #fcc; color:#cc0000; padding:10px 14px; border-radius:8px; font-size:12px; cursor:pointer; transition:0.2s; font-weight:600; }
    .pmy-int-btn-disconnect:hover { background:#ffe6e6; }

    /* MODAL DE CONEXÃO */
    .pmy-connect-modal { background:#fff; width:480px; max-width:95vw; border-radius:16px; box-shadow:0 20px 60px rgba(0,0,0,0.2); overflow:hidden; }
    .pmy-connect-oauth-btn { width:100%; padding:13px; border-radius:10px; border:1.5px solid #ddd; background:#fff; font-weight:700; font-size:14px; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:10px; transition:0.2s; color:var(--text-dark); margin-bottom:10px; }
    .pmy-connect-oauth-btn:hover { border-color:var(--primary-green); background:#f5fcf5; }

    /* MAPEAMENTO DE CAMPOS */
    .pmy-mapping-platform-tabs { display:flex; gap:6px; flex-wrap:wrap; margin-bottom:20px; }
    .pmy-mapping-tab { padding:7px 14px; border-radius:20px; border:1.5px solid #ddd; background:#fff; font-size:12px; font-weight:700; cursor:pointer; transition:0.2s; color:#555; display:flex; align-items:center; gap:6px; }
    .pmy-mapping-tab:hover { border-color:var(--primary-green); color:var(--primary-green); }
    .pmy-mapping-tab.active { background:var(--primary-green); color:#fff; border-color:var(--primary-green); }
    .pmy-mapping-table { width:100%; border-collapse:separate; border-spacing:0 6px; }
    .pmy-mapping-table th { font-size:11px; font-weight:800; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.5px; padding:0 12px 8px; text-align:left; }
    .pmy-mapping-row { background:#fafafa; }
    .pmy-mapping-row td { padding:10px 12px; font-size:13px; }
    .pmy-mapping-row td:first-child { border-radius:8px 0 0 8px; border-left:3px solid #e8e8e8; font-weight:700; color:var(--text-dark); width:200px; }
    .pmy-mapping-row.active-conn td:first-child { border-left-color:var(--primary-green); }
    .pmy-mapping-row td:last-child { border-radius:0 8px 8px 0; }
    .pmy-mapping-field-input { width:100%; padding:7px 10px; border:1px solid #e5e5e5; border-radius:6px; font-size:12px; font-family:'Courier New',monospace; color:#333; background:#fff; outline:none; transition:0.2s; }
    .pmy-mapping-field-input:focus { border-color:var(--primary-green); background:#f5fcf5; }
    .pmy-mapping-arrow { color:#bbb; font-size:16px; padding:0 8px; text-align:center; }
    .pmy-mapping-internal-label { font-size:12px; color:#888; font-family:'Courier New',monospace; background:#f0f0f0; padding:4px 8px; border-radius:4px; display:inline-block; }
    .pmy-field-badge { display:inline-flex; align-items:center; gap:4px; font-size:10px; padding:2px 7px; border-radius:10px; font-weight:700; white-space:nowrap; }
    .pmy-field-badge.required { background:#fff0f0; color:#cc0000; }
    .pmy-field-badge.optional { background:#f0f0f0; color:#888; }
  `;
  return /* @__PURE__ */ jsxs(Fragment, {
    children: [/* @__PURE__ */ jsx("style", {
      children: styles
    }), /* @__PURE__ */ jsxs("div", {
      className: "pmy-app-container",
      children: [/* @__PURE__ */ jsxs("aside", {
        className: "pmy-sidebar",
        children: [/* @__PURE__ */ jsx("div", {
          className: "pmy-logo-area",
          children: logoUrl ? /* @__PURE__ */ jsx("div", {
            className: "pmy-logo-wrapper",
            children: /* @__PURE__ */ jsx("img", {
              src: logoUrl,
              alt: "Logo",
              className: "pmy-logo-image"
            })
          }) : /* @__PURE__ */ jsx("div", {
            className: "pmy-logo-placeholder",
            children: /* @__PURE__ */ jsx("span", {
              children: "PMY Logo"
            })
          })
        }), /* @__PURE__ */ jsxs("nav", {
          className: "pmy-menu",
          children: [/* @__PURE__ */ jsx("div", {
            className: `pmy-menu-item ${activeTab === "dashboard" ? "active" : ""}`,
            onClick: () => setActiveTab("dashboard"),
            children: t.menu_dashboard
          }), /* @__PURE__ */ jsx("div", {
            className: `pmy-menu-item ${activeTab === "agenda" ? "active" : ""}`,
            onClick: () => setActiveTab("agenda"),
            children: t.menu_agenda
          }), /* @__PURE__ */ jsx("div", {
            className: `pmy-menu-item ${activeTab === "integracoes" ? "active" : ""}`,
            onClick: () => setActiveTab("integracoes"),
            children: t.menu_integrations
          }), /* @__PURE__ */ jsx("div", {
            className: `pmy-menu-item ${activeTab === "guias" ? "active" : ""}`,
            onClick: () => setActiveTab("guias"),
            children: t.menu_guides
          }), /* @__PURE__ */ jsx("div", {
            className: `pmy-menu-item ${activeTab === "automacoes" ? "active" : ""}`,
            onClick: () => setActiveTab("automacoes"),
            children: t.menu_automations
          })]
        }), /* @__PURE__ */ jsxs("div", {
          className: "pmy-sidebar-footer",
          children: [/* @__PURE__ */ jsx("div", {
            style: {
              width: "100%",
              padding: "5px 0"
            },
            children: /* @__PURE__ */ jsx("div", {
              className: `pmy-menu-item ${activeTab === "configuracoes" ? "active" : ""}`,
              style: {
                margin: 0
              },
              onClick: () => setActiveTab("configuracoes"),
              children: t.menu_settings
            })
          }), /* @__PURE__ */ jsxs("div", {
            className: "pmy-lang-pill",
            children: [/* @__PURE__ */ jsx("span", {
              className: lang === "pt" ? "active" : "",
              onClick: () => setLang("pt"),
              children: /* @__PURE__ */ jsx("img", {
                src: "https://flagcdn.com/w40/pt.png",
                alt: "PT",
                className: "pmy-flag-icon"
              })
            }), /* @__PURE__ */ jsx("div", {
              className: "pmy-lang-divider"
            }), /* @__PURE__ */ jsx("span", {
              className: lang === "en" ? "active" : "",
              onClick: () => setLang("en"),
              children: /* @__PURE__ */ jsx("img", {
                src: "https://flagcdn.com/w40/gb.png",
                alt: "EN",
                className: "pmy-flag-icon"
              })
            })]
          }), /* @__PURE__ */ jsx("div", {
            className: "pmy-credit-text",
            children: t.created_by
          })]
        })]
      }), /* @__PURE__ */ jsxs("main", {
        className: "pmy-content",
        children: [/* @__PURE__ */ jsxs("div", {
          className: "pmy-header-top",
          children: [/* @__PURE__ */ jsxs("h1", {
            className: "pmy-page-title",
            children: [activeTab === "dashboard" && t.dash_title, activeTab === "agenda" && t.agenda_title, activeTab === "integracoes" && t.integrations_title, activeTab === "guias" && t.guides_title, activeTab === "automacoes" && t.automations_title, activeTab === "configuracoes" && t.settings_title]
          }), activeTab === "dashboard" && /* @__PURE__ */ jsxs("div", {
            className: "pmy-date-wrapper",
            children: [/* @__PURE__ */ jsxs("button", {
              className: "pmy-date-btn",
              onClick: () => setIsDateMenuOpen(!isDateMenuOpen),
              children: ["📅 ", getPeriodLabel(), " ▾"]
            }), isDateMenuOpen && /* @__PURE__ */ jsxs(Fragment, {
              children: [/* @__PURE__ */ jsx("div", {
                className: "pmy-date-overlay",
                onClick: () => setIsDateMenuOpen(false)
              }), /* @__PURE__ */ jsxs("div", {
                className: "pmy-date-dropdown",
                children: [/* @__PURE__ */ jsx("div", {
                  className: "pmy-date-presets",
                  children: ["period_1w", "period_15d", "period_30d", "period_60d", "period_90d", "period_120d", "period_6m", "period_1y"].map((k) => /* @__PURE__ */ jsx("div", {
                    className: `pmy-date-preset-item ${selectedPeriod === k ? "active" : ""}`,
                    onClick: () => handlePresetSelection(k),
                    children: t[k]
                  }, k))
                }), /* @__PURE__ */ jsxs("div", {
                  className: "pmy-date-custom",
                  children: [/* @__PURE__ */ jsx("div", {
                    className: "pmy-date-custom-title",
                    children: t.period_custom
                  }), /* @__PURE__ */ jsxs("div", {
                    className: "pmy-date-custom-inputs",
                    children: [/* @__PURE__ */ jsx("input", {
                      type: "date",
                      value: customStart,
                      onChange: (e) => setCustomStart(e.target.value)
                    }), /* @__PURE__ */ jsx("span", {
                      style: {
                        color: "#aaa"
                      },
                      children: "-"
                    }), /* @__PURE__ */ jsx("input", {
                      type: "date",
                      value: customEnd,
                      onChange: (e) => setCustomEnd(e.target.value)
                    })]
                  }), /* @__PURE__ */ jsx("button", {
                    className: "pmy-date-apply-btn",
                    onClick: handleCustomDateApply,
                    children: t.btn_apply
                  })]
                })]
              })]
            })]
          })]
        }), activeTab === "dashboard" && /* @__PURE__ */ jsxs("div", {
          children: [/* @__PURE__ */ jsxs("div", {
            className: "pmy-grid",
            children: [/* @__PURE__ */ jsxs("div", {
              className: "pmy-card has-hover",
              onClick: () => setActiveModal("sales"),
              children: [/* @__PURE__ */ jsx(ExpandIcon, {}), /* @__PURE__ */ jsx("div", {
                className: "pmy-card-title",
                children: t.dash_total_sales
              }), /* @__PURE__ */ jsx("div", {
                className: "pmy-card-value",
                children: totalSalesCount
              }), /* @__PURE__ */ jsxs("div", {
                style: {
                  fontSize: "12px",
                  color: "#888",
                  marginTop: "5px"
                },
                children: ["+12% ", t.dash_vs_last_month]
              })]
            }), /* @__PURE__ */ jsxs("div", {
              className: "pmy-card has-hover",
              onClick: () => setActiveModal("confirmed"),
              children: [/* @__PURE__ */ jsx(ExpandIcon, {}), /* @__PURE__ */ jsx("div", {
                className: "pmy-card-title",
                children: t.dash_revenue_confirmed
              }), /* @__PURE__ */ jsxs("div", {
                className: "pmy-card-value",
                children: ["€ ", confirmedRevenueValue.toLocaleString("pt-BR")]
              })]
            }), /* @__PURE__ */ jsxs("div", {
              className: "pmy-card has-hover",
              onClick: () => setActiveModal("estimated"),
              children: [/* @__PURE__ */ jsx(ExpandIcon, {}), /* @__PURE__ */ jsx("div", {
                className: "pmy-card-title",
                children: t.dash_revenue_estimated
              }), /* @__PURE__ */ jsxs("div", {
                className: "pmy-card-value",
                style: {
                  color: "#c99a3c"
                },
                children: ["€ ", estimatedRevenueValue.toLocaleString("pt-BR")]
              })]
            }), /* @__PURE__ */ jsxs("div", {
              className: "pmy-card has-hover",
              onClick: () => setActiveModal("canceled"),
              children: [/* @__PURE__ */ jsx(ExpandIcon, {}), /* @__PURE__ */ jsx("div", {
                className: "pmy-card-title",
                children: t.dash_canceled_tours
              }), /* @__PURE__ */ jsx("div", {
                className: "pmy-card-value",
                style: {
                  color: "#cc0000"
                },
                children: canceledCount
              })]
            }), /* @__PURE__ */ jsxs("div", {
              className: "pmy-card has-hover",
              onClick: () => setActiveModal("upcoming"),
              children: [/* @__PURE__ */ jsx(ExpandIcon, {}), /* @__PURE__ */ jsx("div", {
                className: "pmy-card-title",
                children: t.dash_upcoming
              }), /* @__PURE__ */ jsx("div", {
                className: "pmy-card-value",
                children: upcomingCount
              })]
            })]
          }), /* @__PURE__ */ jsx("div", {
            className: "pmy-grid",
            style: {
              gridTemplateColumns: "1fr"
            },
            children: /* @__PURE__ */ jsxs("div", {
              className: "pmy-card",
              style: {
                padding: "0 25px 25px 25px"
              },
              children: [/* @__PURE__ */ jsx("div", {
                style: {
                  padding: "25px 0 10px 0",
                  borderBottom: "2px solid #f0f0f0"
                },
                children: /* @__PURE__ */ jsx("div", {
                  className: "pmy-card-title",
                  style: {
                    fontSize: "18px",
                    color: "#000",
                    margin: 0
                  },
                  children: t.dash_performance
                })
              }), categoriesData.map((cat) => /* @__PURE__ */ jsxs("div", {
                children: [/* @__PURE__ */ jsxs("div", {
                  className: "pmy-accordion-header",
                  onClick: () => toggleCategory(cat.name),
                  children: [/* @__PURE__ */ jsx("span", {
                    className: "pmy-accordion-title",
                    children: cat.name
                  }), /* @__PURE__ */ jsx("span", {
                    className: "pmy-accordion-arrow",
                    children: "▼"
                  })]
                }), /* @__PURE__ */ jsx("div", {
                  className: `pmy-accordion-content ${openCategories.includes(cat.name) ? "open" : ""}`,
                  children: cat.toursList.length === 0 ? /* @__PURE__ */ jsx("p", {
                    style: {
                      padding: "10px 0",
                      color: "#999",
                      fontSize: "14px"
                    },
                    children: "Nenhum passeio nesta categoria."
                  }) : cat.toursList.map((tour) => {
                    const tb = (tour == null ? void 0 : tour.bookings) || [];
                    return /* @__PURE__ */ jsxs("div", {
                      className: "pmy-tour-item",
                      children: [/* @__PURE__ */ jsx("div", {
                        className: `pmy-tour-img ${imageShape}`,
                        style: {
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "20px",
                          background: "#f9f2f2"
                        },
                        children: "🏰"
                      }), /* @__PURE__ */ jsxs("div", {
                        className: "pmy-tour-details",
                        children: [/* @__PURE__ */ jsx("div", {
                          className: "pmy-tour-name",
                          children: tour.title || "Tour sem título"
                        }), /* @__PURE__ */ jsxs("div", {
                          className: "pmy-tag-row",
                          children: [/* @__PURE__ */ jsxs("span", {
                            className: "pmy-tag viator",
                            children: [t.source_viator, ": ", tb.filter((b) => b.platform === "VIATOR").length * 24 || 120, " ", t.views]
                          }), /* @__PURE__ */ jsxs("span", {
                            className: "pmy-tag gyg",
                            children: [t.source_gyg, ": ", tb.filter((b) => b.platform === "GETYOURGUIDE").length * 32 || 340, " ", t.views]
                          }), /* @__PURE__ */ jsxs("span", {
                            className: "pmy-tag site",
                            children: [t.source_site, ": ", tb.filter((b) => b.platform === "SHOPIFY").length * 12 || 45, " ", t.views]
                          })]
                        })]
                      })]
                    }, tour.id);
                  })
                })]
              }, cat.name))]
            })
          })]
        }), activeTab === "agenda" && /* @__PURE__ */ jsxs("div", {
          children: [/* @__PURE__ */ jsxs("div", {
            style: {
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "30px",
              marginBottom: "30px"
            },
            children: [/* @__PURE__ */ jsxs("div", {
              className: "pmy-form-box",
              children: [/* @__PURE__ */ jsx("h3", {
                children: t.form_new_booking
              }), /* @__PURE__ */ jsxs("form", {
                onSubmit: handleGeneratePaymentLink,
                children: [/* @__PURE__ */ jsxs("div", {
                  className: "pmy-form-group",
                  children: [/* @__PURE__ */ jsx("label", {
                    children: t.form_customer
                  }), /* @__PURE__ */ jsx("input", {
                    type: "text",
                    className: "pmy-form-input",
                    value: custName,
                    onChange: (e) => setCustName(e.target.value),
                    required: true
                  })]
                }), /* @__PURE__ */ jsxs("div", {
                  className: "pmy-form-group",
                  children: [/* @__PURE__ */ jsx("label", {
                    children: t.form_email
                  }), /* @__PURE__ */ jsx("input", {
                    type: "email",
                    className: "pmy-form-input",
                    value: custEmail,
                    onChange: (e) => setCustEmail(e.target.value)
                  })]
                }), /* @__PURE__ */ jsxs("div", {
                  className: "pmy-form-group",
                  children: [/* @__PURE__ */ jsx("label", {
                    children: t.form_phone
                  }), /* @__PURE__ */ jsx("input", {
                    type: "tel",
                    className: "pmy-form-input",
                    value: custPhone,
                    onChange: (e) => setCustPhone(e.target.value)
                  })]
                }), /* @__PURE__ */ jsxs("div", {
                  className: "pmy-form-group",
                  children: [/* @__PURE__ */ jsx("label", {
                    children: t.form_select_tour
                  }), /* @__PURE__ */ jsxs("select", {
                    className: "pmy-form-input",
                    value: selectedTour,
                    onChange: (e) => handleTourSelectionChange(e.target.value),
                    required: true,
                    children: [/* @__PURE__ */ jsxs("option", {
                      value: "",
                      children: ["-- ", t.form_select_tour, " --"]
                    }), tours == null ? void 0 : tours.map((tour) => /* @__PURE__ */ jsx("option", {
                      value: tour.id,
                      children: tour.title
                    }, tour.id))]
                  })]
                }), selectedTour && /* @__PURE__ */ jsxs("div", {
                  className: "pmy-form-group",
                  children: [/* @__PURE__ */ jsx("label", {
                    children: t.form_lang
                  }), /* @__PURE__ */ jsx("select", {
                    className: "pmy-form-input",
                    value: custLang,
                    onChange: (e) => setCustLang(e.target.value),
                    children: activeTourLanguages.map((l) => /* @__PURE__ */ jsx("option", {
                      value: l,
                      children: l
                    }, l))
                  })]
                }), selectedTour && /* @__PURE__ */ jsxs("div", {
                  className: "pmy-form-group",
                  style: {
                    background: "#fefefe",
                    padding: "15px",
                    borderRadius: "8px",
                    border: "1px solid #eee"
                  },
                  children: [/* @__PURE__ */ jsx("label", {
                    style: {
                      color: "var(--primary-green)"
                    },
                    children: "🛒 Ingressos por Variantes:"
                  }), /* @__PURE__ */ jsxs("div", {
                    className: "pmy-variants-form-grid",
                    children: [activeProductVariants.includes("adulto") && /* @__PURE__ */ jsxs("div", {
                      children: [/* @__PURE__ */ jsx("label", {
                        style: {
                          fontSize: "11px"
                        },
                        children: "Adulto"
                      }), /* @__PURE__ */ jsx("input", {
                        type: "number",
                        className: "pmy-form-input",
                        min: "0",
                        value: tourVariants.adulto,
                        onChange: (e) => setTourVariants({
                          ...tourVariants,
                          adulto: parseInt(e.target.value) || 0
                        })
                      })]
                    }), activeProductVariants.includes("jovem") && /* @__PURE__ */ jsxs("div", {
                      children: [/* @__PURE__ */ jsx("label", {
                        style: {
                          fontSize: "11px"
                        },
                        children: "Jovem"
                      }), /* @__PURE__ */ jsx("input", {
                        type: "number",
                        className: "pmy-form-input",
                        min: "0",
                        value: tourVariants.jovem,
                        onChange: (e) => setTourVariants({
                          ...tourVariants,
                          jovem: parseInt(e.target.value) || 0
                        })
                      })]
                    }), activeProductVariants.includes("crianca") && /* @__PURE__ */ jsxs("div", {
                      children: [/* @__PURE__ */ jsx("label", {
                        style: {
                          fontSize: "11px"
                        },
                        children: "Criança"
                      }), /* @__PURE__ */ jsx("input", {
                        type: "number",
                        className: "pmy-form-input",
                        min: "0",
                        value: tourVariants.crianca,
                        onChange: (e) => setTourVariants({
                          ...tourVariants,
                          crianca: parseInt(e.target.value) || 0
                        })
                      })]
                    }), activeProductVariants.includes("senior") && /* @__PURE__ */ jsxs("div", {
                      children: [/* @__PURE__ */ jsx("label", {
                        style: {
                          fontSize: "11px"
                        },
                        children: "Senior"
                      }), /* @__PURE__ */ jsx("input", {
                        type: "number",
                        className: "pmy-form-input",
                        min: "0",
                        value: tourVariants.senior,
                        onChange: (e) => setTourVariants({
                          ...tourVariants,
                          senior: parseInt(e.target.value) || 0
                        })
                      })]
                    })]
                  })]
                }), /* @__PURE__ */ jsxs("div", {
                  className: "pmy-form-group",
                  style: {
                    marginBottom: "18px"
                  },
                  children: [/* @__PURE__ */ jsxs("label", {
                    style: {
                      marginBottom: "4px",
                      display: "block"
                    },
                    children: ["Registrar entrada em qual plataforma?", /* @__PURE__ */ jsx("span", {
                      style: {
                        fontWeight: "400",
                        color: "#aaa",
                        fontSize: "11px",
                        marginLeft: "6px"
                      },
                      children: "Selecione uma ou mais"
                    })]
                  }), /* @__PURE__ */ jsx("div", {
                    className: "pmy-platform-pills",
                    children: allPlatforms.map((p) => {
                      const conn = platformConnections[p.key];
                      const sel = bookingPlatforms.includes(p.key);
                      return /* @__PURE__ */ jsxs("button", {
                        type: "button",
                        className: `pmy-platform-pill${sel ? " selected" : ""}${!conn.connected ? " disconnected" : ""}`,
                        onClick: () => conn.connected && handleTogglePlatformSelection(p.key, bookingPlatforms, setBookingPlatforms),
                        title: !conn.connected ? `${p.name} não conectado` : "",
                        children: [/* @__PURE__ */ jsx("span", {
                          className: "pmy-platform-pill-logo",
                          children: p.logo
                        }), p.name, sel && /* @__PURE__ */ jsx("span", {
                          className: "pmy-platform-pill-check",
                          children: "✓"
                        })]
                      }, p.key);
                    })
                  }), bookingPlatforms.length === 0 && /* @__PURE__ */ jsx("div", {
                    style: {
                      fontSize: "12px",
                      color: "#e08000",
                      marginTop: "6px",
                      background: "#fffbeb",
                      padding: "6px 10px",
                      borderRadius: "6px",
                      border: "1px solid #fcd34d"
                    },
                    children: "⚠️ Selecione pelo menos uma plataforma para registrar a reserva."
                  })]
                }), /* @__PURE__ */ jsxs("button", {
                  type: "submit",
                  className: "pmy-btn-submit",
                  disabled: bookingPlatforms.length === 0,
                  style: {
                    opacity: bookingPlatforms.length === 0 ? 0.5 : 1
                  },
                  children: [t.form_btn_link, bookingPlatforms.length > 0 && /* @__PURE__ */ jsxs("span", {
                    style: {
                      marginLeft: "8px",
                      fontSize: "11px",
                      opacity: 0.8
                    },
                    children: ["→ ", bookingPlatforms.length, " plataforma", bookingPlatforms.length > 1 ? "s" : ""]
                  })]
                })]
              }), generatedLink && /* @__PURE__ */ jsxs("div", {
                style: {
                  marginTop: "15px",
                  padding: "12px",
                  background: "#e6f2e6",
                  border: "1px solid var(--primary-green)",
                  borderRadius: "8px",
                  wordBreak: "break-all"
                },
                children: [/* @__PURE__ */ jsx("strong", {
                  style: {
                    fontSize: "13px",
                    color: "var(--primary-green)",
                    display: "block",
                    marginBottom: "4px"
                  },
                  children: "Link de Rascunho (Shopify Checkout):"
                }), /* @__PURE__ */ jsx("a", {
                  href: generatedLink,
                  target: "_blank",
                  rel: "noreferrer",
                  style: {
                    fontSize: "13px",
                    color: "#0055cc"
                  },
                  children: generatedLink
                })]
              })]
            }), /* @__PURE__ */ jsxs("div", {
              className: "pmy-form-box",
              children: [/* @__PURE__ */ jsx("h3", {
                children: t.form_new_block
              }), /* @__PURE__ */ jsxs("form", {
                onSubmit: (e) => e.preventDefault(),
                children: [/* @__PURE__ */ jsxs("div", {
                  className: "pmy-form-group",
                  children: [/* @__PURE__ */ jsx("label", {
                    children: t.form_select_tour
                  }), /* @__PURE__ */ jsxs("select", {
                    className: "pmy-form-input",
                    value: blockTourId,
                    onChange: (e) => handleBlockTourSelectionChange(e.target.value),
                    children: [/* @__PURE__ */ jsxs("option", {
                      value: "",
                      children: ["-- ", t.form_select_tour, " --"]
                    }), tours == null ? void 0 : tours.map((tour) => /* @__PURE__ */ jsx("option", {
                      value: tour.id,
                      children: tour.title
                    }, tour.id))]
                  })]
                }), /* @__PURE__ */ jsxs("div", {
                  className: "pmy-form-group",
                  children: [/* @__PURE__ */ jsx("label", {
                    children: t.block_days_week
                  }), /* @__PURE__ */ jsx("input", {
                    type: "text",
                    className: "pmy-form-input",
                    placeholder: "Ex: 0, 1 (Domingo e Segunda)",
                    value: blockRecurringDays,
                    onChange: (e) => setBlockRecurringDays(e.target.value)
                  })]
                }), /* @__PURE__ */ jsxs("div", {
                  className: "pmy-form-group",
                  children: [/* @__PURE__ */ jsx("label", {
                    children: t.form_date_time
                  }), /* @__PURE__ */ jsx("input", {
                    type: "date",
                    className: "pmy-form-input",
                    value: blockDateTime,
                    onChange: (e) => setBlockDateTime(e.target.value)
                  })]
                }), blockTourId && /* @__PURE__ */ jsxs("div", {
                  className: "pmy-form-group",
                  children: [/* @__PURE__ */ jsx("label", {
                    children: t.block_select_hour
                  }), /* @__PURE__ */ jsxs("select", {
                    className: "pmy-form-input",
                    value: blockSelectedHour,
                    onChange: (e) => setBlockSelectedHour(e.target.value),
                    children: [/* @__PURE__ */ jsx("option", {
                      value: "ALL",
                      children: "Bloquear Todos os Horários"
                    }), tourAvailableHours.map((h) => /* @__PURE__ */ jsxs("option", {
                      value: h,
                      children: ["Bloquear apenas ", h]
                    }, h))]
                  })]
                }), /* @__PURE__ */ jsxs("div", {
                  className: "pmy-form-group",
                  style: {
                    marginBottom: "18px"
                  },
                  children: [/* @__PURE__ */ jsxs("label", {
                    style: {
                      marginBottom: "4px",
                      display: "block"
                    },
                    children: ["Bloquear em quais plataformas?", /* @__PURE__ */ jsx("span", {
                      style: {
                        fontWeight: "400",
                        color: "#aaa",
                        fontSize: "11px",
                        marginLeft: "6px"
                      },
                      children: "Selecione uma ou mais"
                    })]
                  }), /* @__PURE__ */ jsx("div", {
                    className: "pmy-platform-pills",
                    children: allPlatforms.map((p) => {
                      const conn = platformConnections[p.key];
                      const sel = blockPlatforms.includes(p.key);
                      return /* @__PURE__ */ jsxs("button", {
                        type: "button",
                        className: `pmy-platform-pill${sel ? " selected-block" : ""}${!conn.connected ? " disconnected" : ""}`,
                        onClick: () => conn.connected && handleTogglePlatformSelection(p.key, blockPlatforms, setBlockPlatforms),
                        title: !conn.connected ? `${p.name} não conectado` : "",
                        children: [/* @__PURE__ */ jsx("span", {
                          className: "pmy-platform-pill-logo",
                          children: p.logo
                        }), p.name, sel && /* @__PURE__ */ jsx("span", {
                          className: "pmy-platform-pill-check",
                          children: "✓"
                        })]
                      }, p.key);
                    })
                  }), blockPlatforms.length > 0 && /* @__PURE__ */ jsxs("div", {
                    style: {
                      fontSize: "12px",
                      color: "#555",
                      marginTop: "7px",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px"
                    },
                    children: [/* @__PURE__ */ jsx("span", {
                      style: {
                        background: "#2b2b2b",
                        color: "#fff",
                        fontSize: "10px",
                        fontWeight: "800",
                        padding: "2px 8px",
                        borderRadius: "10px"
                      },
                      children: blockPlatforms.length
                    }), "plataforma", blockPlatforms.length > 1 ? "s" : "", "  será", blockPlatforms.length > 1 ? "ão" : "", " bloqueada", blockPlatforms.length > 1 ? "s" : "", allPlatforms.filter((p) => {
                      var _a3;
                      return ((_a3 = platformConnections[p.key]) == null ? void 0 : _a3.connected) && !blockPlatforms.includes(p.key);
                    }).length > 0 && /* @__PURE__ */ jsxs("span", {
                      style: {
                        color: "var(--primary-green)",
                        fontWeight: "700"
                      },
                      children: ["· ", allPlatforms.filter((p) => {
                        var _a3;
                        return ((_a3 = platformConnections[p.key]) == null ? void 0 : _a3.connected) && !blockPlatforms.includes(p.key);
                      }).length, " continuará", allPlatforms.filter((p) => {
                        var _a3;
                        return ((_a3 = platformConnections[p.key]) == null ? void 0 : _a3.connected) && !blockPlatforms.includes(p.key);
                      }).length > 1 ? "ão" : "", " aberta", allPlatforms.filter((p) => {
                        var _a3;
                        return ((_a3 = platformConnections[p.key]) == null ? void 0 : _a3.connected) && !blockPlatforms.includes(p.key);
                      }).length > 1 ? "s" : ""]
                    })]
                  }), blockPlatforms.length === 0 && /* @__PURE__ */ jsx("div", {
                    style: {
                      fontSize: "12px",
                      color: "#e08000",
                      marginTop: "6px",
                      background: "#fffbeb",
                      padding: "6px 10px",
                      borderRadius: "6px",
                      border: "1px solid #fcd34d"
                    },
                    children: "⚠️ Nenhuma plataforma selecionada — bloqueio não terá efeito."
                  })]
                }), /* @__PURE__ */ jsxs("button", {
                  type: "submit",
                  className: "pmy-btn-submit",
                  style: {
                    background: "#2b2b2b",
                    opacity: blockPlatforms.length === 0 ? 0.5 : 1
                  },
                  disabled: blockPlatforms.length === 0,
                  children: [t.form_btn_block, blockPlatforms.length > 0 && /* @__PURE__ */ jsxs("span", {
                    style: {
                      marginLeft: "8px",
                      fontSize: "11px",
                      opacity: 0.7
                    },
                    children: ["em ", blockPlatforms.length, " plataforma", blockPlatforms.length > 1 ? "s" : ""]
                  })]
                })]
              })]
            })]
          }), /* @__PURE__ */ jsxs("div", {
            className: "pmy-form-box",
            children: [/* @__PURE__ */ jsxs("div", {
              style: {
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "20px",
                flexWrap: "wrap",
                gap: "15px"
              },
              children: [/* @__PURE__ */ jsxs("div", {
                className: "pmy-calendar-month-selector-bar",
                children: [/* @__PURE__ */ jsx("button", {
                  type: "button",
                  className: "pmy-calendar-nav-arrow-btn",
                  onClick: handlePrevMonth,
                  children: "◀"
                }), /* @__PURE__ */ jsxs("div", {
                  className: "pmy-calendar-current-month-year-label",
                  children: [currentMonthLabel, " ", currentYear]
                }), /* @__PURE__ */ jsx("button", {
                  type: "button",
                  className: "pmy-calendar-nav-arrow-btn",
                  onClick: handleNextMonth,
                  children: "▶"
                })]
              }), /* @__PURE__ */ jsx("div", {
                className: "pmy-calendar-view-tabs",
                children: [["1d", t.view_1d], ["3d", t.view_3d], ["7d", t.view_7d], ["month", t.view_month]].map(([v, l]) => /* @__PURE__ */ jsx("button", {
                  type: "button",
                  className: `pmy-cal-tab ${calendarView === v ? "active" : ""}`,
                  onClick: () => setCalendarView(v),
                  children: l
                }, v))
              })]
            }), calendarView === "month" && /* @__PURE__ */ jsxs("div", {
              className: "pmy-calendar-week-headers",
              children: [/* @__PURE__ */ jsx("div", {
                children: "Seg"
              }), /* @__PURE__ */ jsx("div", {
                children: "Ter"
              }), /* @__PURE__ */ jsx("div", {
                children: "Qua"
              }), /* @__PURE__ */ jsx("div", {
                children: "Qui"
              }), /* @__PURE__ */ jsx("div", {
                children: "Sex"
              }), /* @__PURE__ */ jsx("div", {
                children: "Sáb"
              }), /* @__PURE__ */ jsx("div", {
                children: "Dom"
              })]
            }), /* @__PURE__ */ jsx("div", {
              className: `pmy-calendar-grid ${calendarView === "month" ? "month-view" : ""}`,
              children: renderCalendarDays()
            }), /* @__PURE__ */ jsxs("div", {
              style: {
                borderTop: "1px solid #eee",
                paddingTop: "20px"
              },
              children: [/* @__PURE__ */ jsx("h4", {
                style: {
                  fontSize: "16px",
                  fontWeight: "bold",
                  color: "var(--primary-green)",
                  marginBottom: "15px"
                },
                children: "📊 Controle Manual de Vagas por Tour"
              }), tours == null ? void 0 : tours.map((tour) => {
                const cap = tourCapacities[tour.id] !== void 0 ? tourCapacities[tour.id] : 20;
                return /* @__PURE__ */ jsxs("div", {
                  className: "pmy-tour-item",
                  children: [/* @__PURE__ */ jsxs("div", {
                    style: {
                      display: "flex",
                      gap: "15px",
                      alignItems: "center"
                    },
                    children: [/* @__PURE__ */ jsx("div", {
                      className: `pmy-tour-img ${imageShape}`,
                      style: {
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "20px"
                      },
                      children: "🏰"
                    }), /* @__PURE__ */ jsxs("div", {
                      children: [/* @__PURE__ */ jsx("strong", {
                        style: {
                          fontSize: "15px"
                        },
                        children: tour.title
                      }), /* @__PURE__ */ jsxs("div", {
                        style: {
                          fontSize: "12px",
                          color: "#888",
                          marginTop: "4px"
                        },
                        children: ["Capacidade: ", cap, " / 20", cap === 0 && /* @__PURE__ */ jsx("span", {
                          style: {
                            color: "#cc0000",
                            fontWeight: "bold",
                            marginLeft: "10px"
                          },
                          children: "🔒 BLOQUEADO (Lotação Esgotada)"
                        })]
                      })]
                    })]
                  }), /* @__PURE__ */ jsxs("div", {
                    className: "pmy-capacity-controls",
                    children: [/* @__PURE__ */ jsx("button", {
                      type: "button",
                      className: "pmy-cap-btn",
                      onClick: () => handleCapacityChange(tour.id, -1),
                      children: "−"
                    }), /* @__PURE__ */ jsx("span", {
                      style: {
                        fontWeight: "bold",
                        fontSize: "14px",
                        width: "20px",
                        textAlign: "center"
                      },
                      children: cap
                    }), /* @__PURE__ */ jsx("button", {
                      type: "button",
                      className: "pmy-cap-btn",
                      onClick: () => handleCapacityChange(tour.id, 1),
                      children: "+"
                    })]
                  })]
                }, tour.id);
              })]
            })]
          })]
        }), activeTab === "integracoes" && /* @__PURE__ */ jsxs("div", {
          children: [/* @__PURE__ */ jsxs("div", {
            className: "pmy-int-subtab-bar",
            children: [/* @__PURE__ */ jsx("button", {
              className: `pmy-int-subtab ${intSubTab === "conexoes" ? "active" : ""}`,
              onClick: () => setIntSubTab("conexoes"),
              children: "🔗 Conexões"
            }), /* @__PURE__ */ jsx("button", {
              className: `pmy-int-subtab ${intSubTab === "produtos" ? "active" : ""}`,
              onClick: () => setIntSubTab("produtos"),
              children: "📦 Produtos por Plataforma"
            })]
          }), intSubTab === "conexoes" && /* @__PURE__ */ jsxs("div", {
            children: [/* @__PURE__ */ jsx("p", {
              style: {
                color: "var(--text-muted)",
                marginBottom: "25px",
                fontSize: "15px"
              },
              children: lang === "pt" ? "Conecte seus canais de venda para sincronizar reservas automaticamente." : "Connect your sales channels to sync bookings automatically."
            }), /* @__PURE__ */ jsxs("div", {
              style: {
                display: "flex",
                gap: "12px",
                marginBottom: "30px",
                flexWrap: "wrap"
              },
              children: [/* @__PURE__ */ jsxs("div", {
                style: {
                  background: "#fff",
                  border: "1px solid #eee",
                  borderRadius: "10px",
                  padding: "14px 20px",
                  display: "flex",
                  alignItems: "center",
                  gap: "10px"
                },
                children: [/* @__PURE__ */ jsx("span", {
                  style: {
                    fontSize: "22px"
                  },
                  children: "🟢"
                }), /* @__PURE__ */ jsxs("div", {
                  children: [/* @__PURE__ */ jsx("div", {
                    style: {
                      fontWeight: "800",
                      fontSize: "20px",
                      color: "var(--primary-green)"
                    },
                    children: Object.values(platformConnections).filter((c) => c.connected).length
                  }), /* @__PURE__ */ jsx("div", {
                    style: {
                      fontSize: "12px",
                      color: "#888"
                    },
                    children: "Conectadas"
                  })]
                })]
              }), /* @__PURE__ */ jsxs("div", {
                style: {
                  background: "#fff",
                  border: "1px solid #eee",
                  borderRadius: "10px",
                  padding: "14px 20px",
                  display: "flex",
                  alignItems: "center",
                  gap: "10px"
                },
                children: [/* @__PURE__ */ jsx("span", {
                  style: {
                    fontSize: "22px"
                  },
                  children: "⚫"
                }), /* @__PURE__ */ jsxs("div", {
                  children: [/* @__PURE__ */ jsx("div", {
                    style: {
                      fontWeight: "800",
                      fontSize: "20px",
                      color: "#888"
                    },
                    children: Object.values(platformConnections).filter((c) => !c.connected).length
                  }), /* @__PURE__ */ jsx("div", {
                    style: {
                      fontSize: "12px",
                      color: "#888"
                    },
                    children: "Pendentes"
                  })]
                })]
              })]
            }), /* @__PURE__ */ jsxs("div", {
              style: {
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(260px,1fr))",
                gap: "20px",
                marginBottom: "40px"
              },
              children: [allPlatforms.map((platform) => {
                const conn = platformConnections[platform.key];
                return /* @__PURE__ */ jsxs("div", {
                  className: `pmy-int-card-v2 ${conn.connected ? "connected" : ""}`,
                  style: {
                    display: "flex",
                    flexDirection: "column"
                  },
                  children: [/* @__PURE__ */ jsxs("div", {
                    className: "pmy-int-top",
                    children: [/* @__PURE__ */ jsx("span", {
                      className: "pmy-int-logo-v2",
                      children: platform.logo
                    }), conn.connected && /* @__PURE__ */ jsxs("span", {
                      className: "pmy-int-sync-info",
                      children: ["🔄 ", conn.lastSync]
                    })]
                  }), /* @__PURE__ */ jsxs("div", {
                    style: {
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      marginBottom: "6px"
                    },
                    children: [/* @__PURE__ */ jsx("span", {
                      className: `pmy-int-status-dot ${conn.connected ? "on" : "off"}`
                    }), /* @__PURE__ */ jsx("span", {
                      style: {
                        fontSize: "11px",
                        fontWeight: "700",
                        color: conn.connected ? "#22c55e" : "#aaa"
                      },
                      children: conn.connected ? "CONECTADO" : "NÃO CONECTADO"
                    })]
                  }), /* @__PURE__ */ jsx("div", {
                    className: "pmy-int-name-v2",
                    children: platform.name
                  }), /* @__PURE__ */ jsx("div", {
                    className: "pmy-int-desc-v2",
                    children: lang === "pt" ? platform.desc.pt : platform.desc.en
                  }), /* @__PURE__ */ jsx("div", {
                    className: "pmy-int-actions",
                    children: conn.connected ? /* @__PURE__ */ jsxs(Fragment, {
                      children: [/* @__PURE__ */ jsx("button", {
                        className: "pmy-int-btn-settings",
                        onClick: () => handleOpenConnect(platform.key),
                        children: "⚙️ Gerenciar"
                      }), /* @__PURE__ */ jsx("button", {
                        className: "pmy-int-btn-disconnect",
                        onClick: () => handleDisconnect(platform.key),
                        children: "Desconectar"
                      })]
                    }) : /* @__PURE__ */ jsxs("button", {
                      className: "pmy-int-btn-connect",
                      onClick: () => handleOpenConnect(platform.key),
                      children: ["🔗 Conectar ", platform.name]
                    })
                  })]
                }, platform.key);
              }), customIntegrations.map((c) => /* @__PURE__ */ jsxs("div", {
                className: "pmy-int-card-v2 connected",
                style: {
                  display: "flex",
                  flexDirection: "column"
                },
                children: [/* @__PURE__ */ jsxs("div", {
                  className: "pmy-int-top",
                  children: [/* @__PURE__ */ jsx("span", {
                    className: "pmy-int-logo-v2",
                    children: "⚙️"
                  }), /* @__PURE__ */ jsx("span", {
                    className: "pmy-int-sync-info",
                    children: "Custom API"
                  })]
                }), /* @__PURE__ */ jsx("div", {
                  className: "pmy-int-name-v2",
                  children: c.name
                }), /* @__PURE__ */ jsxs("div", {
                  className: "pmy-int-desc-v2",
                  style: {
                    wordBreak: "break-all"
                  },
                  children: ["Endpoint: ", c.url]
                })]
              }, c.id))]
            }), /* @__PURE__ */ jsxs("div", {
              className: "pmy-form-box",
              style: {
                maxWidth: "600px"
              },
              children: [/* @__PURE__ */ jsx("h3", {
                children: "🔗 Conectar Nova Plataforma via API"
              }), /* @__PURE__ */ jsxs("form", {
                onSubmit: handleAddCustomIntegration,
                children: [/* @__PURE__ */ jsxs("div", {
                  className: "pmy-form-group",
                  children: [/* @__PURE__ */ jsx("label", {
                    children: "Nome da Plataforma:"
                  }), /* @__PURE__ */ jsx("input", {
                    type: "text",
                    className: "pmy-form-input",
                    placeholder: "Ex: Agência Parceira LX",
                    value: customName,
                    onChange: (e) => setCustomName(e.target.value),
                    required: true
                  })]
                }), /* @__PURE__ */ jsxs("div", {
                  className: "pmy-form-group",
                  children: [/* @__PURE__ */ jsx("label", {
                    children: "Endpoint da API (URL):"
                  }), /* @__PURE__ */ jsx("input", {
                    type: "url",
                    className: "pmy-form-input",
                    placeholder: "https://api.parceiro.com/v1/bookings",
                    value: customUrl,
                    onChange: (e) => setCustomUrl(e.target.value),
                    required: true
                  })]
                }), /* @__PURE__ */ jsxs("div", {
                  className: "pmy-form-group",
                  children: [/* @__PURE__ */ jsx("label", {
                    children: "Chave da API / Token:"
                  }), /* @__PURE__ */ jsx("input", {
                    type: "password",
                    className: "pmy-form-input",
                    placeholder: "pmy_live_key_...",
                    value: customKey,
                    onChange: (e) => setCustomKey(e.target.value)
                  })]
                }), /* @__PURE__ */ jsx("button", {
                  type: "submit",
                  className: "pmy-btn-submit",
                  style: {
                    background: "#ff6600"
                  },
                  children: "Ativar Integração Customizada"
                })]
              })]
            })]
          }), intSubTab === "produtos" && /* @__PURE__ */ jsxs("div", {
            children: [/* @__PURE__ */ jsx("p", {
              style: {
                color: "var(--text-muted)",
                marginBottom: "22px",
                fontSize: "15px"
              },
              children: "Visualize e gerencie quais produtos (tours) estão ativos em cada canal de venda. Ative ou desative um produto diretamente aqui."
            }), /* @__PURE__ */ jsx("div", {
              className: "pmy-prod-platform-tabs",
              children: allPlatforms.map((p) => {
                const conn = platformConnections[p.key];
                const prods = platformProducts[p.key] || [];
                const activeCount = prods.filter((x) => x.active).length;
                return /* @__PURE__ */ jsxs("button", {
                  className: `pmy-prod-ptab ${activeProdPlatform === p.key ? "active" : ""} ${!conn.connected ? "disabled" : ""}`,
                  onClick: () => conn.connected && setActiveProdPlatform(p.key),
                  title: !conn.connected ? "Plataforma não conectada" : "",
                  children: [/* @__PURE__ */ jsx("span", {
                    style: {
                      fontSize: "18px"
                    },
                    children: p.logo
                  }), p.name, conn.connected && /* @__PURE__ */ jsxs("span", {
                    style: {
                      fontSize: "10px",
                      fontWeight: "800",
                      padding: "2px 7px",
                      borderRadius: "10px",
                      background: activeProdPlatform === p.key ? "rgba(255,255,255,0.25)" : "#e6f2e6",
                      color: activeProdPlatform === p.key ? "#fff" : "var(--primary-green)"
                    },
                    children: [activeCount, " ativos"]
                  }), !conn.connected && /* @__PURE__ */ jsx("span", {
                    style: {
                      fontSize: "10px",
                      padding: "2px 7px",
                      borderRadius: "10px",
                      background: "#f5f5f5",
                      color: "#aaa"
                    },
                    children: "desconectado"
                  })]
                }, p.key);
              })
            }), (() => {
              const conn = platformConnections[activeProdPlatform];
              if (!(conn == null ? void 0 : conn.connected)) return /* @__PURE__ */ jsxs("div", {
                style: {
                  background: "#fffbeb",
                  border: "1px solid #fcd34d",
                  borderRadius: "10px",
                  padding: "20px 24px",
                  display: "flex",
                  alignItems: "center",
                  gap: "12px"
                },
                children: [/* @__PURE__ */ jsx("span", {
                  style: {
                    fontSize: "24px"
                  },
                  children: "⚠️"
                }), /* @__PURE__ */ jsxs("div", {
                  children: [/* @__PURE__ */ jsx("strong", {
                    style: {
                      fontSize: "14px",
                      color: "#92400e",
                      display: "block"
                    },
                    children: "Plataforma não conectada"
                  }), /* @__PURE__ */ jsxs("span", {
                    style: {
                      fontSize: "13px",
                      color: "#b45309"
                    },
                    children: ["Conecte esta plataforma na aba ", /* @__PURE__ */ jsx("strong", {
                      children: "Conexões"
                    }), " para gerenciar seus produtos aqui."]
                  })]
                })]
              });
              const prods = platformProducts[activeProdPlatform] || [];
              const platform = allPlatforms.find((p) => p.key === activeProdPlatform);
              const activeCount = prods.filter((x) => x.active).length;
              const inactiveCount = prods.filter((x) => !x.active).length;
              if (prods.length === 0) return /* @__PURE__ */ jsxs("div", {
                style: {
                  background: "#f8f8f8",
                  border: "1px solid #eee",
                  borderRadius: "12px",
                  padding: "32px 28px",
                  textAlign: "center"
                },
                children: [/* @__PURE__ */ jsx("div", {
                  style: {
                    fontSize: "36px",
                    marginBottom: "12px"
                  },
                  children: platform == null ? void 0 : platform.logo
                }), /* @__PURE__ */ jsx("div", {
                  style: {
                    fontWeight: "800",
                    fontSize: "16px",
                    color: "var(--text-dark)",
                    marginBottom: "8px"
                  },
                  children: "Nenhum produto sincronizado ainda"
                }), /* @__PURE__ */ jsx("div", {
                  style: {
                    fontSize: "13px",
                    color: "#888",
                    lineHeight: "1.6",
                    maxWidth: "380px",
                    margin: "0 auto 20px"
                  },
                  children: (platform == null ? void 0 : platform.key) === "shopify" ? "Sua loja Shopify não tem produtos cadastrados ainda, ou nenhum foi retornado pela API. Cadastre produtos no painel Shopify e recarregue esta página." : `A integração com ${platform == null ? void 0 : platform.name} está conectada, mas os produtos ainda não foram importados. A sincronização automática ocorre a cada 24h, ou clique em Sincronizar Agora.`
                }), (platform == null ? void 0 : platform.key) !== "shopify" && /* @__PURE__ */ jsx("button", {
                  className: "pmy-btn-submit",
                  style: {
                    width: "auto",
                    padding: "10px 24px",
                    fontSize: "13px"
                  },
                  onClick: () => alert(`Sincronização manual com ${platform == null ? void 0 : platform.name} iniciada. Os produtos aparecerão aqui em instantes.`),
                  children: "🔄 Sincronizar Agora"
                }), (platform == null ? void 0 : platform.key) === "shopify" && /* @__PURE__ */ jsx("a", {
                  href: "/admin/products/new",
                  target: "_blank",
                  rel: "noreferrer",
                  style: {
                    display: "inline-block",
                    background: "var(--primary-green)",
                    color: "#fff",
                    padding: "10px 24px",
                    borderRadius: "8px",
                    fontSize: "13px",
                    fontWeight: "700",
                    textDecoration: "none"
                  },
                  children: "+ Criar Produto no Shopify ↗"
                })]
              });
              return /* @__PURE__ */ jsxs("div", {
                className: "pmy-form-box",
                style: {
                  padding: "0"
                },
                children: [/* @__PURE__ */ jsxs("div", {
                  style: {
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "18px 22px",
                    borderBottom: "1px solid #f0f0f0"
                  },
                  children: [/* @__PURE__ */ jsxs("div", {
                    style: {
                      display: "flex",
                      alignItems: "center",
                      gap: "12px"
                    },
                    children: [/* @__PURE__ */ jsx("span", {
                      style: {
                        fontSize: "26px"
                      },
                      children: platform == null ? void 0 : platform.logo
                    }), /* @__PURE__ */ jsxs("div", {
                      children: [/* @__PURE__ */ jsx("div", {
                        style: {
                          fontWeight: "800",
                          fontSize: "16px",
                          color: "var(--text-dark)"
                        },
                        children: platform == null ? void 0 : platform.name
                      }), /* @__PURE__ */ jsxs("div", {
                        style: {
                          fontSize: "12px",
                          color: "#888",
                          marginTop: "2px"
                        },
                        children: [/* @__PURE__ */ jsxs("span", {
                          style: {
                            color: "var(--primary-green)",
                            fontWeight: "700"
                          },
                          children: [activeCount, " ativos"]
                        }), /* @__PURE__ */ jsx("span", {
                          style: {
                            margin: "0 8px",
                            color: "#ddd"
                          },
                          children: "•"
                        }), /* @__PURE__ */ jsxs("span", {
                          style: {
                            color: "#aaa"
                          },
                          children: [inactiveCount, " inativos"]
                        }), /* @__PURE__ */ jsx("span", {
                          style: {
                            margin: "0 8px",
                            color: "#ddd"
                          },
                          children: "•"
                        }), prods.length, " produtos no total"]
                      })]
                    })]
                  }), /* @__PURE__ */ jsx("button", {
                    className: "pmy-btn-submit",
                    style: {
                      width: "auto",
                      padding: "8px 18px",
                      fontSize: "13px"
                    },
                    onClick: () => alert("Para adicionar um novo produto, cadastre-o primeiro no Shopify e ele será sincronizado automaticamente."),
                    children: "+ Adicionar Produto"
                  })]
                }), /* @__PURE__ */ jsx("div", {
                  style: {
                    padding: "14px 22px 22px"
                  },
                  children: /* @__PURE__ */ jsxs("table", {
                    className: "pmy-prod-table",
                    children: [/* @__PURE__ */ jsx("thead", {
                      children: /* @__PURE__ */ jsxs("tr", {
                        children: [/* @__PURE__ */ jsx("th", {
                          children: "Produto / Tour"
                        }), /* @__PURE__ */ jsx("th", {
                          children: "SKU / ID Externo"
                        }), /* @__PURE__ */ jsx("th", {
                          children: "Preço"
                        }), /* @__PURE__ */ jsx("th", {
                          children: "Sincronizado"
                        }), /* @__PURE__ */ jsx("th", {
                          children: "Status"
                        }), /* @__PURE__ */ jsx("th", {
                          style: {
                            textAlign: "center"
                          },
                          children: "Ativo"
                        })]
                      })
                    }), /* @__PURE__ */ jsx("tbody", {
                      children: prods.map((prod) => /* @__PURE__ */ jsxs("tr", {
                        className: `pmy-prod-row ${prod.active ? "active-prod" : ""}`,
                        children: [/* @__PURE__ */ jsx("td", {
                          children: /* @__PURE__ */ jsx("div", {
                            style: {
                              fontWeight: "700",
                              fontSize: "14px",
                              color: "var(--text-dark)"
                            },
                            children: prod.name
                          })
                        }), /* @__PURE__ */ jsx("td", {
                          children: /* @__PURE__ */ jsx("code", {
                            style: {
                              fontSize: "11px",
                              background: "#f0f0f0",
                              padding: "3px 7px",
                              borderRadius: "4px",
                              color: "#555"
                            },
                            children: prod.sku
                          })
                        }), /* @__PURE__ */ jsx("td", {
                          style: {
                            fontWeight: "700",
                            color: "var(--primary-green)"
                          },
                          children: prod.price
                        }), /* @__PURE__ */ jsx("td", {
                          children: prod.synced ? /* @__PURE__ */ jsx("span", {
                            style: {
                              fontSize: "12px",
                              color: "#22c55e",
                              fontWeight: "700"
                            },
                            children: "✓ Sincronizado"
                          }) : /* @__PURE__ */ jsx("span", {
                            style: {
                              fontSize: "12px",
                              color: "#aaa"
                            },
                            children: "— Pendente"
                          })
                        }), /* @__PURE__ */ jsx("td", {
                          children: /* @__PURE__ */ jsxs("span", {
                            className: `pmy-prod-status ${prod.active ? "on" : "off"}`,
                            children: [/* @__PURE__ */ jsx("span", {
                              style: {
                                width: "6px",
                                height: "6px",
                                borderRadius: "50%",
                                background: "currentColor",
                                display: "inline-block"
                              }
                            }), prod.active ? "Ativo" : "Inativo"]
                          })
                        }), /* @__PURE__ */ jsx("td", {
                          style: {
                            textAlign: "center"
                          },
                          children: /* @__PURE__ */ jsxs("label", {
                            className: "pmy-prod-toggle",
                            title: prod.active ? "Desativar produto" : "Ativar produto",
                            children: [/* @__PURE__ */ jsx("input", {
                              type: "checkbox",
                              checked: prod.active,
                              onChange: () => handleToggleProduct(activeProdPlatform, prod.id)
                            }), /* @__PURE__ */ jsx("span", {
                              className: "pmy-prod-toggle-slider"
                            })]
                          })
                        })]
                      }, prod.id))
                    })]
                  })
                }), /* @__PURE__ */ jsxs("div", {
                  style: {
                    padding: "12px 22px 16px",
                    borderTop: "1px solid #f5f5f5",
                    display: "flex",
                    gap: "20px",
                    flexWrap: "wrap"
                  },
                  children: [/* @__PURE__ */ jsxs("div", {
                    style: {
                      fontSize: "12px",
                      color: "#888",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px"
                    },
                    children: [/* @__PURE__ */ jsx("span", {
                      style: {
                        width: "8px",
                        height: "8px",
                        borderRadius: "50%",
                        background: "var(--primary-green)",
                        display: "inline-block"
                      }
                    }), "Produto ativo = aparece nas plataformas e aceita reservas"]
                  }), /* @__PURE__ */ jsxs("div", {
                    style: {
                      fontSize: "12px",
                      color: "#888",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px"
                    },
                    children: [/* @__PURE__ */ jsx("span", {
                      style: {
                        width: "8px",
                        height: "8px",
                        borderRadius: "50%",
                        background: "#ddd",
                        display: "inline-block"
                      }
                    }), "Inativo = oculto na plataforma, sem novas reservas"]
                  })]
                })]
              });
            })()]
          })]
        }), activeTab === "guias" && /* @__PURE__ */ jsxs("div", {
          children: [/* @__PURE__ */ jsxs("div", {
            className: "pmy-form-box",
            style: {
              maxWidth: "600px",
              margin: "0 auto 40px auto"
            },
            children: [/* @__PURE__ */ jsx("h3", {
              children: t.form_new_guide
            }), /* @__PURE__ */ jsxs("form", {
              onSubmit: handleAddGuide,
              children: [/* @__PURE__ */ jsxs("div", {
                className: "pmy-form-group",
                children: [/* @__PURE__ */ jsx("label", {
                  children: t.form_guide_name
                }), /* @__PURE__ */ jsx("input", {
                  type: "text",
                  className: "pmy-form-input",
                  value: guideName,
                  onChange: (e) => setGuideName(e.target.value),
                  required: true
                })]
              }), /* @__PURE__ */ jsxs("div", {
                className: "pmy-form-group",
                children: [/* @__PURE__ */ jsx("label", {
                  children: t.form_guide_email
                }), /* @__PURE__ */ jsx("input", {
                  type: "email",
                  className: "pmy-form-input",
                  value: guideEmail,
                  onChange: (e) => setGuideEmail(e.target.value)
                })]
              }), /* @__PURE__ */ jsxs("div", {
                className: "pmy-form-group",
                children: [/* @__PURE__ */ jsx("label", {
                  children: t.form_guide_whatsapp
                }), /* @__PURE__ */ jsxs("div", {
                  style: {
                    display: "flex",
                    gap: "10px",
                    alignItems: "center"
                  },
                  children: [/* @__PURE__ */ jsxs("div", {
                    style: {
                      position: "relative",
                      display: "flex",
                      alignItems: "center",
                      flexShrink: 0
                    },
                    children: [/* @__PURE__ */ jsx("img", {
                      src: getFlagUrl(((_a2 = ddiList.find((d) => d.code === guideDdi)) == null ? void 0 : _a2.iso) || "pt"),
                      alt: "",
                      style: {
                        position: "absolute",
                        left: "10px",
                        width: "20px",
                        height: "14px",
                        objectFit: "cover",
                        borderRadius: "2px",
                        zIndex: 1,
                        pointerEvents: "none",
                        boxShadow: "0 1px 3px rgba(0,0,0,0.2)"
                      }
                    }), /* @__PURE__ */ jsx("select", {
                      className: "pmy-form-input",
                      style: {
                        width: "120px",
                        paddingLeft: "38px"
                      },
                      value: guideDdi,
                      onChange: (e) => setGuideDdi(e.target.value),
                      children: ddiList.map((d, i) => /* @__PURE__ */ jsx("option", {
                        value: d.code,
                        children: d.code
                      }, i))
                    })]
                  }), /* @__PURE__ */ jsx("input", {
                    type: "tel",
                    className: "pmy-form-input",
                    placeholder: "912 345 678",
                    value: guideWhatsapp,
                    onChange: (e) => setGuideWhatsapp(e.target.value),
                    required: true
                  })]
                })]
              }), /* @__PURE__ */ jsxs("div", {
                className: "pmy-form-group",
                children: [/* @__PURE__ */ jsx("label", {
                  children: t.form_guide_photo
                }), /* @__PURE__ */ jsxs("div", {
                  style: {
                    display: "flex",
                    gap: "10px",
                    alignItems: "center"
                  },
                  children: [/* @__PURE__ */ jsx("button", {
                    type: "button",
                    className: "pmy-format-btn",
                    onClick: () => guidePhotoRef.current.click(),
                    children: "Escolher Foto"
                  }), /* @__PURE__ */ jsx("input", {
                    type: "file",
                    accept: "image/*",
                    onChange: handleGuidePhotoChange,
                    style: {
                      display: "none"
                    },
                    ref: guidePhotoRef
                  }), guidePhoto && /* @__PURE__ */ jsx("img", {
                    src: guidePhoto,
                    alt: "preview",
                    style: {
                      width: "40px",
                      height: "40px",
                      borderRadius: "8px",
                      objectFit: "cover"
                    }
                  })]
                })]
              }), /* @__PURE__ */ jsx("button", {
                type: "submit",
                className: "pmy-btn-submit",
                style: {
                  marginTop: "10px"
                },
                children: t.btn_add_guide
              })]
            })]
          }), /* @__PURE__ */ jsxs("div", {
            className: "pmy-form-box",
            children: [/* @__PURE__ */ jsx("h3", {
              style: {
                marginBottom: "25px"
              },
              children: t.registered_guides_list
            }), guidesList.length === 0 ? /* @__PURE__ */ jsx("p", {
              style: {
                color: "#999"
              },
              children: "Nenhum guia cadastrado."
            }) : /* @__PURE__ */ jsx("div", {
              className: "pmy-guides-grid",
              children: guidesList.map((g) => /* @__PURE__ */ jsxs("div", {
                className: "pmy-guide-card-square",
                style: {
                  paddingBottom: "10px"
                },
                onClick: () => {
                  setSelectedGuideInfo(g);
                  setActiveModal("guideDetails");
                },
                children: [/* @__PURE__ */ jsx("img", {
                  src: g.photo,
                  alt: g.name,
                  className: "pmy-guide-square-img"
                }), /* @__PURE__ */ jsxs("div", {
                  className: "pmy-guide-square-name",
                  children: [g.name.split(" ")[0], /* @__PURE__ */ jsx("br", {}), g.name.split(" ").slice(1).join(" ")]
                }), /* @__PURE__ */ jsxs("div", {
                  style: {
                    display: "flex",
                    gap: "5px",
                    marginTop: "10px",
                    width: "100%"
                  },
                  onClick: (e) => e.stopPropagation(),
                  children: [/* @__PURE__ */ jsx("button", {
                    className: "pmy-guide-edit-btn",
                    onClick: () => handleOpenEditGuide(g),
                    children: "✏️ Editar"
                  }), /* @__PURE__ */ jsx("button", {
                    className: "pmy-guide-delete-btn",
                    onClick: () => handleDeleteGuide(g.id),
                    children: "🗑️"
                  })]
                })]
              }, g.id))
            })]
          }), /* @__PURE__ */ jsxs("div", {
            className: "pmy-form-box",
            children: [/* @__PURE__ */ jsxs("div", {
              style: {
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                borderBottom: "1px solid #f5f5f5",
                paddingBottom: "15px",
                marginBottom: "15px"
              },
              children: [/* @__PURE__ */ jsxs("h3", {
                style: {
                  borderBottom: "none",
                  margin: 0,
                  padding: 0
                },
                children: ["🚐 ", t.upcoming_tours_list]
              }), /* @__PURE__ */ jsx("div", {
                className: "pmy-calendar-view-tabs",
                style: {
                  margin: 0
                },
                children: [["today", t.filter_today], ["7d", t.view_7d], ["15d", "15 dias"], ["30d", "30 dias"]].map(([v, l]) => /* @__PURE__ */ jsx("button", {
                  className: `pmy-cal-tab ${upcomingToursFilter === v ? "active" : ""}`,
                  onClick: () => setUpcomingToursFilter(v),
                  children: l
                }, v))
              })]
            }), /* @__PURE__ */ jsx("div", {
              style: {
                background: "#fdfdfd",
                padding: "15px",
                borderRadius: "8px",
                border: "1px solid #eee"
              },
              children: upcomingToursFilter === "today" ? /* @__PURE__ */ jsxs("div", {
                className: "pmy-list-item",
                style: {
                  borderBottom: "none"
                },
                children: [/* @__PURE__ */ jsx("span", {
                  style: {
                    fontWeight: "bold"
                  },
                  children: "🏰 Fátima, Batalha e Nazaré"
                }), /* @__PURE__ */ jsx("span", {
                  style: {
                    fontSize: "12px",
                    background: "#e6f2e6",
                    color: "var(--primary-green)",
                    padding: "4px 10px",
                    borderRadius: "20px"
                  },
                  children: "Hoje, 14:00 (Guia: Renan)"
                })]
              }) : /* @__PURE__ */ jsxs("div", {
                children: [/* @__PURE__ */ jsxs("div", {
                  className: "pmy-list-item",
                  children: [/* @__PURE__ */ jsx("span", {
                    style: {
                      fontWeight: "bold"
                    },
                    children: "🏰 Fátima, Batalha e Nazaré"
                  }), /* @__PURE__ */ jsx("span", {
                    style: {
                      fontSize: "12px",
                      background: "#f5f5f5",
                      padding: "4px 10px",
                      borderRadius: "20px"
                    },
                    children: "Amanhã, 09:00"
                  })]
                }), /* @__PURE__ */ jsxs("div", {
                  className: "pmy-list-item",
                  children: [/* @__PURE__ */ jsx("span", {
                    style: {
                      fontWeight: "bold"
                    },
                    children: "🚶‍♂️ Walking Tour Lisboa"
                  }), /* @__PURE__ */ jsx("span", {
                    style: {
                      fontSize: "12px",
                      background: "#f5f5f5",
                      padding: "4px 10px",
                      borderRadius: "20px"
                    },
                    children: "Daqui a 3 dias"
                  })]
                }), /* @__PURE__ */ jsxs("div", {
                  className: "pmy-list-item",
                  style: {
                    borderBottom: "none"
                  },
                  children: [/* @__PURE__ */ jsx("span", {
                    style: {
                      fontWeight: "bold"
                    },
                    children: "🏰 Sintra e Cascais"
                  }), /* @__PURE__ */ jsx("span", {
                    style: {
                      fontSize: "12px",
                      background: "#f5f5f5",
                      padding: "4px 10px",
                      borderRadius: "20px"
                    },
                    children: "Daqui a 5 dias"
                  })]
                })]
              })
            })]
          })]
        }), activeTab === "automacoes" && /* @__PURE__ */ jsxs("div", {
          className: "pmy-form-box",
          children: [/* @__PURE__ */ jsx("h3", {
            children: "🤖 Automação de Alertas para Guias"
          }), /* @__PURE__ */ jsx("p", {
            style: {
              fontSize: "13px",
              color: "#666",
              marginBottom: "25px"
            },
            children: "Configure regras de envio de mensagens automáticas via WhatsApp e E-mail."
          }), /* @__PURE__ */ jsxs("div", {
            style: {
              display: "flex",
              flexDirection: "column",
              gap: "15px"
            },
            children: [[{
              title: "Notificação de Novo Agendamento",
              desc: "Dispara um alerta imediato para o guia assim que você o colocar na escala da Agenda Central.",
              checked: true
            }, {
              title: "Lembrete de Tour Próximo (24 horas antes)",
              desc: "Avisa o guia no dia anterior enviando dados do cliente e local de encontro.",
              checked: true
            }].map((item, i) => /* @__PURE__ */ jsxs("div", {
              style: {
                padding: "20px",
                background: "#f9f9f9",
                border: "1px solid #eee",
                borderRadius: "8px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center"
              },
              children: [/* @__PURE__ */ jsxs("div", {
                children: [/* @__PURE__ */ jsx("strong", {
                  style: {
                    display: "block",
                    fontSize: "15px",
                    color: "var(--text-dark)"
                  },
                  children: item.title
                }), /* @__PURE__ */ jsx("span", {
                  style: {
                    fontSize: "13px",
                    color: "#888"
                  },
                  children: item.desc
                })]
              }), /* @__PURE__ */ jsx("input", {
                type: "checkbox",
                style: {
                  transform: "scale(1.5)",
                  cursor: "pointer"
                },
                defaultChecked: item.checked
              })]
            }, i)), /* @__PURE__ */ jsx("button", {
              type: "button",
              className: "pmy-btn-submit",
              style: {
                marginTop: "15px",
                width: "auto",
                alignSelf: "flex-start",
                padding: "10px 25px"
              },
              children: "Salvar Regras de Automação"
            })]
          })]
        }), activeTab === "configuracoes" && /* @__PURE__ */ jsxs("div", {
          style: {
            display: "grid",
            gap: "30px"
          },
          children: [/* @__PURE__ */ jsxs("div", {
            className: "pmy-form-box",
            children: [/* @__PURE__ */ jsx("h3", {
              children: "🎨 Configurações de Layout"
            }), /* @__PURE__ */ jsxs("div", {
              style: {
                display: "flex",
                flexDirection: "column",
                gap: "25px",
                marginTop: "15px"
              },
              children: [/* @__PURE__ */ jsxs("div", {
                className: "pmy-form-group",
                children: [/* @__PURE__ */ jsx("label", {
                  children: "Logo da Agência (Aparecerá na barra lateral):"
                }), /* @__PURE__ */ jsxs("div", {
                  style: {
                    display: "flex",
                    gap: "15px",
                    alignItems: "center",
                    marginTop: "5px"
                  },
                  children: [/* @__PURE__ */ jsx("input", {
                    type: "file",
                    accept: "image/*",
                    onChange: handleLogoChange,
                    style: {
                      display: "none"
                    },
                    ref: fileInputRef
                  }), logoUrl && /* @__PURE__ */ jsx("img", {
                    src: logoUrl,
                    alt: "Logo",
                    style: {
                      height: "45px",
                      objectFit: "contain",
                      background: "#f5f5f5",
                      padding: "5px",
                      borderRadius: "4px"
                    }
                  }), /* @__PURE__ */ jsx("button", {
                    type: "button",
                    className: "pmy-format-btn",
                    onClick: () => fileInputRef.current.click(),
                    children: "Carregar Nova Logo"
                  }), logoUrl && /* @__PURE__ */ jsx("button", {
                    type: "button",
                    className: "pmy-format-btn",
                    style: {
                      color: "#cc0000",
                      background: "#ffe6e6"
                    },
                    onClick: () => setLogoUrl(null),
                    children: "Remover"
                  })]
                })]
              }), /* @__PURE__ */ jsxs("div", {
                className: "pmy-form-group",
                children: [/* @__PURE__ */ jsx("label", {
                  children: "Formato de Recorte das Imagens de Perfil:"
                }), /* @__PURE__ */ jsx("div", {
                  style: {
                    display: "flex",
                    gap: "10px",
                    marginTop: "5px"
                  },
                  children: [["circle", "Redonda"], ["rounded", "Arredondada"]].map(([v, l]) => /* @__PURE__ */ jsx("button", {
                    type: "button",
                    className: "pmy-format-btn",
                    style: {
                      background: imageShape === v ? "var(--primary-green)" : "#f0f0f0",
                      color: imageShape === v ? "#fff" : "#555"
                    },
                    onClick: () => setImageShape(v),
                    children: l
                  }, v))
                })]
              }), /* @__PURE__ */ jsxs("div", {
                className: "pmy-form-group",
                children: [/* @__PURE__ */ jsx("label", {
                  children: "Tamanho da Fonte da Interface:"
                }), /* @__PURE__ */ jsxs("select", {
                  className: "pmy-form-input",
                  style: {
                    maxWidth: "240px"
                  },
                  children: [/* @__PURE__ */ jsx("option", {
                    children: "Padrão (Assistant)"
                  }), /* @__PURE__ */ jsx("option", {
                    children: "Compacta"
                  })]
                })]
              })]
            })]
          }), /* @__PURE__ */ jsxs("div", {
            className: "pmy-form-box",
            children: [/* @__PURE__ */ jsx("h3", {
              children: "👥 Gestão de Usuários (Acessos)"
            }), /* @__PURE__ */ jsx("p", {
              style: {
                fontSize: "13px",
                color: "#666",
                marginBottom: "15px"
              },
              children: "Gerencie quem da sua equipe administrativa pode acessar a Agenda Central."
            }), /* @__PURE__ */ jsx("div", {
              style: {
                background: "#f9f9f9",
                padding: "15px",
                borderRadius: "8px",
                border: "1px solid #eee",
                marginBottom: "15px"
              },
              children: /* @__PURE__ */ jsx("div", {
                style: {
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center"
                },
                children: /* @__PURE__ */ jsxs("div", {
                  children: [/* @__PURE__ */ jsx("strong", {
                    style: {
                      fontSize: "14px",
                      display: "block"
                    },
                    children: "Nathalia Simeão"
                  }), /* @__PURE__ */ jsx("span", {
                    style: {
                      fontSize: "12px",
                      color: "#888"
                    },
                    children: "Admin (Acesso Total)"
                  })]
                })
              })
            }), /* @__PURE__ */ jsx("button", {
              type: "button",
              className: "pmy-btn-submit",
              style: {
                width: "auto",
                padding: "10px 20px",
                background: "#2b2b2b"
              },
              children: "+ Convidar Novo Usuário"
            })]
          }), /* @__PURE__ */ jsxs("div", {
            className: "pmy-form-box",
            children: [/* @__PURE__ */ jsx("h3", {
              children: "🗺️ Mapeamento de Campos entre Plataformas"
            }), /* @__PURE__ */ jsx("p", {
              style: {
                fontSize: "13px",
                color: "#666",
                marginBottom: "25px",
                lineHeight: "1.6"
              },
              children: "Defina como os campos de cada plataforma externa correspondem aos campos internos do sistema PMY. Isso garante que reservas sejam importadas corretamente, independentemente do formato de cada API."
            }), /* @__PURE__ */ jsx("div", {
              className: "pmy-mapping-platform-tabs",
              children: allPlatforms.map((p) => {
                var _a3;
                return /* @__PURE__ */ jsxs("button", {
                  className: `pmy-mapping-tab ${activeMappingPlatform === p.key ? "active" : ""}`,
                  onClick: () => setActiveMappingPlatform(p.key),
                  children: [/* @__PURE__ */ jsx("span", {
                    children: p.logo
                  }), p.name, ((_a3 = platformConnections[p.key]) == null ? void 0 : _a3.connected) && /* @__PURE__ */ jsx("span", {
                    style: {
                      fontSize: "9px",
                      background: "rgba(255,255,255,0.3)",
                      borderRadius: "10px",
                      padding: "1px 5px"
                    },
                    children: "✓"
                  })]
                }, p.key);
              })
            }), !((_b = platformConnections[activeMappingPlatform]) == null ? void 0 : _b.connected) && /* @__PURE__ */ jsxs("div", {
              style: {
                background: "#fffbeb",
                border: "1px solid #fcd34d",
                borderRadius: "8px",
                padding: "12px 16px",
                marginBottom: "20px",
                fontSize: "13px",
                color: "#92400e",
                display: "flex",
                alignItems: "center",
                gap: "10px"
              },
              children: [/* @__PURE__ */ jsx("span", {
                children: "⚠️"
              }), /* @__PURE__ */ jsxs("span", {
                children: ["Esta plataforma não está conectada. Vá em ", /* @__PURE__ */ jsx("strong", {
                  children: "Integrações"
                }), " para ativar. Você pode pré-configurar o mapeamento agora."]
              })]
            }), /* @__PURE__ */ jsxs("div", {
              style: {
                display: "flex",
                gap: "20px",
                marginBottom: "15px",
                alignItems: "center",
                flexWrap: "wrap"
              },
              children: [/* @__PURE__ */ jsxs("div", {
                style: {
                  fontSize: "12px",
                  color: "#888",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px"
                },
                children: [/* @__PURE__ */ jsx("span", {
                  style: {
                    fontFamily: "monospace",
                    background: "#f0f0f0",
                    padding: "2px 6px",
                    borderRadius: "4px",
                    fontSize: "11px"
                  },
                  children: "campo_pmy"
                }), "= campo fixo interno"]
              }), /* @__PURE__ */ jsxs("div", {
                style: {
                  fontSize: "12px",
                  color: "#888",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px"
                },
                children: [/* @__PURE__ */ jsx("span", {
                  style: {
                    fontFamily: "monospace",
                    border: "1px solid #ddd",
                    padding: "2px 8px",
                    borderRadius: "4px",
                    fontSize: "11px"
                  },
                  children: "campo.api"
                }), "= campo da plataforma (editável)"]
              }), /* @__PURE__ */ jsx("span", {
                className: "pmy-field-badge required",
                children: "● Obrigatório"
              }), /* @__PURE__ */ jsx("span", {
                className: "pmy-field-badge optional",
                children: "○ Opcional"
              })]
            }), /* @__PURE__ */ jsx("div", {
              style: {
                overflowX: "auto"
              },
              children: /* @__PURE__ */ jsxs("table", {
                className: "pmy-mapping-table",
                children: [/* @__PURE__ */ jsx("thead", {
                  children: /* @__PURE__ */ jsxs("tr", {
                    children: [/* @__PURE__ */ jsx("th", {
                      children: "Campo Interno PMY"
                    }), /* @__PURE__ */ jsx("th", {
                      style: {
                        width: "30px"
                      }
                    }), /* @__PURE__ */ jsxs("th", {
                      children: ["Campo na API ", (_c = allPlatforms.find((p) => p.key === activeMappingPlatform)) == null ? void 0 : _c.name]
                    }), /* @__PURE__ */ jsx("th", {
                      style: {
                        width: "100px"
                      },
                      children: "Tipo"
                    })]
                  })
                }), /* @__PURE__ */ jsx("tbody", {
                  children: internalFields.map((field) => {
                    var _a3, _b2, _c2;
                    return /* @__PURE__ */ jsxs("tr", {
                      className: `pmy-mapping-row ${((_a3 = platformConnections[activeMappingPlatform]) == null ? void 0 : _a3.connected) ? "active-conn" : ""}`,
                      children: [/* @__PURE__ */ jsx("td", {
                        children: /* @__PURE__ */ jsxs("div", {
                          style: {
                            display: "flex",
                            flexDirection: "column",
                            gap: "2px"
                          },
                          children: [/* @__PURE__ */ jsx("span", {
                            className: "pmy-mapping-internal-label",
                            children: field.key
                          }), /* @__PURE__ */ jsx("span", {
                            style: {
                              fontSize: "11px",
                              color: "#aaa",
                              marginTop: "3px"
                            },
                            children: field.desc
                          })]
                        })
                      }), /* @__PURE__ */ jsx("td", {
                        className: "pmy-mapping-arrow",
                        children: "→"
                      }), /* @__PURE__ */ jsx("td", {
                        children: /* @__PURE__ */ jsx("input", {
                          type: "text",
                          className: "pmy-mapping-field-input",
                          value: ((_b2 = fieldMappings[activeMappingPlatform]) == null ? void 0 : _b2[field.key]) || "",
                          onChange: (e) => handleUpdateFieldMapping(activeMappingPlatform, field.key, e.target.value),
                          placeholder: `Nome do campo em ${(_c2 = allPlatforms.find((p) => p.key === activeMappingPlatform)) == null ? void 0 : _c2.name}`
                        })
                      }), /* @__PURE__ */ jsx("td", {
                        children: /* @__PURE__ */ jsx("span", {
                          className: `pmy-field-badge ${field.required ? "required" : "optional"}`,
                          children: field.required ? "● Obrig." : "○ Opc."
                        })
                      })]
                    }, field.key);
                  })
                })]
              })
            }), /* @__PURE__ */ jsxs("div", {
              style: {
                marginTop: "25px",
                background: "#fafafa",
                border: "1px solid #eee",
                borderRadius: "10px",
                padding: "20px"
              },
              children: [/* @__PURE__ */ jsx("h4", {
                style: {
                  fontSize: "14px",
                  fontWeight: "800",
                  color: "var(--text-dark)",
                  marginBottom: "15px"
                },
                children: "⚙️ Transformações de Status Automáticas"
              }), /* @__PURE__ */ jsx("div", {
                style: {
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(200px,1fr))",
                  gap: "12px"
                },
                children: [{
                  label: "CONFIRMED",
                  values: ["confirmed", "CONFIRMED", "accepted", "aceptada", "booked"]
                }, {
                  label: "CANCELED",
                  values: ["cancelled", "canceled", "CANCELLED", "cancelada", "rejected"]
                }, {
                  label: "PENDING",
                  values: ["pending", "PENDING", "awaiting", "pendiente", "on_hold"]
                }, {
                  label: "EUR €",
                  values: ["EUR", "Eur", "€", "euro", "euros"]
                }].map((tr, i) => /* @__PURE__ */ jsxs("div", {
                  style: {
                    background: "#fff",
                    border: "1px solid #eee",
                    borderRadius: "8px",
                    padding: "12px"
                  },
                  children: [/* @__PURE__ */ jsxs("div", {
                    style: {
                      fontSize: "12px",
                      fontWeight: "800",
                      color: "var(--text-dark)",
                      marginBottom: "8px"
                    },
                    children: ["→ ", tr.label]
                  }), /* @__PURE__ */ jsx("div", {
                    style: {
                      display: "flex",
                      flexWrap: "wrap",
                      gap: "5px"
                    },
                    children: tr.values.map((v, j) => /* @__PURE__ */ jsx("span", {
                      style: {
                        fontSize: "11px",
                        fontFamily: "monospace",
                        background: "#f0f4ff",
                        color: "#4466cc",
                        padding: "2px 7px",
                        borderRadius: "4px"
                      },
                      children: v
                    }, j))
                  })]
                }, i))
              })]
            }), /* @__PURE__ */ jsxs("div", {
              style: {
                marginTop: "20px",
                display: "flex",
                gap: "12px"
              },
              children: [/* @__PURE__ */ jsxs("button", {
                type: "button",
                className: "pmy-btn-submit",
                style: {
                  width: "auto",
                  padding: "11px 25px"
                },
                children: ["💾 Salvar — ", (_d = allPlatforms.find((p) => p.key === activeMappingPlatform)) == null ? void 0 : _d.name]
              }), /* @__PURE__ */ jsx("button", {
                type: "button",
                onClick: () => setFieldMappings((p) => ({
                  ...p,
                  [activeMappingPlatform]: defaultMappings[activeMappingPlatform] || {}
                })),
                style: {
                  background: "#f0f0f0",
                  border: "none",
                  borderRadius: "8px",
                  padding: "11px 20px",
                  fontWeight: "700",
                  fontSize: "13px",
                  cursor: "pointer",
                  color: "#555"
                },
                children: "🔄 Restaurar Padrões"
              })]
            })]
          })]
        })]
      })]
    }), renderModal(), renderConnectModal(), renderEditGuideModal()]
  });
});
const route5 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  action: action$1,
  default: route,
  loader: loader$2
}, Symbol.toStringTag, { value: "Module" }));
const loader$1 = async ({
  request
}) => {
  await authenticate.admin(request);
  return {
    apiKey: process.env.SHOPIFY_API_KEY || ""
  };
};
const app = UNSAFE_withComponentProps(function App2() {
  const {
    apiKey
  } = useLoaderData();
  return /* @__PURE__ */ jsxs(AppProvider, {
    embedded: true,
    apiKey,
    children: [/* @__PURE__ */ jsxs("s-app-nav", {
      children: [/* @__PURE__ */ jsx("s-link", {
        href: "/app",
        children: "Home"
      }), /* @__PURE__ */ jsx("s-link", {
        href: "/app/additional",
        children: "Additional page"
      })]
    }), /* @__PURE__ */ jsx(Outlet, {})]
  });
});
const ErrorBoundary = UNSAFE_withErrorBoundaryProps(function ErrorBoundary2() {
  return boundary.error(useRouteError());
});
const headers$1 = (headersArgs) => {
  return boundary.headers(headersArgs);
};
const route6 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  ErrorBoundary,
  default: app,
  headers: headers$1,
  loader: loader$1
}, Symbol.toStringTag, { value: "Module" }));
const app_additional = UNSAFE_withComponentProps(function AdditionalPage() {
  return /* @__PURE__ */ jsxs("s-page", {
    heading: "Additional page",
    children: [/* @__PURE__ */ jsxs("s-section", {
      heading: "Multiple pages",
      children: [/* @__PURE__ */ jsxs("s-paragraph", {
        children: ["The app template comes with an additional page which demonstrates how to create multiple pages within app navigation using", " ", /* @__PURE__ */ jsx("s-link", {
          href: "https://shopify.dev/docs/apps/tools/app-bridge",
          target: "_blank",
          children: "App Bridge"
        }), "."]
      }), /* @__PURE__ */ jsxs("s-paragraph", {
        children: ["To create your own page and have it show up in the app navigation, add a page inside ", /* @__PURE__ */ jsx("code", {
          children: "app/routes"
        }), ", and a link to it in the", " ", /* @__PURE__ */ jsx("code", {
          children: "<ui-nav-menu>"
        }), " component found in", " ", /* @__PURE__ */ jsx("code", {
          children: "app/routes/app.jsx"
        }), "."]
      })]
    }), /* @__PURE__ */ jsx("s-section", {
      slot: "aside",
      heading: "Resources",
      children: /* @__PURE__ */ jsx("s-unordered-list", {
        children: /* @__PURE__ */ jsx("s-list-item", {
          children: /* @__PURE__ */ jsx("s-link", {
            href: "https://shopify.dev/docs/apps/design-guidelines/navigation#app-nav",
            target: "_blank",
            children: "App nav best practices"
          })
        })
      })
    })]
  });
});
const route7 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: app_additional
}, Symbol.toStringTag, { value: "Module" }));
const loader = async ({
  request
}) => {
  await authenticate.admin(request);
  return null;
};
const action = async ({
  request
}) => {
  const {
    admin
  } = await authenticate.admin(request);
  const color = ["Red", "Orange", "Yellow", "Green"][Math.floor(Math.random() * 4)];
  const response = await admin.graphql(`#graphql
      mutation populateProduct($product: ProductCreateInput!) {
        productCreate(product: $product) {
          product {
            id
            title
            handle
            status
            variants(first: 10) {
              edges {
                node {
                  id
                  price
                  barcode
                  createdAt
                }
              }
            }
            demoInfo: metafield(namespace: "$app", key: "demo_info") {
              jsonValue
            }
          }
        }
      }`, {
    variables: {
      product: {
        title: `${color} Snowboard`,
        metafields: [{
          namespace: "$app",
          key: "demo_info",
          value: "Created by React Router Template"
        }]
      }
    }
  });
  const responseJson = await response.json();
  const product = responseJson.data.productCreate.product;
  const variantId = product.variants.edges[0].node.id;
  const variantResponse = await admin.graphql(`#graphql
    mutation shopifyReactRouterTemplateUpdateVariant($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
      productVariantsBulkUpdate(productId: $productId, variants: $variants) {
        productVariants {
          id
          price
          barcode
          createdAt
        }
      }
    }`, {
    variables: {
      productId: product.id,
      variants: [{
        id: variantId,
        price: "100.00"
      }]
    }
  });
  const variantResponseJson = await variantResponse.json();
  const metaobjectResponse = await admin.graphql(`#graphql
    mutation shopifyReactRouterTemplateUpsertMetaobject($handle: MetaobjectHandleInput!, $metaobject: MetaobjectUpsertInput!) {
      metaobjectUpsert(handle: $handle, metaobject: $metaobject) {
        metaobject {
          id
          handle
          title: field(key: "title") {
            jsonValue
          }
          description: field(key: "description") {
            jsonValue
          }
        }
        userErrors {
          field
          message
        }
      }
    }`, {
    variables: {
      handle: {
        type: "$app:example",
        handle: "demo-entry"
      },
      metaobject: {
        fields: [{
          key: "title",
          value: "Demo Entry"
        }, {
          key: "description",
          value: "This metaobject was created by the Shopify app template to demonstrate the metaobject API."
        }]
      }
    }
  });
  const metaobjectResponseJson = await metaobjectResponse.json();
  return {
    product: responseJson.data.productCreate.product,
    variant: variantResponseJson.data.productVariantsBulkUpdate.productVariants,
    metaobject: metaobjectResponseJson.data.metaobjectUpsert.metaobject
  };
};
const app__index = UNSAFE_withComponentProps(function Index() {
  var _a2, _b, _c, _d;
  const fetcher = useFetcher();
  const shopify2 = useAppBridge();
  const isLoading = ["loading", "submitting"].includes(fetcher.state) && fetcher.formMethod === "POST";
  useEffect(() => {
    var _a3, _b2;
    if ((_b2 = (_a3 = fetcher.data) == null ? void 0 : _a3.product) == null ? void 0 : _b2.id) {
      shopify2.toast.show("Product created");
    }
  }, [(_b = (_a2 = fetcher.data) == null ? void 0 : _a2.product) == null ? void 0 : _b.id, shopify2]);
  const generateProduct = () => fetcher.submit({}, {
    method: "POST"
  });
  return /* @__PURE__ */ jsxs("s-page", {
    heading: "Shopify app template",
    children: [/* @__PURE__ */ jsx("s-button", {
      slot: "primary-action",
      onClick: generateProduct,
      children: "Generate a product"
    }), /* @__PURE__ */ jsx("s-section", {
      heading: "Congrats on creating a new Shopify app 🎉",
      children: /* @__PURE__ */ jsxs("s-paragraph", {
        children: ["This embedded app template uses", " ", /* @__PURE__ */ jsx("s-link", {
          href: "https://shopify.dev/docs/apps/tools/app-bridge",
          target: "_blank",
          children: "App Bridge"
        }), " ", "interface examples like an", " ", /* @__PURE__ */ jsx("s-link", {
          href: "/app/additional",
          children: "additional page in the app nav"
        }), ", as well as an", " ", /* @__PURE__ */ jsx("s-link", {
          href: "https://shopify.dev/docs/api/admin-graphql",
          target: "_blank",
          children: "Admin GraphQL"
        }), " ", "mutation demo, to provide a starting point for app development."]
      })
    }), /* @__PURE__ */ jsxs("s-section", {
      heading: "Get started with products",
      children: [/* @__PURE__ */ jsxs("s-paragraph", {
        children: ["Generate a product with GraphQL and get the JSON output for that product. Learn more about the", " ", /* @__PURE__ */ jsx("s-link", {
          href: "https://shopify.dev/docs/api/admin-graphql/latest/mutations/productCreate",
          target: "_blank",
          children: "productCreate"
        }), " ", "mutation in our API references. Includes a product", " ", /* @__PURE__ */ jsx("s-link", {
          href: "https://shopify.dev/docs/apps/build/custom-data/metafields",
          target: "_blank",
          children: "metafield"
        }), " ", "and", " ", /* @__PURE__ */ jsx("s-link", {
          href: "https://shopify.dev/docs/apps/build/custom-data/metaobjects",
          target: "_blank",
          children: "metaobject"
        }), "."]
      }), /* @__PURE__ */ jsxs("s-stack", {
        direction: "inline",
        gap: "base",
        children: [/* @__PURE__ */ jsx("s-button", {
          onClick: generateProduct,
          ...isLoading ? {
            loading: true
          } : {},
          children: "Generate a product"
        }), ((_c = fetcher.data) == null ? void 0 : _c.product) && /* @__PURE__ */ jsx("s-button", {
          onClick: () => {
            var _a3, _b2, _c2, _d2;
            (_d2 = (_c2 = shopify2.intents).invoke) == null ? void 0 : _d2.call(_c2, "edit:shopify/Product", {
              value: (_b2 = (_a3 = fetcher.data) == null ? void 0 : _a3.product) == null ? void 0 : _b2.id
            });
          },
          target: "_blank",
          variant: "tertiary",
          children: "Edit product"
        })]
      }), ((_d = fetcher.data) == null ? void 0 : _d.product) && /* @__PURE__ */ jsx("s-section", {
        heading: "productCreate mutation",
        children: /* @__PURE__ */ jsxs("s-stack", {
          direction: "block",
          gap: "base",
          children: [/* @__PURE__ */ jsx("s-box", {
            padding: "base",
            borderWidth: "base",
            borderRadius: "base",
            background: "subdued",
            children: /* @__PURE__ */ jsx("pre", {
              style: {
                margin: 0
              },
              children: /* @__PURE__ */ jsx("code", {
                children: JSON.stringify(fetcher.data.product, null, 2)
              })
            })
          }), /* @__PURE__ */ jsx("s-heading", {
            children: "productVariantsBulkUpdate mutation"
          }), /* @__PURE__ */ jsx("s-box", {
            padding: "base",
            borderWidth: "base",
            borderRadius: "base",
            background: "subdued",
            children: /* @__PURE__ */ jsx("pre", {
              style: {
                margin: 0
              },
              children: /* @__PURE__ */ jsx("code", {
                children: JSON.stringify(fetcher.data.variant, null, 2)
              })
            })
          }), /* @__PURE__ */ jsx("s-heading", {
            children: "metaobjectUpsert mutation"
          }), /* @__PURE__ */ jsx("s-box", {
            padding: "base",
            borderWidth: "base",
            borderRadius: "base",
            background: "subdued",
            children: /* @__PURE__ */ jsx("pre", {
              style: {
                margin: 0
              },
              children: /* @__PURE__ */ jsx("code", {
                children: JSON.stringify(fetcher.data.metaobject, null, 2)
              })
            })
          })]
        })
      })]
    }), /* @__PURE__ */ jsxs("s-section", {
      slot: "aside",
      heading: "App template specs",
      children: [/* @__PURE__ */ jsxs("s-paragraph", {
        children: [/* @__PURE__ */ jsx("s-text", {
          children: "Framework: "
        }), /* @__PURE__ */ jsx("s-link", {
          href: "https://reactrouter.com/",
          target: "_blank",
          children: "React Router"
        })]
      }), /* @__PURE__ */ jsxs("s-paragraph", {
        children: [/* @__PURE__ */ jsx("s-text", {
          children: "Interface: "
        }), /* @__PURE__ */ jsx("s-link", {
          href: "https://shopify.dev/docs/api/app-home/using-polaris-components",
          target: "_blank",
          children: "Polaris web components"
        })]
      }), /* @__PURE__ */ jsxs("s-paragraph", {
        children: [/* @__PURE__ */ jsx("s-text", {
          children: "API: "
        }), /* @__PURE__ */ jsx("s-link", {
          href: "https://shopify.dev/docs/api/admin-graphql",
          target: "_blank",
          children: "GraphQL"
        })]
      }), /* @__PURE__ */ jsxs("s-paragraph", {
        children: [/* @__PURE__ */ jsx("s-text", {
          children: "Custom data: "
        }), /* @__PURE__ */ jsx("s-link", {
          href: "https://shopify.dev/docs/apps/build/custom-data",
          target: "_blank",
          children: "Metafields & metaobjects"
        })]
      }), /* @__PURE__ */ jsxs("s-paragraph", {
        children: [/* @__PURE__ */ jsx("s-text", {
          children: "Database: "
        }), /* @__PURE__ */ jsx("s-link", {
          href: "https://www.prisma.io/",
          target: "_blank",
          children: "Prisma"
        })]
      })]
    }), /* @__PURE__ */ jsx("s-section", {
      slot: "aside",
      heading: "Next steps",
      children: /* @__PURE__ */ jsxs("s-unordered-list", {
        children: [/* @__PURE__ */ jsxs("s-list-item", {
          children: ["Build an", " ", /* @__PURE__ */ jsx("s-link", {
            href: "https://shopify.dev/docs/apps/getting-started/build-app-example",
            target: "_blank",
            children: "example app"
          })]
        }), /* @__PURE__ */ jsxs("s-list-item", {
          children: ["Explore Shopify's API with", " ", /* @__PURE__ */ jsx("s-link", {
            href: "https://shopify.dev/docs/apps/tools/graphiql-admin-api",
            target: "_blank",
            children: "GraphiQL"
          })]
        })]
      })
    })]
  });
});
const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};
const route8 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  action,
  default: app__index,
  headers,
  loader
}, Symbol.toStringTag, { value: "Module" }));
const serverManifest = { "entry": { "module": "/assets/entry.client-jKa4imdF.js", "imports": ["/assets/chunk-4N6VE7H7-BqqZqpbR.js"], "css": [] }, "routes": { "root": { "id": "root", "parentId": void 0, "path": "", "index": void 0, "caseSensitive": void 0, "hasAction": false, "hasLoader": false, "hasClientAction": false, "hasClientLoader": false, "hasClientMiddleware": false, "hasDefaultExport": true, "hasErrorBoundary": false, "module": "/assets/root-BWPWnDRG.js", "imports": ["/assets/chunk-4N6VE7H7-BqqZqpbR.js"], "css": [], "clientActionModule": void 0, "clientLoaderModule": void 0, "clientMiddlewareModule": void 0, "hydrateFallbackModule": void 0 }, "routes/webhooks.app.scopes_update": { "id": "routes/webhooks.app.scopes_update", "parentId": "root", "path": "webhooks/app/scopes_update", "index": void 0, "caseSensitive": void 0, "hasAction": true, "hasLoader": false, "hasClientAction": false, "hasClientLoader": false, "hasClientMiddleware": false, "hasDefaultExport": false, "hasErrorBoundary": false, "module": "/assets/webhooks.app.scopes_update-l0sNRNKZ.js", "imports": [], "css": [], "clientActionModule": void 0, "clientLoaderModule": void 0, "clientMiddlewareModule": void 0, "hydrateFallbackModule": void 0 }, "routes/webhooks.app.uninstalled": { "id": "routes/webhooks.app.uninstalled", "parentId": "root", "path": "webhooks/app/uninstalled", "index": void 0, "caseSensitive": void 0, "hasAction": true, "hasLoader": false, "hasClientAction": false, "hasClientLoader": false, "hasClientMiddleware": false, "hasDefaultExport": false, "hasErrorBoundary": false, "module": "/assets/webhooks.app.uninstalled-l0sNRNKZ.js", "imports": [], "css": [], "clientActionModule": void 0, "clientLoaderModule": void 0, "clientMiddlewareModule": void 0, "hydrateFallbackModule": void 0 }, "routes/auth.login": { "id": "routes/auth.login", "parentId": "root", "path": "auth/login", "index": void 0, "caseSensitive": void 0, "hasAction": true, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasClientMiddleware": false, "hasDefaultExport": true, "hasErrorBoundary": false, "module": "/assets/route-BMPWkDqI.js", "imports": ["/assets/chunk-4N6VE7H7-BqqZqpbR.js", "/assets/AppProxyProvider-DtCi0j36.js"], "css": [], "clientActionModule": void 0, "clientLoaderModule": void 0, "clientMiddlewareModule": void 0, "hydrateFallbackModule": void 0 }, "routes/auth.$": { "id": "routes/auth.$", "parentId": "root", "path": "auth/*", "index": void 0, "caseSensitive": void 0, "hasAction": false, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasClientMiddleware": false, "hasDefaultExport": false, "hasErrorBoundary": false, "module": "/assets/auth._-l0sNRNKZ.js", "imports": [], "css": [], "clientActionModule": void 0, "clientLoaderModule": void 0, "clientMiddlewareModule": void 0, "hydrateFallbackModule": void 0 }, "routes/_index": { "id": "routes/_index", "parentId": "root", "path": void 0, "index": true, "caseSensitive": void 0, "hasAction": true, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasClientMiddleware": false, "hasDefaultExport": true, "hasErrorBoundary": false, "module": "/assets/route-CSVa9XH6.js", "imports": ["/assets/chunk-4N6VE7H7-BqqZqpbR.js"], "css": [], "clientActionModule": void 0, "clientLoaderModule": void 0, "clientMiddlewareModule": void 0, "hydrateFallbackModule": void 0 }, "routes/app": { "id": "routes/app", "parentId": "root", "path": "app", "index": void 0, "caseSensitive": void 0, "hasAction": false, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasClientMiddleware": false, "hasDefaultExport": true, "hasErrorBoundary": true, "module": "/assets/app-DqTe_GrD.js", "imports": ["/assets/chunk-4N6VE7H7-BqqZqpbR.js", "/assets/AppProxyProvider-DtCi0j36.js"], "css": [], "clientActionModule": void 0, "clientLoaderModule": void 0, "clientMiddlewareModule": void 0, "hydrateFallbackModule": void 0 }, "routes/app.additional": { "id": "routes/app.additional", "parentId": "routes/app", "path": "additional", "index": void 0, "caseSensitive": void 0, "hasAction": false, "hasLoader": false, "hasClientAction": false, "hasClientLoader": false, "hasClientMiddleware": false, "hasDefaultExport": true, "hasErrorBoundary": false, "module": "/assets/app.additional-BlOUzG0P.js", "imports": ["/assets/chunk-4N6VE7H7-BqqZqpbR.js"], "css": [], "clientActionModule": void 0, "clientLoaderModule": void 0, "clientMiddlewareModule": void 0, "hydrateFallbackModule": void 0 }, "routes/app._index": { "id": "routes/app._index", "parentId": "routes/app", "path": void 0, "index": true, "caseSensitive": void 0, "hasAction": true, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasClientMiddleware": false, "hasDefaultExport": true, "hasErrorBoundary": false, "module": "/assets/app._index-jU3zfUPz.js", "imports": ["/assets/chunk-4N6VE7H7-BqqZqpbR.js"], "css": [], "clientActionModule": void 0, "clientLoaderModule": void 0, "clientMiddlewareModule": void 0, "hydrateFallbackModule": void 0 } }, "url": "/assets/manifest-eef6cfed.js", "version": "eef6cfed", "sri": void 0 };
const assetsBuildDirectory = "build\\client";
const basename = "/";
const future = { "unstable_optimizeDeps": false, "v8_passThroughRequests": false, "unstable_trailingSlashAwareDataRequests": false, "unstable_previewServerPrerendering": false, "v8_middleware": false, "v8_splitRouteModules": false, "v8_viteEnvironmentApi": false };
const ssr = true;
const isSpaMode = false;
const prerender = [];
const routeDiscovery = { "mode": "lazy", "manifestPath": "/__manifest" };
const publicPath = "/";
const entry = { module: entryServer };
const routes = {
  "root": {
    id: "root",
    parentId: void 0,
    path: "",
    index: void 0,
    caseSensitive: void 0,
    module: route0
  },
  "routes/webhooks.app.scopes_update": {
    id: "routes/webhooks.app.scopes_update",
    parentId: "root",
    path: "webhooks/app/scopes_update",
    index: void 0,
    caseSensitive: void 0,
    module: route1
  },
  "routes/webhooks.app.uninstalled": {
    id: "routes/webhooks.app.uninstalled",
    parentId: "root",
    path: "webhooks/app/uninstalled",
    index: void 0,
    caseSensitive: void 0,
    module: route2
  },
  "routes/auth.login": {
    id: "routes/auth.login",
    parentId: "root",
    path: "auth/login",
    index: void 0,
    caseSensitive: void 0,
    module: route3
  },
  "routes/auth.$": {
    id: "routes/auth.$",
    parentId: "root",
    path: "auth/*",
    index: void 0,
    caseSensitive: void 0,
    module: route4
  },
  "routes/_index": {
    id: "routes/_index",
    parentId: "root",
    path: void 0,
    index: true,
    caseSensitive: void 0,
    module: route5
  },
  "routes/app": {
    id: "routes/app",
    parentId: "root",
    path: "app",
    index: void 0,
    caseSensitive: void 0,
    module: route6
  },
  "routes/app.additional": {
    id: "routes/app.additional",
    parentId: "routes/app",
    path: "additional",
    index: void 0,
    caseSensitive: void 0,
    module: route7
  },
  "routes/app._index": {
    id: "routes/app._index",
    parentId: "routes/app",
    path: void 0,
    index: true,
    caseSensitive: void 0,
    module: route8
  }
};
const allowedActionOrigins = false;
export {
  allowedActionOrigins,
  serverManifest as assets,
  assetsBuildDirectory,
  basename,
  entry,
  future,
  isSpaMode,
  prerender,
  publicPath,
  routeDiscovery,
  routes,
  ssr
};
