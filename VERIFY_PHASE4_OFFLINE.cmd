@echo off
setlocal
cd /d "%~dp0"

set "CI=1"

echo [1/6] Verify Phase 4 offline contract
call npm run verify:phase4
if errorlevel 1 exit /b 1

echo [2/6] Verify null-data hotfix guards
call npm run verify:phase4-null-safety
if errorlevel 1 exit /b 1

echo [3/6] Test retry and idempotency policy
call npm run test:offline-policy
if errorlevel 1 exit /b 1

echo [4/6] TypeScript
call npm run typecheck
if errorlevel 1 exit /b 1

echo [5/6] ESLint
call npm run lint
if errorlevel 1 exit /b 1

echo [6/6] Expo dependency alignment
call npx expo install --check
if errorlevel 1 exit /b 1

set "CI="
echo.
echo [OK] Phase 4 local verification passed.
echo [NEXT] Build preview APK 0.5.1 and run the physical-device smoke test.
endlocal
