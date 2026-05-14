ALTER TABLE "todos" ADD COLUMN "priority" integer;
UPDATE "todos" SET "priority" = 3 WHERE "priority" IS NULL;
ALTER TABLE "todos" ALTER COLUMN "priority" SET NOT NULL;