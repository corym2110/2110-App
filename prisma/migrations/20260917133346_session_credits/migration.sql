-- AlterTable
ALTER TABLE "Sale" ADD COLUMN     "periodFrom" TEXT,
ADD COLUMN     "periodTo" TEXT;

-- CreateTable
CREATE TABLE "SessionCredit" (
    "id" TEXT NOT NULL,
    "saleId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "sessionType" TEXT NOT NULL,
    "unitPrice" DECIMAL(10,2) NOT NULL,
    "appliedOccurrenceKey" TEXT,
    "appliedIso" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SessionCredit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SessionCredit_memberId_idx" ON "SessionCredit"("memberId");

-- CreateIndex
CREATE INDEX "SessionCredit_saleId_idx" ON "SessionCredit"("saleId");

-- CreateIndex
CREATE INDEX "SessionCredit_appliedOccurrenceKey_idx" ON "SessionCredit"("appliedOccurrenceKey");

-- AddForeignKey
ALTER TABLE "SessionCredit" ADD CONSTRAINT "SessionCredit_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "Sale"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionCredit" ADD CONSTRAINT "SessionCredit_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;
