@echo off
setlocal
cd /d "%~dp0"

echo [1/2] Install OVRLD brand fonts
call npx expo install @expo-google-fonts/alexandria@0.4.2 @expo-google-fonts/inter@0.4.2
if errorlevel 1 exit /b 1

echo [2/2] Verify Expo dependency alignment
call npx expo install --check
if errorlevel 1 exit /b 1

echo.
echo [OK] Phase 7 dependencies are aligned.
endlocal
