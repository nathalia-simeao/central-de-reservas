const GUIDE_METAOBJECT_TYPE = "guias";

const GUIDE_METAOBJECT_QUERY = `
  query PmyGuideMetaobjects($first: Int!, $after: String, $type: String!) {
    metaobjects(first: $first, after: $after, type: $type) {
      nodes {
        id
        handle
        displayName
        type
        updatedAt
        fields {
          key
          type
          value
          reference {
            __typename
            ... on MediaImage {
              id
              image { url }
            }
            ... on GenericFile {
              id
              url
            }
            ... on Video {
              id
              filename
              sources { url mimeType format width height }
            }
            ... on Product {
              id
              title
              handle
            }
          }
          references(first: 50) {
            nodes {
              __typename
              ... on MediaImage {
                id
                image { url }
              }
              ... on GenericFile {
                id
                url
              }
              ... on Video {
                id
                filename
                sources { url mimeType format width height }
              }
              ... on Product {
                id
                title
                handle
              }
            }
          }
        }
      }
      pageInfo { hasNextPage endCursor }
    }
  }
`;

function normalizeName(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function fieldMap(metaobject) {
  return Object.fromEntries(
    (metaobject?.fields || []).map((field) => [field.key, field]),
  );
}

function resourceUrl(reference) {
  if (!reference) return null;
  if (reference.__typename === "MediaImage") {
    return reference.image?.url || null;
  }
  if (reference.__typename === "GenericFile") {
    return reference.url || null;
  }
  if (reference.__typename === "Video") {
    const sources = Array.isArray(reference.sources) ? reference.sources : [];
    const mp4 = sources.find(
      (source) =>
        String(source?.mimeType || "").toLowerCase() === "video/mp4" ||
        String(source?.format || "").toLowerCase() === "mp4",
    );
    return mp4?.url || sources[0]?.url || null;
  }
  return null;
}

function normalizeMetaobject(metaobject) {
  const fields = fieldMap(metaobject);
  const name =
    String(fields.nome?.value || metaobject?.displayName || "").trim();
  const gallery = (fields.galeria?.references?.nodes || [])
    .map(resourceUrl)
    .filter(Boolean);
  const exclusiveProducts = (fields.passeio_exclusivo?.references?.nodes || [])
    .filter((reference) => reference?.__typename === "Product")
    .map((product) => ({
      id: product.id,
      title: product.title || "",
      handle: product.handle || "",
    }));

  return {
    shopifyMetaobjectId: metaobject.id,
    shopifyHandle: metaobject.handle || null,
    name,
    photoUrl: resourceUrl(fields.foto?.reference),
    description: String(fields.descricao?.value || "").trim() || null,
    videoUrl: resourceUrl(fields.video?.reference),
    galleryUrls: gallery,
    exclusiveProducts,
    shopifyUpdatedAt: metaobject.updatedAt
      ? new Date(metaobject.updatedAt)
      : null,
  };
}

export async function fetchShopifyGuideMetaobjects(admin) {
  const entries = [];
  let after = null;

  do {
    const response = await admin.graphql(GUIDE_METAOBJECT_QUERY, {
      variables: {
        first: 50,
        after,
        type: GUIDE_METAOBJECT_TYPE,
      },
    });
    const payload = await response.json();

    if (payload?.errors?.length) {
      throw new Error(
        payload.errors.map((error) => error.message).filter(Boolean).join("; ") ||
          "Falha ao consultar os metaobjetos de Guias.",
      );
    }

    const connection = payload?.data?.metaobjects;
    if (!connection) {
      throw new Error("O Shopify não devolveu os metaobjetos de Guias.");
    }

    entries.push(...(connection.nodes || []));
    after = connection.pageInfo?.hasNextPage
      ? connection.pageInfo?.endCursor || null
      : null;
  } while (after);

  return entries.map(normalizeMetaobject).filter((guide) => guide.name);
}

export async function syncShopifyGuideMetaobjects(prisma, admin) {
  const shopifyGuides = await fetchShopifyGuideMetaobjects(admin);
  const existingGuides = await prisma.guide.findMany({
    orderBy: { createdAt: "asc" },
  });

  const byMetaobjectId = new Map(
    existingGuides
      .filter((guide) => guide.shopifyMetaobjectId)
      .map((guide) => [guide.shopifyMetaobjectId, guide]),
  );
  const unlinkedByName = new Map(
    existingGuides
      .filter((guide) => !guide.shopifyMetaobjectId)
      .map((guide) => [normalizeName(guide.name), guide]),
  );

  // A consulta ao Shopify terminou com sucesso. Só agora desativamos registros
  // que deixaram de existir no metaobjeto, evitando falsos "inativos" em caso
  // de indisponibilidade temporária da API.
  await prisma.guide.updateMany({
    where: { shopifyMetaobjectId: { not: null } },
    data: { shopifyActive: false },
  });

  let created = 0;
  let updated = 0;

  for (const shopifyGuide of shopifyGuides) {
    let existing = byMetaobjectId.get(shopifyGuide.shopifyMetaobjectId) || null;

    if (!existing) {
      const candidate = unlinkedByName.get(normalizeName(shopifyGuide.name));
      if (candidate) {
        existing = candidate;
        unlinkedByName.delete(normalizeName(shopifyGuide.name));
      }
    }

    const editorialData = {
      name: shopifyGuide.name,
      photoUrl: shopifyGuide.photoUrl,
      description: shopifyGuide.description,
      videoUrl: shopifyGuide.videoUrl,
      galleryUrls: shopifyGuide.galleryUrls,
      exclusiveProducts: shopifyGuide.exclusiveProducts,
      shopifyMetaobjectId: shopifyGuide.shopifyMetaobjectId,
      shopifyHandle: shopifyGuide.shopifyHandle,
      shopifyActive: true,
      shopifyUpdatedAt: shopifyGuide.shopifyUpdatedAt,
      source: "SHOPIFY",
    };

    if (existing) {
      const saved = await prisma.guide.update({
        where: { id: existing.id },
        data: editorialData,
      });
      byMetaobjectId.set(shopifyGuide.shopifyMetaobjectId, saved);
      updated += 1;
      continue;
    }

    const saved = await prisma.guide.create({
      data: {
        ...editorialData,
        whatsapp: "",
      },
    });
    byMetaobjectId.set(shopifyGuide.shopifyMetaobjectId, saved);
    created += 1;
  }

  return {
    source: "SHOPIFY_METAOBJECT",
    type: GUIDE_METAOBJECT_TYPE,
    total: shopifyGuides.length,
    created,
    updated,
  };
}
