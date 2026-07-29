@echo off
setlocal
cd /d "%~dp0"

echo [1/5] Verify Phase 3 bootstrap and connectivity contract
node scripts\verify-phase3-bootstrap.mjs
if errorlevel 1 exit /b 1

echo [2/5] TypeScript
call npm run typecheck
if errorlevel 1 exit /b 1

echo [3/5] ESLint
call npm run lint
if errorlevel 1 exit /b 1

echo [4/5] Expo dependency alignment
set "CI=1"
call npx expo install --check
if errorlevel 1 exit /b 1
set "CI="

echo [5/5] Expo public config
call npx expo config --type public > nul
if errorlevel 1 exit /b 1

echo.
echo [OK] Phase 3 local verification passed.
echo [NEXT] Commit package-lock.json with the Phase 3 files and push the branch.
endlocal
