-- Persist the Viator product option (tour grade) paired with viatorProductCode.
-- The pair is used by Viator Product Mapping API v2.0.1 while PMY keeps Tour.id
-- as its stable reservation-system productOptionId.

ALTER TABLE "Tour"
ADD COLUMN "viatorTourGradeCode" TEXT;
