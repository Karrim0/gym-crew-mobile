@echo off
setlocal
cd /d "%~dp0"

echo [1/6] Verify OVRLD Phase 7 product contract
call npm run verify:phase7
if errorlevel 1 exit /b 1

echo [2/6] Test click-first smart presets
call npm run test:smart-presets
if errorlevel 1 exit /b 1

echo [3/6] TypeScript
call npm run typecheck
if errorlevel 1 exit /b 1

echo [4/6] ESLint
call npm run lint
if errorlevel 1 exit /b 1

echo [5/6] Expo dependency alignment
call npx expo install --check
if errorlevel 1 exit /b 1

echo [6/6] Expo public config
call npx expo config --type public > nul
if errorlevel 1 exit /b 1

echo.
echo [OK] Phase 7 OVRLD UI rebuild verification passed.
echo [NEXT] Push the branch and inspect the Phase 7 Complete UI Rebuild workflow.
endlocal
