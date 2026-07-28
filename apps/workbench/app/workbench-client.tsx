"use client";

import type { ApplicationGraphV1 } from "@factory/graph";
import { Workbench } from "../components/workbench";

type Props = {
  initialGraph: ApplicationGraphV1;
  controlPlaneUrl: string;
};

export function WorkbenchClient({ initialGraph, controlPlaneUrl }: Props) {
  return <Workbench initialGraph={initialGraph} controlPlaneUrl={controlPlaneUrl} />;
}
