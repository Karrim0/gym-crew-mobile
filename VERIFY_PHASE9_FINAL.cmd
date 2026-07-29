@echo off
setlocal
cd /d "%~dp0"

echo [1/9] Verify OVRLD Phase 9 final product contract
call npm run verify:phase9
if errorlevel 1 exit /b 1

echo [2/9] Test smart set recommendations
call npm run test:smart-presets
if errorlevel 1 exit /b 1

echo [3/9] Verify offline contracts
call npm run verify:phase4
if errorlevel 1 exit /b 1
call npm run verify:phase4-null-safety
if errorlevel 1 exit /b 1
call npm run test:offline-policy
if errorlevel 1 exit /b 1

echo [4/9] TypeScript
call npm run typecheck
if errorlevel 1 exit /b 1

echo [5/9] ESLint
call npm run lint
if errorlevel 1 exit /b 1

echo [6/9] Expo dependency alignment
call npx expo install --check
if errorlevel 1 exit /b 1

echo [7/9] Expo public config
call npx expo config --type public >nul
if errorlevel 1 exit /b 1

echo [8/9] Android JavaScript export
if exist dist\phase9-android rmdir /s /q dist\phase9-android
call npx expo export --platform android --output-dir dist\phase9-android
if errorlevel 1 exit /b 1

echo [9/9] Git whitespace check
call git diff --check
if errorlevel 1 exit /b 1

echo.
echo [OK] OVRLD Phase 9 final product verification passed.
echo [NEXT] Run the preview build and complete physical-device visual and offline QA.
endlocal
