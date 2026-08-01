import { execFileSync } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";

import {
  composeDefaultCapabilityDraft,
  createCapabilityCompositionLock,
} from "../packages/capabilities/dist/index.js";
import { generateApplicationBundle } from "../packages/compiler/dist/index.js";
import { hashApplicationGraph } from "../packages/graph/dist/index.js";

const generatedRuntimeProof = `import { PrismaClient } from "@prisma/client";
import {
  ApplicationRuntime,
  type RecordStore,
} from "./application-runtime.js";
import { PrismaRecordStore } from "./prisma-record-store.js";

class FailAfterDomainUpdateStore extends PrismaRecordStore {
  constructor(
    prisma: PrismaClient,
    private readonly milestones: {
      enqueueCompleted: boolean;
      domainUpdateCompleted: boolean;
    },
  ) {
    super(prisma);
  }

  async inTransaction<T>(operation: (store: RecordStore) => Promise<T>): Promise<T> {
    return super.inTransaction(async (store) => {
      const milestones = this.milestones;
      const failingStore = new Proxy(store, {
        get(target, property, receiver) {
          if (property === "enqueueNotification") {
            return async (...args: Parameters<RecordStore["enqueueNotification"]>) => {
              const entry = await target.enqueueNotification(...args);
              milestones.enqueueCompleted = true;
              return entry;
            };
          }
          if (property === "update") {
            return async (...args: Parameters<RecordStore["update"]>) => {
              const updated = await target.update(...args);
              if (milestones.enqueueCompleted) {
                milestones.domainUpdateCompleted = true;
                throw new Error("outbox-proof-sentinel");
              }
              return updated;
            };
          }
          const value = Reflect.get(target, property, receiver);
          return typeof value === "function" ? value.bind(target) : value;
        },
      }) as RecordStore;
      return operation(failingStore);
    });
  }
}

async function main(): Promise<void> {
  const prisma = new PrismaClient();
  try {
    const successRuntime = new ApplicationRuntime(new PrismaRecordStore(prisma));
    const deliveredCandidate = await successRuntime.create("employee", "expense", {
      amount: "9.00",
      description: "Durable outbox proof",
    });
    await successRuntime.transition(
      "employee",
      "expense",
      deliveredCandidate.id,
      "submit",
    );
    const pendingBeforeDrain = await prisma.notificationOutbox.count({
      where: { recordId: deliveredCandidate.id, status: "pending" },
    });

    const rollbackCandidate = await successRuntime.create("employee", "expense", {
      amount: "10.00",
      description: "Rollback proof",
    });
    const milestones = { enqueueCompleted: false, domainUpdateCompleted: false };
    const failingRuntime = new ApplicationRuntime(
      new FailAfterDomainUpdateStore(prisma, milestones),
    );
    let transitionFailure: unknown;
    try {
      await failingRuntime.transition(
        "employee",
        "expense",
        rollbackCandidate.id,
        "submit",
      );
    } catch (error) {
      transitionFailure = error;
    }
    if (
      !(transitionFailure instanceof Error) ||
      transitionFailure.message !== "outbox-proof-sentinel" ||
      !milestones.enqueueCompleted ||
      !milestones.domainUpdateCompleted
    ) {
      throw new Error("Generated rollback proof did not reach its post-update sentinel.");
    }

    const rollbackRecord = await prisma.expense.findUnique({
      where: { id: rollbackCandidate.id },
    });
    const rollbackOutbox = await prisma.notificationOutbox.count({
      where: { recordId: rollbackCandidate.id },
    });
    if (
      pendingBeforeDrain !== 1 ||
      rollbackRecord?.status !== "draft" ||
      rollbackOutbox !== 0
    ) {
      throw new Error("generated outbox runtime proof failed");
    }
    console.log(
      JSON.stringify({
        pendingBeforeDrain,
        enqueueCompleted: milestones.enqueueCompleted,
        domainUpdateCompleted: milestones.domainUpdateCompleted,
        rollbackStatus: rollbackRecord.status,
        rollbackOutbox,
      }),
    );
  } finally {
    await prisma.$disconnect();
  }
}

void main();
`;

function runCompose(directory, projectName, args, options = {}) {
  try {
    return execFileSync("docker", ["compose", "-p", projectName, ...args], {
      cwd: directory,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      ...options,
    });
  } catch (error) {
    if (options.allowFailure) {
      return {
        failed: true,
        output: `${error.stdout ?? ""}${error.stderr ?? ""}`,
      };
    }
    const diagnostic = `${error.stdout ?? ""}${error.stderr ?? ""}`;
    const category = diagnostic.includes("outbox-runtime-proof.ts")
      ? "generated runtime proof typecheck"
      : diagnostic.includes("failed to solve")
        ? "container build"
        : diagnostic.includes("outbox proof transition unexpectedly succeeded")
          ? "rollback decorator was not reached"
          : diagnostic.includes("generated outbox runtime proof failed")
            ? "generated transaction outcome assertion"
            : diagnostic.includes("Role '")
              ? "generated policy assertion"
              : "generated service startup";
    const typecheckDetail = diagnostic
      .match(/outbox-runtime-proof\.ts\(\d+,\d+\): error TS\d+: [^\r\n]+/)
      ?.at(0);
    throw new Error(
      `Generated Compose verification ${options.label ?? "operation"} failed during ${category}${typecheckDetail ? `: ${typecheckDetail}` : "."}`,
    );
  }
}

function parseJsonLine(output, message) {
  const line = output
    .split(/\r?\n/)
    .map((candidate) => candidate.trim())
    .find((candidate) => candidate.startsWith("{") && candidate.endsWith("}"));
  if (!line) throw new Error(message);
  return JSON.parse(line);
}

async function waitForRunningService(directory, projectName, service) {
  const deadline = Date.now() + 20_000;
  while (Date.now() < deadline) {
    const running = runCompose(directory, projectName, [
      "ps",
      "--status",
      "running",
      "--services",
    ]);
    if (running.split(/\r?\n/).some((candidate) => candidate === service)) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`Generated service '${service}' did not become runnable.`);
}

async function writeBundle(directory, bundle) {
  await Promise.all(
    bundle.files.map(async (file) => {
      const target = resolve(directory, file.path);
      await mkdir(dirname(target), { recursive: true });
      await writeFile(target, file.content, "utf8");
    }),
  );
}

async function main() {
  const capabilityDraft = composeDefaultCapabilityDraft({
    profile: "expense-approval",
  });
  const graph = capabilityDraft.graph;
  graph.flow.flows = graph.flow.flows.map((flow) => ({
    ...flow,
    transitions: flow.transitions.map((transition) =>
      transition.event === "submit"
        ? {
            ...transition,
            effects: [
              ...(transition.effects ?? []),
              { capability: "notification.send", operation: "send" },
            ],
          }
        : transition,
    ),
  }));
  const compositionLock = createCapabilityCompositionLock({
    graphChecksum: hashApplicationGraph(graph),
    selections: graph.integration.compositionSelections ?? [],
  });
  const bundle = generateApplicationBundle({
    publishedRevisionId: "generated-notification-outbox-verification",
    graph,
    compositionLock,
  });
  const directory = await mkdtemp(
    join(tmpdir(), "factory-generated-notification-outbox-"),
  );
  const projectName = `factory-outbox-${Date.now()}`;

  try {
    await writeBundle(directory, bundle);
    await writeFile(
      join(directory, "api", "src", "outbox-runtime-proof.ts"),
      generatedRuntimeProof,
      "utf8",
    );
    runCompose(directory, projectName, ["up", "--build", "-d", "api"], {
      label: "build",
    });
    await waitForRunningService(directory, projectName, "api");

    const runtimeProof = parseJsonLine(
      runCompose(
        directory,
        projectName,
        ["exec", "-T", "api", "node", "dist/outbox-runtime-proof.js"],
        { label: "runtime proof" },
      ),
      "Generated runtime proof did not emit its bounded summary.",
    );
    if (
      runtimeProof.pendingBeforeDrain !== 1 ||
      runtimeProof.enqueueCompleted !== true ||
      runtimeProof.domainUpdateCompleted !== true ||
      runtimeProof.rollbackStatus !== "draft" ||
      runtimeProof.rollbackOutbox !== 0
    ) {
      throw new Error(
        "Generated runtime proof did not preserve atomic outbox semantics.",
      );
    }

    const drain = parseJsonLine(
      runCompose(directory, projectName, [
        "exec",
        "-T",
        "api",
        "pnpm",
        "notification:drain",
      ]),
      "Generated drain did not emit its count-only summary.",
    );
    if (drain.processed !== 1 || drain.delivered !== 1 || drain.pending !== 0) {
      throw new Error(
        "Generated drain did not deliver the pending outbox entry.",
      );
    }

    const failedDrain = runCompose(
      directory,
      projectName,
      [
        "exec",
        "-T",
        "-e",
        "DATABASE_URL=postgresql://drain_test:wrong@postgres:5432/generated",
        "api",
        "node",
        "dist/notification-outbox-drain.js",
      ],
      { allowFailure: true },
    );
    if (
      !failedDrain.failed ||
      failedDrain.output.trim() !== '{"status":"failed"}'
    ) {
      throw new Error(
        "Generated drain failure output was not a fixed safe status.",
      );
    }
    if (
      /(drain_test|wrong|postgres|generated|Prisma|Error)/i.test(
        failedDrain.output,
      )
    ) {
      throw new Error(
        "Generated drain failure output exposed connection diagnostics.",
      );
    }

    console.log(
      JSON.stringify({
        pendingBeforeDrain: 1,
        delivered: 1,
        enqueueCompleted: true,
        domainUpdateCompleted: true,
        rollbackOutbox: 0,
        safeFailure: true,
      }),
    );
  } finally {
    try {
      runCompose(directory, projectName, [
        "down",
        "--volumes",
        "--remove-orphans",
      ]);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  }
}

await main();
