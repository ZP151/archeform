import { Prisma } from "@prisma/client";
import { describe, expect, it } from "vitest";

function model(name: string) {
  const found = Prisma.dmmf.datamodel.models.find(
    (candidate) => candidate.name === name,
  );
  expect(found, `missing Prisma model ${name}`).toBeDefined();
  return found!;
}

function field(modelName: string, fieldName: string) {
  const found = model(modelName).fields.find(
    (candidate) => candidate.name === fieldName,
  );
  expect(found, `missing Prisma field ${modelName}.${fieldName}`).toBeDefined();
  return found!;
}

describe("control-plane lifecycle schema", () => {
  it("models the workspace-to-compilation ownership chain", () => {
    expect(Prisma.dmmf.datamodel.models.map(({ name }) => name)).toEqual(
      expect.arrayContaining([
        "Workspace",
        "ApplicationGraph",
        "DraftRevision",
        "PublishedRevision",
        "Compilation",
        "PreviewRun",
        "Artifact",
        "ProviderMetadata",
      ]),
    );

    expect(field("Workspace", "applicationGraphs")).toMatchObject({
      type: "ApplicationGraph",
      isList: true,
    });
    expect(field("ApplicationGraph", "draftRevisions")).toMatchObject({
      type: "DraftRevision",
      isList: true,
    });
    expect(field("ApplicationGraph", "publishedRevisions")).toMatchObject({
      type: "PublishedRevision",
      isList: true,
    });
    expect(field("PublishedRevision", "compilations")).toMatchObject({
      type: "Compilation",
      isList: true,
    });
    expect(field("Compilation", "artifacts")).toMatchObject({
      type: "Artifact",
      isList: true,
    });
    expect(field("Compilation", "previewRuns")).toMatchObject({
      type: "PreviewRun",
      isList: true,
    });
    expect(field("Compilation", "providerMetadata")).toMatchObject({
      type: "ProviderMetadata",
      isList: true,
    });
  });

  it("persists preview runs against an immutable compilation without runtime source or credentials", () => {
    expect(field("PreviewRun", "compilationId")).toMatchObject({
      type: "String",
      isRequired: true,
    });
    expect(field("PreviewRun", "sequence")).toMatchObject({
      type: "Int",
      isRequired: true,
    });
    expect(field("PreviewRun", "activeKey")).toMatchObject({
      type: "String",
      isRequired: false,
      isUnique: true,
    });
    expect(field("PreviewRun", "composeProjectName")).toMatchObject({
      type: "String",
      isRequired: true,
    });
    expect(field("PreviewRun", "webPort")).toMatchObject({
      type: "Int",
      isRequired: false,
    });
    expect(field("PreviewRun", "apiPort")).toMatchObject({
      type: "Int",
      isRequired: false,
    });
    expect(field("PreviewRun", "previewUrl")).toMatchObject({
      type: "String",
      isRequired: false,
    });
    expect(field("PreviewRun", "compilation")).toMatchObject({
      type: "Compilation",
      isRequired: true,
    });
    expect(model("PreviewRun").uniqueFields).toContainEqual([
      "compilationId",
      "sequence",
    ]);
    expect(
      model("PreviewRun").fields.some(({ name }) =>
        /graph|source|credential|token|command|environment|directory|path/i.test(
          name,
        ),
      ),
    ).toBe(false);
  });

  it("stores draft and published graph snapshots as JSON", () => {
    expect(field("DraftRevision", "graph")).toMatchObject({
      type: "Json",
      isRequired: true,
    });
    expect(field("PublishedRevision", "graph")).toMatchObject({
      type: "Json",
      isRequired: true,
    });
    expect(field("PublishedRevision", "graphHash")).toMatchObject({
      type: "String",
      isRequired: true,
    });
  });

  it("allows compilations to consume only immutable published revisions", () => {
    expect(field("Compilation", "publishedRevisionId")).toMatchObject({
      type: "String",
      isRequired: true,
    });
    expect(field("Compilation", "publishedRevision")).toMatchObject({
      type: "PublishedRevision",
      isRequired: true,
    });
    expect(
      model("Compilation").fields.some(
        ({ name }) => name === "draftRevisionId",
      ),
    ).toBe(false);
    expect(
      model("Compilation").fields.some(({ name }) => name === "draftRevision"),
    ).toBe(false);
  });

  it("publishes a draft revision only within the same application graph", () => {
    expect(field("PublishedRevision", "sourceDraftRevision")).toMatchObject({
      relationFromFields: ["sourceDraftRevisionId", "applicationGraphId"],
      relationToFields: ["id", "applicationGraphId"],
    });
  });

  it("keeps published revisions and compilations append-only by omitting update timestamps", () => {
    expect(
      model("PublishedRevision").fields.some(
        ({ name }) => name === "updatedAt",
      ),
    ).toBe(false);
    expect(
      model("Compilation").fields.some(({ name }) => name === "updatedAt"),
    ).toBe(false);
    expect(model("PublishedRevision").uniqueFields).toContainEqual([
      "sourceDraftRevisionId",
      "applicationGraphId",
    ]);
  });

  it("stores only non-secret resolved provider metadata on a compilation", () => {
    expect(field("ProviderMetadata", "compilationId")).toMatchObject({
      type: "String",
      isRequired: true,
    });
    expect(field("ProviderMetadata", "provider")).toMatchObject({
      type: "String",
      isRequired: true,
    });
    expect(field("ProviderMetadata", "version")).toMatchObject({
      type: "String",
      isRequired: true,
    });
    expect(field("ProviderMetadata", "resolvedConfig")).toMatchObject({
      type: "Json",
      isRequired: true,
    });
    expect(
      model("ProviderMetadata").fields.some(({ name }) =>
        /secret|token|credential|password/i.test(name),
      ),
    ).toBe(false);
  });
});
