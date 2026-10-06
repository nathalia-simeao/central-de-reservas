import { data } from "react-router";
import { authenticate } from "../shopify.server";

const json = (body, init) => data(body, init);

function clean(value) {
  return String(value ?? "").trim();
}

function normalized(value) {
  return clean(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function isLanguageOption(value) {
  return ["language", "languages", "idioma", "idiomas", "lingua", "linguas"].includes(
    normalized(value),
  );
}

function splitLanguageList(value) {
  return clean(value)
    .split(/[,;|\n]+/)
    .map((item) => clean(item))
    .filter(Boolean);
}

export const loader = async ({ request }) => {
  const { admin } = await authenticate.admin(request);
  const url = new URL(request.url);
  const productId = clean(url.searchParams.get("productId"));

  if (!productId) {
    return json(
      { success: false, error: "productId é obrigatório." },
      { status: 400 },
    );
  }

  const response = await admin.graphql(
    `
      query PmyTourLanguages($id: ID!) {
        product(id: $id) {
          id
          options {
            name
            values
          }
          metafields(first: 30, namespace: "custom") {
            nodes {
              key
              value
            }
          }
          variants(first: 100) {
            nodes {
              selectedOptions {
                name
                value
              }
            }
          }
        }
      }
    `,
    { variables: { id: productId } },
  );

  const payload = await response.json();
  if (payload?.errors?.length) {
    return json(
      {
        success: false,
        error: payload.errors.map((item) => item.message).join("; "),
      },
      { status: 502 },
    );
  }

  const product = payload?.data?.product;
  if (!product) {
    return json(
      { success: false, error: "Produto Shopify não encontrado." },
      { status: 404 },
    );
  }

  const languages = new Map();
  const add = (value) => {
    const label = clean(value);
    if (!label) return;
    const key = normalized(label);
    if (!languages.has(key)) languages.set(key, label);
  };

  for (const option of product.options || []) {
    if (!isLanguageOption(option?.name)) continue;
    for (const value of option?.values || []) add(value);
  }

  for (const variant of product?.variants?.nodes || []) {
    for (const option of variant?.selectedOptions || []) {
      if (isLanguageOption(option?.name)) add(option?.value);
    }
  }

  for (const metafield of product?.metafields?.nodes || []) {
    if (
      ["languages_info", "languages", "language", "idiomas", "idioma"].includes(
        normalized(metafield?.key),
      )
    ) {
      for (const language of splitLanguageList(metafield?.value)) add(language);
    }
  }

  return json({
    success: true,
    productId,
    languages: [...languages.values()],
  });
};
