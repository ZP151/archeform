"use client";

import { useEffect, useMemo, useState } from "react";
import { Puck, type Config, type Data } from "@puckeditor/core";
import "@puckeditor/core/puck.css";
import type { PuckPageDocument } from "@factory/adapters";
import type { PageModel } from "@factory/graph";
import { replaceHeroHeading } from "../lib/page-model";

type Props = {
  pageDocument: PuckPageDocument;
  onDraftProposal: (source: string) => void;
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
  },
};

function toEditorData(document: PuckPageDocument): Data {
  const hero = document.pageModel.pages[0]?.blocks.find(
    (block) => block.type === "hero",
  );
  return {
    root: { props: {} },
    content: [
      {
        type: "Hero",
        props: {
          id: hero?.id ?? "request-hero",
          eyebrow: "Operations",
          heading: String(
            hero?.props?.heading ?? "Move work through the right decision.",
          ),
        },
      },
    ],
  };
}

export function PageStudio({
  pageDocument,
  onDraftProposal,
  onPageModelChange,
}: Props) {
  const editorSeed = useMemo(() => toEditorData(pageDocument), [pageDocument]);
  const [editorData, setEditorData] = useState<Data>(editorSeed);

  useEffect(() => setEditorData(editorSeed), [editorSeed]);

  const proposeEditorData = (nextData: Data, source: string) => {
    setEditorData(nextData);
    const hero = nextData.content.find((block) => block.type === "Hero");
    const blockId = hero?.props.id;
    const heading = hero?.props.heading;
    if (typeof blockId === "string" && typeof heading === "string") {
      onPageModelChange(
        replaceHeroHeading(pageDocument.pageModel, blockId, heading),
      );
    }
    onDraftProposal(source);
  };

  return (
    <section className="studio-shell puck-studio" aria-label="Puck Page Studio">
      <div className="studio-intro">
        <div>
          <span>Puck Page Studio</span>
          <strong>Page composition</strong>
        </div>
        <small>Changes are proposed to this Draft only.</small>
      </div>
      <Puck
        config={config}
        data={editorData}
        headerTitle="Request intake"
        onChange={(nextData) => proposeEditorData(nextData, "Puck Page Studio")}
        onPublish={(nextData) =>
          proposeEditorData(nextData, "Puck Page Studio publish proposal")
        }
      />
    </section>
  );
}
