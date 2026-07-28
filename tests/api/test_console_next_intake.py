from __future__ import annotations

import hashlib
import json
import shutil
import socket
import subprocess
import tempfile
import unittest
from pathlib import Path
from unittest import mock

from tools.console_next_intake import (
    LOCAL_PRIMITIVE_TRANSFORMS,
    MIT_LICENSE_BYTES,
    SnapshotError,
    canonical_json_bytes,
    main,
    repository_path,
    verify_console_next_preflight,
    verify_snapshot,
    verify_console_next_closure,
    write_console_next_closure,
    write_candidate_index,
)


COMMIT = "1" * 40
PINNED_COMMIT = "7774cd7dcee1e98d0815aa6e829f33a7fc952fdf"
VENDORED_SNAPSHOT = Path(__file__).resolve().parents[2] / "packages" / "vendor" / "shadcn-ui" / PINNED_COMMIT
CONSOLE_ROOT = Path(__file__).resolve().parents[2] / "apps" / "console-next"
CONSOLE_LOCKFILE = CONSOLE_ROOT / "package-lock.json"


class ConsoleNextIntakeTests(unittest.TestCase):
    def test_repository_relative_preflight_paths_ignore_the_caller_working_directory(self) -> None:
        repository = Path(__file__).resolve().parents[2]
        self.assertEqual(repository / "apps" / "console-next", repository_path("apps/console-next"))
        self.assertEqual(repository / "packages" / "vendor", repository_path("packages/vendor"))

    def _local_console(self, directory: Path) -> Path:
        """Create a minimal local primitive tree from the approved source closure."""
        root = directory / "console-next"
        ui = root / "components" / "ui"
        ui.mkdir(parents=True)
        closure = json.loads((VENDORED_SNAPSHOT / "console-next-closure.json").read_text(encoding="utf-8"))
        transforms = {item["name"]: item for item in closure["local_transformations"]}
        for primitive in closure["primitives"]:
            name = primitive["name"]
            source = VENDORED_SNAPSHOT / primitive["files"][0]["path"]
            content = source.read_bytes()
            if name in transforms:
                source_import, local_import = LOCAL_PRIMITIVE_TRANSFORMS[name]
                content = content.decode("utf-8").replace(source_import, local_import).encode("utf-8")
            (ui / f"{name}.tsx").write_bytes(content)
        return root

    def _snapshot(self) -> tuple[tempfile.TemporaryDirectory[str], Path]:
        temporary = tempfile.TemporaryDirectory()
        root = Path(temporary.name) / "snapshot"
        (root / "registry" / "ui").mkdir(parents=True)
        (root / "SOURCE_COMMIT").write_text(COMMIT + "\n", encoding="ascii")
        (root / ".gitattributes").write_text("* whitespace=-trailing-space\n", encoding="ascii")
        (root / "LICENSE.md").write_bytes(MIT_LICENSE_BYTES)
        (root / "registry" / "ui" / "button.tsx").write_text("export const Button = () => null\n", encoding="utf-8")
        (root / "registry" / "button.json").write_bytes(canonical_json_bytes({
            "name": "button",
            "type": "registry:ui",
            "dependencies": ["@radix-ui/react-slot"],
            "registryDependencies": ["utils"],
            "files": [{"path": "registry/ui/button.tsx", "type": "registry:ui"}],
        }) + b"\n")
        return temporary, root

    def _assert_code(self, root: Path, code: str, expected_commit: str = COMMIT) -> None:
        with self.assertRaises(SnapshotError) as captured:
            verify_snapshot(root, expected_commit)
        self.assertEqual(code, captured.exception.code)

    def test_indexes_a_complete_local_snapshot_canonically(self) -> None:
        temporary, root = self._snapshot()
        self.addCleanup(temporary.cleanup)

        index = verify_snapshot(root, COMMIT)

        self.assertEqual(COMMIT, index.commit)
        self.assertEqual([".gitattributes", "LICENSE.md", "registry/button.json", "registry/ui/button.tsx"], [item.path for item in index.files])
        self.assertEqual("button", index.registry_ui[0].name)
        self.assertEqual(("@radix-ui/react-slot",), index.registry_ui[0].dependencies)
        self.assertEqual(canonical_json_bytes(index.as_dict()) + b"\n", index.canonical_bytes())

    def test_rejects_missing_license(self) -> None:
        temporary, root = self._snapshot()
        self.addCleanup(temporary.cleanup)
        (root / "LICENSE.md").unlink()
        self._assert_code(root, "missing_license")

    def test_rejects_symlink_as_a_non_regular_file(self) -> None:
        temporary, root = self._snapshot()
        self.addCleanup(temporary.cleanup)
        target = root / "registry" / "ui" / "button.tsx"
        target.unlink()
        try:
            target.symlink_to(root / "LICENSE.md")
        except OSError:
            target.write_text("export const Button = () => null\n", encoding="utf-8")
            original = Path.is_symlink
            with mock.patch.object(Path, "is_symlink", autospec=True, side_effect=lambda path: path == target or original(path)):
                self._assert_code(root, "non_regular_file")
        else:
            self._assert_code(root, "non_regular_file")

    def test_rejects_a_registry_file_path_that_escapes_the_snapshot(self) -> None:
        temporary, root = self._snapshot()
        self.addCleanup(temporary.cleanup)
        item = root / "registry" / "button.json"
        value = json.loads(item.read_text(encoding="utf-8"))
        value["files"][0]["path"] = "../outside.tsx"
        item.write_bytes(canonical_json_bytes(value) + b"\n")
        self._assert_code(root, "path_escape")

    def test_rejects_a_changed_commit_marker(self) -> None:
        temporary, root = self._snapshot()
        self.addCleanup(temporary.cleanup)
        (root / "SOURCE_COMMIT").write_text("0" * 40 + "\n", encoding="ascii")
        self._assert_code(root, "wrong_commit")

    def test_rejects_a_registry_ui_item_missing_from_the_candidate_index(self) -> None:
        temporary, root = self._snapshot()
        self.addCleanup(temporary.cleanup)
        index = verify_snapshot(root, COMMIT)
        candidate = index.as_dict()
        candidate["registry_ui"] = []
        (root / "candidate-index.json").write_bytes(canonical_json_bytes(candidate) + b"\n")
        self._assert_code(root, "incomplete_registry_index")

    def test_writes_and_reverifies_the_candidate_index_without_network_or_shell_calls(self) -> None:
        temporary, root = self._snapshot()
        self.addCleanup(temporary.cleanup)
        index = verify_snapshot(root, COMMIT)
        write_candidate_index(root, index)

        with (
            mock.patch.object(socket, "create_connection", side_effect=AssertionError("network forbidden")),
            mock.patch.object(subprocess, "run", side_effect=AssertionError("shell forbidden")),
            mock.patch("urllib.request.urlopen", side_effect=AssertionError("url opening forbidden")),
        ):
            verified = verify_snapshot(root, COMMIT)
        self.assertEqual(index.digest, verified.digest)
        self.assertEqual(hashlib.sha256((root / "candidate-index.json").read_bytes()).hexdigest(), hashlib.sha256(verified.canonical_bytes()).hexdigest())

    def test_rejects_a_tampered_pinned_snapshot_even_after_its_index_is_regenerated(self) -> None:
        temporary = tempfile.TemporaryDirectory()
        self.addCleanup(temporary.cleanup)
        root = Path(temporary.name) / "snapshot"
        shutil.copytree(VENDORED_SNAPSHOT, root)
        readme = root / "README.md"
        readme.write_bytes(readme.read_bytes() + b"\nunauthorized modification\n")
        candidate_path = root / "candidate-index.json"
        candidate = json.loads(candidate_path.read_text(encoding="utf-8"))
        for entry in candidate["files"]:
            if entry["path"] == "README.md":
                entry["sha256"] = "sha256:" + hashlib.sha256(readme.read_bytes()).hexdigest()
                break
        else:
            self.fail("candidate snapshot did not index README.md")
        candidate_path.write_bytes(canonical_json_bytes(candidate) + b"\n")

        with self.assertRaises(SnapshotError) as captured:
            verify_console_next_preflight(root, PINNED_COMMIT, CONSOLE_LOCKFILE, CONSOLE_ROOT)
        self.assertEqual("snapshot_digest_mismatch", captured.exception.code)

    def test_rejects_a_missing_unused_local_primitive(self) -> None:
        temporary = tempfile.TemporaryDirectory()
        self.addCleanup(temporary.cleanup)
        local_console = self._local_console(Path(temporary.name))

        with (
            mock.patch.object(socket, "create_connection", side_effect=AssertionError("network forbidden")),
            mock.patch.object(subprocess, "run", side_effect=AssertionError("shell forbidden")),
            mock.patch("urllib.request.urlopen", side_effect=AssertionError("url opening forbidden")),
        ):
            verify_console_next_preflight(VENDORED_SNAPSHOT, PINNED_COMMIT, CONSOLE_LOCKFILE, local_console)
        (local_console / "components" / "ui" / "tooltip.tsx").unlink()

        with self.assertRaises(SnapshotError) as captured:
            verify_console_next_preflight(VENDORED_SNAPSHOT, PINNED_COMMIT, CONSOLE_LOCKFILE, local_console)
        self.assertEqual("missing_local_primitive", captured.exception.code)

    def test_rejects_pending_empty_and_mismatched_console_next_closures(self) -> None:
        temporary = tempfile.TemporaryDirectory()
        self.addCleanup(temporary.cleanup)
        root = Path(temporary.name) / "snapshot"
        shutil.copytree(VENDORED_SNAPSHOT, root)
        index = verify_snapshot(root, PINNED_COMMIT)
        lockfile = Path(temporary.name) / "package-lock.json"
        lockfile.write_bytes(canonical_json_bytes({
            "lockfileVersion": 3,
            "packages": {"node_modules/example": {"version": "1.0.0", "integrity": "sha512-example"}},
        }) + b"\n")
        write_console_next_closure(root, index)
        with self.assertRaises(SnapshotError) as pending:
            verify_console_next_closure(root, PINNED_COMMIT, lockfile)
        self.assertEqual("pending_closure", pending.exception.code)

        write_console_next_closure(root, index, lockfile)
        closure_path = root / "console-next-closure.json"
        closure = json.loads(closure_path.read_text(encoding="utf-8"))
        closure["lockfile"]["packages"] = []
        closure_path.write_bytes(canonical_json_bytes(closure) + b"\n")
        with self.assertRaises(SnapshotError) as empty:
            verify_console_next_closure(root, PINNED_COMMIT, lockfile)
        self.assertEqual("closure_mismatch", empty.exception.code)

        write_console_next_closure(root, index, lockfile)
        lockfile.write_bytes(lockfile.read_bytes() + b" ")
        with self.assertRaises(SnapshotError) as mismatch:
            verify_console_next_closure(root, PINNED_COMMIT, lockfile)
        self.assertEqual("closure_mismatch", mismatch.exception.code)

    def test_capture_command_writes_canonical_closure(self) -> None:
        temporary = tempfile.TemporaryDirectory()
        self.addCleanup(temporary.cleanup)
        root = Path(temporary.name) / "snapshot"
        shutil.copytree(VENDORED_SNAPSHOT, root)
        lockfile = Path(temporary.name) / "package-lock.json"
        lockfile.write_bytes(canonical_json_bytes({
            "lockfileVersion": 3,
            "packages": {"node_modules/example": {"version": "1.0.0", "integrity": "sha512-example"}},
        }) + b"\n")
        (root / "console-next-closure.json").unlink()

        status = main([
            "capture-console-next",
            "--snapshot", str(root),
            "--lockfile", str(lockfile),
        ])

        self.assertEqual(0, status)
        closure = json.loads((root / "console-next-closure.json").read_text(encoding="utf-8"))
        self.assertEqual("captured", closure["lockfile"]["status"])
        self.assertEqual("example", closure["lockfile"]["packages"][0]["name"])


if __name__ == "__main__":
    unittest.main()
