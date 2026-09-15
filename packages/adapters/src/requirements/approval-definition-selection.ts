import type { z } from "zod";
import { registeredDefinition } from "./definition-selection-catalogue.js";

/** Private compatibility names; all definition content comes from the fixed JSON catalogue. */
export const expenseApprovalDefinition =
  registeredDefinition("expense-approval");
export const approvalDefinitionSelectionSchema =
  expenseApprovalDefinition.selectionSchema;
export type ApprovalDefinitionSelectionV1 = z.infer<
  typeof approvalDefinitionSelectionSchema
>;
export const canonicalExpenseApprovalInterpretation =
  expenseApprovalDefinition.canonical;
export const projectApprovalDefinitionSelection =
  expenseApprovalDefinition.project;
