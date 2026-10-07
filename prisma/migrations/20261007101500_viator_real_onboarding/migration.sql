-- Persist the Viator product option (tour grade) paired with viatorProductCode.
-- A Viator product can have multiple tour grades, so productCode alone is not unique.

ALTER TABLE "Tour"
ADD COLUMN "viatorTourGradeCode" TEXT;

ALTER TABLE "Tour"
DROP CONSTRAINT IF EXISTS "Tour_viatorProductCode_key";

CREATE UNIQUE INDEX "Tour_viatorProductCode_viatorTourGradeCode_key"
ON "Tour"("viatorProductCode", "viatorTourGradeCode");
