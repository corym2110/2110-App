-- The "packageWarning" column was declared in the 20260914161921 migration (which is recorded as
-- successfully applied) but is missing from the live table — something dropped it outside of
-- Prisma's migration history afterward. This restores it with the same default the original
-- migration used, so saveBusinessSettings' single-query upsert stops failing on every save.
ALTER TABLE "BusinessSettings" ADD COLUMN IF NOT EXISTS "packageWarning" TEXT NOT NULL DEFAULT '2 sessions left';
