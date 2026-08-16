import type { Data } from "@puckeditor/core";

const INVALID_ORDER = "Template page block order is invalid.";

export type TemplatePageOrderBlock = {
  readonly id: string;
  readonly type: string;
};

function invalidOrder(): never {
  throw new Error(INVALID_ORDER);
}

function validBlocks(
  blocks: readonly TemplatePageOrderBlock[],
): readonly TemplatePageOrderBlock[] {
  if (
    blocks.length < 2 ||
    blocks.length > 20 ||
    new Set(blocks.map(({ id }) => id)).size !== blocks.length ||
    blocks.some(
      ({ id, type }) =>
        typeof id !== "string" ||
        id.length === 0 ||
        typeof type !== "string" ||
        type.length === 0,
    )
  ) {
    return invalidOrder();
  }
  return blocks.map(({ id, type }) => Object.freeze({ id, type }));
}

function exactRecord(
  input: unknown,
  requiredKeys: readonly string[],
  optionalKeys: readonly string[] = [],
): Readonly<Record<string, unknown>> {
  if (
    input === null ||
    typeof input !== "object" ||
    Array.isArray(input) ||
    Object.getPrototypeOf(input) !== Object.prototype
  ) {
    return invalidOrder();
  }
  const keys = Reflect.ownKeys(input);
  const allowedKeys = [...requiredKeys, ...optionalKeys];
  if (
    keys.length < requiredKeys.length ||
    keys.length > allowedKeys.length ||
    keys.some((key) => typeof key !== "string" || !allowedKeys.includes(key)) ||
    requiredKeys.some((key) => !keys.includes(key))
  ) {
    return invalidOrder();
  }
  const output: Record<string, unknown> = Object.create(null);
  for (const key of keys) {
    if (typeof key !== "string") return invalidOrder();
    const descriptor = Object.getOwnPropertyDescriptor(input, key);
    if (descriptor?.enumerable !== true || !("value" in descriptor)) {
      return invalidOrder();
    }
    output[key] = descriptor.value;
  }
  return output;
}

function exactDenseContent(input: unknown, length: number): readonly unknown[] {
  if (!Array.isArray(input)) return invalidOrder();
  const lengthDescriptor = Object.getOwnPropertyDescriptor(input, "length");
  if (
    !lengthDescriptor ||
    !("value" in lengthDescriptor) ||
    lengthDescriptor.value !== length ||
    lengthDescriptor.enumerable !== false ||
    lengthDescriptor.configurable !== false ||
    lengthDescriptor.writable !== true ||
    Object.getPrototypeOf(input) !== Array.prototype
  ) {
    return invalidOrder();
  }
  const keys = Reflect.ownKeys(input);
  if (
    keys.length !== length + 1 ||
    keys.some((key) => typeof key !== "string") ||
    !keys.includes("length") ||
    Array.from({ length }, (_, index) => String(index)).some(
      (key) => !keys.includes(key),
    )
  ) {
    return invalidOrder();
  }
  const output: unknown[] = [];
  for (let index = 0; index < length; index += 1) {
    const descriptor = Object.getOwnPropertyDescriptor(input, String(index));
    if (descriptor?.enumerable !== true || !("value" in descriptor)) {
      return invalidOrder();
    }
    output.push(descriptor.value);
  }
  return output;
}

function capturedPuckIds(
  governed: readonly TemplatePageOrderBlock[],
  input: unknown,
): readonly string[] {
  const data = exactRecord(input, ["root", "content"], ["zones"]);
  if (Object.hasOwn(data, "zones")) exactRecord(data.zones, []);
  const root = exactRecord(data.root, ["props"]);
  exactRecord(root.props, []);
  const content = exactDenseContent(data.content, governed.length);
  const byId = new Map(governed.map((block) => [block.id, block]));
  const ids = content.map((candidate) => {
    const entry = exactRecord(candidate, ["type", "props"]);
    const props = exactRecord(entry.props, ["id"]);
    const id = props.id;
    const type = entry.type;
    const expected = typeof id === "string" ? byId.get(id) : undefined;
    if (!expected || type !== expected.type) return invalidOrder();
    return expected.id;
  });
  if (new Set(ids).size !== governed.length) return invalidOrder();
  return Object.freeze([...ids]);
}

export function templatePageBlocksToPuckData(
  blocks: readonly TemplatePageOrderBlock[],
): Data {
  return {
    root: { props: {} },
    content: validBlocks(blocks).map(({ id, type }) => ({
      type,
      props: { id },
    })),
  };
}

export function reduceTemplatePageBlockOrderChange(
  blocks: readonly TemplatePageOrderBlock[],
  input: unknown,
): readonly string[] {
  try {
    return capturedPuckIds(validBlocks(blocks), input);
  } catch {
    return invalidOrder();
  }
}

export type TemplatePageBlockOrderPermutationAction =
  | { readonly kind: "puck-change"; readonly data: unknown }
  | {
      readonly kind: "keyboard-move";
      readonly blockId: string;
      readonly direction: "up" | "down";
    };

export function applyTemplatePageBlockOrderPermutation(
  blocks: readonly TemplatePageOrderBlock[],
  actionInput: unknown,
): readonly TemplatePageOrderBlock[] {
  try {
    const governed = validBlocks(blocks);
    if (
      actionInput === null ||
      typeof actionInput !== "object" ||
      Array.isArray(actionInput)
    ) {
      return invalidOrder();
    }
    const kindDescriptor = Object.getOwnPropertyDescriptor(actionInput, "kind");
    if (kindDescriptor?.enumerable !== true || !("value" in kindDescriptor)) {
      return invalidOrder();
    }
    if (kindDescriptor.value === "puck-change") {
      const action = exactRecord(actionInput, ["kind", "data"]);
      const ids = capturedPuckIds(governed, action.data);
      const byId = new Map(governed.map((block) => [block.id, block]));
      return Object.freeze(ids.map((id) => byId.get(id)!));
    }
    if (kindDescriptor.value === "keyboard-move") {
      const action = exactRecord(actionInput, ["kind", "blockId", "direction"]);
      const blockId = action.blockId;
      const direction = action.direction;
      if (
        typeof blockId !== "string" ||
        (direction !== "up" && direction !== "down")
      ) {
        return invalidOrder();
      }
      const index = governed.findIndex(({ id }) => id === blockId);
      if (index < 0) return invalidOrder();
      const destination = direction === "up" ? index - 1 : index + 1;
      if (destination < 0 || destination >= governed.length) return governed;
      const moved = [...governed];
      [moved[index], moved[destination]] = [moved[destination]!, moved[index]!];
      return Object.freeze(moved);
    }
    return invalidOrder();
  } catch {
    return invalidOrder();
  }
}

export function moveTemplatePageBlock(
  blocks: readonly TemplatePageOrderBlock[],
  blockId: string,
  direction: "up" | "down",
): readonly TemplatePageOrderBlock[] {
  return applyTemplatePageBlockOrderPermutation(blocks, {
    kind: "keyboard-move",
    blockId,
    direction,
  });
}
