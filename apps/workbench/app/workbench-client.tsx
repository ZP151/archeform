"use client";

import type { PuckPageDocument, ReactFlowDiagram } from "@factory/adapters";
import { Workbench } from "../components/workbench";

type Props = {
  pageDocument: PuckPageDocument;
  flowDiagram: ReactFlowDiagram;
};

export function WorkbenchClient({ pageDocument, flowDiagram }: Props) {
  return <Workbench pageDocument={pageDocument} flowDiagram={flowDiagram} />;
}
