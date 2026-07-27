@echo off
setlocal
cd /d "%~dp0"

echo [1/8] Verify OVRLD Phase 8B actual UX contract
call npm run verify:phase8b
if errorlevel 1 exit /b 1

echo [2/8] Test smart set presets
call npm run test:smart-presets
if errorlevel 1 exit /b 1

echo [3/8] Offline regression contracts
call npm run verify:phase4
if errorlevel 1 exit /b 1
call npm run verify:phase4-null-safety
if errorlevel 1 exit /b 1
call npm run test:offline-policy
if errorlevel 1 exit /b 1

echo [4/8] TypeScript
call npm run typecheck
if errorlevel 1 exit /b 1

echo [5/8] ESLint
call npm run lint
if errorlevel 1 exit /b 1

echo [6/8] Expo dependency alignment
call npx expo install --check
if errorlevel 1 exit /b 1

echo [7/8] Expo public config
call npx expo config --type public >nul
if errorlevel 1 exit /b 1

echo [8/8] Git whitespace check
git diff --check
if errorlevel 1 exit /b 1

echo.
echo [OK] Phase 8B OVRLD actual UX rebuild verification passed.
echo [NEXT] Push the branch, inspect GitHub Actions, then build preview APK 1.3.0 (11).
endlocal
