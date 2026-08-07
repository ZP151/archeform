-- One governed composition review cycle over a mutable Draft revision.
-- Only schema-valid contracts are persisted: RequirementSpec, CompositionPlan,
-- reviewer decision, a safe plan summary, and the constrained Draft Diff
-- checksum. Raw model responses, prompts, and provider transport material
-- never enter this table.
CREATE TABLE "CompositionReview" (
    "id" TEXT NOT NULL,
    "applicationGraphId" TEXT NOT NULL,
    "draftRevisionId" TEXT NOT NULL,
    "requirement" JSONB NOT NULL,
    "requirementChecksum" TEXT NOT NULL,
    "draftBaseChecksum" TEXT NOT NULL,
    "plan" JSONB,
    "planChecksum" TEXT,
    "planId" TEXT,
    "clarification" JSONB,
    "safeSummary" JSONB,
    "diff" JSONB,
    "diffChecksum" TEXT,
    "decision" JSONB,
    "decisionId" TEXT,
    "status" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompositionReview_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CompositionReview_decisionId_key" ON "CompositionReview"("decisionId");

CREATE INDEX "CompositionReview_applicationGraphId_idx" ON "CompositionReview"("applicationGraphId");

ALTER TABLE "CompositionReview" ADD CONSTRAINT "CompositionReview_applicationGraphId_fkey" FOREIGN KEY ("applicationGraphId") REFERENCES "ApplicationGraph"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "CompositionReview" ADD CONSTRAINT "CompositionReview_draftRevisionId_applicationGraphId_fkey" FOREIGN KEY ("draftRevisionId", "applicationGraphId") REFERENCES "DraftRevision"("id", "applicationGraphId") ON DELETE RESTRICT ON UPDATE CASCADE;
