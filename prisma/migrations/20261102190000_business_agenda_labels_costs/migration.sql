ALTER TABLE "BusinessSetting" ADD COLUMN "agendaLabels" JSONB;
ALTER TABLE "BusinessSetting" ADD COLUMN "costSettings" JSONB;
ALTER TABLE "Booking" ADD COLUMN "attendanceStatus" TEXT;
ALTER TABLE "Booking" ADD COLUMN "attendanceNote" TEXT;
ALTER TABLE "Booking" ADD COLUMN "attendanceMarkedAt" TIMESTAMP(3);
