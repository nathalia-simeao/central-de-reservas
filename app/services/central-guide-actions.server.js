import { data } from "react-router";

const json = (body, init) => data(body, init);

export async function handleCentralGuideAction({ action, formData, prisma }) {
  const _action = action;

  // Campos editoriais de guias sincronizados são propriedade do Shopify.
    // A Central persiste somente contato/UTM nesses registros.
    if (_action === "saveGuide") {
      try {
        const id = String(formData.get("id") || "").trim() || null;
        const submittedName = String(formData.get("name") || "").trim();
        const email = String(formData.get("email") || "").trim() || null;
        const whatsapp = String(formData.get("whatsapp") || "").trim();
        const submittedPhotoUrl = String(formData.get("photoUrl") || "").trim() || null;
        const utmId = String(formData.get("utmId") || "").trim() || null;
        const baseUrl = String(
          formData.get("baseUrl") || "https://portugalmeandyou.com/",
        ).trim();
  
        let existing = null;
        if (id) {
          existing = await prisma.guide.findUnique({ where: { id } });
          if (!existing) {
            return json(
              { success: false, error: "Guia não encontrado." },
              { status: 404 },
            );
          }
        }
  
        const shopifyManaged = Boolean(existing?.shopifyMetaobjectId);
        const name = shopifyManaged ? existing.name : submittedName;
        if (!name) {
          return json(
            { success: false, error: "Nome do guia é obrigatório." },
            { status: 400 },
          );
        }
  
        const utmContent = name
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/\s+/g, "_")
          .replace(/[^a-z0-9_]/g, "");
        const referralLink = utmId
          ? `${baseUrl}?utm_campaign=${utmId}&utm_source=guia&utm_medium=indicacao&utm_content=${utmContent}`
          : null;
  
        const operationalData = {
          email,
          whatsapp,
          utmId,
          referralLink,
        };
  
        let guide;
        if (existing) {
          guide = await prisma.guide.update({
            where: { id },
            data: shopifyManaged
              ? operationalData
              : {
                  ...operationalData,
                  name,
                  photoUrl: submittedPhotoUrl,
                },
          });
        } else {
          guide = await prisma.guide.create({
            data: {
              name,
              email,
              whatsapp,
              photoUrl: submittedPhotoUrl,
              utmId,
              referralLink,
              source: "CENTRAL",
            },
          });
        }
  
        return json({ success: true, guide });
      } catch (e) {
        return json(
          { success: false, error: e?.message || "Falha ao salvar guia." },
          { status: 500 },
        );
      }
    }
  
    // Guias sincronizados devem ser removidos no Shopify. Apagá-los localmente
    // destruiria também a relação com as escalas e eles seriam recriados no sync.
    if (_action === "deleteGuide") {
      try {
        const id = String(formData.get("id") || "").trim();
        const guide = await prisma.guide.findUnique({ where: { id } });
        if (!guide) {
          return json(
            { success: false, error: "Guia não encontrado." },
            { status: 404 },
          );
        }
        if (guide.shopifyMetaobjectId) {
          return json(
            {
              success: false,
              code: "SHOPIFY_MANAGED_GUIDE",
              error:
                "Este guia vem do Shopify. Remova ou desative a entrada no metaobjeto Guias para retirá-lo da Central.",
            },
            { status: 409 },
          );
        }
  
        await prisma.guide.delete({ where: { id } });
        return json({ success: true });
      } catch (e) {
        return json(
          { success: false, error: e?.message || "Falha ao remover guia." },
          { status: 500 },
        );
      }
    }

  return null;
}
