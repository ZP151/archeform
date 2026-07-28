import {
  flowModelToReactFlow,
  pageModelToPuckDocument,
} from "@factory/adapters";
import { workbenchGraph } from "../lib/workbench-graph";
import { WorkbenchClient } from "./workbench-client";

export default function Page() {
  return (
    <WorkbenchClient
      flowDiagram={flowModelToReactFlow(workbenchGraph.flow)}
      pageDocument={pageModelToPuckDocument(workbenchGraph.page)}
    />
  );
}
