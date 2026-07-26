import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const appRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const repositoryRoot = dirname(dirname(appRoot));
const commit = '7774cd7dcee1e98d0815aa6e829f33a7fc952fdf';
const snapshotRoot = join(repositoryRoot, 'packages', 'vendor', 'shadcn-ui', commit);
const closurePath = join(snapshotRoot, 'console-next-closure.json');
const indexPath = join(snapshotRoot, 'candidate-index.json');
const lockPath = join(appRoot, 'package-lock.json');
const uiRoot = join(appRoot, 'components', 'ui');
const approved = ['accordion', 'alert-dialog', 'badge', 'button', 'card', 'dialog', 'dropdown-menu', 'input', 'label', 'select', 'separator', 'sheet', 'skeleton', 'table', 'tabs', 'textarea', 'sonner', 'tooltip'];

function fail(code) { throw new Error(`console-next-preflight:${code}`); }
function digest(value) { return `sha256:${createHash('sha256').update(value).digest('hex')}`; }
function read(path) { if (!existsSync(path)) fail('missing_file'); return readFileSync(path); }
function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`).join(',')}}`;
  return JSON.stringify(value);
}
function allFiles(path) {
  return readdirSync(path, { withFileTypes: true }).flatMap((entry) => {
    const target = join(path, entry.name);
    return entry.isDirectory() ? allFiles(target) : [target];
  });
}

const indexRaw = read(indexPath);
const index = JSON.parse(indexRaw.toString('utf8'));
const closureRaw = read(closurePath);
const closure = JSON.parse(closureRaw.toString('utf8'));
const lockRaw = read(lockPath);
const lock = JSON.parse(lockRaw.toString('utf8'));

if (index.source_commit !== commit || closure.source_commit !== commit) fail('wrong_commit');
if (Buffer.compare(indexRaw, Buffer.from(`${canonical(index)}\n`)) !== 0) fail('noncanonical_index');
if (Buffer.compare(closureRaw, Buffer.from(`${canonical(closure)}\n`)) !== 0) fail('noncanonical_closure');
if (closure.snapshot_digest !== digest(Buffer.from(`${canonical(index)}\n`))) fail('snapshot_digest');
for (const entry of index.files || []) {
  const target = join(snapshotRoot, entry.path);
  if (!target.startsWith(snapshotRoot) || !statSync(target).isFile() || digest(read(target)) !== entry.sha256) fail('snapshot_file');
}
const packages = Object.entries(lock.packages || {}).flatMap(([location, value]) => location.startsWith('node_modules/') && value?.version && typeof value.integrity === 'string' ? [{ integrity: value.integrity, name: location.slice('node_modules/'.length), version: value.version }] : []).sort((left, right) => left.name.localeCompare(right.name));
if (closure.lockfile?.status !== 'captured' || !packages.length || closure.lockfile.consoleNextLockDigest !== digest(lockRaw) || canonical(closure.lockfile.packages) !== canonical(packages)) fail('lock_closure');
const registry = new Map((index.registry_ui || []).map((item) => [item.name, item]));
if (canonical((closure.primitives || []).map((item) => item.name)) !== canonical(approved)) fail('primitive_set');
for (const primitive of closure.primitives) if (canonical(primitive) !== canonical(registry.get(primitive.name))) fail('primitive_closure');
const transforms = new Map((closure.local_transformations || []).map((item) => [item.name, item]));
if (canonical([...transforms.keys()]) !== canonical(['alert-dialog', 'dialog'])) fail('transform_set');
for (const source of allFiles(uiRoot).filter((path) => path.endsWith('.tsx'))) {
  const name = relative(uiRoot, source).replace(/\.tsx$/, '');
  const primitive = registry.get(name);
  if (!primitive) fail('unexpected_primitive');
  const sourceEntry = primitive.files[0];
  const sourceBytes = read(join(snapshotRoot, sourceEntry.path));
  const transform = transforms.get(name);
  const expected = transform
    ? Buffer.from(sourceBytes.toString('utf8').replace('import { Button } from "@/registry/new-york-v4/ui/button"', 'import { Button } from "@/components/ui/button"'))
    : sourceBytes;
  if (digest(read(source)) !== digest(expected) || (transform && (transform.source_sha256 !== sourceEntry.sha256 || transform.output_sha256 !== digest(expected)))) fail('primitive_digest');
}
if (existsSync(join(appRoot, 'registry'))) fail('unverified_registry_wrapper');
console.log('console-next preflight: PASS');
