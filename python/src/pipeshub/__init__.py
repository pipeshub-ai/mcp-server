"""Launcher for the PipesHub CLI: runs the compiled program shipped in this wheel."""
import os
import shutil
import subprocess
import sys
from importlib.metadata import version
from pathlib import Path


def binary_path():
    exe = Path(__file__).parent / "bin" / ("pipeshub.exe" if sys.platform == "win32" else "pipeshub")
    if not exe.is_file():
        raise SystemExit("pipeshub: the bundled program is missing (%s). Reinstall, or run: npx @pipeshub-ai/standalone" % exe)
    return str(exe)


def launcher_env():
    """Tell the CLI how it was launched, so `init --local` writes an agent config that runs this launcher instead of npx."""
    if "archive-v" in sys.prefix or "environments-v" in sys.prefix:  # shortcut: uv's cache layout; revisit if uv renames it
        return {"PIPESHUB_LAUNCHER": "uvx"}
    script = os.path.realpath(shutil.which(sys.argv[0]) or sys.argv[0]) if sys.argv and sys.argv[0] else ""
    found = shutil.which("pipeshub")
    if not script or not os.path.basename(script).startswith("pipeshub"):
        return {}
    # Bare name when PATH resolves to this install, else the console script's own path (never the binary in site-packages).
    on_path = found is not None and os.path.realpath(found) == script
    return {"PIPESHUB_LAUNCHER": "pip", "PIPESHUB_LAUNCHER_COMMAND": "pipeshub" if on_path else script}


def main(argv=None):
    args = list(sys.argv[1:] if argv is None else argv)
    # The CLI has no --version flag; the wheel version is the npm package's.
    if args == ["--version"]:
        print(version("pipeshub"))
        return 0
    exe = binary_path()
    os.environ.update(launcher_env())
    if sys.platform == "win32":  # no real exec on Windows
        return subprocess.call([exe] + args)
    os.execv(exe, [exe] + args)
