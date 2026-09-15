import {
  MAX_DEFINITION_BYTES,
  readShippedDefinitionBytes,
  validateDefinitionBatch,
} from "./product-definition-data.js";

/** Fixed shipped input or an explicitly bounded stdin stream; candidate paths do not exist. */
async function main(): Promise<void> {
  const args = process.argv.slice(2);
  if (args.length > 1 || (args.length === 1 && args[0] !== "--stdin")) {
    process.stderr.write("definition.validation-failed\n");
    process.exitCode = 2;
    return;
  }
  let bytes: Uint8Array;
  if (args.length === 0) {
    bytes = readShippedDefinitionBytes();
  } else {
    const chunks: Buffer[] = [];
    let size = 0;
    for await (const value of process.stdin) {
      const chunk = Buffer.isBuffer(value)
        ? value
        : Buffer.from(value as string);
      const remaining = MAX_DEFINITION_BYTES + 1 - size;
      chunks.push(chunk.subarray(0, remaining));
      size += Math.min(chunk.length, remaining);
      if (size > MAX_DEFINITION_BYTES) break;
    }
    bytes = Buffer.concat(chunks, size);
  }
  const report = validateDefinitionBatch(bytes);
  process.stdout.write(JSON.stringify(report) + "\n");
  process.exitCode =
    report.attempted > 0 && report.admitted === report.attempted ? 0 : 1;
}
void main().catch(() => {
  process.stderr.write("definition.validation-failed\n");
  process.exitCode = 2;
});
