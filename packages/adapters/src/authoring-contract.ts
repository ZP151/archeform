import {
  parseFlowModel,
  parsePageModel,
  type FlowModel,
  type PageModel,
} from "@factory/graph";

export type AuthoringFragment = PageModel | FlowModel;
export type AuthoringFragmentKind = "page" | "flow";

export type AuthoringDocumentV1 = {
  readonly apiVersion: "factory.authoring-adapter/v1";
  readonly adapter: string;
  readonly fragment: AuthoringFragmentKind;
  readonly graph: AuthoringFragment;
};

export interface AuthoringAdapterV1<TDocument> {
  readonly key: string;
  exportGraph(fragment: AuthoringFragment): TDocument;
  importGraph(document: unknown): AuthoringFragment;
}

type AuthoringAdapterOptions = {
  readonly key: string;
  readonly fragment: AuthoringFragmentKind;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function parseFragment(kind: AuthoringFragmentKind, input: unknown): AuthoringFragment {
  return kind === "page" ? parsePageModel(input) : parseFlowModel(input);
}

function unsupportedDocument(): never {
  throw new Error("Unsupported authoring document.");
}

/**
 * Creates a bounded authoring adapter. The adapter serializes only a declared
 * Graph fragment and rejects scripts, unknown envelopes, and cross-adapter
 * documents before a visual tool can influence Factory state.
 */
export function createAuthoringAdapter(
  options: AuthoringAdapterOptions,
): AuthoringAdapterV1<AuthoringDocumentV1> {
  return {
    key: options.key,
    exportGraph(fragment) {
      return {
        apiVersion: "factory.authoring-adapter/v1",
        adapter: options.key,
        fragment: options.fragment,
        graph: structuredClone(parseFragment(options.fragment, fragment)),
      };
    },
    importGraph(document) {
      if (!isRecord(document)) unsupportedDocument();
      const allowedKeys = new Set(["apiVersion", "adapter", "fragment", "graph"]);
      if (Object.keys(document).some((key) => !allowedKeys.has(key))) {
        unsupportedDocument();
      }
      if (
        document.apiVersion !== "factory.authoring-adapter/v1" ||
        document.adapter !== options.key ||
        document.fragment !== options.fragment ||
        !("graph" in document)
      ) {
        unsupportedDocument();
      }
      try {
        return structuredClone(parseFragment(options.fragment, document.graph));
      } catch {
        unsupportedDocument();
      }
    },
  };
}
