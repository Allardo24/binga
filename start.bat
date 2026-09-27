@echo off
setlocal
title Binga - lokale server
pushd "%~dp0"
if errorlevel 1 exit /b 1

rem Gebruik een gewone Node-installatie, of de beschikbare Codex-runtime.
where node.exe >nul 2>nul
if not errorlevel 1 goto node_ready
if not exist "%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe" goto missing_node
set "PATH=%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin;%PATH%"

:node_ready
if not exist "node_modules\vite\bin\vite.js" goto missing_dependencies
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "scripts\check-start-port.ps1"
if errorlevel 2 goto already_running
if errorlevel 1 goto ports_busy
echo.
echo Binga wordt gebouwd en gestart. De eerste keer kan Rust even moeten bouwen.
echo.
echo Spelers: http://127.0.0.1:5173/
echo Host:     http://127.0.0.1:5173/host
echo Het adres voor je telefoon verschijnt hieronder.
echo Laat dit venster open. Stop de app met Ctrl+C.
echo.

if exist ".tools\package\bin\npm-cli.js" goto local_npm
where npm.cmd >nul 2>nul
if errorlevel 1 goto missing_npm
call npm.cmd run start:local
goto finished

:local_npm
node.exe ".tools\package\bin\npm-cli.js" run web:build
if errorlevel 1 goto failed
node.exe "scripts\start-local.mjs"
goto finished

:missing_node
echo Node.js is niet gevonden. Installeer Node.js 22.12 of nieuwer.
goto failed

:missing_npm
echo npm is niet gevonden. Installeer Node.js inclusief npm.
goto failed

:missing_dependencies
echo De projectafhankelijkheden ontbreken. Voer eerst npm ci uit.
echo Met de lokale npm kan dat via:
echo node .tools/package/bin/npm-cli.js ci
goto failed

:already_running
echo.
echo Binga draait al op http://127.0.0.1:5173/
echo Gebruik op je telefoon het lokale IP-adres van deze computer op poort 5173.
echo Er wordt geen tweede server gestart.
popd
endlocal
exit /b 0

:ports_busy
echo Poort 5173 is al bezet door een ander programma.
echo Stop dat programma en probeer het daarna opnieuw.
goto failed

:finished
if errorlevel 1 goto failed
popd
endlocal
exit /b 0

:failed
echo.
echo Binga kon niet starten. Bekijk de melding hierboven.
pause
popd
endlocal
exit /b 1
