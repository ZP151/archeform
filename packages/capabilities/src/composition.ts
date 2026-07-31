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

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function hasExactOwnKeys(
  value: unknown,
  allowedKeys: ReadonlySet<string>,
  requiredKeys: readonly string[],
): value is Record<string, unknown> {
  return (
    isPlainRecord(value) &&
    Reflect.ownKeys(value).every(
      (key) => typeof key === "string" && allowedKeys.has(key),
    ) &&
    requiredKeys.every((key) => Object.hasOwn(value, key))
  );
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

function assertBindingValue(
  packageKey: string,
  schema: CapabilityParameterSchemaV1,
  value: CapabilityBindingValueV1,
  bindingSchema?: CapabilityBindingInputV1,
): void {
  const label = `Capability package '${packageKey}' parameter '${schema.key}'`;
  if (schema.type === "number") {
    if (typeof value !== "number" || !Number.isFinite(value)) {
      throw new Error(`${label} must be a finite number.`);
    }
    return;
  }
  if (schema.type === "boolean") {
    if (typeof value !== "boolean") {
      throw new Error(`${label} must be a boolean.`);
    }
    return;
  }
  if (bindingSchema?.type === "domain.field") {
    if (
      !hasExactOwnKeys(value, domainFieldBindingValueKeys, [
        "graphSymbol",
        "fieldKey",
      ]) ||
      typeof value.graphSymbol !== "string" ||
      !domainEntitySymbolPattern.test(value.graphSymbol) ||
      typeof value.fieldKey !== "string" ||
      !fieldKeyPattern.test(value.fieldKey)
    ) {
      throw new Error(
        `${label} must include an owning domain graphSymbol and fieldKey.`,
      );
    }
    return;
  }
  if (
    bindingSchema &&
    isPlainRecord(value) &&
    Object.hasOwn(value, "fieldKey")
  ) {
    throw new Error(
      `${label} cannot include fieldKey for a '${bindingSchema.type}' input.`,
    );
  }
  if (
    !hasExactOwnKeys(value, graphSymbolBindingValueKeys, ["graphSymbol"]) ||
    typeof value.graphSymbol !== "string" ||
    !graphSymbolPattern.test(value.graphSymbol)
  ) {
    throw new Error(
      `${label} must be a Graph symbol in graph.<model>.<id> form.`,
    );
  }
}

function canonicalSelection(
  selection: CapabilitySelectionV1,
  manifest: CapabilityAssetManifestV1,
): CapabilitySelectionV1 {
  const bindings = Object.create(null) as Record<
    string,
    CapabilityBindingValueV1
  >;
  for (const key of Object.keys(selection.bindings).sort()) {
    const value = selection.bindings[key];
    if (value === undefined) continue;
    if (typeof value !== "object") {
      bindings[key] = value;
      continue;
    }
    if (
      !isPlainRecord(value) ||
      typeof value.graphSymbol !== "string" ||
      !Object.hasOwn(value, "graphSymbol")
    ) {
      throw new Error(
        `Capability package '${manifest.key}' contains an invalid binding value.`,
      );
    }
    bindings[key] = Object.hasOwn(value, "fieldKey")
      ? { graphSymbol: value.graphSymbol, fieldKey: value.fieldKey as string }
      : { graphSymbol: value.graphSymbol };
  }
  return {
    lock: {
      key: manifest.key,
      version: manifest.version,
      packageRoot: manifest.packageRoot,
      manifestDigest: manifest.manifestDigest,
      lifecycle: manifest.lifecycle,
    },
    bindings,
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

export function validateCapabilityBindingSchema(
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
    if (!isPlainRecord(untrustedSchema)) {
      throw new Error(
        `Capability package '${manifest.key}' input schema must be a plain record.`,
      );
    }
    const schema = untrustedSchema as CapabilityBindingInputV1;
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
    const unknownInputKey = Reflect.ownKeys(schema).find(
      (key) => typeof key !== "string" || !allowedInputKeys.has(key),
    );
    if (unknownInputKey) {
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
        typeof schema.ownerBinding !== "string" ||
        !parameterKeyPattern.test(schema.ownerBinding) ||
        prototypeReservedParameterKeys.has(schema.ownerBinding)
      ) {
        throw new Error(
          `Capability package '${manifest.key}' domain.field '${schema.key}' requires a safe ownerBinding.`,
        );
      }
      if (
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
        schema.fieldRequired !== undefined &&
        typeof schema.fieldRequired !== "boolean"
      ) {
        throw new Error(
          `Capability package '${manifest.key}' domain.field '${schema.key}' fieldRequired must be a boolean.`,
        );
      }
      if (
        schema.fieldUnique !== undefined &&
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

  const parameters = manifest.parameters ?? [];
  const parameterSchemas = new Map(
    parameters.map((parameter) => [parameter.key, parameter] as const),
  );
  if (
    parameterSchemas.size !== parameters.length ||
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

function validateBindings(
  manifest: CapabilityAssetManifestV1,
  bindings: Readonly<Record<string, CapabilityBindingValueV1>>,
): void {
  const bindingSchemas = validateCapabilityBindingSchema(manifest);
  const parameters = manifest.parameters ?? [];
  const schemas = new Map<string, CapabilityParameterSchemaV1>();
  for (const schema of parameters) {
    if (schemas.has(schema.key)) {
      throw new Error(
        `Capability package '${manifest.key}' declares duplicate parameter '${schema.key}'.`,
      );
    }
    if (
      !parameterKeyPattern.test(schema.key) ||
      prototypeReservedParameterKeys.has(schema.key)
    ) {
      throw new Error(
        `Capability package '${manifest.key}' parameter '${schema.key}' must use a safe parameter key.`,
      );
    }
    if (!supportedParameterTypes.has(schema.type)) {
      throw new Error(
        `Capability package '${manifest.key}' does not support parameter type '${String(schema.type)}'.`,
      );
    }
    schemas.set(schema.key, schema);
  }

  for (const [key, value] of Object.entries(bindings)) {
    const schema = schemas.get(key);
    if (!schema) {
      throw new Error(
        `Capability package '${manifest.key}' does not declare parameter '${key}'.`,
      );
    }
    assertBindingValue(
      manifest.key,
      schema,
      value,
      bindingSchemas.get(schema.key),
    );
  }
  for (const schema of parameters) {
    if (schema.required && !Object.hasOwn(bindings, schema.key)) {
      throw new Error(
        `Capability package '${manifest.key}' requires parameter '${schema.key}'.`,
      );
    }
  }
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

export function resolveCapabilityCompositionForAssets(
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
    validateBindings(manifest, selection.bindings);
    return canonicalSelection(selection, manifest);
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

export function resolveCapabilityComposition(
  input: ResolveCapabilityCompositionInput,
): CapabilityCompositionV1 {
  return resolveCapabilityCompositionForAssets(input, capabilityAssets);
}

export function createCapabilityCompositionLockForAssets(
  input: CreateCapabilityCompositionLockInput,
  assets: readonly CapabilityAssetV1[],
): CapabilityCompositionLockV1 {
  if (!sha256Pattern.test(input.graphChecksum)) {
    throw new Error(
      "Application Graph checksum must be a sha256-prefixed lowercase digest.",
    );
  }
  const composition = resolveCapabilityCompositionForAssets(input, assets);
  const unsignedLock = {
    apiVersion: "factory.composition/v1" as const,
    applicationGraphChecksum: input.graphChecksum,
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
