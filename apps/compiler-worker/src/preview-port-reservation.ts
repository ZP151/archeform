import { createServer, type Server } from "node:net";

type ReservedListener = {
  readonly server: Server;
  listened: boolean;
  closed?: Promise<void>;
  rejectPending?: (error: Error) => void;
  onError: () => void;
  onListening: () => void;
};

export type PreviewPortReservation = {
  readonly webPort: number;
  readonly apiPort: number;
  release(): Promise<void>;
};

export class PreviewPortReservationFailure extends Error {
  constructor(readonly cleanupComplete: boolean) {
    super("Preview port reservation failed.");
    this.name = "PreviewPortReservationFailure";
  }
}

/** Process-only sockets bridge ephemeral selection to fixed Compose bindings. */
export async function reservePreviewPorts(
  signal: AbortSignal,
): Promise<PreviewPortReservation> {
  const listeners: ReservedListener[] = [];
  let failure: Error | undefined;
  let listenerCleanupComplete = true;
  let closing: Promise<void> | undefined;
  const closeAll = (): Promise<void> => {
    closing ??= Promise.all(
      listeners.map((listener) => {
        listener.closed ??= Promise.resolve().then(
          () =>
            new Promise<void>((resolve) => {
              const finish = (error?: Error) => {
                if (
                  error &&
                  !(
                    !listener.listened &&
                    (error as NodeJS.ErrnoException).code ===
                      "ERR_SERVER_NOT_RUNNING"
                  )
                ) {
                  listenerCleanupComplete = false;
                  failure ??= new Error("Preview port release failed.");
                }
                listener.server.removeListener("error", listener.onError);
                listener.server.removeListener(
                  "listening",
                  listener.onListening,
                );
                resolve();
              };
              try {
                listener.server.close(finish);
              } catch {
                finish(new Error("Preview port release failed."));
              }
            }),
        );
        return listener.closed;
      }),
    ).then(() => {
      signal.removeEventListener("abort", onAbort);
    });
    return closing;
  };
  const fail = () => {
    failure ??= new Error("Preview port reservation failed.");
    for (const listener of listeners) listener.rejectPending?.(failure);
    void closeAll();
  };
  const onAbort = () => fail();
  if (signal.aborted) throw new PreviewPortReservationFailure(true);
  signal.addEventListener("abort", onAbort, { once: true });

  const acquire = async (): Promise<number> => {
    if (failure || signal.aborted)
      throw new Error("Preview port reservation failed.");
    const server = createServer((socket) => socket.destroy());
    const listener: ReservedListener = {
      server,
      listened: false,
      onError: fail,
      onListening: () => undefined,
    };
    listeners.push(listener);
    return new Promise<number>((resolve, reject) => {
      listener.rejectPending = reject;
      listener.onListening = () => {
        listener.listened = true;
        const address = server.address();
        if (
          !address ||
          typeof address === "string" ||
          address.address !== "127.0.0.1" ||
          !Number.isSafeInteger(address.port) ||
          address.port < 1 ||
          address.port > 65535
        ) {
          fail();
          return;
        }
        listener.rejectPending = undefined;
        resolve(address.port);
      };
      server.on("error", listener.onError);
      server.once("listening", listener.onListening);
      try {
        server.listen({ host: "127.0.0.1", port: 0, exclusive: true });
      } catch {
        fail();
      }
    });
  };
  try {
    const webPort = await acquire();
    const apiPort = await acquire();
    if (webPort === apiPort) throw new Error("Preview ports must be distinct.");
    if (failure || signal.aborted)
      throw new Error("Preview port reservation failed.");
    return {
      webPort,
      apiPort,
      async release() {
        await closeAll();
        if (failure || signal.aborted)
          throw new PreviewPortReservationFailure(listenerCleanupComplete);
      },
    };
  } catch {
    fail();
    await closeAll();
    throw new PreviewPortReservationFailure(listenerCleanupComplete);
  }
}
