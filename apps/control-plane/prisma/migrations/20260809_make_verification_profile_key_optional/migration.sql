-- A verification run may target any composed product graph instead of a
-- named starter profile; the worker derives the verification plan from the
-- Published Graph when profileKey is absent.
ALTER TABLE "VerificationRun"
  ALTER COLUMN "profileKey" DROP NOT NULL;
