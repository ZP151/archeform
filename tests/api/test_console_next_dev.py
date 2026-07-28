from __future__ import annotations

import tempfile
import unittest
from pathlib import Path

from tools.console_next_dev import remove_owned_dist_dir, unique_dist_dir


class ConsoleNextDevTests(unittest.TestCase):
    def test_generates_a_nonce_bearing_founder_directory(self) -> None:
        self.assertEqual('.next-founder-1234-a1b2c3d4', unique_dist_dir(1234, token_hex=lambda _: 'a1b2c3d4'))

    def test_refuses_to_remove_a_path_outside_console_root(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary) / 'console-next'
            root.mkdir()
            with self.assertRaises(ValueError):
                remove_owned_dist_dir(root, root.parent / '.next-founder-1-a1')

    def test_removes_only_its_owned_directory(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary) / 'console-next'
            target = root / '.next-founder-12-a1'
            target.mkdir(parents=True)
            (target / 'marker').write_text('owned', encoding='utf-8')
            remove_owned_dist_dir(root, target)
            self.assertFalse(target.exists())


if __name__ == '__main__':
    unittest.main()
