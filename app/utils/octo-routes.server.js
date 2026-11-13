// Rotas /octo/* (Klook, Tiqets, Headout): autentica pela chave da plataforma e
// roda a Supplier API da Central marcando as reservas com essa plataforma.
import db from "../db.server";
import {
  civitatisAvailability,
  civitatisCancelBooking,
  civitatisConfirmBooking,
  civitatisCreateBooking,
  civitatisGetBooking,
  runAsReseller,
  supplierCatalog,
} from "./civitatis.server";
import {
  octoAvailability, octoCalendar, octoError, octoJson, octoProduct, requireOctoAuth, toOctoResponse,
} from "./octo.server";

async function readBody(request) {
  try {
    const body = await request.json();
    return body && typeof body === "object" && !Array.isArray(body) ? body : null;
  } catch {
    return null;
  }
}

export async function withOcto(request, endpoint, handler) {
  const auth = await requireOctoAuth(db, request, endpoint);
  if (auth.error) return auth.error;
  try {
    return await runAsReseller(auth.platform, () => handler(auth.platform));
  } catch (error) {
    console.error(`[OCTO] ${endpoint} failed`, error);
    return octoError(500, "INTERNAL_SERVER_ERROR", "Unexpected error.");
  }
}

export const octoSupplier = () => octoJson({
  id: "portugal-me-and-you",
  name: "Portugal, Me & You",
  endpoint: `${String(process.env.SHOPIFY_APP_URL || "").replace(/\/$/, "")}/octo`,
  contact: { website: "https://portugalmeandyou.com", email: null, telephone: null, address: "Lisboa, Portugal" },
});

export async function octoProducts() {
  return octoJson((await supplierCatalog()).map(octoProduct));
}

export async function octoProductById(productId) {
  const [entry] = await supplierCatalog(productId);
  if (!entry) return octoError(400, "INVALID_PRODUCT_ID", "Product not found.", { productId });
  return octoJson(octoProduct(entry));
}

async function availabilityItems(request, body) {
  const [entry] = await supplierCatalog(body?.productId);
  const tz = entry?.tour?.timezone || "Europe/Lisbon";
  const response = await civitatisAvailability(request, { ...body, optionId: body?.optionId || "STANDARD" });
  return { response, tz };
}

export async function octoAvailabilityCheck(request) {
  const body = await readBody(request);
  if (!body) return octoError(400, "BAD_REQUEST", "Request body must be a JSON object.");
  let query = body;
  // OCTO também aceita availabilityIds (consulta de horários específicos).
  if (Array.isArray(body.availabilityIds) && body.availabilityIds.length && !body.localDateStart) {
    const days = body.availabilityIds.map((id) => String(id).slice(0, 10)).filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d)).sort();
    if (days.length) query = { ...body, localDateStart: days[0], localDateEnd: days[days.length - 1] };
  }
  if (body.localDate && !body.localDateStart) query = { ...body, localDateStart: body.localDate, localDateEnd: body.localDate };
  const { response, tz } = await availabilityItems(request, query);
  return toOctoResponse(response, (items) => {
    let list = (items || []).map((item) => octoAvailability(item, tz));
    if (Array.isArray(body.availabilityIds) && body.availabilityIds.length) {
      const wanted = new Set(body.availabilityIds.map(String));
      list = list.filter((item) => wanted.has(String(item.id)));
    }
    return list;
  });
}

export async function octoAvailabilityCalendar(request) {
  const body = await readBody(request);
  if (!body) return octoError(400, "BAD_REQUEST", "Request body must be a JSON object.");
  const { response, tz } = await availabilityItems(request, body);
  return toOctoResponse(response, (items) => octoCalendar(items || [], body, tz));
}

async function bookingDetails(uuid) {
  return toOctoResponse(await civitatisGetBooking(uuid), (booking) => ({ ...booking, testMode: false }));
}

export async function octoCreateBooking(request) {
  const body = await readBody(request);
  if (!body) return octoError(400, "BAD_REQUEST", "Request body must be a JSON object.");
  const created = await civitatisCreateBooking(request, { ...body, optionId: body.optionId || "STANDARD" });
  if (!created.ok) return toOctoResponse(created);
  const { uuid } = await created.clone().json();
  return bookingDetails(uuid);
}

export async function octoConfirmBooking(request, uuid) {
  const body = (await readBody(request)) || {};
  const contact = body.contact || (body.unitItems || []).find((u) => u?.contact)?.contact || {};
  return toOctoResponse(await civitatisConfirmBooking(request, uuid, { ...body, contact }), (booking) => ({ ...booking, testMode: false }));
}

export async function octoGetBooking(uuid) {
  return bookingDetails(uuid);
}

export async function octoCancelBooking(uuid) {
  return toOctoResponse(await civitatisCancelBooking(uuid), (booking) => ({ ...booking, testMode: false }));
}
