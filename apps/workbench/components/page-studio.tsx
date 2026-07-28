"use client";

import { useMemo, useState } from "react";
import { Puck, type Config, type Data } from "@puckeditor/core";
import "@puckeditor/core/puck.css";
import type { PuckPageDocument } from "@factory/adapters";

type Props = {
  pageDocument: PuckPageDocument;
  onDraftProposal: (source: string) => void;
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

export function PageStudio({ pageDocument, onDraftProposal }: Props) {
  const editorSeed = useMemo(() => toEditorData(pageDocument), [pageDocument]);
  const [editorData, setEditorData] = useState<Data>(editorSeed);

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
        onChange={(nextData) => {
          setEditorData(nextData);
          onDraftProposal("Puck Page Studio");
        }}
        onPublish={(nextData) => {
          setEditorData(nextData);
          onDraftProposal("Puck Page Studio publish proposal");
        }}
      />
    </section>
  );
}
