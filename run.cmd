@echo off
REM Memo — convenience launcher for the unpacked build.
REM Run `npm run pack` first to produce release\win-unpacked\Memo.exe.

setlocal
set HERE=%~dp0
set EXE=%HERE%release\win-unpacked\Memo.exe

if not exist "%EXE%" (
  echo [run.cmd] Memo.exe not found at %EXE%
  echo [run.cmd] Build it first:
  echo     npm install
  echo     npm run pack
  exit /b 1
)

start "" "%EXE%"
endlocal
