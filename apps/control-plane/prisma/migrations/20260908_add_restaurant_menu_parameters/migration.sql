ALTER TABLE "CompositionReview"
  ADD COLUMN "businessParameters" JSONB,
  ADD COLUMN "businessParametersChecksum" TEXT,
  ADD COLUMN "businessParametersProvided" BOOLEAN;
