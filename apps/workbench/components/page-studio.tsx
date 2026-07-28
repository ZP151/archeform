"use client";

import { useEffect, useMemo, useState } from "react";
import { Puck, type Config, type Data } from "@puckeditor/core";
import "@puckeditor/core/puck.css";
import type { PuckPageDocument } from "@factory/adapters/browser";
import type { PageModel } from "@factory/graph";
import { addPage, setPageBlockEntity, setPageDetails } from "../lib/page-model";
import {
  applyPuckBlocksToPageModel,
  pageModelToPuckBlocks,
  puckBlockTypes,
  type PuckBlockType,
  type PuckVisualBlock,
} from "../lib/puck-page-model";

type Props = {
  pageDocument: PuckPageDocument;
  entityKeys: readonly string[];
  onPageModelChange: (page: PageModel) => void;
};

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
    Collection: {
      fields: { title: { type: "text" } },
      render: ({ title }) => <PuckDataBlock kind="Collection" title={title} />,
    },
    Form: {
      fields: { title: { type: "text" } },
      render: ({ title }) => <PuckDataBlock kind="Form" title={title} />,
    },
    Catalog: {
      fields: { title: { type: "text" } },
      render: ({ title }) => <PuckDataBlock kind="Catalog" title={title} />,
    },
    Cart: {
      fields: { title: { type: "text" } },
      render: ({ title }) => <PuckDataBlock kind="Cart" title={title} />,
    },
    Queue: {
      fields: { title: { type: "text" } },
      render: ({ title }) => <PuckDataBlock kind="Queue" title={title} />,
    },
    Checkout: {
      fields: { title: { type: "text" } },
      render: ({ title }) => <PuckDataBlock kind="Checkout" title={title} />,
    },
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
  entityKeys,
  onPageModelChange,
}: Props) {
  const [selectedPageId, setSelectedPageId] = useState(
    pageDocument.pageModel.pages[0]?.id ?? "",
  );
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
  const [newPageTitle, setNewPageTitle] = useState("");
  const [selectedBlockId, setSelectedBlockId] = useState(
    selectedPage?.blocks[0]?.id ?? "",
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => setEditorData(editorSeed), [editorSeed]);
  useEffect(() => {
    if (
      !pageDocument.pageModel.pages.some((page) => page.id === selectedPageId)
    ) {
      setSelectedPageId(pageDocument.pageModel.pages[0]?.id ?? "");
    }
  }, [pageDocument.pageModel.pages, selectedPageId]);
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

  const createPage = () => {
    const name = newPageTitle.trim();
    if (!name) return;
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    if (!slug) {
      setError("Page title needs at least one letter or number.");
      return;
    }
    try {
      const next = addPage(pageDocument.pageModel, {
        id: `${slug}-page`,
        route: `/${slug}`,
        title: name,
        blocks: [
          {
            id: `${slug}-hero`,
            type: "hero",
            props: { eyebrow: "New route", heading: name },
          },
        ],
        navigation: { id: slug, label: name, icon: "layout" },
      });
      onPageModelChange(next);
      setSelectedPageId(`${slug}-page`);
      setNewPageTitle("");
      setError(null);
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Unable to add page.",
      );
    }
  };

  const selectedBlock = selectedPage?.blocks.find(
    (block) => block.id === selectedBlockId,
  );

  return (
    <section className="studio-shell puck-studio" aria-label="Puck Page Studio">
      <div className="studio-intro">
        <div>
          <span>Puck Page Studio</span>
          <strong>Page composition</strong>
        </div>
        <small>Changes are proposed to this Draft only.</small>
      </div>
      <form
        className="page-route-editor"
        onSubmit={(event) => {
          event.preventDefault();
          saveRouteDetails();
        }}
      >
        <label>
          Route
          <select
            value={selectedPage?.id ?? ""}
            onChange={(event) => setSelectedPageId(event.target.value)}
          >
            {pageDocument.pageModel.pages.map((page) => (
              <option key={page.id} value={page.id}>
                {page.route}
              </option>
            ))}
          </select>
        </label>
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
        <label className="new-page-field">
          New page
          <input
            placeholder="Order tracking"
            value={newPageTitle}
            onChange={(event) => setNewPageTitle(event.target.value)}
          />
        </label>
        <button type="button" onClick={createPage}>
          Add page
        </button>
        {error && <small className="studio-error">{error}</small>}
      </form>
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
