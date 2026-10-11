@echo off
rem Install a Wolf launcher into the Windows Start Menu.
setlocal

set "SCRIPT_DIR=%~dp0"
set "PROJECT_ROOT=%SCRIPT_DIR%..\.."

powershell -NoProfile -ExecutionPolicy Bypass -File "%SCRIPT_DIR%WOLF.ps1" %*
if errorlevel 1 (
  echo Wolf launcher install failed.
  exit /b 1
)

echo Wolf launcher installed in the Start Menu.
endlocal
