import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, readdir, readFile, rm } from "node:fs/promises";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join } from "node:path";

const require = createRequire(import.meta.url);
let playwright;
try {
  playwright = require("playwright");
} catch {
  playwright = require(
    process.env.FACTORY_PLAYWRIGHT_PATH
      || "C:/Users/15492/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright",
  );
}
const { chromium } = playwright;

const ROOT = process.cwd();
const PYTHON = process.env.FACTORY_PYTHON_PATH || "python";
const COMMAND_TIMEOUT_MS = 8 * 60 * 1000;
const WEB_READY_TIMEOUT_MS = 90 * 1000;
const APPLICATION_LIMIT = Number.parseInt(process.env.FACTORY_E2E_APPLICATION_LIMIT || "2", 10);

function deferred(label) {
  let resolve;
  const promise = new Promise((complete) => { resolve = complete; });
  return { label, promise, resolve };
}

async function installFetchCompletionSeam(page) {
  await page.addInitScript(() => {
    const nativeFetch = window.fetch.bind(window);
    const seams = new Map();
    const pathnameFor = (input) => new URL(input instanceof Request ? input.url : String(input), window.location.origin).pathname;
    window.__factoryTestFetchCompletionSeam = {
      arm({ label, pathSuffix, payload }) {
        if (seams.has(label)) throw new Error(`duplicate test completion seam: ${label}`);
        let capture;
        let release;
        const captured = new Promise((resolve) => { capture = resolve; });
        const released = new Promise((resolve) => { release = resolve; });
        seams.set(label, { label, pathSuffix, payload, captured, capture, released, release, armed: true, delivered: false });
      },
      waitForCapture(label) {
        const seam = seams.get(label);
        if (!seam) throw new Error(`missing test completion seam: ${label}`);
        return seam.captured;
      },
      release(label) {
        const seam = seams.get(label);
        if (!seam) throw new Error(`missing test completion seam: ${label}`);
        seam.release();
      },
      waitForDelivery(label) {
        const seam = seams.get(label);
        if (!seam) throw new Error(`missing test completion seam: ${label}`);
        return seam.released;
      },
    };
    window.fetch = (input, init) => {
      const path = pathnameFor(input);
      const seam = [...seams.values()].find((candidate) => candidate.armed && path.endsWith(candidate.pathSuffix));
      if (!seam) return nativeFetch(input, init);
      seam.armed = false;
      seam.capture({ path, abortedAtCapture: Boolean(init?.signal?.aborted) });
      return seam.released.then(() => {
        seam.delivered = true;
        return new Response(JSON.stringify(seam.payload), {
          status: 200,
          headers: { "Content-Type": "application/json", "X-Factory-Test-Seam": seam.label },
        });
      });
    };
  });
}

async function armFetchCompletionSeam(page, seam) {
  await page.evaluate((candidate) => window.__factoryTestFetchCompletionSeam.arm(candidate), seam);
}

async function waitForFetchCompletionCapture(page, label) {
  return page.evaluate((seamLabel) => window.__factoryTestFetchCompletionSeam.waitForCapture(seamLabel), label);
}

async function releaseFetchCompletionSeam(page, label) {
  await page.evaluate((seamLabel) => window.__factoryTestFetchCompletionSeam.release(seamLabel), label);
  await page.evaluate((seamLabel) => window.__factoryTestFetchCompletionSeam.waitForDelivery(seamLabel), label);
  await page.evaluate(() => new Promise(requestAnimationFrame));
}

async function assertInvalidatedCompletionDoesNotLeak(page, { caseLabel, oldActor, newActor, sentinel, absentButtons = [], absentText = [] }) {
  const context = `${caseLabel}; old actor=${oldActor}; new actor=${newActor}; sentinel=${sentinel}`;
  assert.equal(await page.locator(".fp-feedback").count(), 0, `${context}; stale completion leaked feedback`);
  assert.equal(await page.getByRole("dialog").count(), 0, `${context}; stale completion leaked confirmation`);
  assert.equal(await page.getByText(sentinel, { exact: true }).count(), 0, `${context}; stale completion leaked its labelled payload`);
  for (const text of absentText) assert.equal(await page.getByText(text, { exact: true }).count(), 0, `${context}; stale completion leaked ${text}`);
  for (const name of absentButtons) assert.equal(await page.getByRole("button", { name, exact: true }).count(), 0, `${context}; stale completion leaked protected ${name} control`);
}

async function triggerSignOutThroughCompletionSeam(page) {
  await page.getByRole("button", { name: "Sign out" }).evaluate((button) => button.click());
}

function run(command, args, { cwd = ROOT, env = process.env, timeout = COMMAND_TIMEOUT_MS } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd, env, stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => {
      child.kill();
      reject(new Error(`${command} ${args.join(" ")} timed out after ${timeout}ms\n${stdout}\n${stderr}`));
    }, timeout);
    child.stdout.on("data", (chunk) => { stdout += chunk; });
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.once("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.once("exit", (code) => {
      clearTimeout(timer);
      const result = { code, stdout, stderr };
      if (code === 0) resolve(result);
      else reject(new Error(`${command} ${args.join(" ")} failed with ${code}\n${stdout}\n${stderr}`));
    });
  });
}

async function unusedLoopbackPort() {
  const { createServer } = await import("node:http");
  const server = createServer();
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const { port } = server.address();
  await new Promise((resolve) => server.close(resolve));
  return port;
}

async function waitForWeb(url) {
  const deadline = Date.now() + WEB_READY_TIMEOUT_MS;
  let lastError;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
      lastError = new Error(`HTTP ${response.status}`);
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`generated web preview did not become ready at ${url}: ${lastError}`);
}

async function generatedText(output) {
  const entries = await readdir(output, { withFileTypes: true });
  const fragments = await Promise.all(entries.map(async (entry) => {
    const path = join(output, entry.name);
    if (entry.isDirectory()) return generatedText(path);
    if (!entry.isFile()) return [];
    return [await readFile(path, "utf8")];
  }));
  return fragments.flat();
}

async function assertGeneratedOutputPrivacy(application) {
  const rendered = (await generatedText(application.output)).join("\n");
  const prohibitedMaterial = [
    application.brief,
    "FixtureRequirementToDefinitionProvider",
    "OPENAI_API_KEY",
    "api.openai.com",
    "anthropic.com",
    "factory-ui-console",
    "apps/console-next",
  ];
  for (const material of prohibitedMaterial) {
    assert.equal(rendered.includes(material), false, "generated output must exclude the raw brief, model provider material, and provider credentials");
  }
  assert.equal(
    rendered.includes("ui.app-shell.audit@2.1.0"),
    false,
    "a 2.4 candidate output must not emit a historical audit component marker",
  );
  assert.equal(
    rendered.includes("ui.app-shell.audit@2.2.0"),
    false,
    "a 2.4 candidate output must not emit a 2.2 audit component marker",
  );
  assert.equal(
    rendered.includes("ui.app-shell.audit@2.3.0"),
    false,
    "a 2.4 candidate output must not emit a historical audit component marker",
  );
  assert.equal(
    rendered.includes("ui.app-shell.audit@2.4.0"),
    true,
    "a 2.4 candidate output must retain its own audit component marker",
  );
}

function composeArgs(project, output, ...args) {
  return ["compose", "--project-name", project, "--file", join(output, "docker-compose.yml"), ...args];
}

async function createFixtureOutputs(root) {
  const script = String.raw`
import json
import sys
from copy import deepcopy
from dataclasses import replace
from pathlib import Path

from apps.api.application_definition import definition_checksum
from apps.api.control_plane import COMPOSABLE_APPROVAL_COMPONENT_KEYS, ControlPlane
from apps.api.component_composer import ComponentComposer, ComponentRegistry, CompositionError
from apps.api.llm_provider import FixtureRequirementToDefinitionProvider
from tools.factory_ui_kit import verify_generated_ui_distribution

root = Path(sys.argv[1])
component_root = Path.cwd() / "packages" / "components"
candidate_ui_keys = (
    "ui.app-shell", "ui.login-page", "ui.home-page", "ui.profile-page",
    "ui.system-settings-page", "ui.approval-form", "ui.my-requests", "ui.approval-queue",
)

class CandidateVerificationRegistry(ComponentRegistry):
    """Test-only candidate policy for Composer verification, never Planner use."""

    def resolve_locks(self, locks, *, allow_historical_replay=False):
        requested = tuple(locks)
        candidate_locks = [lock for lock in requested if isinstance(lock, dict) and lock.get("key") in candidate_ui_keys]
        golden_locks = [lock for lock in requested if not (isinstance(lock, dict) and lock.get("key") in candidate_ui_keys)]
        if {lock.get("key") for lock in candidate_locks} != set(candidate_ui_keys):
            raise CompositionError("candidate verification requires the complete ui 2.4 family")
        if any(lock.get("version") != "2.4.0" for lock in candidate_locks):
            raise CompositionError("candidate verification rejects mixed ui families")
        if any(isinstance(lock, dict) and str(lock.get("key", "")).startswith("ui.") for lock in golden_locks):
            raise CompositionError("candidate verification rejects Golden ui locks")
        packages = {package.identity: package for package in self.discover()}
        candidates = []
        for lock in candidate_locks:
            package = packages.get((lock.get("key"), lock.get("version")))
            if package is None or package.lock != lock:
                raise CompositionError("candidate verification lock is unavailable or digest-mismatched")
            if package.manifest["lifecycle"] != "candidate" or package.trust["status"] != "candidate":
                raise CompositionError("candidate verification requires candidate trust")
            candidates.append(package)
        golden = super().resolve_locks(golden_locks, allow_historical_replay=allow_historical_replay)
        return tuple(sorted((*golden, *candidates), key=lambda package: package.identity))


verify_generated_ui_distribution(
    Path.cwd() / "packages" / "ui-kit" / "factory-ui" / "1.4.0",
    tuple(component_root / key / "2.4.0" for key in candidate_ui_keys),
    expected_version="2.4.0",
    expected_lifecycle="candidate",
)

def assert_candidate_registry_rejections(candidate_locks):
    registry = CandidateVerificationRegistry(component_root)
    checks = {
        "missing_candidate_member": [lock for lock in candidate_locks if lock["key"] != "ui.app-shell"],
        "mixed_ui_family": [
            golden_locks["ui.app-shell"] if lock["key"] == "ui.app-shell" else lock
            for lock in candidate_locks
        ],
    }
    for label, locks in checks.items():
        try:
            registry.resolve_locks(locks)
        except CompositionError:
            continue
        raise CompositionError(f"candidate verification accepted {label}")

    class RevokedCandidateVerificationRegistry(CandidateVerificationRegistry):
        def discover(self):
            return tuple(
                replace(package, trust={**package.trust, "status": "revoked"})
                if package.identity == ("ui.app-shell", "2.4.0")
                else package
                for package in super().discover()
            )
    try:
        RevokedCandidateVerificationRegistry(component_root).resolve_locks(candidate_locks)
    except CompositionError:
        return
    raise CompositionError("candidate verification accepted revoked candidate trust")

plane = ControlPlane(
    root / "state.json",
    root / "runs",
    provider=FixtureRequirementToDefinitionProvider(),
    composable_enabled=True,
    component_package_root=Path.cwd() / "packages" / "components",
)
results = []
for name, brief in (
    ("leave-approval", "Employees submit leave requests and managers approve them."),
    ("expense-approval", "Employees submit expense claims and managers approve them."),
):
    created = plane.create_project(name, brief)
    version = created["version"]
    if name == "leave-approval":
        observer_definition = deepcopy(version["definition"])
        observer_definition["metadata"]["version"] = "2"
        observer_definition["roles"] = [
            {"id": "observer", "label": "Observer", "kind": "observer"}
            if role["kind"] == "auditor" else role
            for role in observer_definition["roles"]
        ]
        observer_definition["pages"] = [
            {**page, "actor_kinds": ["observer"]}
            if page["kind"] == "audit" else page
            for page in observer_definition["pages"]
        ]
        version = plane.create_version(created["project"]["id"], version["id"], observer_definition)
    version = plane.approve_version(version["id"], "browser-e2e")
    inputs = plane._composable_component_inputs(version["definition"])
    if name == "leave-approval":
        inputs["ui.app-shell"]["navigation"] = [
            item for item in inputs["ui.app-shell"]["navigation"] if item["href"] != "/"
        ]
    golden_registry = ComponentRegistry(component_root)
    golden_locks = {package.manifest["key"]: package.lock for package in golden_registry.resolve(COMPOSABLE_APPROVAL_COMPONENT_KEYS)}
    candidate_registry = CandidateVerificationRegistry(component_root)
    candidate_packages = {package.identity: package for package in candidate_registry.discover()}
    candidate_locks = [
        candidate_packages[(key, "2.4.0")].lock if key in candidate_ui_keys else golden_locks[key]
        for key in COMPOSABLE_APPROVAL_COMPONENT_KEYS
    ]
    assert_candidate_registry_rejections(candidate_locks)
    composer = ComponentComposer(candidate_registry)
    candidate_plan = composer.create_plan_from_locks(
        application_definition_checksum=definition_checksum(version["definition"]),
        component_locks=candidate_locks,
        component_inputs=inputs,
        include_runtime_scaffold=True,
    )
    output = root / "candidate-runs" / name / "output"
    observed_manifest = composer.materialize(plan=candidate_plan, output_root=output)
    if observed_manifest != candidate_plan["output_manifest"]:
        raise CompositionError("candidate preview output manifest mismatch")
    results.append({
        "name": name,
        "brief": brief,
        "output": str(output),
        "previewFamily": "candidate-ui-2.4",
        "locks": candidate_plan["component_locks"],
        "outputManifest": observed_manifest,
        "record_label": version["definition"]["primary_record"]["label"],
        "fields": version["definition"]["primary_record"]["fields"],
        "roles": {role["kind"]: role["id"] for role in version["definition"]["roles"]},
        "sessionCookieName": candidate_plan["validated_inputs"]["backend.session-auth"]["cookie_name"],
        "submitLabel": candidate_plan["validated_inputs"]["ui.approval-form"]["submit_label"],
        "navigation": candidate_plan["validated_inputs"]["ui.app-shell"]["navigation"],
    })
print(json.dumps(results, sort_keys=True))
`;
  // Source changes are concurrent during the component-suite hand-off.  Bypass
  // stale local bytecode so this test proves the files in the current worktree.
  const result = await run(PYTHON, ["-B", "-c", script, root]);
  const jsonLine = result.stdout.trim().split(/\r?\n/).at(-1);
  return JSON.parse(jsonLine);
}

const ROUTES_BY_KIND = {
  submitter: ["/", "/submit", "/my-records", "/profile", "/settings"],
  approver: ["/", "/approval-queue", "/profile", "/settings"],
  auditor: ["/", "/audit", "/profile", "/settings"],
  observer: ["/", "/audit", "/profile", "/settings"],
};

function availableRoutesFor(application, kind) {
  const available = new Set(application.navigation.map((item) => item.href));
  return ROUTES_BY_KIND[kind].filter((href) => available.has(href));
}

async function signedOutFocusableInventory(page) {
  return page.evaluate(() => {
    const selector = "button, input, select, textarea, a[href], [tabindex], [contenteditable], summary, iframe, object, embed, audio[controls], video[controls], .fp-feedback[role=alert], .fp-feedback[role=status]";
    const visibleText = (element) => (element?.textContent || "").replace(/\s+/g, " ").trim();
    const resolvedAriaLabelledBy = (element) => {
      const ids = (element.getAttribute("aria-labelledby") || "").trim().split(/\s+/).filter(Boolean);
      const references = [...new Map(ids.map((id) => [id, document.getElementById(id)]))].map(([, reference]) => reference).filter(Boolean);
      references.sort((left, right) => {
        if (left === right) return 0;
        return left.compareDocumentPosition(right) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1;
      });
      return references.map(visibleText).filter(Boolean).join(" ");
    };
    const associatedLabel = (element) => {
      if (element.id) {
        const explicit = document.querySelector(`label[for="${CSS.escape(element.id)}"]`);
        if (explicit) return visibleText(explicit);
      }
      return visibleText(element.closest("label"));
    };
    const implicitRole = (element) => {
      if (element instanceof HTMLButtonElement) return "button";
      if (element instanceof HTMLSelectElement) return "combobox";
      if (element instanceof HTMLTextAreaElement) return "textbox";
      if (element instanceof HTMLInputElement) return element.type === "checkbox" ? "checkbox" : "textbox";
      if (element instanceof HTMLAnchorElement) return "link";
      if (element.isContentEditable) return "contenteditable";
      if (element.tagName === "SUMMARY") return "summary";
      if (element instanceof HTMLIFrameElement) return "iframe";
      if (element instanceof HTMLObjectElement) return "object";
      if (element instanceof HTMLEmbedElement) return "embed";
      if (element instanceof HTMLAudioElement) return "audio";
      if (element instanceof HTMLVideoElement) return "video";
      return null;
    };
    const isNonemptyFeedbackTarget = (element) => (
      element.classList.contains("fp-feedback")
      && ["alert", "status"].includes(element.getAttribute("role"))
      && Boolean(visibleText(element))
    );
    const directLabelText = (element) => [...element.childNodes]
      .filter((node) => node.nodeType === Node.TEXT_NODE)
      .map((node) => node.textContent?.trim() || "")
      .filter(Boolean)
      .join(" ");
    return [...document.querySelectorAll(selector)]
      .filter((element) => element instanceof HTMLElement)
      .filter((element) => !element.hasAttribute("disabled"))
      .filter((element) => (
        element.tabIndex >= 0
        || element.isContentEditable
        || ["SUMMARY", "IFRAME", "OBJECT", "EMBED"].includes(element.tagName)
        || ((element instanceof HTMLAudioElement || element instanceof HTMLVideoElement) && element.hasAttribute("controls"))
        || isNonemptyFeedbackTarget(element)
      ))
      .filter((element) => element.getAttribute("contenteditable")?.toLowerCase() !== "false")
      .filter((element) => {
        const style = window.getComputedStyle(element);
        return style.display !== "none" && style.visibility !== "hidden" && element.getClientRects().length > 0;
      })
      .map((element) => {
        element.focus();
        const control = element;
        const labelledBy = resolvedAriaLabelledBy(control);
        const directLabel = associatedLabel(control);
        const options = control instanceof HTMLSelectElement
          ? [...control.options].map((option) => ({ value: option.value, label: visibleText(option) }))
          : null;
        const fieldLabel = control instanceof HTMLSelectElement ? control.closest("label.fp-field") : null;
        return {
          id: control.id || null,
          tag: control.tagName.toLowerCase(),
          role: control.getAttribute("role") || implicitRole(control),
          ariaLabel: control.getAttribute("aria-label"),
          ariaLabelledBy: control.getAttribute("aria-labelledby"),
          resolvedAriaLabelledBy: labelledBy || null,
          accessibleName: labelledBy || control.getAttribute("aria-label") || directLabel || visibleText(control) || control.getAttribute("title") || null,
          visibleText: visibleText(control),
          associatedLabel: directLabel,
          value: "value" in control ? String(control.value) : null,
          placeholder: control.getAttribute("placeholder"),
          title: control.getAttribute("title"),
          options,
          localAccountMarker: fieldLabel && directLabelText(fieldLabel) === "Local account" ? "label.fp-field:Local account" : null,
          feedbackTarget: isNonemptyFeedbackTarget(control) ? "governed-feedback" : null,
          component: control.closest("[data-factory-component]")?.getAttribute("data-factory-component") || null,
          keyboardReachable: document.activeElement === control,
        };
      });
  });
}

const LOCAL_ACCOUNT_MARKER = "label.fp-field:Local account";

function actorIdsFor(application) {
  return ["submitter", "approver", "auditor", "observer"]
    .map((kind) => application.roles[kind])
    .filter(Boolean);
}

function hasExactValues(actual, expected) {
  return Array.isArray(actual)
    && actual.length === expected.length
    && actual.every((value, index) => value === expected[index]);
}

function isStrictLocalAccountSelector(control, actorIds) {
  const expectedLabels = actorIds.map((_, index) => `Local account ${index + 1}`);
  return control.tag === "select"
    && control.role === "combobox"
    && control.ariaLabel === null
    && control.ariaLabelledBy === null
    && control.localAccountMarker === LOCAL_ACCOUNT_MARKER
    && hasExactValues(control.options?.map((option) => option.value), actorIds)
    && hasExactValues(control.options?.map((option) => option.label), expectedLabels)
    && control.visibleText === expectedLabels.join("")
    && control.associatedLabel === `${LOCAL_ACCOUNT_MARKER.replace("label.fp-field:", "")}${expectedLabels.join("")}`
    && !control.component;
}

function isConditionalFeedbackTarget(control) {
  return control.feedbackTarget === "governed-feedback"
    && ["alert", "status"].includes(control.role)
    && Boolean(control.visibleText.trim())
    && !control.component;
}

function assertSignedOutControlsAreSafe(inventory, actorIds) {
  const protectedText = /\b(approve|reject|audit|my requests|submit request|sign out|employee|manager|finance|auditor|observer|approver|requester)\b/i;
  const protectedControls = inventory.filter((control) => (
    // The signed-out local selector intentionally retains an internal actor
    // ID; only its visible and accessible labels are part of the public
    // surface. All other control values are visible/interactive content.
    // eslint-disable-next-line no-nested-ternary
    (() => {
      const isRoleNeutralLocalAccount = isStrictLocalAccountSelector(control, actorIds);
      const publicValue = isRoleNeutralLocalAccount ? null : control.value;
      return protectedText.test([
        control.accessibleName,
        control.resolvedAriaLabelledBy,
        control.ariaLabel,
        control.visibleText,
        control.associatedLabel,
        publicValue,
        control.placeholder,
        control.title,
      ].filter(Boolean).join(" "));
    })()
  ));
  assert.deepEqual(
    protectedControls,
    [],
    `signed-out keyboard controls must not expose protected destinations, actions, or role labels: ${JSON.stringify(inventory)}`,
  );
  assert.ok(inventory.every((control) => control.keyboardReachable), `each signed-out control must be keyboard reachable: ${JSON.stringify(inventory)}`);
}

function signedOutAllowlistKind(control, actorIds) {
  if (
    control.tag === "button"
    && control.role === "button"
    && /^Switch to (dark|light) theme$/.test(control.ariaLabel || "")
    && /^(Dark|Light)$/.test(control.visibleText)
    && !control.component
  ) return "theme-control";
  if (isStrictLocalAccountSelector(control, actorIds)) return "local-account-selector";
  if (
    control.tag === "button"
    && control.role === "button"
    && control.ariaLabel === null
    && control.visibleText === "Sign in"
    && control.component === "ui.login-page@2.4.0"
  ) return "sign-in";
  if (isConditionalFeedbackTarget(control)) return "feedback";
  return null;
}

function assertSignedOutControlsExactlyMatchAllowlist(inventory, application, phase) {
  const actorIds = actorIdsFor(application);
  assertSignedOutControlsAreSafe(inventory, actorIds);
  const actual = inventory.map((control) => signedOutAllowlistKind(control, actorIds));
  const feedback = actual.filter((kind) => kind === "feedback");
  assert.ok(feedback.length <= 1, `${phase} may expose at most one nonempty governed feedback target: ${JSON.stringify(inventory)}`);
  const expected = ["local-account-selector", "sign-in", "theme-control"];
  assert.deepEqual(
    actual.filter((kind) => kind !== "feedback").sort(),
    expected,
    `${phase} signed-out focusable inventory must exactly equal the positive allowlist: ${JSON.stringify(inventory)}`,
  );
}

async function assertHostileFocusableFamiliesAreRejected(page, application) {
  const actorIds = actorIdsFor(application);
  const hostileFamilies = [
    ["native-button", '<button type="button" aria-label="hostile native-button approve">Approve</button>'],
    ["native-input", '<input type="button" aria-label="hostile native-input approve" value="Approve" />'],
    ["native-select", '<select aria-label="hostile native-select approve"><option>Approve</option></select>'],
    ["native-textarea", '<textarea aria-label="hostile native-textarea approve">Approve</textarea>'],
    ["link", '<a href="#hostile" aria-label="hostile link approve">Approve</a>'],
    ["contenteditable", '<div contenteditable="true" aria-label="hostile contenteditable approve">Approve</div>'],
    ["summary", '<details open><summary aria-label="hostile summary approve">Approve</summary></details>'],
    ["iframe", '<iframe aria-label="hostile iframe approve" title="Approve" srcdoc="<p>Approve</p>"></iframe>'],
    ["object", '<object aria-label="hostile object approve" tabindex="0" data="about:blank"></object>'],
    ["embed", '<embed aria-label="hostile embed approve" tabindex="0" type="text/html" />'],
    ["audio", '<audio controls aria-label="hostile audio approve"></audio>'],
    ["video", '<video controls aria-label="hostile video approve"></video>'],
    ["aria-labelledby-only", '<span id="hostile-labelledby-first">Approve</span><span id="hostile-labelledby-second">Audit</span><button type="button" aria-labelledby="hostile-labelledby-second hostile-labelledby-first"></button>'],
    [
      "local-account-arbitrary-option",
      `<label class="fp-field">Local account<select id="hostile-local-account-arbitrary-option">${[...actorIds, "untrusted"].map((id, index) => `<option value="${id}">Local account ${index + 1}</option>`).join("")}</select></label>`,
    ],
    [
      "local-account-privileged-label",
      `<label class="fp-field">Local account<select id="hostile-local-account-privileged-label">${actorIds.map((id, index) => `<option value="${id}">${index === 1 ? "Manager" : `Local account ${index + 1}`}</option>`).join("")}</select></label>`,
    ],
  ];
  for (const [family, markup] of hostileFamilies) {
    const label = `hostile ${family} approve`;
    await page.evaluate(({ family: hostileFamily, hostileMarkup }) => {
      const container = document.createElement("div");
      container.id = `hostile-focusable-${hostileFamily}`;
      container.style.cssText = "position:absolute;left:-10000px;top:0;width:120px;height:80px;display:block;";
      container.innerHTML = hostileMarkup;
      document.body.append(container);
    }, { family, hostileMarkup: markup });
    try {
      const inventory = await signedOutFocusableInventory(page);
      const control = family === "aria-labelledby-only"
        ? inventory.find((candidate) => candidate.resolvedAriaLabelledBy === "Approve Audit")
        : family.startsWith("local-account-")
          ? inventory.find((candidate) => candidate.id === `hostile-${family}`)
        : inventory.find((candidate) => candidate.ariaLabel === label);
      assert.ok(control, `inventory must capture hostile ${family} surface with its resolved name: ${JSON.stringify(inventory)}`);
      assert.throws(
        () => assertSignedOutControlsExactlyMatchAllowlist(inventory, application, `hostile ${family}`),
        /signed-out keyboard controls|positive allowlist/,
        `hostile ${family} protected surface must be rejected`,
      );
    } finally {
      await page.evaluate((hostileFamily) => document.getElementById(`hostile-focusable-${hostileFamily}`)?.remove(), family);
    }
  }
}

async function assertConditionalFeedbackAllowlist(page, application) {
  const feedbackCases = [
    ["nonempty", '<p id="hostile-feedback-nonempty" class="fp-feedback" role="status" tabindex="-1">Safe local feedback</p>', true],
    ["empty", '<p id="hostile-feedback-empty" class="fp-feedback" role="status" tabindex="-1"></p>', false],
  ];
  for (const [kind, markup, expectedPresent] of feedbackCases) {
    await page.evaluate(({ feedbackKind, feedbackMarkup }) => {
      const container = document.createElement("div");
      container.id = `hostile-feedback-container-${feedbackKind}`;
      container.innerHTML = feedbackMarkup;
      document.body.append(container);
    }, { feedbackKind: kind, feedbackMarkup: markup });
    try {
      const inventory = await signedOutFocusableInventory(page);
      const feedback = inventory.find((control) => control.id === `hostile-feedback-${kind}`);
      assert.equal(Boolean(feedback), expectedPresent, `${kind} feedback inventory presence must match its content`);
      assertSignedOutControlsExactlyMatchAllowlist(inventory, application, `${kind} feedback`);
    } finally {
      await page.evaluate((feedbackKind) => document.getElementById(`hostile-feedback-container-${feedbackKind}`)?.remove(), kind);
    }
  }
}

async function assertSignedOutBoundary(page, application, phase) {
  await page.getByRole("button", { name: "Sign in" }).waitFor();
  await page.waitForFunction(() => document.querySelectorAll(".fp-feedback").length === 0);
  assert.equal(await page.getByRole("navigation", { name: "Primary navigation" }).count(), 0, `${phase} must not expose application navigation`);
  assert.equal(await page.getByRole("button", { name: /^(Approve|Reject|Sign out)$/ }).count(), 0, `${phase} must not expose protected actions`);
  const inventory = await signedOutFocusableInventory(page);
  if (process.env.FACTORY_E2E_INVENTORY === "1") {
    console.log(JSON.stringify({ application: application.name, phase, signedOutControls: inventory }));
  }
  assert.equal(await page.locator(".fp-feedback").count(), 0, `${phase} no-feedback state must not retain a feedback target`);
  assertSignedOutControlsExactlyMatchAllowlist(inventory, application, phase);

  for (const selector of [
    '[data-factory-component^="ui.approval-form"]',
    '[data-factory-component^="ui.approval-queue"]',
    '[data-factory-component^="ui.my-requests"]',
    '[data-factory-component^="ui.app-shell.audit"]',
  ]) {
    assert.equal(await page.locator(selector).count(), 0, `${phase} must not retain protected component content: ${selector}`);
  }
  assert.equal(await page.locator(".fp-row").count(), 0, `${phase} must not retain a request or record summary`);
  const bodyText = await page.locator("main").innerText();
  const auditRecordKey = application.name === "leave-approval" ? "leave_request" : "expense_claim";
  assert.equal(bodyText.includes("Browser proof for"), false, `${phase} must not retain submitted record content`);
  for (const action of ["submitted", "approved", "rejected"]) {
    assert.equal(bodyText.includes(`${auditRecordKey}.${action}`), false, `${phase} must not retain audit event text for ${action}`);
  }
}

function durationInMilliseconds(value) {
  const match = /^(\d*\.?\d+(?:e[+-]?\d+)?)(ms|s)$/i.exec(value.trim());
  assert.ok(match, `computed transition duration must be a CSS time: ${value}`);
  return Number(match[1]) * (match[2] === "s" ? 1000 : 1);
}

async function signInAs(page, actor, sessionCookieName) {
  await page.locator("select").selectOption(actor);
  const signInResponse = page.waitForResponse((response) => (
    response.url().endsWith("/session/sign-in") && response.request().method() === "POST"
  ));
  await page.getByRole("button", { name: "Sign in" }).click();
  const response = await signInResponse;
  const responseBody = await response.text();
  assert.equal(response.status(), 200, `local browser sign-in for ${actor} returned ${response.status()}: ${responseBody}`);
  await page.getByRole("button", { name: "Sign out" }).waitFor();
  const cookies = await page.context().cookies();
  const session = cookies.find((cookie) => cookie.name === sessionCookieName);
  assert.ok(session, `browser did not retain a session cookie for ${actor}`);
  return session.value;
}

async function switchAndSignIn(page, application, actor, phase) {
  await page.getByRole("button", { name: "Sign out" }).click();
  await assertSignedOutBoundary(page, application, phase);
  return signInAs(page, actor, application.sessionCookieName);
}

function valueFor(field) {
  if (field.type === "date") return "2026-08-01";
  if (field.type === "number") return "42";
  if (field.type === "enum") return field.options[0];
  return `Browser proof for ${field.label}`;
}

async function completeBrowserApproval({ browser, application, webUrl }) {
  const context = await browser.newContext();
  const page = await context.newPage();
  await installFetchCompletionSeam(page);
  let decisionRequests = 0;
  page.on("request", (request) => {
    if (request.method() === "POST" && request.url().includes("/decision")) decisionRequests += 1;
  });
  try {
    await page.goto(webUrl, { waitUntil: "domcontentloaded" });
    await page.getByRole("heading", { name: `${application.record_label} approval` }).waitFor();
    const navigationLabel = (href) => application.navigation.find((item) => item.href === href)?.label;
    const expectRoutes = async (hrefs) => {
      const labels = await page.getByRole("navigation", { name: "Primary navigation" }).getByRole("button").allTextContents();
      assert.deepEqual(labels, hrefs.map(navigationLabel), `role navigation must expose only ${hrefs.join(", ")}`);
    };

    await assertSignedOutBoundary(page, application, "initial");
    await assertHostileFocusableFamiliesAreRejected(page, application);
    await assertConditionalFeedbackAllowlist(page, application);

    const submitterCookie = await signInAs(page, application.roles.submitter, application.sessionCookieName);
    assert.equal(application.previewFamily, "candidate-ui-2.4", "browser proof must render the isolated 2.4 candidate preview");
    const appRoot = page.locator('[data-factory-ui="1.4.0"]');
    assert.equal(await appRoot.getAttribute("data-theme"), "light", "generated application must default to light theme");
    await page.getByRole("button", { name: "Switch to dark theme" }).click();
    assert.equal(await appRoot.getAttribute("data-theme"), "dark", "generated application must retain a dark theme");
    await page.getByRole("button", { name: "Switch to light theme" }).click();
    const navigation = page.getByRole("navigation", { name: "Primary navigation" });
    const submitterRoutes = availableRoutesFor(application, "submitter");
    await expectRoutes(submitterRoutes);
    assert.equal(await navigation.locator(".fp-rail-action").count(), submitterRoutes.length, "the generated product must render its route rail as icon actions");
    if (!submitterRoutes.includes("/")) {
      const fallback = navigation.getByRole("button", { name: navigationLabel(submitterRoutes[0]), exact: true });
      assert.equal(await fallback.getAttribute("aria-current"), "page", "an unavailable initial route must deterministically render the first allowed destination");
    }
    const submitTab = navigation.getByRole("button", { name: navigationLabel("/submit"), exact: true });
    await submitTab.focus();
    await page.keyboard.press("Enter");
    assert.equal(await submitTab.getAttribute("aria-current"), "page", "keyboard activation must select the submit view");
    assert.equal(await submitTab.evaluate((element) => document.activeElement === element), true, "keyboard activation must retain focus on the selected route");
    await page.getByRole("heading", { name: application.record_label, exact: true }).waitFor();
    const approvalForm = page.getByRole("form", { name: "approval form" });
    const firstRequired = approvalForm.locator("[required]").first();
    await approvalForm.getByRole("button", { name: application.submitLabel, exact: true }).click();
    assert.equal(await firstRequired.evaluate((element) => !element.checkValidity() && Boolean(element.validationMessage)), true, "an empty required field must expose browser validation feedback");
    assert.equal(await firstRequired.evaluate((element) => document.activeElement === element), true, "required validation must focus the first invalid field");
    for (const field of application.fields) {
      const control = approvalForm.locator(`[name="${field.id}"]`);
      if (field.type === "enum") await control.selectOption(valueFor(field));
      else await control.fill(valueFor(field));
    }
    await approvalForm.getByRole("button", { name: application.submitLabel, exact: true }).click();
    await page.locator(".fp-status-chip").filter({ hasText: "pending" }).waitFor();

    const approverCookie = await switchAndSignIn(page, application, application.roles.approver, "submitter-to-approver sign-out");
    assert.notEqual(approverCookie, submitterCookie, "role switch did not replace the browser session cookie");
    await expectRoutes(availableRoutesFor(application, "approver"));
    await navigation.getByRole("button", { name: navigationLabel("/approval-queue"), exact: true }).click();
    await page.getByRole("heading", { name: "Approval queue" }).waitFor();
    const decisionRequestsBeforeConfirmation = decisionRequests;
    await page.getByRole("button", { name: "Approve" }).click();
    const confirmation = page.getByRole("dialog", { name: "Confirm approved" });
    await confirmation.waitFor();
    assert.equal(decisionRequests, decisionRequestsBeforeConfirmation, "opening a confirmation must not create a decision request");
    await page.waitForFunction(() => document.querySelector('[role="dialog"] button') === document.activeElement);
    assert.equal(await confirmation.getByRole("button", { name: "Cancel" }).evaluate((element) => document.activeElement === element), true, "opening confirmation must initially focus Cancel");
    await confirmation.getByRole("button", { name: "Confirm" }).focus();
    await page.keyboard.press("Tab");
    assert.equal(await confirmation.getByRole("button", { name: "Cancel" }).evaluate((element) => document.activeElement === element), true, "Tab must loop within confirmation");
    await page.keyboard.press("Shift+Tab");
    assert.equal(await confirmation.getByRole("button", { name: "Confirm" }).evaluate((element) => document.activeElement === element), true, "Shift+Tab must loop within confirmation");
    assert.equal(await confirmation.getByRole("button", { name: "Confirm" }).isDisabled(), false, "decision confirmation must start enabled");
    await confirmation.getByRole("button", { name: "Cancel" }).click();
    await confirmation.waitFor({ state: "detached" });
    assert.equal(decisionRequests, decisionRequestsBeforeConfirmation, "Cancel must not create a decision request");
    await page.waitForFunction(() => [...document.querySelectorAll("button")].some((button) => button.textContent?.trim() === "Approve" && document.activeElement === button));
    assert.equal(await page.getByRole("button", { name: "Approve" }).evaluate((element) => document.activeElement === element), true, "Cancel must restore decision focus");
    await page.getByRole("button", { name: "Approve" }).click();
    await confirmation.waitFor();
    await page.waitForFunction(() => document.querySelector('[role="dialog"] button') === document.activeElement);
    await page.keyboard.press("Escape");
    await confirmation.waitFor({ state: "detached" });
    assert.equal(decisionRequests, decisionRequestsBeforeConfirmation, "Escape must not create a decision request");
    await page.waitForFunction(() => [...document.querySelectorAll("button")].some((button) => button.textContent?.trim() === "Approve" && document.activeElement === button));
    assert.equal(await page.getByRole("button", { name: "Approve" }).evaluate((element) => document.activeElement === element), true, "Escape must restore decision focus");
    const approvalRouteCaptured = deferred("approval decision route captured");
    const releaseApprovalRoute = deferred("release approval decision route");
    await page.route("**/decision", async (route) => {
      approvalRouteCaptured.resolve();
      await releaseApprovalRoute.promise;
      await route.continue();
    });
    const approvalResponse = page.waitForResponse((response) => (
      response.url().includes("/decision") && response.request().method() === "POST"
    ));
    await page.getByRole("button", { name: "Approve" }).click();
    await page.getByRole("dialog", { name: "Confirm approved" }).getByRole("button", { name: "Confirm" }).click();
    await approvalRouteCaptured.promise;
    const pendingApprove = page.getByRole("button", { name: "Approve" });
    await pendingApprove.waitFor({ state: "attached" });
    assert.equal(await pendingApprove.isDisabled(), true, "the affected decision action must be natively disabled while its request is pending");
    assert.equal(await pendingApprove.getAttribute("aria-busy"), "true", "the affected decision action must expose busy state while pending");
    releaseApprovalRoute.resolve();
    const approvalResult = await approvalResponse;
    const approvalBody = await approvalResult.text();
    assert.equal(approvalResult.status(), 200, `approval request must succeed: ${approvalResult.status()} ${approvalBody}`);
    await page.unroute("**/decision");
    await page.waitForFunction(() => [...document.querySelectorAll('[role="status"]')].some((element) => element.textContent?.trim() === "Request approved."));
    await page.getByRole("status").getByText("Request approved.", { exact: true }).waitFor();

    await switchAndSignIn(page, application, application.roles.submitter, "approver-to-submitter sign-out");
    await navigation.getByRole("button", { name: navigationLabel("/submit"), exact: true }).click();
    for (const field of application.fields) {
      const control = page.getByRole("form", { name: "approval form" }).locator(`[name="${field.id}"]`);
      if (field.type === "enum") await control.selectOption(valueFor(field));
      else await control.fill(valueFor(field));
    }
    await page.getByRole("form", { name: "approval form" }).getByRole("button", { name: application.submitLabel, exact: true }).click();
    await switchAndSignIn(page, application, application.roles.approver, "submitter-to-approver retry sign-out");
    await navigation.getByRole("button", { name: navigationLabel("/approval-queue"), exact: true }).click();
    await page.getByRole("button", { name: "Reject" }).click();
    await page.route("**/decision", async (route) => {
      await route.fulfill({ status: 500, contentType: "application/json", body: "{}" });
    });
    await page.getByRole("dialog", { name: "Confirm rejected" }).getByRole("button", { name: "Confirm" }).click();
    const failureFeedback = page.getByText("We could not complete that request. Try again.", { exact: true });
    await failureFeedback.waitFor();
    await page.waitForFunction(() => document.activeElement?.getAttribute("role") === "alert");
    assert.equal(await failureFeedback.getAttribute("role"), "alert", "failed decisions must use the governed alert feedback boundary");
    assert.equal(await failureFeedback.evaluate((element) => document.activeElement === element), true, "failed decisions must focus governed feedback");
    assert.equal(await failureFeedback.innerText(), "We could not complete that request. Try again.", "failed decisions must not expose raw backend errors");
    await page.unroute("**/decision");

    const decisionNewActor = application.roles.submitter;
    const staleDecisionSentinel = `stale-decision-${application.name}-${application.roles.approver}-to-${decisionNewActor}`;
    await armFetchCompletionSeam(page, {
      label: staleDecisionSentinel,
      pathSuffix: "/decision",
      payload: { result: staleDecisionSentinel },
    });
    await page.getByRole("button", { name: "Reject" }).click();
    await page.getByRole("dialog", { name: "Confirm rejected" }).getByRole("button", { name: "Confirm" }).click();
    await waitForFetchCompletionCapture(page, staleDecisionSentinel);
    await triggerSignOutThroughCompletionSeam(page);
    await assertSignedOutBoundary(page, application, "delayed decision sign-out before release (approver generation)");
    const delayedDecisionNewCookie = await signInAs(page, decisionNewActor, application.sessionCookieName);
    assert.notEqual(delayedDecisionNewCookie, approverCookie, "delayed decision must reauthenticate a different actor before stale completion release");
    await expectRoutes(availableRoutesFor(application, "submitter"));
    await releaseFetchCompletionSeam(page, staleDecisionSentinel);
    await assertInvalidatedCompletionDoesNotLeak(page, {
      caseLabel: "delayed decision completion after approver-to-submitter switch",
      oldActor: application.roles.approver,
      newActor: decisionNewActor,
      sentinel: staleDecisionSentinel,
      absentButtons: ["Approve", "Reject"],
      absentText: ["Request rejected."],
    });

    const retryApproverCookie = await switchAndSignIn(page, application, application.roles.approver, "post-stale-decision submitter-to-approver sign-out");
    assert.notEqual(retryApproverCookie, approverCookie, "delayed-decision retry must use a new browser session");
    await expectRoutes(availableRoutesFor(application, "approver"));
    await navigation.getByRole("button", { name: navigationLabel("/approval-queue"), exact: true }).click();
    await page.getByRole("button", { name: "Reject" }).click();
    await page.getByRole("dialog", { name: "Confirm rejected" }).getByRole("button", { name: "Confirm" }).click();
    await page.getByText("No requests need a decision.", { exact: true }).waitFor();

    const auditRoleKind = application.roles.auditor ? "auditor" : "observer";
    const auditRole = application.roles[auditRoleKind];
    const auditorCookie = await switchAndSignIn(page, application, auditRole, "approver-to-auditor sign-out");
    assert.notEqual(auditorCookie, approverCookie, "auditor sign-in did not replace the browser session cookie");
    await expectRoutes(availableRoutesFor(application, auditRoleKind));
    await navigation.getByRole("button", { name: navigationLabel("/audit"), exact: true }).click();
    const audit = page.locator('[data-factory-component^="ui.app-shell.audit"]');
    await audit.waitFor();
    const auditRecordKey = application.name === "leave-approval" ? "leave_request" : "expense_claim";
    for (const action of ["submitted", "approved", "rejected"]) {
      const event = `${auditRecordKey}.${action}`;
      await page.waitForFunction((expectedEvent) => [...document.querySelectorAll('[data-factory-component^="ui.app-shell.audit"] strong')].some((element) => element.textContent === expectedEvent), event);
      assert.ok(await audit.getByText(event, { exact: true }).count() >= 1, `audit must retain ${event}`);
    }
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), "desktop preview must not overflow horizontally");
    await page.emulateMedia({ reducedMotion: "reduce" });
    const reducedMotionDuration = await page.getByRole("button", { name: navigationLabel("/audit"), exact: true }).evaluate((element) => getComputedStyle(element).transitionDuration);
    assert.ok(durationInMilliseconds(reducedMotionDuration) <= 0.01, `reduced-motion mode must suppress generated UI transitions: ${reducedMotionDuration}`);
    await page.setViewportSize({ width: 390, height: 844 });
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), "390px preview must not overflow horizontally");
    const auditAction = navigation.getByRole("button", { name: navigationLabel("/audit"), exact: true });
    const profileAction = navigation.getByRole("button", { name: navigationLabel("/profile"), exact: true });
    await auditAction.focus();
    await page.keyboard.press("Tab");
    assert.equal(await profileAction.evaluate((element) => document.activeElement === element), true, "keyboard focus must advance to the profile rail action");
    assert.equal(await page.locator(".fp-rail-tooltip").filter({ hasText: navigationLabel("/profile") }).evaluate((element) => getComputedStyle(element).display), "block", "focused rail actions must expose their visible tooltip");
    await profileAction.click();
    const profile = page.getByRole("region", { name: "Profile" });
    await profile.waitFor();
    assert.ok(await profile.getByText("Read only", { exact: true }).count() >= 1, "profile must explicitly declare its read-only state");
    assert.equal(await profile.getByRole("textbox").count(), 0, "profile must not imply editable persistence");
    await navigation.getByRole("button", { name: navigationLabel("/settings"), exact: true }).click();
    const settings = page.getByRole("region", { name: "Settings" });
    await settings.waitFor();
    assert.ok(await settings.getByText("Read only", { exact: true }).count() >= 1, "settings must explicitly declare its read-only state");
    assert.equal(await settings.getByRole("textbox").count(), 0, "settings must not imply editable persistence");

    await page.getByRole("button", { name: "Sign out" }).click();
    await assertSignedOutBoundary(page, application, "auditor sign-out before delayed audit load");
    const auditNewActor = application.roles.submitter;
    const staleAuditSentinel = `stale-audit-${application.name}-${auditRole}-to-${auditNewActor}`;
    await armFetchCompletionSeam(page, {
      label: staleAuditSentinel,
      pathSuffix: "/audit-events",
      payload: [{ id: "stale-audit-event", action: staleAuditSentinel, actor: "stale-actor", created_at: "2026-01-01T00:00:00Z" }],
    });
    await signInAs(page, auditRole, application.sessionCookieName);
    await waitForFetchCompletionCapture(page, staleAuditSentinel);
    await page.getByRole("button", { name: "Sign out" }).click();
    await assertSignedOutBoundary(page, application, "delayed audit load sign-out before release (first auditor generation)");
    const delayedAuditNewCookie = await signInAs(page, auditNewActor, application.sessionCookieName);
    assert.notEqual(auditNewActor, auditRole, "delayed audit proof must switch to a different actor before stale completion release");
    assert.notEqual(delayedAuditNewCookie, auditorCookie, "delayed audit proof must create a new browser session before stale completion release");
    await expectRoutes(availableRoutesFor(application, "submitter"));
    await releaseFetchCompletionSeam(page, staleAuditSentinel);
    await assertInvalidatedCompletionDoesNotLeak(page, {
      caseLabel: "delayed audit completion after auditor-to-submitter switch",
      oldActor: auditRole,
      newActor: auditNewActor,
      sentinel: staleAuditSentinel,
      absentButtons: ["Approve", "Reject"],
    });
    assert.equal(await page.locator('[data-factory-component^="ui.app-shell.audit"]').count(), 0, `delayed audit completion after ${auditRole}-to-${auditNewActor} leaked an audit surface`);
  } finally {
    await context.close();
  }
}

async function verifyCleanup(project, output, environment) {
  const services = await run("docker", composeArgs(project, output, "ps", "--all", "--services"), { env: environment });
  assert.equal(services.stdout.trim(), "", `Compose services remain after cleanup for ${project}`);
  const volumes = await run("docker", ["volume", "ls", "--filter", `label=com.docker.compose.project=${project}`, "--format", "{{.Name}}"], { env: environment });
  assert.equal(volumes.stdout.trim(), "", `Compose volumes remain after cleanup for ${project}`);
}

async function runApplication(browser, application, index) {
  const apiPort = await unusedLoopbackPort();
  const output = application.output;
  const project = `factory_browser_e2e_${process.pid}_${index}`;
  const environment = {
    ...process.env,
    FACTORY_API_HOST_PORT: String(apiPort),
    DOCKER_HOST: "",
    DOCKER_CONTEXT: "",
  };
  let started = false;
  try {
    await run("docker", composeArgs(project, output, "up", "--build", "--detach"), { env: environment });
    started = true;
    const webPort = (await run("docker", composeArgs(project, output, "port", "web", "3000"), { env: environment })).stdout.trim().match(/:(\d+)$/)?.[1];
    assert.ok(webPort, "Compose did not report a loopback web port");
    const webUrl = `http://127.0.0.1:${webPort}`;
    await waitForWeb(webUrl);
    await completeBrowserApproval({ browser, application, webUrl });
    return { name: application.name, webUrl, apiPort };
  } finally {
    if (started) {
      await run("docker", composeArgs(project, output, "down", "--volumes", "--remove-orphans"), { env: environment });
    }
    await verifyCleanup(project, output, environment);
  }
}

async function main() {
  const root = await mkdtemp(join(tmpdir(), "factory-composable-browser-e2e-"));
  let browser;
  try {
    const applications = await createFixtureOutputs(root);
    assert.equal(applications.length, 2, "fixture materialization must create leave and expense applications");
    assert.ok(APPLICATION_LIMIT >= 1 && APPLICATION_LIMIT <= applications.length, "application limit must select one or both proof applications");
    assert.deepEqual(applications[0].locks, applications[1].locks, "proof applications must use identical component locks");
    const candidateUiLocks = applications[0].locks.filter((lock) => lock.key.startsWith("ui."));
    assert.equal(candidateUiLocks.length, 8, "candidate proof must lock every UI package exactly once");
    assert.ok(candidateUiLocks.every((lock) => lock.version === "2.4.0"), "candidate proof must not retain an older UI lock");
    assert.deepEqual(candidateUiLocks.map((lock) => lock.key).sort(), ["ui.app-shell", "ui.approval-form", "ui.approval-queue", "ui.home-page", "ui.login-page", "ui.my-requests", "ui.profile-page", "ui.system-settings-page"], "candidate proof must lock the complete 2.4 UI family");
    assert.notDeepEqual(applications[0].outputManifest, applications[1].outputManifest, "validated profile inputs must produce distinct candidate output manifests");
    assert.notEqual(applications[0].record_label, applications[1].record_label, "proof applications must expose distinct labels");
    assert.notDeepEqual(applications[0].fields, applications[1].fields, "proof applications must expose distinct validated fields");
    for (const application of applications) await assertGeneratedOutputPrivacy(application);

    browser = await chromium.launch({ headless: true });
    const evidence = [];
    for (const [index, application] of applications.slice(0, APPLICATION_LIMIT).entries()) {
      evidence.push(await runApplication(browser, application, index));
    }
    console.log(JSON.stringify({ status: "passed", applications: evidence }, null, 2));
  } finally {
    await browser?.close();
    await rm(root, { recursive: true, force: true });
  }
}

try {
  await main();
} catch (error) {
  console.error(error instanceof Error ? error.stack : error);
  process.exitCode = 1;
}

// Playwright keeps a pipe handle open briefly on Windows after a clean close.
// Delay the explicit exit long enough for the JSON evidence above to reach the
// invoking terminal; all application and Compose cleanup has already finished.
setTimeout(() => process.exit(process.exitCode || 0), 250);
