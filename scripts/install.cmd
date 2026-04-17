@echo off
REM Convenience wrapper so users can double-click to install Memo.
REM Uses -ExecutionPolicy Bypass so a Restricted policy does not block us.

setlocal
set HERE=%~dp0
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%HERE%install.ps1" %*
set EC=%ERRORLEVEL%
if %EC% NEQ 0 (
  echo.
  echo [install.cmd] install.ps1 exited with code %EC%.
  echo Press any key to close this window.
  pause >nul
) else (
  echo.
  echo [install.cmd] Memo installed. Press Start and type "memo" to launch.
  timeout /t 3 >nul
)
endlocal
exit /b %EC%
