import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { COACHES } from "../src/data/mock/coaches";
import { MEMBERS, DEFAULT_SHARED_ACCOUNTS } from "../src/data/mock/members";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const db = new PrismaClient({ adapter });

async function main() {
  for (const coach of COACHES) {
    await db.coach.upsert({
      where: { id: coach.id },
      create: { id: coach.id, name: coach.name, email: coach.email, role: coach.role, active: coach.active },
      update: { name: coach.name, email: coach.email, role: coach.role, active: coach.active },
    });
  }

  const coachIdByName = new Map(COACHES.map((c) => [c.name, c.id]));

  for (const member of MEMBERS) {
    const [firstName, ...rest] = member.name.split(" ");
    const lastName = rest.join(" ") || "-";
    await db.member.upsert({
      where: { id: member.id },
      create: {
        id: member.id,
        firstName,
        lastName,
        email: member.email,
        phone: member.phone,
        gender: "Prefer not to say",
        plan: member.plan,
        since: member.since,
        lastSession: member.lastSession,
        coachId: coachIdByName.get(member.coach),
      },
      update: {
        firstName,
        lastName,
        email: member.email,
        phone: member.phone,
        plan: member.plan,
        since: member.since,
        lastSession: member.lastSession,
        coachId: coachIdByName.get(member.coach),
      },
    });
  }

  for (const [payerName, beneficiaryNames] of Object.entries(DEFAULT_SHARED_ACCOUNTS)) {
    const payer = MEMBERS.find((m) => m.name === payerName);
    if (!payer) continue;
    for (const beneficiaryName of beneficiaryNames) {
      const beneficiary = MEMBERS.find((m) => m.name === beneficiaryName);
      if (!beneficiary) continue;
      await db.sharedAccount.upsert({
        where: { payerId_beneficiaryId: { payerId: payer.id, beneficiaryId: beneficiary.id } },
        create: { payerId: payer.id, beneficiaryId: beneficiary.id },
        update: {},
      });
    }
  }

  const [coachCount, memberCount, sharedCount] = await Promise.all([
    db.coach.count(),
    db.member.count(),
    db.sharedAccount.count(),
  ]);
  console.log(`Seeded: ${coachCount} coaches, ${memberCount} members, ${sharedCount} shared-account links.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
