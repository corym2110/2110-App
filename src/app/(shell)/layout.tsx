import { getCurrentCoach } from "@/server/coaches";
import { ShellLayoutClient } from "@/components/shell/ShellLayoutClient";

/** Resolves the signed-in coach once, server-side, before anything is sent to the browser — every
    `useCurrentCoach()` in the tree below reads this same value via CurrentCoachProvider instead of
    each independently re-fetching (see `src/lib/useCoaches.ts` for why that mattered). */
export default async function ShellLayout({ children }: { children: React.ReactNode }) {
  const coach = await getCurrentCoach();
  return <ShellLayoutClient coach={coach}>{children}</ShellLayoutClient>;
}
