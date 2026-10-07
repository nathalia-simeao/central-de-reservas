const API_BASE = "https://terra.tripadvisor.com/api";

function clean(value) {
  return String(value ?? "").trim();
}

function apiError(status, payload) {
  const message =
    payload?.message ||
    payload?.detail ||
    payload?.title ||
    ("Tripadvisor Terra respondeu com HTTP " + status + ".");
  const error = new Error(message);
  error.status = status;
  error.payload = payload;
  return error;
}

async function terraGet(apiKey, path, params = {}) {
  const url = new URL(API_BASE + path);
  for (const [key, value] of Object.entries(params)) {
    if (value == null || value === "") continue;
    if (Array.isArray(value)) {
      for (const item of value) url.searchParams.append(key, String(item));
    } else {
      url.searchParams.set(key, String(value));
    }
  }

  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      "X-API-Key": apiKey,
    },
  });

  const text = await response.text();
  let payload = {};
  try {
    payload = text ? JSON.parse(text) : {};
  } catch {
    payload = { message: text || "Resposta não JSON do Tripadvisor Terra." };
  }

  if (!response.ok) throw apiError(response.status, payload);
  return payload;
}

export async function testTripadvisorTerraCredentials({ apiKey, locationId = null }) {
  const key = clean(apiKey);
  if (!key || key.length < 8) {
    throw new Error("Informe uma API Key válida do Tripadvisor Terra.");
  }

  const location = clean(locationId);
  if (location) {
    if (!/^\d+$/.test(location)) {
      throw new Error("Tripadvisor Location ID deve conter somente números.");
    }
    const payload = await terraGet(key, "/locations/" + location, {
      version: 1,
      locale: "pt-PT",
    });
    return { mode: "LOCATION", location: payload };
  }

  const payload = await terraGet(key, "/locations/search", {
    version: 1,
    query: "Lisbon",
    size: 1,
  });
  return { mode: "CATALOG", resultCount: Array.isArray(payload?.data) ? payload.data.length : 0 };
}

function translatedValue(items) {
  if (!Array.isArray(items)) return null;
  const primary = items.find((item) => item?.primary) || items[0];
  return primary?.value || primary?.name || null;
}

function ratingValue(location) {
  const candidates = [
    location?.rating,
    location?.rating?.value,
    location?.rating?.overall,
    location?.bubble_rating,
    location?.bubbleRating,
  ];
  for (const value of candidates) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function reviewCount(location) {
  const candidates = [
    location?.review_count,
    location?.reviewCount,
    location?.reviews?.total_count,
    location?.reviews?.count,
    location?.rating?.review_count,
  ];
  for (const value of candidates) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

export async function loadTripadvisorContent({ apiKey, locationId }) {
  const key = clean(apiKey);
  const id = clean(locationId);
  if (!key) throw new Error("API Key Tripadvisor Terra não configurada.");
  if (!id || !/^\d+$/.test(id)) {
    return {
      configured: true,
      locationConfigured: false,
      location: null,
      reviews: [],
      reviewsAccess: null,
    };
  }

  const location = await terraGet(key, "/locations/" + id, {
    version: 1,
    locale: ["pt-PT", "en-US"],
  });

  let reviews = [];
  let reviewsAccess = true;
  let reviewsError = null;
  try {
    const reviewPayload = await terraGet(key, "/locations/" + id + "/reviews", {
      version: 1,
      locale: "pt-PT",
      size: 5,
    });
    reviews = Array.isArray(reviewPayload?.data) ? reviewPayload.data : [];
  } catch (error) {
    if (Number(error?.status) === 403) {
      reviewsAccess = false;
      reviewsError = error.message;
    } else {
      throw error;
    }
  }

  return {
    configured: true,
    locationConfigured: true,
    reviewsAccess,
    reviewsError,
    location: {
      id: location?.id || id,
      name: translatedValue(location?.names) || location?.name || "Tripadvisor Location",
      rating: ratingValue(location),
      reviewCount: reviewCount(location),
      photoCount: Number(location?.photos?.total_count ?? location?.photo_count ?? 0) || null,
      webUrl:
        location?.urls?.web ||
        location?.urls?.tripadvisor ||
        location?.web_url ||
        location?.webUrl ||
        null,
      raw: location,
    },
    reviews: reviews.map((review) => ({
      id: review?.id || null,
      title: review?.title || null,
      text: review?.text || null,
      rating: Number(review?.rating?.overall ?? review?.rating ?? 0) || null,
      publishedAt:
        review?.published_date ||
        review?.publishedAt ||
        review?.published_at ||
        null,
      author:
        review?.reviewer?.display_name ||
        review?.reviewer?.name ||
        review?.username ||
        null,
    })),
  };
}
