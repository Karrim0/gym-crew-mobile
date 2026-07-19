@echo off
setlocal EnableExtensions EnableDelayedExpansion

set "PROJECT=%~1"
if "%PROJECT%"=="" set "PROJECT=%CD%"
for %%I in ("%PROJECT%") do set "PROJECT=%%~fI"
set "PATCHROOT=%~dp0"
set "SOURCE=%PATCHROOT%files"
set "STAGE=%TEMP%\gym-crew-mobile-v050-stage-%RANDOM%-%RANDOM%"

if not exist "%PROJECT%\package.json" (
  echo [ERROR] package.json was not found in: %PROJECT%
  exit /b 1
)
if not exist "%PROJECT%\src" (
  echo [ERROR] src folder was not found in: %PROJECT%
  exit /b 1
)
if not exist "%SOURCE%\package.json" (
  echo [ERROR] Patch files were not found next to APPLY_PATCH.cmd.
  exit /b 1
)

echo.
echo Applying Gym Crew Mobile v0.5.0 rescue overlay...
echo Project: %PROJECT%

if exist "%STAGE%" rmdir /s /q "%STAGE%"
robocopy "%SOURCE%" "%STAGE%" /MIR /R:2 /W:1 /NFL /NDL /NJH /NJS /NP >nul
if errorlevel 8 (
  echo [ERROR] Could not stage the patch files.
  if exist "%STAGE%" rmdir /s /q "%STAGE%"
  exit /b 1
)

rem Replace the application-owned trees so stale or duplicated files cannot survive.
for %%D in (src android supabase assets docs scripts) do (
  if exist "%PROJECT%\%%D" rmdir /s /q "%PROJECT%\%%D"
)

rem Remove wrappers accidentally extracted into the repository by older patches.
if exist "%PROJECT%\files" rmdir /s /q "%PROJECT%\files"
for %%F in (APPLY_PATCH.cmd VERIFY_PATCH.cmd SQL_TO_RUN_IN_SUPABASE.sql FILES_CHANGED.txt APPLY_AND_TEST.md CHANGELOG_V0.2.0.md QA_REPORT_V0.2.0.md GYM_CREW_MOBILE_CORE_BETA_NOTES.md README-FIRST.txt CHANGELOG_V0.3.0.md QA_REPORT_V0.3.0.md CHANGELOG_V0.4.0.md QA_REPORT_V0.4.0.md) do (
  if exist "%PROJECT%\%%F" del /q "%PROJECT%\%%F"
)

robocopy "%STAGE%" "%PROJECT%" /E /COPY:DAT /DCOPY:DAT /R:2 /W:1 /NFL /NDL /NJH /NJS /NP >nul
if errorlevel 8 (
  echo [ERROR] Could not copy the rescue files into the project.
  if exist "%STAGE%" rmdir /s /q "%STAGE%"
  exit /b 1
)

if exist "%STAGE%" rmdir /s /q "%STAGE%"

pushd "%PROJECT%"
for /f "delims=" %%V in ('node -p "require('./package.json').version" 2^>nul') do set "VERSION=%%V"
popd
if not "!VERSION!"=="0.5.0" (
  echo [ERROR] Patch copy finished, but package version is !VERSION! instead of 0.5.0.
  exit /b 1
)

if exist "%PROJECT%\files" (
  echo [ERROR] A files folder still exists inside the project.
  exit /b 1
)

echo.
echo [OK] Rescue files copied successfully.
echo [OK] .git, .env.local and node_modules were preserved.
echo Next: npm ci, run SQL_TO_RUN_IN_SUPABASE.sql, then VERIFY_PATCH.cmd.
exit /b 0
