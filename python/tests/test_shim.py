import os
import stat
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path
from unittest import mock

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))
import pipeshub  # noqa: E402


class Shim(unittest.TestCase):
    def setUp(self):
        # A fake package dir whose bin/ holds a stand-in "CLI" that echoes its arguments and exits with a chosen code.
        self.dir = Path(tempfile.mkdtemp())
        (self.dir / "bin").mkdir()
        if sys.platform == "win32":
            self.exe = self.dir / "bin" / "pipeshub.exe"
            self.exe.write_bytes(b"")  # only its path is checked on Windows
        else:
            self.exe = self.dir / "bin" / "pipeshub"
            self.exe.write_text('#!/bin/sh\necho "args:$*"\nexit "${PS_EXIT:-0}"\n')
            self.exe.chmod(self.exe.stat().st_mode | stat.S_IXUSR)
        patch = mock.patch.object(pipeshub, "__file__", str(self.dir / "__init__.py"))
        patch.start()
        self.addCleanup(patch.stop)

    def test_binary_is_found_next_to_the_package(self):
        self.assertEqual(pipeshub.binary_path(), str(self.exe))

    def test_missing_binary_is_an_error_not_a_traceback(self):
        self.exe.unlink()
        with self.assertRaises(SystemExit) as cm:
            pipeshub.binary_path()
        self.assertIn("missing", str(cm.exception))

    @unittest.skipIf(sys.platform == "win32", "uses a shell script as the stand-in CLI")
    def test_arguments_and_exit_code_pass_through(self):
        # execv replaces the process, so run the shim in a child.
        code = "import sys, pipeshub; pipeshub.__file__ = %r; pipeshub.main(['init', '--dry-run', 'a b'])" % str(self.dir / "__init__.py")
        env = dict(os.environ, PS_EXIT="7", PYTHONPATH=str(Path(__file__).resolve().parents[1] / "src"))
        r = subprocess.run([sys.executable, "-c", code], env=env, capture_output=True, text=True)
        self.assertEqual(r.returncode, 7)
        self.assertEqual(r.stdout.strip(), "args:init --dry-run a b")

    def test_launcher_env_names_this_install(self):
        with mock.patch.object(sys, "prefix", "/c/uv/archive-v0/abc"):
            self.assertEqual(pipeshub.launcher_env(), {"PIPESHUB_LAUNCHER": "uvx"})
        script = str(self.dir / "bin" / "pipeshub")
        with mock.patch.object(sys, "prefix", "/venv"), mock.patch.object(sys, "argv", [script]):
            with mock.patch("shutil.which", return_value=script):
                self.assertEqual(pipeshub.launcher_env(), {"PIPESHUB_LAUNCHER": "pip", "PIPESHUB_LAUNCHER_COMMAND": "pipeshub"})
            with mock.patch("shutil.which", side_effect=lambda n: None if n == "pipeshub" else script):
                self.assertEqual(pipeshub.launcher_env()["PIPESHUB_LAUNCHER_COMMAND"], os.path.realpath(script))


if __name__ == "__main__":
    unittest.main()
