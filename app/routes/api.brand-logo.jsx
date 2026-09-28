import { data } from "react-router";
import { authenticate } from "../shopify.server";
import db from "../db.server";

const json = (body, init) => data(body, init);
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function getFileSnapshot(admin, fileId) {
  const response = await admin.graphql(`
    query PmyBrandLogoFile($id: ID!) {
      node(id: $id) {
        __typename
        ... on MediaImage {
          id
          fileStatus
          alt
          image {
            url
            width
            height
          }
        }
        ... on GenericFile {
          id
          fileStatus
          alt
          url
          mimeType
        }
      }
    }
  `, {
    variables: { id: fileId },
  });

  const payload = await response.json();
  if (payload?.errors?.length) {
    throw new Error(payload.errors.map((item) => item.message).join("; "));
  }

  return payload?.data?.node || null;
}

async function waitForFileUrl(admin, fileId, initialFile = null) {
  let snapshot = initialFile;

  for (let attempt = 0; attempt < 20; attempt += 1) {
    const url = snapshot?.image?.url || snapshot?.url || null;
    if (url) return { ...snapshot, resolvedUrl: url };

    if (String(snapshot?.fileStatus || "").toUpperCase() === "FAILED") {
      throw new Error("O Shopify não conseguiu processar a imagem da logo.");
    }

    if (attempt < 19) {
      await sleep(500);
      snapshot = await getFileSnapshot(admin, fileId);
    }
  }

  throw new Error("A logo foi enviada, mas o Shopify ainda não disponibilizou a URL final.");
}

function normalizeVariant(value) {
  const variant = String(value || "").trim().toLowerCase();
  return variant === "dark" ? "dark" : variant === "light" ? "light" : null;
}

export const action = async ({ request }) => {
  const { admin, session } = await authenticate.admin(request);
  const formData = await request.formData();
  const action = String(formData.get("_action") || "").trim();
  const variant = normalizeVariant(formData.get("variant"));

  if (!session?.shop) {
    return json({ success: false, error: "Loja Shopify não identificada." }, { status: 400 });
  }

  if (!variant) {
    return json({ success: false, error: "Versão da logo inválida." }, { status: 400 });
  }

  if (action === "prepareLogoUpload") {
    try {
      const filename = String(formData.get("filename") || "").trim();
      const mimetype = String(formData.get("mimetype") || "").trim();
      const size = Number.parseInt(formData.get("size") || "0", 10);

      if (!filename || !mimetype.startsWith("image/")) {
        return json({ success: false, error: "Selecione um arquivo de imagem válido." }, { status: 400 });
      }

      if (!Number.isInteger(size) || size <= 0 || size > 10 * 1024 * 1024) {
        return json({ success: false, error: "A logo deve ter no máximo 10 MB." }, { status: 400 });
      }

      const stagedResponse = await admin.graphql(`
        mutation PmyBrandLogoStagedUpload($input: [StagedUploadInput!]!) {
          stagedUploadsCreate(input: $input) {
            stagedTargets {
              url
              resourceUrl
              parameters { name value }
            }
            userErrors { field message }
          }
        }
      `, {
        variables: {
          input: [{
            filename,
            mimeType: mimetype,
            resource: "FILE",
            fileSize: String(size),
            httpMethod: "POST",
          }],
        },
      });

      const stagedPayload = await stagedResponse.json();
      const errors = stagedPayload?.data?.stagedUploadsCreate?.userErrors || [];
      if (errors.length) {
        return json(
          { success: false, error: errors.map((item) => item.message).join("; ") },
          { status: 400 },
        );
      }

      const target = stagedPayload?.data?.stagedUploadsCreate?.stagedTargets?.[0];
      if (!target?.url || !target?.resourceUrl) {
        return json({ success: false, error: "O Shopify não criou o destino de upload." }, { status: 500 });
      }

      return json({
        success: true,
        uploadUrl: target.url,
        resourceUrl: target.resourceUrl,
        parameters: target.parameters || [],
      });
    } catch (error) {
      console.error("[PMY] prepareLogoUpload failed:", error);
      return json(
        { success: false, error: error?.message || "Falha ao preparar o upload da logo." },
        { status: 500 },
      );
    }
  }

  if (action === "finalizeLogoUpload") {
    try {
      const resourceUrl = String(formData.get("resourceUrl") || "").trim();
      const filename = String(formData.get("filename") || "").trim();
      const mimetype = String(formData.get("mimetype") || "image/png").trim();
      const label = variant === "dark"
        ? "Logo para fundo escuro"
        : "Logo para fundo claro";

      if (!resourceUrl || !filename) {
        return json({ success: false, error: "Dados do upload incompletos." }, { status: 400 });
      }

      const contentType = mimetype === "image/svg+xml" ? "FILE" : "IMAGE";
      const fileResponse = await admin.graphql(`
        mutation PmyBrandLogoCreate($files: [FileCreateInput!]!) {
          fileCreate(files: $files) {
            files {
              id
              fileStatus
              alt
              ... on MediaImage {
                image {
                  url
                  width
                  height
                }
              }
              ... on GenericFile {
                url
                mimeType
              }
            }
            userErrors { field message }
          }
        }
      `, {
        variables: {
          files: [{
            originalSource: resourceUrl,
            contentType,
            alt: label,
          }],
        },
      });

      const filePayload = await fileResponse.json();
      const errors = filePayload?.data?.fileCreate?.userErrors || [];
      if (errors.length) {
        return json(
          { success: false, error: errors.map((item) => item.message).join("; ") },
          { status: 400 },
        );
      }

      const createdFile = filePayload?.data?.fileCreate?.files?.[0];
      if (!createdFile?.id) {
        return json({ success: false, error: "O Shopify não retornou o arquivo criado." }, { status: 500 });
      }

      const readyFile = await waitForFileUrl(admin, createdFile.id, createdFile);
      const finalUrl = readyFile.resolvedUrl;

      const media = await db.media.upsert({
        where: {
          shop_source_externalId: {
            shop: session.shop,
            source: "pmy_upload",
            externalId: createdFile.id,
          },
        },
        create: {
          shop: session.shop,
          url: finalUrl,
          filename,
          mimetype: readyFile?.mimeType || mimetype,
          category: "logo",
          label,
          source: "pmy_upload",
          externalId: createdFile.id,
          width: Number.isFinite(Number(readyFile?.image?.width)) ? Number(readyFile.image.width) : null,
          height: Number.isFinite(Number(readyFile?.image?.height)) ? Number(readyFile.image.height) : null,
          metadata: {
            fileStatus: readyFile?.fileStatus || null,
            storage: "shopify_files",
            logoVariant: variant,
          },
        },
        update: {
          url: finalUrl,
          filename,
          mimetype: readyFile?.mimeType || mimetype,
          category: "logo",
          label,
          width: Number.isFinite(Number(readyFile?.image?.width)) ? Number(readyFile.image.width) : null,
          height: Number.isFinite(Number(readyFile?.image?.height)) ? Number(readyFile.image.height) : null,
          metadata: {
            fileStatus: readyFile?.fileStatus || null,
            storage: "shopify_files",
            logoVariant: variant,
          },
          active: true,
        },
      });

      const field = variant === "dark" ? "logoOnDarkUrl" : "logoOnLightUrl";
      const settings = await db.businessSetting.upsert({
        where: { shop: session.shop },
        create: {
          shop: session.shop,
          [field]: finalUrl,
        },
        update: {
          [field]: finalUrl,
        },
      });

      return json({
        success: true,
        url: finalUrl,
        media,
        settings,
        variant,
      });
    } catch (error) {
      console.error("[PMY] finalizeLogoUpload failed:", error);
      return json(
        { success: false, error: error?.message || "Falha ao finalizar a logo." },
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

      return json({ success: true, settings, variant });
    } catch (error) {
      console.error("[PMY] removeLogo failed:", error);
      return json(
        { success: false, error: error?.message || "Falha ao remover a logo." },
        { status: 500 },
      );
    }
  }

  return json({ success: false, error: "Ação de logo inválida." }, { status: 400 });
};
