import { NextResponse } from "next/server";
import { gzipSync } from "zlib";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { exportDatabaseJson } from "@/server/backup";

/** R2 is S3-compatible, so the regular AWS SDK works against it — just pointed at the account's
    R2 endpoint instead of an AWS region. */
function r2Client(): S3Client {
  return new S3Client({
    region: "auto",
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    },
  });
}

/** Runs daily via Vercel Cron (see vercel.json) — a full JSON export of every table, gzipped and
    pushed to Cloudflare R2. Real off-site backup (a separate provider from Neon), distinct from
    Neon's own 6-hour point-in-time recovery window. One object per day; nothing here ever deletes
    an older backup, since the whole history for a database this size stays well under R2's free
    10 GB/month tier for years. */
export async function GET(req: Request) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const dump = await exportDatabaseJson();
  const body = gzipSync(Buffer.from(JSON.stringify(dump)));
  const dateIso = dump.exportedAt.slice(0, 10);

  await r2Client().send(
    new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: `2110-db-backups/${dateIso}.json.gz`,
      Body: body,
      ContentType: "application/gzip",
    }),
  );

  const tableCounts = Object.fromEntries(Object.entries(dump.tables).map(([name, rows]) => [name, rows.length]));
  return NextResponse.json({ ok: true, date: dateIso, bytesUploaded: body.byteLength, tableCounts });
}
