import { describe, expect, it } from "vitest";

import * as orderApi from "./template-page-block-order";
import type { TemplatePageOrderBlock } from "./template-page-block-order";

const {
  moveTemplatePageBlock,
  reduceTemplatePageBlockOrderChange,
  templatePageBlocksToPuckData,
} = orderApi;
const applyPermutation = (
  governed: readonly TemplatePageOrderBlock[],
  action: unknown,
) =>
  (
    orderApi as typeof orderApi & {
      applyTemplatePageBlockOrderPermutation(
        blocks: readonly TemplatePageOrderBlock[],
        action: unknown,
      ): readonly TemplatePageOrderBlock[];
    }
  ).applyTemplatePageBlockOrderPermutation(governed, action);

const blocks = [
  { id: "home-hero", type: "menu-hero" },
  { id: "home-categories", type: "category-rail" },
  { id: "home-items", type: "menu-item-card" },
] as const satisfies readonly TemplatePageOrderBlock[];

describe("template Page block-order adapter", () => {
  it("reduces inspected blocks to Puck display identity and accepts only a permutation", () => {
    const data = templatePageBlocksToPuckData(blocks);
    expect(data).toEqual({
      root: { props: {} },
      content: [
        { type: "menu-hero", props: { id: "home-hero" } },
        { type: "category-rail", props: { id: "home-categories" } },
        { type: "menu-item-card", props: { id: "home-items" } },
      ],
    });

    expect(
      reduceTemplatePageBlockOrderChange(blocks, {
        root: { props: {} },
        content: [data.content[2], data.content[0], data.content[1]],
      }),
    ).toEqual(["home-items", "home-hero", "home-categories"]);
    expect(blocks.map(({ id }) => id)).toEqual([
      "home-hero",
      "home-categories",
      "home-items",
    ]);
  });

  it("accepts Puck 0.22.3's exact empty zones field without widening zone authority", () => {
    const data = templatePageBlocksToPuckData(blocks);
    expect(
      reduceTemplatePageBlockOrderChange(blocks, {
        ...data,
        zones: {},
      }),
    ).toEqual(["home-hero", "home-categories", "home-items"]);
    expect(() =>
      reduceTemplatePageBlockOrderChange(blocks, {
        ...data,
        zones: { hostile: [data.content[0]] },
      }),
    ).toThrow(new Error("Template page block order is invalid."));
  });

  it.each([
    [
      "inserted block",
      [
        ...templatePageBlocksToPuckData(blocks).content,
        { type: "menu-hero", props: { id: "foreign-block" } },
      ],
    ],
    ["deleted block", templatePageBlocksToPuckData(blocks).content.slice(1)],
    [
      "duplicate block",
      [
        templatePageBlocksToPuckData(blocks).content[0],
        templatePageBlocksToPuckData(blocks).content[0],
        templatePageBlocksToPuckData(blocks).content[2],
      ],
    ],
    [
      "renamed block",
      [
        { type: "menu-hero", props: { id: "renamed-hero" } },
        ...templatePageBlocksToPuckData(blocks).content.slice(1),
      ],
    ],
    [
      "type-changed block",
      [
        { type: "category-rail", props: { id: "home-hero" } },
        ...templatePageBlocksToPuckData(blocks).content.slice(1),
      ],
    ],
  ] as const)("rejects a Puck %s", (_label, content) => {
    expect(() =>
      reduceTemplatePageBlockOrderChange(blocks, {
        root: { props: {} },
        content: [...content],
      }),
    ).toThrow(new Error("Template page block order is invalid."));
  });

  it("uses one immutable reducer for keyboard moves and keeps boundaries stable", () => {
    expect(moveTemplatePageBlock(blocks, "home-hero", "up")).toEqual(blocks);
    expect(moveTemplatePageBlock(blocks, "home-items", "down")).toEqual(blocks);
    expect(moveTemplatePageBlock(blocks, "home-hero", "down")).toEqual([
      blocks[1],
      blocks[0],
      blocks[2],
    ]);
    expect(moveTemplatePageBlock(blocks, "home-items", "up")).toEqual([
      blocks[0],
      blocks[2],
      blocks[1],
    ]);
    expect(() => moveTemplatePageBlock(blocks, "foreign-block", "up")).toThrow(
      new Error("Template page block order is invalid."),
    );
  });

  it("applies drag and keyboard through one pure permutation function", () => {
    const data = templatePageBlocksToPuckData(blocks);
    const drag = applyPermutation(blocks, {
      kind: "puck-change",
      data: {
        root: { props: {} },
        content: [data.content[0], data.content[2], data.content[1]],
      },
    });
    const keyboard = applyPermutation(blocks, {
      kind: "keyboard-move",
      blockId: "home-items",
      direction: "up",
    });

    expect(drag).toEqual(keyboard);
    expect(drag.map(({ id }) => id)).toEqual([
      "home-hero",
      "home-items",
      "home-categories",
    ]);
    expect(blocks.map(({ id }) => id)).toEqual([
      "home-hero",
      "home-categories",
      "home-items",
    ]);
  });

  it.each([
    ["extra root field", (data: any) => Object.assign(data, { extra: true })],
    [
      "root symbol",
      (data: any) => Object.defineProperty(data, Symbol("extra"), { value: 1 }),
    ],
    [
      "root non-enumerable",
      (data: any) => Object.defineProperty(data, "extra", { value: 1 }),
    ],
    [
      "root props field",
      (data: any) => Object.assign(data.root, { extra: true }),
    ],
    [
      "root.props field",
      (data: any) => Object.assign(data.root.props, { extra: true }),
    ],
    [
      "entry field",
      (data: any) => Object.assign(data.content[0], { extra: true }),
    ],
    [
      "entry symbol",
      (data: any) =>
        Object.defineProperty(data.content[0], Symbol("extra"), { value: 1 }),
    ],
    [
      "entry non-enumerable",
      (data: any) =>
        Object.defineProperty(data.content[0], "extra", { value: 1 }),
    ],
    [
      "props field",
      (data: any) => Object.assign(data.content[0].props, { extra: true }),
    ],
  ] as const)("rejects hostile Puck data with an %s", (_label, mutate) => {
    const data = structuredClone(templatePageBlocksToPuckData(blocks));
    mutate(data);
    expect(() => reduceTemplatePageBlockOrderChange(blocks, data)).toThrow(
      new Error("Template page block order is invalid."),
    );
  });

  it("rejects accessors without invoking them or echoing hostile values", () => {
    let calls = 0;
    const data = structuredClone(templatePageBlocksToPuckData(blocks)) as any;
    Object.defineProperty(data.content[0], "type", {
      enumerable: true,
      get() {
        calls += 1;
        throw new Error("HOSTILE_PUCK_SENTINEL");
      },
    });

    expect(() => reduceTemplatePageBlockOrderChange(blocks, data)).toThrow(
      new Error("Template page block order is invalid."),
    );
    expect(calls).toBe(0);
  });

  it.each(["top", "content", "entry", "props"] as const)(
    "redacts a throwing %s Proxy without invoking conversions",
    (level) => {
      let conversions = 0;
      const data = structuredClone(templatePageBlocksToPuckData(blocks)) as any;
      const hostile = (target: object) =>
        new Proxy(target, {
          ownKeys() {
            throw new Error("HOSTILE_PUCK_SENTINEL");
          },
        });
      if (level === "top") {
        Object.assign(data, { toString: () => ++conversions });
        expect(() =>
          reduceTemplatePageBlockOrderChange(blocks, hostile(data)),
        ).toThrow(new Error("Template page block order is invalid."));
      } else {
        const target =
          level === "content"
            ? data.content
            : level === "entry"
              ? data.content[0]
              : data.content[0].props;
        Object.defineProperty(target, Symbol.toPrimitive, {
          value: () => {
            conversions += 1;
            return "HOSTILE_PUCK_SENTINEL";
          },
        });
        if (level === "content") data.content = hostile(target);
        else if (level === "entry") data.content[0] = hostile(target);
        else data.content[0].props = hostile(target);
        expect(() => reduceTemplatePageBlockOrderChange(blocks, data)).toThrow(
          new Error("Template page block order is invalid."),
        );
      }
      expect(conversions).toBe(0);
    },
  );

  it("rejects revoked Proxies, sparse arrays, and custom arrays with one fixed error", () => {
    const revoked = Proxy.revocable(
      structuredClone(templatePageBlocksToPuckData(blocks)),
      {},
    );
    revoked.revoke();
    const sparse = structuredClone(templatePageBlocksToPuckData(blocks)) as any;
    delete sparse.content[1];
    const custom = structuredClone(templatePageBlocksToPuckData(blocks)) as any;
    Object.setPrototypeOf(custom.content, Object.create(Array.prototype));

    for (const data of [revoked.proxy, sparse, custom]) {
      expect(() => reduceTemplatePageBlockOrderChange(blocks, data)).toThrow(
        new Error("Template page block order is invalid."),
      );
    }
  });

  it("returns copied primitive identity that cannot be changed after admission", () => {
    const data = structuredClone(templatePageBlocksToPuckData(blocks)) as any;
    const result = reduceTemplatePageBlockOrderChange(blocks, data);
    data.content[0].props.id = "hostile-after-admission";
    data.content[0].type = "hostile-after-admission";

    expect(result).toEqual(["home-hero", "home-categories", "home-items"]);
  });
});
