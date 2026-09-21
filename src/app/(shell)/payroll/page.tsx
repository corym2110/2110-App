import { redirect } from "next/navigation";
import { getCurrentCoach } from "@/server/coaches";
import { PayrollClient } from "@/components/payroll/PayrollClient";

export const dynamic = "force-dynamic";

export default async function PayrollPage() {
  const coach = await getCurrentCoach();
  if (!coach?.isAdmin) redirect("/dashboard");

  return <PayrollClient />;
}
