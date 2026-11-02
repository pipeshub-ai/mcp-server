"""Compile the CLI with bun and write one platform wheel per target (stdlib only).

    python3 build_wheels.py [target ...] [--out dist]     # no target = all

Needs `bun` on PATH and the repo's dependencies installed (`bun install`).
"""
import argparse
import base64
import hashlib
import json
import subprocess
import sys
import tomllib  # shortcut: Python 3.11+ to build, not to run; fine while wheels are built in CI
import zipfile
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent

# target -> (bun target, wheel platform tag, executable name)
TARGETS = {
    "linux-x64": ("bun-linux-x64", "manylinux_2_17_x86_64.manylinux2014_x86_64", "pipeshub"),
    "linux-arm64": ("bun-linux-arm64", "manylinux_2_17_aarch64.manylinux2014_aarch64", "pipeshub"),
    "linux-x64-musl": ("bun-linux-x64-musl", "musllinux_1_2_x86_64", "pipeshub"),
    "linux-arm64-musl": ("bun-linux-arm64-musl", "musllinux_1_2_aarch64", "pipeshub"),
    "darwin-arm64": ("bun-darwin-arm64", "macosx_13_0_arm64", "pipeshub"),
    "darwin-x64": ("bun-darwin-x64", "macosx_13_0_x86_64", "pipeshub"),
    "windows-x64": ("bun-windows-x64", "win_amd64", "pipeshub.exe"),
}


def sha(data):
    return "sha256=" + base64.urlsafe_b64encode(hashlib.sha256(data).digest()).rstrip(b"=").decode()


def compile_cli(bun_target, exe, out):
    out.mkdir(parents=True, exist_ok=True)
    path = out / exe
    subprocess.run(["bun", "build", "--compile", "--target=" + bun_target, "src/cli/pipeshub.ts", "--outfile", str(path)], cwd=ROOT, check=True)
    return path


def write_wheel(target, binary, exe, plat, version, out):
    meta = tomllib.loads((HERE / "pyproject.toml").read_text())["project"]
    name = meta["name"]
    dist_info = "%s-%s.dist-info" % (name, version)
    tags = plat.split(".")
    files = {  # path in the wheel -> (bytes, unix mode)
        "pipeshub/__init__.py": ((HERE / "src/pipeshub/__init__.py").read_bytes(), 0o644),
        "pipeshub/bin/" + exe: (binary.read_bytes(), 0o755),
        dist_info + "/licenses/LICENSE": ((ROOT / "LICENSE").read_bytes(), 0o644),
        dist_info + "/entry_points.txt": (b"[console_scripts]\npipeshub = pipeshub:main\n", 0o644),
        dist_info + "/WHEEL": (("Wheel-Version: 1.0\nGenerator: build_wheels.py\nRoot-Is-Purelib: false\n" + "".join("Tag: py3-none-%s\n" % t for t in tags)).encode(), 0o644),
        dist_info + "/METADATA": (("\n".join([
            "Metadata-Version: 2.4", "Name: " + name, "Version: " + version, "Summary: " + meta["description"],
            "Keywords: " + ",".join(meta["keywords"]), "Author: " + meta["authors"][0]["name"], "License: " + meta["license"]["text"],
            "License-File: LICENSE", "Requires-Python: " + meta["requires-python"],
            "Project-URL: Homepage, " + meta["urls"]["Homepage"], "Project-URL: Source, " + meta["urls"]["Source"],
            "Description-Content-Type: text/markdown", "", (HERE / meta["readme"]).read_text()])).encode(), 0o644),
    }
    record = "".join("%s,%s,%d\n" % (p, sha(b), len(b)) for p, (b, _) in files.items()) + dist_info + "/RECORD,,\n"
    files[dist_info + "/RECORD"] = (record.encode(), 0o644)
    wheel = out / ("%s-%s-py3-none-%s.whl" % (name, version, plat))
    with zipfile.ZipFile(wheel, "w", zipfile.ZIP_DEFLATED, compresslevel=9) as z:
        for path, (data, mode) in files.items():
            info = zipfile.ZipInfo(path, (1980, 1, 1, 0, 0, 0))  # fixed date: same inputs, same wheel
            info.external_attr = (0o100000 | mode) << 16
            info.compress_type = zipfile.ZIP_DEFLATED
            z.writestr(info, data)
    return wheel


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("targets", nargs="*", choices=list(TARGETS))
    ap.add_argument("--out", default=str(HERE / "dist"))
    args = ap.parse_args()
    out = Path(args.out)
    version = json.loads((ROOT / "standalone/package.json").read_text())["version"]
    for t in args.targets or TARGETS:
        bun_target, plat, exe = TARGETS[t]
        binary = compile_cli(bun_target, exe, out / "bin" / t)
        wheel = write_wheel(t, binary, exe, plat, version, out)
        print("%s  %.1f MB" % (wheel.name, wheel.stat().st_size / 1e6))


if __name__ == "__main__":
    main()
