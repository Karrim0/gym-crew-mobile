@echo off
setlocal
cd /d "%~dp0"
set "CI=1"

echo [1/5] Verify Phase 5 product contract
call npm run verify:phase5
if errorlevel 1 exit /b 1

echo [2/5] TypeScript
call npm run typecheck
if errorlevel 1 exit /b 1

echo [3/5] ESLint
call npm run lint
if errorlevel 1 exit /b 1

echo [4/5] Expo dependency alignment
call npx expo install --check
if errorlevel 1 exit /b 1

echo [5/5] Expo public config
call npx expo config --type public > nul
if errorlevel 1 exit /b 1

set "CI="
echo.
echo [OK] Phase 5 local verification passed.
echo [NEXT] Push the branch, wait for the workflow, then build preview APK 0.6.0.
endlocal
