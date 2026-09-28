@echo off
setlocal
title Binga - Home Assistant-release
pushd "%~dp0"
if errorlevel 1 exit /b 1

where node.exe >nul 2>nul
if not errorlevel 1 goto node_ready
if not exist "%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe" goto missing_node
set "PATH=%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin;%PATH%"

:node_ready
if not exist "scripts\publish-ha-release.ps1" goto missing_script
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\publish-ha-release.ps1"
set "RELEASE_EXIT_CODE=%ERRORLEVEL%"
echo.
if not "%RELEASE_EXIT_CODE%"=="0" (
  echo Release gestopt. Bekijk hierboven welke stappen al zijn voltooid.
) else (
  echo Publicatiescript afgerond. Zie hierboven of de update nieuw of al gepubliceerd is.
)
pause
popd
exit /b %RELEASE_EXIT_CODE%

:missing_node
echo Node.js is niet gevonden. Installeer Node.js 24 of nieuwer.
goto failed

:missing_script
echo Publicatiescript ontbreekt: scripts\publish-ha-release.ps1

:failed
pause
popd
exit /b 1
