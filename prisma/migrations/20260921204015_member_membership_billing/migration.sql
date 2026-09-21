-- AlterTable
ALTER TABLE "Member" ADD COLUMN     "billFailCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "lastBillAt" TIMESTAMP(3),
ADD COLUMN     "lastBillError" TEXT,
ADD COLUMN     "lastBillStatus" TEXT,
ADD COLUMN     "membershipName" TEXT,
ADD COLUMN     "membershipPrice" DECIMAL(10,2),
ADD COLUMN     "membershipStatus" TEXT NOT NULL DEFAULT 'none',
ADD COLUMN     "nextBillDate" TEXT;
