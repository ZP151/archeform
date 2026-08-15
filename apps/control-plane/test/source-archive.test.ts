import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from "@nestjs/common";
import { createHash } from "node:crypto";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { LifecycleService } from "../src/lifecycle.service.js";
import type { PrismaService } from "../src/prisma.service.js";

const temporaryRoots: string[] = [];

function sha256(content: string): string {
  return `sha256:${createHash("sha256").update(content, "utf8").digest("hex")}`;
}

const indexHtml = "<html></html>\n";
const appMjs = "console.log(1);\n";

describe("getCompilationSourceArchive", () => {
  let service: LifecycleService;
  let prisma: { compilation: { findUnique: ReturnType<typeof vi.fn> } };
  let rootDirectory: string;

  beforeEach(async () => {
    const root = await mkdtemp(join(tmpdir(), "source-archive-"));
    temporaryRoots.push(root);
    rootDirectory = "compilation-1";
    await mkdir(join(root, rootDirectory), { recursive: true });
    await writeFile(join(root, rootDirectory, "app.mjs"), appMjs);
    await writeFile(join(root, rootDirectory, "index.html"), indexHtml);
    process.env.FACTORY_ARTIFACT_ROOT = root;

    prisma = { compilation: { findUnique: vi.fn() } };
    service = new (
      LifecycleService as unknown as new (
        prismaService: PrismaService,
        queue: unknown,
        provider: unknown,
        previewQueue: unknown,
      ) => LifecycleService
    )(
      prisma as unknown as PrismaService,
      { enqueue: vi.fn() },
      { propose: vi.fn() },
      { enqueue: vi.fn() },
    );
  });

  afterEach(async () => {
    delete process.env.FACTORY_ARTIFACT_ROOT;
    await Promise.all(
      temporaryRoots
        .splice(0)
        .map((root) => rm(root, { recursive: true, force: true })),
    );
  });

  const succeededArtifacts = () => [
    {
      path: "app.mjs",
      digest: sha256(appMjs),
      metadata: { rootDirectory },
    },
    {
      path: "index.html",
      digest: sha256(indexHtml),
      metadata: { rootDirectory },
    },
  ];

  it("returns a deterministic ZIP for format=zip", async () => {
    prisma.compilation.findUnique.mockResolvedValue({
      id: "compilation-1",
      result: { status: "succeeded" },
      artifacts: succeededArtifacts(),
    });

    const first = await service.getCompilationSourceArchive(
      "compilation-1",
      "zip",
    );
    const second = await service.getCompilationSourceArchive(
      "compilation-1",
      "zip",
    );

    expect(first.filename).toBe("compilation-1.zip");
    expect(first.contentType).toBe("application/zip");
    expect(Buffer.from(first.bytes).subarray(0, 2).toString()).toBe("PK");
    expect(Buffer.from(first.bytes)).toEqual(Buffer.from(second.bytes));
  });

  it("returns deterministic git object bytes for format=git", async () => {
    prisma.compilation.findUnique.mockResolvedValue({
      id: "compilation-1",
      result: { status: "succeeded" },
      artifacts: succeededArtifacts(),
    });

    const first = await service.getCompilationSourceArchive(
      "compilation-1",
      "git",
    );
    const second = await service.getCompilationSourceArchive(
      "compilation-1",
      "git",
    );

    expect(first.filename).toBe("compilation-1.git");
    expect(first.contentType).toBe("application/octet-stream");
    expect(first.bytes.length).toBeGreaterThan(0);
    expect(Buffer.from(first.bytes)).toEqual(Buffer.from(second.bytes));
  });

  it("rejects an unknown format", async () => {
    await expect(
      service.getCompilationSourceArchive("compilation-1", "tar"),
    ).rejects.toThrow(BadRequestException);
  });

  it("rejects a non-succeeded compilation", async () => {
    prisma.compilation.findUnique.mockResolvedValue({
      id: "compilation-1",
      result: { status: "failed" },
      artifacts: [],
    });
    await expect(
      service.getCompilationSourceArchive("compilation-1", "zip"),
    ).rejects.toThrow(ConflictException);
  });

  it("rejects a missing compilation", async () => {
    prisma.compilation.findUnique.mockResolvedValue(null);
    await expect(
      service.getCompilationSourceArchive("compilation-1", "zip"),
    ).rejects.toThrow(NotFoundException);
  });

  it("rejects an altered artifact digest", async () => {
    prisma.compilation.findUnique.mockResolvedValue({
      id: "compilation-1",
      result: { status: "succeeded" },
      artifacts: [
        {
          path: "app.mjs",
          digest: sha256("tampered"),
          metadata: { rootDirectory },
        },
      ],
    });
    await expect(
      service.getCompilationSourceArchive("compilation-1", "zip"),
    ).rejects.toThrow(ConflictException);
  });
});
