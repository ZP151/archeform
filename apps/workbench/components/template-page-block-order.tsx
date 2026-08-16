"use client";

import { ChevronDown, ChevronUp, GripVertical, Save } from "lucide-react";
import React, { useEffect, useMemo, useState } from "react";
import { Puck, type Config, type Data } from "@puckeditor/core";
import "@puckeditor/core/puck.css";

import {
  applyTemplatePageBlockOrderPermutation,
  templatePageBlocksToPuckData,
  type TemplatePageOrderBlock,
} from "../lib/template-page-block-order";

const permissions = {
  drag: true,
  duplicate: false,
  delete: false,
  edit: false,
  insert: false,
} as const;

function blockConfig(type: string): Config["components"][string] {
  return {
    fields: {},
    render: (props: Record<string, unknown>) => (
      <section className="template-order-puck-block">
        <GripVertical size={16} aria-hidden="true" />
        <span>{type}</span>
        <small>
          {typeof props.id === "string" ? props.id : "Governed block"}
        </small>
      </section>
    ),
  };
}

function sameOrder(
  left: readonly TemplatePageOrderBlock[],
  right: readonly TemplatePageOrderBlock[],
): boolean {
  return (
    left.length === right.length &&
    left.every((block, index) => block.id === right[index]?.id)
  );
}

export function TemplatePageBlockOrder({
  blocks,
  busy,
  onSave,
}: {
  readonly blocks: readonly TemplatePageOrderBlock[];
  readonly busy: boolean;
  readonly onSave: (blockIds: readonly string[]) => void;
}) {
  const [orderedBlocks, setOrderedBlocks] = useState(blocks);
  const [invalid, setInvalid] = useState(false);
  const [puckGeneration, setPuckGeneration] = useState(0);
  useEffect(() => {
    setOrderedBlocks(blocks);
    setInvalid(false);
    setPuckGeneration((current) => current + 1);
  }, [blocks]);
  const config = useMemo<Config>(
    () => ({
      components: Object.fromEntries(
        [...new Set(blocks.map(({ type }) => type))].map((type) => [
          type,
          blockConfig(type),
        ]),
      ),
    }),
    [blocks],
  );
  const data = useMemo(
    () => templatePageBlocksToPuckData(orderedBlocks),
    [orderedBlocks],
  );
  const changed = !sameOrder(orderedBlocks, blocks);
  const canSave = changed && !invalid && !busy;

  const acceptPuckChange = (next: Data) => {
    try {
      setOrderedBlocks(
        applyTemplatePageBlockOrderPermutation(blocks, {
          kind: "puck-change",
          data: next,
        }),
      );
      setInvalid(false);
    } catch {
      setInvalid(true);
      setPuckGeneration((current) => current + 1);
    }
  };

  const move = (blockId: string, direction: "up" | "down") => {
    setOrderedBlocks((current) =>
      applyTemplatePageBlockOrderPermutation(current, {
        kind: "keyboard-move",
        blockId,
        direction,
      }),
    );
    setInvalid(false);
  };

  return (
    <section className="template-page-block-order" aria-label="Block order">
      <header>
        <span>Composition</span>
        <h2>Block order</h2>
        <p>
          Arrange the existing governed blocks without changing their content.
        </p>
      </header>
      <div className="template-order-puck" aria-label="Puck block order canvas">
        <Puck
          key={`${puckGeneration}:${orderedBlocks.map(({ id }) => id).join("|")}`}
          config={config}
          data={data}
          iframe={{ enabled: false }}
          permissions={permissions}
          onChange={acceptPuckChange}
        >
          <Puck.Layout>
            <Puck.Outline />
            <Puck.Preview />
          </Puck.Layout>
        </Puck>
      </div>
      <ol className="template-order-keyboard" aria-label="Keyboard block order">
        {orderedBlocks.map((block, index) => (
          <li key={block.id}>
            <span>
              <strong>{block.type}</strong>
              <small>{block.id}</small>
            </span>
            <span className="template-order-moves">
              <button
                type="button"
                aria-label={`Move ${block.type} ${block.id} up`}
                disabled={busy || index === 0}
                onClick={() => move(block.id, "up")}
              >
                <ChevronUp size={16} aria-hidden="true" />
              </button>
              <button
                type="button"
                aria-label={`Move ${block.type} ${block.id} down`}
                disabled={busy || index === orderedBlocks.length - 1}
                onClick={() => move(block.id, "down")}
              >
                <ChevronDown size={16} aria-hidden="true" />
              </button>
            </span>
          </li>
        ))}
      </ol>
      <p role="status" aria-live="polite">
        {invalid
          ? "Order change rejected."
          : changed
            ? `Proposed order: ${orderedBlocks.map(({ id }) => id).join(", ")}.`
            : "Block order unchanged."}
      </p>
      <button
        type="button"
        aria-label="Save block order"
        disabled={!canSave}
        onClick={() => onSave(orderedBlocks.map(({ id }) => id))}
      >
        <Save size={15} aria-hidden="true" />
        {busy ? "Saving…" : "Save order as new Draft"}
      </button>
    </section>
  );
}
