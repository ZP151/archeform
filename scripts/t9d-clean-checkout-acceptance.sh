#!/usr/bin/env bash
# T9-D: frozen-lockfile clean-checkout acceptance.
#
# 1. Clone the repo at HEAD and apply the working-tree changes verbatim, except
#    output-only acceptance screenshots, so the clean checkout is the tree that
#    will be committed at T9-E before fresh evidence is added.
# 2. pnpm install --frozen-lockfile — the lockfile must be complete and
#    current; any drift fails the install.
# 3. Gate suite from the clean state: manifest-scoped Prettier and shell
#    syntax checks, followed by the full typecheck, test, and build.
# 4. Run-scoped Compose stack on nondefault ports (no fixture lever), booted
#    cold from the root local .env without copying that file.
# 5. Live real-model Golden Path, material-difference proof, and read-only
#    action inventory.
# 6. Prove and copy all 26 freshly regenerated acceptance screenshots.
# 7. Cleanup proof: stack down, volumes and artifact directory removed,
#    nothing of the project remains in Docker or on disk.
#
# Usage: bash scripts/t9d-clean-checkout-acceptance.sh <scratch-dir>
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SCRATCH="${1:?usage: t9d-clean-checkout-acceptance.sh <scratch-dir>}"
CLEAN="$SCRATCH/clean-checkout"
ROOT_ENV="$REPO_ROOT/.env"

EXPECTED_EVIDENCE=(
  prompt-a-requirement prompt-a-plan prompt-a-studio prompt-a-theme-dark
  prompt-a-simulation prompt-a-release prompt-a-generated
  prompt-b-requirement prompt-b-plan prompt-b-studio prompt-b-simulation
  prompt-b-release prompt-b-generated
)
EVIDENCE_SIZES=(1440x900 1024x768)
REGENERATED_EVIDENCE_FILES=()
for base in "${EXPECTED_EVIDENCE[@]}"; do
  for size in "${EVIDENCE_SIZES[@]}"; do
    REGENERATED_EVIDENCE_FILES+=("docs/acceptance/evidence/$base-$size.png")
  done
done

if [[ ! -f "$ROOT_ENV" ]]; then
  echo "ERROR: the root local .env is required for real-model acceptance." >&2
  exit 1
fi

# The isolated stack must not depend on or reuse long-lived local service
# credentials. Generate run-scoped Redis and worker credentials in memory;
# Docker Compose receives them from this process environment, while the root
# .env remains the source of the real provider key and is never copied or
# sourced by this script.
export FACTORY_REDIS_PASSWORD="$(node -e "process.stdout.write(require('node:crypto').randomBytes(32).toString('hex'))")"
export FACTORY_INTERNAL_WORKER_TOKEN="$(node -e "process.stdout.write(require('node:crypto').randomBytes(32).toString('hex'))")"

echo "==> [1/7] Building clean checkout at $CLEAN"
rm -rf "$CLEAN"
git clone --quiet --no-hardlinks "file://$REPO_ROOT" "$CLEAN"
cd "$REPO_ROOT"
# This manifest is the intended T9/D0 commit boundary. The clean-checkout
# gate refuses to hide an accidental committable file by simply omitting it.
TRACKED_FILES=(
  .codex/README.md
  .codex/agents/engineer.toml
  .codex/agents/explorer.toml
  .codex/agents/pm.toml
  .codex/config.toml
  .env.example
  AGENTS.md
  README.md
  apps/compiler-worker/src/control-plane-reporter.ts
  apps/compiler-worker/src/main.ts
  apps/compiler-worker/src/preview-runner.ts
  apps/compiler-worker/src/queued-compilation.ts
  apps/compiler-worker/src/verifier/probes.ts
  apps/compiler-worker/src/verifier/verification-environment.ts
  apps/compiler-worker/src/verifier/verification-graph-plan.ts
  apps/compiler-worker/src/verifier/verification-lifecycle.ts
  apps/compiler-worker/test/fixtures/graph-products.ts
  apps/compiler-worker/test/compilation-executor.test.ts
  apps/compiler-worker/test/control-plane-reporter.test.ts
  apps/compiler-worker/test/order-operations-lifecycle.test.ts
  apps/compiler-worker/test/preview-runner.test.ts
  apps/compiler-worker/test/verification-graph-plan.test.ts
  apps/compiler-worker/test/verification-job.test.ts
  apps/compiler-worker/test/verification-lifecycle.test.ts
  apps/compiler-worker/test/verification-probes.test.ts
  apps/intake-cli/test/cli.test.ts
  apps/intake-cli/vitest.config.ts
  apps/control-plane/src/composition/product-composition.service.ts
  apps/control-plane/src/lifecycle.controller.ts
  apps/control-plane/src/lifecycle.service.ts
  apps/control-plane/test/composition-ai-boundary.test.ts
  apps/control-plane/test/composition.service.test.ts
  apps/control-plane/test/lifecycle.controller.test.ts
  apps/control-plane/test/lifecycle.service.test.ts
  apps/control-plane/test/requirement-product-composition.test.ts
  apps/workbench/app/api/requirements/interpret/route.test.ts
  apps/workbench/app/api/requirements/interpret/route.ts
  apps/workbench/components/journey/clarification-panel.test.tsx
  apps/workbench/components/journey/clarification-panel.tsx
  apps/workbench/components/journey/product-studio.test.tsx
  apps/workbench/components/journey/release-workspace.test.tsx
  apps/workbench/components/journey/release-workspace.tsx
  apps/workbench/components/journey/requirement-composer.test.tsx
  apps/workbench/components/canvases/domain-canvas.tsx
  apps/workbench/components/page-studio.tsx
  apps/workbench/components/shell/workbench-shell.test.tsx
  apps/workbench/components/workbench-home.tsx
  apps/workbench/components/workbench-home.test.tsx
  apps/workbench/components/workbench.tsx
  apps/workbench/hooks/use-workbench-controller.ts
  apps/workbench/lib/compilation-status.test.ts
  apps/workbench/lib/compilation-status.ts
  apps/workbench/lib/control-plane-client.test.ts
  apps/workbench/lib/control-plane-client.ts
  apps/workbench/lib/product-journey/interpret-payload.ts
  apps/workbench/lib/product-journey/journey-model.test.ts
  apps/workbench/lib/product-journey/journey-model.ts
  apps/workbench/lib/product-journey/release-model.test.ts
  apps/workbench/lib/product-journey/release-model.ts
  apps/workbench/lib/product-journey/use-product-journey.test.tsx
  apps/workbench/lib/product-journey/use-product-journey.ts
  apps/workbench/lib/product-journey/use-release-journey.test.tsx
  apps/workbench/lib/product-journey/use-release-journey.ts
  docs/acceptance/requirement-to-product-closure.md
  docs/acceptance/workbench-action-inventory.md
  docs/project-status.md
  docs/roadmap.md
  docs/superpowers/ledgers/2026-08-08-base44-inspired-golden-path.md
  docs/superpowers/ledgers/2026-08-09-honest-requirement-to-product-closure.md
  docs/superpowers/plans/2026-08-08-base44-inspired-golden-path.md
  docs/superpowers/plans/2026-08-09-honest-requirement-to-product-closure.md
  docs/superpowers/specs/2026-08-08-base44-inspired-golden-path-design.md
  e2e/golden-path.spec.ts
  package.json
  packages/adapters/package.json
  packages/adapters/src/ai.ts
  packages/adapters/src/requirements/fixture-interpreter.ts
  packages/adapters/src/requirements/openai-interpreter.ts
  packages/adapters/src/requirements/requirement-interpreter.ts
  packages/adapters/test/ai-provider.test.ts
  packages/adapters/test/requirement-interpreter.test.ts
  packages/capabilities/src/composition-planner.ts
  packages/capabilities/src/product-composer.ts
  packages/capabilities/test/composition-planner.test.ts
  packages/capabilities/test/product-composer.test.ts
  packages/compiler/src/index.ts
  packages/compiler/src/targets/database/target.ts
  packages/compiler/test/compilation-plan.test.ts
  packages/compiler/test/composition-page-runtime.test.ts
  packages/compiler/test/database-target-parity.test.ts
  packages/compiler/test/money-pricing-runtime.test.ts
  packages/compiler/test/notification-outbox-runtime.test.ts
  packages/compiler/test/order-operations-runtime.test.ts
  packages/graph/src/composition-plan.ts
  packages/graph/src/composition-shared.ts
  packages/graph/src/diagnosis.ts
  packages/graph/src/model.ts
  packages/graph/src/product-blueprint.ts
  packages/graph/src/requirement-spec.ts
  packages/graph/test/application-graph.test.ts
  packages/graph/test/composition-plan.test.ts
  packages/graph/test/diagnosis-contract.test.ts
  packages/graph/test/product-blueprint.test.ts
  packages/graph/test/requirement-spec.test.ts
  pnpm-lock.yaml
)
UNTRACKED_FILES=(
  .codex/agents/spark_reviewer.toml
  .codex/agents/spark_worker.toml
  apps/compiler-worker/src/verifier/verification-logging.ts
  apps/compiler-worker/test/verification-logging.test.ts
  apps/workbench/lib/product-journey/interpret-contract.test.ts
  apps/workbench/lib/product-journey/interpret-contract.ts
  apps/workbench/lib/product-journey/preview-cleanup.test.ts
  apps/workbench/lib/product-journey/preview-cleanup.ts
  apps/workbench/lib/product-journey/release-diagnosis.test.ts
  apps/workbench/lib/product-journey/release-diagnosis.ts
  packages/adapters/src/requirements-browser.ts
  packages/adapters/src/requirements/clarification-policy.ts
  packages/compiler/test/factory-record-identity.test.ts
  docs/acceptance/evidence/prompt-a-generated-1024x768.png
  docs/acceptance/evidence/prompt-a-generated-1440x900.png
  docs/acceptance/evidence/prompt-a-plan-1024x768.png
  docs/acceptance/evidence/prompt-a-plan-1440x900.png
  docs/acceptance/evidence/prompt-a-release-1024x768.png
  docs/acceptance/evidence/prompt-a-release-1440x900.png
  docs/acceptance/evidence/prompt-a-requirement-1024x768.png
  docs/acceptance/evidence/prompt-a-requirement-1440x900.png
  docs/acceptance/evidence/prompt-a-simulation-1024x768.png
  docs/acceptance/evidence/prompt-a-simulation-1440x900.png
  docs/acceptance/evidence/prompt-a-studio-1024x768.png
  docs/acceptance/evidence/prompt-a-studio-1440x900.png
  docs/acceptance/evidence/prompt-a-theme-dark-1024x768.png
  docs/acceptance/evidence/prompt-a-theme-dark-1440x900.png
  docs/acceptance/evidence/prompt-b-plan-1024x768.png
  docs/acceptance/evidence/prompt-b-plan-1440x900.png
  docs/acceptance/evidence/prompt-b-requirement-1024x768.png
  docs/acceptance/evidence/prompt-b-requirement-1440x900.png
  docs/acceptance/evidence/prompt-b-generated-1024x768.png
  docs/acceptance/evidence/prompt-b-generated-1440x900.png
  docs/acceptance/evidence/prompt-b-release-1024x768.png
  docs/acceptance/evidence/prompt-b-release-1440x900.png
  docs/acceptance/evidence/prompt-b-simulation-1024x768.png
  docs/acceptance/evidence/prompt-b-simulation-1440x900.png
  docs/acceptance/evidence/prompt-b-studio-1024x768.png
  docs/acceptance/evidence/prompt-b-studio-1440x900.png
  docs/archive/status-history/2026-08-09-project-status.md
  docs/agent-workstreams/2026-08-10-archeform-codex-iteration.md
  docs/delivery-policy.md
  docs/iterations/2026-08-10-prompt-to-polished-product-reset.md
  docs/research/2026-08-10-product-builder-ui-ecosystem.md
  docs/superpowers/ledgers/2026-08-10-prompt-to-polished-restaurant-product.md
  docs/superpowers/plans/2026-08-08-adaptive-requirement-interview.md
  docs/superpowers/plans/2026-08-08-archeform-readme-brand.md
  docs/superpowers/plans/2026-08-10-prompt-to-polished-restaurant-product.md
  docs/superpowers/specs/2026-08-08-adaptive-requirement-interview-design.md
  docs/superpowers/specs/2026-08-08-archeform-readme-brand-design.md
  docs/superpowers/specs/2026-08-10-prompt-to-polished-restaurant-product-design.md
  e2e/action-inventory.spec.ts
  scripts/t9d-clean-checkout-acceptance.sh
  scripts/verify-material-difference.mjs
  scripts/verify-no-preview-resources.mjs
  scripts/verify-no-preview-resources.test.mjs
)

# These three historical delivery records already fail Prettier at HEAD. The
# archived status is byte-identical to the old HEAD project-status, which also
# fails Prettier. Reformatting any of them would corrupt the bounded historical
# and provenance scope of this commit, so only these exact paths are frozen.
FROZEN_FORMAT_DEBT_FILES=(
  docs/superpowers/ledgers/2026-08-08-base44-inspired-golden-path.md
  docs/superpowers/ledgers/2026-08-09-honest-requirement-to-product-closure.md
  docs/superpowers/plans/2026-08-08-base44-inspired-golden-path.md
  docs/archive/status-history/2026-08-09-project-status.md
)

contains_manifest_path() {
  local candidate="$1"
  shift
  local expected
  for expected in "$@"; do
    [[ "$candidate" == "$expected" ]] && return 0
  done
  return 1
}

require_single_empty_env_placeholder() {
  local path="$1"
  local key="$2"
  local assignment_count
  assignment_count="$(grep -Ec "^${key}=" "$path")"
  [[ "$assignment_count" -eq 1 ]] && grep -Fxq "${key}=" "$path"
}

for path in "${FROZEN_FORMAT_DEBT_FILES[@]}"; do
  contains_manifest_path "$path" "${TRACKED_FILES[@]}" "${UNTRACKED_FILES[@]}" || {
    echo "ERROR: frozen format-debt file is outside the intended T9/D0 manifest: $path" >&2
    exit 1
  }
done

while IFS= read -r path; do
  contains_manifest_path "$path" "${TRACKED_FILES[@]}" || {
    echo "ERROR: tracked change is outside the intended T9/D0 manifest: $path" >&2
    exit 1
  }
done < <(git diff HEAD --name-only)
while IFS= read -r path; do
  contains_manifest_path "$path" "${UNTRACKED_FILES[@]}" || {
    echo "ERROR: untracked committable file is outside the intended T9/D0 manifest: $path" >&2
    exit 1
  }
done < <(git ls-files --others --exclude-standard)

git diff --binary HEAD -- "${TRACKED_FILES[@]}" > "$SCRATCH/t9d-worktree.patch"
for path in "${UNTRACKED_FILES[@]}"; do
  # Acceptance evidence is output-only. Never seed the clean checkout with an
  # old screenshot and later mistake existence for fresh regeneration.
  if contains_manifest_path "$path" "${REGENERATED_EVIDENCE_FILES[@]}"; then
    continue
  fi
  [[ -f "$path" ]] || {
    echo "ERROR: intended T9/D0 file is missing: $path" >&2
    exit 1
  }
  mkdir -p "$CLEAN/$(dirname "$path")"
  cp "$path" "$CLEAN/$path"
done
git -C "$CLEAN" apply "$SCRATCH/t9d-worktree.patch"
for path in "${REGENERATED_EVIDENCE_FILES[@]}"; do
  [[ ! -e "$CLEAN/$path" ]] || {
    echo "ERROR: regenerated evidence was present before the clean run: $path" >&2
    exit 1
  }
done
git -C "$CLEAN" status --short

echo "==> [2/7] Frozen-lockfile install"
cd "$CLEAN"
pnpm install --frozen-lockfile
# A fresh install has no generated Prisma Client. Root typecheck reaches the
# control plane before its test lifecycle can run `pretest`, so generate the
# client explicitly with the control-plane package's canonical command. This
# non-routable placeholder exists only for schema validation; `prisma generate`
# does not connect to the database and must not read or log the real local URL.
DATABASE_URL='postgresql://factory:factory@127.0.0.1:1/factory?schema=public' \
  pnpm --filter @factory/control-plane prisma:generate

echo "==> [3/7] Gate suite from the clean state"
# Formatting is scoped to the exact commit manifest above. A repository-wide
# check would make this acceptance depend on unrelated historical files while
# the manifest guards already fail closed on every unaccounted change.
PRETTIER_FILES=()
SHELL_FILES=()
TOML_FILES=()
for path in "${TRACKED_FILES[@]}" "${UNTRACKED_FILES[@]}"; do
  contains_manifest_path "$path" "${FROZEN_FORMAT_DEBT_FILES[@]}" && continue
  case "$path" in
    .env.example)
      require_single_empty_env_placeholder "$path" 'FACTORY_REDIS_PASSWORD' || {
        echo "ERROR: .env.example must document exactly one empty FACTORY_REDIS_PASSWORD placeholder." >&2
        exit 1
      }
      require_single_empty_env_placeholder "$path" 'FACTORY_INTERNAL_WORKER_TOKEN' || {
        echo "ERROR: .env.example must document exactly one empty FACTORY_INTERNAL_WORKER_TOKEN placeholder." >&2
        exit 1
      }
      ;;
    *.js | *.mjs | *.cjs | *.ts | *.tsx | *.json | *.md | *.yaml | *.yml | *.css | *.scss | *.html)
      PRETTIER_FILES+=("$path")
      ;;
    *.sh)
      SHELL_FILES+=("$path")
      ;;
    *.toml)
      TOML_FILES+=("$path")
      ;;
    *.png)
      # Binary acceptance evidence is covered by the manifest and copied
      # verbatim. It must never be passed to Prettier.
      ;;
    *)
      echo "ERROR: manifest file has no formatting policy: $path" >&2
      exit 1
      ;;
  esac
done

[[ ${#PRETTIER_FILES[@]} -gt 0 ]] || {
  echo "ERROR: the T9/D0 manifest produced no Prettier inputs." >&2
  exit 1
}
pnpm exec prettier --check "${PRETTIER_FILES[@]}"
for path in "${SHELL_FILES[@]}"; do
  bash -n "$path"
done
for path in "${TOML_FILES[@]}"; do
  python -c 'import pathlib, sys, tomllib; tomllib.loads(pathlib.Path(sys.argv[1]).read_text(encoding="utf-8"))' "$path"
done
node --test scripts/verify-no-preview-resources.test.mjs
pnpm typecheck
pnpm test
pnpm build

echo "==> [4/7] Fresh Compose stack (no fixture lever)"
PORT_OFFSET=$(( $$ % 1000 ))
PROJECT="factory-t9-$(date +%Y%m%d%H%M%S)-$$"
POSTGRES_PORT=$((26000 + PORT_OFFSET))
REDIS_PORT=$((27000 + PORT_OFFSET))
CONTROL_PLANE_PORT=$((23000 + PORT_OFFSET))
WORKBENCH_PORT=$((25000 + PORT_OFFSET))
CONTROL_PLANE_URL="http://127.0.0.1:${CONTROL_PLANE_PORT}"
WORKBENCH_URL="http://127.0.0.1:${WORKBENCH_PORT}"

compose() {
  FACTORY_FIXTURE_MODE= \
  FACTORY_POSTGRES_PORT="$POSTGRES_PORT" \
  FACTORY_REDIS_PORT="$REDIS_PORT" \
  FACTORY_CONTROL_PLANE_PORT="$CONTROL_PLANE_PORT" \
  FACTORY_WORKBENCH_PORT="$WORKBENCH_PORT" \
  FACTORY_PUBLIC_CONTROL_PLANE_URL="$CONTROL_PLANE_URL" \
  docker compose -p "$PROJECT" --env-file "$ROOT_ENV" -f infra/docker-compose.yml "$@"
}

cleanup() {
  local status=$?
  set +e
  compose down --volumes --remove-orphans
  node scripts/verify-no-preview-resources.mjs || status=1
  local remaining=0
  docker ps --all --filter "label=com.docker.compose.project=$PROJECT" --quiet | grep -q . && remaining=1
  docker network ls --filter "label=com.docker.compose.project=$PROJECT" --quiet | grep -q . && remaining=1
  docker volume ls --filter "label=com.docker.compose.project=$PROJECT" --quiet | grep -q . && remaining=1
  if [[ $remaining -ne 0 ]]; then
    echo "ERROR: isolated acceptance resources remain for $PROJECT" >&2
    status=1
  fi
  set -e
  exit "$status"
}
trap cleanup EXIT

# The unique project and new volumes make the database empty without touching
# any developer `factory-pilot` containers, networks, or volumes.
node scripts/verify-no-preview-resources.mjs
compose up -d --build

echo "==> [5/7] Live Golden Path, material difference, and action inventory on the isolated stack"
FACTORY_E2E_PROMPT_B_ONLY= \
FACTORY_E2E_ISOLATED=1 \
FACTORY_E2E_FACTORY_PROJECT="$PROJECT" \
FACTORY_E2E_BASE_URL="$WORKBENCH_URL" \
FACTORY_E2E_CONTROL_PLANE_URL="$CONTROL_PLANE_URL" \
timeout 3660 pnpm exec playwright test e2e/golden-path.spec.ts --workers=1 --reporter=line
FACTORY_CONTROL_PLANE_URL="$CONTROL_PLANE_URL" \
timeout 120 node scripts/verify-material-difference.mjs
FACTORY_E2E_ISOLATED=1 \
FACTORY_E2E_FACTORY_PROJECT="$PROJECT" \
FACTORY_E2E_BASE_URL="$WORKBENCH_URL" \
FACTORY_E2E_CONTROL_PLANE_URL="$CONTROL_PLANE_URL" \
timeout 600 pnpm exec playwright test e2e/action-inventory.spec.ts --workers=1 --reporter=line

echo "==> [6/7] Evidence regenerated from the clean checkout"
EVIDENCE_MISSING=0
for base in "${EXPECTED_EVIDENCE[@]}"; do
  for size in "${EVIDENCE_SIZES[@]}"; do
    file="$CLEAN/docs/acceptance/evidence/$base-$size.png"
    [[ -f "$file" ]] || {
      echo "ERROR: clean-checkout run did not regenerate $file" >&2
      EVIDENCE_MISSING=1
    }
  done
done
if [[ $EVIDENCE_MISSING -ne 0 ]]; then
  echo "ERROR: acceptance evidence is incomplete." >&2
  exit 1
fi
for path in "${REGENERATED_EVIDENCE_FILES[@]}"; do
  cp "$CLEAN/$path" "$REPO_ROOT/$path"
done
echo "26 acceptance screenshots regenerated by the clean-checkout run and copied back to the repo."

echo "==> [7/7] Cleanup proof"
compose down --volumes --remove-orphans
node scripts/verify-no-preview-resources.mjs
docker ps --all --filter "label=com.docker.compose.project=$PROJECT" --quiet | grep -q . \
  && { echo "ERROR: isolated acceptance containers remain"; exit 1; } || true
docker network ls --filter "label=com.docker.compose.project=$PROJECT" --quiet | grep -q . \
  && { echo "ERROR: isolated acceptance networks remain"; exit 1; } || true
docker volume ls --filter "label=com.docker.compose.project=$PROJECT" --quiet | grep -q . \
  && { echo "ERROR: isolated acceptance volumes remain"; exit 1; } || true
echo "Cleanup proven: no containers, networks, or volumes of the project remain."
echo "CLEAN-CHECKOUT ACCEPTANCE PASSED: $CLEAN"
