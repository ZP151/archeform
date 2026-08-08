"use client";

import { useEffect, useMemo, useState } from "react";
import { pageModelToPuckDocument } from "@factory/adapters/browser";
import type { ExperienceModel, PageModel } from "@factory/graph";
import { addPage } from "../../lib/page-model";
import { applyStudioEdit } from "../../lib/product-journey/page-bindings";
import { PageStudio } from "../page-studio";
import { PageTree } from "./page-tree";
import { ResponsivePreview } from "./responsive-preview";

/**
 * The multi-page Product Studio: the generated page tree drives selection,
 * the Puck canvas edits the selected page, and the token-driven preview
 * reflects the same surface the compiled application renders. Every edit is
 * a constrained binding change — nothing here names routes, components,
 * CSS, or source code.
 */
export function ProductStudio({
  page,
  experience,
  entityKeys,
  onPageModelChange,
  onExperienceModelChange,
}: {
  page: PageModel;
  experience: ExperienceModel;
  entityKeys: readonly string[];
  onPageModelChange: (page: PageModel) => void;
  onExperienceModelChange: (experience: ExperienceModel) => void;
}) {
  const [selectedPageId, setSelectedPageId] = useState(page.pages[0]?.id ?? "");
  const [addPageError, setAddPageError] = useState<string | null>(null);

  useEffect(() => {
    if (!page.pages.some((entry) => entry.id === selectedPageId)) {
      setSelectedPageId(page.pages[0]?.id ?? "");
    }
  }, [page.pages, selectedPageId]);

  const pageDocument = useMemo(() => pageModelToPuckDocument(page), [page]);
  const selectedPage =
    page.pages.find((entry) => entry.id === selectedPageId) ?? page.pages[0];

  const movePage = (pageId: string, direction: -1 | 1) => {
    const index = page.pages.findIndex((entry) => entry.id === pageId);
    if (index === -1) return;
    try {
      const result = applyStudioEdit(
        { page, experience, entityKeys },
        { type: "reorder-page", pageId, position: index + direction },
      );
      onPageModelChange(result.page);
    } catch (reason) {
      setAddPageError(
        reason instanceof Error ? reason.message : "Unable to move page.",
      );
    }
  };

  const addGeneratedPage = (name: string) => {
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    if (!slug) {
      setAddPageError("Page title needs at least one letter or number.");
      return;
    }
    try {
      const next = addPage(page, {
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
      setAddPageError(null);
    } catch (reason) {
      setAddPageError(
        reason instanceof Error ? reason.message : "Unable to add page.",
      );
    }
  };

  return (
    <section
      className="product-studio studio-shell"
      aria-label="Product Studio"
    >
      <div className="studio-intro">
        <div>
          <span>Product Studio</span>
          <strong>Multi-page composition</strong>
        </div>
        <small>Changes are proposed to this Draft only.</small>
      </div>
      <div className="product-studio-body">
        <PageTree
          pageModel={page}
          selectedPageId={selectedPageId}
          onSelect={setSelectedPageId}
          onMove={movePage}
          onAddPage={addGeneratedPage}
          addError={addPageError}
        />
        <PageStudio
          pageDocument={pageDocument}
          experience={experience}
          entityKeys={entityKeys}
          selectedPageId={selectedPageId}
          onPageModelChange={onPageModelChange}
          onExperienceModelChange={onExperienceModelChange}
        />
        {selectedPage && (
          <ResponsivePreview page={selectedPage} experience={experience} />
        )}
      </div>
    </section>
  );
}
