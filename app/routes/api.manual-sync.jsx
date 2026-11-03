import { data } from "react-router";
import { requireCentralAdmin } from "../utils/central-access.server.js";
import db from "../db.server";
import { authenticate } from "../shopify.server";

const json = (body, init) => data(body, init);

export const action = async ({ request }) => {
  const { admin } = (await requireCentralAdmin(db, authenticate, request)).auth;
  const formData = await request.formData();
  const platform = String(formData.get("platform") || "").trim();

  if (!platform) {
    return json(
      { success: false, error: "Plataforma é obrigatória." },
      { status: 400 },
    );
  }

  try {
    const { syncPlatformNow } = await import("../utils/platform-sync.server");
    const result = await syncPlatformNow(db, admin, platform);
    return json({ success: true, result });
  } catch (error) {
    console.error("[PMY] resource manual sync failed:", error);
    return json(
      {
        success: false,
        error: error?.message || "Falha ao sincronizar a plataforma.",
      },
      { status: 500 },
    );
  }
};
