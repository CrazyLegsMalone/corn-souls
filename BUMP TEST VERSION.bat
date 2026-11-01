@echo off
title Corn Souls - bump TEST version
cd /d "%~dp0"
where python >nul 2>&1 && (set "PY=python") || (set "PY=py")
%PY% scripts\bump_test_version.py
echo.
echo Next: commit and push, then open TEST on PC / RP6 / RP Nova.
pause
