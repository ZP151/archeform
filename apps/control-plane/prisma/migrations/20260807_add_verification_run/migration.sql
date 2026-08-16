-- Add the immutable verification run record bound to a compilation.
CREATE TABLE "VerificationRun" (
    "id" TEXT NOT NULL,
    "verificationRunId" TEXT NOT NULL,
    "compilationId" TEXT NOT NULL,
    "profileKey" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "stepIds" JSONB NOT NULL,
    "evidenceDigest" TEXT,
    "evidence" JSONB,
    "diagnosis" JSONB,
    "draftDiff" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VerificationRun_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "VerificationRun_verificationRunId_key" ON "VerificationRun"("verificationRunId");

CREATE INDEX "VerificationRun_compilationId_idx" ON "VerificationRun"("compilationId");

ALTER TABLE "VerificationRun" ADD CONSTRAINT "VerificationRun_compilationId_fkey" FOREIGN KEY ("compilationId") REFERENCES "Compilation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
