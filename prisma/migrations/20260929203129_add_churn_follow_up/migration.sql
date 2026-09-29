-- CreateTable
CREATE TABLE "ChurnFollowUp" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "note" TEXT,
    "coachId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChurnFollowUp_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ChurnFollowUp_memberId_idx" ON "ChurnFollowUp"("memberId");

-- AddForeignKey
ALTER TABLE "ChurnFollowUp" ADD CONSTRAINT "ChurnFollowUp_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChurnFollowUp" ADD CONSTRAINT "ChurnFollowUp_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "Coach"("id") ON DELETE SET NULL ON UPDATE CASCADE;
