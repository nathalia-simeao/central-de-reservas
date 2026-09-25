import crypto from "node:crypto";
import db from "../db.server";
import {
  calculateAvailabilityForCalendarSlotFromLoaded,
  createBookingWithCapacityGuard,
  getCentralAvailability,
} from "./capacity.server";
import {
  getActiveAvailabilityBlocks,
  getDatePartsInTimeZone,
} from "./availability.server";
import { localSlotToInstant } from "./gyg-v1.server";

const prisma = db;
const VIATOR_PLATFORM = "VIATOR";
const HOLD_MINUTES = 20;
const INDIVIDUAL_CATEGORIES = ["ADULT", "CHILD", "YOUTH", "SENIOR"];
const DEFAULT_COUNTRY_CODE = String(
  process.env.VIATOR_DEFAULT_COUNTRY_CODE || "PT",
).toUpperCase();

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

function sameSecret(a, b) {
  const left = Buffer.from(String(a || ""));
  const right = Buffer.from(String(b || ""));
  return (
    left.length > 0 &&
    left.length === right.length &&
    crypto.timingSafeEqual(left, right)
  );
}

export function requireViatorAuth(request, version = "v2") {
  const configured = String(process.env.VIATOR_API_KEY || "").trim();
  const supplied = String(request.headers.get("X-Api-Key") || "").trim();

  if (configured && sameSecret(configured, supplied)) return null;

  if (version === "v1") {
    return viatorV1ErrorResponse(
      null,
      "GenericResponse",
      "TGDS0002",
      "Authentication error",
      401,
    );
  }

  return json(
    {
      error: "UNAUTHORIZED",
      message: "The provided X-Api-Key is not valid.",
    },
    401,
  );
}

export async function readViatorJson(request, version = "v2") {
  try {
    const body = await request.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      throw new Error("JSON object required");
    }
    return { data: body };
  } catch {
    if (version === "v1") {
      return {
        error: viatorV1ErrorResponse(
          null,
          "GenericResponse",
          "TGDS0001",
          "Malformed request",
          400,
        ),
      };
    }
    return {
      error: json(
        { error: "BAD_REQUEST", message: "Request body must be valid JSON." },
        400,
      ),
    };
  }
}

function configuredSupplierId() {
  const value = String(process.env.VIATOR_SUPPLIER_ID || "").trim();
  return /^\d+$/.test(value) ? Number(value) : null;
}

export function validateViatorSupplierId(value, version = "v2", requestData = null) {
  const expected = configuredSupplierId();
  const received = Number(value);

  if (expected && Number.isInteger(received) && received === expected) {
    return null;
  }

  if (version === "v1") {
    return viatorV1ErrorResponse(
      requestData,
      "GenericResponse",
      "TGDS0011",
      "Invalid supplier",
      422,
    );
  }

  return json(
    { error: "INVALID_SUPPLIER", message: "Invalid supplier ID." },
    422,
  );
}

function clean(value) {
  const result = String(value ?? "").trim();
  return result || null;
}

function positiveInt(value, fallback = 0) {
  const parsed = Number.parseInt(value ?? fallback, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function normalizeTime(value) {
  const raw = String(value || "").trim();
  const match = raw.match(/^([01]?\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?$/);
  if (!match) return null;
  return `${match[1].padStart(2, "0")}:${match[2]}`;
}

function normalizeDate(value) {
  const raw = String(value || "").trim();
  if (!/^20\d{2}-\d{2}-\d{2}$/.test(raw)) return null;
  const parsed = new Date(`${raw}T12:00:00.000Z`);
  return Number.isNaN(parsed.getTime()) ? null : raw;
}

function nextDateKey(dateKey) {
  const [year, month, day] = String(dateKey).split("-").map(Number);
  if (![year, month, day].every(Number.isFinite)) return null;
  return new Date(Date.UTC(year, month - 1, day + 1, 12))
    .toISOString()
    .slice(0, 10);
}

function dateRangeDays(startDate, endDate) {
  const start = new Date(`${startDate}T12:00:00.000Z`);
  const end = new Date(`${endDate}T12:00:00.000Z`);
  return Math.round((end - start) / 86400000) + 1;
}

function category(value) {
  return String(value || "").trim().toUpperCase();
}

function categoriesForTour(tour) {
  return [
    ...new Set(
      (tour?.variants || [])
        .filter(
          (variant) =>
            variant.active !== false &&
            INDIVIDUAL_CATEGORIES.includes(category(variant.passengerCategory)),
        )
        .map((variant) => category(variant.passengerCategory)),
    ),
  ];
}

function isGroupOnlyTour(tour) {
  const activeCategories = new Set(
    (tour?.variants || [])
      .filter((variant) => variant.active !== false && variant.passengerCategory)
      .map((variant) => category(variant.passengerCategory)),
  );
  return (
    activeCategories.has("GROUP") &&
    !INDIVIDUAL_CATEGORIES.some((item) => activeCategories.has(item))
  );
}

function currencyForTour(tour) {
  const currencies = [
    ...new Set(
      (tour?.variants || [])
        .filter((variant) => variant.active !== false && variant.currency)
        .map((variant) => String(variant.currency).toUpperCase().slice(0, 3)),
    ),
  ];
  return currencies.length === 1 ? currencies[0] : "EUR";
}

function unsupportedPrice() {
  return { type: "UNSUPPORTED_PRICE" };
}

function participantCountsFromTickets(tickets, totalTravelers = null) {
  if (!Array.isArray(tickets)) {
    return { error: "tickets must be an array." };
  }

  const counts = {
    ADULT: 0,
    CHILD: 0,
    YOUTH: 0,
    SENIOR: 0,
  };

  for (const ticket of tickets) {
    const type = category(ticket?.type);
    const quantity = Number.parseInt(ticket?.quantity, 10);

    if (!INDIVIDUAL_CATEGORIES.includes(type)) {
      return { error: `Unsupported ticket type: ${type || "empty"}.` };
    }
    if (!Number.isInteger(quantity) || quantity < 0) {
      return { error: `Invalid quantity for ${type}.` };
    }
    counts[type] += quantity;
  }

  const summed = Object.values(counts).reduce((total, value) => total + value, 0);
  const explicit = Number.parseInt(totalTravelers, 10);

  if (Number.isInteger(explicit) && explicit !== summed) {
    return { error: "totalTravelers does not match ticket quantities." };
  }

  return {
    adults: counts.ADULT,
    children: counts.CHILD,
    youths: counts.YOUTH,
    seniors: counts.SENIOR,
    totalParticipants: summed,
  };
}

function participantCountsFromMix(mix, travellers = []) {
  const read = (key) => {
    const parsed = Number.parseInt(mix?.[key] ?? 0, 10);
    return Number.isInteger(parsed) && parsed >= 0 ? parsed : 0;
  };

  let counts = {
    adults: read("Adult"),
    children: read("Child"),
    youths: read("Youth"),
    seniors: read("Senior"),
  };

  let total =
    counts.adults + counts.children + counts.youths + counts.seniors;

  if (total === 0 && Array.isArray(travellers) && travellers.length > 0) {
    counts = { adults: 0, children: 0, youths: 0, seniors: 0 };
    for (const traveller of travellers) {
      const band = category(traveller?.AgeBand);
      if (band === "ADULT") counts.adults += 1;
      else if (band === "CHILD" || band === "INFANT") counts.children += 1;
      else if (band === "YOUTH") counts.youths += 1;
      else if (band === "SENIOR") counts.seniors += 1;
    }
    total =
      counts.adults + counts.children + counts.youths + counts.seniors;
  }

  return { ...counts, totalParticipants: total };
}

function leadTraveller(data) {
  const travellers = Array.isArray(data?.Traveller) ? data.Traveller : [];
  return (
    travellers.find((traveller) => traveller?.LeadTraveller === true) ||
    travellers[0] ||
    null
  );
}

function travellerName(data) {
  const traveller = leadTraveller(data);
  const name = [traveller?.GivenName, traveller?.Surname]
    .filter(Boolean)
    .join(" ")
    .trim();
  return name || data?.ContactDetail?.ContactName || "Viator Customer";
}

function contactPhone(data) {
  return clean(data?.ContactDetail?.ContactValue);
}

function safeRawPayload(data) {
  if (!data || typeof data !== "object") return data;
  const clone = structuredClone(data);
  if (clone.ApiKey) clone.ApiKey = "[REDACTED]";
  return clone;
}

function optionIdForTour(tour) {
  return String(tour.id);
}

function viatorTourEligible(tour) {
  return (
    tour &&
    tour.shopifyStatus !== "INACTIVE" &&
    Array.isArray(tour.scheduleSlots) &&
    tour.scheduleSlots.length > 0 &&
    !isGroupOnlyTour(tour) &&
    categoriesForTour(tour).length > 0
  );
}

async function resolveTourByOptionId(productOptionId) {
  const id = clean(productOptionId);
  if (!id) return null;
  const tour = await prisma.tour.findUnique({
    where: { id },
    include: { variants: true },
  });
  return viatorTourEligible(tour) ? tour : null;
}

async function resolveTourBySupplierProductCode(productCode) {
  const code = clean(productCode);
  if (!code) return null;

  const tour = await prisma.tour.findFirst({
    where: {
      OR: [{ id: code }, { viatorProductCode: code }],
    },
    include: { variants: true },
  });

  return viatorTourEligible(tour) ? tour : null;
}

function requestedStartTime(data, tour) {
  const requested =
    normalizeTime(data?.TourOptions?.TourDepartureTime) ||
    normalizeTime(data?.startTime);

  if (requested) return requested;
  if ((tour?.scheduleSlots || []).length === 1) {
    return normalizeTime(tour.scheduleSlots[0]);
  }
  return null;
}

function instantForTour(tour, travelDate, startTime) {
  const dateKey = normalizeDate(travelDate);
  const timeKey = normalizeTime(startTime);
  if (!dateKey || !timeKey) return null;
  if (!(tour.scheduleSlots || []).includes(timeKey)) return null;
  return localSlotToInstant(dateKey, timeKey, tour.timezone || "Europe/Lisbon");
}

function bookingCutoffIso(tour, startTime) {
  if (!Number.isInteger(tour?.bookingCutoffSeconds)) return null;
  const seconds = Math.max(0, tour.bookingCutoffSeconds);
  return new Date(startTime.getTime() - seconds * 1000).toISOString();
}

function eventForAvailability(tour, timeKey, startTime, availability) {
  const event = {
    status: availability.remainingSeats > 0 ? "AVAILABLE" : "UNAVAILABLE",
    startTime: timeKey,
    capacity: {
      type: "LIMITED",
      vacancies: [
        {
          types: categoriesForTour(tour),
          quantity: availability.remainingSeats,
          quantityType: "SHARED",
        },
      ],
      original: Math.max(0, Number(tour.maxCapacity ?? 20)),
      remaining: availability.remainingSeats,
    },
    price: unsupportedPrice(),
  };

  const cutoff = bookingCutoffIso(tour, startTime);
  if (cutoff) event.bookingCutoff = cutoff;

  return event;
}

function ticketTypesSupported(tour, tickets) {
  const supported = new Set(categoriesForTour(tour));
  return (tickets || []).every((ticket) => supported.has(category(ticket?.type)));
}

function viatorV2FunctionalError(code, message, status = 422) {
  return json({ error: code, message }, status);
}

function responseTimestamp() {
  return new Date().toISOString();
}

function v1Base(requestData) {
  return {
    ResellerId: requestData?.ResellerId ?? null,
    SupplierId: requestData?.SupplierId ?? configuredSupplierId(),
    ExternalReference: requestData?.ExternalReference ?? null,
    Timestamp: responseTimestamp(),
  };
}

function v1ResponseTypeForRequest(requestType) {
  const map = {
    TourListRequest: "TourListResponse",
    BookingRequest: "BookingResponse",
    BookingAmendmentRequest: "BookingAmendmentResponse",
    BookingCancellationRequest: "BookingCancellationResponse",
  };
  return map[requestType] || "GenericResponse";
}

export function viatorV1ErrorResponse(
  requestData,
  responseType,
  code,
  message,
  httpStatus = 200,
) {
  return json(
    {
      responseType,
      data: {
        ...v1Base(requestData),
        RequestStatus: {
          Status: "ERROR",
          Error: {
            ErrorCode: code,
            ErrorMessage: message,
          },
        },
      },
    },
    httpStatus,
  );
}

function validateV1Envelope(body, expectedRequestType) {
  if (
    !body ||
    body.requestType !== expectedRequestType ||
    !body.data ||
    typeof body.data !== "object"
  ) {
    return viatorV1ErrorResponse(
      body?.data,
      v1ResponseTypeForRequest(expectedRequestType),
      "TGDS0001",
      `Expected ${expectedRequestType} payload.`,
      400,
    );
  }

  return null;
}

function validateV1Supplier(data, responseType) {
  const expected = configuredSupplierId();
  const received = Number(data?.SupplierId);
  if (expected && Number.isInteger(received) && received === expected) return null;

  return viatorV1ErrorResponse(
    data,
    responseType,
    "TGDS0011",
    "Invalid supplier",
    422,
  );
}

function travellerResponseItems(data) {
  const travellers = Array.isArray(data?.Traveller) ? data.Traveller : [];
  return travellers.map((traveller) => ({
    TravellerIdentifier: String(traveller?.TravellerIdentifier || ""),
    TravellerSupplierConfirmationNumber: "",
    TravellerSeat: "",
    TravellerBarcode: "",
  }));
}

function supplierConfirmationNumber(booking) {
  return `PMY-${String(booking.id).slice(0, 12).toUpperCase()}`;
}

function cancellationNumber(booking) {
  return `CANCEL-${String(booking.id).slice(0, 10).toUpperCase()}`;
}

function bookingSuccessResponse(data, booking, responseType = "BookingResponse") {
  return json({
    responseType,
    data: {
      ...v1Base(data),
      RequestStatus: { Status: "SUCCESS" },
      BookingReference: data.BookingReference,
      SupplierCommentCustomer: "",
      TourBarcode: "",
      Traveller: travellerResponseItems(data),
      TransactionStatus: { Status: "CONFIRMED" },
      SupplierConfirmationNumber: supplierConfirmationNumber(booking),
    },
  });
}

export async function viatorTourList(body) {
  const envelopeError = validateV1Envelope(body, "TourListRequest");
  if (envelopeError) return envelopeError;

  const data = body.data;
  const supplierError = validateV1Supplier(data, "TourListResponse");
  if (supplierError) return supplierError;

  try {
    const tours = await prisma.tour.findMany({
      where: { shopifyStatus: { not: "INACTIVE" } },
      include: { variants: true },
      orderBy: { title: "asc" },
    });

    const eligible = tours.filter(viatorTourEligible);

    return json({
      responseType: "TourListResponse",
      data: {
        ...v1Base(data),
        RequestStatus: { Status: "SUCCESS" },
        Tour: eligible.map((tour) => {
          const times = [...new Set(tour.scheduleSlots || [])].sort();
          return {
            SupplierProductCode: String(tour.id),
            SupplierProductName: tour.title,
            CountryCode: DEFAULT_COUNTRY_CODE,
            TourDescription: tour.title,
            TourOption: times.map((timeKey) => ({
              SupplierOptionCode: "",
              SupplierOptionName: "Standard",
              TourDepartureTime: `${timeKey}:00`,
              productOptionId: optionIdForTour(tour),
              Option: [],
            })),
          };
        }),
      },
    });
  } catch (error) {
    console.error("[VIATOR] tourlist failed", error);
    return viatorV1ErrorResponse(
      data,
      "TourListResponse",
      "TGDS0031",
      "Unhandled internal error in supplier system",
      500,
    );
  }
}

export async function viatorAvailabilityCheck(body) {
  const supplierError = validateViatorSupplierId(body?.supplierId, "v2");
  if (supplierError) return supplierError;

  const travelDate = normalizeDate(body?.travelDate);
  if (
    !travelDate ||
    !Array.isArray(body?.productOptions) ||
    !Array.isArray(body?.tickets)
  ) {
    return viatorV2FunctionalError(
      "BAD_REQUEST",
      "supplierId, productOptions, travelDate and tickets are required.",
      400,
    );
  }

  const counts = participantCountsFromTickets(body.tickets, body.totalTravelers);
  if (counts.error || counts.totalParticipants < 1) {
    return viatorV2FunctionalError(
      "INVALID_TICKET",
      counts.error || "At least one traveler is required.",
    );
  }

  try {
    const productOptions = [];

    for (const requested of body.productOptions) {
      const tour = await resolveTourByOptionId(requested?.productOptionId);
      if (!tour || !ticketTypesSupported(tour, body.tickets)) continue;

      const requestedTimes = Array.isArray(requested?.startTimes)
        ? requested.startTimes.map(normalizeTime).filter(Boolean)
        : [];
      const times =
        requestedTimes.length > 0
          ? requestedTimes
          : [...new Set(tour.scheduleSlots || [])];

      const events = [];

      for (const timeKey of times) {
        if (!(tour.scheduleSlots || []).includes(timeKey)) continue;

        const instant = instantForTour(tour, travelDate, timeKey);
        if (!instant) continue;

        const availability = await getCentralAvailability(prisma, {
          tourId: tour.id,
          startTime: instant,
          platform: VIATOR_PLATFORM,
          requestedSeats: counts.totalParticipants,
        });

        events.push(eventForAvailability(tour, timeKey, instant, availability));
      }

      if (events.length > 0) {
        productOptions.push({
          productOptionId: optionIdForTour(tour),
          currency: currencyForTour(tour),
          events,
        });
      }
    }

    return json({ productOptions });
  } catch (error) {
    console.error("[VIATOR] availability check failed", error);
    return viatorV2FunctionalError(
      "INTERNAL_SERVER_ERROR",
      "Unexpected availability failure.",
      500,
    );
  }
}

export async function viatorCalendar(body) {
  const supplierError = validateViatorSupplierId(body?.supplierId, "v2");
  if (supplierError) return supplierError;

  const startDate = normalizeDate(body?.startDate);
  const endDate = normalizeDate(body?.endDate);
  const ids = Array.isArray(body?.productOptionIds)
    ? [...new Set(body.productOptionIds.map(clean).filter(Boolean))]
    : [];

  if (!startDate || !endDate || ids.length === 0 || startDate > endDate) {
    return viatorV2FunctionalError(
      "BAD_REQUEST",
      "supplierId, productOptionIds, startDate and endDate are required.",
      400,
    );
  }

  const days = dateRangeDays(startDate, endDate);
  if (!Number.isInteger(days) || days < 1 || days > 366) {
    return viatorV2FunctionalError(
      "BAD_REQUEST",
      "Calendar date range must be between 1 and 366 days.",
      400,
    );
  }

  try {
    const tours = await prisma.tour.findMany({
      where: { id: { in: ids } },
      include: { variants: true },
    });

    const eligible = tours.filter(viatorTourEligible);
    const productOptions = [];

    for (const tour of eligible) {
      const firstInstant = localSlotToInstant(
        startDate,
        "00:00",
        tour.timezone || "Europe/Lisbon",
      );
      const afterEnd = localSlotToInstant(
        nextDateKey(endDate),
        "00:00",
        tour.timezone || "Europe/Lisbon",
      );

      const [bookings, blocks] = await Promise.all([
        prisma.booking.findMany({
          where: {
            tourId: tour.id,
            status: { in: ["CONFIRMED", "PENDING"] },
            startTime: {
              gte: new Date(firstInstant.getTime() - 86400000),
              lt: new Date(afterEnd.getTime() + 86400000),
            },
          },
        }),
        getActiveAvailabilityBlocks(prisma, tour.id),
      ]);

      const dates = [];
      let dateKey = startDate;

      while (dateKey <= endDate) {
        const events = [];

        for (const timeKey of [...new Set(tour.scheduleSlots || [])].sort()) {
          const instant = instantForTour(tour, dateKey, timeKey);
          if (!instant) continue;

          const availability = calculateAvailabilityForCalendarSlotFromLoaded({
            tour,
            bookings,
            blocks,
            dateKey,
            timeKey,
            platform: VIATOR_PLATFORM,
          });

          events.push(eventForAvailability(tour, timeKey, instant, availability));
        }

        if (events.length > 0) {
          dates.push({ travelDate: dateKey, events });
        }

        dateKey = nextDateKey(dateKey);
      }

      productOptions.push({
        productOptionId: optionIdForTour(tour),
        currency: currencyForTour(tour),
        dates,
      });
    }

    return json({ productOptions });
  } catch (error) {
    console.error("[VIATOR] calendar failed", error);
    return viatorV2FunctionalError(
      "INTERNAL_SERVER_ERROR",
      "Unexpected calendar failure.",
      500,
    );
  }
}

export async function viatorReserve(body) {
  const supplierError = validateViatorSupplierId(body?.supplierId, "v2");
  if (supplierError) return supplierError;

  const tour = await resolveTourByOptionId(body?.productOptionId);
  if (!tour) {
    return viatorV2FunctionalError(
      "INVALID_PRODUCT_OPTION",
      "Invalid product option.",
    );
  }

  const travelDate = normalizeDate(body?.travelDate);
  const startTimeKey = normalizeTime(body?.startTime);
  const counts = participantCountsFromTickets(body?.tickets, body?.totalTravelers);

  if (!travelDate || !startTimeKey || counts.error || counts.totalParticipants < 1) {
    return viatorV2FunctionalError(
      "BAD_REQUEST",
      counts.error ||
        "productOptionId, travelDate, startTime and at least one traveler are required.",
      400,
    );
  }

  if (!ticketTypesSupported(tour, body.tickets)) {
    return viatorV2FunctionalError(
      "INVALID_TICKET",
      "The requested ticket type is not configured for this product.",
    );
  }

  const instant = instantForTour(tour, travelDate, startTimeKey);
  if (!instant) {
    return viatorV2FunctionalError(
      "EVENT_UNAVAILABLE",
      "The requested event does not exist.",
    );
  }

  const cutoffSeconds = Number.isInteger(tour.bookingCutoffSeconds)
    ? Math.max(0, tour.bookingCutoffSeconds)
    : 0;
  if (
    instant <= new Date() ||
    instant.getTime() - Date.now() < cutoffSeconds * 1000
  ) {
    return viatorV2FunctionalError(
      "EVENT_UNAVAILABLE",
      "The requested event is inside the booking cutoff or in the past.",
    );
  }

  const holdExpiresAt = new Date(Date.now() + HOLD_MINUTES * 60 * 1000);

  try {
    const guarded = await createBookingWithCapacityGuard(prisma, {
      tourId: tour.id,
      startTime: instant,
      platform: VIATOR_PLATFORM,
      requestedSeats: counts.totalParticipants,
      bookingData: {
        customerName: "Viator Customer",
        startTime: instant,
        platform: VIATOR_PLATFORM,
        status: "PENDING",
        bookingRef: null,
        externalProductId: String(tour.id),
        adults: counts.adults,
        children: counts.children,
        youths: counts.youths,
        seniors: counts.seniors,
        syncStatus: "RESERVED",
        lastSyncedAt: new Date(),
        holdExpiresAt,
        rawPayload: {
          viatorOperation: "reserve",
          request: safeRawPayload(body),
        },
      },
    });

    if (!guarded.accepted) {
      return json({
        status: "NOT_RESERVED",
        expiration: holdExpiresAt.toISOString(),
        reference: "",
        currency: currencyForTour(tour),
        price: unsupportedPrice(),
      });
    }

    return json({
      status: "RESERVED",
      expiration: (guarded.booking.holdExpiresAt || holdExpiresAt).toISOString(),
      reference: guarded.booking.id,
      currency: currencyForTour(tour),
      price: unsupportedPrice(),
    });
  } catch (error) {
    console.error("[VIATOR] reserve failed", error);
    return viatorV2FunctionalError(
      "INTERNAL_SERVER_ERROR",
      "Unexpected reservation failure.",
      500,
    );
  }
}

export async function viatorBooking(body) {
  const envelopeError = validateV1Envelope(body, "BookingRequest");
  if (envelopeError) return envelopeError;

  const data = body.data;
  const supplierError = validateV1Supplier(data, "BookingResponse");
  if (supplierError) return supplierError;

  const bookingReference = clean(data?.BookingReference);
  if (!bookingReference) {
    return viatorV1ErrorResponse(
      data,
      "BookingResponse",
      "TGDS0020",
      "BookingReference is required.",
      422,
    );
  }

  try {
    const existing = await prisma.booking.findFirst({
      where: {
        platform: VIATOR_PLATFORM,
        externalBookingId: bookingReference,
      },
    });

    if (existing) {
      if (existing.status === "CANCELED") {
        return viatorV1ErrorResponse(
          data,
          "BookingResponse",
          "TGDS0032",
          "Booking was previously cancelled.",
          422,
        );
      }
      return bookingSuccessResponse(data, existing);
    }

    const tour = await resolveTourBySupplierProductCode(data?.SupplierProductCode);
    if (!tour) {
      return viatorV1ErrorResponse(
        data,
        "BookingResponse",
        "TGDS0012",
        "Invalid product.",
        422,
      );
    }

    const timeKey = requestedStartTime(data, tour);
    const instant = instantForTour(tour, data?.TravelDate, timeKey);
    if (!instant) {
      return viatorV1ErrorResponse(
        data,
        "BookingResponse",
        "TGDS0032",
        "The requested event is unavailable.",
        422,
      );
    }

    const counts = participantCountsFromMix(data?.TravellerMix, data?.Traveller);
    if (counts.totalParticipants < 1) {
      return viatorV1ErrorResponse(
        data,
        "BookingResponse",
        "TGDS0036",
        "Invalid traveller mix.",
        422,
      );
    }

    const holdReference = clean(data?.AvailabilityHoldReference);
    if (holdReference) {
      const hold = await prisma.booking.findFirst({
        where: {
          id: holdReference,
          platform: VIATOR_PLATFORM,
          status: "PENDING",
        },
      });

      if (
        hold &&
        hold.tourId === tour.id &&
        new Date(hold.startTime).getTime() === instant.getTime() &&
        hold.totalParticipants === counts.totalParticipants &&
        (!hold.holdExpiresAt || new Date(hold.holdExpiresAt) > new Date())
      ) {
        const confirmed = await prisma.booking.update({
          where: { id: hold.id },
          data: {
            status: "CONFIRMED",
            customerName: travellerName(data),
            customerEmail: clean(data?.ContactEmail),
            customerPhone: contactPhone(data),
            bookingRef: bookingReference,
            externalBookingId: bookingReference,
            externalOrderId: clean(data?.ExternalReference),
            externalProductId: String(tour.id),
            adults: counts.adults,
            children: counts.children,
            youths: counts.youths,
            seniors: counts.seniors,
            totalParticipants: counts.totalParticipants,
            totalPrice: Number.isFinite(Number(data?.Amount))
              ? Number(data.Amount).toFixed(2)
              : null,
            currency: clean(data?.CurrencyCode)?.toUpperCase().slice(0, 3),
            syncStatus: "SYNCED",
            lastSyncedAt: new Date(),
            holdExpiresAt: null,
            externalUpdatedAt: new Date(),
            rawPayload: {
              viatorOperation: "booking",
              request: safeRawPayload(data),
            },
          },
        });

        return bookingSuccessResponse(data, confirmed);
      }
    }

    const guarded = await createBookingWithCapacityGuard(prisma, {
      tourId: tour.id,
      startTime: instant,
      platform: VIATOR_PLATFORM,
      externalBookingId: bookingReference,
      requestedSeats: counts.totalParticipants,
      bookingData: {
        customerName: travellerName(data),
        customerEmail: clean(data?.ContactEmail),
        customerPhone: contactPhone(data),
        startTime: instant,
        platform: VIATOR_PLATFORM,
        status: "CONFIRMED",
        bookingRef: bookingReference,
        externalBookingId: bookingReference,
        externalOrderId: clean(data?.ExternalReference),
        externalProductId: String(tour.id),
        adults: counts.adults,
        children: counts.children,
        youths: counts.youths,
        seniors: counts.seniors,
        totalPrice: Number.isFinite(Number(data?.Amount))
          ? Number(data.Amount).toFixed(2)
          : null,
        currency: clean(data?.CurrencyCode)?.toUpperCase().slice(0, 3),
        syncStatus: "SYNCED",
        lastSyncedAt: new Date(),
        externalCreatedAt: new Date(),
        externalUpdatedAt: new Date(),
        rawPayload: {
          viatorOperation: "booking",
          request: safeRawPayload(data),
        },
      },
    });

    if (!guarded.accepted) {
      return viatorV1ErrorResponse(
        data,
        "BookingResponse",
        "TGDS0036",
        guarded.message || "Event availability changed for this traveller mix.",
        422,
      );
    }

    return bookingSuccessResponse(data, guarded.booking);
  } catch (error) {
    console.error("[VIATOR] booking failed", error);
    return viatorV1ErrorResponse(
      data,
      "BookingResponse",
      "TGDS0031",
      "Unhandled internal error in supplier system",
      500,
    );
  }
}

async function lockTour(tx, tourId) {
  await tx.$queryRaw`
    SELECT "id"
    FROM "Tour"
    WHERE "id" = ${tourId}
    FOR UPDATE
  `;
}

export async function viatorBookingAmendment(body) {
  const envelopeError = validateV1Envelope(body, "BookingAmendmentRequest");
  if (envelopeError) return envelopeError;

  const data = body.data;
  const supplierError = validateV1Supplier(data, "BookingAmendmentResponse");
  if (supplierError) return supplierError;

  const bookingReference = clean(data?.BookingReference);
  if (!bookingReference) {
    return viatorV1ErrorResponse(
      data,
      "BookingAmendmentResponse",
      "TGDS0020",
      "BookingReference is required.",
      422,
    );
  }

  try {
    const existing = await prisma.booking.findFirst({
      where: {
        platform: VIATOR_PLATFORM,
        externalBookingId: bookingReference,
      },
    });

    if (!existing || existing.status !== "CONFIRMED") {
      return viatorV1ErrorResponse(
        data,
        "BookingAmendmentResponse",
        "TGDS0028",
        "Confirmed booking not found.",
        422,
      );
    }

    const tour = await resolveTourBySupplierProductCode(data?.SupplierProductCode);
    if (!tour || tour.id !== existing.tourId) {
      return viatorV1ErrorResponse(
        data,
        "BookingAmendmentResponse",
        "TGDS0012",
        "Product changes across PMY tours are not supported.",
        422,
      );
    }

    const timeKey = requestedStartTime(data, tour);
    const newStartTime = instantForTour(tour, data?.TravelDate, timeKey);
    const counts = participantCountsFromMix(data?.TravellerMix, data?.Traveller);

    if (!newStartTime || counts.totalParticipants < 1) {
      return viatorV1ErrorResponse(
        data,
        "BookingAmendmentResponse",
        "TGDS0023",
        "Invalid travel date, departure time or traveller mix.",
        422,
      );
    }

    const updated = await prisma.$transaction(async (tx) => {
      await lockTour(tx, tour.id);

      const availability = await getCentralAvailability(tx, {
        tourId: tour.id,
        startTime: newStartTime,
        platform: VIATOR_PLATFORM,
        requestedSeats: counts.totalParticipants,
        excludeBookingId: existing.id,
      });

      if (!availability.canAccept) {
        return { accepted: false, availability };
      }

      const booking = await tx.booking.update({
        where: { id: existing.id },
        data: {
          startTime: newStartTime,
          customerName: travellerName(data),
          customerEmail: clean(data?.ContactEmail) || existing.customerEmail,
          customerPhone: contactPhone(data) || existing.customerPhone,
          adults: counts.adults,
          children: counts.children,
          youths: counts.youths,
          seniors: counts.seniors,
          totalParticipants: counts.totalParticipants,
          totalPrice: Number.isFinite(Number(data?.Amount))
            ? Number(data.Amount).toFixed(2)
            : existing.totalPrice,
          currency:
            clean(data?.CurrencyCode)?.toUpperCase().slice(0, 3) ||
            existing.currency,
          syncStatus: "SYNCED",
          lastSyncedAt: new Date(),
          externalUpdatedAt: new Date(),
          rawPayload: {
            viatorOperation: "booking-amendment",
            request: safeRawPayload(data),
          },
        },
      });

      return { accepted: true, booking };
    });

    if (!updated.accepted) {
      return viatorV1ErrorResponse(
        data,
        "BookingAmendmentResponse",
        "TGDS0036",
        "Event availability changed for this traveller mix.",
        422,
      );
    }

    return bookingSuccessResponse(
      data,
      updated.booking,
      "BookingAmendmentResponse",
    );
  } catch (error) {
    console.error("[VIATOR] booking amendment failed", error);
    return viatorV1ErrorResponse(
      data,
      "BookingAmendmentResponse",
      "TGDS0031",
      "Unhandled internal error in supplier system",
      500,
    );
  }
}

export async function viatorBookingCancellation(body) {
  const envelopeError = validateV1Envelope(body, "BookingCancellationRequest");
  if (envelopeError) return envelopeError;

  const data = body.data;
  const supplierError = validateV1Supplier(data, "BookingCancellationResponse");
  if (supplierError) return supplierError;

  const bookingReference = clean(data?.BookingReference);
  if (!bookingReference) {
    return viatorV1ErrorResponse(
      data,
      "BookingCancellationResponse",
      "TGDS0020",
      "BookingReference is required.",
      422,
    );
  }

  try {
    const booking = await prisma.booking.findFirst({
      where: {
        platform: VIATOR_PLATFORM,
        externalBookingId: bookingReference,
      },
    });

    if (!booking) {
      return viatorV1ErrorResponse(
        data,
        "BookingCancellationResponse",
        "TGDS0028",
        "Booking not found.",
        422,
      );
    }

    if (booking.status !== "CANCELED") {
      await prisma.booking.update({
        where: { id: booking.id },
        data: {
          status: "CANCELED",
          cancelReason:
            clean(data?.Reason) ||
            clean(data?.SupplierNote) ||
            "viator_booking_cancelled",
          syncStatus: "SYNCED",
          lastSyncedAt: new Date(),
          holdExpiresAt: null,
          externalUpdatedAt: new Date(),
          rawPayload: {
            viatorOperation: "booking-cancellation",
            request: safeRawPayload(data),
          },
        },
      });
    }

    return json({
      responseType: "BookingCancellationResponse",
      data: {
        ...v1Base(data),
        RequestStatus: { Status: "SUCCESS" },
        BookingReference: bookingReference,
        SupplierConfirmationNumber:
          clean(data?.SupplierConfirmationNumber) ||
          supplierConfirmationNumber(booking),
        SupplierCancellationNumber: cancellationNumber(booking),
        TransactionStatus: { Status: "CONFIRMED" },
      },
    });
  } catch (error) {
    console.error("[VIATOR] booking cancellation failed", error);
    return viatorV1ErrorResponse(
      data,
      "BookingCancellationResponse",
      "TGDS0031",
      "Unhandled internal error in supplier system",
      500,
    );
  }
}
