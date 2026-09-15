import { test } from "@playwright/test";

import {
  publicationReviewDefinitionCase,
  runApprovalDefinitionBatch,
} from "./helpers/approval-definition-batch";

test("Publication Review completes the reusable approval correction journey", async ({
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
    definition: publicationReviewDefinitionCase,
  });
});
