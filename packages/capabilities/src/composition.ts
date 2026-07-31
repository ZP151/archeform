import {
  capabilityAssets,
  type CapabilityAssetLockV1,
  type CapabilityAssetManifestV1,
  type CapabilityAssetV1,
  type CapabilityBindingFieldTypeV1,
  type CapabilityBindingInputTypeV1,
  type CapabilityBindingInputV1,
  type CapabilityParameterSchemaV1,
} from "./assets/index.js";

export interface GraphSymbolBindingV1 {
  readonly graphSymbol: string;
}

export interface GraphFieldBindingV1 extends GraphSymbolBindingV1 {
  readonly fieldKey: string;
}

export type CapabilityBindingValueV1 =
  number | boolean | GraphSymbolBindingV1 | GraphFieldBindingV1;

export interface CapabilitySelectionV1 {
  readonly lock: CapabilityAssetLockV1;
  readonly bindings: Readonly<Record<string, CapabilityBindingValueV1>>;
}

export interface CapabilityCompositionV1 {
  readonly packages: readonly CapabilitySelectionV1[];
  readonly resolvedContributionDigests: readonly string[];
  readonly providedAndRequiredInterfaces: readonly string[];
  readonly targetRuntimeInterfaceVersions: readonly string[];
  readonly resolvedDependencyOrder: readonly string[];
}

export interface CapabilityCompositionLockV1 {
  readonly apiVersion: "factory.composition/v1";
  readonly applicationGraphChecksum: string;
  readonly packages: readonly CapabilitySelectionV1[];
  readonly resolvedContributionDigests: readonly string[];
  readonly providedAndRequiredInterfaces: readonly string[];
  readonly targetRuntimeInterfaceVersions: readonly string[];
  readonly resolvedDependencyOrder: readonly string[];
  readonly lockDigest: string;
}

export interface ResolveCapabilityCompositionInput {
  readonly selections: readonly CapabilitySelectionV1[];
}

export interface CreateCapabilityCompositionLockInput extends ResolveCapabilityCompositionInput {
  readonly graphChecksum: string;
}

const sha256Pattern = /^sha256:[a-f0-9]{64}$/;
const graphSymbolPattern =
  /^graph\.(?:page|domain|policy|flow|integration|experience)\.[a-z][a-z0-9-]*$/;
const domainEntitySymbolPattern = /^graph\.domain\.[a-z][a-z0-9-]*$/;
const fieldKeyPattern = /^[a-z][a-zA-Z0-9_]*$/;
const parameterKeyPattern = /^[a-z][a-zA-Z0-9]*$/;
const prototypeReservedParameterKeys = new Set([
  "constructor",
  "hasOwnProperty",
  "isPrototypeOf",
  "propertyIsEnumerable",
  "prototype",
  "toLocaleString",
  "toString",
  "valueOf",
]);
const supportedParameterTypes = new Set(["number", "boolean", "graph-symbol"]);
const supportedBindingInputTypes = new Set<CapabilityBindingInputTypeV1>([
  "domain.entity",
  "domain.field",
  "page.page",
  "page.navigation",
  "policy.role",
  "flow.flow",
  "integration.provider",
  "experience.token",
]);
const supportedBindingFieldTypes = new Set<CapabilityBindingFieldTypeV1>([
  "string",
  "text",
  "integer",
  "decimal",
  "boolean",
  "date",
  "datetime",
  "enum",
  "json",
  "url",
  "email",
]);
const fieldConstraintKeys = [
  "ownerBinding",
  "fieldTypes",
  "fieldRequired",
  "fieldUnique",
] as const;
const nonFieldBindingInputKeys = new Set(["key", "type", "required"]);
const domainFieldBindingInputKeys = new Set([
  ...nonFieldBindingInputKeys,
  ...fieldConstraintKeys,
]);
const graphSymbolBindingValueKeys = new Set(["graphSymbol"]);
const domainFieldBindingValueKeys = new Set(["graphSymbol", "fieldKey"]);
const strictParameterKeys = new Set(["key", "type", "required"]);

declare const resolutionInputSnapshotBrand: unique symbol;
declare const manifestSnapshotBrand: unique symbol;
declare const selectionSnapshotBrand: unique symbol;

type ResolutionInputSnapshotV1<
  T extends ResolveCapabilityCompositionInput =
    ResolveCapabilityCompositionInput,
> = T & {
  readonly selections: readonly SelectionSnapshotV1[];
  readonly [resolutionInputSnapshotBrand]: never;
};

type ManifestSnapshotV1 = CapabilityAssetManifestV1 & {
  readonly [manifestSnapshotBrand]: never;
};

type SelectionSnapshotV1 = CapabilitySelectionV1 & {
  readonly [selectionSnapshotBrand]: never;
};

interface ResolutionCaptureContextV1 {
  readonly captured: WeakMap<object, CapturedDataValueV1>;
  readonly active: WeakSet<object>;
}

type CaptureKindV1 = "data-record" | "data-array" | "asset" | "asset-array";

interface CapturedDataValueV1 {
  readonly kind: CaptureKindV1;
  readonly value: unknown;
}

interface CapturedResolutionInputV1<
  T extends ResolveCapabilityCompositionInput,
> {
  readonly input: ResolutionInputSnapshotV1<T>;
  readonly assets: readonly CapabilityAssetV1[];
}

const resolutionInputCaptureErrorCode =
  "FACTORY_COMPOSITION_INPUT_CAPTURE_INVALID";

class ResolutionInputCaptureError extends Error {
  readonly code = resolutionInputCaptureErrorCode;
  readonly path: string;

  constructor(path: string) {
    super(`${resolutionInputCaptureErrorCode} at ${path}.`);
    this.name = "ResolutionInputCaptureError";
    this.path = path;
  }
}

function rejectResolutionInput(path: string): never {
  throw new ResolutionInputCaptureError(path);
}

function captureDataValue(
  value: unknown,
  path: string,
  context: ResolutionCaptureContextV1,
): unknown {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "boolean" ||
    typeof value === "number"
  ) {
    return value;
  }
  if (Array.isArray(value)) {
    return captureDataArray(value, path, context);
  }
  if (typeof value === "object") {
    return captureDataRecord(value, path, context);
  }
  return rejectResolutionInput(path);
}

function captureDataRecord(
  value: unknown,
  path: string,
  context: ResolutionCaptureContextV1,
): Readonly<Record<string, unknown>> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return rejectResolutionInput(path);
  }
  if (context.active.has(value)) return rejectResolutionInput(path);
  const existing = context.captured.get(value);
  if (existing !== undefined) {
    if (existing.kind !== "data-record") return rejectResolutionInput(path);
    return existing.value as Readonly<Record<string, unknown>>;
  }

  const descriptors = Object.getOwnPropertyDescriptors(value);
  const prototype = Object.getPrototypeOf(value);
  const keys = Reflect.ownKeys(descriptors);
  if (
    (prototype !== Object.prototype && prototype !== null) ||
    !keys.every((key) => typeof key === "string")
  ) {
    return rejectResolutionInput(path);
  }

  const captured = Object.create(null) as Record<string, unknown>;
  context.captured.set(value, { kind: "data-record", value: captured });
  context.active.add(value);
  try {
    for (const key of keys) {
      if (typeof key !== "string") return rejectResolutionInput(path);
      const descriptor = descriptors[key];
      if (
        !descriptor ||
        !("value" in descriptor) ||
        descriptor.enumerable !== true
      ) {
        return rejectResolutionInput(path);
      }
      captured[key] = captureDataValue(descriptor.value, `${path}.*`, context);
    }
    return Object.freeze(captured);
  } finally {
    context.active.delete(value);
  }
}

function captureDataArray(
  value: unknown,
  path: string,
  context: ResolutionCaptureContextV1,
): readonly unknown[] {
  return captureDataArrayEntries(
    value,
    path,
    context,
    "data-array",
    (entry, entryPath) => captureDataValue(entry, entryPath, context),
  );
}

function captureDataArrayEntries(
  value: unknown,
  path: string,
  context: ResolutionCaptureContextV1,
  kind: "data-array" | "asset-array",
  captureEntry: (entry: unknown, path: string) => unknown,
): readonly unknown[] {
  if (!Array.isArray(value)) return rejectResolutionInput(path);
  if (context.active.has(value)) return rejectResolutionInput(path);
  const existing = context.captured.get(value);
  if (existing !== undefined) {
    if (existing.kind !== kind) return rejectResolutionInput(path);
    return existing.value as readonly unknown[];
  }

  const descriptors = Object.getOwnPropertyDescriptors(
    value,
  ) as unknown as Record<PropertyKey, PropertyDescriptor>;
  const prototype = Object.getPrototypeOf(value);
  const keys = Reflect.ownKeys(descriptors);
  const lengthDescriptor = descriptors["length"];
  if (
    prototype !== Array.prototype ||
    !keys.every((key) => typeof key === "string") ||
    !lengthDescriptor ||
    !("value" in lengthDescriptor) ||
    lengthDescriptor.enumerable !== false ||
    typeof lengthDescriptor.value !== "number" ||
    !Number.isInteger(lengthDescriptor.value) ||
    lengthDescriptor.value < 0 ||
    keys.length !== lengthDescriptor.value + 1
  ) {
    return rejectResolutionInput(path);
  }

  const captured: unknown[] = [];
  context.captured.set(value, { kind, value: captured });
  context.active.add(value);
  try {
    for (let index = 0; index < lengthDescriptor.value; index += 1) {
      const descriptor = descriptors[String(index)];
      if (
        !descriptor ||
        !("value" in descriptor) ||
        descriptor.enumerable !== true
      ) {
        return rejectResolutionInput(path);
      }
      captured.push(captureEntry(descriptor.value, `${path}[]`));
    }
    return Object.freeze(captured);
  } finally {
    context.active.delete(value);
  }
}

function captureCapabilityAssetV1(
  value: unknown,
  path: string,
  context: ResolutionCaptureContextV1,
): CapabilityAssetV1 {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return rejectResolutionInput(path);
  }
  if (context.active.has(value)) return rejectResolutionInput(path);
  const existing = context.captured.get(value);
  if (existing !== undefined) {
    if (existing.kind !== "asset") return rejectResolutionInput(path);
    return existing.value as CapabilityAssetV1;
  }

  const descriptors = Object.getOwnPropertyDescriptors(value);
  const prototype = Object.getPrototypeOf(value);
  const keys = Reflect.ownKeys(descriptors);
  if (
    (prototype !== Object.prototype && prototype !== null) ||
    !keys.every((key) => typeof key === "string") ||
    !keys.every((key) => key === "manifest" || key === "disable")
  ) {
    return rejectResolutionInput(path);
  }
  for (const key of keys) {
    if (typeof key !== "string") return rejectResolutionInput(path);
    const descriptor = descriptors[key];
    if (
      !descriptor ||
      !("value" in descriptor) ||
      descriptor.enumerable !== true
    ) {
      return rejectResolutionInput(path);
    }
  }
  const manifestDescriptor = descriptors.manifest;
  if (!manifestDescriptor || !("value" in manifestDescriptor)) {
    return rejectResolutionInput(path);
  }
  const disableDescriptor = descriptors.disable;
  if (
    disableDescriptor &&
    (!("value" in disableDescriptor) ||
      typeof disableDescriptor.value !== "function")
  ) {
    return rejectResolutionInput(path);
  }

  const captured = Object.create(null) as {
    manifest: CapabilityAssetManifestV1;
  };
  context.captured.set(value, { kind: "asset", value: captured });
  context.active.add(value);
  try {
    captured.manifest = captureDataRecord(
      manifestDescriptor.value,
      `${path}.manifest`,
      context,
    ) as unknown as ManifestSnapshotV1;
    return Object.freeze(captured);
  } finally {
    context.active.delete(value);
  }
}

function captureManifestSnapshotV1(
  manifest: CapabilityAssetManifestV1,
): ManifestSnapshotV1 {
  const context: ResolutionCaptureContextV1 = {
    captured: new WeakMap(),
    active: new WeakSet(),
  };
  return captureDataRecord(
    manifest,
    "manifest",
    context,
  ) as unknown as ManifestSnapshotV1;
}

function captureResolutionInputV1<T extends ResolveCapabilityCompositionInput>(
  input: T,
  assets: readonly CapabilityAssetV1[],
): CapturedResolutionInputV1<T> {
  const context: ResolutionCaptureContextV1 = {
    captured: new WeakMap(),
    active: new WeakSet(),
  };
  const capturedInput = captureDataRecord(
    input,
    "input",
    context,
  ) as unknown as ResolutionInputSnapshotV1<T>;
  const capturedAssets = captureDataArrayEntries(
    assets,
    "assets",
    context,
    "asset-array",
    (asset, path) => captureCapabilityAssetV1(asset, path, context),
  ) as readonly CapabilityAssetV1[];
  return Object.freeze({ input: capturedInput, assets: capturedAssets });
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function snapshotOwnDataRecord(
  value: unknown,
): Record<string, unknown> | undefined {
  if (!isPlainRecord(value)) return undefined;
  const keys = Reflect.ownKeys(value);
  if (!keys.every((key) => typeof key === "string")) return undefined;
  const descriptors = Object.getOwnPropertyDescriptors(value);
  const snapshot = Object.create(null) as Record<string, unknown>;
  for (const key of keys) {
    if (typeof key !== "string") return undefined;
    const descriptor = descriptors[key];
    if (
      !descriptor ||
      !("value" in descriptor) ||
      descriptor.enumerable !== true
    ) {
      return undefined;
    }
    snapshot[key] = descriptor.value;
  }
  return snapshot;
}

function snapshotExactDataRecord(
  value: unknown,
  allowedKeys: ReadonlySet<string>,
  requiredKeys: readonly string[],
): Record<string, unknown> | undefined {
  const snapshot = snapshotOwnDataRecord(value);
  if (
    !snapshot ||
    !Object.keys(snapshot).every((key) => allowedKeys.has(key)) ||
    !requiredKeys.every((key) => Object.hasOwn(snapshot, key))
  ) {
    return undefined;
  }
  return snapshot;
}

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function canonicalJson(value: unknown): string {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "boolean"
  ) {
    return JSON.stringify(value);
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new Error("Canonical composition values must be finite numbers.");
    }
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((entry) => canonicalJson(entry)).join(",")}]`;
  }
  if (typeof value === "object") {
    return `{${Object.entries(value)
      .filter(([, entry]) => entry !== undefined)
      .sort(([left], [right]) => compareText(left, right))
      .map(([key, entry]) => `${JSON.stringify(key)}:${canonicalJson(entry)}`)
      .join(",")}}`;
  }
  throw new Error("Composition values must be canonical JSON values.");
}

const sha256Constants = Object.freeze([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1,
  0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3,
  0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786,
  0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147,
  0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13,
  0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b,
  0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a,
  0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208,
  0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
]);

function rotateRight(value: number, bits: number): number {
  return (value >>> bits) | (value << (32 - bits));
}

function sha256(content: string): string {
  const input = new TextEncoder().encode(content);
  const paddedLength = Math.ceil((input.length + 9) / 64) * 64;
  const padded = new Uint8Array(paddedLength);
  padded.set(input);
  padded[input.length] = 0x80;

  const bitLength = input.length * 8;
  const view = new DataView(padded.buffer);
  view.setUint32(paddedLength - 8, Math.floor(bitLength / 0x1_0000_0000));
  view.setUint32(paddedLength - 4, bitLength >>> 0);

  const hash = [
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c,
    0x1f83d9ab, 0x5be0cd19,
  ];
  const schedule = new Uint32Array(64);

  for (let offset = 0; offset < padded.length; offset += 64) {
    for (let index = 0; index < 16; index += 1) {
      schedule[index] = view.getUint32(offset + index * 4);
    }
    for (let index = 16; index < 64; index += 1) {
      const left = schedule[index - 15] ?? 0;
      const right = schedule[index - 2] ?? 0;
      const sigma0 =
        rotateRight(left, 7) ^ rotateRight(left, 18) ^ (left >>> 3);
      const sigma1 =
        rotateRight(right, 17) ^ rotateRight(right, 19) ^ (right >>> 10);
      schedule[index] =
        ((schedule[index - 16] ?? 0) +
          sigma0 +
          (schedule[index - 7] ?? 0) +
          sigma1) >>>
        0;
    }

    let [a, b, c, d, e, f, g, h] = hash as [
      number,
      number,
      number,
      number,
      number,
      number,
      number,
      number,
    ];
    for (let index = 0; index < 64; index += 1) {
      const sum1 = rotateRight(e, 6) ^ rotateRight(e, 11) ^ rotateRight(e, 25);
      const choice = (e & f) ^ (~e & g);
      const temporary1 =
        (h +
          sum1 +
          choice +
          (sha256Constants[index] ?? 0) +
          (schedule[index] ?? 0)) >>>
        0;
      const sum0 = rotateRight(a, 2) ^ rotateRight(a, 13) ^ rotateRight(a, 22);
      const majority = (a & b) ^ (a & c) ^ (b & c);
      const temporary2 = (sum0 + majority) >>> 0;

      h = g;
      g = f;
      f = e;
      e = (d + temporary1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (temporary1 + temporary2) >>> 0;
    }

    hash[0] = ((hash[0] ?? 0) + a) >>> 0;
    hash[1] = ((hash[1] ?? 0) + b) >>> 0;
    hash[2] = ((hash[2] ?? 0) + c) >>> 0;
    hash[3] = ((hash[3] ?? 0) + d) >>> 0;
    hash[4] = ((hash[4] ?? 0) + e) >>> 0;
    hash[5] = ((hash[5] ?? 0) + f) >>> 0;
    hash[6] = ((hash[6] ?? 0) + g) >>> 0;
    hash[7] = ((hash[7] ?? 0) + h) >>> 0;
  }

  return `sha256:${hash
    .map((value) => value.toString(16).padStart(8, "0"))
    .join("")}`;
}

function deepFreeze<T>(value: T): T {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    for (const entry of Object.values(value)) deepFreeze(entry);
    Object.freeze(value);
  }
  return value;
}

function normalizeBindingValue(
  packageKey: string,
  schema: CapabilityParameterSchemaV1,
  value: CapabilityBindingValueV1,
  bindingSchema?: CapabilityBindingInputV1,
): CapabilityBindingValueV1 {
  const label = `Capability package '${packageKey}' parameter '${schema.key}'`;
  if (schema.type === "number") {
    if (typeof value !== "number" || !Number.isFinite(value)) {
      throw new Error(`${label} must be a finite number.`);
    }
    return value;
  }
  if (schema.type === "boolean") {
    if (typeof value !== "boolean") {
      throw new Error(`${label} must be a boolean.`);
    }
    return value;
  }
  if (bindingSchema?.type === "domain.field") {
    const snapshot = snapshotExactDataRecord(
      value,
      domainFieldBindingValueKeys,
      ["graphSymbol", "fieldKey"],
    );
    if (
      !snapshot ||
      typeof snapshot.graphSymbol !== "string" ||
      !domainEntitySymbolPattern.test(snapshot.graphSymbol) ||
      typeof snapshot.fieldKey !== "string" ||
      !fieldKeyPattern.test(snapshot.fieldKey)
    ) {
      throw new Error(
        `${label} must include an owning domain graphSymbol and fieldKey.`,
      );
    }
    return {
      graphSymbol: snapshot.graphSymbol,
      fieldKey: snapshot.fieldKey,
    };
  }
  const snapshot = snapshotExactDataRecord(value, graphSymbolBindingValueKeys, [
    "graphSymbol",
  ]);
  if (
    !snapshot ||
    typeof snapshot.graphSymbol !== "string" ||
    !graphSymbolPattern.test(snapshot.graphSymbol)
  ) {
    if (
      bindingSchema &&
      isPlainRecord(value) &&
      Object.hasOwn(value, "fieldKey")
    ) {
      throw new Error(
        `${label} cannot include fieldKey for a '${bindingSchema.type}' input.`,
      );
    }
    throw new Error(
      `${label} must be a Graph symbol in graph.<model>.<id> form.`,
    );
  }
  return { graphSymbol: snapshot.graphSymbol };
}

function canonicalSelection(
  manifest: CapabilityAssetManifestV1,
  bindings: Readonly<Record<string, CapabilityBindingValueV1>>,
): CapabilitySelectionV1 {
  const canonicalBindings = Object.create(null) as Record<
    string,
    CapabilityBindingValueV1
  >;
  for (const key of Object.keys(bindings).sort()) {
    const value = bindings[key];
    if (value !== undefined) canonicalBindings[key] = value;
  }
  return {
    lock: {
      key: manifest.key,
      version: manifest.version,
      packageRoot: manifest.packageRoot,
      manifestDigest: manifest.manifestDigest,
      lifecycle: manifest.lifecycle,
    },
    bindings: canonicalBindings,
  };
}

function matchingManifest(
  lock: CapabilityAssetLockV1,
  assets: readonly CapabilityAssetV1[],
): CapabilityAssetManifestV1 {
  const matched = assets.find(
    ({ manifest }) =>
      manifest.key === lock.key &&
      manifest.version === lock.version &&
      manifest.packageRoot === lock.packageRoot &&
      manifest.manifestDigest === lock.manifestDigest &&
      manifest.lifecycle === lock.lifecycle,
  );
  if (!matched) {
    throw new Error(
      `Capability asset lock '${lock.key}' does not match a registered Golden asset.`,
    );
  }
  return matched.manifest;
}

function strictParameterSchemas(
  manifest: CapabilityAssetManifestV1,
): ReadonlyMap<string, CapabilityParameterSchemaV1> {
  const parameters = manifest.parameters ?? [];
  if (!Array.isArray(parameters)) {
    throw new Error(
      `Capability package '${manifest.key}' strict parameters must be an array.`,
    );
  }
  const schemas = new Map<string, CapabilityParameterSchemaV1>();
  for (const untrustedParameter of parameters) {
    const snapshot = snapshotExactDataRecord(
      untrustedParameter,
      strictParameterKeys,
      ["key", "type", "required"],
    );
    if (
      !snapshot ||
      typeof snapshot.key !== "string" ||
      !parameterKeyPattern.test(snapshot.key) ||
      prototypeReservedParameterKeys.has(snapshot.key)
    ) {
      throw new Error(
        `Capability package '${manifest.key}' parameter must use a safe parameter key and be a plain strict data record.`,
      );
    }
    if (typeof snapshot.required !== "boolean") {
      throw new Error(
        `Capability package '${manifest.key}' parameter '${snapshot.key}' required must be a boolean.`,
      );
    }
    if (
      typeof snapshot.type !== "string" ||
      !supportedParameterTypes.has(snapshot.type)
    ) {
      throw new Error(
        `Capability package '${manifest.key}' does not support parameter type '${String(snapshot.type)}'.`,
      );
    }
    if (schemas.has(snapshot.key)) {
      throw new Error(
        `Capability package '${manifest.key}' declares duplicate parameter '${snapshot.key}'.`,
      );
    }
    schemas.set(snapshot.key, {
      key: snapshot.key,
      type: snapshot.type as CapabilityParameterSchemaV1["type"],
      required: snapshot.required,
    });
  }
  return schemas;
}

function validateCapabilityBindingSchemaSnapshot(
  manifest: CapabilityAssetManifestV1,
): ReadonlyMap<string, CapabilityBindingInputV1> {
  if (manifest.bindingContract === undefined) {
    return new Map();
  }
  if (manifest.bindingContract !== "factory.capability-binding/v1") {
    throw new Error(
      `Capability package '${manifest.key}' declares an unsupported binding contract '${String(manifest.bindingContract)}'.`,
    );
  }

  const bindingSchemas = new Map<string, CapabilityBindingInputV1>();
  for (const untrustedSchema of manifest.inputSchema) {
    const snapshot = snapshotOwnDataRecord(untrustedSchema);
    if (!snapshot) {
      throw new Error(
        `Capability package '${manifest.key}' input schema must be a plain data record.`,
      );
    }
    // This boundary is intentionally after snapshotOwnDataRecord: all following
    // checks operate on a plain, own-data snapshot rather than caller-owned data.
    const schema = snapshot as unknown as CapabilityBindingInputV1;
    if (!Object.hasOwn(schema, "key") || !Object.hasOwn(schema, "type")) {
      throw new Error(
        `Capability package '${manifest.key}' input schema must declare own key and type values.`,
      );
    }
    if (
      !parameterKeyPattern.test(schema.key) ||
      prototypeReservedParameterKeys.has(schema.key)
    ) {
      throw new Error(
        `Capability package '${manifest.key}' input schema '${schema.key}' must use a safe parameter key.`,
      );
    }
    if (bindingSchemas.has(schema.key)) {
      throw new Error(
        `Capability package '${manifest.key}' declares duplicate input schema '${schema.key}'.`,
      );
    }
    if (!supportedBindingInputTypes.has(schema.type)) {
      throw new Error(
        `Capability package '${manifest.key}' does not support binding input type '${String(schema.type)}'.`,
      );
    }
    if (schema.type !== "domain.field") {
      const invalidConstraint = fieldConstraintKeys.find((key) =>
        Object.hasOwn(schema, key),
      );
      if (invalidConstraint) {
        throw new Error(
          `Capability package '${manifest.key}' input '${schema.key}' declares '${invalidConstraint}', which is only valid for domain.field inputs.`,
        );
      }
    }
    const allowedInputKeys =
      schema.type === "domain.field"
        ? domainFieldBindingInputKeys
        : nonFieldBindingInputKeys;
    const unknownInputKey = Object.keys(schema).find(
      (key) => !allowedInputKeys.has(key),
    );
    if (unknownInputKey !== undefined) {
      throw new Error(
        `Capability package '${manifest.key}' input '${schema.key}' declares unknown key '${String(unknownInputKey)}'.`,
      );
    }
    if (
      !Object.hasOwn(schema, "required") ||
      typeof schema.required !== "boolean"
    ) {
      throw new Error(
        `Capability package '${manifest.key}' input '${schema.key}' required must be a boolean.`,
      );
    }

    if (schema.type === "domain.field") {
      if (
        !Object.hasOwn(schema, "ownerBinding") ||
        typeof schema.ownerBinding !== "string" ||
        !parameterKeyPattern.test(schema.ownerBinding) ||
        prototypeReservedParameterKeys.has(schema.ownerBinding)
      ) {
        throw new Error(
          `Capability package '${manifest.key}' domain.field '${schema.key}' requires a safe ownerBinding.`,
        );
      }
      if (
        !Object.hasOwn(schema, "fieldTypes") ||
        !Array.isArray(schema.fieldTypes) ||
        schema.fieldTypes.length === 0 ||
        schema.fieldTypes.some(
          (fieldType) => !supportedBindingFieldTypes.has(fieldType),
        )
      ) {
        throw new Error(
          `Capability package '${manifest.key}' domain.field '${schema.key}' requires one or more supported fieldTypes.`,
        );
      }
      if (new Set(schema.fieldTypes).size !== schema.fieldTypes.length) {
        throw new Error(
          `Capability package '${manifest.key}' domain.field '${schema.key}' declares duplicate fieldTypes.`,
        );
      }
      if (
        Object.hasOwn(schema, "fieldRequired") &&
        typeof schema.fieldRequired !== "boolean"
      ) {
        throw new Error(
          `Capability package '${manifest.key}' domain.field '${schema.key}' fieldRequired must be a boolean.`,
        );
      }
      if (
        Object.hasOwn(schema, "fieldUnique") &&
        typeof schema.fieldUnique !== "boolean"
      ) {
        throw new Error(
          `Capability package '${manifest.key}' domain.field '${schema.key}' fieldUnique must be a boolean.`,
        );
      }
    }

    bindingSchemas.set(schema.key, schema);
  }

  for (const schema of bindingSchemas.values()) {
    if (schema.type !== "domain.field") continue;
    const owner = bindingSchemas.get(schema.ownerBinding);
    if (!owner) {
      throw new Error(
        `Capability package '${manifest.key}' domain.field '${schema.key}' references unknown ownerBinding '${schema.ownerBinding}'.`,
      );
    }
    if (owner.type !== "domain.entity" || owner.required !== true) {
      throw new Error(
        `Capability package '${manifest.key}' domain.field '${schema.key}' ownerBinding '${schema.ownerBinding}' must reference a required domain.entity input.`,
      );
    }
  }

  const parameterSchemas = strictParameterSchemas(manifest);
  if (
    parameterSchemas.size !== bindingSchemas.size ||
    [...parameterSchemas.keys()].some((key) => !bindingSchemas.has(key))
  ) {
    throw new Error(
      `Capability package '${manifest.key}' strict parameters and inputSchema must have identical keys.`,
    );
  }
  for (const [key, bindingSchema] of bindingSchemas) {
    const parameter = parameterSchemas.get(key);
    if (!parameter) {
      throw new Error(
        `Capability package '${manifest.key}' strict parameters and inputSchema must have identical keys.`,
      );
    }
    if (parameter.required !== bindingSchema.required) {
      throw new Error(
        `Capability package '${manifest.key}' parameter '${key}' required flag must match inputSchema.`,
      );
    }
    if (parameter.type !== "graph-symbol") {
      throw new Error(
        `Capability package '${manifest.key}' typed binding parameter '${key}' must use graph-symbol.`,
      );
    }
  }

  return bindingSchemas;
}

export function validateCapabilityBindingSchema(
  manifest: CapabilityAssetManifestV1,
): ReadonlyMap<string, CapabilityBindingInputV1> {
  return validateCapabilityBindingSchemaSnapshot(
    captureManifestSnapshotV1(manifest),
  );
}

function validateBindings(
  manifest: CapabilityAssetManifestV1,
  bindings: Readonly<Record<string, CapabilityBindingValueV1>>,
): Readonly<Record<string, CapabilityBindingValueV1>> {
  const bindingSchemas = validateCapabilityBindingSchemaSnapshot(manifest);
  const schemas = strictParameterSchemas(manifest);
  const bindingSnapshot = snapshotOwnDataRecord(bindings);
  if (!bindingSnapshot) {
    throw new Error(
      `Capability package '${manifest.key}' bindings must be a plain data record.`,
    );
  }
  const normalizedBindings = Object.create(null) as Record<
    string,
    CapabilityBindingValueV1
  >;
  for (const [key, value] of Object.entries(bindingSnapshot)) {
    const schema = schemas.get(key);
    if (!schema) {
      throw new Error(
        `Capability package '${manifest.key}' does not declare parameter '${key}'.`,
      );
    }
    normalizedBindings[key] = normalizeBindingValue(
      manifest.key,
      schema,
      value as CapabilityBindingValueV1,
      bindingSchemas.get(schema.key),
    );
  }
  for (const schema of schemas.values()) {
    if (schema.required && !Object.hasOwn(bindingSnapshot, schema.key)) {
      throw new Error(
        `Capability package '${manifest.key}' requires parameter '${schema.key}'.`,
      );
    }
  }
  return normalizedBindings;
}

function interfaceIdentity(interfaceKey: string, version: string): string {
  return `${interfaceKey}@${version}`;
}

function resolveDependencyOrder(
  manifests: readonly CapabilityAssetManifestV1[],
): readonly string[] {
  const providers = new Map<string, Set<string>>();
  for (const manifest of manifests) {
    for (const provided of manifest.provides ?? []) {
      const identity = interfaceIdentity(
        provided.interfaceKey,
        provided.version,
      );
      const packageKeys = providers.get(identity) ?? new Set<string>();
      packageKeys.add(manifest.key);
      providers.set(identity, packageKeys);
    }
  }

  const dependencies = new Map<string, Set<string>>(
    manifests.map((manifest) => [manifest.key, new Set<string>()]),
  );
  const dependants = new Map<string, Set<string>>(
    manifests.map((manifest) => [manifest.key, new Set<string>()]),
  );
  for (const manifest of manifests) {
    for (const requirement of manifest.requires ?? []) {
      const identity = interfaceIdentity(
        requirement.interfaceKey,
        requirement.version,
      );
      const matchingProviders = [...(providers.get(identity) ?? [])].sort();
      if (matchingProviders.length === 0) {
        throw new Error(
          `Capability package '${manifest.key}' requirement '${identity}' has no provider.`,
        );
      }
      if (matchingProviders.length > 1 && !requirement.multiProvider) {
        throw new Error(
          `Capability package '${manifest.key}' requirement '${identity}' has multiple providers.`,
        );
      }
      for (const providerKey of matchingProviders) {
        dependencies.get(manifest.key)?.add(providerKey);
        dependants.get(providerKey)?.add(manifest.key);
      }
    }
  }

  const ready = manifests
    .map(({ key }) => key)
    .filter((key) => dependencies.get(key)?.size === 0)
    .sort();
  const resolved: string[] = [];
  while (ready.length > 0) {
    const packageKey = ready.shift();
    if (!packageKey) break;
    resolved.push(packageKey);
    for (const dependant of [...(dependants.get(packageKey) ?? [])].sort()) {
      const remaining = dependencies.get(dependant);
      remaining?.delete(packageKey);
      if (remaining?.size === 0 && !resolved.includes(dependant)) {
        ready.push(dependant);
        ready.sort();
      }
    }
  }
  if (resolved.length !== manifests.length) {
    throw new Error("Capability composition contains a dependency cycle.");
  }
  return resolved;
}

function resolveCapabilityCompositionFromSnapshot(
  input: ResolveCapabilityCompositionInput,
  assets: readonly CapabilityAssetV1[],
): CapabilityCompositionV1 {
  const seenPackageKeys = new Set<string>();
  for (const selection of input.selections) {
    if (seenPackageKeys.has(selection.lock.key)) {
      throw new Error(
        `Duplicate capability package key '${selection.lock.key}'.`,
      );
    }
    seenPackageKeys.add(selection.lock.key);
  }

  const matchedSelections = input.selections
    .map((selection) => ({
      selection,
      manifest: matchingManifest(selection.lock, assets),
    }))
    .sort((left, right) => compareText(left.manifest.key, right.manifest.key));
  const packages = matchedSelections.map(({ selection, manifest }) => {
    const bindings = validateBindings(manifest, selection.bindings);
    return canonicalSelection(manifest, bindings);
  });
  const manifests = matchedSelections.map(({ manifest }) => manifest);
  const resolvedDependencyOrder = resolveDependencyOrder(manifests);

  const contributionDigests = new Set<string>();
  const interfaces = new Set<string>();
  const runtimeInterfaces = new Set<string>();
  for (const manifest of manifests) {
    for (const contribution of [
      ...(manifest.graphContributions ?? []),
      ...(manifest.executableContributions ?? []),
    ]) {
      if (!sha256Pattern.test(contribution.digest)) {
        throw new Error(
          `Capability package '${manifest.key}' contribution '${contribution.id}' has an invalid digest.`,
        );
      }
      contributionDigests.add(contribution.digest);
    }
    for (const provided of manifest.provides ?? []) {
      interfaces.add(
        `provides:${interfaceIdentity(provided.interfaceKey, provided.version)}`,
      );
    }
    for (const requirement of manifest.requires ?? []) {
      interfaces.add(
        `requires:${interfaceIdentity(requirement.interfaceKey, requirement.version)}`,
      );
    }
    for (const contribution of manifest.executableContributions ?? []) {
      runtimeInterfaces.add(
        `${contribution.outputSlot}@${contribution.targetRuntimeInterfaceVersion}`,
      );
    }
  }

  return deepFreeze({
    packages,
    resolvedContributionDigests: [...contributionDigests].sort(),
    providedAndRequiredInterfaces: [...interfaces].sort(),
    targetRuntimeInterfaceVersions: [...runtimeInterfaces].sort(),
    resolvedDependencyOrder: [...resolvedDependencyOrder],
  });
}

export function resolveCapabilityCompositionForAssets(
  input: ResolveCapabilityCompositionInput,
  assets: readonly CapabilityAssetV1[],
): CapabilityCompositionV1 {
  const captured = captureResolutionInputV1(input, assets);
  return resolveCapabilityCompositionFromSnapshot(
    captured.input,
    captured.assets,
  );
}

export function resolveCapabilityComposition(
  input: ResolveCapabilityCompositionInput,
): CapabilityCompositionV1 {
  return resolveCapabilityCompositionForAssets(input, capabilityAssets);
}

export function createCapabilityCompositionLockForAssets(
  input: CreateCapabilityCompositionLockInput,
  assets: readonly CapabilityAssetV1[],
): CapabilityCompositionLockV1 {
  const captured = captureResolutionInputV1(input, assets);
  if (!sha256Pattern.test(captured.input.graphChecksum)) {
    throw new Error(
      "Application Graph checksum must be a sha256-prefixed lowercase digest.",
    );
  }
  const composition = resolveCapabilityCompositionFromSnapshot(
    captured.input,
    captured.assets,
  );
  const unsignedLock = {
    apiVersion: "factory.composition/v1" as const,
    applicationGraphChecksum: captured.input.graphChecksum,
    packages: composition.packages,
    resolvedContributionDigests: composition.resolvedContributionDigests,
    providedAndRequiredInterfaces: composition.providedAndRequiredInterfaces,
    targetRuntimeInterfaceVersions: composition.targetRuntimeInterfaceVersions,
    resolvedDependencyOrder: composition.resolvedDependencyOrder,
  };
  return deepFreeze({
    ...unsignedLock,
    lockDigest: sha256(canonicalJson(unsignedLock)),
  });
}

export function createCapabilityCompositionLock(
  input: CreateCapabilityCompositionLockInput,
): CapabilityCompositionLockV1 {
  return createCapabilityCompositionLockForAssets(input, capabilityAssets);
}
