import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const AUTHORITY_DOCUMENTS = [
  "docs/iterations/2026-08-10-prompt-to-polished-product-reset.md",
  "docs/superpowers/specs/2026-08-10-prompt-to-polished-restaurant-product-design.md",
  "docs/superpowers/plans/2026-08-10-prompt-to-polished-restaurant-product.md",
  "docs/research/2026-08-10-product-builder-ui-ecosystem.md",
  "docs/superpowers/ledgers/2026-08-10-prompt-to-polished-restaurant-product.md",
];

const AUTHORITY_PATHS = AUTHORITY_DOCUMENTS;

const PACKAGE_PROFILE_COORDINATES = [
  {
    id: "root-typescript",
    importer: ".",
    manifestPath: "package.json",
    section: "devDependencies",
    name: "typescript",
  },
  {
    id: "workbench-puck",
    importer: "apps/workbench",
    manifestPath: "apps/workbench/package.json",
    section: "dependencies",
    name: "@puckeditor/core",
  },
  {
    id: "workbench-xyflow",
    importer: "apps/workbench",
    manifestPath: "apps/workbench/package.json",
    section: "dependencies",
    name: "@xyflow/react",
  },
  {
    id: "workbench-next",
    importer: "apps/workbench",
    manifestPath: "apps/workbench/package.json",
    section: "dependencies",
    name: "next",
  },
  {
    id: "workbench-react",
    importer: "apps/workbench",
    manifestPath: "apps/workbench/package.json",
    section: "dependencies",
    name: "react",
  },
  {
    id: "workbench-react-dom",
    importer: "apps/workbench",
    manifestPath: "apps/workbench/package.json",
    section: "dependencies",
    name: "react-dom",
  },
  {
    id: "control-plane-nest-common",
    importer: "apps/control-plane",
    manifestPath: "apps/control-plane/package.json",
    section: "dependencies",
    name: "@nestjs/common",
  },
  {
    id: "control-plane-nest-core",
    importer: "apps/control-plane",
    manifestPath: "apps/control-plane/package.json",
    section: "dependencies",
    name: "@nestjs/core",
  },
  {
    id: "control-plane-nest-platform-express",
    importer: "apps/control-plane",
    manifestPath: "apps/control-plane/package.json",
    section: "dependencies",
    name: "@nestjs/platform-express",
  },
  {
    id: "control-plane-prisma-client",
    importer: "apps/control-plane",
    manifestPath: "apps/control-plane/package.json",
    section: "dependencies",
    name: "@prisma/client",
  },
  {
    id: "control-plane-bullmq",
    importer: "apps/control-plane",
    manifestPath: "apps/control-plane/package.json",
    section: "dependencies",
    name: "bullmq",
  },
  {
    id: "control-plane-prisma-cli",
    importer: "apps/control-plane",
    manifestPath: "apps/control-plane/package.json",
    section: "devDependencies",
    name: "prisma",
  },
  {
    id: "compiler-worker-bullmq",
    importer: "apps/compiler-worker",
    manifestPath: "apps/compiler-worker/package.json",
    section: "dependencies",
    name: "bullmq",
  },
  {
    id: "compiler-worker-ioredis",
    importer: "apps/compiler-worker",
    manifestPath: "apps/compiler-worker/package.json",
    section: "dependencies",
    name: "ioredis",
  },
];

const DOCKERFILE_PROFILE = [
  { id: "workbench-node-image", path: "apps/workbench/Dockerfile" },
  {
    id: "control-plane-node-image",
    path: "apps/control-plane/Dockerfile",
  },
  {
    id: "compiler-worker-node-image",
    path: "apps/compiler-worker/Dockerfile",
  },
];

const MANIFEST_PROFILE = [
  { id: "root-node-engine", path: "package.json", coordinate: "engines.node" },
  {
    id: "root-package-manager",
    path: "package.json",
    coordinate: "packageManager",
  },
];

const COMPOSE_PROFILE = [
  { id: "compose-postgres-image", service: "postgres" },
  { id: "compose-redis-image", service: "redis" },
];

const SUPERPOWERS_DIRECTORIES = [
  "brainstorming",
  "dispatching-parallel-agents",
  "executing-plans",
  "finishing-a-development-branch",
  "receiving-code-review",
  "requesting-code-review",
  "subagent-driven-development",
  "systematic-debugging",
  "test-driven-development",
  "using-git-worktrees",
  "using-superpowers",
  "verification-before-completion",
  "writing-plans",
  "writing-skills",
];

const EXPECTED_SUPERPOWERS_MANIFEST_SHA256 =
  "9926A440660D3A64B0CB2D4B8E2F93048C93ED9ED62B4AC3D2CE42BAA4BD4193";
const EXPECTED_ADR_SKILL_SHA256 =
  "C11AF0C34FA034E36E622AD97F1194824C3CBBE675A8B17CDC0BEDC91B188A72";

function read(root, relativePath, issues) {
  const absolutePath = path.join(root, relativePath);
  if (!existsSync(absolutePath)) {
    issues.push(`${relativePath}: required file is missing`);
    return "";
  }
  return readFileSync(absolutePath, "utf8");
}

function requirePatterns(relativePath, text, patterns, issues) {
  for (const [label, pattern] of patterns) {
    if (!pattern.test(text)) {
      issues.push(`${relativePath}: missing ${label}`);
    }
  }
}

function normalizedText(text) {
  return text.replace(/\r\n/g, "\n");
}

function normalizedSha256(text) {
  return createHash("sha256")
    .update(normalizedText(text))
    .digest("hex")
    .toUpperCase();
}

function gitBlobSha1(text) {
  const content = Buffer.from(normalizedText(text));
  return createHash("sha1")
    .update(`blob ${content.length}\0`)
    .update(content)
    .digest("hex");
}

function unquoteYamlScalar(value) {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function parseLockfileImporters(text, issues) {
  const entries = new Map();
  let importer = null;
  let section = null;
  let dependency = null;
  let sawImporters = false;

  for (const line of normalizedText(text).split("\n")) {
    if (line === "importers:") {
      sawImporters = true;
      continue;
    }
    if (!sawImporters) continue;
    if (line === "packages:") break;

    const importerMatch = line.match(/^  ([^ ].*):$/);
    if (importerMatch) {
      importer = unquoteYamlScalar(importerMatch[1]);
      section = null;
      dependency = null;
      continue;
    }
    const sectionMatch = line.match(/^    (dependencies|devDependencies):$/);
    if (sectionMatch) {
      section = sectionMatch[1];
      dependency = null;
      continue;
    }
    const dependencyMatch = line.match(/^      (.+):$/);
    if (dependencyMatch && importer && section) {
      dependency = unquoteYamlScalar(dependencyMatch[1]);
      entries.set(`${importer}|${section}|${dependency}`, {});
      continue;
    }
    const fieldMatch = line.match(/^        (specifier|version): (.+)$/);
    if (fieldMatch && importer && section && dependency) {
      entries.get(`${importer}|${section}|${dependency}`)[fieldMatch[1]] =
        unquoteYamlScalar(fieldMatch[2]);
    }
  }

  if (!sawImporters) {
    issues.push("pnpm-lock.yaml: missing importers section");
  }
  return entries;
}

function resolvedPackageVersion(value) {
  return typeof value === "string" ? value.split("(", 1)[0] : null;
}

function parseJson(root, relativePath, issues) {
  const text = read(root, relativePath, issues);
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch (error) {
    issues.push(`${relativePath}: invalid JSON: ${error.message}`);
    return null;
  }
}

function goldenProfileCoordinates() {
  return [
    ...MANIFEST_PROFILE.map(({ id, path: artifact, coordinate }) => ({
      kind: "manifest",
      id,
      artifact,
      coordinate,
    })),
    ...PACKAGE_PROFILE_COORDINATES.map(
      ({ id, importer: artifact, section, name }) => ({
        kind: "package",
        id,
        artifact,
        coordinate: `${section}:${name}`,
      }),
    ),
    ...DOCKERFILE_PROFILE.map(({ id, path: artifact }) => ({
      kind: "dockerfile",
      id,
      artifact,
      coordinate: "FROM",
    })),
    ...COMPOSE_PROFILE.map(({ id, service: coordinate }) => ({
      kind: "compose",
      id,
      artifact: "infra/docker-compose.yml",
      coordinate,
    })),
  ];
}

function parsePipeCells(line) {
  const trimmed = line.trim();
  if (!trimmed.startsWith("|") || !trimmed.endsWith("|")) return null;
  return trimmed
    .slice(1, -1)
    .split("|")
    .map((cell) => cell.trim());
}

function parseDocumentedValue(cell) {
  if (cell === "—") return { valid: true, value: null };
  const match = cell.match(/^`([^`\r\n]+)`$/);
  return match
    ? { valid: true, value: match[1] }
    : { valid: false, value: null };
}

function parseGoldenProfileTable(governance, issues) {
  const startMarker = "<!-- d0-golden-profile:start -->";
  const endMarker = "<!-- d0-golden-profile:end -->";
  const startCount = governance.split(startMarker).length - 1;
  const endCount = governance.split(endMarker).length - 1;
  if (startCount !== 1 || endCount !== 1) {
    issues.push(
      `Golden profile table: expected exactly one marker pair, found ${startCount} start and ${endCount} end markers`,
    );
    return new Map();
  }

  const start = governance.indexOf(startMarker) + startMarker.length;
  const end = governance.indexOf(endMarker, start);
  if (end < start) {
    issues.push("Golden profile table: end marker precedes start marker");
    return new Map();
  }

  const lines = normalizedText(governance.slice(start, end))
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const header = parsePipeCells(lines[0] ?? "");
  const expectedHeader = [
    "Kind",
    "Row ID",
    "Artifact / importer",
    "Coordinate",
    "Supported manifest value",
    "Exact lockfile resolution",
    "Floating-major image tag",
    "Expected count",
  ];
  const separator = parsePipeCells(lines[1] ?? "");
  if (
    !header ||
    header.length !== expectedHeader.length ||
    header.some((cell, index) => cell !== expectedHeader[index]) ||
    !separator ||
    separator.length !== expectedHeader.length ||
    separator.some((cell) => !/^:?-{3,}:?$/.test(cell))
  ) {
    issues.push("Golden profile table: malformed header or separator");
  }

  const expectedById = new Map(
    goldenProfileCoordinates().map((coordinate) => [coordinate.id, coordinate]),
  );
  const rows = new Map();
  for (const line of lines.slice(2)) {
    const cells = parsePipeCells(line);
    const candidateId = cells?.[1] || "<unknown>";
    if (!cells || cells.length !== expectedHeader.length) {
      issues.push(`Golden profile table: malformed row ${candidateId}`);
      continue;
    }

    const [kind, id, artifactCell, coordinateCell, ...valueCells] = cells;
    const artifact = parseDocumentedValue(artifactCell);
    const coordinate = parseDocumentedValue(coordinateCell);
    const values = valueCells.map(parseDocumentedValue);
    const expected = expectedById.get(id);
    let malformed =
      !/^(manifest|package|dockerfile|compose)$/.test(kind) ||
      !/^[a-z0-9-]+$/.test(id) ||
      !artifact.valid ||
      !artifact.value ||
      !coordinate.valid ||
      !coordinate.value ||
      values.some(({ valid }) => !valid);
    const [manifestValue, exactResolution, imageTag, expectedCount] =
      values.map(({ value }) => value);

    if (kind === "manifest") {
      malformed ||=
        !manifestValue ||
        exactResolution !== null ||
        imageTag !== null ||
        expectedCount !== null;
    } else if (kind === "package") {
      malformed ||=
        !manifestValue ||
        !exactResolution ||
        imageTag !== null ||
        expectedCount !== null;
    } else if (kind === "dockerfile") {
      malformed ||=
        manifestValue !== null ||
        exactResolution !== null ||
        !imageTag ||
        !/^[1-9]\d*$/.test(expectedCount ?? "");
    } else if (kind === "compose") {
      malformed ||=
        manifestValue !== null ||
        exactResolution !== null ||
        !imageTag ||
        expectedCount !== null;
    }

    if (!expected) {
      issues.push(`Golden profile table: unsupported row ${id}`);
    } else if (
      kind !== expected.kind ||
      artifact.value !== expected.artifact ||
      coordinate.value !== expected.coordinate
    ) {
      issues.push(
        `Golden profile table: unsupported coordinates for row ${id}`,
      );
    }
    if (malformed) {
      issues.push(`Golden profile table: malformed row ${id}`);
    }
    if (rows.has(id)) {
      issues.push(`Golden profile table: duplicate row ${id}`);
      continue;
    }
    rows.set(id, {
      kind,
      id,
      artifact: artifact.value,
      coordinate: coordinate.value,
      manifestValue,
      exactResolution,
      imageTag,
      expectedCount:
        expectedCount === null ? null : Number.parseInt(expectedCount, 10),
      valid: Boolean(expected) && !malformed,
    });
  }

  for (const { id } of expectedById.values()) {
    if (!rows.has(id)) {
      issues.push(`Golden profile table: missing row ${id}`);
    }
  }
  return rows;
}

function jsonCoordinateValue(document, coordinate) {
  return coordinate.split(".").reduce((value, key) => value?.[key], document);
}

function verifyGoldenProfile(root, governance, issues) {
  const rows = parseGoldenProfileTable(governance, issues);
  const manifests = new Map();
  const manifest = (relativePath) => {
    if (!manifests.has(relativePath)) {
      manifests.set(relativePath, parseJson(root, relativePath, issues));
    }
    return manifests.get(relativePath);
  };

  for (const contract of MANIFEST_PROFILE) {
    const row = rows.get(contract.id);
    if (!row?.valid) continue;
    const actual = jsonCoordinateValue(
      manifest(contract.path),
      contract.coordinate,
    );
    if (actual !== row.manifestValue) {
      issues.push(
        `${contract.path}: ${contract.coordinate} is ${JSON.stringify(actual)}; Golden profile row ${contract.id}: manifest value is ${JSON.stringify(row.manifestValue)}`,
      );
    }
  }

  const lockfile = read(root, "pnpm-lock.yaml", issues);
  const lockEntries = parseLockfileImporters(lockfile, issues);
  for (const contract of PACKAGE_PROFILE_COORDINATES) {
    const row = rows.get(contract.id);
    if (!row?.valid) continue;
    const manifestRange = manifest(contract.manifestPath)?.[contract.section]?.[
      contract.name
    ];
    if (manifestRange !== row.manifestValue) {
      issues.push(
        `${contract.manifestPath}: ${contract.name} supported range is ${JSON.stringify(manifestRange)}; Golden profile row ${contract.id}: manifest value is ${JSON.stringify(row.manifestValue)}`,
      );
    }

    const lockEntry = lockEntries.get(
      `${contract.importer}|${contract.section}|${contract.name}`,
    );
    if (!lockEntry) {
      issues.push(
        `pnpm-lock.yaml: missing ${contract.importer} ${contract.section} importer for ${contract.name}`,
      );
      continue;
    }
    if (
      lockEntry.specifier !== manifestRange ||
      lockEntry.specifier !== row.manifestValue
    ) {
      issues.push(
        `pnpm-lock.yaml: ${contract.importer} ${contract.name} specifier is ${JSON.stringify(lockEntry.specifier)} and manifest range is ${JSON.stringify(manifestRange)}; Golden profile row ${contract.id}: manifest value is ${JSON.stringify(row.manifestValue)}`,
      );
    }
    const lockedVersion = resolvedPackageVersion(lockEntry.version);
    if (lockedVersion !== row.exactResolution) {
      issues.push(
        `pnpm-lock.yaml: ${contract.importer} ${contract.name} resolution is ${JSON.stringify(lockedVersion)}; Golden profile row ${contract.id}: exact lock resolution is ${JSON.stringify(row.exactResolution)}`,
      );
    }
  }

  for (const contract of DOCKERFILE_PROFILE) {
    const row = rows.get(contract.id);
    if (!row?.valid) continue;
    const dockerfile = read(root, contract.path, issues);
    const runtimeTags = [...dockerfile.matchAll(/^FROM\s+([^\s]+)/gm)].map(
      (match) => match[1],
    );
    if (
      runtimeTags.length !== row.expectedCount ||
      runtimeTags.some((tag) => tag !== row.imageTag)
    ) {
      issues.push(
        `${contract.path}: Node runtime tag(s) are ${JSON.stringify(runtimeTags)}; Golden profile row ${contract.id}: floating-major image tag is ${JSON.stringify(row.imageTag)} with count ${row.expectedCount}`,
      );
    }
  }

  const compose = read(root, "infra/docker-compose.yml", issues);
  for (const contract of COMPOSE_PROFILE) {
    const row = rows.get(contract.id);
    if (!row?.valid) continue;
    const match = compose.match(
      new RegExp(
        `^  ${contract.service}:\\r?\\n(?:    .*\\r?\\n)*?    image: ([^\\s]+)`,
        "m",
      ),
    );
    const actualImage = match?.[1] ?? null;
    if (actualImage !== row.imageTag) {
      issues.push(
        `infra/docker-compose.yml: ${contract.service} image is ${JSON.stringify(actualImage)}; Golden profile row ${contract.id}: floating-major image tag is ${JSON.stringify(row.imageTag)}`,
      );
    }
  }
}

function parseFrontmatter(text) {
  const match = normalizedText(text).match(/^---\n([\s\S]*?)\n---/);
  if (!match) return null;
  const fields = {};
  for (const line of match[1].split("\n")) {
    const field = line.match(/^([a-z_]+):\s*(.*)$/);
    if (field) fields[field[1]] = unquoteYamlScalar(field[2]);
  }
  return fields;
}

function extractMarkdownSection(text, heading) {
  const normalized = normalizedText(text);
  const start = normalized.indexOf(`## ${heading}`);
  if (start < 0) return "";
  const next = normalized.indexOf("\n## ", start + heading.length + 3);
  return normalized.slice(start, next < 0 ? undefined : next);
}

function extractLedgerSection(ledger, headingPrefix, issues) {
  const lines = normalizedText(ledger).split("\n");
  const starts = [];
  for (let index = 0; index < lines.length; index += 1) {
    if (lines[index].startsWith(`## ${headingPrefix}`)) starts.push(index);
  }
  if (starts.length !== 1) {
    issues.push(
      `ledger: expected exactly one ${headingPrefix} section, found ${starts.length}`,
    );
    return "";
  }
  const start = starts[0];
  let end = lines.length;
  for (let index = start + 1; index < lines.length; index += 1) {
    if (lines[index].startsWith("## ")) {
      end = index;
      break;
    }
  }
  return lines.slice(start, end).join("\n");
}

function ledgerField(section, prefix, label, issues) {
  const lines = section.split("\n");
  const matches = [];
  for (let index = 0; index < lines.length; index += 1) {
    if (lines[index].startsWith(prefix)) matches.push(index);
  }
  if (matches.length !== 1) {
    issues.push(
      `ledger: ${label} must occur exactly once, found ${matches.length}`,
    );
    return "";
  }

  const start = matches[0];
  const parts = [lines[start].slice(prefix.length).trim()];
  for (let index = start + 1; index < lines.length; index += 1) {
    if (!lines[index].trim() || lines[index].startsWith("- ")) break;
    parts.push(lines[index].trim());
  }
  return parts.filter(Boolean).join(" ");
}

function ledgerListItems(ledger) {
  const items = [];
  let current = null;
  for (const line of normalizedText(ledger).split("\n")) {
    if (line.startsWith("- ")) {
      if (current) items.push(current);
      current = line.slice(2).trim();
      continue;
    }
    if (line.startsWith("## ")) {
      if (current) items.push(current);
      current = null;
      continue;
    }
    if (current && line.trim()) current += ` ${line.trim()}`;
  }
  if (current) items.push(current);
  return items;
}

function isPostAcceptRepairAuthorization(item) {
  return [
    /founder explicitly responds\s+`接受，继续`\./i,
    /new authority from founder chat dated 2026-08-12/i,
    /reopens exactly one minimal D0 post-accept transition repair\./i,
    /D0 moves to `implementing` only for this repair;/i,
  ].every((pattern) => pattern.test(item));
}

function consumesPostAcceptRepairAuthorization(item) {
  if (/^PM (?:re-)?accepts D0\b/i.test(item)) return true;
  const endsRepairAuthority =
    /post-accept transition repair authorization/i.test(item) &&
    /\b(?:revokes?|revoked|consumes?|consumed|supersedes?|superseded)\b/i.test(
      item,
    );
  const completesDelivery =
    /\bD0 delivery (?:acceptance|is accepted|is completed|is consumed)\b/i.test(
      item,
    ) &&
    /\b(?:accepts?|accepted|completes?|completed|consumes?|consumed|restores?|restored)\b/i.test(
      item,
    );
  return endsRepairAuthority || completesDelivery;
}

function isReadyForQaAuthorization(item) {
  return [
    /\bSol re-review returns `PASS` with P0\/P1\/P2=0\/0\/0\b/i,
    /D0 advances to `ready_for_qa`\./i,
    /Authorize one independent Terra QA pass, provider-free and read-only, on this exact tree\./i,
  ].every((pattern) => pattern.test(item));
}

function withoutQuotedSeverityTuples(outcome) {
  const severityTuple = /\bP0\/P1\/P2\s*=\s*\d+\/\d+\/\d+\b/i;
  const delimiters = new Map([
    ["`", "`"],
    ['"', '"'],
    ["“", "”"],
    ["‘", "’"],
    ["'", "'"],
  ]);
  const singleQuoteOpeners = new Set(["‘", "'"]);
  const isWordCharacter = (character) =>
    character !== undefined && /[\p{L}\p{M}\p{N}_]/u.test(character);
  let sanitized = "";

  for (let index = 0; index < outcome.length; index += 1) {
    const opener = outcome[index];
    const closer = delimiters.get(opener);
    const isSingleQuote = singleQuoteOpeners.has(opener);
    if (!closer || (isSingleQuote && isWordCharacter(outcome[index - 1]))) {
      sanitized += opener;
      continue;
    }

    let closingIndex = outcome.indexOf(closer, index + 1);
    while (
      closingIndex !== -1 &&
      isSingleQuote &&
      isWordCharacter(outcome[closingIndex + 1])
    ) {
      closingIndex = outcome.indexOf(closer, closingIndex + 1);
    }
    if (closingIndex === -1) {
      sanitized += opener;
      continue;
    }

    const span = outcome.slice(index, closingIndex + 1);
    sanitized += severityTuple.test(span) ? "" : span;
    index = closingIndex;
  }

  return sanitized;
}

function isLaterSolOrTerraGateFailure(item) {
  const gateRecord = item.match(
    /^(?:(?:A|The)\s+)?(?:(?:same|later|independent|final|scoped|fresh|round-\d+)\s+)*(?:Sol\s+(?:(?:task|release)\s+)?(?:review|re-review)|Terra\s+(?:QA|recheck))\b(?<outcome>[\s\S]*)$/i,
  );
  if (!gateRecord) return false;

  const outcome = withoutQuotedSeverityTuples(gateRecord.groups?.outcome ?? "");
  if (
    /\b(?:(?:returns?|reports?|records?|finds?|yields?|concludes?)|(?:current\s+)?(?:verdict|result|outcome)\s+(?:is|was))\s+`?FAIL`?(?=\s|[.:;,]|$)/i.test(
      outcome,
    )
  ) {
    return true;
  }

  const countTuples = outcome.matchAll(
    /\bP0\/P1\/P2\s*=\s*(\d+)\/(\d+)\/(\d+)\b/gi,
  );
  return [...countTuples].some((counts) =>
    counts.slice(1).some((count) => Number(count) > 0),
  );
}

function consumesReadyForQaAuthorization(item) {
  const laterReviewFailure = isLaterSolOrTerraGateFailure(item);
  const endsReadyAuthority =
    /\bready_for_qa\b[\s\S]*\b(?:authorization|authority|transition)\b/i.test(
      item,
    ) &&
    /\b(?:revokes?|revoked|consumes?|consumed|supersedes?|superseded)\b/i.test(
      item,
    );
  const laterLifecycleTransition =
    /^(?:PM returns D0|D0 returns) to `implementing`(?:\s|[.:;]|$)/i.test(
      item,
    ) ||
    /^D0 (?:advances|moves) to `(?:implementing|reviewed|accepted)`(?:\s|[.:;]|$)/i.test(
      item,
    ) ||
    /^PM (?:re-)?accepts D0\b/i.test(item);
  return laterReviewFailure || endsReadyAuthority || laterLifecycleTransition;
}

function verifyLiveLedgerState(ledger, issues) {
  const d0 = extractLedgerSection(
    ledger,
    "D0 — Record the product reset and freeze scope",
    issues,
  );
  const task1 = extractLedgerSection(
    ledger,
    "Task 1 — Freeze Product Intent and Application Graph v2",
    issues,
  );
  const ownership = extractLedgerSection(ledger, "Contract ownership", issues);

  const d0StateField = ledgerField(d0, "State:", "D0 State", issues);
  const d0State = d0StateField.match(/^`([^`]+)`\.$/)?.[1];
  const ledgerItems = ledgerListItems(ledger);
  const repairAuthorizations = ledgerItems
    .map((item, index) => ({ index, item }))
    .filter(({ item }) => isPostAcceptRepairAuthorization(item));
  const readyForQaAuthorizations = ledgerItems
    .map((item, index) => ({ index, item }))
    .filter(({ item }) => isReadyForQaAuthorization(item));
  if (d0StateField && !d0State) {
    issues.push(
      "ledger: D0 State must be one backticked value ending in a period",
    );
  } else if (d0State === "implementing") {
    if (repairAuthorizations.length !== 1) {
      issues.push(
        `ledger: implementing D0 State requires exactly one complete post-accept repair authorization record, found ${repairAuthorizations.length}`,
      );
    } else if (
      ledgerItems
        .slice(repairAuthorizations[0].index + 1)
        .some(consumesPostAcceptRepairAuthorization)
    ) {
      issues.push(
        "ledger: post-accept repair authorization is superseded or consumed by a later ledger record",
      );
    }
  } else if (d0State === "ready_for_qa") {
    if (readyForQaAuthorizations.length !== 1) {
      issues.push(
        `ledger: ready_for_qa D0 State requires exactly one complete current Sol PASS and Terra authorization record, found ${readyForQaAuthorizations.length}`,
      );
    } else if (
      ledgerItems
        .slice(readyForQaAuthorizations[0].index + 1)
        .some(consumesReadyForQaAuthorization)
    ) {
      issues.push(
        "ledger: ready_for_qa authorization is superseded or consumed by a later ledger record",
      );
    }
  } else if (
    d0State &&
    d0State !== "reviewed" &&
    d0State !== "accepted" &&
    d0State !== "ready_for_qa" &&
    d0State !== "implementing"
  ) {
    issues.push(
      `ledger: D0 State must be reviewed, accepted, ready_for_qa with current QA authorization, or an authorized post-accept repair, received ${JSON.stringify(d0State)}`,
    );
  }

  const task1StateField = ledgerField(task1, "State:", "Task 1 State", issues);
  const task1State = task1StateField.match(/^`([^`]+)`\.$/)?.[1];
  if (task1StateField && !task1State) {
    issues.push(
      "ledger: Task 1 State must be one backticked value ending in a period",
    );
  } else if (task1State && task1State !== "planned") {
    issues.push(
      `ledger: Task 1 State must be planned, received ${JSON.stringify(task1State)}`,
    );
  }

  const contractOwnerField = ledgerField(
    ownership,
    "- Graph and Draft Preview Snapshot contract owner:",
    "Graph contract owner",
    issues,
  );
  const contractOwner = contractOwnerField.match(/^`([^`]+)`\.$/)?.[1];
  if (contractOwnerField && !contractOwner) {
    issues.push("ledger: Graph contract owner must be one backticked value");
  } else if (contractOwner && contractOwner !== "integration") {
    issues.push(
      `ledger: Graph contract owner must be integration, received ${JSON.stringify(contractOwner)}`,
    );
  }

  const contractStatusField = ledgerField(
    ownership,
    "- Contract status:",
    "Graph contract status",
    issues,
  );
  const contractStatus = contractStatusField.match(/^`([^`]+)`/)?.[1];
  if (contractStatusField && !contractStatus) {
    issues.push(
      "ledger: Graph contract status must begin with a backticked value",
    );
  } else if (contractStatus && contractStatus !== "proposed") {
    issues.push(
      `ledger: Graph contract status must be proposed, received ${JSON.stringify(contractStatus)}`,
    );
  }

  const expectedArtifact =
    "docs/superpowers/specs/2026-08-10-prompt-to-polished-restaurant-product-design.md";
  const contractArtifactField = ledgerField(
    ownership,
    "- Contract artifact:",
    "Graph contract artifact",
    issues,
  );
  const contractArtifact = contractArtifactField.match(/^`([^`]+)`\.$/)?.[1];
  if (contractArtifactField && !contractArtifact) {
    issues.push("ledger: Graph contract artifact must be one backticked path");
  } else if (contractArtifact && contractArtifact !== expectedArtifact) {
    issues.push(
      `ledger: Graph contract artifact must be the product design, received ${JSON.stringify(contractArtifact)}`,
    );
  }

  const blocker = ledgerField(
    task1,
    "Blocked by:",
    "Task 1 Blocked by",
    issues,
  );
  if (!blocker || /^none\.?$/i.test(blocker)) {
    issues.push("ledger: Task 1 Blocked by must not be empty or none");
    return;
  }
  for (const [requirement, pattern] of [
    ["Task 0 accepted", /(?:^|\. )Task 0 is already accepted\.$/],
    ["D0 PM acceptance", /^D0 PM acceptance and /],
    [
      "reviewed D0 commit pushed",
      /^D0 PM acceptance and the reviewed D0 commit pushed with /,
    ],
    [
      "local HEAD equal to remote tip",
      /^D0 PM acceptance and the reviewed D0 commit pushed with local HEAD verified equal to the remote branch tip\./,
    ],
  ]) {
    if (!pattern.test(blocker)) {
      issues.push(
        `ledger: Task 1 Blocked by must require ${requirement}; received ${JSON.stringify(blocker)}`,
      );
    }
  }
}

function ledgerAdrDecision(ledger) {
  const acceptedMarker =
    "- Founder decision for the exact ADR-0009 accept/reject gate is recorded";
  const proposedMarker =
    "- D0 advances to `reviewed`, not `accepted`, for the explicit founder ADR gate.";
  const acceptedIndex = ledger.lastIndexOf(acceptedMarker);
  const proposedIndex = ledger.lastIndexOf(proposedMarker);
  const state = acceptedIndex > proposedIndex ? "Accepted" : "Proposed";
  const start = state === "Accepted" ? acceptedIndex : proposedIndex;
  const task1 = ledger.indexOf("\n## Task 1 —", Math.max(start, 0));
  return {
    state,
    record:
      start >= 0 ? ledger.slice(start, task1 < 0 ? undefined : task1) : "",
  };
}

function verifyAdrDecision(adr, ledger, issues) {
  const relativePath =
    "docs/adr/adr-0009-application-graph-v2-shared-contract.md";
  const frontmatter = parseFrontmatter(adr);
  if (!frontmatter) {
    issues.push(`${relativePath}: missing parseable frontmatter`);
    return;
  }

  const status = frontmatter.status;
  const statusSection = extractMarkdownSection(adr, "Status");
  const decisionGate = extractMarkdownSection(adr, "Founder decision gate");
  const ledgerDecision = ledgerAdrDecision(ledger);
  const acceptedDecisionMarkers =
    decisionGate.match(/Decision: \*\*Accepted\*\*\./g) ?? [];
  const notRecordedDecisionMarkers =
    decisionGate.match(/Decision: \*\*not recorded\*\*\./gi) ?? [];
  const gateAccepted = acceptedDecisionMarkers.length > 0;
  const gateNotRecorded = notRecordedDecisionMarkers.length > 0;
  const gateAcceptanceMetadata =
    /^Date:\s*\*\*[^*\n]+\*\*\.\s*$/m.test(decisionGate) ||
    /^Decision source:\s*\*\*[^*\n]+\*\*\.\s*$/im.test(decisionGate) ||
    /^Founder response:\s*`[^`\n]+`\.\s*$/m.test(decisionGate);

  if (
    acceptedDecisionMarkers.length + notRecordedDecisionMarkers.length !==
    1
  ) {
    issues.push(
      `${relativePath}: founder decision gate must contain exactly one recognized founder decision marker`,
    );
  }

  if (!new Set(["Proposed", "Accepted"]).has(status)) {
    issues.push(
      `${relativePath}: status must be Proposed or Accepted, received ${JSON.stringify(status)}`,
    );
    return;
  }
  if (!new RegExp(`\\*\\*${status}\\b`).test(statusSection)) {
    issues.push(`${relativePath}: frontmatter and visible status disagree`);
  }

  if (status === "Proposed") {
    const acceptanceRecorded =
      gateAccepted ||
      ledgerDecision.state === "Accepted" ||
      Boolean(frontmatter.decision_date) ||
      Boolean(frontmatter.decision_source) ||
      gateAcceptanceMetadata;
    if (acceptanceRecorded) {
      issues.push(
        `${relativePath}: Proposed ADR conflicts with recorded founder acceptance`,
      );
    }
    if (!gateNotRecorded) {
      issues.push(
        `${relativePath}: Proposed ADR must say decision not recorded`,
      );
    }
    return;
  }

  if (
    !gateAccepted ||
    gateNotRecorded ||
    !/Founder response:\s*`接受，继续`/.test(decisionGate)
  ) {
    issues.push(
      `${relativePath}: Accepted ADR must record explicit founder acceptance`,
    );
  }
  if (
    frontmatter.decision_date !== "2026-08-11" ||
    !/Date: \*\*2026-08-11\*\*\./.test(decisionGate)
  ) {
    issues.push(`${relativePath}: Accepted ADR must record decision date`);
  }
  if (
    frontmatter.decision_source?.toLowerCase() !== "founder chat" ||
    !/Decision source: \*\*founder chat\*\*\./i.test(decisionGate)
  ) {
    issues.push(`${relativePath}: Accepted ADR must record decision source`);
  }
  if (ledgerDecision.state !== "Accepted") {
    issues.push(
      `${relativePath}: ADR acceptance cannot be inferred from design or plan; explicit ledger decision evidence is missing`,
    );
  } else {
    requirePatterns(
      "docs/superpowers/ledgers/2026-08-10-prompt-to-polished-restaurant-product.md",
      ledgerDecision.record,
      [
        ["exact founder response", /founder response in chat is `接受，继续`/i],
        ["accepted ADR state", /ADR-0009 is marked\s+`Accepted`/i],
        ["decision date", /decision date 2026-08-11/i],
        ["decision source", /decision source `founder chat`/i],
      ],
      issues,
    );
  }
}

export function extractAuthorityMap(text) {
  const match = text.match(
    /<!-- d0-authority-map:start -->([\s\S]*?)<!-- d0-authority-map:end -->/,
  );
  return match ? normalizedText(match[1]).trim() : null;
}

export function verifyAuthorityMaps(documents) {
  const issues = [];
  const blocks = [];
  for (const [relativePath, text] of documents) {
    const block = extractAuthorityMap(text);
    if (!block) {
      issues.push(`${relativePath}: missing the D0 authority map`);
      continue;
    }
    blocks.push([relativePath, block]);
    for (const authorityPath of AUTHORITY_PATHS) {
      if (!block.includes(authorityPath)) {
        issues.push(`${relativePath}: authority map omits ${authorityPath}`);
      }
    }
    requirePatterns(
      relativePath,
      block,
      [
        ["reset decision authority", /reset[^\n]*founder decisions/i],
        ["design product authority", /design[^\n]*product contract/i],
        ["plan execution authority", /plan[^\n]*execution order/i],
        ["ledger state authority", /ledger[^\n]*live (task )?state/i],
        ["research evidence authority", /research[^\n]*external evidence/i],
        [
          "proposal non-approval rule",
          /proposal[^\n]*not[^\n]*founder approval/i,
        ],
      ],
      issues,
    );
  }

  if (blocks.length > 1) {
    const [firstPath, firstBlock] = blocks[0];
    for (const [relativePath, block] of blocks.slice(1)) {
      if (block !== firstBlock) {
        issues.push(`${relativePath}: authority map differs from ${firstPath}`);
      }
    }
  }
  return issues;
}

function verifySuperpowersTree(root, issues) {
  let output;
  try {
    output = execFileSync(
      "git",
      [
        "ls-files",
        "-s",
        "--",
        ...SUPERPOWERS_DIRECTORIES.map(
          (directory) => `.agents/skills/${directory}/**`,
        ),
      ],
      { cwd: root, encoding: "utf8" },
    );
  } catch (error) {
    issues.push(
      `provenance: unable to inspect committed skill blobs: ${error.message}`,
    );
    return;
  }

  const entries = output
    .trim()
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => {
      const match = line.match(/^\d+ ([0-9a-f]{40}) \d+\t(.+)$/);
      return match ? { blob: match[1], relativePath: match[2] } : null;
    });
  if (entries.some((entry) => !entry)) {
    issues.push("provenance: unable to parse committed skill blob manifest");
    return;
  }
  if (entries.length !== 50) {
    issues.push(
      `provenance: expected 50 copied Superpowers files, found ${entries.length}`,
    );
  }

  const manifest = entries
    .map(({ blob, relativePath }) => `${relativePath}\0${blob}`)
    .sort()
    .join("\n");
  const manifestHash = createHash("sha256")
    .update(manifest)
    .digest("hex")
    .toUpperCase();
  if (manifestHash !== EXPECTED_SUPERPOWERS_MANIFEST_SHA256) {
    issues.push(
      `provenance: Superpowers committed blob manifest is ${manifestHash}, expected ${EXPECTED_SUPERPOWERS_MANIFEST_SHA256}`,
    );
  }

  for (const { blob, relativePath } of entries) {
    const text = read(root, relativePath, issues);
    if (text && gitBlobSha1(text) !== blob) {
      issues.push(
        `${relativePath}: working tree differs from the committed upstream blob by more than CRLF`,
      );
    }
  }
}

export function verifyD0Governance(root) {
  const issues = [];
  const agents = read(root, "AGENTS.md", issues);
  requirePatterns(
    "AGENTS.md",
    agents,
    [
      [
        "runtime/framework/version dispatch trigger",
        /runtime[^\n]*framework[^\n]*package[^\n]*supported version/i,
      ],
      [
        "data/topology dispatch trigger",
        /database[^\n]*ORM[^\n]*queue[^\n]*provider[^\n]*Compose topology/i,
      ],
      [
        "stable-contract dispatch trigger",
        /Graph[^\n]*API[^\n]*schema[^\n]*identifier[^\n]*serialization[^\n]*compatibility/i,
      ],
      [
        "security-boundary dispatch trigger",
        /security[^\n]*credential[^\n]*tenant[^\n]*data boundar/i,
      ],
      [
        "compiler/operations dispatch trigger",
        /compiler target[^\n]*generated template[^\n]*deployment[^\n]*operability/i,
      ],
      [
        "profile-transition dispatch trigger",
        /current-to-proposed Golden profile transition/i,
      ],
      ["governance authority", /docs\/tech-governance\.md/],
      ["threat authority", /docs\/threat-model\.md/],
    ],
    issues,
  );

  const governance = read(root, "docs/tech-governance.md", issues);
  requirePatterns(
    "docs/tech-governance.md",
    governance,
    [
      ["current accepted Golden profile", /current accepted Golden profile/i],
      ["proposed profile separation", /proposed profile/i],
      [
        "four recommendations",
        /keep[^\n]*experiment[^\n]*migrate[^\n]*reject/i,
      ],
      ["explicit founder acceptance", /explicit founder (acceptance|accepts)/i],
      ["manifest authority", /tracked manifests[\s\S]{0,120}Dockerfiles/i],
      ["TypeScript runtime", /TypeScript/],
      ["manifest ranges", /supported semver ranges[^\n]*manifests/i],
      ["lockfile resolutions", /exact resolved versions[\s\S]{0,80}lockfile/i],
      ["accepted ADR-0009 decision", /ADR-0009 is founder-accepted/i],
      [
        "currently implemented V1 contract",
        /factory\.application-graph\/v1[^\n]*currently implemented/i,
      ],
      [
        "ledger-governed V2 implementation",
        /PM ledger[\s\S]{0,160}V2 implementation\s+authorization/i,
      ],
      [
        "Draft/Publish lifecycle",
        /Draft[\s\S]{0,80}Published[\s\S]{0,80}Compilation/,
      ],
    ],
    issues,
  );
  if (
    /ADR-0009[^\n]{0,120}(?:proposal|proposed)[^\n]{0,120}(?:await|require)[^\n]{0,80}founder acceptance/i.test(
      governance,
    ) ||
    /factory\.application-graph\/v2[^.]{0,180}\b(?:proposal|proposed)\b/i.test(
      governance,
    )
  ) {
    issues.push(
      "docs/tech-governance.md: must record ADR-0009 as founder-accepted without awaiting the consumed decision gate",
    );
  }
  if (
    /\bD0\b[^\n]{0,120}\b(?:remains|is)\s+`?(?:implementing|reviewed|accepted|planned|ready_for_qa)`?/i.test(
      governance,
    ) ||
    /Task 1 cannot begin/i.test(governance)
  ) {
    issues.push(
      "docs/tech-governance.md: must not contain live D0 or Task 1 state",
    );
  }
  verifyGoldenProfile(root, governance, issues);

  const threatModel = read(root, "docs/threat-model.md", issues);
  requirePatterns(
    "docs/threat-model.md",
    threatModel,
    [
      ["current authority", /current authority/i],
      ["assets", /^## Assets/m],
      ["trust boundaries", /^## Trust boundaries/m],
      ["attacker capabilities", /^## Attacker capabilities/m],
      ["abuse cases", /^## Abuse cases/m],
      ["required controls", /^## Required controls/m],
      ["residual-risk ownership", /^## Residual-risk ownership/m],
      ["raw model-material exclusion", /raw prompts[^\n]*responses/i],
      ["tenant boundary", /tenant/i],
      ["Draft/Published boundary", /Draft[^\n]*Published/],
    ],
    issues,
  );

  const adr = read(
    root,
    "docs/adr/adr-0009-application-graph-v2-shared-contract.md",
    issues,
  );
  if (
    /ADR-0009 is founder-accepted/i.test(governance) &&
    parseFrontmatter(adr)?.status === "Proposed"
  ) {
    issues.push(
      "docs/tech-governance.md: founder-accepted governance conflicts with Proposed ADR-0009",
    );
  }
  requirePatterns(
    "docs/adr/adr-0009-application-graph-v2-shared-contract.md",
    adr,
    [
      ["decision status", /status:\s*["']?(Proposed|Accepted)/i],
      ["keep recommendation", /Recommendation[\s\S]{0,80}\*\*Keep\*\*/i],
      ["current V1", /factory\.application-graph\/v1/],
      ["proposed V2", /factory\.application-graph\/v2/],
      ["Published V1 immutability", /Published V1[^\n]*immutable/i],
      ["adapter compatibility", /adapter/i],
      ["migration", /migration/i],
      ["rollback", /rollback/i],
      ["threats", /threat/i],
      ["measurable verification", /measurable verification/i],
      [
        "founder decision stop",
        /stop[\s\S]{0,160}founder[\s\S]{0,80}(accept|reject)/i,
      ],
    ],
    issues,
  );
  const decisionLedger = read(
    root,
    "docs/superpowers/ledgers/2026-08-10-prompt-to-polished-restaurant-product.md",
    issues,
  );
  verifyLiveLedgerState(decisionLedger, issues);
  verifyAdrDecision(adr, decisionLedger, issues);

  for (const role of ["pm", "tech_lead"]) {
    const relativePath = `.codex/agents/${role}.toml`;
    const text = read(root, relativePath, issues);
    requirePatterns(
      relativePath,
      text,
      [
        ["technology governance", /docs\/tech-governance\.md/],
        ["threat model", /docs\/threat-model\.md/],
        ["founder decision", /founder[^\n]*(accept|reject)/i],
      ],
      issues,
    );
  }

  const authorityDocuments = AUTHORITY_DOCUMENTS.map((relativePath) => [
    relativePath,
    read(root, relativePath, issues),
  ]);
  issues.push(...verifyAuthorityMaps(authorityDocuments));

  const notices = read(root, "THIRD_PARTY_NOTICES.md", issues);
  requirePatterns(
    "THIRD_PARTY_NOTICES.md",
    notices,
    [
      ["Jesse Vincent copyright", /Copyright \(c\) 2025 Jesse Vincent/],
      ["GitHub copyright", /Copyright \(c\) GitHub, Inc\./],
      ["MIT permission grant", /Permission is hereby granted, free of charge/],
      ["MIT warranty disclaimer", /THE SOFTWARE IS PROVIDED "AS IS"/],
      [
        "Superpowers license hash",
        /A37E0E9697144819E1D965176AC4AE5BC3FA02D11E7812036BBCADF6DAFE2400/,
      ],
      [
        "Awesome Copilot license hash",
        /E32449D23085399ADC1222F7A17408B730550258E51627C153CB108CA9955823/,
      ],
    ],
    issues,
  );

  const provenance = read(
    root,
    ".agents/skills/UPSTREAM_PROVENANCE.md",
    issues,
  );
  requirePatterns(
    ".agents/skills/UPSTREAM_PROVENANCE.md",
    provenance,
    [
      ["Superpowers repository", /https:\/\/github\.com\/obra\/superpowers/],
      ["Superpowers tag", /v6\.2\.0/],
      ["Superpowers peeled commit", /3dcbd5c4b48e02263fbf4a3c01e3fe4f81d584d9/],
      ["Superpowers 50/50 blob proof", /50\/50/],
      [
        "Superpowers manifest hash",
        new RegExp(EXPECTED_SUPERPOWERS_MANIFEST_SHA256),
      ],
      ["CRLF-only divergence", /CRLF[- ]only/i],
      [
        "Awesome Copilot repository",
        /https:\/\/github\.com\/github\/awesome-copilot/,
      ],
      ["Awesome Copilot commit", /aa280f28b1b73f9b6e6917b607eb92127b67b419/],
      [
        "Awesome Copilot source path",
        /skills\/create-architectural-decision-record\/SKILL\.md/,
      ],
      ["Awesome Copilot Git blob", /be10104faded844c01d0f5b1f82e8c9fca15ba20/],
      [
        "Awesome Copilot normalized hash",
        new RegExp(EXPECTED_ADR_SKILL_SHA256),
      ],
      ["no tag claim", /no tag/i],
    ],
    issues,
  );

  const adrSkill = read(
    root,
    ".agents/skills/create-architectural-decision-record/SKILL.md",
    issues,
  );
  if (adrSkill && normalizedSha256(adrSkill) !== EXPECTED_ADR_SKILL_SHA256) {
    issues.push(
      `.agents/skills/create-architectural-decision-record/SKILL.md: normalized SHA-256 is ${normalizedSha256(adrSkill)}, expected ${EXPECTED_ADR_SKILL_SHA256}`,
    );
  }
  verifySuperpowersTree(root, issues);

  const workstream = read(
    root,
    "docs/agent-workstreams/2026-08-10-archeform-codex-iteration.md",
    issues,
  );
  const recovery = extractMarkdownSection(
    workstream,
    "Ledger-state-driven recovery",
  );
  requirePatterns(
    "docs/agent-workstreams/2026-08-10-archeform-codex-iteration.md",
    recovery,
    [
      ["ledger-state recovery", /ledger-state-driven recovery/i],
      [
        "in-flight handoff first",
        /Reconcile[^\n]*in-flight[^\n]*(accepted|review)[^\n]*(commit|push)[^\n]*handoff[^\n]*first/i,
      ],
      [
        "earliest dependency-safe task",
        /earliest dependency-safe[^\n]*unblocked[^\n]*non-accepted task/i,
      ],
      ["skip accepted tasks", /skip every accepted task/i],
      [
        "no live-gate replay",
        /never replay[^\n]*(provider|model|service|Docker|Compose)/i,
      ],
      [
        "consumed-gate authorization",
        /consumed live gate[^\n]*closed[^\n]*founder authorization/i,
      ],
      ["actual ledger state", /actual (?:PM-)?ledger state/i],
      ["no embedded task snapshot", /no current task snapshot/i],
    ],
    issues,
  );
  if (/^(?:Current|At this) checkpoint:/im.test(workstream)) {
    issues.push(
      "docs/agent-workstreams/2026-08-10-archeform-codex-iteration.md: must not embed a current checkpoint",
    );
  }
  if (
    /stop[\s\S]{0,160}founder[\s\S]{0,120}(?:accept|reject)[\s\S]{0,160}(?:ADR-0009|Graph V2 ADR)/i.test(
      workstream,
    )
  ) {
    issues.push(
      "docs/agent-workstreams/2026-08-10-archeform-codex-iteration.md: must not replay the consumed ADR-0009 founder gate",
    );
  }

  return issues;
}

function runCli() {
  const root = process.cwd();
  const issues = verifyD0Governance(root);
  if (issues.length > 0) {
    console.error(`D0 governance verification failed (${issues.length}):`);
    for (const issue of issues) console.error(`- ${issue}`);
    process.exitCode = 1;
    return;
  }
  console.log("D0 governance verification passed.");
}

if (path.resolve(process.argv[1] ?? "") === fileURLToPath(import.meta.url)) {
  runCli();
}
