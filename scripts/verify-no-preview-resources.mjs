import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { pathToFileURL } from "node:url";

const execFileAsync = promisify(execFile);
const projectLabelFilter = "label=com.docker.compose.project";
const projectLabelFormat = '{{.Label "com.docker.compose.project"}}';
const previewProjectName = /^factory-preview-preview-[a-z0-9-]+$/;
const dockerQueries = [
  ["ps", "-a", "--filter", projectLabelFilter, "--format", projectLabelFormat],
  [
    "network",
    "ls",
    "--filter",
    projectLabelFilter,
    "--format",
    projectLabelFormat,
  ],
  [
    "volume",
    "ls",
    "--filter",
    projectLabelFilter,
    "--format",
    projectLabelFormat,
  ],
];

async function runDocker(args) {
  const { stdout } = await execFileAsync("docker", args, {
    encoding: "utf8",
    windowsHide: true,
  });
  return stdout;
}

function containsPreviewProject(output) {
  return output
    .split(/\r?\n/u)
    .some((label) => previewProjectName.test(label.trim()));
}

export async function runNoPreviewResourceGuard({
  runDocker: queryDocker = runDocker,
  writeError = (message) => console.error(message),
} = {}) {
  let outputs;
  try {
    outputs = [];
    for (const query of dockerQueries) {
      outputs.push(await queryDocker(query));
    }
  } catch {
    writeError("ERROR: unable to verify worker preview Docker resources.");
    return 1;
  }

  if (outputs.some(containsPreviewProject)) {
    writeError("ERROR: worker preview Docker resources remain.");
    return 1;
  }
  return 0;
}

if (
  process.argv[1] !== undefined &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  process.exitCode = await runNoPreviewResourceGuard();
}
