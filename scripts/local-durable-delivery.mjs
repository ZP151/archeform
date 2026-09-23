import { spawn } from "node:child_process";
import { createHash, randomBytes } from "node:crypto";
import {
  lstat,
  mkdir,
  readFile,
  readdir,
  realpath,
  rm,
  writeFile,
} from "node:fs/promises";
import { createServer, request as httpRequest } from "node:http";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const repository = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const hash = (value) => createHash("sha256").update(value).digest("hex");
const fail = (code) => {
  throw new Error(`delivery.${code}`);
};
const equal = (a, b) => JSON.stringify(a) === JSON.stringify(b);
export const safeCode = (error) =>
  /^delivery\.[a-z_]+$/.test(error?.message ?? "")
    ? error.message
    : "delivery.failed";
export function parseCli(args) {
  if (args.length !== 1 || !["plan", "run"].includes(args[0]))
    fail("arguments_invalid");
  return args[0];
}
const stages = [
  "preflight",
  "immutable-fixtures",
  "compatibility",
  "owned-storage",
  "bootstrap-a",
  "failed-readiness-retains-a",
  "switch-b",
  "backup",
  "retained-image-rollback",
  "separate-restore",
  "scoped-cleanup",
];
export function manifestFor(files) {
  const seen = new Set();
  return files
    .map(({ path, content }) => {
      if (
        typeof path !== "string" ||
        !path ||
        path.includes("\\") ||
        path.includes(":") ||
        isAbsolute(path) ||
        path.split("/").some((x) => !x || x === "." || x === "..") ||
        path
          .split("/")
          .some(
            (part) =>
              /[. ]$|[\x00-\x1f]/.test(part) ||
              /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(part),
          ) ||
        seen.has(path.toLowerCase()) ||
        typeof content !== "string"
      )
        fail("artifact_invalid");
      seen.add(path.toLowerCase());
      return { path, sha256: hash(content), size: Buffer.byteLength(content) };
    })
    .sort((a, b) => a.path.localeCompare(b.path));
}
const databaseFile = (path) =>
  path.startsWith("database/") ||
  path.startsWith("api/prisma/") ||
  ["api/package.json", "api/Dockerfile"].includes(path);
export function checkCompatibility(a, b, pageId) {
  const next = structuredClone(b.graph);
  const before = a.graph.page.pages.find((p) => p.id === pageId);
  const after = next.page.pages.find((p) => p.id === pageId);
  if (
    !before ||
    !after ||
    before.title === after.title ||
    a.publishedRevisionId === b.publishedRevisionId ||
    a.graphHash === b.graphHash
  )
    fail("compatibility_identity");
  after.title = before.title;
  if (!equal(a.graph, next)) fail("compatibility_graph");
  const locks = [a, b].map((item) => {
    if (item.compositionLock.applicationGraphChecksum !== item.graphHash)
      fail("compatibility_lock");
    const lock = structuredClone(item.compositionLock);
    delete lock.applicationGraphChecksum;
    delete lock.lockDigest;
    return lock;
  });
  if (!equal(...locks)) fail("compatibility_lock");
  for (const item of [a, b])
    if (!equal(manifestFor(item.files), item.manifest))
      fail("artifact_invalid");
  const contracts = [a, b].map((item) =>
    item.files
      .filter((f) => databaseFile(f.path))
      .map((f) => [f.path, f.content])
      .sort((x, y) => x[0].localeCompare(y[0])),
  );
  if (!contracts[0].length || !equal(...contracts))
    fail("compatibility_database");
  return hash(JSON.stringify(contracts[0]));
}
async function plainParents(path) {
  const absolute = resolve(path);
  let cursor = absolute;
  while (true) {
    try {
      const info = await lstat(cursor);
      if (
        !info.isDirectory() ||
        info.isSymbolicLink() ||
        resolve(await realpath(cursor)).toLowerCase() !== cursor.toLowerCase()
      )
        fail("artifact_alias");
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
    const parent = dirname(cursor);
    if (parent === cursor) break;
    cursor = parent;
  }
}
export async function materialize(root, fixture) {
  await plainParents(dirname(root));
  await mkdir(root);
  if (!equal(manifestFor(fixture.files), fixture.manifest))
    fail("artifact_invalid");
  for (const file of fixture.files) {
    const destination = join(root, ...file.path.split("/"));
    await mkdir(dirname(destination), { recursive: true });
    await writeFile(destination, file.content, { flag: "wx" });
  }
  await verifyTree(root, fixture.manifest);
}
export async function verifyTree(root, manifest) {
  await plainParents(root);
  const actual = [];
  async function visit(directory, prefix = "") {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name);
      const info = await lstat(path);
      if (info.isSymbolicLink()) fail("artifact_alias");
      if (info.isDirectory()) await visit(path, `${prefix}${entry.name}/`);
      else if (info.isFile() && info.nlink === 1) {
        const bytes = await readFile(path);
        actual.push({
          path: prefix + entry.name,
          sha256: hash(bytes),
          size: bytes.length,
        });
      } else fail("artifact_invalid");
    }
  }
  await visit(root);
  actual.sort((a, b) => a.path.localeCompare(b.path));
  if (!equal(actual, manifest)) fail("artifact_integrity");
}
export function ownership(runId, applicationId) {
  if (!/^[a-f0-9]{24}$/.test(runId) || !/^[-a-zA-Z0-9]+$/.test(applicationId))
    fail("ownership_invalid");
  const project = `factory-durable-test-${runId}`;
  return {
    runId,
    applicationId,
    project,
    volume: `${project}-data`,
    restoreVolume: `${project}-restore`,
    network: `${project}-network`,
    labels: {
      "factory.durable.harness": "adr-0075",
      "factory.durable.run": runId,
      "factory.durable.application": applicationId,
    },
  };
}
export function assertOwned(resource, name, owner) {
  if (
    resource.Name?.replace(/^\//, "") !== name ||
    !name.startsWith(`${owner.project}-`) ||
    Object.entries(owner.labels).some(
      ([key, value]) => resource.Labels?.[key] !== value,
    )
  )
    fail("ownership_mismatch");
}
export async function cleanupOwned(adapter, owner, resources) {
  try {
    for (const resource of resources)
      assertOwned(
        await adapter.inspect(resource.kind, resource.name),
        resource.name,
        owner,
      );
    for (const resource of resources) {
      assertOwned(
        await adapter.inspect(resource.kind, resource.name),
        resource.name,
        owner,
      );
      await adapter.remove(resource.kind, resource.name);
    }
  } catch {
    fail("cleanup_required");
  }
}
const processEnvironment = () =>
  Object.fromEntries(
    Object.entries(process.env).filter(([key]) =>
      /^(PATH|PATHEXT|SYSTEMROOT|WINDIR|TEMP|TMP|USERPROFILE|HOME|APPDATA|LOCALAPPDATA|PROGRAMDATA|PROGRAMFILES|PROGRAMFILES\(X86\)|PROGRAMW6432|COMMONPROGRAMFILES|COMMONPROGRAMFILES\(X86\)|COMMONPROGRAMW6432)$/i.test(
        key,
      ),
    ),
  );

// Only fixed OS process-inspection/termination programs call this helper. Their
// output is bounded, never logged, and their lifetime has an independent limit.
function processTool(command, args, timeout) {
  return new Promise((resolveTool) => {
    const child = spawn(command, args, {
      env: processEnvironment(),
      shell: false,
      windowsHide: true,
      stdio: ["ignore", "pipe", "ignore"],
    });
    const chunks = [];
    let size = 0;
    let settled = false;
    const finish = (code) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      child.stdout.destroy();
      resolveTool({ code, output: Buffer.concat(chunks).toString() });
    };
    const timer = setTimeout(
      () => {
        child.kill("SIGKILL");
        finish(null);
      },
      Math.max(1, timeout),
    );
    child.stdout.on("data", (chunk) => {
      size += chunk.length;
      if (size > 65536) {
        child.kill("SIGKILL");
        finish(null);
      } else chunks.push(chunk);
    });
    child.on("error", () => finish(null));
    child.on("close", finish);
  });
}

export async function runCommand(
  command,
  args,
  {
    cwd = repository,
    timeout = 120000,
    input,
    limit = 1048576,
    env,
    onLine,
    signal,
  } = {},
) {
  return new Promise((resolveCommand, reject) => {
    const deadline = Date.now() + timeout;
    const child = spawn(command, args, {
      cwd,
      env: env ?? processEnvironment(),
      shell: false,
      windowsHide: true,
      detached: process.platform !== "win32",
      stdio: ["pipe", "pipe", "pipe"],
    });
    const chunks = [];
    let bytes = 0,
      pendingLine = "",
      stopping = false,
      settled = false,
      closed = false,
      exited = false,
      shutdownTimer;
    const finish = (error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      clearTimeout(shutdownTimer);
      signal?.removeEventListener("abort", stop);
      child.stdin.destroy();
      child.stdout.destroy();
      child.stderr.destroy();
      child.unref();
      if (error) reject(error);
      else resolveCommand(Buffer.concat(chunks));
    };
    const failure = (verified) => {
      const error = new Error(
        verified ? "delivery.command_failed" : "delivery.cleanup_required",
      );
      error.uncertainExit = true;
      error.ownedTreeTerminated = verified;
      return error;
    };
    const alive = (pid) => {
      try {
        process.kill(pid, 0);
        return true;
      } catch (error) {
        return error.code !== "ESRCH";
      }
    };
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    async function terminateTree() {
      const until = Math.min(deadline, Date.now() + 5000);
      shutdownTimer = setTimeout(
        () => finish(failure(false)),
        Math.max(1, until - Date.now()),
      );
      // Once the parent exits, Windows cannot safely target its former tree. Do
      // not guess descendant ownership or report a clean termination in that case.
      if (!Number.isSafeInteger(child.pid) || exited) {
        finish(failure(false));
        return;
      }
      let verified = false;
      if (process.platform === "win32") {
        const powershell = join(
          process.env.SystemRoot ?? "C:\\Windows",
          "System32",
          "WindowsPowerShell",
          "v1.0",
          "powershell.exe",
        );
        const taskkill = join(
          process.env.SystemRoot ?? "C:\\Windows",
          "System32",
          "taskkill.exe",
        );
        const query = `$items=Get-CimInstance Win32_Process; $ids=[System.Collections.Generic.List[int]]::new(); $ids.Add(${child.pid}); for($i=0;$i -lt $ids.Count;$i++){foreach($p in $items){if($p.ParentProcessId -eq $ids[$i] -and -not $ids.Contains([int]$p.ProcessId)){$ids.Add([int]$p.ProcessId)}}}; ConvertTo-Json -Compress -InputObject @($ids.ToArray())`;
        const captured = await processTool(
          powershell,
          ["-NoProfile", "-NonInteractive", "-Command", query],
          Math.min(2000, until - Date.now()),
        );
        let ids;
        try {
          ids = JSON.parse(captured.output);
        } catch {}
        if (
          captured.code !== 0 ||
          !Array.isArray(ids) ||
          !ids.every(Number.isSafeInteger) ||
          !ids.includes(child.pid) ||
          exited
        ) {
          finish(failure(false));
          return;
        }
        let killed = await processTool(
          taskkill,
          ["/PID", String(child.pid), "/T"],
          Math.min(750, until - Date.now()),
        );
        await sleep(75);
        if (ids.some(alive)) {
          // The tree root must still be ours for a scoped forced escalation.
          if (exited) {
            finish(failure(false));
            return;
          }
          killed = await processTool(
            taskkill,
            ["/PID", String(child.pid), "/T", "/F"],
            Math.min(1000, until - Date.now()),
          );
        }
        while (ids.some(alive) && Date.now() < until - 20) await sleep(20);
        verified = killed.code === 0 && !ids.some(alive);
      } else {
        try {
          process.kill(-child.pid, "SIGTERM");
        } catch {}
        await sleep(100);
        if (alive(-child.pid)) {
          try {
            process.kill(-child.pid, "SIGKILL");
          } catch {}
        }
        while (alive(-child.pid) && Date.now() < until - 20) await sleep(20);
        verified = !alive(-child.pid);
      }
      while (!closed && Date.now() < until - 20) await sleep(10);
      finish(failure(verified && closed));
    }
    function stop() {
      if (stopping || settled) return;
      stopping = true;
      clearTimeout(timer);
      void terminateTree().catch(() => finish(failure(false)));
    }
    // Reserve shutdown inside this command's deadline, never after the attempt.
    const timer = setTimeout(
      stop,
      Math.max(1, timeout - Math.min(5000, timeout / 2)),
    );
    signal?.addEventListener("abort", stop, { once: true });
    if (signal?.aborted) stop();
    child.stdout.on("data", (chunk) => {
      bytes += chunk.length;
      if (bytes > limit) {
        stop();
        return;
      }
      chunks.push(chunk);
      if (onLine) {
        pendingLine += chunk.toString();
        const lines = pendingLine.split(/\r?\n/);
        pendingLine = lines.pop();
        for (const line of lines) onLine(line);
      }
    });
    child.stderr.on("data", (chunk) => {
      bytes += chunk.length;
      if (bytes > limit) stop();
    });
    child.on("error", () => {
      if (!stopping) finish(new Error("delivery.command_failed"));
    });
    child.on("exit", () => {
      exited = true;
    });
    child.on("close", (code) => {
      closed = true;
      if (!stopping)
        finish(code === 0 ? null : new Error("delivery.command_failed"));
    });
    child.stdin.on("error", () => {});
    child.stdin.end(input);
  });
}

function endpoint(value) {
  let url;
  try {
    url = new URL(value);
  } catch {
    fail("endpoint_invalid");
  }
  if (
    url.protocol !== "http:" ||
    url.hostname !== "127.0.0.1" ||
    url.username ||
    url.password ||
    url.pathname !== "/" ||
    url.search ||
    url.hash ||
    !url.port
  )
    fail("endpoint_invalid");
  return url;
}
export async function createGateway(endpoints) {
  for (const url of Object.values(endpoints)) endpoint(url);
  let selected = "a",
    gated = false,
    inFlight = 0,
    closed = false,
    uncertainMutation = false;
  const sockets = new Set();
  const server = createServer((req, res) => {
    if (closed || gated || inFlight >= 32) {
      res.writeHead(503);
      res.end();
      return;
    }
    if (
      !req.url?.startsWith("/") ||
      req.url.startsWith("//") ||
      req.url.includes("\\")
    ) {
      res.writeHead(400);
      res.end();
      return;
    }
    inFlight++;
    let complete = false,
      rejected = false;
    const finish = () => {
      if (!complete) {
        complete = true;
        inFlight--;
      }
    };
    const mutation = !["GET", "HEAD", "OPTIONS"].includes(req.method);
    const target = endpoint(endpoints[selected]);
    const headers = { ...req.headers, host: target.host };
    delete headers.connection;
    delete headers.upgrade;
    const upstream = httpRequest(
      {
        hostname: "127.0.0.1",
        port: target.port,
        path: req.url,
        method: req.method,
        headers,
        timeout: 9000,
      },
      (response) => {
        if (rejected || res.writableEnded) {
          response.destroy();
          return;
        }
        response.on("end", finish);
        response.on("aborted", () => {
          uncertainMutation ||= mutation;
          finish();
        });
        if (
          response.headers.location &&
          (!response.headers.location.startsWith("/") ||
            response.headers.location.startsWith("//"))
        ) {
          response.destroy();
          uncertainMutation ||= mutation;
          finish();
          res.writeHead(502);
          res.end();
          return;
        }
        res.writeHead(response.statusCode ?? 502, response.headers);
        response.pipe(res);
      },
    );
    let bytes = 0;
    req.on("data", (chunk) => {
      if (rejected) return;
      bytes += chunk.length;
      if (bytes > 65536) {
        rejected = true;
        req.unpipe(upstream);
        upstream.destroy();
        if (!res.headersSent) res.writeHead(413, { Connection: "close" });
        if (!res.writableEnded) res.end();
        req.resume();
      }
    });
    upstream.on("timeout", () => upstream.destroy());
    upstream.on("error", () => {
      uncertainMutation ||= mutation;
      finish();
      if (!res.headersSent) res.writeHead(502);
      if (!res.writableEnded) res.end();
    });
    req.on("aborted", () => upstream.destroy());
    res.on("close", () => {
      if (!res.writableFinished) {
        uncertainMutation ||= mutation;
        upstream.destroy();
      }
    });
    req.pipe(upstream);
  });
  server.requestTimeout = 10000;
  server.headersTimeout = 10000;
  server.maxConnections = 40;
  server.on("upgrade", (_req, socket) => socket.destroy());
  server.on("connection", (socket) => {
    sockets.add(socket);
    socket.on("close", () => sockets.delete(socket));
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  async function drain(timeout = 10000) {
    if (uncertainMutation) fail("mutation_uncertain");
    gated = true;
    const until = Date.now() + timeout;
    while (inFlight && Date.now() < until)
      await new Promise((r) => setTimeout(r, 5));
    if (inFlight) {
      gated = false;
      fail("drain_timeout");
    }
    if (uncertainMutation) {
      gated = false;
      fail("mutation_uncertain");
    }
  }
  return {
    url: `http://127.0.0.1:${server.address().port}`,
    get selected() {
      return selected;
    },
    setEndpoint(slot, url) {
      if (slot === selected) fail("active_endpoint");
      if (!Object.hasOwn(endpoints, slot)) fail("endpoint_invalid");
      endpoint(url);
      endpoints[slot] = url;
    },
    async promote(slot, ready, timeout = 10000) {
      if (!Object.hasOwn(endpoints, slot)) fail("endpoint_invalid");
      if (!(await ready())) fail("readiness_failed");
      await drain(timeout);
      selected = slot;
      gated = false;
    },
    async quiesce(action) {
      await drain();
      try {
        return await action();
      } finally {
        gated = false;
      }
    },
    async close() {
      closed = true;
      await drain().catch(() => {});
      for (const socket of sockets) socket.destroy();
      await new Promise((r) => server.close(r));
    },
  };
}

export function composeDocument(owner, images = {}) {
  const labels = owner.labels;
  const database = (name, volume) => ({
    image: images.postgres ?? "postgres:16-alpine",
    container_name: `${owner.project}-${name}`,
    labels,
    environment: {
      POSTGRES_USER: "generated",
      POSTGRES_DB: "generated",
      POSTGRES_PASSWORD: "${FIXTURE_DB_PASSWORD}",
    },
    volumes: [`${volume}:/var/lib/postgresql/data`],
    networks: ["fixture"],
    healthcheck: {
      test: ["CMD", "pg_isready", "-U", "generated", "-d", "generated"],
      interval: "1s",
      timeout: "3s",
      retries: 40,
    },
  });
  const executable = (slot, part) => ({
    image:
      images[`${slot === "restore" ? "a" : slot}-${part}`] ??
      `${owner.project}-${slot}-${part}`,
    container_name: `${owner.project}-${slot}-${part}`,
    labels,
    ...(slot === "restore"
      ? {}
      : {
          build: {
            context: `./${slot}/${part}`,
            dockerfile: "Dockerfile",
            labels,
          },
        }),
    environment:
      part === "api"
        ? {
            DATABASE_URL:
              slot === "restore"
                ? "${RESTORE_DATABASE_URL}"
                : "${MAIN_DATABASE_URL}",
          }
        : { FACTORY_API_URL: `http://${slot}-api:3001` },
    ports: [`127.0.0.1::${part === "api" ? 3001 : 3000}`],
    networks: ["fixture"],
  });
  return {
    services: {
      postgres: database("postgres", "data"),
      "restore-postgres": database("restore-postgres", "restore"),
      bootstrap: {
        image: images.bootstrap ?? `${owner.project}-bootstrap`,
        build: { context: "./a/database", dockerfile: "Dockerfile", labels },
        container_name: `${owner.project}-bootstrap`,
        labels,
        environment: { DATABASE_URL: "${MAIN_DATABASE_URL}" },
        networks: ["fixture"],
      },
      ...Object.fromEntries(
        ["a", "b", "restore"].flatMap((slot) =>
          ["api", "web"].map((part) => [
            `${slot}-${part}`,
            executable(slot, part),
          ]),
        ),
      ),
    },
    volumes: {
      data: { external: true, name: owner.volume },
      restore: { external: true, name: owner.restoreVolume },
    },
    networks: { fixture: { external: true, name: owner.network } },
  };
}
export async function pollReadiness(
  probe,
  {
    timeout = 30000,
    clock = Date.now,
    sleep = (ms) => new Promise((r) => setTimeout(r, ms)),
  } = {},
) {
  const deadline = clock() + timeout;
  do {
    const remaining = deadline - clock();
    if (remaining <= 0) return false;
    const abort = new AbortController();
    let timer;
    try {
      const result = await Promise.race([
        Promise.resolve().then(() => probe(abort.signal, remaining)),
        new Promise((resolveProbe) => {
          timer = setTimeout(() => {
            abort.abort();
            resolveProbe(false);
          }, remaining);
        }),
      ]);
      if (result && clock() < deadline && !abort.signal.aborted) return true;
    } catch {
    } finally {
      clearTimeout(timer);
      abort.abort();
    }
    if (clock() >= deadline) return false;
    await sleep(Math.min(250, Math.max(1, deadline - clock())));
  } while (clock() < deadline);
  return false;
}
export async function preflight(command = runCommand) {
  try {
    const [major, minor] = process.versions.node.split(".").map(Number);
    if (major !== 22 || minor < 11) fail("toolchain_unavailable");
    const host = JSON.parse(
      (
        await command(
          "docker",
          ["context", "inspect", "--format", "{{json .Endpoints.docker.Host}}"],
          { timeout: 15000 },
        )
      ).toString(),
    );
    if (!/^(npipe:\/\/|unix:\/\/)/.test(host)) fail("engine_unavailable");
    const version = (
      await command("docker", ["version", "--format", "{{.Server.Version}}"], {
        timeout: 15000,
      })
    )
      .toString()
      .trim();
    if (!/^\d+\.\d+\.\d+/.test(version)) fail("engine_unavailable");
    await command("docker", ["compose", "version", "--short"], {
      timeout: 15000,
    });
    return version;
  } catch {
    fail("engine_unavailable");
  }
}

export async function resolvePostgresImage(
  docker,
  { onSource = () => {} } = {},
) {
  const list = async () =>
    (
      await docker([
        "image",
        "ls",
        "--no-trunc",
        "--quiet",
        "postgres:16-alpine",
      ])
    )
      .toString()
      .trim()
      .split(/\s+/)
      .filter(Boolean);
  let ids = [...new Set(await list())];
  let source = "cached";
  if (ids.length === 0) {
    source = "pulled";
    try {
      await docker(["pull", "postgres:16-alpine"], { timeout: 180000 });
    } catch {
      fail("base_image_unavailable");
    }
    ids = [...new Set(await list())];
  }
  if (ids.length !== 1 || !/^sha256:[a-f0-9]{64}$/.test(ids[0]))
    fail("image_mismatch");
  const image = JSON.parse(
    (
      await docker([
        "image",
        "inspect",
        "--format",
        '{"Id":{{json .Id}},"RepoTags":{{json .RepoTags}}}',
        "postgres:16-alpine",
      ])
    ).toString(),
  );
  if (image.Id !== ids[0] || !image.RepoTags?.includes("postgres:16-alpine"))
    fail("image_mismatch");
  onSource(source);
  return image.Id;
}

/** One owned synthetic rehearsal. No Preview controller or provider calls. */
export async function createRehearsal(
  fixture,
  { command = runCommand, startedAt = Date.now() } = {},
) {
  const workDeadline = startedAt + 780000;
  const cleanupDeadline = startedAt + 900000;
  const { parsePublishedGraphExchange } =
    await import("../packages/graph/dist/index.js");
  for (const revision of [fixture.a, fixture.b]) {
    const parsed = parsePublishedGraphExchange(revision.exchange);
    if (
      !Object.isFrozen(revision) ||
      !equal(parsed.graph, revision.graph) ||
      parsed.publishedRevision.graphHash !== revision.graphHash ||
      revision.graph.metadata.id !== fixture.applicationId
    )
      fail("fixture_invalid");
  }
  const engine = await preflight(command);
  const contract = checkCompatibility(fixture.a, fixture.b, fixture.pageId);
  const owner = ownership(fixture.runId, fixture.applicationId);
  const parent = join(repository, "generated", ".durable-rehearsals");
  const root = join(parent, owner.runId);
  await plainParents(parent);
  await mkdir(parent, { recursive: true });
  await mkdir(root);
  await writeFile(
    join(root, "lease.json"),
    JSON.stringify({
      runId: owner.runId,
      applicationId: owner.applicationId,
      phase: "allocated",
    }),
    { flag: "wx" },
  );
  const resources = [];
  const images = {};
  const events = [];
  let gateway;
  let closing = false;
  let closed = false;
  let bootstrapDone = false;
  let restoreEnabled = false;
  let interrupted = false;
  let uncertainProcessExit = false;
  const cancellation = new AbortController();
  const evidence = {
    runId: owner.runId,
    applicationId: owner.applicationId,
    engine,
    databaseContract: contract,
    graphHashes: [fixture.a.graphHash, fixture.b.graphHash],
    lockDigests: [
      fixture.a.compositionLock.lockDigest,
      fixture.b.compositionLock.lockDigest,
    ],
    bundleDigests: [fixture.a, fixture.b].map((x) =>
      hash(JSON.stringify(x.manifest)),
    ),
    images,
    phases: events,
  };
  const report = (phase, outcome, durationMs = 0) =>
    process.stdout.write(
      `DURABLE_DELIVERY_STAGE ${JSON.stringify({ runId: owner.runId, phase, outcome, durationMs })}\n`,
    );
  const docker = async (args, options = {}) => {
    if (interrupted && !closing) fail("interrupted");
    const remaining = (closing ? cleanupDeadline : workDeadline) - Date.now();
    if (remaining <= 0) fail(closing ? "cleanup_required" : "attempt_timeout");
    try {
      return await command("docker", args, {
        cwd: root,
        ...options,
        timeout: Math.min(options.timeout ?? 120000, remaining),
        signal: closing
          ? undefined
          : options.signal
            ? AbortSignal.any([options.signal, cancellation.signal])
            : cancellation.signal,
      });
    } catch (error) {
      uncertainProcessExit ||= error.uncertainExit === true;
      throw error;
    }
  };
  const compose = (args, options = {}) =>
    docker(
      [
        "compose",
        "-p",
        owner.project,
        "--env-file",
        ".env",
        "-f",
        "compose.json",
        ...args,
      ],
      options,
    );
  const name = (service) => `${owner.project}-${service}`;
  const inventory = async (kind) => {
    const args =
      kind === "container"
        ? ["ps", "-aq"]
        : kind === "volume"
          ? ["volume", "ls", "-q"]
          : kind === "network"
            ? ["network", "ls", "-q"]
            : ["image", "ls", "--no-trunc", "-q"];
    return (
      await docker([
        ...args,
        "--filter",
        `label=factory.durable.run=${owner.runId}`,
      ])
    )
      .toString()
      .trim()
      .split(/\s+/)
      .filter(Boolean);
  };
  const inspect = async (kind, resourceName) => {
    const format =
      kind === "image"
        ? '{"Id":{{json .Id}},"Labels":{{json .Config.Labels}},"RepoTags":{{json .RepoTags}}}'
        : "{{json .}}";
    const raw = (
      await docker([kind, "inspect", "--format", format, resourceName])
    )
      .toString()
      .trim();
    return JSON.parse(raw);
  };
  // Docker template emits a JSON object directly, avoiding any environment projection.
  const container = async (service, options = {}) => {
    const raw = await docker(
      [
        "inspect",
        "--type",
        "container",
        "--format",
        '{"Id":{{json .Id}},"Name":{{json .Name}},"Labels":{{json .Config.Labels}},"Image":{{json .Image}},"State":{{json .State}},"Mounts":{{json .Mounts}},"Ports":{{json .NetworkSettings.Ports}}}',
        name(service),
      ],
      options,
    );
    const item = JSON.parse(raw.toString());
    assertOwned(item, name(service), owner);
    return item;
  };
  const verifyVolume = async (volume) =>
    assertOwned(await inspect("volume", volume), volume, owner);
  const saveCompose = async () => {
    const document = composeDocument(owner, images);
    if (!restoreEnabled) {
      for (const service of ["restore-postgres", "restore-api", "restore-web"])
        delete document.services[service];
      delete document.volumes.restore;
    }
    return writeFile(
      join(root, "compose.json"),
      JSON.stringify(document, null, 2),
    );
  };
  async function createVolume(volume) {
    const all = (await docker(["volume", "ls", "--format", "{{.Name}}"]))
      .toString()
      .split(/\r?\n/);
    if (all.includes(volume)) fail("ownership_collision");
    await docker([
      "volume",
      "create",
      ...Object.entries(owner.labels).flatMap(([k, v]) => [
        "--label",
        `${k}=${v}`,
      ]),
      volume,
    ]);
    resources.push({ kind: "volume", name: volume });
    await verifyVolume(volume);
  }
  async function up(services) {
    await verifyVolume(
      services.some((x) => x.startsWith("restore"))
        ? owner.restoreVolume
        : owner.volume,
    );
    assertOwned(await inspect("network", owner.network), owner.network, owner);
    const existingNames = (await docker(["ps", "-a", "--format", "{{.Names}}"]))
      .toString()
      .split(/\r?\n/);
    for (const service of services) {
      const resourceName = name(service);
      if (existingNames.includes(resourceName)) fail("ownership_collision");
      if (
        resources.some((x) => x.kind === "container" && x.name === resourceName)
      )
        fail("ownership_collision");
      resources.push({ kind: "container", name: resourceName });
    }
    await compose(["up", "-d", "--no-build", "--no-deps", ...services], {
      timeout: 120000,
    });
    for (const service of services) {
      const item = await container(service);
      const expected = service.endsWith("postgres")
        ? images.postgres
        : images[
            service === "bootstrap"
              ? "bootstrap"
              : service.replace(/^restore-/, "a-")
          ];
      if (item.Image !== expected) fail("image_mismatch");
      if (service.endsWith("postgres")) {
        const expectedVolume = service.startsWith("restore")
          ? owner.restoreVolume
          : owner.volume;
        if (
          item.Mounts.filter(
            (x) =>
              x.Type === "volume" &&
              x.Name === expectedVolume &&
              x.Destination === "/var/lib/postgresql/data",
          ).length !== 1
        )
          fail("ownership_mismatch");
        if (Object.values(item.Ports ?? {}).some(Boolean))
          fail("endpoint_invalid");
      }
    }
  }
  async function removeSlot(slot) {
    for (const part of ["web", "api"]) {
      const service = `${slot}-${part}`;
      const index = resources.findIndex((x) => x.name === name(service));
      if (index < 0) continue;
      const item = await container(service);
      await docker(["stop", "--time", "10", item.Id]);
      const stopped = await container(service);
      if (stopped.Id !== item.Id || stopped.State.Running)
        fail("cleanup_required");
      await docker(["rm", item.Id]);
      resources.splice(index, 1);
    }
  }
  async function addresses(slot, options = {}) {
    const result = {};
    for (const part of ["api", "web"]) {
      const item = await container(`${slot}-${part}`, options);
      if (
        item.Image !== images[`${slot === "restore" ? "a" : slot}-${part}`] ||
        !item.State.Running
      )
        fail("image_mismatch");
      const binding = item.Ports?.[`${part === "api" ? 3001 : 3000}/tcp`];
      if (
        !Array.isArray(binding) ||
        binding.length !== 1 ||
        binding[0].HostIp !== "127.0.0.1" ||
        !/^\d+$/.test(binding[0].HostPort)
      )
        fail("endpoint_invalid");
      result[part] = `http://127.0.0.1:${binding[0].HostPort}`;
    }
    return result;
  }
  async function ready(slot, probe, timeout = 30000) {
    return pollReadiness(
      async (signal, remaining) => {
        const urls = await addresses(slot, { signal, timeout: remaining });
        const response = await fetch(`${urls.api}/api/health`, {
          signal: AbortSignal.any([signal, AbortSignal.timeout(2000)]),
          redirect: "error",
        });
        return response.ok && (await probe(urls, signal, remaining));
      },
      { timeout },
    );
  }
  async function phase(label, action) {
    const start = Date.now();
    report(label, "started");
    try {
      if (Date.now() >= workDeadline) fail("attempt_timeout");
      const result = await action();
      events.push({
        phase: label,
        outcome: "passed",
        durationMs: Date.now() - start,
      });
      report(label, "passed", Date.now() - start);
      return result;
    } catch (error) {
      events.push({
        phase: label,
        outcome: safeCode(error),
        durationMs: Date.now() - start,
      });
      report(label, safeCode(error), Date.now() - start);
      throw new Error(safeCode(error));
    }
  }
  async function snapshot(slot) {
    const item = await container(`${slot}-api`);
    const script = `const {PrismaClient}=require('@prisma/client');const {createHash}=require('node:crypto');const p=new PrismaClient();(async()=>{try{const result={};for(const [key,model] of [['audit','factory_AuditEvent'],['capability','factory_CapabilityEvent'],['receipt','taskMutationReceipt']]){const rows=await p[model].findMany({orderBy:{id:'asc'}});result[key]={count:rows.length,sha256:createHash('sha256').update(JSON.stringify(rows)).digest('hex')};}process.stdout.write(JSON.stringify(result));}finally{await p.$disconnect();}})().catch(()=>process.exitCode=1);`;
    return JSON.parse(
      (
        await docker(["exec", "-i", item.Id, "node"], { input: script })
      ).toString(),
    );
  }
  async function close() {
    if (closed) return;
    if (closing) fail("cleanup_required");
    closing = true;
    try {
      await gateway?.close();
      if (uncertainProcessExit) fail("cleanup_required");
      // Inspect every resource before the first destructive operation. Missing entries
      // from a failed Compose start are reconciled against exact names, never prefixes.
      const actualContainers = (
        await docker(["ps", "-a", "--format", "{{.Names}}"])
      )
        .toString()
        .split(/\r?\n/);
      const retained = resources.filter(
        (x) => x.kind !== "container" || actualContainers.includes(x.name),
      );
      for (const resource of retained) {
        if (resource.kind === "container")
          await container(resource.name.slice(owner.project.length + 1));
        else
          assertOwned(
            await inspect(resource.kind, resource.name),
            resource.name,
            owner,
          );
      }
      const expectedContainers = new Set(
        retained.filter((x) => x.kind === "container").map((x) => x.name),
      );
      const expectedIds = new Set();
      for (const resource of retained.filter((x) => x.kind === "container"))
        expectedIds.add(
          (await container(resource.name.slice(owner.project.length + 1))).Id,
        );
      for (const resource of retained.filter((x) => x.kind === "volume")) {
        const attached = (
          await docker([
            "ps",
            "-aq",
            "--no-trunc",
            "--filter",
            `volume=${resource.name}`,
          ])
        )
          .toString()
          .trim()
          .split(/\s+/)
          .filter(Boolean);
        if (attached.some((id) => !expectedIds.has(id)))
          fail("cleanup_required");
      }
      for (const id of await inventory("container")) {
        const raw = JSON.parse(
          (
            await docker(["inspect", "--format", '{"Name":{{json .Name}}}', id])
          ).toString(),
        );
        if (!expectedContainers.has(raw.Name.replace(/^\//, "")))
          fail("cleanup_required");
      }
      for (const resource of retained.filter((x) => x.kind === "container")) {
        const service = resource.name.slice(owner.project.length + 1);
        const item = await container(service);
        await docker(["stop", "--time", "10", item.Id]);
        const stopped = await container(service);
        if (stopped.Id !== item.Id || stopped.State.Running)
          fail("cleanup_required");
        await docker(["rm", item.Id]);
      }
      for (const resource of retained.filter((x) => x.kind === "network")) {
        const item = await inspect("network", resource.name);
        assertOwned(item, resource.name, owner);
        if (Object.keys(item.Containers ?? {}).length) fail("cleanup_required");
        await docker(["network", "rm", resource.name]);
      }
      for (const resource of retained.filter((x) => x.kind === "volume")) {
        await verifyVolume(resource.name);
        if (
          (await docker(["ps", "-aq", "--filter", `volume=${resource.name}`]))
            .toString()
            .trim()
        )
          fail("cleanup_required");
        await docker(["volume", "rm", resource.name]);
      }
      // Include completed images from an interrupted or partially failed build.
      for (const id of new Set(await inventory("image"))) {
        const item = await inspect("image", id);
        if (
          !/^sha256:[a-f0-9]{64}$/.test(id) ||
          item.Id !== id ||
          Object.entries(owner.labels).some(
            ([k, v]) => item.Labels?.[k] !== v,
          ) ||
          (item.RepoTags ?? []).some(
            (tag) =>
              !["bootstrap", "a-api", "a-web", "b-api", "b-web"].some(
                (key) => tag === `${owner.project}-${key}:latest`,
              ),
          )
        )
          fail("cleanup_required");
        await docker(["image", "rm", item.Id]);
      }
      for (const kind of ["container", "network", "volume", "image"])
        if ((await inventory(kind)).length) fail("cleanup_required");
      await plainParents(root);
      if (dirname(root) !== parent || relative(parent, root) !== owner.runId)
        fail("cleanup_required");
      async function checkScratch(directory) {
        for (const entry of await readdir(directory)) {
          const child = join(directory, entry);
          const info = await lstat(child);
          if (info.isSymbolicLink()) fail("cleanup_required");
          if (info.isDirectory()) await checkScratch(child);
          else if (!info.isFile() || info.nlink !== 1) fail("cleanup_required");
        }
      }
      await checkScratch(root);
      await rm(root, { recursive: true });
      closed = true;
      evidence.cleanup = "removed";
      report("cleanup", "removed");
    } catch {
      evidence.cleanup = "required";
      await writeFile(
        join(root, "lease.json"),
        JSON.stringify({
          runId: owner.runId,
          applicationId: owner.applicationId,
          phase: "cleanup-required",
          resources,
          images,
        }),
      ).catch(() => {});
      report("cleanup", "delivery.cleanup_required");
      fail("cleanup_required");
    } finally {
      closing = false;
      process.off("SIGINT", onSignal);
      process.off("SIGTERM", onSignal);
    }
  }
  const onSignal = () => {
    interrupted = true;
    cancellation.abort();
  };
  process.on("SIGINT", onSignal);
  process.on("SIGTERM", onSignal);
  try {
    await phase("immutable-fixtures", async () => {
      await materialize(join(root, "a"), fixture.a);
      await materialize(join(root, "b"), fixture.b);
    });
    const password = randomBytes(24).toString("hex");
    await writeFile(
      join(root, ".env"),
      `FIXTURE_DB_PASSWORD=${password}\nMAIN_DATABASE_URL=postgresql://generated:${password}@postgres:5432/generated\nRESTORE_DATABASE_URL=postgresql://generated:${password}@restore-postgres:5432/generated\n`,
      { flag: "wx", mode: 0o600 },
    );
    await saveCompose();
    await phase("build", async () => {
      await verifyTree(join(root, "a"), fixture.a.manifest);
      await verifyTree(join(root, "b"), fixture.b.manifest);
      await compose(
        ["build", "bootstrap", "a-api", "a-web", "b-api", "b-web"],
        { timeout: 600000, limit: 16777216 },
      );
      for (const key of ["bootstrap", "a-api", "a-web", "b-api", "b-web"]) {
        const item = await inspect("image", `${owner.project}-${key}`);
        if (
          !/^sha256:[a-f0-9]{64}$/.test(item.Id) ||
          Object.entries(owner.labels).some(([k, v]) => item.Labels?.[k] !== v)
        )
          fail("image_mismatch");
        images[key] = item.Id;
      }
    });
    await phase("base-image", async () => {
      images.postgres = await resolvePostgresImage(docker, {
        onSource: (source) => {
          evidence.postgresSource = source;
        },
      });
      await saveCompose();
    });
    await createVolume(owner.volume);
    const networks = (await docker(["network", "ls", "--format", "{{.Name}}"]))
      .toString()
      .split(/\r?\n/);
    if (networks.includes(owner.network)) fail("ownership_collision");
    await docker([
      "network",
      "create",
      ...Object.entries(owner.labels).flatMap(([k, v]) => [
        "--label",
        `${k}=${v}`,
      ]),
      owner.network,
    ]);
    resources.push({ kind: "network", name: owner.network });
    await phase("bootstrap-a", async () => {
      await up(["postgres"]);
      if (
        !(await pollReadiness(
          async (signal, remaining) =>
            (await container("postgres", { signal, timeout: remaining })).State
              .Health?.Status === "healthy",
        ))
      )
        fail("readiness_failed");
      await up(["bootstrap"]);
      if (
        !(await pollReadiness(
          async (signal, remaining) => {
            const item = await container("bootstrap", {
              signal,
              timeout: remaining,
            });
            if (item.State.Running) return false;
            if (item.State.ExitCode !== 0) fail("bootstrap_failed");
            return true;
          },
          { timeout: 120000 },
        ))
      )
        fail("bootstrap_failed");
      bootstrapDone = true;
      await up(["a-api", "a-web"]);
    });
  } catch (error) {
    evidence.failure = safeCode(error);
    let cleanupFailure;
    try {
      await close();
    } catch (cleanupError) {
      cleanupFailure = safeCode(cleanupError);
    }
    evidence.cleanupFailure = cleanupFailure ?? null;
    const failure = new Error(cleanupFailure ?? safeCode(error));
    failure.evidence = evidence;
    throw failure;
  }
  return {
    owner,
    evidence,
    phase,
    ready,
    addresses,
    snapshot,
    get gateway() {
      return gateway;
    },
    async openGateway() {
      const a = await addresses("a");
      gateway = await createGateway({ a: a.web, b: a.web });
      return gateway;
    },
    async startCandidate(withWeb = true) {
      if (!bootstrapDone) fail("bootstrap_required");
      checkCompatibility(fixture.a, fixture.b, fixture.pageId);
      await verifyTree(join(root, "b"), fixture.b.manifest);
      await up(withWeb ? ["b-api", "b-web"] : ["b-api"]);
    },
    removeCandidate: () => removeSlot("b"),

    async failedReadiness(probe) {
      const item = await container("b-api");
      if (item.Image !== images["b-api"] || !item.State.Running)
        fail("image_mismatch");
      const bindings = item.Ports?.["3001/tcp"];
      if (bindings?.length !== 1 || bindings[0].HostIp !== "127.0.0.1")
        fail("endpoint_invalid");
      const absent = createServer();
      await new Promise((r) => absent.listen(0, "127.0.0.1", r));
      const port = absent.address().port;
      await new Promise((r) => absent.close(r));
      const urls = {
        api: `http://127.0.0.1:${bindings[0].HostPort}`,
        web: `http://127.0.0.1:${port}`,
      };
      return pollReadiness(
        async (signal, remaining) => {
          const health = await fetch(`${urls.api}/api/health`, {
            signal: AbortSignal.any([signal, AbortSignal.timeout(1000)]),
            redirect: "error",
          });
          return health.ok && (await probe(urls, signal, remaining));
        },
        { timeout: 3000 },
      );
    },
    async switchTo(slot, probe) {
      const urls = await addresses(slot);
      await gateway.setEndpoint(slot, urls.web);
      await gateway.promote(slot, () => ready(slot, probe));
    },
    async rollback(probe) {
      checkCompatibility(fixture.a, fixture.b, fixture.pageId);
      await verifyTree(join(root, "a"), fixture.a.manifest);
      await removeSlot("a");
      await up(["a-api", "a-web"]);
      const urls = await addresses("a");
      gateway.setEndpoint("a", urls.web);
      await gateway.promote("a", () => ready("a", probe));
    },
    async restartDatabase() {
      await gateway.quiesce(async () => {
        await verifyVolume(owner.volume);
        const original = await container("postgres");
        await docker(["restart", "--time", "10", original.Id]);
        if (
          !(await pollReadiness(async (signal, remaining) => {
            const current = await container("postgres", {
              signal,
              timeout: remaining,
            });
            if (
              current.Id !== original.Id ||
              current.Image !== images.postgres ||
              !current.Mounts.some(
                (m) =>
                  m.Name === owner.volume &&
                  m.Destination === "/var/lib/postgresql/data",
              )
            )
              fail("ownership_mismatch");
            return current.State.Health?.Status === "healthy";
          }))
        )
          fail("readiness_failed");
      });
    },
    async backup() {
      return gateway.quiesce(async () => {
        const db = await container("postgres");
        const bytes = await docker(
          [
            "exec",
            db.Id,
            "pg_dump",
            "-U",
            "generated",
            "-d",
            "generated",
            "--format=custom",
            "--no-owner",
            "--no-acl",
          ],
          { limit: 16777216 },
        );
        await writeFile(join(root, "backup.dump"), bytes, {
          flag: "wx",
          mode: 0o600,
        });
        const result = { sha256: hash(bytes), size: bytes.length };
        evidence.backup = result;
        return result;
      });
    },
    async restore() {
      await createVolume(owner.restoreVolume);
      restoreEnabled = true;
      await saveCompose();
      await up(["restore-postgres"]);
      if (
        !(await pollReadiness(
          async (signal, remaining) =>
            (
              await container("restore-postgres", {
                signal,
                timeout: remaining,
              })
            ).State.Health?.Status === "healthy",
        ))
      )
        fail("readiness_failed");
      const bytes = await readFile(join(root, "backup.dump"));
      if (hash(bytes) !== evidence.backup?.sha256) fail("backup_integrity");
      const db = await container("restore-postgres");
      await docker(
        [
          "exec",
          "-i",
          db.Id,
          "pg_restore",
          "-U",
          "generated",
          "-d",
          "generated",
          "--exit-on-error",
          "--no-owner",
          "--no-acl",
        ],
        { input: bytes, timeout: 120000 },
      );
      await up(["restore-api", "restore-web"]);
      return addresses("restore");
    },
    close,
  };
}

export async function checkHttpStatus(
  response,
  expectedStatus,
  evidence,
  operation,
) {
  if (
    !["create-task", "read-task", "correct-task", "start-task"].includes(
      operation,
    )
  )
    fail("arguments_invalid");
  const actualStatus =
    typeof response.status === "function" ? response.status() : response.status;
  if (
    ![actualStatus, expectedStatus].every(
      (status) => Number.isInteger(status) && status >= 100 && status <= 599,
    )
  )
    fail("http_response_invalid");
  let code = null;
  if (actualStatus !== expectedStatus) {
    const body = await response.json().catch(() => null);
    if (
      [
        "task.invalid_request",
        "task.denied",
        "task.not_found",
        "task.version_conflict",
        "task.idempotency_conflict",
        "task.idempotency_key_required",
      ].includes(body?.code)
    )
      code = body.code;
  }
  evidence.httpChecks ??= [];
  if (evidence.httpChecks.length >= 64) evidence.httpChecks.shift();
  evidence.httpChecks.push({ operation, expectedStatus, actualStatus, code });
  if (actualStatus !== expectedStatus) fail("http_status_mismatch");
}

export function createStageReporter(write) {
  let runId = null,
    failure = null,
    cleanup = "unknown";
  return {
    onLine(line) {
      if (line.startsWith("DURABLE_DELIVERY_EVIDENCE ")) {
        try {
          const value = JSON.parse(
            line.slice("DURABLE_DELIVERY_EVIDENCE ".length),
          );
          if (value.runId !== null && !/^[a-f0-9]{24}$/.test(value.runId))
            return;
          if (runId && runId !== value.runId) return;
          runId = value.runId;
          if (/^delivery\.[a-z_]+$/.test(value.failure ?? ""))
            failure = value.failure;
          if (["removed", "required", "not-allocated"].includes(value.cleanup))
            cleanup = value.cleanup;
          if (value.cleanupFailure === "delivery.cleanup_required")
            cleanup = "required";
          write(
            `DURABLE_DELIVERY_RESULT ${JSON.stringify({ runId, failure, cleanup })}\n`,
          );
        } catch {}
        return;
      }
      if (!line.startsWith("DURABLE_DELIVERY_STAGE ")) return;
      try {
        const value = JSON.parse(line.slice("DURABLE_DELIVERY_STAGE ".length));
        if (
          !/^[a-f0-9]{24}$/.test(value.runId) ||
          !/^[a-z-]{1,60}$/.test(value.phase) ||
          !/^(started|passed|removed|delivery\.[a-z_]+)$/.test(value.outcome) ||
          !Number.isFinite(value.durationMs) ||
          value.durationMs < 0 ||
          value.durationMs > 900000
        )
          return;
        if (runId && runId !== value.runId) return;
        runId = value.runId;
        if (value.phase === "cleanup") {
          if (value.outcome === "removed") cleanup = "removed";
          else if (value.outcome === "delivery.cleanup_required")
            cleanup = "required";
        } else if (value.outcome.startsWith("delivery."))
          failure ??= value.outcome;
        write(
          `DURABLE_DELIVERY_STAGE ${JSON.stringify({ runId, phase: value.phase, outcome: value.outcome, durationMs: value.durationMs })}\n`,
        );
      } catch {}
    },
    get failureCode() {
      return cleanup === "required" ? "delivery.cleanup_required" : failure;
    },
    summary() {
      return { runId, failure, cleanup };
    },
  };
}

async function main() {
  const startedAt = Date.now();
  const mode = parseCli(process.argv.slice(2));
  if (mode === "plan") {
    process.stdout.write(
      `${JSON.stringify({ stages, scope: "synthetic local Team Task only" })}\n`,
    );
    return;
  }
  await preflight();
  const reporter = createStageReporter((line) => process.stdout.write(line));
  // Invoke the installed JavaScript CLI directly: Windows never needs a shell.
  try {
    await runCommand(
      process.execPath,
      [
        join(repository, "node_modules", "@playwright", "test", "cli.js"),
        "test",
        "e2e/local-durable-delivery.spec.ts",
        "--workers=1",
      ],
      {
        timeout: Math.max(1, 900000 - (Date.now() - startedAt)),
        limit: 1048576,
        onLine: reporter.onLine,
      },
    );
  } catch (error) {
    process.stdout.write(
      `DURABLE_DELIVERY_RESULT ${JSON.stringify(reporter.summary())}\n`,
    );
    throw new Error(reporter.failureCode ?? safeCode(error));
  }
  process.stdout.write("delivery.completed\n");
}
if (
  process.argv[1] &&
  pathToFileURL(resolve(process.argv[1])).href === import.meta.url
)
  main().catch((error) => {
    process.stderr.write(`${safeCode(error)}\n`);
    process.exitCode = 1;
  });
