export const COMMERCIAL_SOURCES = Object.freeze({
  SITE: "Site",
  GOOGLE_ADS: "Google Ads",
  GOOGLE_ORGANIC: "Google Organic",
  INSTAGRAM: "Instagram",
  FACEBOOK: "Facebook",
  WHATSAPP: "WhatsApp",
  EMAIL: "Email",
  PARTNER: "Parceiro",
  VIATOR: "Viator",
  GETYOURGUIDE: "GetYourGuide",
  HEADOUT: "Headout",
  CIVITATIS: "Civitatis",
  TIKTOK: "TikTok",
  MICROSOFT_ADS: "Microsoft Ads",
  REFERRAL: "Referência",
  MANUAL: "Manual",
  OTHER: "Outro",
});

function clean(value) {
  return String(value ?? "").trim();
}

function token(value) {
  return clean(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function hasAny(haystack, values) {
  const value = token(haystack);
  return values.some((item) => value.includes(token(item)));
}

function canonicalExplicit(value) {
  const normalized = token(value);
  if (!normalized) return null;

  const aliases = new Map([
    ["site", COMMERCIAL_SOURCES.SITE],
    ["direct", COMMERCIAL_SOURCES.SITE],
    ["direto", COMMERCIAL_SOURCES.SITE],
    ["google_ads", COMMERCIAL_SOURCES.GOOGLE_ADS],
    ["googleads", COMMERCIAL_SOURCES.GOOGLE_ADS],
    ["google_organic", COMMERCIAL_SOURCES.GOOGLE_ORGANIC],
    ["instagram", COMMERCIAL_SOURCES.INSTAGRAM],
    ["facebook", COMMERCIAL_SOURCES.FACEBOOK],
    ["meta", COMMERCIAL_SOURCES.FACEBOOK],
    ["whatsapp", COMMERCIAL_SOURCES.WHATSAPP],
    ["email", COMMERCIAL_SOURCES.EMAIL],
    ["parceiro", COMMERCIAL_SOURCES.PARTNER],
    ["partner", COMMERCIAL_SOURCES.PARTNER],
    ["affiliate", COMMERCIAL_SOURCES.PARTNER],
    ["afiliado", COMMERCIAL_SOURCES.PARTNER],
    ["viator", COMMERCIAL_SOURCES.VIATOR],
    ["getyourguide", COMMERCIAL_SOURCES.GETYOURGUIDE],
    ["get_your_guide", COMMERCIAL_SOURCES.GETYOURGUIDE],
    ["gyg", COMMERCIAL_SOURCES.GETYOURGUIDE],
    ["headout", COMMERCIAL_SOURCES.HEADOUT],
    ["civitatis", COMMERCIAL_SOURCES.CIVITATIS],
    ["tiktok", COMMERCIAL_SOURCES.TIKTOK],
    ["microsoft_ads", COMMERCIAL_SOURCES.MICROSOFT_ADS],
    ["bing_ads", COMMERCIAL_SOURCES.MICROSOFT_ADS],
    ["referencia", COMMERCIAL_SOURCES.REFERRAL],
    ["referral", COMMERCIAL_SOURCES.REFERRAL],
    ["manual", COMMERCIAL_SOURCES.MANUAL],
    ["central", COMMERCIAL_SOURCES.MANUAL],
    ["outro", COMMERCIAL_SOURCES.OTHER],
    ["other", COMMERCIAL_SOURCES.OTHER],
  ]);

  return aliases.get(normalized) || null;
}

export function classifyCommercialSource({
  platform = null,
  commercialSource = null,
  attribution = null,
  source = null,
  medium = null,
  channel = null,
  name = null,
  referralCode = null,
} = {}) {
  const explicit =
    canonicalExplicit(commercialSource) ||
    canonicalExplicit(attribution?.commercialSource);
  if (explicit) return explicit;

  const normalizedPlatform = token(platform);
  if (normalizedPlatform === "viator") return COMMERCIAL_SOURCES.VIATOR;
  if (["getyourguide", "get_your_guide", "gyg"].includes(normalizedPlatform)) {
    return COMMERCIAL_SOURCES.GETYOURGUIDE;
  }
  if (normalizedPlatform === "headout") return COMMERCIAL_SOURCES.HEADOUT;
  if (normalizedPlatform === "civitatis") return COMMERCIAL_SOURCES.CIVITATIS;
  if (["manual", "central"].includes(normalizedPlatform)) {
    return COMMERCIAL_SOURCES.MANUAL;
  }

  const src =
    source ??
    attribution?.source ??
    attribution?.utmSource ??
    attribution?.utm_source ??
    "";
  const med =
    medium ??
    attribution?.medium ??
    attribution?.utmMedium ??
    attribution?.utm_medium ??
    "";
  const ch =
    channel ??
    attribution?.channel ??
    attribution?.order_referrer_channel ??
    "";
  const label =
    name ??
    attribution?.name ??
    attribution?.order_referrer_name ??
    "";
  const referral =
    referralCode ??
    attribution?.referralCode ??
    attribution?.referral_code ??
    "";

  const hasGoogleClick =
    Boolean(clean(attribution?.gclid)) ||
    Boolean(clean(attribution?.gbraid)) ||
    Boolean(clean(attribution?.wbraid));
  const paid =
    hasGoogleClick ||
    hasAny(med, ["cpc", "ppc", "paid", "paid_search", "paid_social", "display", "cpm"]) ||
    hasAny(ch, ["paid_search", "paid_social"]);

  if (hasAny(src + " " + label, ["google", "googleadservices", "doubleclick"]) || hasGoogleClick) {
    return paid ? COMMERCIAL_SOURCES.GOOGLE_ADS : COMMERCIAL_SOURCES.GOOGLE_ORGANIC;
  }

  if (hasAny(src + " " + label, ["instagram", "l.instagram", "ig"])) {
    return COMMERCIAL_SOURCES.INSTAGRAM;
  }

  if (hasAny(src + " " + label, ["facebook", "fb.com", "meta"]) || attribution?.fbclid) {
    return COMMERCIAL_SOURCES.FACEBOOK;
  }

  if (hasAny(src + " " + label, ["whatsapp", "wa.me", "api.whatsapp"])) {
    return COMMERCIAL_SOURCES.WHATSAPP;
  }

  if (hasAny(src + " " + label, ["tiktok"]) || attribution?.ttclid) {
    return COMMERCIAL_SOURCES.TIKTOK;
  }

  if (hasAny(src + " " + label, ["bing", "microsoft"]) || attribution?.msclkid) {
    return paid || attribution?.msclkid
      ? COMMERCIAL_SOURCES.MICROSOFT_ADS
      : COMMERCIAL_SOURCES.REFERRAL;
  }

  if (hasAny(med, ["email"]) || hasAny(src, ["mailchimp", "klaviyo", "resend"])) {
    return COMMERCIAL_SOURCES.EMAIL;
  }

  if (
    referral ||
    hasAny(src + " " + med + " " + ch, [
      "partner",
      "parceiro",
      "affiliate",
      "afiliado",
      "indicacao",
      "referral_partner",
      "guia",
    ])
  ) {
    return COMMERCIAL_SOURCES.PARTNER;
  }

  if (hasAny(ch, ["referral"])) return COMMERCIAL_SOURCES.REFERRAL;

  if (
    !clean(src) ||
    hasAny(src, ["direct", "site", "website", "pmy", "portugalmeandyou"]) ||
    hasAny(ch, ["direct"])
  ) {
    return COMMERCIAL_SOURCES.SITE;
  }

  if (normalizedPlatform === "shopify") {
    return COMMERCIAL_SOURCES.SITE;
  }

  return COMMERCIAL_SOURCES.OTHER;
}
