ALTER TABLE "ApplicationGraph"
ADD COLUMN "templateOrigin" JSONB;

CREATE TABLE "DraftPreviewSnapshot" (
  "id" TEXT NOT NULL,
  "applicationGraphId" TEXT NOT NULL,
  "draftRevisionId" TEXT NOT NULL,
  "snapshot" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "DraftPreviewSnapshot_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "DraftPreviewSnapshot_applicationGraphId_idx"
ON "DraftPreviewSnapshot"("applicationGraphId");

CREATE INDEX "DraftPreviewSnapshot_draftRevisionId_idx"
ON "DraftPreviewSnapshot"("draftRevisionId");

ALTER TABLE "DraftPreviewSnapshot"
ADD CONSTRAINT "DraftPreviewSnapshot_applicationGraphId_fkey"
FOREIGN KEY ("applicationGraphId") REFERENCES "ApplicationGraph"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "DraftPreviewSnapshot"
ADD CONSTRAINT "DraftPreviewSnapshot_draftRevisionId_applicationGraphId_fkey"
FOREIGN KEY ("draftRevisionId", "applicationGraphId")
REFERENCES "DraftRevision"("id", "applicationGraphId")
ON DELETE RESTRICT ON UPDATE CASCADE;
