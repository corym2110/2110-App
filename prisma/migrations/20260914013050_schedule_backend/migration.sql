-- AlterTable
ALTER TABLE "Coach" ADD COLUMN     "weeklyHours" JSONB;

-- CreateTable
CREATE TABLE "TimeOff" (
    "id" TEXT NOT NULL,
    "coachId" TEXT NOT NULL,
    "fromIso" TEXT NOT NULL,
    "toIso" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "type" TEXT NOT NULL,

    CONSTRAINT "TimeOff_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Booking" (
    "id" TEXT NOT NULL,
    "iso" TEXT NOT NULL,
    "start" INTEGER NOT NULL,
    "duration" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "coachId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "roster" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Booking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecurringSeries" (
    "id" TEXT NOT NULL,
    "clientName" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "coachId" TEXT NOT NULL,
    "duration" INTEGER NOT NULL,
    "days" JSONB NOT NULL,
    "fromIso" TEXT NOT NULL,
    "toIso" TEXT,
    "excludedDates" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RecurringSeries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AttendanceRecord" (
    "slotKey" TEXT NOT NULL,
    "iso" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AttendanceRecord_pkey" PRIMARY KEY ("slotKey")
);

-- CreateTable
CREATE TABLE "WaitlistEntry" (
    "id" TEXT NOT NULL,
    "occurrenceKey" TEXT NOT NULL,
    "iso" TEXT NOT NULL,
    "memberName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WaitlistEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClassAddIn" (
    "id" TEXT NOT NULL,
    "occurrenceKey" TEXT NOT NULL,
    "iso" TEXT NOT NULL,
    "memberName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClassAddIn_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Booking_iso_idx" ON "Booking"("iso");

-- CreateIndex
CREATE INDEX "AttendanceRecord_iso_idx" ON "AttendanceRecord"("iso");

-- CreateIndex
CREATE INDEX "WaitlistEntry_iso_idx" ON "WaitlistEntry"("iso");

-- CreateIndex
CREATE UNIQUE INDEX "WaitlistEntry_occurrenceKey_memberName_key" ON "WaitlistEntry"("occurrenceKey", "memberName");

-- CreateIndex
CREATE INDEX "ClassAddIn_iso_idx" ON "ClassAddIn"("iso");

-- CreateIndex
CREATE UNIQUE INDEX "ClassAddIn_occurrenceKey_memberName_key" ON "ClassAddIn"("occurrenceKey", "memberName");

-- AddForeignKey
ALTER TABLE "TimeOff" ADD CONSTRAINT "TimeOff_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "Coach"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "Coach"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecurringSeries" ADD CONSTRAINT "RecurringSeries_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "Coach"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
