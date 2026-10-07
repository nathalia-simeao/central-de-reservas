import { data } from "react-router";
import { authenticate } from "../shopify.server";
import {
  viatorMappingApiInfo,
  viatorMappingCatalog,
  viatorMappingConnect,
  viatorMappingDisconnect,
} from "../utils/viator-mappings.server";

const json = (body, init) => data(body, init);

function clean(value) {
  return String(value ?? "").trim();
}

function errorResponse(error) {
  return json(
    {
      success: false,
      error: error?.message || "Falha na Viator Product Mapping API.",
      code: error?.code || "VIATOR_MAPPING_ERROR",
      retryAfter: error?.retryAfter || null,
      remoteStatus: error?.status || null,
    },
    { status: Number(error?.status) || 500 },
  );
}

export const loader = async ({ request }) => {
  await authenticate.admin(request);
  try {
    const url = new URL(request.url);
    const catalog = await viatorMappingCatalog({
      productCode: url.searchParams.get("productCode"),
      productOptionId: url.searchParams.get("productOptionId"),
    });
    return json({
      success: true,
      catalog,
      api: viatorMappingApiInfo(),
    });
  } catch (error) {
    console.error("[VIATOR mappings] catalog failed", error);
    return errorResponse(error);
  }
};

export const action = async ({ request }) => {
  await authenticate.admin(request);
  const formData = await request.formData();
  const action = clean(formData.get("_action")).toLowerCase();
  const input = {
    productOptionId: clean(formData.get("productOptionId")),
    productCode: clean(formData.get("productCode")),
    tourGradeCode: clean(formData.get("tourGradeCode")),
  };

  try {
    if (action === "catalog") {
      const catalog = await viatorMappingCatalog({
        productCode: input.productCode,
        productOptionId: input.productOptionId,
      });
      return json({ success: true, catalog });
    }

    if (action === "connect") {
      const result = await viatorMappingConnect(input);
      return json({ success: true, result });
    }

    if (action === "disconnect") {
      const result = await viatorMappingDisconnect(input);
      return json({ success: true, result });
    }

    return json(
      { success: false, error: "Ação de mapeamento Viator inválida." },
      { status: 400 },
    );
  } catch (error) {
    console.error("[VIATOR mappings] action failed", error);
    return errorResponse(error);
  }
};
