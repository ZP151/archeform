import { EventEmitter } from "node:events";
import * as net from "node:net";
import { afterEach, describe, expect, it, vi } from "vitest";
import { reservePreviewPorts } from "../src/preview-port-reservation.js";

vi.mock("node:net", async (original) => ({
  ...(await original<typeof net>()),
}));
afterEach(() => vi.restoreAllMocks());

function fakeServer(port: number, fault?: "bind" | "close" | "pending") {
  const server = new EventEmitter();
  let listening = false;
  return Object.assign(server, {
    address: () => ({ address: "127.0.0.1", family: "IPv4", port }),
    listen: vi.fn(() => {
      if (fault !== "pending")
        queueMicrotask(() => {
          if (fault === "bind") server.emit("error", new Error("Bind failed."));
          else {
            listening = true;
            server.emit("listening");
          }
        });
      return server;
    }),
    close: vi.fn((callback: (error?: Error) => void) => {
      listening = false;
      queueMicrotask(() =>
        callback(fault === "close" ? new Error("Close failed.") : undefined),
      );
      return server;
    }),
    get listening() {
      return listening;
    },
  });
}
function mockServers(...servers: ReturnType<typeof fakeServer>[]) {
  const create = vi.spyOn(net, "createServer");
  for (const server of servers)
    create.mockReturnValueOnce(server as unknown as net.Server);
  return create;
}
async function bind(port: number) {
  const server = net.createServer();
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen({ host: "127.0.0.1", port, exclusive: true }, resolve);
  });
  return server;
}
async function close(server: net.Server) {
  await new Promise<void>((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve())),
  );
}

describe("preview port reservations", () => {
  it("holds two distinct real loopback ports until release, then permits both to bind", async () => {
    const reservation = await reservePreviewPorts(new AbortController().signal);
    try {
      expect(reservation.webPort).not.toBe(reservation.apiPort);
      for (const port of [reservation.webPort, reservation.apiPort]) {
        expect(Number.isSafeInteger(port) && port > 0 && port <= 65535).toBe(
          true,
        );
        await expect(bind(port)).rejects.toMatchObject({ code: "EADDRINUSE" });
      }
    } finally {
      await reservation.release();
    }
    for (const port of [reservation.webPort, reservation.apiPort])
      await close(await bind(port));
    await reservation.release();
  });
  it("destroys accepted connections so release cannot wait for a client", async () => {
    const reservation = await reservePreviewPorts(new AbortController().signal);
    const client = net.createConnection({
      host: "127.0.0.1",
      port: reservation.webPort,
    });
    try {
      await new Promise<void>((resolve, reject) => {
        client.once("close", resolve);
        client.once("error", reject);
      });
      await reservation.release();
    } finally {
      client.destroy();
      await reservation.release();
    }
  });
  it.each([0, 1])(
    "cleans partial acquisition if server creation throws at %i",
    async (index) => {
      const first = fakeServer(49101);
      const create = mockServers(...(index === 1 ? [first] : []));
      create.mockImplementationOnce(() => {
        throw new Error("Create failed.");
      });
      await expect(
        reservePreviewPorts(new AbortController().signal),
      ).rejects.toThrow();
      if (index === 1) expect(first.close).toHaveBeenCalledOnce();
    },
  );
  it("settles real cancellation while the initial listen is pending", async () => {
    const create = vi.spyOn(net, "createServer");
    const controller = new AbortController();
    const pending = reservePreviewPorts(controller.signal);
    controller.abort();
    await expect(pending).rejects.toThrow();
    await new Promise<void>((resolve) => setImmediate(resolve));
    expect(create).toHaveBeenCalledOnce();
    const server = create.mock.results[0]!.value as net.Server;
    expect(server.listening).toBe(false);
    expect(server.address()).toBeNull();
    expect(server.listenerCount("listening")).toBe(0);
    expect(server.listenerCount("error")).toBe(0);
  });
  it.each([0, 1])(
    "closes all created listeners after bind failure %i",
    async (index) => {
      const first = fakeServer(49101, index === 0 ? "bind" : undefined);
      const second = fakeServer(49102, "bind");
      const create = mockServers(first, second);
      await expect(
        reservePreviewPorts(new AbortController().signal),
      ).rejects.toMatchObject({ cleanupComplete: true });
      expect(first.close).toHaveBeenCalledOnce();
      expect(create).toHaveBeenCalledTimes(index + 1);
      if (index === 1) expect(second.close).toHaveBeenCalledOnce();
    },
  );
  it.each([0, 65536, 1.5, 49101])(
    "rejects invalid or duplicate second port %s",
    async (port) => {
      const first = fakeServer(49101);
      const second = fakeServer(port);
      mockServers(first, second);
      await expect(
        reservePreviewPorts(new AbortController().signal),
      ).rejects.toThrow();
      expect(first.close).toHaveBeenCalledOnce();
      expect(second.close).toHaveBeenCalledOnce();
    },
  );
  it("closes held sockets automatically on cancellation", async () => {
    const controller = new AbortController();
    const reservation = await reservePreviewPorts(controller.signal);
    controller.abort();
    await expect(reservation.release()).rejects.toThrow();
    for (const port of [reservation.webPort, reservation.apiPort])
      await close(await bind(port));
  });
  it("settles cancellation during second acquisition and closes both listeners", async () => {
    const first = fakeServer(49101);
    const second = fakeServer(49102, "pending");
    mockServers(first, second);
    const controller = new AbortController();
    const pending = reservePreviewPorts(controller.signal);
    await vi.waitFor(() => expect(second.listen).toHaveBeenCalledOnce());
    controller.abort();
    await expect(pending).rejects.toThrow();
    expect(first.close).toHaveBeenCalledOnce();
    expect(second.close).toHaveBeenCalledOnce();
  });
  it("rejects pre-aborted acquisition without creating a listener", async () => {
    const create = mockServers();
    const controller = new AbortController();
    controller.abort();
    await expect(reservePreviewPorts(controller.signal)).rejects.toThrow();
    expect(create).not.toHaveBeenCalled();
  });
  it("latches a held listener error, closes both, and rejects release", async () => {
    const first = fakeServer(49101);
    const second = fakeServer(49102);
    mockServers(first, second);
    const reservation = await reservePreviewPorts(new AbortController().signal);
    first.emit("error", new Error("Listener failed."));
    await expect(reservation.release()).rejects.toMatchObject({
      cleanupComplete: true,
    });
    expect(first.close).toHaveBeenCalledOnce();
    expect(second.close).toHaveBeenCalledOnce();
    expect(first.listenerCount("error")).toBe(0);
    expect(second.listenerCount("listening")).toBe(0);
  });
  it("awaits all closures and rejects a close failure", async () => {
    const first = fakeServer(49101, "close");
    const second = fakeServer(49102);
    mockServers(first, second);
    const reservation = await reservePreviewPorts(new AbortController().signal);
    await expect(reservation.release()).rejects.toMatchObject({
      cleanupComplete: false,
    });
    expect(first.close).toHaveBeenCalledOnce();
    expect(second.close).toHaveBeenCalledOnce();
  });
});
