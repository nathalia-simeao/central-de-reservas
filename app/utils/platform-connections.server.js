import dns from "node:dns/promises";
import net from "node:net";
import crypto from "node:crypto";
import {
  decryptIntegrationCredentials,
  encryptIntegrationCredentials,
  integrationEncryptionSource,
} from "./integration-crypto.server";

const HEADOUT_PRODUCTION = "https://www.headout.com";
const HEADOUT_SANDBOX = "https://sandbox.api.dev-headout.com";

const PROVIDER_DEFAULTS = {
  SHOPIFY: {
    mode: "OAUTH",
    status: "CONNECTED",
    connectionKind: "managed",
  },
  GETYOURGUIDE: {
    mode: "INBOUND_SUPPLIER_API",
    status: "DISCONNECTED",
    connectionKind: "server_secrets",
  },
  VIATOR: {
    mode: "INBOUND_SUPPLIER_API",
    status: "ONBOARDING_REQUIRED",
    connectionKind: "external_test",
  },
  HEADOUT: {
    mode: "API_KEY",
    status: "DISCONNECTED",
    connectionKind: "validated_key",
  },
  CIVITATIS: {
    mode: "INBOUND_OCTO_API",
    status: "ONBOARDING_REQUIRED",
    connectionKind: "external_test",
  },
  TRIPADVISOR: {
    mode: "CONTENT_API",
    status: "CONTENT_ONLY",
    connectionKind: "content_only",
  },
};

function timeoutSignal(ms = 8000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  if (typeof timer.unref === "function") timer.unref();
  return { signal: controller.signal, cancel: () => clearTimeout(timer) };
}

function responseMessage(status) {
  if (status === 401) return "Credencial inválida ou não autorizada.";
  if (status === 403) return "Credencial válida, mas a conta não tem acesso a esta API.";
  if (status === 404) return "Endpoint de validação não encontrado.";
  if (status === 429) return "API respondeu com limite de requisições. Tente novamente em instantes.";
  if (status >= 500) return "A API externa está indisponível no momento.";
  return `A API respondeu com HTTP ${status}.`;
}

export async function validateHeadoutApiKey(apiKey) {
  const key = String(apiKey || "").trim();
  if (!key) {
    return { ok: false, message: "Informe a API Key da Headout." };
  }

  if (!key.startsWith("tk_") && !key.startsWith("pk_")) {
    return {
      ok: false,
      environment: "unknown",
      message:
        "A API Key da Headout deve começar com tk_ (sandbox) ou pk_ (produção).",
    };
  }

  const environment = key.startsWith("tk_") ? "sandbox" : "production";

  const baseUrl =
    environment === "sandbox" ? HEADOUT_SANDBOX : HEADOUT_PRODUCTION;

  const { signal, cancel } = timeoutSignal();

  try {
    const response = await fetch(
      `${baseUrl}/api/public/v2/cities/?offset=0`,
      {
        method: "GET",
        headers: {
          "Headout-Auth": key,
          Accept: "application/json",
        },
        signal,
        redirect: "error",
      },
    );

    if (!response.ok) {
      return {
        ok: false,
        environment,
        message: responseMessage(response.status),
      };
    }

    let payload = null;
    try {
      payload = await response.json();
    } catch {
      payload = null;
    }

    const total =
      Number.isFinite(Number(payload?.total)) ? Number(payload.total) : null;

    return {
      ok: true,
      environment,
      externalAccountId: null,
      message:
        total != null
          ? `API validada. ${total} cidades acessíveis no catálogo Headout.`
          : "API Key validada com sucesso na Headout.",
    };
  } catch (error) {
    if (error?.name === "AbortError") {
      return {
        ok: false,
        environment,
        message: "A Headout não respondeu dentro do tempo limite.",
      };
    }

    return {
      ok: false,
      environment,
      message: "Não foi possível validar a API Key com a Headout.",
    };
  } finally {
    cancel();
  }
}

function isPrivateIpv4(ip) {
  const parts = ip.split(".").map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part))) {
    return false;
  }

  const [a, b] = parts;

  return (
    a === 10 ||
    a === 127 ||
    a === 0 ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 100 && b >= 64 && b <= 127) ||
    a >= 224
  );
}

function isPrivateIpv6(ip) {
  const normalized = ip.toLowerCase();
  return (
    normalized === "::1" ||
    normalized === "::" ||
    normalized.startsWith("fc") ||
    normalized.startsWith("fd") ||
    normalized.startsWith("fe8") ||
    normalized.startsWith("fe9") ||
    normalized.startsWith("fea") ||
    normalized.startsWith("feb")
  );
}

async function assertSafePublicHttpsUrl(rawUrl) {
  let url;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new Error("Informe uma URL HTTPS válida.");
  }

  if (url.protocol !== "https:") {
    throw new Error("Integrações customizadas exigem HTTPS.");
  }

  if (
    url.username ||
    url.password ||
    url.hostname === "localhost" ||
    url.hostname.endsWith(".local")
  ) {
    throw new Error("Esse endpoint não é permitido.");
  }

  if (net.isIP(url.hostname)) {
    if (
      (net.isIPv4(url.hostname) && isPrivateIpv4(url.hostname)) ||
      (net.isIPv6(url.hostname) && isPrivateIpv6(url.hostname))
    ) {
      throw new Error("Endereços privados ou locais não são permitidos.");
    }
    return url;
  }

  const addresses = await dns.lookup(url.hostname, { all: true, verbatim: true });
  if (!addresses.length) {
    throw new Error("Não foi possível resolver o domínio informado.");
  }

  for (const address of addresses) {
    if (
      (address.family === 4 && isPrivateIpv4(address.address)) ||
      (address.family === 6 && isPrivateIpv6(address.address))
    ) {
      throw new Error("O endpoint resolve para uma rede privada e foi bloqueado.");
    }
  }

  return url;
}

export async function validateCustomApi({ endpoint, token }) {
  const url = await assertSafePublicHttpsUrl(endpoint);
  const { signal, cancel } = timeoutSignal();

  try {
    const headers = {
      Accept: "application/json",
      "User-Agent": "PMY-Reservas-Unificadas/1.0",
    };

    if (String(token || "").trim()) {
      headers.Authorization = `Bearer ${String(token).trim()}`;
    }

    const response = await fetch(url, {
      method: "GET",
      headers,
      signal,
      redirect: "error",
    });

    if (!response.ok) {
      return {
        ok: false,
        message: responseMessage(response.status),
      };
    }

    return {
      ok: true,
      message: `Endpoint respondeu com HTTP ${response.status}.`,
    };
  } catch (error) {
    if (error?.name === "AbortError") {
      return {
        ok: false,
        message: "O endpoint não respondeu dentro do tempo limite.",
      };
    }

    return {
      ok: false,
      message: error?.message || "Não foi possível validar o endpoint.",
    };
  } finally {
    cancel();
  }
}

function safeRecord(record) {
  if (!record) return null;

  return {
    id: record.id,
    provider: record.provider,
    displayName: record.displayName,
    mode: record.mode,
    status: record.status,
    environment: record.environment,
    externalAccountId: record.externalAccountId,
    config: record.config || null,
    lastValidatedAt: record.lastValidatedAt,
    lastValidationStatus: record.lastValidationStatus,
    lastValidationMessage: record.lastValidationMessage,
    connectedAt: record.connectedAt,
    disconnectedAt: record.disconnectedAt,
    updatedAt: record.updatedAt,
    hasStoredCredential: Boolean(record.credentialCiphertext),
  };
}

function providerKey(value) {
  return String(value || "").trim().toUpperCase();
}

export async function loadSafeIntegrationConnections(prisma, {
  shopName,
  shopifyConnected = true,
  gygIntegrationStatus,
} = {}) {
  const records = await prisma.integrationConnection.findMany({
    orderBy: { updatedAt: "desc" },
  });

  const byProvider = new Map(
    records
      .filter((record) => !record.provider.startsWith("CUSTOM:"))
      .map((record) => [record.provider, record]),
  );

  const standard = {};

  for (const provider of Object.keys(PROVIDER_DEFAULTS)) {
    const defaults = PROVIDER_DEFAULTS[provider];
    const record = byProvider.get(provider);

    if (provider === "SHOPIFY") {
      standard.shopify = {
        provider,
        connected: Boolean(shopifyConnected),
        status: shopifyConnected ? "CONNECTED" : "ERROR",
        statusLabel: shopifyConnected ? "CONECTADO" : "ERRO",
        accountName: shopName || "Shopify",
        lastSync: "OAuth ativo",
        mode: defaults.mode,
        message: shopifyConnected
          ? "Autenticação OAuth do app ativa."
          : "A sessão Shopify não está disponível.",
        hasStoredCredential: false,
      };
      continue;
    }

    if (provider === "GETYOURGUIDE") {
      const ready = Boolean(gygIntegrationStatus?.credentialsReady);
      standard.getyourguide = {
        provider,
        connected: ready,
        status: ready ? "CONNECTED" : "PENDING_EXTERNAL",
        statusLabel: ready ? "CONECTADO" : "AGUARDANDO GYG",
        accountName: "PMY Supplier API v1",
        lastSync: ready ? "Credenciais do servidor configuradas" : "2FA/onboarding pendente",
        mode: defaults.mode,
        message: ready
          ? "Credenciais de entrada e saída configuradas no servidor."
          : "A integração depende das credenciais do GetYourGuide Integrator Portal.",
        hasStoredCredential: false,
      };
      continue;
    }

    if (provider === "TRIPADVISOR") {
      standard.tripadvisor = {
        provider,
        connected: false,
        status: "CONTENT_ONLY",
        statusLabel: "CONTEÚDO / REVIEWS",
        accountName: "Tripadvisor",
        lastSync: null,
        mode: defaults.mode,
        message:
          "Tripadvisor não é tratado como canal de reservas nesta Central. A integração deve ser feita separadamente para conteúdo/reviews.",
        hasStoredCredential: false,
      };
      continue;
    }

    if (record) {
      const safe = safeRecord(record);
      standard[provider.toLowerCase()] = {
        ...safe,
        connected: record.status === "CONNECTED",
        statusLabel:
          record.status === "CONNECTED"
            ? "CONECTADO"
            : record.status === "PENDING_EXTERNAL_TEST"
              ? "AGUARDANDO TESTE EXTERNO"
              : record.status === "ERROR"
                ? "ERRO"
                : "PENDENTE",
        accountName: record.displayName || provider,
        lastSync: record.lastValidatedAt
          ? new Date(record.lastValidatedAt).toLocaleString("pt-PT")
          : null,
        message: record.lastValidationMessage || null,
      };
      continue;
    }

    if (provider === "VIATOR" || provider === "CIVITATIS") {
      standard[provider.toLowerCase()] = {
        provider,
        connected: false,
        status: "ONBOARDING_REQUIRED",
        statusLabel: "ONBOARDING NECESSÁRIO",
        accountName: provider,
        lastSync: null,
        mode: defaults.mode,
        message:
          provider === "VIATOR"
            ? "A chave é fornecida pela Viator durante o onboarding técnico. A Central só marcará como conectada após um teste real."
            : "A Civitatis conecta sistemas de reserva via onboarding técnico/Octo. A Central só marcará como conectada após validação externa.",
        hasStoredCredential: false,
      };
      continue;
    }

    standard[provider.toLowerCase()] = {
      provider,
      connected: false,
      status: defaults.status,
      statusLabel: "NÃO CONECTADO",
      accountName: provider,
      lastSync: null,
      mode: defaults.mode,
      message: null,
      hasStoredCredential: false,
    };
  }

  const custom = records
    .filter((record) => record.provider.startsWith("CUSTOM:"))
    .map((record) => ({
      ...safeRecord(record),
      connected: record.status === "CONNECTED",
      statusLabel:
        record.status === "CONNECTED"
          ? "CONECTADO"
          : record.status === "ERROR"
            ? "ERRO"
            : "PENDENTE",
    }));

  return {
    standard,
    custom,
    encryption: {
      source: integrationEncryptionSource(),
      ready: integrationEncryptionSource() !== "UNAVAILABLE",
    },
  };
}

async function upsertEncryptedConnection(prisma, {
  provider,
  displayName,
  mode,
  status,
  environment,
  credentials,
  config,
  externalAccountId,
  validationMessage,
}) {
  const encrypted = encryptIntegrationCredentials(credentials || {});
  const now = new Date();

  return prisma.integrationConnection.upsert({
    where: { provider },
    create: {
      provider,
      displayName,
      mode,
      status,
      environment,
      ...encrypted,
      config: config || undefined,
      externalAccountId: externalAccountId || null,
      lastValidatedAt: now,
      lastValidationStatus: status,
      lastValidationMessage: validationMessage || null,
      connectedAt: status === "CONNECTED" ? now : null,
      disconnectedAt: null,
    },
    update: {
      displayName,
      mode,
      status,
      environment,
      ...encrypted,
      config: config || undefined,
      externalAccountId: externalAccountId || null,
      lastValidatedAt: now,
      lastValidationStatus: status,
      lastValidationMessage: validationMessage || null,
      connectedAt: status === "CONNECTED" ? now : undefined,
      disconnectedAt: null,
    },
  });
}

export async function connectPlatform(prisma, {
  provider,
  apiKey,
  apiSecret,
  displayName,
  endpoint,
}) {
  const normalized = providerKey(provider);

  if (normalized === "HEADOUT") {
    const validation = await validateHeadoutApiKey(apiKey);

    if (!validation.ok) {
      return {
        success: false,
        provider: normalized,
        status: "ERROR",
        error: validation.message,
      };
    }

    const record = await upsertEncryptedConnection(prisma, {
      provider: normalized,
      displayName: "Headout",
      mode: "API_KEY",
      status: "CONNECTED",
      environment: validation.environment,
      credentials: { apiKey: String(apiKey).trim() },
      config: {
        baseUrl:
          validation.environment === "sandbox"
            ? HEADOUT_SANDBOX
            : HEADOUT_PRODUCTION,
      },
      externalAccountId: validation.externalAccountId,
      validationMessage: validation.message,
    });

    return {
      success: true,
      connection: safeRecord(record),
      message: validation.message,
    };
  }

  if (normalized === "VIATOR") {
    const key = String(apiKey || "").trim();
    const supplierId = String(apiSecret || "").trim();

    if (!key) {
      return {
        success: false,
        provider: normalized,
        status: "ERROR",
        error:
          "A chave da Viator só deve ser cadastrada quando for fornecida durante o onboarding técnico.",
      };
    }

    if (!supplierId || !/^\d+$/.test(supplierId)) {
      return {
        success: false,
        provider: normalized,
        status: "ERROR",
        error: "Informe o Supplier ID numérico fornecido pela Viator.",
      };
    }

    const record = await upsertEncryptedConnection(prisma, {
      provider: normalized,
      displayName: "Viator",
      mode: "INBOUND_SUPPLIER_API",
      status: "PENDING_EXTERNAL_TEST",
      environment: "test",
      credentials: {
        apiKey: key,
        supplierId,
      },
      config: {
        validationMode: "INBOUND_REQUEST",
      },
      validationMessage:
        "Credencial armazenada com segurança. Aguardando chamada oficial da Viator para validar a conexão.",
    });

    return {
      success: true,
      connection: safeRecord(record),
      message: record.lastValidationMessage,
    };
  }

  if (normalized === "CIVITATIS") {
    return {
      success: false,
      provider: normalized,
      status: "ONBOARDING_REQUIRED",
      error:
        "A integração de operador da Civitatis usa onboarding técnico/Octo. Não é seguro marcar como conectada apenas colando um token.",
    };
  }

  if (normalized === "TRIPADVISOR") {
    return {
      success: false,
      provider: normalized,
      status: "CONTENT_ONLY",
      error:
        "Tripadvisor será tratado como integração de conteúdo/reviews, não como canal de reservas.",
    };
  }

  if (normalized === "GETYOURGUIDE") {
    return {
      success: false,
      provider: normalized,
      status: "PENDING_EXTERNAL",
      error:
        "As credenciais do GetYourGuide ficam nos Secrets do servidor e são validadas pelo Integrator Portal.",
    };
  }

  if (normalized === "SHOPIFY") {
    return {
      success: false,
      provider: normalized,
      status: "CONNECTED",
      error: "Shopify já usa OAuth do próprio app.",
    };
  }

  return {
    success: false,
    provider: normalized,
    status: "UNSUPPORTED",
    error: "Esse conector ainda não possui um validador de credenciais.",
  };
}

export async function connectCustomPlatform(prisma, {
  displayName,
  endpoint,
  token,
}) {
  const name = String(displayName || "").trim();
  const url = String(endpoint || "").trim();
  const secret = String(token || "").trim();

  if (!name || !url) {
    return {
      success: false,
      error: "Informe o nome e o endpoint HTTPS da integração.",
    };
  }

  let validation;
  try {
    validation = await validateCustomApi({ endpoint: url, token: secret });
  } catch (error) {
    return {
      success: false,
      error: error?.message || "Endpoint inválido.",
    };
  }

  if (!validation.ok) {
    return {
      success: false,
      error: validation.message,
    };
  }

  const provider = `CUSTOM:${crypto.randomUUID()}`;
  const encrypted = encryptIntegrationCredentials({ token: secret });
  const now = new Date();

  const record = await prisma.integrationConnection.create({
    data: {
      provider,
      displayName: name,
      mode: "CUSTOM_BEARER_HEALTHCHECK",
      status: "CONNECTED",
      environment: "production",
      ...encrypted,
      config: { endpoint: url },
      lastValidatedAt: now,
      lastValidationStatus: "CONNECTED",
      lastValidationMessage: validation.message,
      connectedAt: now,
    },
  });

  return {
    success: true,
    connection: safeRecord(record),
    message: validation.message,
  };
}

export async function disconnectPlatform(prisma, provider) {
  const normalized = String(provider || "").trim();
  if (!normalized) {
    return { success: false, error: "Provider ausente." };
  }

  if (["SHOPIFY", "GETYOURGUIDE"].includes(normalized.toUpperCase())) {
    return {
      success: false,
      error:
        normalized.toUpperCase() === "SHOPIFY"
          ? "A conexão Shopify é gerenciada pelo OAuth do app."
          : "A conexão GetYourGuide é gerenciada pelos Secrets do servidor.",
    };
  }

  const record = await prisma.integrationConnection.findUnique({
    where: { provider: normalized.toUpperCase().startsWith("CUSTOM:") ? normalized : normalized.toUpperCase() },
  });

  if (!record) {
    return { success: true };
  }

  if (record.provider.startsWith("CUSTOM:")) {
    await prisma.integrationConnection.delete({
      where: { id: record.id },
    });
    return { success: true };
  }

  await prisma.integrationConnection.update({
    where: { id: record.id },
    data: {
      status: "DISCONNECTED",
      credentialCiphertext: null,
      credentialIv: null,
      credentialTag: null,
      externalAccountId: null,
      lastValidationStatus: "DISCONNECTED",
      lastValidationMessage: "Conexão removida pela Central.",
      disconnectedAt: new Date(),
      connectedAt: null,
    },
  });

  return { success: true };
}

export async function readStoredCredentials(prisma, provider) {
  const record = await prisma.integrationConnection.findUnique({
    where: { provider: providerKey(provider) },
  });

  if (!record) return null;

  return {
    record,
    credentials: decryptIntegrationCredentials(record),
  };
}
