import { z } from "zod";

/** Every Server Action's input goes through here — a Server Action is a real, directly-callable
    endpoint regardless of which page normally invokes it, so a compile-time-only TS type is no
    protection against a malformed payload sent straight to it. Surfaces just the first issue's
    message, matching the rest of the app's short, one-sentence error voice, rather than a bulleted
    list or a raw ZodError. */
export function parseInput<T extends z.ZodType>(schema: T, input: unknown): z.infer<T> {
  const result = schema.safeParse(input);
  if (!result.success) throw new Error(result.error.issues[0]?.message ?? "Invalid input.");
  return result.data;
}

/** Every date in this app is a plain "YYYY-MM-DD" string (schedule, billing periods, reports
    ranges) — never a Date object over the wire. */
export const IsoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date.");
