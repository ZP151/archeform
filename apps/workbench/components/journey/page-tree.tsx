"use client";

import { ChevronDown, ChevronUp, FileText, Plus } from "lucide-react";
import { useState } from "react";
import type { PageModel } from "@factory/graph";

/**
 * The generated page tree: selection, declared order, and constrained page
 * creation. Nothing here names routes or components — the parent Studio
 * turns move/add intents into bounded page edits.
 */
export function PageTree({
  pageModel,
  selectedPageId,
  onSelect,
  onMove,
  onAddPage,
  addError,
}: {
  pageModel: PageModel;
  selectedPageId: string;
  onSelect: (pageId: string) => void;
  onMove: (pageId: string, direction: -1 | 1) => void;
  onAddPage: (title: string) => void;
  addError: string | null;
}) {
  const [newPageTitle, setNewPageTitle] = useState("");

  return (
    <aside className="page-tree" aria-label="Generated pages">
      <div className="page-tree-heading">
        <span>Pages</span>
        <small>{pageModel.pages.length}</small>
      </div>
      <ol className="page-tree-list">
        {pageModel.pages.map((page, index) => {
          const active = page.id === selectedPageId;
          return (
            <li
              key={page.id}
              className={active ? "page-tree-row active" : "page-tree-row"}
            >
              <button
                type="button"
                className="page-tree-item"
                aria-current={active ? "page" : undefined}
                onClick={() => onSelect(page.id)}
              >
                <FileText size={14} />
                <span>{page.title}</span>
                <small>{page.route}</small>
              </button>
              <div className="page-tree-moves">
                <button
                  type="button"
                  aria-label={`Move ${page.title} up`}
                  disabled={index === 0}
                  onClick={() => onMove(page.id, -1)}
                >
                  <ChevronUp size={14} />
                </button>
                <button
                  type="button"
                  aria-label={`Move ${page.title} down`}
                  disabled={index === pageModel.pages.length - 1}
                  onClick={() => onMove(page.id, 1)}
                >
                  <ChevronDown size={14} />
                </button>
              </div>
            </li>
          );
        })}
      </ol>
      <form
        className="page-tree-add"
        onSubmit={(event) => {
          event.preventDefault();
          const title = newPageTitle.trim();
          if (!title) return;
          onAddPage(title);
          setNewPageTitle("");
        }}
      >
        <input
          aria-label="New page title"
          placeholder="New page title"
          value={newPageTitle}
          onChange={(event) => setNewPageTitle(event.target.value)}
        />
        <button type="submit" aria-label="Add page">
          <Plus size={14} />
        </button>
      </form>
      {addError && <p className="page-tree-error">{addError}</p>}
    </aside>
  );
}
