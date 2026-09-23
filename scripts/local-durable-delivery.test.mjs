import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile, rm, symlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createServer } from "node:http";
import { once } from "node:events";
import {
  parseCli,
  manifestFor,
  checkCompatibility,
  materialize,
  verifyTree,
  ownership,
  assertOwned,
  createGateway,
  safeCode,
  runCommand,
  cleanupOwned,
} from "./local-durable-delivery.mjs";

let fixtureModule;
function loadFixtureModule() {
  return (fixtureModule ??= (async () => {
    const ts = await import("typescript");
    const helperUrl = new URL(
      "../e2e/helpers/durable-delivery-fixture.ts",
      import.meta.url,
    );
    // Node 22.11 does not load TypeScript natively. Transpile the actual helper
    // in memory, keeping its public package imports pointed at their real files.
    const { outputText } = ts.transpileModule(
      await readFile(helperUrl, "utf8"),
      {
        compilerOptions: {
          module: ts.ModuleKind.ESNext,
          target: ts.ScriptTarget.ES2022,
        },
        transformers: {
          before: [
            (context) => (source) =>
              ts.visitEachChild(
                source,
                (node) => {
                  if (
                    !ts.isImportDeclaration(node) ||
                    !node.moduleSpecifier.text.startsWith(".")
                  )
                    return node;
                  return context.factory.updateImportDeclaration(
                    node,
                    node.modifiers,
                    node.importClause,
                    context.factory.createStringLiteral(
                      new URL(node.moduleSpecifier.text, helperUrl).href,
                    ),
                    node.attributes,
                  );
                },
                context,
              ),
          ],
        },
      },
    );
    return import(
      `data:text/javascript;base64,${Buffer.from(outputText).toString("base64")}`
    );
  })());
}

const fixture = (title, revision) => {
  const graph = {
    application: { id: "same-app" },
    domain: { entities: [] },
    policy: {},
    flows: [],
    page: { pages: [{ id: "list", title }] },
  };
  const files = [
    { path: "database/prisma/schema.prisma", content: "schema" },
    { path: "api/prisma/schema.prisma", content: "schema" },
    { path: "api/package.json", content: "{}" },
    { path: "database/package.json", content: "{}" },
    { path: "api/Dockerfile", content: "FROM node:22-alpine" },
    { path: "database/Dockerfile", content: "FROM node:22-alpine" },
    { path: "web/page.tsx", content: title },
  ];
  return {
    graph,
    graphHash: revision,
    publishedRevisionId: revision,
    compositionLock: {
      applicationGraphChecksum: revision,
      packages: [],
      bindings: [],
    },
    files,
    manifest: manifestFor(files),
  };
};
test("CLI admits exactly plan or run and never echoes input", () => {
  assert.equal(parseCli(["plan"]), "plan");
  assert.equal(parseCli(["run"]), "run");
  for (const args of [
    [],
    ["plan", "secret"],
    ["--url=https://secret"],
    ["cleanup"],
  ])
    assert.throws(() => parseCli(args), /^Error: delivery.arguments_invalid$/);
});
test("same app title-only pair has distinct immutable bundle identities", () => {
  const a = fixture("A", "a"),
    b = fixture("B", "b");
  assert.match(checkCompatibility(a, b, "list"), /^[a-f0-9]{64}$/);
  assert.equal(a.graph.page.pages[0].title, "A");
  for (const mutate of [
    (b) => (b.graph.application.id = "other"),
    (b) => (b.graph.policy = { allow: true }),
    (b) => (b.compositionLock.applicationGraphChecksum = "wrong"),
    (b) => (b.compositionLock.packages = ["new"]),
    (b) => (b.publishedRevisionId = "a"),
    (b) => b.graph.page.pages.push({ id: "extra", title: "B" }),
  ]) {
    const next = fixture("B", "b");
    mutate(next);
    assert.throws(() => checkCompatibility(a, next, "list"));
  }
});
test("database contract rejects changed, missing and extra files before candidate commands", () => {
  const a = fixture("A", "a");
  for (const mutate of [
    (b) => (b.files[0].content = "new schema"),
    (b) => b.files.shift(),
    (b) => b.files.push({ path: "api/prisma/new.sql", content: "ALTER" }),
  ]) {
    const b = fixture("B", "b");
    mutate(b);
    b.manifest = manifestFor(b.files);
    assert.throws(
      () => checkCompatibility(a, b, "list"),
      /delivery.compatibility/,
    );
  }
});
test("manifest rejects traversal, aliases, duplicates, absolute and drive paths", () => {
  for (const path of [
    "../x",
    "/x",
    "C:/x",
    "\\\\host\\x",
    "a\\b",
    "a/../b",
    "a//b",
    "a/./b",
    "a:b",
  ])
    assert.throws(() => manifestFor([{ path, content: "x" }]));
  assert.throws(() =>
    manifestFor([
      { path: "x", content: "a" },
      { path: "x", content: "b" },
    ]),
  );
});
test("complete artifact proof rejects altered bytes and extra files", async () => {
  const root = await mkdtemp(join(tmpdir(), "durable-test-"));
  const a = fixture("A", "a");
  try {
    await materialize(join(root, "a"), a);
    await verifyTree(join(root, "a"), a.manifest);
    await writeFile(join(root, "a", "extra"), "x");
    await assert.rejects(verifyTree(join(root, "a"), a.manifest));
    await rm(join(root, "a", "extra"));
    await writeFile(join(root, "a", "web", "page.tsx"), "tamper");
    await assert.rejects(verifyTree(join(root, "a"), a.manifest));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
test("materialization refuses preexisting directory and linked parents", async () => {
  const root = await mkdtemp(join(tmpdir(), "durable-test-"));
  try {
    await assert.rejects(materialize(root, fixture("A", "a")));
    await symlink(root, `${root}-link`, "junction");
    await assert.rejects(
      materialize(join(`${root}-link`, "a"), fixture("A", "a")),
    );
  } finally {
    await rm(`${root}-link`, { force: true });
    await rm(root, { recursive: true, force: true });
  }
});
test("ownership requires exact labels, names and application", () => {
  const owner = ownership("a".repeat(24), "same-app");
  const resource = { Name: owner.volume, Labels: owner.labels };
  assertOwned(resource, owner.volume, owner);
  for (const next of [
    { ...resource, Name: "factory-preview-existing" },
    { ...resource, Labels: {} },
    {
      ...resource,
      Labels: { ...owner.labels, "factory.durable.application": "other" },
    },
  ])
    assert.throws(
      () => assertOwned(next, owner.volume, owner),
      /delivery.ownership/,
    );
  assert.throws(() => ownership("../x", "same-app"));
});
test("cleanup ambiguity performs no removals and retains unrelated resources", async () => {
  const calls = [];
  const owner = ownership("a".repeat(24), "same-app");
  const adapter = {
    inspect: async () => ({ Name: owner.volume, Labels: {} }),
    remove: async (...args) => calls.push(args),
  };
  await assert.rejects(
    cleanupOwned(adapter, owner, [{ kind: "volume", name: owner.volume }]),
    /delivery.cleanup_required/,
  );
  assert.deepEqual(calls, []);
});
test("raw subprocess errors and secrets become fixed codes", async () => {
  assert.equal(
    safeCode(new Error("password=secret raw model response")),
    "delivery.failed",
  );
  await assert.rejects(
    runCommand(
      process.execPath,
      ["-e", "process.stderr.write('password=secret');process.exit(1)"],
      { timeout: 1000 },
    ),
    /^Error: delivery.command_failed$/,
  );
});
test("gateway retains A on failed readiness and drain timeout, then switches without replay", async () => {
  let release;
  let hitsA = 0,
    hitsB = 0;
  const a = createServer(async (req, res) => {
    hitsA++;
    if (req.url === "/slow") await new Promise((r) => (release = r));
    res.end("A");
  });
  const b = createServer((req, res) => {
    hitsB++;
    res.end("B");
  });
  a.listen(0, "127.0.0.1");
  b.listen(0, "127.0.0.1");
  await Promise.all([once(a, "listening"), once(b, "listening")]);
  const gateway = await createGateway({
    a: `http://127.0.0.1:${a.address().port}`,
    b: `http://127.0.0.1:${b.address().port}`,
  });
  try {
    assert.equal(await (await fetch(gateway.url)).text(), "A");
    await assert.rejects(
      gateway.promote("b", async () => false, 20),
      /delivery.readiness_failed/,
    );
    assert.equal(gateway.selected, "a");
    const slow = fetch(gateway.url + "/slow");
    while (!release) await new Promise((r) => setTimeout(r, 2));
    await assert.rejects(
      gateway.promote("b", async () => true, 20),
      /delivery.drain_timeout/,
    );
    assert.equal(gateway.selected, "a");
    release();
    await slow;
    await gateway.promote("b", async () => true, 100);
    assert.equal(await (await fetch(gateway.url)).text(), "B");
    assert.equal(hitsA, 2);
    assert.equal(hitsB, 1);
  } finally {
    await gateway.close();
    a.closeAllConnections();
    b.closeAllConnections();
    await Promise.all([
      new Promise((r) => a.close(r)),
      new Promise((r) => b.close(r)),
    ]);
  }
});
test("gateway rejects external destinations", async () => {
  await assert.rejects(
    createGateway({ a: "https://example.com", b: "http://127.0.0.1:1" }),
    /delivery.endpoint_invalid/,
  );
});

test("topology has external volumes, no database host ports, only loopback executables and no upgrade bootstrap dependency", async () => {
  const { composeDocument } = await import("./local-durable-delivery.mjs");
  const owner = ownership("a".repeat(24), "same-app");
  const doc = composeDocument(owner);
  assert.equal(doc.volumes.data.external, true);
  assert.equal(doc.volumes.restore.external, true);
  assert.equal(doc.services.postgres.ports, undefined);
  assert.equal(doc.services["b-api"].depends_on, undefined);
  assert.equal(doc.services["restore-api"].build, undefined);
  assert.match(doc.services["a-web"].ports[0], /^127\.0\.0\.1::/);
  assert.equal(
    doc.services.postgres.volumes[0],
    "data:/var/lib/postgresql/data",
  );
});
test("readiness deadline uses real false probes and no implicit success", async () => {
  const { pollReadiness } = await import("./local-durable-delivery.mjs");
  let time = 0,
    calls = 0;
  assert.equal(
    await pollReadiness(
      async () => {
        calls++;
        return false;
      },
      { timeout: 30, clock: () => time, sleep: async (ms) => (time += ms) },
    ),
    false,
  );
  assert.ok(calls > 0);
});
test("preflight failure is non-green and hides tool errors", async () => {
  const { preflight } = await import("./local-durable-delivery.mjs");
  await assert.rejects(
    preflight(async () => {
      throw new Error("credential=secret");
    }),
    /^Error: delivery.engine_unavailable$/,
  );
});
test("gateway endpoint replacement can occur only while inactive", async () => {
  const gateway = await createGateway({
    a: "http://127.0.0.1:1",
    b: "http://127.0.0.1:2",
  });
  try {
    assert.throws(
      () => gateway.setEndpoint("a", "http://127.0.0.1:3"),
      /delivery.active_endpoint/,
    );
    gateway.setEndpoint("b", "http://127.0.0.1:3");
    assert.throws(
      () => gateway.setEndpoint("b", "https://example.com"),
      /delivery.endpoint_invalid/,
    );
  } finally {
    await gateway.close();
  }
});

test("a lost mutation response prevents promotion rather than replaying uncertain work", async () => {
  const server = createServer((req) => req.socket.destroy());
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const url = `http://127.0.0.1:${server.address().port}`;
  const gateway = await createGateway({ a: url, b: url });
  try {
    const response = await fetch(gateway.url, {
      method: "POST",
      body: "synthetic",
    });
    assert.equal(response.status, 502);
    await assert.rejects(
      gateway.promote("b", async () => true),
      /delivery.mutation_uncertain/,
    );
    assert.equal(gateway.selected, "a");
  } finally {
    await gateway.close();
    await new Promise((r) => server.close(r));
  }
});

test(
  "fake Docker sequence bootstraps once, retains volume on failure and uses retained image IDs for rollback with scoped cleanup",
  { timeout: 20000 },
  async () => {
    const { createHash } = await import("node:crypto");
    const { durableDeliveryFixture } = await loadFixtureModule();
    const fixture = await durableDeliveryFixture();
    const { createRehearsal } = await import("./local-durable-delivery.mjs");
    const service = createServer((_req, res) => res.end("healthy"));
    service.listen(0, "127.0.0.1");
    await once(service, "listening");
    const port = String(service.address().port);
    const containers = new Map(),
      volumes = new Map(),
      networks = new Map(),
      images = new Map();
    const calls = [];
    let seq = 0;
    let doc;
    const json = (x) => Buffer.from(JSON.stringify(x));
    const empty = () => Buffer.from("");
    const command = async (_command, args, { cwd } = {}) => {
      calls.push(args);
      const [head, verb] = args;
      if (head === "version") return Buffer.from("29.6.2");
      if (head === "context") return json("npipe://local-engine");
      if (head === "compose" && verb === "version")
        return Buffer.from("2.40.0");
      if (head === "compose") {
        doc = JSON.parse(
          await (
            await import("node:fs/promises")
          ).readFile(join(cwd, "compose.json"), "utf8"),
        );
        const action = args[7];
        if (action === "build") {
          for (const key of args.slice(8)) {
            const definition = doc.services[key];
            const entry = {
              Id: `sha256:${createHash("sha256").update(`fake-image-${++seq}`).digest("hex")}`,
              Labels: definition.labels,
              RepoTags: [`${definition.image}:latest`],
            };
            images.set(definition.image, entry);
          }
          return empty();
        }
        if (action === "up") {
          for (const key of args.slice(11)) {
            const definition = doc.services[key];
            const item = {
              Id: (++seq).toString(16).padStart(64, "0"),
              Name: definition.container_name,
              Labels: definition.labels,
              Image: definition.image,
              State: {
                Running: key !== "bootstrap",
                ExitCode: 0,
                Health: { Status: "healthy" },
              },
              Mounts: key.endsWith("postgres")
                ? [
                    {
                      Type: "volume",
                      Name: doc.volumes[
                        key.startsWith("restore") ? "restore" : "data"
                      ].name,
                      Destination: "/var/lib/postgresql/data",
                    },
                  ]
                : [],
              Ports: key.endsWith("api")
                ? { "3001/tcp": [{ HostIp: "127.0.0.1", HostPort: port }] }
                : key.endsWith("web")
                  ? { "3000/tcp": [{ HostIp: "127.0.0.1", HostPort: port }] }
                  : {},
            };
            containers.set(item.Name, item);
          }
          return empty();
        }
      }
      if (head === "pull") {
        images.set("postgres:16-alpine", {
          Id: `sha256:${"f".repeat(64)}`,
          Labels: {},
          RepoTags: ["postgres:16-alpine"],
        });
        return empty();
      }
      if (head === "image" && verb === "inspect") {
        const requested = args.at(-1);
        const item =
          images.get(requested) ??
          [...images.values()].find(
            (x) => x.Id === requested || x.Id.slice(7).startsWith(requested),
          );
        assert.ok(item);
        return json(item);
      }
      if (["volume", "network"].includes(head)) {
        const store = head === "volume" ? volumes : networks;
        if (verb === "ls") return Buffer.from([...store.keys()].join("\n"));
        if (verb === "create") {
          const labels = {};
          for (let i = 2; i < args.length - 1; i += 2) {
            const [k, v] = args[i + 1].split("=");
            labels[k] = v;
          }
          store.set(args.at(-1), {
            Name: args.at(-1),
            Labels: labels,
            Containers: {},
          });
          return Buffer.from(args.at(-1));
        }
        if (verb === "inspect") return json(store.get(args.at(-1)));
        if (verb === "rm") {
          assert.ok(store.delete(args.at(-1)));
          return empty();
        }
      }
      if (head === "ps") {
        if (args.includes("--format"))
          return Buffer.from(
            [...containers.keys(), "factory-preview-unrelated-api"].join("\n"),
          );
        if (args.some((x) => x.startsWith("volume="))) return empty();
        return Buffer.from(
          [...containers.values()].map((x) => x.Id).join("\n"),
        );
      }
      if (head === "inspect") {
        const item =
          containers.get(args.at(-1)) ??
          [...containers.values()].find((x) => x.Id === args.at(-1));
        assert.ok(item);
        return json(item);
      }
      if (head === "stop") {
        const item = [...containers.values()].find((x) => x.Id === args.at(-1));
        assert.ok(item);
        item.State.Running = false;
        return empty();
      }
      if (head === "rm") {
        const item = [...containers.values()].find((x) => x.Id === args.at(-1));
        assert.ok(item);
        containers.delete(item.Name);
        return empty();
      }
      if (
        head === "image" &&
        verb === "ls" &&
        args.includes("postgres:16-alpine")
      )
        return Buffer.from(images.get("postgres:16-alpine")?.Id ?? "");
      if (head === "image" && verb === "ls")
        return Buffer.from(
          [...images.values()]
            .filter((x) => x.Labels["factory.durable.run"])
            .map((x) =>
              args.includes("--no-trunc") ? x.Id : x.Id.slice(7, 19),
            )
            .join("\n"),
        );
      if (head === "image" && verb === "rm") {
        const entry = [...images.entries()].find(
          ([_k, v]) => v.Id === args.at(-1),
        );
        assert.ok(entry);
        images.delete(entry[0]);
        return empty();
      }
      assert.fail(`Unexpected fixed fake command: ${head} ${verb}`);
    };
    let harness;
    try {
      harness = await createRehearsal(fixture, { command });
      await harness.openGateway();
      await harness.startCandidate(false);
      assert.equal(harness.gateway.selected, "a");
      await harness.removeCandidate();
      assert.equal(volumes.size, 1);
      await harness.startCandidate();
      await harness.switchTo("b", async () => true);
      await harness.rollback(async () => true);
      assert.equal(harness.gateway.selected, "a");
      assert.equal(volumes.size, 1);
      assert.equal(
        calls.filter((args) => args[0] === "compose" && args[7] === "build")
          .length,
        1,
      );
      assert.equal(
        calls.filter(
          (args) =>
            args[0] === "compose" &&
            args[7] === "up" &&
            args.includes("bootstrap"),
        ).length,
        1,
      );
      assert.ok(doc.services["a-api"].image.startsWith("sha256:"));
      await harness.close();
      assert.equal(containers.size + volumes.size + networks.size, 0);
      assert.equal(images.size, 1);
      assert.ok(
        !calls.some((args) => args.includes("factory-preview-unrelated-api")),
      );
      assert.equal(harness.evidence.cleanup, "removed");
      await assert.rejects(
        createRehearsal(fixture, {
          command: async (program, args, options) => {
            if (
              args[0] === "compose" &&
              args[7] === "up" &&
              args.includes("postgres")
            )
              throw new Error("delivery.startup_failed");
            return command(program, args, options);
          },
        }),
        (error) =>
          error.message === "delivery.startup_failed" &&
          error.evidence.failure === "delivery.startup_failed" &&
          error.evidence.cleanup === "removed" &&
          error.evidence.cleanupFailure === null,
      );
      assert.equal(containers.size + volumes.size + networks.size, 0);
      assert.equal(images.size, 1);
    } finally {
      try {
        if (harness && harness.evidence.cleanup !== "removed")
          await harness.close();
      } finally {
        service.closeAllConnections();
        await new Promise((r) => service.close(r));
      }
    }
  },
);

test("cancelled child confirms exit and marks uncertain external work without exposing output", async () => {
  const controller = new AbortController();
  const pending = runCommand(
    process.execPath,
    ["-e", "process.stdout.write('secret');setInterval(()=>{},1000)"],
    { signal: controller.signal, timeout: 10000 },
  );
  setTimeout(() => controller.abort(), 30);
  await assert.rejects(
    pending,
    (error) =>
      error.message === "delivery.command_failed" &&
      error.uncertainExit === true,
  );
});
test("subprocess environment excludes platform credentials", async () => {
  const saved = process.env.FACTORY_MODEL_API_KEY;
  process.env.FACTORY_MODEL_API_KEY = "synthetic-secret";
  try {
    const result = await runCommand(process.execPath, [
      "-e",
      "process.stdout.write(String(process.env.FACTORY_MODEL_API_KEY===undefined))",
    ]);
    assert.equal(result.toString(), "true");
  } finally {
    if (saved === undefined) delete process.env.FACTORY_MODEL_API_KEY;
    else process.env.FACTORY_MODEL_API_KEY = saved;
  }
});

test("OS tooling variables survive filtering without admitting provider credentials", async () => {
  const key = "ProgramW6432";
  const previous = process.env[key];
  process.env[key] = "synthetic-os-directory";
  try {
    const result = await runCommand(process.execPath, [
      "-e",
      "process.stdout.write(String(process.env.ProgramW6432==='synthetic-os-directory'))",
    ]);
    assert.equal(result.toString(), "true");
  } finally {
    if (previous === undefined) delete process.env[key];
    else process.env[key] = previous;
  }
});
test("deadline rejects a late successful readiness probe", async () => {
  const { pollReadiness } = await import("./local-durable-delivery.mjs");
  const started = Date.now();
  const result = await pollReadiness(
    async () => {
      await new Promise((r) => setTimeout(r, 150));
      return true;
    },
    { timeout: 20 },
  );
  assert.equal(result, false);
  assert.ok(Date.now() - started < 100);
});
test("cancellation terminates the owned parent and resistant descendant while preserving an unrelated sibling", async () => {
  const { spawn } = await import("node:child_process");
  const sibling = spawn(process.execPath, ["-e", "setInterval(()=>{},1000)"], {
    stdio: "ignore",
    windowsHide: true,
  });
  const controller = new AbortController();
  let pids = [];
  let pending;
  const descendant = "process.on('SIGTERM',()=>{});setInterval(()=>{},1000)";
  const parent = `const {spawn}=require('node:child_process');const c=spawn(process.execPath,['-e',${JSON.stringify(descendant)}],{stdio:'inherit',windowsHide:true});console.log(JSON.stringify([process.pid,c.pid]));setInterval(()=>{},1000);`;
  try {
    pending = runCommand(process.execPath, ["-e", parent], {
      signal: controller.signal,
      timeout: 10000,
      onLine: (line) => {
        pids = JSON.parse(line);
        setTimeout(() => controller.abort(), 100);
      },
    });
    const result = await Promise.race([
      pending.then(
        () => null,
        (error) => error,
      ),
      new Promise((r) =>
        setTimeout(() => r(new Error("test.shutdown_unbounded")), 3500),
      ),
    ]);
    assert.equal(result.message, "delivery.command_failed");
    assert.equal(result.ownedTreeTerminated, true);
    for (const pid of pids)
      assert.throws(() => process.kill(pid, 0), { code: "ESRCH" });
    assert.doesNotThrow(() => process.kill(sibling.pid, 0));
  } finally {
    for (const pid of pids) {
      try {
        process.kill(pid, "SIGKILL");
      } catch {}
    }
    sibling.kill("SIGKILL");
    await pending?.catch(() => {});
  }
});

test("chunked oversized requests reject once and leave the gateway serving subsequent requests", async () => {
  const { request } = await import("node:http");
  const upstream = createServer((req, res) => {
    req.resume();
    req.on("end", () => res.end("healthy"));
  });
  upstream.listen(0, "127.0.0.1");
  await once(upstream, "listening");
  const url = `http://127.0.0.1:${upstream.address().port}`;
  const gateway = await createGateway({ a: url, b: url });
  try {
    const status = await new Promise((resolveStatus, reject) => {
      const req = request(gateway.url, { method: "POST" }, (res) => {
        res.resume();
        res.on("end", () => resolveStatus(res.statusCode));
      });
      req.on("error", reject);
      req.write(Buffer.alloc(70000));
      setTimeout(() => {
        req.write(Buffer.alloc(70000));
        req.end();
      }, 30);
    });
    assert.equal(status, 413);
    await new Promise((r) => setTimeout(r, 60));
    assert.equal(await (await fetch(gateway.url)).text(), "healthy");
  } finally {
    await gateway.close();
    upstream.closeAllConnections();
    await new Promise((r) => upstream.close(r));
  }
});

test("readiness expiration aborts and settles a cooperative read-only probe", async () => {
  const { pollReadiness } = await import("./local-durable-delivery.mjs");
  let settled = false;
  assert.equal(
    await pollReadiness(
      (signal) =>
        new Promise((resolveProbe) => {
          signal.addEventListener(
            "abort",
            () => {
              settled = true;
              resolveProbe(false);
            },
            { once: true },
          );
        }),
      { timeout: 20 },
    ),
    false,
  );
  assert.equal(settled, true);
});
test("a command that cannot prove timely shutdown fails closed within its secondary deadline", async () => {
  const started = Date.now();
  let ownedPid;
  try {
    await assert.rejects(
      runCommand(
        process.execPath,
        ["-e", "console.log(process.pid);setInterval(()=>{},1000)"],
        {
          timeout: 1000,
          onLine: (line) => {
            ownedPid = Number(line);
          },
        },
      ),
      (error) =>
        error.message === "delivery.cleanup_required" &&
        error.ownedTreeTerminated === false,
    );
    assert.ok(Date.now() - started < 1400);
    assert.ok(Number.isSafeInteger(ownedPid));
  } finally {
    if (Number.isSafeInteger(ownedPid)) {
      try {
        process.kill(ownedPid, "SIGKILL");
      } catch {}
    }
  }
});

test("cached PostgreSQL image is verified and retained without a network pull", async () => {
  const { resolvePostgresImage } = await import("./local-durable-delivery.mjs");
  const id = `sha256:${"a".repeat(64)}`;
  const calls = [];
  const command = async (args) => {
    calls.push(args);
    if (args[0] === "pull") assert.fail("A cached image must not be pulled");
    if (args[1] === "ls") return Buffer.from(id);
    return Buffer.from(
      JSON.stringify({ Id: id, RepoTags: ["postgres:16-alpine"] }),
    );
  };
  assert.equal(await resolvePostgresImage(command), id);
  assert.ok(calls.every((args) => !args.includes("pull")));
});
test("CLI summary preserves original startup failure and cleanup-required precedence without raw output", async () => {
  const { createStageReporter } = await import("./local-durable-delivery.mjs");
  const output = [];
  const reporter = createStageReporter((line) => output.push(line));
  const runId = "a".repeat(24);
  reporter.onLine("password=secret");
  for (const [phase, outcome] of [
    ["build", "delivery.command_failed"],
    ["cleanup", "delivery.cleanup_required"],
  ])
    reporter.onLine(
      `DURABLE_DELIVERY_STAGE ${JSON.stringify({ runId, phase, outcome, durationMs: 1 })}`,
    );
  assert.equal(reporter.failureCode, "delivery.cleanup_required");
  assert.deepEqual(reporter.summary(), {
    runId,
    failure: "delivery.command_failed",
    cleanup: "required",
  });
  assert.ok(!output.join("").includes("secret"));
});

test("only a missing PostgreSQL tag permits one pull and the resulting ID is verified", async () => {
  const { resolvePostgresImage } = await import("./local-durable-delivery.mjs");
  let pulled = 0,
    source;
  const id = `sha256:${"b".repeat(64)}`;
  const command = async (args) => {
    if (args[0] === "pull") {
      pulled++;
      return Buffer.from("");
    }
    if (args[1] === "ls") return Buffer.from(pulled ? id : "");
    return Buffer.from(
      JSON.stringify({ Id: id, RepoTags: ["postgres:16-alpine"] }),
    );
  };
  assert.equal(
    await resolvePostgresImage(command, {
      onSource: (value) => (source = value),
    }),
    id,
  );
  assert.equal(pulled, 1);
  assert.equal(source, "pulled");
  await assert.rejects(
    resolvePostgresImage(async (args) => {
      if (args[0] === "pull") throw new Error("raw registry failure");
      return Buffer.from("");
    }),
    /^Error: delivery.base_image_unavailable$/,
  );
});
test("cached PostgreSQL identity drift fails closed without a fallback pull", async () => {
  const { resolvePostgresImage } = await import("./local-durable-delivery.mjs");
  const id = `sha256:${"b".repeat(64)}`;
  await assert.rejects(
    resolvePostgresImage(async (args) => {
      assert.notEqual(args[0], "pull");
      if (args[1] === "ls") return Buffer.from(id);
      return Buffer.from(
        JSON.stringify({
          Id: `sha256:${"c".repeat(64)}`,
          RepoTags: ["postgres:16-alpine"],
        }),
      );
    }),
    /^Error: delivery.image_mismatch$/,
  );
});

test("final safe evidence updates the CLI failure even outside a named phase", async () => {
  const { createStageReporter } = await import("./local-durable-delivery.mjs");
  const output = [];
  const reporter = createStageReporter((line) => output.push(line));
  const runId = "a".repeat(24);
  reporter.onLine(
    `DURABLE_DELIVERY_EVIDENCE ${JSON.stringify({ runId, failure: "delivery.http_status_mismatch", cleanup: "removed", raw: "secret" })}`,
  );
  assert.deepEqual(reporter.summary(), {
    runId,
    failure: "delivery.http_status_mismatch",
    cleanup: "removed",
  });
  assert.ok(!output.join("").includes("secret"));
});
test("safe HTTP diagnostics retain statuses and fixed Task code without body content", async () => {
  const { checkHttpStatus } = await import("./local-durable-delivery.mjs");
  const evidence = {};
  await assert.rejects(
    checkHttpStatus(
      {
        status: () => 400,
        json: async () => ({ code: "task.invalid_request", raw: "secret" }),
      },
      201,
      evidence,
      "create-task",
    ),
    /^Error: delivery.http_status_mismatch$/,
  );
  assert.deepEqual(evidence.httpChecks, [
    {
      operation: "create-task",
      expectedStatus: 201,
      actualStatus: 400,
      code: "task.invalid_request",
    },
  ]);
  assert.ok(!JSON.stringify(evidence).includes("secret"));
  await checkHttpStatus(
    {
      status: 201,
      json: async () =>
        assert.fail("Successful bodies are read by their caller"),
    },
    201,
    evidence,
    "create-task",
  );
});
test("safe JSON evidence is persisted on disk and attached by path", async () => {
  const { persistDurableEvidence } = await loadFixtureModule();
  const { readFile } = await import("node:fs/promises");
  const root = await mkdtemp(join(tmpdir(), "durable-evidence-test-"));
  const attachments = [];
  const evidence = {
    runId: "a".repeat(24),
    failure: "delivery.failed",
    cleanup: "removed",
  };
  try {
    const path = await persistDurableEvidence(
      {
        outputPath: (name) => join(root, name),
        attach: async (name, options) => attachments.push({ name, ...options }),
      },
      evidence,
    );
    assert.deepEqual(JSON.parse(await readFile(path, "utf8")), evidence);
    assert.equal(attachments[0].path, path);
    assert.equal(attachments[0].body, undefined);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
test("actual emitted Team Task runtime accepts the rehearsal create correction and transition payloads", async () => {
  const { durableDeliveryFixture } = await loadFixtureModule();
  const fixture = await durableDeliveryFixture();
  const { createRequire } = await import("node:module");
  const { resolve, posix } = await import("node:path");
  const { transpileModule, ModuleKind } = await import("typescript");
  const runtimeRequire = createRequire(
    resolve("packages/compiler/package.json"),
  );
  const cache = new Map();
  function load(path) {
    if (cache.has(path)) return cache.get(path);
    const file = fixture.a.files.find((item) => item.path === path);
    assert.ok(file);
    const exports = {};
    cache.set(path, exports);
    const js = transpileModule(file.content, {
      compilerOptions: { module: ModuleKind.CommonJS, target: 99 },
    }).outputText;
    new Function("require", "exports", js)(
      (name) =>
        name.startsWith(".")
          ? load(
              posix.normalize(
                posix.join(posix.dirname(path), name.replace(/\.js$/, ".ts")),
              ),
            )
          : runtimeRequire(name),
      exports,
    );
    return exports;
  }
  const { ApplicationRuntime, InMemoryRecordStore } = load(
    "api/src/application-runtime.ts",
  );
  const runtime = new ApplicationRuntime(new InMemoryRecordStore());
  const values = {
    title: "Created under A",
    description: "Synthetic delivery rehearsal",
    assignee: "Local team",
    dueDate: "2026-10-01T00:00:00.000Z",
    priority: "medium",
  };
  const created = await runtime.taskCommand(
    "member",
    "fixture-session-member",
    "task",
    undefined,
    "create",
    "fixture-create",
    { values },
  );
  assert.equal(created.status, 201);
  assert.equal(created.body.version, 0);
  const corrected = await runtime.taskCommand(
    "member",
    "fixture-session-member",
    "task",
    created.body.id,
    "update",
    "fixture-correct",
    { expectedVersion: 0, values: { ...values, title: "Corrected under A" } },
  );
  assert.equal(corrected.status, 200);
  assert.equal(corrected.body.version, 1);
  const started = await runtime.taskCommand(
    "member",
    "fixture-session-member",
    "task",
    created.body.id,
    "start",
    "fixture-start",
    { expectedVersion: 1 },
  );
  assert.equal(started.status, 200);
  assert.equal(started.body.status, "in-progress");
  assert.equal(started.body.version, 2);
});

test(
  "capture locates the exact visible task heading in actual emitted DOM and CSS",
  { timeout: 30000 },
  async () => {
    const { durableDeliveryFixture, durableTaskTitle } =
      await loadFixtureModule();
    const { chromium, expect } = await import("@playwright/test");
    const { createRequire } = await import("node:module");
    const { resolve } = await import("node:path");
    const compilerRequire = createRequire(
      resolve("packages/compiler/package.json"),
    );
    const vitestRequire = createRequire(
      compilerRequire.resolve("vitest/package.json"),
    );
    const viteRequire = createRequire(
      vitestRequire.resolve("vite/package.json"),
    );
    const { build } = viteRequire("esbuild");
    const fixture = await durableDeliveryFixture();
    const emitted = (path) => {
      const file = fixture.a.files.find((item) => item.path === path);
      assert.ok(file);
      return file.content;
    };
    const script = await build({
      stdin: {
        contents:
          emitted("web/app/page-runtime.tsx") +
          "\nimport { createRoot } from 'react-dom/client'; createRoot(document.getElementById('root')!).render(<GeneratedApplication requestedPath={location.pathname} />);",
        resolveDir: resolve("apps/workbench"),
        sourcefile: "durable-task-focused.tsx",
        loader: "tsx",
      },
      bundle: true,
      write: false,
      format: "iife",
      platform: "browser",
      jsx: "automatic",
      define: { "process.env.NODE_ENV": '"production"' },
      logLevel: "silent",
    });
    const title = "Created under A";
    const records = [title + " follow-up", title].map((name, index) => ({
      id: `focused-task-${index}`,
      title: name,
      description: "Synthetic fixture",
      assignee: "Local team",
      dueDate: "2026-10-01T00:00:00.000Z",
      priority: "medium",
      status: "not-started",
      version: 0,
    }));
    const server = createServer((request, response) => {
      const path = new URL(request.url, "http://127.0.0.1").pathname;
      const [type, body] =
        path === "/app.js"
          ? ["application/javascript", script.outputFiles[0].text]
          : path === "/globals.css"
            ? ["text/css", emitted("web/app/globals.css")]
            : path.startsWith("/api/")
              ? ["application/json", JSON.stringify(records)]
              : [
                  "text/html",
                  '<!doctype html><html lang="en"><head><link rel="stylesheet" href="/globals.css"></head><body><div id="root"></div><script src="/app.js"></script></body></html>',
                ];
      response.writeHead(200, { "content-type": type }).end(body);
    });
    let browser;
    try {
      server.listen(0, "127.0.0.1");
      await once(server, "listening");
      const origin = `http://127.0.0.1:${server.address().port}`;
      browser = await chromium.launch({ timeout: 10000 });
      const page = await browser.newPage();
      const errors = [];
      page.on("pageerror", () => errors.push("pageerror"));
      await page.route("**/*", (route) =>
        new URL(route.request().url()).origin === origin
          ? route.continue()
          : route.abort(),
      );
      await page.goto(`${origin}${fixture.pagePath}`, { timeout: 10000 });
      await expect(page.locator(".task-record-title")).toHaveCount(2, {
        timeout: 3000,
      });
      const heading = durableTaskTitle(page, title);
      for (const width of [390, 1280, 1440]) {
        await page.setViewportSize({ width, height: 900 });
        await expect(heading).toBeVisible({ timeout: 1000 });
      }
      await expect(heading).toHaveCount(1);
      assert.equal(await heading.evaluate((element) => element.tagName), "H3");
      assert.equal(await heading.textContent(), `Title${title}`);
      assert.equal(await page.getByText(title, { exact: true }).count(), 0);
      await heading.evaluate((element) => {
        element.style.display = "none";
      });
      await expect(heading).not.toBeVisible();
      await heading.evaluate((element) => element.remove());
      await expect(durableTaskTitle(page, title)).toHaveCount(0);
      assert.deepEqual(errors, []);
    } finally {
      try {
        await browser?.close();
      } finally {
        server.closeAllConnections();
        if (server.listening)
          await new Promise((resolve, reject) =>
            server.close((error) => (error ? reject(error) : resolve())),
          );
      }
    }
  },
);
