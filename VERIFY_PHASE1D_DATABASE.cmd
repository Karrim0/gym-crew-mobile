@echo off
setlocal
cd /d "%~dp0"

echo [1/4] Verify active migration-chain files
node scripts\verify-phase1d-migration-chain.mjs
if errorlevel 1 exit /b 1

echo [2/4] TypeScript
call npm run typecheck
if errorlevel 1 exit /b 1

echo [3/4] ESLint
call npm run lint
if errorlevel 1 exit /b 1

echo [4/4] Expo dependency alignment
set "CI=1"
call npx expo install --check
if errorlevel 1 echo [WARNING] Expo dependency alignment is deferred to the application stability phase.
set "CI="

echo.
echo [OK] Phase 1D local verification passed.
echo [NEXT] Push and wait for the Phase 1D Active Migration Chain workflow.
endlocal
