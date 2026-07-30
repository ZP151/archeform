ALTER TABLE "PublishedRevision"
  ADD COLUMN "compositionLock" JSONB,
  ADD COLUMN "compositionLockHash" TEXT;
