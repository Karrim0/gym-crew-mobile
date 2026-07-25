@echo off
setlocal
cd /d "%~dp0"

where node >nul 2>nul || (
  echo [ERROR] Node.js is not available in PATH.
  exit /b 1
)

if not exist node_modules (
  echo [ERROR] node_modules is missing. Run npm ci first.
  exit /b 1
)

echo [1/8] Verify Phase 6 release contract
call npm run verify:phase6 || exit /b 1

echo [2/8] Test release policy
call npm run test:release-policy || exit /b 1

echo [3/8] Re-run offline reliability contracts
call npm run verify:phase4 || exit /b 1
call npm run verify:phase4-null-safety || exit /b 1
call npm run test:offline-policy || exit /b 1

echo [4/8] Re-run product experience contract
call npm run verify:phase5 || exit /b 1

echo [5/8] TypeScript
call npm run typecheck || exit /b 1

echo [6/8] ESLint
call npm run lint || exit /b 1

echo [7/8] Expo dependency alignment
call npx expo install --check || exit /b 1

echo [8/8] Expo public config
call npx expo config --type public >nul || exit /b 1

echo.
echo [OK] Phase 6 release candidate verification passed.
echo [NEXT] Push the branch, wait for the Phase 6 workflow, then build preview APK 1.0.0 ^(8^).
endlocal
