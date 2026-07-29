@echo off
setlocal
cd /d "%~dp0"

echo [1/7] Verify OVRLD Phase 8 product contract
call npm run verify:phase8
if errorlevel 1 exit /b 1

echo [2/7] Test smart set presets
call npm run test:smart-presets
if errorlevel 1 exit /b 1

echo [3/7] Offline regression contracts
call npm run verify:phase4
if errorlevel 1 exit /b 1
call npm run verify:phase4-null-safety
if errorlevel 1 exit /b 1
call npm run test:offline-policy
if errorlevel 1 exit /b 1

echo [4/7] TypeScript
call npm run typecheck
if errorlevel 1 exit /b 1

echo [5/7] ESLint
call npm run lint
if errorlevel 1 exit /b 1

echo [6/7] Expo dependency alignment
call npx expo install --check
if errorlevel 1 exit /b 1

echo [7/7] Expo public config
call npx expo config --type public > nul
if errorlevel 1 exit /b 1

echo.
echo [OK] Phase 8 OVRLD product experience verification passed.
echo [NEXT] Push the branch, inspect GitHub Actions, then build preview APK 1.2.0 (10).
endlocal
