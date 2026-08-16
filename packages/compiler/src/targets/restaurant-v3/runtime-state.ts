export function renderRestaurantRuntimeStateModule(): string {
  return `import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

export function createStateStore(statePath, seed, revisionId) {
  let queue = Promise.resolve();
  let replacementSequence = 0;
  const fresh = () => ({ schemaVersion: 1, revisionId, ...structuredClone(seed), receipts: {}, audit: [] });
  async function read() {
    try {
      const value = JSON.parse(await readFile(statePath, "utf8"));
      if (value.schemaVersion !== 1) throw new Error("unsupported schema");
      return value;
    } catch (error) {
      if (error?.code !== "ENOENT") throw error;
      const initial = fresh();
      await replace(initial);
      return initial;
    }
  }
  async function replace(value) {
    await mkdir(dirname(statePath), { recursive: true });
    replacementSequence += 1;
    const temporary = statePath + "." + process.pid + "." + replacementSequence + ".tmp";
    await writeFile(temporary, JSON.stringify(value, null, 2) + "\\n", "utf8");
    await rename(temporary, statePath);
  }
  async function mutate(operation) {
    const next = queue.then(async () => {
      const state = await read();
      const result = await operation(state);
      await replace(state);
      return result;
    });
    queue = next.then(() => undefined, () => undefined);
    return next;
  }
  return { read, mutate };
}
`;
}
