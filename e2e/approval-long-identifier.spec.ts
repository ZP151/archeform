import { test } from "@playwright/test";
import { resolve } from "node:path";

import {
  publicationReviewDefinitionCase,
  runApprovalDefinitionBatch,
} from "./helpers/approval-definition-batch";

test("a long application identifier retains the complete approval journey", async ({
  page,
  context,
  request,
}) => {
  test.setTimeout(1_800_000);
  context.setDefaultTimeout(30_000);
  await runApprovalDefinitionBatch({
    page,
    context,
    request,
    definition: {
      ...publicationReviewDefinitionCase,
      requirementIdPrefix: "publication-review-acceptance",
      evidenceDirectory: resolve(
        process.cwd(),
        "docs/acceptance/evidence/bounded-database-identifiers/publication-review",
      ),
    },
  });
});
