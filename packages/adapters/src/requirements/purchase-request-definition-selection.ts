import type { z } from "zod";
import { registeredDefinition } from "./definition-selection-catalogue.js";

/** Private compatibility names; all definition content comes from the fixed JSON catalogue. */
export const purchaseRequestApprovalDefinition = registeredDefinition(
  "purchase-request-approval",
);
export const purchaseRequestDefinitionSelectionSchema =
  purchaseRequestApprovalDefinition.selectionSchema;
export type PurchaseRequestDefinitionSelectionV1 = z.infer<
  typeof purchaseRequestDefinitionSelectionSchema
>;
export const canonicalPurchaseRequestApprovalInterpretation =
  purchaseRequestApprovalDefinition.canonical;
export const projectPurchaseRequestDefinitionSelection =
  purchaseRequestApprovalDefinition.project;
