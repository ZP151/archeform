-- Product closure journey: the accepted ProductBlueprint (business semantics
-- only) and the deterministic plan alternatives proposed over a blank Draft.
-- The chosen alternative's plan and full composed Diff still persist in the
-- same governed review columns; raw model responses and prompts never enter.
ALTER TABLE "CompositionReview"
  ADD COLUMN "blueprint" JSONB,
  ADD COLUMN "productAlternatives" JSONB;
