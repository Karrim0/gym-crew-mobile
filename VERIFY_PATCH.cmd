@echo off
setlocal EnableExtensions EnableDelayedExpansion
set "PROJECT=%~1"
if "%PROJECT%"=="" set "PROJECT=%CD%"
for %%I in ("%PROJECT%") do set "PROJECT=%%~fI"

if not exist "%PROJECT%\package.json" (
  echo [ERROR] package.json was not found in: %PROJECT%
  exit /b 1
)
if exist "%PROJECT%\files" (
  echo [ERROR] Delete the accidental files folder before checking the project.
  exit /b 1
)

cd /d "%PROJECT%"
for /f "delims=" %%V in ('node -p "require('./package.json').version"') do set "VERSION=%%V"
if not "!VERSION!"=="0.5.0" (
  echo [ERROR] Expected version 0.5.0, found !VERSION!.
  exit /b 1
)

echo [1/5] Installing locked dependencies...
call npm ci
if errorlevel 1 exit /b 1

echo [2/5] Running TypeScript and ESLint...
call npm run check
if errorlevel 1 exit /b 1

echo [3/5] Checking Expo dependency versions...
call npx expo install --check
if errorlevel 1 exit /b 1

echo [4/5] Resolving public Expo config...
call npx expo config --type public
if errorlevel 1 exit /b 1

echo [5/5] Verifying native release identity...
findstr /C:"versionCode 5" "android\app\build.gradle" >nul
if errorlevel 1 (
  echo [ERROR] Android versionCode 5 was not found.
  exit /b 1
)
findstr /C:"versionName \"0.5.0\"" "android\app\build.gradle" >nul
if errorlevel 1 (
  echo [ERROR] Android versionName 0.5.0 was not found.
  exit /b 1
)

echo.
echo [OK] Gym Crew Mobile v0.5.0 static checks passed.
echo Device, Supabase, offline airplane-mode and notification tests are still required.
exit /b 0
