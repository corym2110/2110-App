-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "capacity" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Coach" ADD COLUMN     "calendarView" TEXT NOT NULL DEFAULT 'Week',
ADD COLUMN     "landing" TEXT NOT NULL DEFAULT 'Dashboard',
ADD COLUMN     "notifyFlags" JSONB;

-- AlterTable
ALTER TABLE "RecurringSeries" ADD COLUMN     "capacity" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "SessionType" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "duration" INTEGER NOT NULL,
    "capacity" INTEGER NOT NULL DEFAULT 0,
    "price" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "recurring" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SessionType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BusinessSettings" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "businessName" TEXT NOT NULL DEFAULT '2110 Fitness',
    "address" TEXT NOT NULL DEFAULT '5824 Burbank Rd SE, Calgary, AB',
    "phone" TEXT NOT NULL DEFAULT '+1 403 555 2110',
    "timezone" TEXT NOT NULL DEFAULT 'Mountain (MDT)',
    "opens" TEXT NOT NULL DEFAULT '6:00 AM',
    "closes" TEXT NOT NULL DEFAULT '8:00 PM',
    "bookingIncrement" TEXT NOT NULL DEFAULT '15 minutes',
    "calendarView" TEXT NOT NULL DEFAULT 'Week',
    "bookingFlags" JSONB NOT NULL DEFAULT '{"selfBook":true,"waitlist":true,"requireCard":false,"allowDouble":false}',
    "currency" TEXT NOT NULL DEFAULT 'CAD',
    "salesTax" TEXT NOT NULL DEFAULT 'GST 5%',
    "cardTerminal" TEXT NOT NULL DEFAULT 'Front desk terminal · connected',
    "lateCancelFee" TEXT NOT NULL DEFAULT '$25.00',
    "paymentsFlags" JSONB NOT NULL DEFAULT '{"emailReceipt":true,"autoCharge":true,"packageAlert":true,"dailySummary":false}',
    "notifyFlags" JSONB NOT NULL DEFAULT '{"reminder":true,"cancelNotice":true,"waitlistOpen":true,"birthday":false,"marketing":false}',
    "reminderTiming" TEXT NOT NULL DEFAULT '24 hours before',
    "packageWarning" TEXT NOT NULL DEFAULT '2 sessions left',
    "dailySummaryTo" TEXT NOT NULL DEFAULT 'cory@2110fitness.com',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BusinessSettings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SessionType_name_key" ON "SessionType"("name");
