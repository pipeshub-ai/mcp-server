"""Launcher for the PipesHub CLI: runs the compiled program shipped in this wheel."""
import os
import subprocess
import sys
from importlib.metadata import version
from pathlib import Path


def binary_path():
    exe = Path(__file__).parent / "bin" / ("pipeshub.exe" if sys.platform == "win32" else "pipeshub")
    if not exe.is_file():
        raise SystemExit("pipeshub: the bundled program is missing (%s). Reinstall, or run: npx @pipeshub-ai/standalone" % exe)
    return str(exe)


def main(argv=None):
    args = list(sys.argv[1:] if argv is None else argv)
    # The CLI has no --version flag; the wheel version is the npm package's.
    if args == ["--version"]:
        print(version("pipeshub"))
        return 0
    exe = binary_path()
    if sys.platform == "win32":  # no real exec on Windows
        return subprocess.call([exe] + args)
    os.execv(exe, [exe] + args)
