-- Member.balance is now computed from unpaid Sale rows instead of a stored column.
ALTER TABLE "Member" DROP COLUMN "balance";

-- CreateTable
CREATE TABLE "Sale" (
    "id" TEXT NOT NULL,
    "memberId" TEXT,
    "coachId" TEXT,
    "summary" TEXT NOT NULL,
    "total" DECIMAL(10,2) NOT NULL,
    "method" TEXT NOT NULL,
    "paid" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Sale_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Sale" ADD CONSTRAINT "Sale_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sale" ADD CONSTRAINT "Sale_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "Coach"("id") ON DELETE SET NULL ON UPDATE CASCADE;
