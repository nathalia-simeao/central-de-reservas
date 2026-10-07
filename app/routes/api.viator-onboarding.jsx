import { data } from "react-router";
import db from "../db.server";
import { authenticate } from "../shopify.server";
import {
  buildViatorOnboardingStatus,
  connectViatorMapping,
  disconnectViatorMapping,
  fetchViatorMappingCatalog,
} from "../utils/viator-onboarding.server";

const json = (body, init) => data(body, init);

function clean(value) {
  return String(value ?? "").trim();
}

function errorResponse(error) {
  return json(
    {
      success: false,
      code: error?.code || "VIATOR_ONBOARDING_ERROR",
      error: error?.message || "Falha na integração Viator.",
      retryAfter: error?.retryAfter || null,
      details: error?.payload || null,
    },
    { status: Number(error?.status) || 500 },
  );
}

export const loader = async ({ request }) => {
  await authenticate.admin(request);
  const status = await buildViatorOnboardingStatus(db, request.url);
  return json({ success: true, status });
};

export const action = async ({ request }) => {
  await authenticate.admin(request);
  const formData = await request.formData();
  const action = clean(formData.get("_action")).toLowerCase();

  try {
    if (action === "catalog") {
      const catalog = await fetchViatorMappingCatalog(db);
      const status = await buildViatorOnboardingStatus(db, request.url);
      return json({ success: true, catalog, status });
    }

    if (action === "connect") {
      const result = await connectViatorMapping(db, {
        productOptionId: formData.get("productOptionId"),
        productCode: formData.get("productCode"),
        tourGradeCode: formData.get("tourGradeCode"),
      });
      const catalog = await fetchViatorMappingCatalog(db);
      const status = await buildViatorOnboardingStatus(db, request.url);
      return json({ success: true, result, catalog, status });
    }

    if (action === "disconnect") {
      const result = await disconnectViatorMapping(db, {
        productOptionId: formData.get("productOptionId"),
        productCode: formData.get("productCode"),
        tourGradeCode: formData.get("tourGradeCode"),
      });
      const catalog = await fetchViatorMappingCatalog(db);
      const status = await buildViatorOnboardingStatus(db, request.url);
      return json({ success: true, result, catalog, status });
    }

    return json(
      { success: false, error: "Ação Viator inválida." },
      { status: 400 },
    );
  } catch (error) {
    console.error("[VIATOR] onboarding action failed", error);
    return errorResponse(error);
  }
};
