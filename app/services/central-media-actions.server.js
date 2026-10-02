import { data } from "react-router";

const json = (body, init) => data(body, init);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const getShopifyFileSnapshot = async (admin, fileId) => {
  const response = await admin.graphql(`
    query PmyFileSnapshot($id: ID!) {
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
};

const waitForShopifyFileUrl = async (admin, fileId, initialFile = null) => {
  let snapshot = initialFile;

  for (let attempt = 0; attempt < 18; attempt += 1) {
    if (snapshot) {
      const url = snapshot?.image?.url || snapshot?.url || null;
      if (url) return { ...snapshot, resolvedUrl: url };

      if (String(snapshot?.fileStatus || "").toUpperCase() === "FAILED") {
        throw new Error("O Shopify não conseguiu processar a logo.");
      }
    }

    if (attempt < 17) {
      await sleep(500);
      snapshot = await getShopifyFileSnapshot(admin, fileId);
    }
  }

  throw new Error(
    "A logo foi enviada, mas o Shopify ainda está processando o arquivo. Tente novamente em alguns segundos.",
  );
};

export async function handleCentralMediaAction({
  action,
  formData,
  admin,
  session,
  prisma,
}) {
  const _action = action;

  // Upload de mídia via Shopify Files API (staged upload)
    if (_action === "uploadMedia") {
      try {
        const filename = String(formData.get("filename") || "").trim();
        const mimetype = String(formData.get("mimetype") || "").trim();
        const size = Number.parseInt(formData.get("size") || "0", 10);
        const category = String(formData.get("category") || "general").trim();
  
        const allowedCategories = new Set(["logo", "guide", "tour", "general"]);
        const allowedType = mimetype.startsWith("image/") || mimetype === "application/pdf";
  
        if (!filename || !allowedType) {
          return json({ success: false, error: "Tipo de arquivo não permitido." }, { status: 400 });
        }
        if (!Number.isInteger(size) || size <= 0 || size > 10 * 1024 * 1024) {
          return json({ success: false, error: "O arquivo deve ter no máximo 10 MB." }, { status: 400 });
        }
        if (!allowedCategories.has(category)) {
          return json({ success: false, error: "Categoria de mídia inválida." }, { status: 400 });
        }
  
        const stagedRes = await admin.graphql(`
          mutation PmyStagedUploadsCreate($input: [StagedUploadInput!]!) {
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
  
        const stagedData = await stagedRes.json();
        const userErrors = stagedData?.data?.stagedUploadsCreate?.userErrors || [];
        if (userErrors.length > 0) {
          return json(
            { success: false, error: userErrors.map((item) => item.message).join("; ") },
            { status: 400 },
          );
        }
  
        const target = stagedData?.data?.stagedUploadsCreate?.stagedTargets?.[0];
        if (!target) {
          return json({ success: false, error: "Falha ao criar staged upload no Shopify." }, { status: 500 });
        }
  
        return json({
          success: true,
          uploadUrl: target.url,
          resourceUrl: target.resourceUrl,
          parameters: target.parameters,
          category,
          filename,
          mimetype,
        });
      } catch (e) {
        return json({ success: false, error: e?.message || "Falha ao preparar upload." }, { status: 500 });
      }
    }
  
    // Conclui o staged upload criando um Shopify File real e registra a
    // mesma mídia no catálogo PostgreSQL da PMY.
    if (_action === "finalizeMediaUpload") {
      try {
        const shop = session?.shop;
        const resourceUrl = String(formData.get("resourceUrl") || "").trim();
        const filename = String(formData.get("filename") || "").trim();
        const mimetype = String(formData.get("mimetype") || "").trim();
        const category = String(formData.get("category") || "general").trim();
        const label = String(formData.get("label") || filename).trim() || filename;
  
        if (!shop || !resourceUrl || !filename) {
          return json({ success: false, error: "Dados do upload incompletos." }, { status: 400 });
        }
  
        const contentType =
          mimetype === "image/svg+xml"
            ? "FILE"
            : mimetype.startsWith("image/")
              ? "IMAGE"
              : "FILE";
        const fileCreateRes = await admin.graphql(`
          mutation PmyFileCreate($files: [FileCreateInput!]!) {
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
  
        const fileCreateData = await fileCreateRes.json();
        const userErrors = fileCreateData?.data?.fileCreate?.userErrors || [];
        if (userErrors.length > 0) {
          return json(
            { success: false, error: userErrors.map((item) => item.message).join("; ") },
            { status: 400 },
          );
        }
  
        const createdFile = fileCreateData?.data?.fileCreate?.files?.[0];
        if (!createdFile?.id) {
          return json({ success: false, error: "O Shopify não retornou o arquivo criado." }, { status: 500 });
        }
  
        // fileCreate pode responder antes de a imagem ter um URL definitivo.
        // Nunca persistimos resourceUrl, pois ele pertence ao staged upload e expira.
        const readyFile = await waitForShopifyFileUrl(admin, createdFile.id, createdFile);
        const finalUrl = readyFile.resolvedUrl;
        const media = await prisma.media.upsert({
          where: {
            shop_source_externalId: {
              shop,
              source: "pmy_upload",
              externalId: createdFile.id,
            },
          },
          create: {
            shop,
            url: finalUrl,
            filename,
            mimetype: readyFile?.mimeType || mimetype || "application/octet-stream",
            category,
            label,
            source: "pmy_upload",
            externalId: createdFile.id,
            width: Number.isFinite(Number(readyFile?.image?.width)) ? Number(readyFile.image.width) : null,
            height: Number.isFinite(Number(readyFile?.image?.height)) ? Number(readyFile.image.height) : null,
            metadata: {
              fileStatus: readyFile.fileStatus || null,
              storage: "shopify_files",
            },
          },
          update: {
            url: finalUrl,
            filename,
            mimetype: readyFile?.mimeType || mimetype || "application/octet-stream",
            category,
            label,
            width: Number.isFinite(Number(readyFile?.image?.width)) ? Number(readyFile.image.width) : null,
            height: Number.isFinite(Number(readyFile?.image?.height)) ? Number(readyFile.image.height) : null,
            metadata: {
              fileStatus: readyFile.fileStatus || null,
              storage: "shopify_files",
            },
            active: true,
          },
        });
  
        return json({ success: true, media });
      } catch (e) {
        console.error("[PMY] finalizeMediaUpload failed:", e);
        return json(
          { success: false, error: e?.message || "Falha ao registrar mídia." },
          { status: 500 },
        );
      }
    }
  
    // Remove uploads criados pela PMY também do Shopify Files.
    // Referências externas de produtos/Files não são apagadas pela biblioteca.
    if (_action === "deleteMedia") {
      try {
        const id = String(formData.get("id") || "").trim();
        const media = await prisma.media.findUnique({ where: { id } });
  
        if (!media) {
          return json({ success: false, error: "Mídia não encontrada." }, { status: 404 });
        }
  
        if (media.source?.startsWith("shopify_")) {
          return json(
            { success: false, error: "Esta mídia é uma referência do Shopify e não pode ser excluída pela Central." },
            { status: 400 },
          );
        }
  
        if (media.source === "pmy_upload" && media.externalId) {
          const deleteRes = await admin.graphql(`
            mutation PmyFileDelete($fileIds: [ID!]!) {
              fileDelete(fileIds: $fileIds) {
                deletedFileIds
                userErrors { field message }
              }
            }
          `, {
            variables: { fileIds: [media.externalId] },
          });
  
          const deleteData = await deleteRes.json();
          const deleteErrors = deleteData?.data?.fileDelete?.userErrors || [];
          if (deleteErrors.length > 0) {
            return json(
              { success: false, error: deleteErrors.map((item) => item.message).join("; ") },
              { status: 400 },
            );
          }
        }
  
        await prisma.media.delete({ where: { id } });
        return json({ success: true });
      } catch (e) {
        return json({ success: false, error: e?.message || "Falha ao remover mídia." }, { status: 500 });
      }
    }

  return null;
}
