@echo off
REM Wrapper script to run PowerShell setup script
powershell.exe -ExecutionPolicy Bypass -File "%~dp0setup-electron-windows.ps1"
if errorlevel 1 exit /b 1
