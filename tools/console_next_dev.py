"""Run a founder-owned Console Next dev server in an isolated build directory."""
from __future__ import annotations

import os
import secrets
import shutil
import subprocess
import sys
from pathlib import Path


def unique_dist_dir(pid: int, token_hex=secrets.token_hex) -> str:
    return f'.next-founder-{pid}-{token_hex(4)}'


def remove_owned_dist_dir(console_root: Path, target: Path) -> None:
    root = console_root.resolve()
    candidate = target.resolve()
    if candidate.parent != root or not candidate.name.startswith('.next-founder-'):
        raise ValueError('refusing to remove a non-owned Console output directory')
    if candidate.exists():
        shutil.rmtree(candidate)


def run(command: list[str], console_root: Path) -> int:
    if not command:
        raise ValueError('a Next command is required')
    root = console_root.resolve()
    name = unique_dist_dir(os.getpid())
    target = root / name
    environment = os.environ.copy()
    environment['FACTORY_CONSOLE_DIST_DIR'] = name
    child = subprocess.Popen(command, cwd=root, env=environment)
    try:
        return child.wait()
    finally:
        remove_owned_dist_dir(root, target)


if __name__ == '__main__':
    marker = sys.argv.index('--') if '--' in sys.argv else -1
    if marker < 0:
        raise SystemExit('usage: console_next_dev.py -- <next command>')
    raise SystemExit(run(sys.argv[marker + 1 :], Path(__file__).resolve().parents[1] / 'apps' / 'console-next'))
