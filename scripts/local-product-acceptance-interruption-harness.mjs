import { spawn } from "node:child_process";
import { createHash, randomBytes } from "node:crypto";
import {
  lstat,
  mkdtemp,
  readFile,
  readdir,
  realpath,
  rmdir,
  unlink,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

import { executeCommand } from "./local-product-acceptance.mjs";

const apiVersion = "factory.local-acceptance-interruption-harness/v1";
const windowsLauncherApiVersion = "factory.windows-native-console-launcher/v1";
const posixAcceptanceCommand = "pnpm accept:local || exit $?; exit 130";
const stages = new Set([
  "before-ready",
  "after-ack",
  "before-outer-up",
  "during-outer-up",
  "after-outer-up",
  "before-preview-intent",
  "after-preview-intent",
  "during-preview-post",
  "after-preview-response",
  "during-preview-startup",
  "after-preview-ready",
  "during-playwright",
  "during-preview-reconcile",
  "during-preview-stop",
  "after-preview-proof",
  "during-outer-down",
  "after-outer-down",
  "during-outer-proof",
  "during-global-guard",
  "before-root-removal",
]);
const signals = new Set(
  process.platform === "win32"
    ? ["CTRL_C", "CTRL_BREAK"]
    : ["SIGINT", "SIGTERM"],
);

export function parseArguments(argv) {
  if (argv.length !== 2) return null;
  const stage = argv.find((value) => value.startsWith("--stage="))?.slice(8);
  const signal = argv.find((value) => value.startsWith("--signal="))?.slice(9);
  return stages.has(stage) && signals.has(signal) ? { signal, stage } : null;
}

export function gateMessage(line, stage) {
  try {
    const value = JSON.parse(line);
    return (
      value !== null &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      Object.keys(value).sort().join(",") === "apiVersion,stage,type" &&
      value.apiVersion === apiVersion &&
      value.stage === stage &&
      value.type === "gate"
    );
  } catch {
    return false;
  }
}

export function privateAcceptanceRootsAbsent(entries) {
  return !entries.some((entry) =>
    /^factory-local-[a-z0-9-]+-acceptance-/u.test(entry),
  );
}

export function isPosixAcceptanceCommand(args) {
  return /(?:^|\s)(?:\/[^\s]+\/)?pnpm\s+accept:local(?:\s|$)/u.test(args);
}

export function minimalDockerEnvironment(
  environment = process.env,
  platform = process.platform,
) {
  const valueFor = (name) =>
    Object.entries(environment).find(
      ([key]) => key.toLowerCase() === name.toLowerCase(),
    )?.[1];
  const minimal = { PATH: valueFor("PATH") };
  if (platform === "win32") {
    minimal.ProgramFiles = valueFor("ProgramFiles");
  }
  return minimal;
}

export function parseWindowsLauncherRoot(line) {
  try {
    const value = JSON.parse(line);
    return value !== null &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      Object.keys(value).sort().join(",") ===
        "apiVersion,processCreationTime,processId,type" &&
      value.apiVersion === windowsLauncherApiVersion &&
      value.type === "root" &&
      Number.isSafeInteger(value.processId) &&
      value.processId > 0 &&
      typeof value.processCreationTime === "string" &&
      /^\d+$/u.test(value.processCreationTime)
      ? {
          processCreationTime: value.processCreationTime,
          processId: value.processId,
        }
      : null;
  } catch {
    return null;
  }
}

const windowsNativeLauncherContents = String.raw`param(
  [Parameter(Mandatory = $true)][string]$Workspace,
  [Parameter(Mandatory = $true)][string]$Output,
  [Parameter(Mandatory = $true)][ValidateSet("CTRL_C", "CTRL_BREAK")][string]$Signal
)

$source = @'
using System;
using System.ComponentModel;
using System.Diagnostics;
using System.IO;
using System.Runtime.InteropServices;
using System.Text;
using Microsoft.Win32.SafeHandles;

public static class FactoryNativeConsoleLauncher
{
    private const uint CREATE_NEW_PROCESS_GROUP = 0x00000200;
    private const uint HANDLE_FLAG_INHERIT = 0x00000001;
    private const int STARTF_USESTDHANDLES = 0x00000100;
    private const int SW_HIDE = 0;
    private const uint WAIT_FAILED = 0xFFFFFFFF;
    private const uint INFINITE = 0xFFFFFFFF;
    private static readonly ConsoleControlHandler IgnoreControl = delegate(uint value) { return true; };

    [StructLayout(LayoutKind.Sequential)]
    private struct SecurityAttributes
    {
        public int Length;
        public IntPtr SecurityDescriptor;
        [MarshalAs(UnmanagedType.Bool)] public bool InheritHandle;
    }

    [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
    private struct StartupInfo
    {
        public int Size;
        public string Reserved;
        public string Desktop;
        public string Title;
        public int X;
        public int Y;
        public int XSize;
        public int YSize;
        public int XCountChars;
        public int YCountChars;
        public int FillAttribute;
        public int Flags;
        public short ShowWindow;
        public short ReservedSize;
        public IntPtr ReservedPointer;
        public IntPtr StandardInput;
        public IntPtr StandardOutput;
        public IntPtr StandardError;
    }

    [StructLayout(LayoutKind.Sequential)]
    private struct ProcessInformation
    {
        public IntPtr Process;
        public IntPtr Thread;
        public int ProcessId;
        public int ThreadId;
    }

    private delegate bool ConsoleControlHandler(uint controlType);

    [DllImport("kernel32.dll", SetLastError = true)]
    private static extern bool AllocConsole();

    [DllImport("kernel32.dll", SetLastError = true)]
    private static extern bool CloseHandle(IntPtr handle);

    [DllImport("kernel32.dll", SetLastError = true)]
    private static extern bool CreatePipe(out IntPtr readPipe, out IntPtr writePipe, ref SecurityAttributes attributes, int size);

    [DllImport("kernel32.dll", CharSet = CharSet.Unicode, SetLastError = true)]
    private static extern bool CreateProcessW(
        string applicationName,
        StringBuilder commandLine,
        IntPtr processAttributes,
        IntPtr threadAttributes,
        bool inheritHandles,
        uint creationFlags,
        IntPtr environment,
        string currentDirectory,
        ref StartupInfo startupInfo,
        out ProcessInformation processInformation);

    [DllImport("kernel32.dll", SetLastError = true)]
    private static extern bool FreeConsole();

    [DllImport("kernel32.dll")]
    private static extern IntPtr GetConsoleWindow();

    [DllImport("kernel32.dll", SetLastError = true)]
    private static extern bool GetExitCodeProcess(IntPtr process, out uint exitCode);

    [DllImport("kernel32.dll", SetLastError = true)]
    private static extern bool SetConsoleCtrlHandler(ConsoleControlHandler handler, bool add);

    [DllImport("kernel32.dll", SetLastError = true)]
    private static extern bool SetHandleInformation(IntPtr handle, uint mask, uint flags);

    [DllImport("user32.dll")]
    private static extern bool ShowWindow(IntPtr window, int command);

    [DllImport("kernel32.dll", SetLastError = true)]
    private static extern uint WaitForSingleObject(IntPtr handle, uint milliseconds);

    public static int Run(string workspace, string output, bool createProcessGroup)
    {
        IntPtr readPipe = IntPtr.Zero;
        IntPtr writePipe = IntPtr.Zero;
        ProcessInformation process = new ProcessInformation();
        try
        {
            SecurityAttributes attributes = new SecurityAttributes();
            attributes.Length = Marshal.SizeOf(attributes);
            attributes.InheritHandle = true;
            if (!CreatePipe(out readPipe, out writePipe, ref attributes, 0))
                throw new Win32Exception(Marshal.GetLastWin32Error());
            if (!SetHandleInformation(readPipe, HANDLE_FLAG_INHERIT, 0))
                throw new Win32Exception(Marshal.GetLastWin32Error());

            FreeConsole();
            if (!AllocConsole())
                throw new Win32Exception(Marshal.GetLastWin32Error());
            ShowWindow(GetConsoleWindow(), SW_HIDE);
            if (!SetConsoleCtrlHandler(IgnoreControl, true))
                throw new Win32Exception(Marshal.GetLastWin32Error());

            StartupInfo startup = new StartupInfo();
            startup.Size = Marshal.SizeOf(startup);
            startup.Flags = STARTF_USESTDHANDLES;
            startup.StandardInput = IntPtr.Zero;
            startup.StandardOutput = writePipe;
            startup.StandardError = writePipe;
            string commandInterpreter = Environment.GetEnvironmentVariable("ComSpec") ?? "C:\\Windows\\System32\\cmd.exe";
            StringBuilder commandLine = new StringBuilder("\"" + commandInterpreter + "\" /d /s /c \"call pnpm.cmd accept:local & exit /b 130\"");
            uint flags = createProcessGroup ? CREATE_NEW_PROCESS_GROUP : 0;
            if (!CreateProcessW(commandInterpreter, commandLine, IntPtr.Zero, IntPtr.Zero, true, flags, IntPtr.Zero, workspace, ref startup, out process))
                throw new Win32Exception(Marshal.GetLastWin32Error());
            CloseHandle(process.Thread);
            process.Thread = IntPtr.Zero;
            CloseHandle(writePipe);
            writePipe = IntPtr.Zero;

            long creationTime = Process.GetProcessById(process.ProcessId).StartTime.ToUniversalTime().ToFileTimeUtc();
            using (FileStream outputStream = new FileStream(output, FileMode.Append, FileAccess.Write, FileShare.ReadWrite))
            using (StreamWriter writer = new StreamWriter(outputStream, new UTF8Encoding(false)))
            using (FileStream pipeStream = new FileStream(new SafeFileHandle(readPipe, true), FileAccess.Read))
            using (StreamReader reader = new StreamReader(pipeStream, Encoding.UTF8))
            {
                readPipe = IntPtr.Zero;
                writer.AutoFlush = true;
                writer.WriteLine("{\"apiVersion\":\"factory.windows-native-console-launcher/v1\",\"processCreationTime\":\"" + creationTime.ToString() + "\",\"processId\":" + process.ProcessId.ToString() + ",\"type\":\"root\"}");
                char[] buffer = new char[4096];
                int count;
                while ((count = reader.Read(buffer, 0, buffer.Length)) > 0)
                {
                    writer.Write(buffer, 0, count);
                }
            }
            if (WaitForSingleObject(process.Process, INFINITE) == WAIT_FAILED)
                throw new Win32Exception(Marshal.GetLastWin32Error());
            uint exitCode;
            if (!GetExitCodeProcess(process.Process, out exitCode))
                throw new Win32Exception(Marshal.GetLastWin32Error());
            return unchecked((int)exitCode);
        }
        catch (Exception error)
        {
            File.AppendAllText(output, "{\"apiVersion\":\"factory.windows-native-console-launcher/v1\",\"reason\":\"native-launch\",\"type\":\"failure\"}\n", new UTF8Encoding(false));
            return error.HResult == 0 ? 1 : error.HResult;
        }
        finally
        {
            if (readPipe != IntPtr.Zero) CloseHandle(readPipe);
            if (writePipe != IntPtr.Zero) CloseHandle(writePipe);
            if (process.Thread != IntPtr.Zero) CloseHandle(process.Thread);
            if (process.Process != IntPtr.Zero) CloseHandle(process.Process);
        }
    }
}
'@

Add-Type -TypeDefinition $source
$createProcessGroup = $Signal -eq "CTRL_BREAK"
exit [FactoryNativeConsoleLauncher]::Run($Workspace, $Output, $createProcessGroup)
`;

function failHarness(reason) {
  process.stderr.write(
    `${JSON.stringify({ apiVersion, reason, type: "failure" })}\n`,
  );
  return 1;
}

async function windowsProcessCreationTime(processId, deadline) {
  const timeoutMilliseconds = boundedTimeout(deadline, 5_000);
  if (timeoutMilliseconds === null) return undefined;
  const result = await executeCommand(
    "powershell.exe",
    [
      "-NoLogo",
      "-NoProfile",
      "-NonInteractive",
      "-Command",
      `(Get-Process -Id ${processId} -ErrorAction Stop).StartTime.ToFileTimeUtc()`,
    ],
    { environment: { PATH: process.env.PATH }, timeoutMilliseconds },
  );
  const value = result.stdout.trim();
  if (result.exitCode === 0 && /^\d+$/u.test(value)) return value;
  try {
    process.kill(processId, 0);
    return undefined;
  } catch (error) {
    return error?.code === "ESRCH" ? null : undefined;
  }
}

async function sendWindowsConsoleSignal(
  processId,
  expectedCreationTime,
  signal,
  deadline,
) {
  const timeoutMilliseconds = boundedTimeout(deadline, 10_000);
  if (timeoutMilliseconds === null) return false;
  const controlEvent = signal === "CTRL_C" ? 0 : 1;
  const processGroup = signal === "CTRL_C" ? 0 : processId;
  const source = [
    "using System;",
    "using System.Runtime.InteropServices;",
    "public static class NativeConsoleSignal {",
    '  [DllImport("kernel32.dll", SetLastError=true)] public static extern bool FreeConsole();',
    '  [DllImport("kernel32.dll", SetLastError=true)] public static extern bool AttachConsole(uint id);',
    '  [DllImport("kernel32.dll", SetLastError=true)] public static extern bool SetConsoleCtrlHandler(IntPtr handler, bool add);',
    '  [DllImport("kernel32.dll", SetLastError=true)] public static extern bool GenerateConsoleCtrlEvent(uint signal, uint group);',
    '  [DllImport("kernel32.dll", SetLastError=true)] public static extern uint GetConsoleProcessList(uint[] processList, uint processCount);',
    "}",
  ].join("\n");
  const command = [
    `$source = @'\n${source}\n'@`,
    "Add-Type -TypeDefinition $source",
    `$expected = [Int64]::Parse('${expectedCreationTime}')`,
    `$before = (Get-Process -Id ${processId} -ErrorAction Stop).StartTime.ToFileTimeUtc()`,
    "if ($before -ne $expected) { exit 1 }",
    "[NativeConsoleSignal]::FreeConsole() | Out-Null",
    `if (-not [NativeConsoleSignal]::AttachConsole(${processId})) { exit 1 }`,
    "[NativeConsoleSignal]::SetConsoleCtrlHandler([IntPtr]::Zero, $true) | Out-Null",
    "$consoleProcessIds = New-Object uint32[] 64",
    "$consoleProcessCount = [NativeConsoleSignal]::GetConsoleProcessList($consoleProcessIds, 64)",
    "if ($consoleProcessCount -eq 0 -or $consoleProcessCount -gt 64) { exit 1 }",
    "$attachedProcessIds = @($consoleProcessIds[0..($consoleProcessCount - 1)])",
    "$unexpectedSupervisor = Get-CimInstance Win32_Process | Where-Object { $_.ProcessId -ne $PID -and $attachedProcessIds -contains [uint32]$_.ProcessId -and $_.CommandLine -match '--factory-local-acceptance-supervisor' }",
    "if ($unexpectedSupervisor) { exit 1 }",
    `$after = (Get-Process -Id ${processId} -ErrorAction Stop).StartTime.ToFileTimeUtc()`,
    "if ($before -ne $after) { exit 1 }",
    `if (-not [NativeConsoleSignal]::GenerateConsoleCtrlEvent(${controlEvent}, ${processGroup})) { exit 1 }`,
    "Start-Sleep -Milliseconds 250",
    "exit 0",
  ].join("; ");
  const result = await executeCommand(
    "powershell.exe",
    ["-NoLogo", "-NoProfile", "-NonInteractive", "-Command", command],
    { environment: { PATH: process.env.PATH }, timeoutMilliseconds },
  );
  return result.exitCode === 0;
}

async function posixProcessStartTime(processId, deadline) {
  const timeoutMilliseconds = boundedTimeout(deadline, 5_000);
  if (timeoutMilliseconds === null) return undefined;
  const result = await executeCommand(
    "ps",
    ["-o", "lstart=", "-p", String(processId)],
    {
      environment: { PATH: process.env.PATH },
      timeoutMilliseconds,
    },
  );
  const value = result.stdout.trim();
  if (result.exitCode === 0 && value !== "") return value;
  try {
    process.kill(processId, 0);
    return undefined;
  } catch (error) {
    return error?.code === "ESRCH" ? null : undefined;
  }
}

async function resolvePosixWrapperIdentity(processId, deadline) {
  const timeoutMilliseconds = boundedTimeout(deadline, 5_000);
  if (timeoutMilliseconds === null) return null;
  const result = await executeCommand(
    "ps",
    ["-o", "pgid=,lstart=", "-p", String(processId)],
    {
      environment: { PATH: process.env.PATH },
      timeoutMilliseconds,
    },
  );
  const match = /^\s*(\d+)\s+(.+?)\s*$/u.exec(result.stdout);
  return result.exitCode === 0 &&
    match !== null &&
    Number(match[1]) === processId
    ? { processGroupId: processId, processStartTime: match[2] }
    : null;
}

async function resolvePosixForegroundIdentity(wrapperPid, deadline) {
  const environment = { PATH: process.env.PATH };
  const timeoutMilliseconds = boundedTimeout(deadline, 5_000);
  if (timeoutMilliseconds === null) return null;
  const processTable = await executeCommand(
    "ps",
    ["-eo", "pid=,ppid=,pgid=,tpgid=,args="],
    { environment, timeoutMilliseconds },
  );
  if (processTable.exitCode !== 0) return null;
  const rows = processTable.stdout
    .split(/\r?\n/u)
    .map((line) => /^\s*(\d+)\s+(\d+)\s+(\d+)\s+(-?\d+)\s+(.+)$/u.exec(line))
    .filter(Boolean)
    .map((match) => ({
      args: match[5],
      parentPid: Number(match[2]),
      processGroupId: Number(match[3]),
      processId: Number(match[1]),
      terminalProcessGroupId: Number(match[4]),
    }));
  const descendants = new Set([wrapperPid]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const row of rows) {
      if (descendants.has(row.parentPid) && !descendants.has(row.processId)) {
        descendants.add(row.processId);
        changed = true;
      }
    }
  }
  const pnpm = rows.find(
    (row) =>
      descendants.has(row.processId) &&
      row.terminalProcessGroupId > 0 &&
      isPosixAcceptanceCommand(row.args),
  );
  if (pnpm === undefined) return null;
  const processGroupId = pnpm.terminalProcessGroupId;
  const leader = rows.find(
    (row) =>
      row.processId === processGroupId &&
      row.processGroupId === processGroupId &&
      descendants.has(row.processId),
  );
  if (leader === undefined) return null;
  const processStartTime = await posixProcessStartTime(
    processGroupId,
    deadline,
  );
  return typeof processStartTime === "string"
    ? { processGroupId, processStartTime }
    : null;
}

async function sendPosixForegroundSignal(identity, signal, deadline) {
  const before = await posixProcessStartTime(identity.processGroupId, deadline);
  if (before !== identity.processStartTime) return false;
  try {
    process.kill(-identity.processGroupId, signal);
  } catch {
    return false;
  }
  const after = await posixProcessStartTime(identity.processGroupId, deadline);
  return after === null || after === identity.processStartTime;
}

function boundedTimeout(deadline, maximumMilliseconds) {
  const remainingMilliseconds = Math.floor(deadline - performance.now()) - 250;
  return remainingMilliseconds > 0
    ? Math.min(maximumMilliseconds, remainingMilliseconds)
    : null;
}

async function operationLeaseAbsent() {
  const leaseParent = join(tmpdir(), "factory-local-acceptance-operation-v1");
  try {
    const parent = await lstat(leaseParent);
    if (!parent.isDirectory() || parent.isSymbolicLink()) return false;
    const canonicalParent = await realpath(leaseParent);
    const resolvedParent = resolve(leaseParent);
    if (
      (process.platform === "win32"
        ? canonicalParent.toLowerCase()
        : canonicalParent) !==
      (process.platform === "win32"
        ? resolvedParent.toLowerCase()
        : resolvedParent)
    ) {
      return false;
    }
  } catch (error) {
    return error?.code === "ENOENT";
  }
  const canonicalWorkspace = await realpath(process.cwd());
  const workspaceDigest = createHash("sha256")
    .update(
      process.platform === "win32"
        ? canonicalWorkspace.toLowerCase()
        : canonicalWorkspace,
    )
    .digest("hex");
  try {
    await lstat(join(leaseParent, workspaceDigest));
    return false;
  } catch (error) {
    return error?.code === "ENOENT";
  }
}

async function observeGlobalZero(deadline) {
  const environment = { PATH: process.env.PATH };
  let timeoutMilliseconds = boundedTimeout(deadline, 30_000);
  if (timeoutMilliseconds === null) return false;
  const preview = await executeCommand(
    "node",
    ["scripts/verify-no-preview-resources.mjs"],
    { environment, timeoutMilliseconds },
  );
  if (preview.exitCode !== 0) return false;
  for (const args of [
    ["ps", "-a"],
    ["network", "ls"],
    ["volume", "ls"],
  ]) {
    timeoutMilliseconds = boundedTimeout(deadline, 30_000);
    if (timeoutMilliseconds === null) return false;
    const result = await executeCommand(
      "docker",
      [
        ...args,
        "--filter",
        "label=com.docker.compose.project",
        "--format",
        "{{.Labels}}",
      ],
      { environment, timeoutMilliseconds },
    );
    if (
      result.exitCode !== 0 ||
      result.stdout
        .split(/\r?\n/u)
        .some((line) =>
          /(?:^|,)com\.docker\.compose\.project=factory-local-[a-z0-9-]+(?:,|$)/u.test(
            line.trim(),
          ),
        )
    ) {
      return false;
    }
  }
  timeoutMilliseconds = boundedTimeout(deadline, 30_000);
  if (timeoutMilliseconds === null) return false;
  const helpers = await executeCommand(
    "docker",
    [
      "ps",
      "-a",
      "--filter",
      "label=factory.archeform.helper=factory.local-acceptance-helper/v1",
      "--format",
      "{{.ID}}",
    ],
    { environment, timeoutMilliseconds },
  );
  if (helpers.exitCode !== 0 || helpers.stdout.trim() !== "") return false;
  timeoutMilliseconds = boundedTimeout(deadline, 30_000);
  if (timeoutMilliseconds === null) return false;
  const processList = await executeCommand(
    process.platform === "win32" ? "powershell.exe" : "ps",
    process.platform === "win32"
      ? [
          "-NoLogo",
          "-NoProfile",
          "-NonInteractive",
          "-Command",
          "$currentProcessId = $PID; $p = Get-CimInstance Win32_Process | Where-Object { $_.ProcessId -ne $currentProcessId -and $_.CommandLine -match 'local-product-acceptance[.]mjs|playwright.+restaurant-template-acceptance' }; if ($p) { exit 1 }",
        ]
      : ["-eo", "args="],
    { environment, timeoutMilliseconds },
  );
  if (
    processList.exitCode !== 0 ||
    (process.platform !== "win32" &&
      processList.stdout
        .split(/\r?\n/u)
        .some(
          (line) =>
            /local-product-acceptance[.]mjs|playwright.+restaurant-template-acceptance/u.test(
              line,
            ) &&
            !line.includes("local-product-acceptance-interruption-harness.mjs"),
        ))
  ) {
    return false;
  }
  return true;
}

async function snapshotUnrelatedComposeResources(deadline) {
  const environment = { PATH: process.env.PATH };
  const lines = [];
  for (const args of [
    ["ps", "-a", "--format", "{{.ID}} {{.Labels}}"],
    ["network", "ls", "--format", "{{.ID}} {{.Labels}}"],
    ["volume", "ls", "--format", "{{.Name}} {{.Labels}}"],
  ]) {
    const timeoutMilliseconds = boundedTimeout(deadline, 30_000);
    if (timeoutMilliseconds === null) return null;
    const result = await executeCommand("docker", args, {
      environment,
      timeoutMilliseconds,
    });
    if (result.exitCode !== 0) return null;
    lines.push(
      ...result.stdout
        .split(/\r?\n/u)
        .map((line) => line.trim())
        .filter(
          (line) =>
            line !== "" &&
            !/(?:^|[ ,])com\.docker\.compose\.project=factory-local-[a-z0-9-]+(?:,|$)/u.test(
              line,
            ),
        ),
    );
  }
  return createHash("sha256").update(lines.sort().join("\n")).digest("hex");
}

async function snapshotComposeSentinel(projectName, deadline) {
  const environment = { PATH: process.env.PATH };
  const resources = [];
  let containerId;
  for (const [kind, args] of [
    [
      "container",
      [
        "ps",
        "-a",
        "--filter",
        `label=com.docker.compose.project=${projectName}`,
        "--format",
        "{{.ID}}",
      ],
    ],
    [
      "network",
      [
        "network",
        "ls",
        "--filter",
        `label=com.docker.compose.project=${projectName}`,
        "--format",
        "{{.ID}}",
      ],
    ],
    [
      "volume",
      [
        "volume",
        "ls",
        "--filter",
        `label=com.docker.compose.project=${projectName}`,
        "--format",
        "{{.Name}}",
      ],
    ],
  ]) {
    const timeoutMilliseconds = boundedTimeout(deadline, 30_000);
    if (timeoutMilliseconds === null) return null;
    const result = await executeCommand("docker", args, {
      environment,
      timeoutMilliseconds,
    });
    const values = result.stdout
      .split(/\r?\n/u)
      .map((value) => value.trim())
      .filter(Boolean);
    if (result.exitCode !== 0 || values.length !== 1) return null;
    if (kind === "container") containerId = values[0];
    resources.push(`${kind}:${values[0]}`);
  }
  const timeoutMilliseconds = boundedTimeout(deadline, 30_000);
  if (timeoutMilliseconds === null || containerId === undefined) return null;
  const contents = await executeCommand(
    "docker",
    ["exec", containerId, "cat", "/sentinel/sentinel.txt"],
    { environment, timeoutMilliseconds },
  );
  if (
    contents.exitCode !== 0 ||
    contents.stdout !== "factory-local-native-sentinel/v1\n"
  ) {
    return null;
  }
  return createHash("sha256").update(resources.sort().join("\n")).digest("hex");
}

export async function composeSentinelAbsent(
  projectName,
  deadline,
  runCommand = executeCommand,
) {
  const environment = { PATH: process.env.PATH };
  for (const [args, format] of [
    [["ps", "-a"], "{{.ID}}"],
    [["network", "ls"], "{{.ID}}"],
    [["volume", "ls"], "{{.Name}}"],
  ]) {
    const timeoutMilliseconds = boundedTimeout(deadline, 30_000);
    if (timeoutMilliseconds === null) return false;
    const result = await runCommand(
      "docker",
      [
        ...args,
        "--filter",
        `label=com.docker.compose.project=${projectName}`,
        "--format",
        format,
      ],
      { environment, timeoutMilliseconds },
    );
    if (result.exitCode !== 0 || result.stdout.trim() !== "") return false;
  }
  return true;
}

async function removeExactSentinelRoot({
  ownedFiles,
  rootEntry,
  sentinelRoot,
}) {
  const currentRoot = await lstat(sentinelRoot);
  const canonicalRoot = await realpath(sentinelRoot);
  const resolvedRoot = resolve(sentinelRoot);
  if (
    currentRoot.isSymbolicLink() ||
    !currentRoot.isDirectory() ||
    currentRoot.dev !== rootEntry.dev ||
    currentRoot.ino !== rootEntry.ino ||
    (process.platform === "win32"
      ? canonicalRoot.toLowerCase()
      : canonicalRoot) !==
      (process.platform === "win32" ? resolvedRoot.toLowerCase() : resolvedRoot)
  ) {
    throw new Error("Sentinel root identity changed.");
  }
  const entries = (await readdir(sentinelRoot)).sort();
  if (
    entries.join(",") !==
    ownedFiles
      .map(({ name }) => name)
      .sort()
      .join(",")
  ) {
    throw new Error("Sentinel root contents changed.");
  }
  for (const {
    contents: expectedContents,
    entry: expectedEntry,
    mutable = false,
    path,
  } of ownedFiles) {
    const entry = await lstat(path);
    if (
      entry.isSymbolicLink() ||
      !entry.isFile() ||
      entry.dev !== expectedEntry.dev ||
      entry.ino !== expectedEntry.ino ||
      (!mutable && (await readFile(path, "utf8")) !== expectedContents)
    ) {
      throw new Error("Sentinel file identity changed.");
    }
  }
  for (const { path } of ownedFiles) await unlink(path);
  if ((await readdir(sentinelRoot)).length !== 0) {
    throw new Error("Sentinel root is not empty.");
  }
  await rmdir(sentinelRoot);
}

async function readMutableOwnedFile(path, expectedEntry) {
  const entry = await lstat(path);
  if (
    entry.isSymbolicLink() ||
    !entry.isFile() ||
    entry.dev !== expectedEntry.dev ||
    entry.ino !== expectedEntry.ino
  ) {
    throw new Error("Mutable observer file identity changed.");
  }
  return await readFile(path, "utf8");
}

async function waitForExit(child, deadline) {
  while (
    child.exitCode === null &&
    child.signalCode === null &&
    performance.now() < deadline
  ) {
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
  return child.exitCode ?? (child.signalCode === null ? null : 1);
}

async function forceReap(
  child,
  posixForegroundIdentity,
  posixWrapperIdentity,
  windowsRootIdentity,
  windowsLauncherIdentity,
) {
  if (child.pid === undefined) return;
  const reapDeadline = performance.now() + 20_000;
  if (process.platform === "win32") {
    if (
      windowsRootIdentity === undefined &&
      windowsLauncherIdentity === undefined
    ) {
      throw new Error("Windows process identities were not recorded.");
    }
    const reapIdentity = async (identity, label) => {
      if (identity === undefined) return;
      const currentCreationTime = await windowsProcessCreationTime(
        identity.processId,
        reapDeadline,
      );
      if (currentCreationTime === undefined) {
        throw new Error(`Windows ${label} identity could not be revalidated.`);
      }
      if (
        currentCreationTime !== null &&
        currentCreationTime !== identity.processCreationTime
      ) {
        throw new Error(`Windows ${label} identity changed.`);
      }
      if (currentCreationTime === null) return;
      const timeoutMilliseconds = boundedTimeout(reapDeadline, 10_000);
      if (timeoutMilliseconds === null) {
        throw new Error(`Windows ${label} reap deadline expired.`);
      }
      const result = await executeCommand(
        "taskkill.exe",
        ["/pid", String(identity.processId), "/T", "/F"],
        {
          environment: { PATH: process.env.PATH },
          timeoutMilliseconds,
        },
      );
      const after = await windowsProcessCreationTime(
        identity.processId,
        reapDeadline,
      );
      if (after !== null) {
        throw new Error(
          result.exitCode === 0
            ? `Windows ${label} reap was not proven.`
            : `Windows ${label} taskkill failed and absence was not proven.`,
        );
      }
    };
    await reapIdentity(windowsRootIdentity, "root");
    await waitForExit(child, Math.min(reapDeadline, performance.now() + 2_000));
    await reapIdentity(windowsLauncherIdentity, "launcher");
  } else {
    const resolvedForegroundIdentity =
      posixForegroundIdentity ??
      (await resolvePosixForegroundIdentity(child.pid, reapDeadline));
    const identities = [
      resolvedForegroundIdentity,
      posixWrapperIdentity,
    ].filter(
      (identity, index, values) =>
        identity !== null &&
        identity !== undefined &&
        values.findIndex(
          (candidate) => candidate?.processGroupId === identity.processGroupId,
        ) === index,
    );
    const controlledGroups = [];
    for (const identity of identities) {
      const currentStartTime = await posixProcessStartTime(
        identity.processGroupId,
        reapDeadline,
      );
      if (currentStartTime === identity.processStartTime) {
        controlledGroups.push(identity.processGroupId);
      } else if (currentStartTime !== null) {
        throw new Error("POSIX process-group identity changed.");
      }
    }
    for (const processGroupId of new Set(controlledGroups)) {
      try {
        process.kill(-processGroupId, "SIGKILL");
      } catch {
        // The exact controlled process group is already absent.
      }
    }
    for (const identity of identities) {
      const proofDeadline = Math.min(reapDeadline, performance.now() + 2_000);
      let absenceProven = false;
      while (performance.now() < proofDeadline) {
        if (
          (await posixProcessStartTime(
            identity.processGroupId,
            proofDeadline,
          )) === null
        ) {
          absenceProven = true;
          break;
        }
        await new Promise((resolve) => setTimeout(resolve, 25));
      }
      if (!absenceProven) {
        throw new Error("POSIX process-group reap was not proven.");
      }
    }
  }
  await waitForExit(child, performance.now() + 2_000);
}

async function waitForStableZero(deadline, unrelatedComposeDigest) {
  let consecutive = 0;
  while (performance.now() < deadline) {
    const temporaryEntries = await readdir(tmpdir());
    const zero =
      (await operationLeaseAbsent()) &&
      privateAcceptanceRootsAbsent(temporaryEntries) &&
      (await observeGlobalZero(deadline)) &&
      (await snapshotUnrelatedComposeResources(deadline)) ===
        unrelatedComposeDigest;
    consecutive = zero ? consecutive + 1 : 0;
    if (consecutive === 3) return performance.now() <= deadline;
    await new Promise((resolve) => setTimeout(resolve, 1_000));
  }
  return false;
}

async function main() {
  const input = parseArguments(process.argv.slice(2));
  if (input === null) return 2;
  const preflightDeadline = performance.now() + 120_000;
  if (!(await observeGlobalZero(preflightDeadline)))
    return failHarness("preflight-global-zero");
  const initialUnrelatedComposeDigest =
    await snapshotUnrelatedComposeResources(preflightDeadline);
  if (initialUnrelatedComposeDigest === null)
    return failHarness("preflight-unrelated-snapshot");
  if (!privateAcceptanceRootsAbsent(await readdir(tmpdir())))
    return failHarness("preflight-private-root");
  const sentinelRoot = await mkdtemp(
    join(tmpdir(), "factory-local-native-sentinel-"),
  );
  const sentinelPath = join(sentinelRoot, "sentinel.txt");
  const composePath = join(sentinelRoot, "compose.yml");
  const windowsLauncherPath = join(sentinelRoot, "windows-launcher.ps1");
  const windowsOutputPath = join(sentinelRoot, "windows-output.txt");
  const sentinelContents = "factory-local-native-sentinel/v1\n";
  const composeContents = [
    "services:",
    "  sentinel:",
    "    image: node:22-alpine",
    "    command:",
    "      - sh",
    "      - -ec",
    "      - |",
    "        printf 'factory-local-native-sentinel/v1\\n' > /sentinel/sentinel.txt",
    "        exec tail -f /dev/null",
    "    volumes:",
    "      - state:/sentinel",
    "volumes:",
    "  state: {}",
    "",
  ].join("\n");
  const rootEntry = await lstat(sentinelRoot);
  const ownedFiles = [];
  const sentinelDigest = createHash("sha256")
    .update(sentinelContents)
    .digest("hex");
  const composeProjectName = `factory-harness-sentinel-${randomBytes(12).toString("hex")}`;
  const environment = { ...process.env };
  delete environment.FACTORY_LOCAL_ACCEPTANCE_TOKEN;
  environment.FACTORY_LOCAL_ACCEPTANCE_TIMING_GATE = `${apiVersion}:${input.stage}`;
  const startedAt = performance.now();
  const hardDeadline = startedAt + 3_600_000;
  let child;
  let composeStarted = false;
  let composeSentinelDigest;
  let unrelatedComposeDigest;
  let posixForegroundIdentity;
  let posixWrapperIdentity;
  let postStartZeroProven = false;
  let windowsLauncherIdentity;
  let windowsOutputEntry;
  let windowsRootIdentity;
  try {
    await writeFile(sentinelPath, sentinelContents, {
      encoding: "utf8",
      flag: "wx",
    });
    ownedFiles.push({
      contents: sentinelContents,
      entry: await lstat(sentinelPath),
      name: "sentinel.txt",
      path: sentinelPath,
    });
    await writeFile(composePath, composeContents, {
      encoding: "utf8",
      flag: "wx",
    });
    ownedFiles.push({
      contents: composeContents,
      entry: await lstat(composePath),
      name: "compose.yml",
      path: composePath,
    });
    if (process.platform === "win32") {
      await writeFile(windowsLauncherPath, windowsNativeLauncherContents, {
        encoding: "utf8",
        flag: "wx",
      });
      ownedFiles.push({
        contents: windowsNativeLauncherContents,
        entry: await lstat(windowsLauncherPath),
        name: "windows-launcher.ps1",
        path: windowsLauncherPath,
      });
      await writeFile(windowsOutputPath, "", {
        encoding: "utf8",
        flag: "wx",
      });
      windowsOutputEntry = await lstat(windowsOutputPath);
      ownedFiles.push({
        contents: "",
        entry: windowsOutputEntry,
        mutable: true,
        name: "windows-output.txt",
        path: windowsOutputPath,
      });
    }
    const composeStartDeadline = performance.now() + 180_000;
    const composeStartTimeout = boundedTimeout(composeStartDeadline, 180_000);
    if (composeStartTimeout === null)
      return failHarness("sentinel-start-deadline");
    composeStarted = true;
    const composeStart = await executeCommand(
      "docker",
      [
        "compose",
        "-p",
        composeProjectName,
        "-f",
        composePath,
        "up",
        "-d",
        "--no-build",
        "--pull",
        "never",
      ],
      {
        environment: minimalDockerEnvironment(),
        timeoutMilliseconds: composeStartTimeout,
      },
    );
    if (composeStart.exitCode !== 0) return failHarness("sentinel-start");
    composeSentinelDigest = await snapshotComposeSentinel(
      composeProjectName,
      composeStartDeadline,
    );
    if (composeSentinelDigest === null) return failHarness("sentinel-snapshot");
    const baselineDeadline = performance.now() + 120_000;
    unrelatedComposeDigest =
      await snapshotUnrelatedComposeResources(baselineDeadline);
    if (unrelatedComposeDigest === null)
      return failHarness("unrelated-snapshot");
    child =
      process.platform === "win32"
        ? spawn(
            "powershell.exe",
            [
              "-NoLogo",
              "-NoProfile",
              "-NonInteractive",
              "-ExecutionPolicy",
              "Bypass",
              "-File",
              windowsLauncherPath,
              "-Workspace",
              process.cwd(),
              "-Output",
              windowsOutputPath,
              "-Signal",
              input.signal,
            ],
            {
              detached: false,
              env: environment,
              shell: false,
              stdio: "ignore",
              windowsHide: true,
            },
          )
        : spawn("script", ["-qefc", posixAcceptanceCommand, "/dev/null"], {
            detached: true,
            env: environment,
            shell: false,
            stdio: ["ignore", "pipe", "pipe"],
          });
    let output = "";
    let gateSeen = false;
    if (child.pid === undefined) return failHarness("wrapper-pid");
    const windowsLaunchDeadline = performance.now() + 5_000;
    const windowsLauncherCreationTime =
      process.platform === "win32"
        ? await windowsProcessCreationTime(child.pid, windowsLaunchDeadline)
        : null;
    if (
      process.platform === "win32" &&
      typeof windowsLauncherCreationTime !== "string"
    ) {
      return failHarness("windows-launcher-identity");
    }
    if (process.platform === "win32") {
      windowsLauncherIdentity = {
        processCreationTime: windowsLauncherCreationTime,
        processId: child.pid,
      };
      while (
        windowsRootIdentity === undefined &&
        child.exitCode === null &&
        child.signalCode === null &&
        performance.now() < windowsLaunchDeadline
      ) {
        output = await readMutableOwnedFile(
          windowsOutputPath,
          windowsOutputEntry,
        );
        windowsRootIdentity = parseWindowsLauncherRoot(
          output.split(/\r?\n/u)[0] ?? "",
        );
        if (windowsRootIdentity === undefined || windowsRootIdentity === null) {
          windowsRootIdentity = undefined;
          await new Promise((resolve) => setTimeout(resolve, 25));
        }
      }
      if (windowsRootIdentity === undefined)
        return failHarness("windows-root-identity");
      const revalidatedCreationTime = await windowsProcessCreationTime(
        windowsRootIdentity.processId,
        windowsLaunchDeadline,
      );
      if (revalidatedCreationTime !== windowsRootIdentity.processCreationTime) {
        return failHarness("windows-root-revalidation");
      }
    }
    if (process.platform !== "win32") {
      posixWrapperIdentity = await resolvePosixWrapperIdentity(
        child.pid,
        hardDeadline,
      );
      if (posixWrapperIdentity === null)
        return failHarness("posix-wrapper-identity");
    }
    const onData = (chunk) => {
      output = `${output}${chunk.toString("utf8")}`.slice(-65_536);
      gateSeen ||= output
        .split(/\r?\n/u)
        .some((line) => gateMessage(line, input.stage));
    };
    if (process.platform !== "win32") {
      child.stdout.on("data", onData);
      child.stderr.on("data", onData);
    }
    while (
      !gateSeen &&
      child.exitCode === null &&
      child.signalCode === null &&
      performance.now() < hardDeadline
    ) {
      if (process.platform === "win32") {
        output = (
          await readMutableOwnedFile(windowsOutputPath, windowsOutputEntry)
        ).slice(-65_536);
        gateSeen = output
          .split(/\r?\n/u)
          .some((line) => gateMessage(line, input.stage));
      }
      await new Promise((resolve) => setTimeout(resolve, 25));
    }
    if (!gateSeen || child.pid === undefined) return failHarness("timing-gate");
    if (process.platform === "win32") {
      if (
        !(await sendWindowsConsoleSignal(
          windowsRootIdentity.processId,
          windowsRootIdentity.processCreationTime,
          input.signal,
          hardDeadline,
        ))
      ) {
        return failHarness("windows-signal");
      }
    } else {
      posixForegroundIdentity = await resolvePosixForegroundIdentity(
        child.pid,
        hardDeadline,
      );
      if (posixForegroundIdentity === null)
        return failHarness("posix-foreground-identity");
      const signaled = await sendPosixForegroundSignal(
        posixForegroundIdentity,
        input.signal,
        hardDeadline,
      );
      if (!signaled) return failHarness("posix-signal");
    }
    const code = await waitForExit(child, hardDeadline);
    if (code === null) return failHarness("wrapper-timeout");
    if (code === 0) return failHarness("wrapper-zero-exit");
    postStartZeroProven = await waitForStableZero(
      hardDeadline,
      unrelatedComposeDigest,
    );
    if (!postStartZeroProven) return failHarness("post-start-zero");
    const observedSentinel = await readFile(sentinelPath, "utf8");
    const observedDigest = createHash("sha256")
      .update(observedSentinel)
      .digest("hex");
    const finalComposeSentinelDigest = await snapshotComposeSentinel(
      composeProjectName,
      hardDeadline,
    );
    const sentinelPreserved =
      observedDigest === sentinelDigest &&
      finalComposeSentinelDigest === composeSentinelDigest &&
      performance.now() <= hardDeadline;
    return sentinelPreserved ? 0 : failHarness("sentinel-preservation");
  } finally {
    let cleanupFailure;
    if (child !== undefined) {
      try {
        await forceReap(
          child,
          posixForegroundIdentity,
          posixWrapperIdentity,
          windowsRootIdentity,
          windowsLauncherIdentity,
        );
      } catch (error) {
        cleanupFailure = error;
      }
    }
    if (
      child !== undefined &&
      unrelatedComposeDigest !== undefined &&
      !postStartZeroProven
    ) {
      postStartZeroProven = await waitForStableZero(
        hardDeadline,
        unrelatedComposeDigest,
      );
      if (!postStartZeroProven) {
        cleanupFailure = new Error(
          "Post-start global zero proof was not established.",
        );
      }
    }
    if (composeStarted) {
      const cleanupDeadline = performance.now() + 180_000;
      const timeoutMilliseconds = boundedTimeout(cleanupDeadline, 180_000);
      const composeDown =
        timeoutMilliseconds === null
          ? null
          : await executeCommand(
              "docker",
              [
                "compose",
                "-p",
                composeProjectName,
                "-f",
                composePath,
                "down",
                "--volumes",
                "--remove-orphans",
                "--timeout",
                "10",
              ],
              {
                environment: minimalDockerEnvironment(),
                timeoutMilliseconds,
              },
            );
      if (
        composeDown === null ||
        composeDown.exitCode !== 0 ||
        !(await composeSentinelAbsent(composeProjectName, cleanupDeadline))
      ) {
        cleanupFailure ??= new Error(
          "Compose sentinel cleanup was not proven.",
        );
      }
    }
    await removeExactSentinelRoot({
      ownedFiles,
      rootEntry,
      sentinelRoot,
    });
    if (cleanupFailure !== undefined) throw cleanupFailure;
  }
}

if (
  process.argv[1] !== undefined &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  process.exitCode = await main();
}
