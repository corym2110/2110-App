-- AlterTable
ALTER TABLE "BusinessSettings" ADD COLUMN     "hourlyPayRate" DOUBLE PRECISION NOT NULL DEFAULT 20;

-- AlterTable
ALTER TABLE "Coach" ADD COLUMN     "commissionRate" DOUBLE PRECISION NOT NULL DEFAULT 0;
