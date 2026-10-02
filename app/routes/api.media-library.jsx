import { data } from "react-router";
import db from "../db.server";
import { authenticate } from "../shopify.server";
import { syncShopifyMediaLibrary } from "../utils/central-refresh.server";

const json = (body, init) => data(body, init);

function parsePage(value, fallback = 1) {
  const parsed = Number.parseInt(String(value || ""), 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

async function readPage(shop, page, pageSize) {
  const where = shop
    ? { shop, active: true }
    : { shop: "legacy", active: true };

  const [items, total] = await Promise.all([
    db.media.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    db.media.count({ where }),
  ]);

  return {
    items,
    page: {
      current: page,
      pageSize,
      total,
      hasMore: page * pageSize < total,
    },
  };
}

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const url = new URL(request.url);
  const page = parsePage(url.searchParams.get("page"), 1);
  const pageSize = Math.min(
    100,
    Math.max(20, parsePage(url.searchParams.get("pageSize"), 60)),
  );

  const result = await readPage(session?.shop || null, page, pageSize);
  return json({ success: true, ...result });
};

export const action = async ({ request }) => {
  const { admin, session } = await authenticate.admin(request);
  const formData = await request.formData();
  const actionName = String(formData.get("_action") || "").trim();

  if (actionName !== "refreshShopify") {
    return json(
      { success: false, error: "Ação não suportada." },
      { status: 400 },
    );
  }

  try {
    const sync = await syncShopifyMediaLibrary(
      db,
      admin,
      session?.shop || null,
    );
    const result = await readPage(session?.shop || null, 1, 60);
    return json({ success: true, sync, ...result });
  } catch (error) {
    console.error("[PMY] media library refresh failed:", error);
    return json(
      {
        success: false,
        error:
          error?.message ||
          "Não foi possível atualizar as fontes Shopify da biblioteca.",
      },
      { status: 500 },
    );
  }
};
