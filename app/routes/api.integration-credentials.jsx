import { data } from "react-router";
import db from "../db.server";
import { authenticate } from "../shopify.server";
import {
  getIntegrationCredentials,
  getSafeIntegrationSecretStatus,
  integrationEncryptionReady,
  integrationEnvironmentSecretStatus,
  listSafeIntegrationSecretStatuses,
  removeIntegrationCredentials,
  storeIntegrationCredentials,
  updateIntegrationValidation,
} from "../utils/integration-secrets.server";
import {
  requireViatorAuth,
  validateViatorSupplierId,
} from "../utils/viator.server";
import { requireCivitatisAuth } from "../utils/civitatis.server";
import { testTripadvisorTerraCredentials } from "../utils/tripadvisor.server";

const json = (body, init) => data(body, init);
const MANAGED_PROVIDERS = new Set(["VIATOR", "CIVITATIS", "TRIPADVISOR"]);
const KNOWN_PROVIDERS = new Set(["VIATOR", "CIVITATIS", "HEADOUT", "TRIPADVISOR"]);

function clean(value) {
  return String(value ?? "").trim();
}

function providerName(value) {
  return clean(value).toUpperCase();
}

function publicCapabilities() {
  return {
    VIATOR: {
      managed: true,
      direction: "INBOUND_SUPPLIER_API",
      testMode: "CENTRAL_AUTH",
      description:
        "A Viator chama a Supplier API da PMY. A Central valida a credencial armazenada contra o mesmo middleware usado nas requisições reais.",
    },
    CIVITATIS: {
      managed: true,
      direction: "INBOUND_SUPPLIER_API",
      testMode: "CENTRAL_AUTH",
      description:
        "A Civitatis chama a Supplier API da PMY. A Central valida token e ambiente contra o mesmo middleware usado nas requisições reais.",
    },
    TRIPADVISOR: {
      managed: true,
      direction: "OUTBOUND_CONTENT_API",
      testMode: "REMOTE_TERRA_API",
      description:
        "A Central consulta a Tripadvisor Terra API para conteúdo, reviews, ratings, fotos e dados da localização. Não participa de reservas nem do inventário.",
    },
    HEADOUT: {
      managed: false,
      direction: "ONBOARDING_PENDING",
      testMode: "UNAVAILABLE",
      description:
        "O contrato/API remoto da Headout ainda não está disponível para teste nesta conta. Credenciais manuais ficam desativadas até existir um adapter verificável.",
    },
  };
}

async function testStoredCredential(provider) {
  const stored = await getIntegrationCredentials(db, provider);
  if (!stored?.credentials) {
    throw new Error("Nenhuma credencial criptografada foi encontrada.");
  }

  if (provider === "VIATOR") {
    const apiKey = clean(stored.credentials.apiKey);
    const supplierId = clean(stored.credentials.supplierId);
    if (!apiKey || !/^\d+$/.test(supplierId)) {
      throw new Error("API Key e Supplier ID válidos são obrigatórios.");
    }

    const request = new Request("https://pmy.local/viator-credential-test", {
      headers: { "X-Api-Key": apiKey },
    });
    const authError = await requireViatorAuth(request, "v2", {
      recordTraffic: false,
    });
    if (authError) {
      throw new Error("A Supplier API da Central recusou a API Key armazenada.");
    }

    const supplierError = validateViatorSupplierId(
      Number(supplierId),
      "v2",
      null,
    );
    if (supplierError) {
      throw new Error("O Supplier ID armazenado não foi aceito pela Central.");
    }

    return updateIntegrationValidation(db, provider, {
      status: "LOCAL_CHECK",
      message:
        "Credencial criptografada carregada e aceita pelo middleware local da Supplier API. Isso não confirma tráfego da Viator; aguardando a primeira requisição autenticada real para marcar como conectado.",
    });
  }

  if (provider === "CIVITATIS") {
    const token = clean(stored.credentials.token);
    const environment = clean(stored.credentials.environment).toLowerCase();
    if (!token || !["test", "live"].includes(environment)) {
      throw new Error("Token e ambiente Civitatis válidos são obrigatórios.");
    }

    const request = new Request("https://pmy.local/civitatis-credential-test", {
      headers: {
        Authorization: `Bearer ${token}`,
        Env: environment,
      },
    });
    const authError = await requireCivitatisAuth(request, {
      recordTraffic: false,
    });
    if (authError) {
      throw new Error(
        "A Supplier API da Central recusou o token ou o ambiente armazenado.",
      );
    }

    return updateIntegrationValidation(db, provider, {
      status: "LOCAL_CHECK",
      message:
        "Credencial criptografada carregada e aceita pelo middleware local da Supplier API. Isso não confirma tráfego da Civitatis; aguardando a primeira requisição autenticada real para marcar como conectado.",
    });
  }

  if (provider === "TRIPADVISOR") {
    const apiKey = clean(stored.credentials.apiKey);
    const locationId = clean(stored.credentials.locationId);
    await testTripadvisorTerraCredentials({ apiKey, locationId });

    return updateIntegrationValidation(db, provider, {
      status: "CONNECTED",
      message: locationId
        ? "Tripadvisor Terra conectado e Location ID validado com sucesso."
        : "Tripadvisor Terra conectado. API Key validada; falta informar o Location ID da Portugal Me & You para carregar reputação e reviews.",
    });
  }

  throw new Error("Este provedor ainda não possui teste de credencial verificável.");
}

export const loader = async ({ request }) => {
  await authenticate.admin(request);

  const statuses = await listSafeIntegrationSecretStatuses(db);
  return json({
    success: true,
    encryptionReady: integrationEncryptionReady(),
    environment: integrationEnvironmentSecretStatus(),
    capabilities: publicCapabilities(),
    statuses,
  });
};

export const action = async ({ request }) => {
  await authenticate.admin(request);
  const formData = await request.formData();
  const action = clean(formData.get("_action")).toLowerCase();
  const provider = providerName(formData.get("provider"));

  if (!KNOWN_PROVIDERS.has(provider)) {
    return json(
      { success: false, error: "Provedor de integração inválido." },
      { status: 400 },
    );
  }

  if (action === "remove") {
    const result = await removeIntegrationCredentials(db, provider);
    return json({
      success: true,
      removed: result.removed,
      status: null,
    });
  }

  if (!MANAGED_PROVIDERS.has(provider)) {
    return json(
      {
        success: false,
        code: "CREDENTIAL_FORM_DISABLED",
        error:
          "As credenciais deste canal estão desativadas até existir um adapter real que possa testá-las.",
      },
      { status: 409 },
    );
  }

  if (!integrationEncryptionReady()) {
    return json(
      {
        success: false,
        code: "ENCRYPTION_NOT_CONFIGURED",
        error:
          "O armazenamento criptografado de integrações não está pronto no servidor. Configure INTEGRATION_ENCRYPTION_KEY antes de salvar credenciais.",
      },
      { status: 503 },
    );
  }

  if (action === "save") {
    try {
      if (provider === "VIATOR") {
        const apiKey = clean(formData.get("apiKey"));
        const supplierId = clean(formData.get("supplierId"));

        if (!apiKey || apiKey.length < 8) {
          return json(
            { success: false, error: "Informe uma API Key Viator válida." },
            { status: 400 },
          );
        }
        if (!/^\d+$/.test(supplierId)) {
          return json(
            { success: false, error: "Informe o Supplier ID numérico da Viator." },
            { status: 400 },
          );
        }

        await storeIntegrationCredentials(db, {
          provider,
          credentials: { apiKey, supplierId },
          environment: "supplier",
          status: "CONFIGURED",
          metadata: {
            direction: "INBOUND_SUPPLIER_API",
            source: "PMY_CENTRAL_UI",
          },
        });
      } else if (provider === "CIVITATIS") {
        const token = clean(formData.get("token"));
        const environment = clean(formData.get("environment")).toLowerCase();

        if (!token || token.length < 8) {
          return json(
            { success: false, error: "Informe um token Civitatis válido." },
            { status: 400 },
          );
        }
        if (!["test", "live"].includes(environment)) {
          return json(
            { success: false, error: "Selecione o ambiente test ou live." },
            { status: 400 },
          );
        }

        await storeIntegrationCredentials(db, {
          provider,
          credentials: { token, environment },
          environment,
          status: "CONFIGURED",
          metadata: {
            direction: "INBOUND_SUPPLIER_API",
            source: "PMY_CENTRAL_UI",
          },
        });
      } else if (provider === "TRIPADVISOR") {
        const apiKey = clean(formData.get("apiKey"));
        const locationId = clean(formData.get("locationId"));

        if (!apiKey || apiKey.length < 8) {
          return json(
            { success: false, error: "Informe uma API Key válida do Tripadvisor Terra." },
            { status: 400 },
          );
        }
        if (locationId && !/^\d+$/.test(locationId)) {
          return json(
            { success: false, error: "O Tripadvisor Location ID deve conter somente números." },
            { status: 400 },
          );
        }

        await storeIntegrationCredentials(db, {
          provider,
          credentials: { apiKey, locationId: locationId || null },
          environment: "terra",
          status: "CONFIGURED",
          metadata: {
            direction: "OUTBOUND_CONTENT_API",
            source: "PMY_CENTRAL_UI",
          },
        });
      }

      const status = await testStoredCredential(provider);
      return json({
        success: true,
        status,
        message:
          provider === "TRIPADVISOR"
            ? "Credencial Tripadvisor Terra salva com criptografia e validada diretamente na API."
            : "Credencial salva com criptografia e teste técnico local concluído. A conexão só será confirmada após tráfego autenticado real do canal.",
      });
    } catch (error) {
      console.error("[PMY] integration credential save/test failed", error);

      try {
        const existing = await getSafeIntegrationSecretStatus(db, provider);
        if (existing) {
          await updateIntegrationValidation(db, provider, {
            status: "ERROR",
            message: error?.message || "Falha ao validar credencial.",
          });
        }
      } catch { /* Validation status update is best-effort. */ }

      const status = await getSafeIntegrationSecretStatus(db, provider).catch(() => null);
      return json(
        {
          success: false,
          error: error?.message || "Falha ao salvar e validar credencial.",
          status,
        },
        { status: 500 },
      );
    }
  }

  if (action === "test") {
    try {
      const status = await testStoredCredential(provider);
      return json({ success: true, status });
    } catch (error) {
      console.error("[PMY] integration credential test failed", error);
      try {
        await updateIntegrationValidation(db, provider, {
          status: "ERROR",
          message: error?.message || "Falha ao validar credencial.",
        });
      } catch { /* Validation status update is best-effort. */ }

      const status = await getSafeIntegrationSecretStatus(db, provider).catch(() => null);
      return json(
        {
          success: false,
          error: error?.message || "Falha ao testar credencial.",
          status,
        },
        { status: 400 },
      );
    }
  }

  return json({ success: false, error: "Ação inválida." }, { status: 400 });
};
