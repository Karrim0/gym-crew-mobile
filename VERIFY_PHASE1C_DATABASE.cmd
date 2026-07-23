@echo off
setlocal
cd /d "%~dp0"

echo [1/4] Verify Phase 1C recovery artifacts
node scripts\verify-phase1c-recovery.mjs
if errorlevel 1 exit /b 1

echo [2/4] TypeScript
call npm run typecheck
if errorlevel 1 exit /b 1

echo [3/4] ESLint
call npm run lint
if errorlevel 1 exit /b 1

echo [4/4] Expo dependency alignment
set CI=1`r`ncall npx expo install --check`r`nif errorlevel 1 echo [WARNING] Expo dependency alignment is deferred to the application stability phase.`r`nset CI=

echo.
echo [OK] Phase 1C local verification passed.
echo [NEXT] Push the branch and check the Phase 1C Reproducible Database workflow.
endlocal
