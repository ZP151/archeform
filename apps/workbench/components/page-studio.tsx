"use client";

import { useEffect, useMemo, useState } from "react";
import { Puck, type Config, type Data } from "@puckeditor/core";
import "@puckeditor/core/puck.css";
import type { PuckPageDocument } from "@factory/adapters/browser";
import {
  EXPERIENCE_DESIGN_SYSTEM_CATALOGUE,
  type ExperienceModel,
  type PageModel,
} from "@factory/graph";
import { setPageBlockEntity, setPageDetails } from "../lib/page-model";
import {
  applyPuckBlocksToPageModel,
  pageModelToPuckBlocks,
  puckBlockTypes,
  type PuckBlockType,
  type PuckVisualBlock,
} from "../lib/puck-page-model";
import {
  applyStudioEdit,
  insertableBlockTypes,
  tokenGroups,
  type StudioEdit,
} from "../lib/product-journey/page-bindings";

type Props = {
  pageDocument: PuckPageDocument;
  experience: ExperienceModel;
  entityKeys: readonly string[];
  selectedPageId: string;
  onPageModelChange: (page: PageModel) => void;
  onExperienceModelChange: (experience: ExperienceModel) => void;
};

function dataBlockConfig(kind: string): Config["components"][string] {
  return {
    fields: { title: { type: "text" } },
    render: (props: Record<string, unknown>) => (
      <PuckDataBlock kind={kind} title={props.title} />
    ),
  };
}

const config: Config = {
  components: {
    Hero: {
      fields: { heading: { type: "text" }, eyebrow: { type: "text" } },
      render: ({ heading, eyebrow }) => (
        <section className="puck-hero-block">
          <small>{eyebrow}</small>
          <h2>{heading}</h2>
          <button type="button">Start a request</button>
        </section>
      ),
    },
    Collection: dataBlockConfig("Collection"),
    Form: dataBlockConfig("Form"),
    Catalog: dataBlockConfig("Catalog"),
    Cart: dataBlockConfig("Cart"),
    Queue: dataBlockConfig("Queue"),
    Checkout: dataBlockConfig("Checkout"),
    Stats: dataBlockConfig("Stats"),
    List: dataBlockConfig("List"),
    Detail: dataBlockConfig("Detail"),
    Calendar: dataBlockConfig("Calendar"),
    Settings: dataBlockConfig("Settings"),
  },
};

function PuckDataBlock({ kind, title }: { kind: string; title: unknown }) {
  return (
    <section className="puck-data-block">
      <small>{kind}</small>
      <h2>{typeof title === "string" && title.trim() ? title : kind}</h2>
      <span>Bound through the Factory Application Graph.</span>
    </section>
  );
}

function toEditorData(document: PuckPageDocument, pageId: string): Data {
  const page =
    document.pageModel.pages.find((entry) => entry.id === pageId) ??
    document.pageModel.pages[0];
  return {
    root: { props: {} },
    content: page
      ? [...pageModelToPuckBlocks(document.pageModel, page.id)]
      : [],
  };
}

export function PageStudio({
  pageDocument,
  experience,
  entityKeys,
  selectedPageId,
  onPageModelChange,
  onExperienceModelChange,
}: Props) {
  const selectedPage =
    pageDocument.pageModel.pages.find((page) => page.id === selectedPageId) ??
    pageDocument.pageModel.pages[0];
  const editorSeed = useMemo(
    () => toEditorData(pageDocument, selectedPage?.id ?? ""),
    [pageDocument, selectedPage?.id],
  );
  const [editorData, setEditorData] = useState<Data>(editorSeed);
  const [route, setRoute] = useState(selectedPage?.route ?? "");
  const [title, setTitle] = useState(selectedPage?.title ?? "");
  const [selectedBlockId, setSelectedBlockId] = useState(
    selectedPage?.blocks[0]?.id ?? "",
  );
  const [newBlockType, setNewBlockType] = useState<
    (typeof insertableBlockTypes)[number]
  >(insertableBlockTypes[0]);
  const [tokenGroup, setTokenGroup] = useState<(typeof tokenGroups)[number]>(
    tokenGroups[0],
  );
  const [tokenMode, setTokenMode] = useState<"light" | "dark">("light");
  const [tokenKey, setTokenKey] = useState("brand");
  const [tokenValue, setTokenValue] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => setEditorData(editorSeed), [editorSeed]);
  useEffect(() => {
    setRoute(selectedPage?.route ?? "");
    setTitle(selectedPage?.title ?? "");
  }, [selectedPage?.id, selectedPage?.route, selectedPage?.title]);
  useEffect(() => {
    if (!selectedPage) return;
    if (!selectedPage.blocks.some((block) => block.id === selectedBlockId)) {
      setSelectedBlockId(selectedPage.blocks[0]?.id ?? "");
    }
  }, [selectedBlockId, selectedPage]);

  const applyEdit = (edit: StudioEdit): boolean => {
    try {
      const result = applyStudioEdit(
        {
          page: pageDocument.pageModel,
          experience,
          entityKeys,
        },
        edit,
      );
      onPageModelChange(result.page);
      onExperienceModelChange(result.experience);
      setError(null);
      return true;
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Unable to apply studio edit.",
      );
      return false;
    }
  };

  const proposeEditorData = (nextData: Data) => {
    setEditorData(nextData);
    if (!selectedPage) return;
    const visualBlocks = nextData.content.flatMap((block): PuckVisualBlock[] =>
      puckBlockTypes.includes(block.type as PuckBlockType)
        ? [
            {
              type: block.type as PuckBlockType,
              props: block.props as Record<string, unknown>,
            },
          ]
        : [],
    );
    onPageModelChange(
      applyPuckBlocksToPageModel(
        pageDocument.pageModel,
        selectedPage.id,
        visualBlocks,
      ),
    );
  };

  const saveRouteDetails = () => {
    if (!selectedPage) return;
    try {
      onPageModelChange(
        setPageDetails(pageDocument.pageModel, selectedPage.id, {
          route,
          title,
        }),
      );
      setError(null);
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Unable to update route.",
      );
    }
  };

  const selectedBlock = selectedPage?.blocks.find(
    (block) => block.id === selectedBlockId,
  );

  return (
    <section className="page-studio-canvas" aria-label="Puck Page Studio">
      <form
        className="page-route-editor"
        onSubmit={(event) => {
          event.preventDefault();
          saveRouteDetails();
        }}
      >
        <label>
          Path
          <input
            value={route}
            onChange={(event) => setRoute(event.target.value)}
            pattern="/.*"
          />
        </label>
        <label>
          Page title
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
          />
        </label>
        <label>
          Block
          <select
            disabled={!selectedPage?.blocks.length}
            value={selectedBlockId}
            onChange={(event) => setSelectedBlockId(event.target.value)}
          >
            {selectedPage?.blocks.map((block) => (
              <option key={block.id} value={block.id}>
                {block.type} · {block.id}
              </option>
            ))}
          </select>
        </label>
        <label>
          Entity binding
          <select
            disabled={!selectedBlock}
            value={selectedBlock?.entity ?? ""}
            onChange={(event) => {
              if (!selectedPage || !selectedBlock) return;
              try {
                onPageModelChange(
                  setPageBlockEntity(
                    pageDocument.pageModel,
                    selectedPage.id,
                    selectedBlock.id,
                    event.target.value || undefined,
                  ),
                );
                setError(null);
              } catch (reason) {
                setError(
                  reason instanceof Error
                    ? reason.message
                    : "Unable to update entity binding.",
                );
              }
            }}
          >
            <option value="">No entity</option>
            {entityKeys.map((entityKey) => (
              <option key={entityKey} value={entityKey}>
                {entityKey}
              </option>
            ))}
          </select>
        </label>
        <button type="submit">Save route</button>
        {error && <small className="studio-error">{error}</small>}
      </form>
      <div className="page-block-actions" aria-label="Block actions">
        <label>
          Component
          <select
            value={newBlockType}
            onChange={(event) =>
              setNewBlockType(event.target.value as typeof newBlockType)
            }
          >
            {insertableBlockTypes.map((blockType) => (
              <option key={blockType} value={blockType}>
                {blockType}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          disabled={!selectedPage}
          onClick={() =>
            selectedPage &&
            applyEdit({
              type: "insert-block",
              pageId: selectedPage.id,
              blockType: newBlockType,
            })
          }
        >
          Insert block
        </button>
        <button
          type="button"
          disabled={!selectedPage || !selectedBlock}
          onClick={() =>
            selectedPage &&
            selectedBlock &&
            applyEdit({
              type: "copy-block",
              pageId: selectedPage.id,
              blockId: selectedBlock.id,
            })
          }
        >
          Copy block
        </button>
        <button
          type="button"
          disabled={!selectedPage || !selectedBlock}
          onClick={() =>
            selectedPage &&
            selectedBlock &&
            applyEdit({
              type: "delete-block",
              pageId: selectedPage.id,
              blockId: selectedBlock.id,
            })
          }
        >
          Delete block
        </button>
      </div>
      <section className="design-panel" aria-label="Design panel">
        <label>
          Page layout
          <select
            value={
              experience.designSystem?.selection.pageLayouts[
                selectedPage?.id ?? ""
              ] ?? ""
            }
            onChange={(event) =>
              selectedPage &&
              applyEdit({
                type: "set-page-layout",
                pageId: selectedPage.id,
                layout: event.target.value as never,
              })
            }
          >
            <option value="">Auto</option>
            {EXPERIENCE_DESIGN_SYSTEM_CATALOGUE.pageLayouts.map((layout) => (
              <option key={layout} value={layout}>
                {layout}
              </option>
            ))}
          </select>
        </label>
        <label>
          Density
          <select
            value={experience.designSystem?.selection.density ?? "standard"}
            onChange={(event) =>
              applyEdit({
                type: "set-density",
                density: event.target.value as never,
              })
            }
          >
            {EXPERIENCE_DESIGN_SYSTEM_CATALOGUE.density.map((density) => (
              <option key={density} value={density}>
                {density}
              </option>
            ))}
          </select>
        </label>
        <label>
          Shell
          <select
            value={experience.designSystem?.selection.shell ?? "sidebar"}
            onChange={(event) =>
              applyEdit({
                type: "set-shell",
                shell: event.target.value as never,
              })
            }
          >
            {EXPERIENCE_DESIGN_SYSTEM_CATALOGUE.shell.map((shell) => (
              <option key={shell} value={shell}>
                {shell}
              </option>
            ))}
          </select>
        </label>
        {Object.entries(EXPERIENCE_DESIGN_SYSTEM_CATALOGUE.components).map(
          ([component, variants]) => (
            <label key={component}>
              {component} variant
              <select
                value={
                  experience.designSystem?.components[component] ?? variants[0]
                }
                onChange={(event) =>
                  applyEdit({
                    type: "set-component-variant",
                    component,
                    variant: event.target.value,
                  })
                }
              >
                {variants.map((variant) => (
                  <option key={variant} value={variant}>
                    {variant}
                  </option>
                ))}
              </select>
            </label>
          ),
        )}
        <label>
          Token group
          <select
            value={tokenGroup}
            onChange={(event) =>
              setTokenGroup(event.target.value as typeof tokenGroup)
            }
          >
            {tokenGroups.map((group) => (
              <option key={group} value={group}>
                {group}
              </option>
            ))}
          </select>
        </label>
        {tokenGroup === "colour" && (
          <label>
            Mode
            <select
              value={tokenMode}
              onChange={(event) =>
                setTokenMode(event.target.value as "light" | "dark")
              }
            >
              <option value="light">light</option>
              <option value="dark">dark</option>
            </select>
          </label>
        )}
        <label>
          Token key
          <input
            value={tokenKey}
            onChange={(event) => setTokenKey(event.target.value)}
          />
        </label>
        <label>
          Token value
          <input
            value={tokenValue}
            onChange={(event) => setTokenValue(event.target.value)}
          />
        </label>
        <button
          type="button"
          onClick={() => {
            const applied = applyEdit({
              type: "set-design-token",
              group: tokenGroup,
              key: tokenKey.trim(),
              value: tokenValue.trim(),
              ...(tokenGroup === "colour" ? { mode: tokenMode } : {}),
            });
            if (applied) setTokenValue("");
          }}
        >
          Set token
        </button>
      </section>
      <Puck
        config={config}
        data={editorData}
        headerTitle={selectedPage?.title ?? "Page"}
        onChange={proposeEditorData}
        onPublish={proposeEditorData}
      />
    </section>
  );
}
