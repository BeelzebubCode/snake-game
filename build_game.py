"""
Cross-Platform PyInstaller Automated Build Script for LexiSnake
Supports Windows (.exe), macOS (.app), and Linux standalone builds.
"""

import os
import sys
import platform
import subprocess
import shutil

def build_executable():
    print(f"🚀 Starting LexiSnake Cross-Platform Build on {platform.system()} ({platform.machine()})...")

    # 1. Install / Ensure PyInstaller
    subprocess.run([sys.executable, "-m", "pip", "install", "pyinstaller"], check=True)

    # 2. Determine OS-specific separator for PyInstaller --add-data
    system_name = platform.system()
    sep = ";" if system_name == "Windows" else ":"

    data_param = f"data{sep}data"

    # 3. Build PyInstaller Command Arguments
    cmd = [
        sys.executable, "-m", "PyInstaller",
        "--noconfirm",
        "--clean",
        "--onedir",
        "--windowed",
        "--name", "LexiSnake",
        "--add-data", data_param,
        "main.py"
    ]

    print(f"📦 Executing PyInstaller command: {' '.join(cmd)}")
    result = subprocess.run(cmd)

    if result.returncode == 0:
        dist_path = os.path.abspath("dist/LexiSnake")
        print("\n" + "=" * 60)
        print("🎉 BUILD SUCCESSFUL!")
        print(f"📁 Output Directory: {dist_path}")
        if system_name == "Windows":
            print(f"🎮 Run File: {os.path.join(dist_path, 'LexiSnake.exe')}")
        elif system_name == "Darwin":
            print(f"🎮 Run App: os.path.join('dist', 'LexiSnake.app')")
        else:
            print(f"🎮 Run File: {os.path.join(dist_path, 'LexiSnake')}")
        print("=" * 60 + "\n")
    else:
        print("\n❌ Build Failed! Please check the PyInstaller error logs above.")

if __name__ == "__main__":
    build_executable()
