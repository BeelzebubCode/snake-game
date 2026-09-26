"""Build and validate native LexiSnake bundles on Windows, macOS and Linux."""

import argparse
import platform
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
RUNTIME_ASSETS = (
    "data/cefr_dictionary.json",
    "data/en_th.json",
    "data/ui_theme.json",
    "data/fonts/NotoSansThai-Regular.ttf",
    "data/fonts/NotoSansThai-Bold.ttf",
    "data/fonts/ChakraPetch-Bold.ttf",
)


def build_executable(
    onefile=False, skip_install=False, archive=False, output_dir=None, work_dir=None
):
    system = platform.system()
    if system not in ("Windows", "Darwin", "Linux"):
        raise RuntimeError(f"Unsupported build platform: {system}")
    output_dir = Path(output_dir or ROOT / "dist").resolve()
    work_dir = Path(work_dir or ROOT / "build").resolve()
    work_dir.mkdir(parents=True, exist_ok=True)

    for asset in RUNTIME_ASSETS:
        if not (ROOT / asset).is_file():
            raise FileNotFoundError(f"Missing runtime asset: {asset}")

    if not skip_install:
        subprocess.run(
            [
                sys.executable,
                "-m",
                "pip",
                "install",
                "-r",
                str(ROOT / "requirements.txt"),
                "-r",
                str(ROOT / "requirements-build.txt"),
            ],
            check=True,
            cwd=ROOT,
        )

    separator = ";" if system == "Windows" else ":"
    command = [
        sys.executable,
        "-m",
        "PyInstaller",
        "--noconfirm",
        "--onefile" if onefile else "--onedir",
        "--windowed",
        "--name",
        "LexiSnake",
        "--distpath",
        str(output_dir),
        "--workpath",
        str(work_dir),
        "--specpath",
        str(work_dir),
        "--add-data",
        f"{ROOT / 'data'}{separator}data",
        "--collect-data",
        "pygame_gui",
        "--collect-all",
        "i18n",
        str(ROOT / "main.py"),
    ]
    print(f"Building LexiSnake for {system} ({platform.machine()})...", flush=True)
    subprocess.run(command, check=True, cwd=ROOT)

    if system == "Darwin":
        bundle = output_dir / "LexiSnake.app"
        executable = bundle / "Contents/MacOS/LexiSnake"
        asset_root = bundle / "Contents/Resources"
        if not (bundle / "Contents/Info.plist").is_file():
            raise FileNotFoundError("The macOS app bundle is incomplete")
    else:
        bundle = output_dir / (
            "LexiSnake.exe" if system == "Windows" and onefile else "LexiSnake"
        )
        executable = (
            bundle
            if onefile
            else bundle / ("LexiSnake.exe" if system == "Windows" else "LexiSnake")
        )
        asset_root = bundle / "_internal"

    if not executable.is_file():
        raise FileNotFoundError(f"Build did not produce the executable: {executable}")
    if not onefile:
        for asset in RUNTIME_ASSETS:
            if not (asset_root / asset).is_file():
                raise FileNotFoundError(f"Bundle is missing a runtime asset: {asset}")

    print(f"Validated executable: {executable}", flush=True)
    if archive:
        machine = platform.machine().lower()
        architecture = {"amd64": "x64", "x86_64": "x64", "aarch64": "arm64"}.get(
            machine, machine
        )
        platform_name = {"Darwin": "macOS", "Windows": "Windows", "Linux": "Linux"}[
            system
        ]
        archive_base = output_dir / f"LexiSnake-{platform_name}-{architecture}"
        if system == "Darwin":
            archive_path = archive_base.with_suffix(".zip")
            # Preserve app symlinks and executable permissions.
            subprocess.run(
                [
                    "ditto",
                    "-c",
                    "-k",
                    "--sequesterRsrc",
                    "--keepParent",
                    str(bundle),
                    str(archive_path),
                ],
                check=True,
            )
        else:
            archive_path = shutil.make_archive(
                str(archive_base),
                "zip" if system == "Windows" else "gztar",
                root_dir=output_dir,
                base_dir=bundle.name,
            )
        print(f"Download archive: {archive_path}", flush=True)
    return executable


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--onefile",
        action="store_true",
        help="Build a single executable instead of a folder",
    )
    parser.add_argument(
        "--skip-install",
        action="store_true",
        help="Use dependencies already installed in this interpreter",
    )
    parser.add_argument(
        "--archive",
        action="store_true",
        help="Package the bundle as a native download archive",
    )
    parser.add_argument("--output-dir", type=Path, help="Default: project dist/")
    parser.add_argument("--work-dir", type=Path, help="Default: project build/")
    args = parser.parse_args()
    try:
        build_executable(**vars(args))
    except (OSError, RuntimeError, subprocess.CalledProcessError) as error:
        print(f"Build failed: {error}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
