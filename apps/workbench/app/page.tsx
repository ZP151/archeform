import { workbenchGraph } from "../lib/workbench-graph";
import { WorkbenchClient } from "./workbench-client";

export default function Page() {
  return (
    <WorkbenchClient
      initialGraph={workbenchGraph}
      controlPlaneUrl={process.env.NEXT_PUBLIC_CONTROL_PLANE_URL ?? "http://127.0.0.1:3000"}
    />
  );
}
