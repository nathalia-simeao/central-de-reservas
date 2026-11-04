ALTER TABLE "Booking" ADD COLUMN "totalPriceEur" DECIMAL(12,2);
ALTER TABLE "Booking" ADD COLUMN "fxRateToEur" DECIMAL(14,8);
ALTER TABLE "Booking" ADD COLUMN "fxRateDate" VARCHAR(10);

CREATE TABLE "FxRate" (
    "id" TEXT NOT NULL,
    "date" VARCHAR(10) NOT NULL,
    "currency" VARCHAR(3) NOT NULL,
    "rateToEur" DECIMAL(14,8) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FxRate_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "FxRate_date_currency_key" ON "FxRate"("date", "currency");

-- Reservas já em euro (ou sem moeda: a loja é em EUR) ganham o valor em euro na hora.
UPDATE "Booking" SET "totalPriceEur" = "totalPrice", "fxRateToEur" = 1
WHERE "totalPrice" IS NOT NULL AND ("currency" IS NULL OR UPPER("currency") = 'EUR');
