import "@shopify/shopify-app-react-router/adapters/node";
import {
  ApiVersion,
  AppDistribution,
  DeliveryMethod,
  shopifyApp,
} from "@shopify/shopify-app-react-router/server";
import { PrismaSessionStorage } from "@shopify/shopify-app-session-storage-prisma";
import prisma from "./db.server";
import {
  assertSingleTenantShop,
  checkSingleTenantShop,
} from "./utils/single-tenant.server";

// Minimal Shopify scopes audited for the PMY Central.
const configuredScopes = [
  "read_products",
  "read_orders",
  "write_orders",
  "write_draft_orders",
  "write_files",
];

const shopify = shopifyApp({
  apiKey: process.env.SHOPIFY_API_KEY,
  apiSecretKey: process.env.SHOPIFY_API_SECRET || "",
  apiVersion: ApiVersion.April26,
  scopes: configuredScopes,
  appUrl: process.env.SHOPIFY_APP_URL || "",
  authPathPrefix: "/auth",
  sessionStorage: new PrismaSessionStorage(prisma),
  // PMY Central is a single-merchant app; the database is locked to one shop.
  distribution: AppDistribution.SingleMerchant,
  webhooks: {
    ORDERS_CREATE: {
      deliveryMethod: DeliveryMethod.Http,
      callbackUrl: "/webhooks/orders",
    },
    ORDERS_UPDATED: {
      deliveryMethod: DeliveryMethod.Http,
      callbackUrl: "/webhooks/orders",
    },
    ORDERS_PAID: {
      deliveryMethod: DeliveryMethod.Http,
      callbackUrl: "/webhooks/orders",
    },
    ORDERS_CANCELLED: {
      deliveryMethod: DeliveryMethod.Http,
      callbackUrl: "/webhooks/orders",
    },
  },
  hooks: {
    afterAuth: async ({ session }) => {
      try {
        await assertSingleTenantShop(prisma, session?.shop, {
          context: "afterAuth",
          allowInitialize: true,
        });
      } catch (error) {
        if (
          session?.shop &&
          error?.details?.reason === "FOREIGN_SHOP"
        ) {
          await prisma.session.deleteMany({
            where: { shop: session.shop },
          });
        }
        console.error(
          "[TENANT] Shopify installation blocked:",
          error?.message || error,
        );
        throw error;
      }

      try {
        const response = await shopify.registerWebhooks({ session });
        console.log("[SHOPIFY] Order webhooks registered", response);
      } catch (error) {
        // Most commonly happens before read_orders has been granted.
        console.error("[SHOPIFY] Unable to register order webhooks", error);
      }
    },
  },
  future: {
    expiringOfflineAccessTokens: true,
  },
  ...(process.env.SHOP_CUSTOM_DOMAIN
    ? { customShopDomains: [process.env.SHOP_CUSTOM_DOMAIN] }
    : {}),
});

export default shopify;
export const apiVersion = ApiVersion.April26;
export const addDocumentResponseHeaders = shopify.addDocumentResponseHeaders;
export const authenticate = {
  admin: async (request) => {
    const result = await shopify.authenticate.admin(request);

    try {
      await assertSingleTenantShop(prisma, result?.session?.shop, {
        context: "admin",
        allowInitialize: true,
      });
    } catch (error) {
      if (
        result?.session?.shop &&
        error?.details?.reason === "FOREIGN_SHOP"
      ) {
        await prisma.session.deleteMany({
          where: { shop: result.session.shop },
        });
      }
      throw error;
    }

    return result;
  },

  webhook: async (request) => {
    const result = await shopify.authenticate.webhook(request);

    try {
      const tenant = await checkSingleTenantShop(
        prisma,
        result?.shop,
        { allowInitialize: false },
      );

      return {
        ...result,
        tenantAllowed: tenant.allowed,
        tenantPrimaryShop: tenant.primaryShop,
      };
    } catch (error) {
      console.error(
        "[TENANT] Shopify webhook ignored because tenant resolution failed:",
        error?.message || error,
      );
      return {
        ...result,
        tenantAllowed: false,
        tenantPrimaryShop: null,
      };
    }
  },
};

export const unauthenticated = {
  admin: async (shop) => {
    await assertSingleTenantShop(prisma, shop, {
      context: "unauthenticated.admin",
      allowInitialize: false,
    });
    return shopify.unauthenticated.admin(shop);
  },
};

export const login = shopify.login;
export const registerWebhooks = shopify.registerWebhooks;
export const sessionStorage = shopify.sessionStorage;
