import { useCallback } from "react";
import { getDraftOrderAttribution } from "../config/pmy-central.client";

export function useBookingCheckout({
  bookingDate,
  bookingTime,
  custEmail,
  custLang,
  custName,
  custPhone,
  requestResourceJson,
  selectedTour,
  setDraftOrderError,
  setDraftOrderInfo,
  setDraftOrderLoading,
  setGeneratedLink,
  tourOptions,
  tourVariants,
}) {
  const getBookingTimesForTour = useCallback((tour) => {
    const configured = Array.isArray(tour?.scheduleSlots)
      ? tour.scheduleSlots.map(String).map((value) => value.trim()).filter(Boolean)
      : [];

    if (configured.length > 0) return [...new Set(configured)].sort();

    const detected = new Set();
    for (const variant of tour?.variants || []) {
      const matches = String(variant?.title || "").matchAll(/\b([01]?\d|2[0-3])[:hH]([0-5]\d)\b/g);
      for (const match of matches) {
        detected.add(`${match[1].padStart(2, "0")}:${match[2]}`);
      }
    }

    return [...detected].sort();
  }, []);

  const variantMatchesBookingTime = useCallback((variant, selectedTime) => {
    if (!selectedTime) return true;
    const match = String(variant?.title || "").match(/\b([01]?\d|2[0-3])[:hH]([0-5]\d)\b/);
    if (!match) return true;
    const variantTime = `${match[1].padStart(2, "0")}:${match[2]}`;
    return variantTime === selectedTime;
  }, []);

  const handleGeneratePaymentLink = useCallback(async (event) => {
    event.preventDefault();
    setDraftOrderError("");
    setGeneratedLink("");
    setDraftOrderInfo(null);

    const tour = tourOptions.find((item) => item.id === selectedTour);
    if (!custName || !tour) {
      setDraftOrderError("Informe o cliente e selecione um tour.");
      return;
    }
    if (!bookingDate) {
      setDraftOrderError("Informe a data do tour.");
      return;
    }
    if (!bookingTime) {
      setDraftOrderError("Selecione o horário do tour.");
      return;
    }
    if (!custLang) {
      setDraftOrderError("Selecione o idioma do tour.");
      return;
    }

    const realVariants = Array.isArray(tour.variants) ? tour.variants : [];
    const lineItems = realVariants
      .filter((variant) => variantMatchesBookingTime(variant, bookingTime))
      .map((variant) => ({
        variantId: variant.id,
        quantity: Number(tourVariants[variant.id] || 0),
      }))
      .filter((item) => Number.isInteger(item.quantity) && item.quantity > 0);

    if (lineItems.length === 0) {
      setDraftOrderError("Selecione pelo menos um ingresso/variante do Shopify.");
      return;
    }

    setDraftOrderLoading(true);
    try {
      const formData = new FormData();
      formData.append("productId", tour.id);
      formData.append("tourTitle", tour.title || "");
      formData.append("customerName", custName);
      formData.append("customerEmail", custEmail || "");
      formData.append("customerPhone", custPhone || "");
      formData.append("date", bookingDate);
      formData.append("time", bookingTime);
      formData.append("language", custLang);
      formData.append("lineItems", JSON.stringify(lineItems));
      formData.append("attribution", JSON.stringify(getDraftOrderAttribution()));

      const payload = await requestResourceJson("/api/draft-order", formData);
      const draftOrder = payload?.draftOrder;
      const checkoutUrl = draftOrder?.checkoutUrl || draftOrder?.invoiceUrl;

      if (!checkoutUrl) {
        throw new Error("O Shopify não devolveu um link de checkout.");
      }

      setGeneratedLink(checkoutUrl);
      setDraftOrderInfo(draftOrder);
    } catch (error) {
      setDraftOrderError(
        error?.message || "Erro ao criar o Draft Order no Shopify.",
      );
    } finally {
      setDraftOrderLoading(false);
    }
  }, [
    bookingDate,
    bookingTime,
    custEmail,
    custLang,
    custName,
    custPhone,
    requestResourceJson,
    selectedTour,
    setDraftOrderError,
    setDraftOrderInfo,
    setDraftOrderLoading,
    setGeneratedLink,
    tourOptions,
    tourVariants,
    variantMatchesBookingTime,
  ]);

  return {
    getBookingTimesForTour,
    handleGeneratePaymentLink,
    variantMatchesBookingTime,
  };
}
