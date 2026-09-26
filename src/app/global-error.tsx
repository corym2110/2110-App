"use client";

import * as Sentry from "@sentry/nextjs";
import NextError from "next/error";
import { useEffect } from "react";

export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html>
      <body>
        {/* NextError is the default Next.js error page — the App Router doesn't expose real
            status codes for errors caught here, so 0 renders its generic fallback message. */}
        <NextError statusCode={0} />
      </body>
    </html>
  );
}
