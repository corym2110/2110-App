-- CreateTable
CREATE TABLE "WaiverSignature" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "waiverType" TEXT NOT NULL,
    "contentSnapshot" TEXT NOT NULL,
    "signerName" TEXT NOT NULL,
    "minorName" TEXT,
    "pickupNames" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "signatureDataUrl" TEXT NOT NULL,
    "signedByCoachId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WaiverSignature_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WaiverSignature_memberId_idx" ON "WaiverSignature"("memberId");

-- AddForeignKey
ALTER TABLE "WaiverSignature" ADD CONSTRAINT "WaiverSignature_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WaiverSignature" ADD CONSTRAINT "WaiverSignature_signedByCoachId_fkey" FOREIGN KEY ("signedByCoachId") REFERENCES "Coach"("id") ON DELETE SET NULL ON UPDATE CASCADE;
