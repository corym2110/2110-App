/** Next.js redacts every thrown Error's message from a Server Action in production, replacing it
    with a generic digest — confirmed live (a deliberately-invalid product price correctly got
    rejected, but showed "Minified React error #441" instead of the real message). The only
    reliable fix is to never let the error cross the wire as a thrown exception: catch it here and
    return it as plain data instead, which Next.js has no reason to redact. Same pattern
    src/server/clover.ts already used for this exact reason. */
export type ActionResult<T = void> = { ok: true; data: T } | { ok: false; error: string };

export async function runAction<T>(fn: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    return { ok: true, data: await fn() };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Something went wrong." };
  }
}
