@echo off
setlocal
cd /d "%~dp0"
title LexiSnake Windows Builder
echo Building LexiSnake for Windows...
if exist ".venv\Scripts\python.exe" (
    ".venv\Scripts\python.exe" build_game.py --archive
) else (
    py -3 build_game.py --archive
)
if errorlevel 1 (
    echo Build failed. Read the error above.
    pause
    exit /b 1
)
echo Build ready in dist\LexiSnake-Windows-x64.zip on x64 Windows.
pause
