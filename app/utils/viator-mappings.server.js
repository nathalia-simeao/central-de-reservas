import db from "../db.server";
import { getIntegrationCredentials } from "./integration-secrets.server";

const DEFAULT_BASE = "https://api.viator.com";

function clean(value) {
  return String(value ?? "").trim();
}

function numericSupplierId(value) {
  const raw = clean(value);
  return /^\d+$/.test(raw) ? Number(raw) : null;
}

async function credentials() {
  let stored = null;
  try {
    stored = await getIntegrationCredentials(db, "VIATOR");
  } catch (error) {
    console.error("[VIATOR mappings] encrypted credential read failed", error);
  }

  const apiKey =
    clean(stored?.credentials?.apiKey) || clean(process.env.VIATOR_API_KEY);
  const supplierId =
    numericSupplierId(stored?.credentials?.supplierId) ||
    numericSupplierId(process.env.VIATOR_SUPPLIER_ID);

  if (!apiKey || !supplierId) {
    const error = new Error(
      "Viator API Key e Supplier ID precisam estar configurados antes do mapeamento.",
    );
    error.code = "VIATOR_CREDENTIALS_MISSING";
    throw error;
  }

  return { apiKey, supplierId };
}

function apiBase() {
  return clean(process.env.VIATOR_API_BASE || DEFAULT_BASE).replace(/\/+$/, "");
}

async function readPayload(response) {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text.slice(0, 1200) };
  }
}

function remoteError(response, payload) {
  const remoteCode =
    payload?.error ||
    payload?.errorCode ||
    payload?.code ||
    payload?.errors?.[0]?.code ||
    null;
  const message =
    payload?.message ||
    payload?.errorMessage ||
    payload?.errors?.[0]?.message ||
    `Viator Mapping API returned HTTP ${response.status}.`;
  const error = new Error(String(message));
  error.status = response.status;
  error.code = remoteCode ? String(remoteCode) : "VIATOR_MAPPING_ERROR";
  error.retryAfter = response.headers.get("retry-after");
  error.payload = payload;
  return error;
}

async function post(pathname, body) {
  const { apiKey } = await credentials();
  const response = await fetch(`${apiBase()}${pathname}`, {
    method: "POST",
    headers: {
      "X-Api-Key": apiKey,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const payload = await readPayload(response);
  if (!response.ok) throw remoteError(response, payload);
  return payload;
}

export async function viatorMappingCatalog({
  productCode = null,
  productOptionId = null,
} = {}) {
  const { supplierId } = await credentials();
  const filters = {};
  const cleanProductCode = clean(productCode);
  const cleanProductOptionId = clean(productOptionId);
  if (cleanProductCode) filters.productCode = cleanProductCode;
  if (cleanProductOptionId) filters.productOptionId = cleanProductOptionId;

  return post("/v2/mappings/catalog", {
    supplierId,
    ...(Object.keys(filters).length ? { filters } : {}),
  });
}

export async function viatorMappingConnect({
  productOptionId,
  productCode,
  tourGradeCode,
}) {
  const { supplierId } = await credentials();
  const optionId = clean(productOptionId);
  const viatorProduct = clean(productCode);
  const grade = clean(tourGradeCode);

  if (!optionId || !viatorProduct || !grade) {
    const error = new Error(
      "productOptionId, productCode e tourGradeCode são obrigatórios.",
    );
    error.code = "VIATOR_MAPPING_INPUT_INVALID";
    throw error;
  }

  return post("/v2/mappings/connect", {
    supplierId,
    mappings: [
      {
        productOptionId: optionId,
        viatorReferences: {
          productCode: viatorProduct,
          tourGradeCode: grade,
        },
      },
    ],
  });
}

export async function viatorMappingDisconnect({
  productOptionId,
  productCode,
  tourGradeCode,
}) {
  const { supplierId } = await credentials();
  const optionId = clean(productOptionId);
  const viatorProduct = clean(productCode);
  const grade = clean(tourGradeCode);

  if (!optionId || !viatorProduct || !grade) {
    const error = new Error(
      "productOptionId, productCode e tourGradeCode são obrigatórios.",
    );
    error.code = "VIATOR_MAPPING_INPUT_INVALID";
    throw error;
  }

  return post("/v2/mappings/disconnect", {
    supplierId,
    mappings: [
      {
        productOptionId: optionId,
        viatorReferences: {
          productCode: viatorProduct,
          tourGradeCode: grade,
        },
      },
    ],
  });
}

export function viatorMappingApiInfo() {
  return {
    baseUrl: apiBase(),
    endpoints: {
      catalog: "/v2/mappings/catalog",
      connect: "/v2/mappings/connect",
      disconnect: "/v2/mappings/disconnect",
    },
  };
}
