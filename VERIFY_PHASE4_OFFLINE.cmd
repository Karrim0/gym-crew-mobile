@echo off
setlocal
cd /d "%~dp0"

set "CI=1"

echo [1/5] Verify Phase 4 offline contract
call npm run verify:phase4
if errorlevel 1 exit /b 1

echo [2/5] Test retry and idempotency policy
call npm run test:offline-policy
if errorlevel 1 exit /b 1

echo [3/5] TypeScript
call npm run typecheck
if errorlevel 1 exit /b 1

echo [4/5] ESLint
call npm run lint
if errorlevel 1 exit /b 1

echo [5/5] Expo dependency alignment
call npx expo install --check
if errorlevel 1 exit /b 1

set "CI="
echo.
echo [OK] Phase 4 local verification passed.
echo [NEXT] Push and inspect the Phase 4 Offline Reliability workflow.
endlocal
