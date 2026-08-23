@echo off
setlocal
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0stop-preview.ps1" %*
if errorlevel 1 (
  echo.
  echo Could not stop the DRS Vehicle Shop preview safely.
  pause
  exit /b 1
)
