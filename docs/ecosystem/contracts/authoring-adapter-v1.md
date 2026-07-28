# Authoring Adapter v1

An authoring adapter converts one declared Factory Graph fragment to and from a
visual-tool document. It never stores the tool document as an Application
Graph, evaluates code, or gives a tool permission to mutate a Published
Revision.

## Contract

```ts
interface AuthoringAdapterV1<TDocument> {
  readonly key: string;
  exportGraph(fragment: PageModel | FlowModel): TDocument;
  importGraph(document: unknown): PageModel | FlowModel;
}
```

Factory's v1 envelope is `factory.authoring-adapter/v1`. It contains the
adapter key, one fragment kind (`page` or `flow`), and a schema-validated Graph
fragment. Unknown envelope keys, mismatched adapter identities, executable
documents, and malformed fragments fail closed with `Unsupported authoring
document.`

Puck and React Flow remain direct projection adapters. Blockly, BPMN, and any
future authoring system must use this contract or a later versioned successor;
they may not introduce unrestricted source code or a second business-model
store.
