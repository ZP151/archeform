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
        "DraftPreviewSnapshot",
        "PublishedRevision",
        "Compilation",
        "PreviewRun",
        "Artifact",
        "ProviderMetadata",
        "VerificationRun",
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
    expect(field("Compilation", "verificationRuns")).toMatchObject({
      type: "VerificationRun",
      isList: true,
    });
  });

  it("persists bounded verification evidence against an immutable compilation", () => {
    expect(field("VerificationRun", "verificationRunId")).toMatchObject({
      type: "String",
      isRequired: true,
      isUnique: true,
    });
    expect(field("VerificationRun", "compilationId")).toMatchObject({
      type: "String",
      isRequired: true,
    });
    // Optional: without a profile key the worker derives the verification
    // plan from the Published Graph itself.
    expect(field("VerificationRun", "profileKey")).toMatchObject({
      type: "String",
      isRequired: false,
    });
    expect(field("VerificationRun", "status")).toMatchObject({
      type: "String",
      isRequired: true,
    });
    expect(field("VerificationRun", "stepIds")).toMatchObject({
      type: "Json",
      isRequired: true,
    });
    expect(field("VerificationRun", "evidenceDigest")).toMatchObject({
      type: "String",
      isRequired: false,
    });
    expect(field("VerificationRun", "evidence")).toMatchObject({
      type: "Json",
      isRequired: false,
    });
    expect(field("VerificationRun", "diagnosis")).toMatchObject({
      type: "Json",
      isRequired: false,
    });
    expect(field("VerificationRun", "draftDiff")).toMatchObject({
      type: "Json",
      isRequired: false,
    });
    expect(field("VerificationRun", "compilation")).toMatchObject({
      type: "Compilation",
      isRequired: true,
    });
    expect(
      model("VerificationRun").fields.some(({ name }) =>
        /secret|token|credential|password/i.test(name),
      ),
    ).toBe(false);
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

  it("stores curated-template origin separately from Graph truth and binds append-only preview snapshots to a Draft", () => {
    expect(field("ApplicationGraph", "templateOrigin")).toMatchObject({
      type: "Json",
      isRequired: false,
    });
    expect(field("ApplicationGraph", "draftPreviewSnapshots")).toMatchObject({
      type: "DraftPreviewSnapshot",
      isList: true,
    });
    expect(field("DraftRevision", "draftPreviewSnapshots")).toMatchObject({
      type: "DraftPreviewSnapshot",
      isList: true,
    });
    expect(field("DraftPreviewSnapshot", "snapshot")).toMatchObject({
      type: "Json",
      isRequired: true,
    });
    expect(field("DraftPreviewSnapshot", "draftRevision")).toMatchObject({
      relationFromFields: ["draftRevisionId", "applicationGraphId"],
      relationToFields: ["id", "applicationGraphId"],
    });
    expect(field("DraftPreviewSnapshot", "draftRevisionId").isUnique).toBe(
      false,
    );
    expect(
      model("DraftPreviewSnapshot").fields.some(({ name }) =>
        /secret|credential|provider|prompt|response|source|environment/i.test(
          name,
        ),
      ),
    ).toBe(false);
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

  it("persists only schema-valid composition review records against a Draft", () => {
    expect(field("CompositionReview", "applicationGraphId")).toMatchObject({
      type: "String",
      isRequired: true,
    });
    expect(field("CompositionReview", "draftRevisionId")).toMatchObject({
      type: "String",
      isRequired: true,
    });
    expect(field("CompositionReview", "requirement")).toMatchObject({
      type: "Json",
      isRequired: true,
    });
    expect(field("CompositionReview", "requirementChecksum")).toMatchObject({
      type: "String",
      isRequired: true,
    });
    expect(field("CompositionReview", "draftBaseChecksum")).toMatchObject({
      type: "String",
      isRequired: true,
    });
    expect(field("CompositionReview", "plan")).toMatchObject({
      type: "Json",
      isRequired: false,
    });
    expect(field("CompositionReview", "planChecksum")).toMatchObject({
      type: "String",
      isRequired: false,
    });
    expect(field("CompositionReview", "clarification")).toMatchObject({
      type: "Json",
      isRequired: false,
    });
    expect(field("CompositionReview", "safeSummary")).toMatchObject({
      type: "Json",
      isRequired: false,
    });
    expect(field("CompositionReview", "diff")).toMatchObject({
      type: "Json",
      isRequired: false,
    });
    expect(field("CompositionReview", "diffChecksum")).toMatchObject({
      type: "String",
      isRequired: false,
    });
    expect(field("CompositionReview", "decision")).toMatchObject({
      type: "Json",
      isRequired: false,
    });
    expect(field("CompositionReview", "decisionId")).toMatchObject({
      type: "String",
      isRequired: false,
      isUnique: true,
    });
    expect(field("CompositionReview", "draftRevision")).toMatchObject({
      relationFromFields: ["draftRevisionId", "applicationGraphId"],
      relationToFields: ["id", "applicationGraphId"],
    });
    expect(
      model("CompositionReview").fields.some(({ name }) =>
        /secret|token|credential|password|prompt|rawModel/i.test(name),
      ),
    ).toBe(false);
  });
});
