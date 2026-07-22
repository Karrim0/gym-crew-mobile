@echo off
setlocal
cd /d "%~dp0"

echo [1/4] Verify captured database baseline
node scripts\verify-phase1a-database.mjs
if errorlevel 1 exit /b 1

echo [2/4] TypeScript
call npm run typecheck
if errorlevel 1 exit /b 1

echo [3/4] ESLint
call npm run lint
if errorlevel 1 exit /b 1

echo [4/4] Expo dependency alignment
call npx expo install --check
if errorlevel 1 exit /b 1

echo.
echo [OK] Phase 1A verification passed.
endlocal
