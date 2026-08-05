import {
  compilationTargets,
  type CompilationTargetKey,
  type CompilerTargetPluginV1,
  type PublishedCompilationInput,
} from "./target-plugin.js";
import {
  assertSafeGeneratedFileSet,
  sameGeneratedFileSet,
  type GeneratedFile,
} from "./generated-files.js";

/**
 * Rejects a plan that is not a serializable plain-data value. Plans are
 * deterministic records that must survive JSON round-trips without losing or
 * changing meaning; functions, symbols, symbol keys, accessors, `toJSON`,
 * undefined values, bigint, non-finite numbers, non-plain prototypes, and
 * cycles fail closed at plan time.
 */
function requirePlainDataDescriptor(
  value: object,
  key: PropertyKey,
  path: string,
): PropertyDescriptor {
  if (typeof key !== "string") {
    throw new Error(`Compiler target plan '${path}' must be plain data.`);
  }
  const descriptor = Object.getOwnPropertyDescriptor(value, key);
  if (
    !descriptor ||
    !("value" in descriptor) ||
    !descriptor.enumerable ||
    typeof descriptor.value === "function"
  ) {
    throw new Error(`Compiler target plan '${path}' must be plain data.`);
  }
  return descriptor;
}

export function assertSerializablePlan(plan: unknown): void {
  const active = new WeakSet<object>();
  const visit = (value: unknown, path: string): void => {
    if (value === null) return;
    if (typeof value === "string" || typeof value === "boolean") return;
    if (typeof value === "number") {
      if (!Number.isFinite(value)) {
        throw new Error(`Compiler target plan '${path}' must be finite.`);
      }
      return;
    }
    if (typeof value !== "object") {
      throw new Error(`Compiler target plan '${path}' must be plain data.`);
    }
    if (active.has(value)) {
      throw new Error(
        `Compiler target plan '${path}' must not contain cycles.`,
      );
    }
    active.add(value);
    const prototype = Object.getPrototypeOf(value);
    if (
      prototype !== Object.prototype &&
      prototype !== Array.prototype &&
      prototype !== null
    ) {
      throw new Error(
        `Compiler target plan '${path}' must use plain records and arrays.`,
      );
    }
    if (Array.isArray(value)) {
      for (let index = 0; index < value.length; index += 1) {
        const descriptor = requirePlainDataDescriptor(
          value,
          String(index),
          `${path}[${index}]`,
        );
        visit(descriptor.value, `${path}[${index}]`);
      }
      if (Reflect.ownKeys(value).length !== value.length) {
        throw new Error(`Compiler target plan '${path}' must be plain data.`);
      }
    } else {
      for (const key of Reflect.ownKeys(value)) {
        const descriptor = requirePlainDataDescriptor(value, key, path);
        visit(descriptor.value, `${path}.${key}`);
      }
    }
    active.delete(value);
  };
  visit(plan, "plan");
}

/**
 * Deterministic admission and lifecycle runner for CompilerTargetPluginV1.
 * Registration rejects duplicate keys and unknown target keys. Running a
 * target enforces supports -> plan -> render -> validate and fails closed on
 * an unsupported input, a non-serializable plan, nondeterministic rendering,
 * unsafe or duplicate output paths, and validation failure.
 */
export class CompilerTargetRegistryV1 {
  private readonly plugins = new Map<
    CompilationTargetKey,
    CompilerTargetPluginV1<unknown>
  >();

  get registeredKeys(): readonly CompilationTargetKey[] {
    return [...this.plugins.keys()].sort();
  }

  register<TPlan>(plugin: CompilerTargetPluginV1<TPlan>): void {
    if (plugin.apiVersion !== "factory.compiler-target/v1") {
      throw new Error(
        `Compiler target '${plugin.key}' must declare apiVersion 'factory.compiler-target/v1'.`,
      );
    }
    if (!compilationTargets.some(({ key }) => key === plugin.key)) {
      throw new Error(
        `Compiler target '${plugin.key}' is not a supported compilation target.`,
      );
    }
    if (this.plugins.has(plugin.key)) {
      throw new Error(`Compiler target '${plugin.key}' is already registered.`);
    }
    this.plugins.set(plugin.key, plugin as CompilerTargetPluginV1<unknown>);
  }

  get(key: CompilationTargetKey): CompilerTargetPluginV1<unknown> {
    const plugin = this.plugins.get(key);
    if (!plugin) {
      throw new Error(`No compiler target plugin is registered for '${key}'.`);
    }
    return plugin;
  }

  run<TPlan>(
    key: CompilationTargetKey,
    input: PublishedCompilationInput,
  ): readonly GeneratedFile[] {
    const plugin = this.get(key) as CompilerTargetPluginV1<TPlan>;
    if (!plugin.supports(input)) {
      throw new Error(
        `Compiler target '${key}' does not support the given compilation input.`,
      );
    }
    const plan = plugin.plan(input);
    assertSerializablePlan(plan);
    const firstRender = plugin.render(plan);
    const secondRender = plugin.render(plan);
    if (!sameGeneratedFileSet(firstRender, secondRender)) {
      throw new Error(
        `Compiler target '${key}' produced nondeterministic output.`,
      );
    }
    assertSafeGeneratedFileSet(firstRender);
    const validation = plugin.validate(firstRender);
    if (!validation.ok) {
      const issues = validation.issues
        .map((issue) => `'${issue.path}' (${issue.code}): ${issue.message}`)
        .join("; ");
      throw new Error(`Compiler target '${key}' validation failed: ${issues}.`);
    }
    return firstRender;
  }
}

export function createCompilerTargetRegistryV1(): CompilerTargetRegistryV1 {
  return new CompilerTargetRegistryV1();
}
