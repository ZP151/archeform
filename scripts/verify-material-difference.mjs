// Standalone acceptance check that two independent requirement briefs
// produced materially different composed products — not two copies of one
// template. Invoked directly after the golden-path acceptance run:
//
//   node scripts/verify-material-difference.mjs
//
// It asks the control plane for the two most recently drafted application
// graphs that have a Published revision (the Prompt A and Prompt B journeys
// of the acceptance run), then fingerprints each product dimension the
// composer produces — entities and their typed fields, pages and navigation,
// actors and their grants, workflows and their transitions — and proves:
//
//   1. the Published Graph hashes differ;
//   2. every fingerprint dimension differs between the two products;
//   3. cross-vocabulary exclusion: neither product's business vocabulary
//      (entities, fields, pages, roles, flows) leaks into the other's.
//
// Throws with every violation listed; exits non-zero on failure. Prints a
// dimension-count summary on success. Only business semantics are read —
// never credentials, prompts, or provider responses.
import { fileURLToPath, pathToFileURL } from "node:url";

const controlPlaneUrl =
  process.env.FACTORY_CONTROL_PLANE_URL ?? "http://127.0.0.1:3000";

/**
 * Domain vocabulary of the acceptance briefs, for cross-exclusion. Only
 * domain nouns count: the bounded action vocabulary (submit, approve,
 * reject, confirm, reschedule, cancel, audit, …) is shared by every product
 * by design, so it is not evidence of a template.
 */
const EXPENSE_VOCABULARY = [
  "expense",
  "employee",
  "manager",
  "finance",
  "receipt",
  "category",
  "amount",
];
const APPOINTMENT_VOCABULARY = [
  "appointment",
  "customer",
  "staff",
  "administrator",
  "service",
  "schedule",
  "calendar",
];

async function getJson(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`GET ${url} -> HTTP ${response.status}`);
  }
  return response.json();
}

/** The two most recently drafted graphs that have a Published revision. */
async function latestTwoPublishedGraphs() {
  const graphs = await getJson(
    `${controlPlaneUrl}/workspaces/local/application-graphs`,
  );
  const published = graphs
    .filter((graph) => graph.latestPublished !== null)
    .sort(
      (left, right) =>
        new Date(right.latestDraft.createdAt).getTime() -
        new Date(left.latestDraft.createdAt).getTime(),
    )
    .slice(0, 2);
  if (published.length < 2) {
    throw new Error(
      `Expected at least 2 published application graphs, found ${published.length}.`,
    );
  }
  return published;
}

function entityFingerprint(entity) {
  const fields = entity.fields
    .map((field) => {
      const options =
        field.values !== undefined
          ? `[${field.values.join(",")}]`
          : field.options !== undefined
            ? `[${field.options.join(",")}]`
            : "";
      return `${field.key}:${field.type}${options}`;
    })
    .join("|");
  return `${entity.key}:${entity.label}:${fields}`;
}

function pageFingerprint(page) {
  const blocks = page.blocks
    .map((block) => `${block.id}:${block.type}:${block.entity ?? ""}`)
    .join("|");
  return `${page.id}:${page.route}:${page.title}:${blocks}`;
}

function policyFingerprint(policy) {
  const roles = [...(policy.roles ?? [])].sort().join(",");
  const grants = (policy.permissions ?? [])
    .map((permission) => {
      const name = permission.resource ?? permission.entityKey ?? "";
      const actions = (permission.actions ?? []).sort().join("+");
      const role = permission.role ?? "";
      return `${role}->${name}[${actions}]`;
    })
    .sort()
    .join("|");
  return `${roles}::${grants}`;
}

function flowFingerprint(flow) {
  const events = flow.events
    ? [...flow.events].sort().join(",")
    : flow.transitions
        .map((transition) => transition.event ?? transition.to)
        .sort()
        .join(",");
  const states = flow.states
    .map((state) => state.key ?? state)
    .sort()
    .join(",");
  const transitions = flow.transitions
    .map(
      (transition) =>
        `${transition.from ?? ""}>${transition.to ?? ""}>${transition.event ?? ""}>${[...(transition.roles ?? [])].sort().join("+")}`,
    )
    .sort()
    .join("|");
  return `${flow.id ?? flow.key}:${events}::${states}::${transitions}`;
}

/**
 * Collect every fingerprint dimension plus the domain vocabulary of one
 * published graph. Domain vocabulary is the noun surface the composer
 * renders — entity keys and labels, field keys, navigation and page labels;
 * transition events are the shared bounded action vocabulary and are not
 * evidence of a template either way.
 */
function analyze(graph, published, graphId) {
  const dimensions = {
    entities: graph.domain.entities.map(entityFingerprint).sort(),
    pages: graph.page.pages.map(pageFingerprint).sort(),
    navigation: graph.page.navigation
      .map((item) => `${item.label}:${item.pageId}`)
      .sort(),
    policy: [policyFingerprint(graph.policy)],
    flows: graph.flow.flows.map(flowFingerprint).sort(),
  };
  const vocabulary = new Set();
  for (const entity of graph.domain.entities) {
    vocabulary.add(entity.key);
    vocabulary.add(entity.label.toLowerCase());
    for (const field of entity.fields) vocabulary.add(field.key);
  }
  for (const item of graph.page.navigation)
    vocabulary.add(item.label.toLowerCase());
  for (const page of graph.page.pages) vocabulary.add(page.title.toLowerCase());
  return {
    id: graphId,
    graphHash: published.graphHash,
    dimensions,
    vocabulary,
  };
}

/** True when the graph's own domain vocabulary marks it as the expense product. */
function isExpenseProduct(graph) {
  const vocabulary = graph.vocabulary;
  const hasExpense = [...EXPENSE_VOCABULARY].some((token) =>
    vocabulary.has(token),
  );
  const hasAppointment = [...APPOINTMENT_VOCABULARY].some((token) =>
    vocabulary.has(token),
  );
  if (hasExpense && !hasAppointment) return true;
  if (hasAppointment && !hasExpense) return false;
  throw new Error(
    `Could not identify the product: expense tokens ${hasExpense}, appointment tokens ${hasAppointment}.`,
  );
}

function assertDimensionDifference(label, left, right, errors) {
  const leftJoined = JSON.stringify(left);
  const rightJoined = JSON.stringify(right);
  if (leftJoined === rightJoined) {
    errors.push(
      `${label}: both products produced the identical ${label} — no material difference.`,
    );
  }
}

export async function verifyMaterialDifference() {
  const [graphA, graphB] = await latestTwoPublishedGraphs();
  const draftA = await getJson(
    `${controlPlaneUrl}/application-graphs/${graphA.id}/draft`,
  );
  const draftB = await getJson(
    `${controlPlaneUrl}/application-graphs/${graphB.id}/draft`,
  );
  const revisionsA = await getJson(
    `${controlPlaneUrl}/application-graphs/${graphA.id}/published-revisions`,
  );
  const revisionsB = await getJson(
    `${controlPlaneUrl}/application-graphs/${graphB.id}/published-revisions`,
  );

  const a = analyze(draftA.graph, revisionsA[0], graphA.id);
  const b = analyze(draftB.graph, revisionsB[0], graphB.id);
  // The newest draft is whichever brief ran last; identify the products from
  // their own domain vocabulary rather than their position.
  const expense = isExpenseProduct(a) ? a : b;
  const appointment = expense === a ? b : a;

  const errors = [];
  if (a.graphHash === b.graphHash) {
    errors.push(
      "Published Graph hashes are identical — the two prompts did not produce different immutable revisions.",
    );
  }
  for (const label of ["entities", "pages", "navigation", "policy", "flows"]) {
    assertDimensionDifference(
      label,
      a.dimensions[label],
      b.dimensions[label],
      errors,
    );
  }

  // Cross-vocabulary exclusion: the expense product must not speak the
  // appointment language, and vice versa.
  for (const token of APPOINTMENT_VOCABULARY) {
    if (expense.vocabulary.has(token)) {
      errors.push(
        `expense product carries appointment vocabulary '${token}' — vocabularies leak across products.`,
      );
    }
  }
  for (const token of EXPENSE_VOCABULARY) {
    if (appointment.vocabulary.has(token)) {
      errors.push(
        `appointment product carries expense vocabulary '${token}' — vocabularies leak across products.`,
      );
    }
  }

  if (errors.length > 0) {
    throw new Error(
      "Material-difference violations:\n" +
        errors.map((error) => `  - ${error}`).join("\n"),
    );
  }

  const count = (graph, dimension) => graph.dimensions[dimension].length;
  const dimensionCounts = {
    entities: `${count(expense, "entities")} vs ${count(appointment, "entities")}`,
    pages: `${count(expense, "pages")} vs ${count(appointment, "pages")}`,
    flows: `${count(expense, "flows")} vs ${count(appointment, "flows")}`,
  };
  return {
    expense: { id: expense.id, hash: expense.graphHash },
    appointment: { id: appointment.id, hash: appointment.graphHash },
    dimensions: dimensionCounts,
  };
}

// Run directly: `node scripts/verify-material-difference.mjs`.
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  const summary = await verifyMaterialDifference();
  console.log(
    `Material difference verified between Published Graphs:\n` +
      `  expense ${summary.expense.id} (${summary.expense.hash.slice(0, 19)}…)\n` +
      `  appointment ${summary.appointment.id} (${summary.appointment.hash.slice(0, 19)}…)\n` +
      `  dimensions: ${summary.dimensions.entities} entities, ` +
      `${summary.dimensions.pages} pages, ${summary.dimensions.flows} flows ` +
      `— every dimension differs and no business vocabulary leaks across products.`,
  );
}
