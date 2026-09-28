import { data } from "react-router";
import { authenticate } from "../shopify.server";
import db from "../db.server";

const json = (body, init) => data(body, init);

function normalizeVariant(value) {
  const variant = String(value || "").trim().toLowerCase();
  return variant === "dark" ? "dark" : variant === "light" ? "light" : null;
}

const ALLOWED_IMAGE_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "image/svg+xml",
]);

const MAX_LOGO_BYTES = 2 * 1024 * 1024;

export const action = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();
  const action = String(formData.get("_action") || "").trim();
  const variant = normalizeVariant(formData.get("variant"));

  if (!session?.shop) {
    return json(
      { success: false, error: "Loja Shopify não identificada." },
      { status: 400 },
    );
  }

  if (!variant) {
    return json(
      { success: false, error: "Versão da logo inválida." },
      { status: 400 },
    );
  }

  if (action === "saveLogo") {
    try {
      const file = formData.get("file");

      if (!file || typeof file.arrayBuffer !== "function") {
        return json(
          { success: false, error: "Nenhum arquivo de imagem foi recebido." },
          { status: 400 },
        );
      }

      const mimetype = String(file.type || "").trim().toLowerCase();
      const size = Number(file.size || 0);

      if (!ALLOWED_IMAGE_TYPES.has(mimetype)) {
        return json(
          { success: false, error: "Formato não permitido. Use PNG, JPG, WEBP, GIF ou SVG." },
          { status: 400 },
        );
      }

      if (!Number.isFinite(size) || size <= 0 || size > MAX_LOGO_BYTES) {
        return json(
          { success: false, error: "A logo deve ter no máximo 2 MB." },
          { status: 400 },
        );
      }

      const bytes = Buffer.from(await file.arrayBuffer());
      const dataUrl = `data:${mimetype};base64,${bytes.toString("base64")}`;
      const field = variant === "dark" ? "logoOnDarkUrl" : "logoOnLightUrl";

      const settings = await db.businessSetting.upsert({
        where: { shop: session.shop },
        create: {
          shop: session.shop,
          [field]: dataUrl,
        },
        update: {
          [field]: dataUrl,
        },
      });

      return json({
        success: true,
        variant,
        url: dataUrl,
        settings,
      });
    } catch (error) {
      console.error("[PMY] saveLogo failed:", error);
      return json(
        { success: false, error: error?.message || "Falha ao salvar a logo." },
        { status: 500 },
      );
    }
  }

  if (action === "removeLogo") {
    try {
      const field = variant === "dark" ? "logoOnDarkUrl" : "logoOnLightUrl";

      const settings = await db.businessSetting.upsert({
        where: { shop: session.shop },
        create: {
          shop: session.shop,
          [field]: null,
        },
        update: {
          [field]: null,
        },
      });

      return json({ success: true, variant, settings });
    } catch (error) {
      console.error("[PMY] removeLogo failed:", error);
      return json(
        { success: false, error: error?.message || "Falha ao remover a logo." },
        { status: 500 },
      );
    }
  }

  return json(
    { success: false, error: "Ação de logo inválida." },
    { status: 400 },
  );
};
