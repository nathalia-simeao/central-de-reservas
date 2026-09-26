import { data } from "react-router";
import db from "../db.server";
import { authenticate } from "../shopify.server";
import { syncPlatformNow } from "../utils/platform-sync.server";

const json = (body, init) => data(body, init);

export const action = async ({ request }) => {
  const { admin } = await authenticate.admin(request);
  const formData = await request.formData();
  const platform = String(formData.get("platform") || "").trim();

  if (!platform) {
    return json(
      { success: false, error: "Plataforma é obrigatória." },
      { status: 400 },
    );
  }

  try {
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
