@echo off
title Corn Souls - promote TEST to LIVE
cd /d "%~dp0"
echo Current LIVE version:
type version.json
echo.
set "VER="
set /p "VER=Enter the NEW LIVE version (e.g. 1.99): "
if not defined VER goto :cancel
where python >nul 2>&1 && (set "PY=python") || (set "PY=py")
%PY% scripts\sync_test_to_live.py --live-version %VER%
echo.
pause
exit /b
:cancel
echo Cancelled - nothing changed.
pause
