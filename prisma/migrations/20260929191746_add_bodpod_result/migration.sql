-- CreateTable
CREATE TABLE "BodPodResult" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "scanIso" TEXT NOT NULL,
    "bodyMassLbs" DOUBLE PRECISION NOT NULL,
    "fatMassLbs" DOUBLE PRECISION NOT NULL,
    "fatFreeMassLbs" DOUBLE PRECISION NOT NULL,
    "bodyFatPct" DOUBLE PRECISION NOT NULL,
    "rmrKcal" DOUBLE PRECISION,
    "notes" TEXT,
    "loggedByCoachId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BodPodResult_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BodPodResult_memberId_idx" ON "BodPodResult"("memberId");

-- AddForeignKey
ALTER TABLE "BodPodResult" ADD CONSTRAINT "BodPodResult_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BodPodResult" ADD CONSTRAINT "BodPodResult_loggedByCoachId_fkey" FOREIGN KEY ("loggedByCoachId") REFERENCES "Coach"("id") ON DELETE SET NULL ON UPDATE CASCADE;
