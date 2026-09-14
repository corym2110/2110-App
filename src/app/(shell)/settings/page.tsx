import { redirect } from "next/navigation";
import { getCurrentCoach } from "@/server/coaches";
import { SettingsClient } from "@/components/settings/SettingsClient";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const coach = await getCurrentCoach();
  if (!coach?.isAdmin) redirect("/dashboard");

  return <SettingsClient />;
}
