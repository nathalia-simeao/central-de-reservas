import { ensureShopifyOrderWebhooks } from "./shopify-webhooks.server";
import { syncShopifyGuideMetaobjects } from "./shopify-guides.server";
import { fetchShopifyCatalog } from "./platform-sync.server";
import { syncShopifyCatalogToMasterTours } from "./tour-passport.server";

const STATE_KEY = "__pmyCentralRefreshState";
const refreshState =
  globalThis[STATE_KEY] || (globalThis[STATE_KEY] = new Map());

const DEFAULT_TTL_MS = Math.max(
  60_000,
  Number(process.env.CENTRAL_REFRESH_TTL_MS || 10 * 60 * 1000),
);

function clean(value) {
  return String(value ?? "").trim();
}

function isLikelyTemporaryUploadUrl(value) {
  const raw = clean(value);
  if (!raw) return false;

  try {
    const host = new URL(raw).hostname.toLowerCase();
    return (
      host.includes("staged") ||
      host.includes("storage.googleapis.com") ||
      host.includes("amazonaws.com")
    );
  } catch {
    return false;
  }
}

function publicState(state) {
  if (!state) {
    return {
      running: false,
      lastStartedAt: null,
      lastFinishedAt: null,
      nextAllowedAt: null,
      lastError: null,
      webhookStatus: null,
      catalog: null,
      guides: null,
      media: null,
    };
  }

  return {
    running: Boolean(state.running),
    lastStartedAt: state.lastStartedAt || null,
    lastFinishedAt: state.lastFinishedAt || null,
    nextAllowedAt: state.nextAllowedAt || null,
    lastError: state.lastError || null,
    webhookStatus: state.webhookStatus || null,
    catalog: state.catalog || null,
    guides: state.guides || null,
    media: state.media || null,
  };
}

export function getCentralRefreshStatus(shop) {
  return publicState(refreshState.get(clean(shop)));
}

async function adminGraphql(admin, query) {
  const response = await admin.graphql(query);
  const payload = await response.json();
  if (payload?.errors?.length) {
    throw new Error(payload.errors.map((item) => item.message).join("; "));
  }
  return payload?.data || {};
}

export async function syncShopifyMediaLibrary(prisma, admin, shop) {
  const mediaShop = clean(shop);
  if (!mediaShop) {
    return { total: 0, productImages: 0, files: 0 };
  }

  await prisma.media.updateMany({
    where: { shop: "legacy" },
    data: { shop: mediaShop },
  });

  const externalMedia = [];
  let productImages = 0;
  let files = 0;

  const productData = await adminGraphql(
    admin,
    `
      query PmyBackgroundProductMediaLibrary {
        products(first: 100) {
          edges {
            node {
              id
              title
              images(first: 10) {
                edges {
                  node {
                    id
                    url
                    altText
                    width
                    height
                  }
                }
              }
            }
          }
        }
      }
    `,
  );

  for (const { node: product } of productData?.products?.edges || []) {
    for (const { node: img } of product?.images?.edges || []) {
      if (!img?.id || !img?.url) continue;
      productImages += 1;
      externalMedia.push({
        source: "shopify_product",
        externalId: img.id,
        url: img.url,
        filename:
          img.url.split("/").pop()?.split("?")[0] || "shopify-product-image.jpg",
        mimetype: "image/jpeg",
        category: "tour",
        label: img.altText || product.title || "Imagem de tour",
        productTitle: product.title || null,
        width: Number.isFinite(Number(img.width)) ? Number(img.width) : null,
        height: Number.isFinite(Number(img.height)) ? Number(img.height) : null,
        metadata: { productId: product.id },
      });
    }
  }

  const filesData = await adminGraphql(
    admin,
    `
      query PmyBackgroundShopifyFilesLibrary {
        files(first: 100) {
          edges {
            node {
              __typename
              id
              ... on MediaImage {
                alt
                createdAt
                fileStatus
                image {
                  url
                  altText
                  width
                  height
                }
              }
              ... on GenericFile {
                alt
                createdAt
                fileStatus
                url
                mimeType
              }
            }
          }
        }
      }
    `,
  );

  for (const { node: file } of filesData?.files?.edges || []) {
    if (!file?.id) continue;

    const isImage = file.__typename === "MediaImage";
    const url = isImage ? file?.image?.url : file?.url;
    if (!url) continue;

    files += 1;
    externalMedia.push({
      source: "shopify_files",
      externalId: file.id,
      url,
      filename: url.split("/").pop()?.split("?")[0] || "shopify-file",
      mimetype: isImage
        ? "image/jpeg"
        : file.mimeType || "application/octet-stream",
      category: "general",
      label:
        file.alt ||
        file?.image?.altText ||
        url.split("/").pop()?.split("?")[0] ||
        "Arquivo Shopify",
      productTitle: null,
      width:
        isImage && Number.isFinite(Number(file?.image?.width))
          ? Number(file.image.width)
          : null,
      height:
        isImage && Number.isFinite(Number(file?.image?.height))
          ? Number(file.image.height)
          : null,
      metadata: {
        fileStatus: file.fileStatus || null,
        shopifyType: file.__typename,
        createdAt: file.createdAt || null,
      },
    });
  }

  const ownedUploads = await prisma.media.findMany({
    where: { shop: mediaShop, source: "pmy_upload" },
  });
  const ownedByExternalId = new Map(
    ownedUploads
      .filter((item) => item.externalId)
      .map((item) => [item.externalId, item]),
  );
  const ownedByUrl = new Map(
    ownedUploads.filter((item) => item.url).map((item) => [item.url, item]),
  );

  for (const item of externalMedia) {
    const owned =
      item.source === "shopify_files"
        ? ownedByExternalId.get(item.externalId) || ownedByUrl.get(item.url)
        : null;

    if (owned) {
      await prisma.media.update({
        where: { id: owned.id },
        data: {
          url: item.url,
          filename: item.filename,
          mimetype: item.mimetype,
          externalId: item.externalId,
          width: item.width,
          height: item.height,
          metadata: item.metadata,
          active: true,
        },
      });
      continue;
    }

    await prisma.media.upsert({
      where: {
        shop_source_externalId: {
          shop: mediaShop,
          source: item.source,
          externalId: item.externalId,
        },
      },
      create: {
        shop: mediaShop,
        ...item,
      },
      update: {
        url: item.url,
        filename: item.filename,
        mimetype: item.mimetype,
        label: item.label,
        productTitle: item.productTitle,
        width: item.width,
        height: item.height,
        metadata: item.metadata,
        active: true,
      },
    });
  }

  try {
    const businessSettings = await prisma.businessSetting.findUnique({
      where: { shop: mediaShop },
    });

    if (businessSettings) {
      const logoMedia = await prisma.media.findMany({
        where: {
          shop: mediaShop,
          active: true,
          source: "pmy_upload",
          category: "logo",
          label: {
            in: ["Logo para fundo claro", "Logo para fundo escuro"],
          },
        },
        orderBy: { createdAt: "desc" },
      });

      const lightMedia = logoMedia.find(
        (item) => item.label === "Logo para fundo claro" && item.url,
      );
      const darkMedia = logoMedia.find(
        (item) => item.label === "Logo para fundo escuro" && item.url,
      );
      const repaired = {};

      if (
        lightMedia?.url &&
        businessSettings.logoOnLightUrl &&
        (
          isLikelyTemporaryUploadUrl(businessSettings.logoOnLightUrl) ||
          (
            businessSettings.logoOnLightUrl === lightMedia.url &&
            businessSettings.logoOnLightMediaId !== lightMedia.id
          )
        )
      ) {
        repaired.logoOnLightUrl = lightMedia.url;
        repaired.logoOnLightMediaId = lightMedia.id;
      }

      if (
        darkMedia?.url &&
        businessSettings.logoOnDarkUrl &&
        (
          isLikelyTemporaryUploadUrl(businessSettings.logoOnDarkUrl) ||
          (
            businessSettings.logoOnDarkUrl === darkMedia.url &&
            businessSettings.logoOnDarkMediaId !== darkMedia.id
          )
        )
      ) {
        repaired.logoOnDarkUrl = darkMedia.url;
        repaired.logoOnDarkMediaId = darkMedia.id;
      }

      if (Object.keys(repaired).length > 0) {
        await prisma.businessSetting.update({
          where: { shop: mediaShop },
          data: repaired,
        });
      }
    }
  } catch (error) {
    console.error("[PMY] background logo repair failed:", error);
  }

  return {
    total: externalMedia.length,
    productImages,
    files,
  };
}

async function runCentralRefresh({
  prisma,
  admin,
  session,
  registerWebhooks,
}) {
  const shop = clean(session?.shop);
  const state = refreshState.get(shop);
  const errors = [];

  if (session && typeof registerWebhooks === "function") {
    try {
      await registerWebhooks({ session });
    } catch (error) {
      errors.push(`webhooks: ${error?.message || String(error)}`);
    }
  }

  try {
    state.webhookStatus = await ensureShopifyOrderWebhooks(
      admin,
      process.env.SHOPIFY_APP_URL,
    );
  } catch (error) {
    errors.push(`webhook check: ${error?.message || String(error)}`);
  }

  try {
    const products = await fetchShopifyCatalog(admin);
    const result = await syncShopifyCatalogToMasterTours(prisma, products);
    state.catalog = {
      checkedAt: new Date().toISOString(),
      remote: products.length,
      created: result?.created ?? 0,
      updated: result?.updated ?? 0,
      variantsCreated: result?.variantsCreated ?? 0,
      variantsUpdated: result?.variantsUpdated ?? 0,
    };
  } catch (error) {
    errors.push(`catalog: ${error?.message || String(error)}`);
  }

  try {
    state.guides = await syncShopifyGuideMetaobjects(prisma, admin);
  } catch (error) {
    errors.push(`guides: ${error?.message || String(error)}`);
  }

  // Shopify Files remains the source of truth. The Central no longer mirrors
  // the full media library into PostgreSQL during background refreshes.
  state.media = null;

  state.lastError = errors.length ? errors.join(" | ") : null;
}

export function scheduleCentralRefresh({
  prisma,
  admin,
  session,
  registerWebhooks,
  ttlMs = DEFAULT_TTL_MS,
  force = false,
}) {
  const shop = clean(session?.shop);
  if (!shop || !admin) return getCentralRefreshStatus(shop);

  const now = Date.now();
  let state = refreshState.get(shop);
  if (!state) {
    state = {
      running: false,
      lastStartedAt: null,
      lastFinishedAt: null,
      nextAllowedAt: 0,
      lastError: null,
      webhookStatus: null,
      catalog: null,
      guides: null,
      media: null,
      promise: null,
    };
    refreshState.set(shop, state);
  }

  if (state.running) return publicState(state);
  if (!force && Number(state.nextAllowedAt || 0) > now) {
    return publicState(state);
  }

  state.running = true;
  state.lastStartedAt = new Date(now).toISOString();
  state.nextAllowedAt = now + Math.max(60_000, Number(ttlMs) || DEFAULT_TTL_MS);

  state.promise = Promise.resolve()
    .then(() =>
      runCentralRefresh({
        prisma,
        admin,
        session,
        registerWebhooks,
      }),
    )
    .catch((error) => {
      state.lastError = error?.message || String(error);
    })
    .finally(() => {
      state.running = false;
      state.lastFinishedAt = new Date().toISOString();
      state.promise = null;
    });

  return publicState(state);
}
