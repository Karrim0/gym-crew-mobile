@echo off
setlocal
cd /d "%~dp0"

echo [1/7] Node and npm
node --version || exit /b 1
npm --version || exit /b 1

echo [2/7] Install locked dependencies
call npm ci || exit /b 1

echo [3/7] Phase 0 source audit
call npm run audit:baseline || exit /b 1

echo [4/7] Phase 0 safety verification
call npm run verify:phase0 || exit /b 1

echo [5/7] TypeScript
call npm run typecheck || exit /b 1

echo [6/7] ESLint
call npm run lint || exit /b 1

echo [7/7] Expo dependency compatibility
call npx expo install --check || exit /b 1

echo.
echo [OK] Phase 0 verification completed.
endlocal
