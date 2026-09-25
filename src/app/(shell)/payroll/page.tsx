import { redirect } from "next/navigation";
import { getCurrentCoach } from "@/server/coaches";
import { canViewFinancials } from "@/lib/roles";
import { PayrollClient } from "@/components/payroll/PayrollClient";

export const dynamic = "force-dynamic";

export default async function PayrollPage() {
  const coach = await getCurrentCoach();
  if (!coach || !canViewFinancials(coach.role)) redirect("/dashboard");

  return <PayrollClient />;
}
