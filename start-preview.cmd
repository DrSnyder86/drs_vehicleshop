@echo off
setlocal
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0start-preview.ps1" %*
if errorlevel 1 (
  echo.
  echo Could not start the DRS Vehicle Shop preview.
  pause
  exit /b 1
)
