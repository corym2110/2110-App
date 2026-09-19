-- AlterTable
ALTER TABLE "SessionCredit" ADD COLUMN     "coachId" TEXT;

-- AddForeignKey
ALTER TABLE "SessionCredit" ADD CONSTRAINT "SessionCredit_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "Coach"("id") ON DELETE SET NULL ON UPDATE CASCADE;
