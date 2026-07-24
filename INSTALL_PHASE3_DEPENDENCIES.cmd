@echo off
setlocal
cd /d "%~dp0"

echo [1/2] Install Expo SDK 57 compatibility patches
call npx expo install "expo@~57.0.8" "expo-asset@~57.0.7" "expo-audio@~57.0.3" "expo-constants@~57.0.7" "expo-dev-client@~57.0.9" "expo-linking@~57.0.4" "expo-notifications@~57.0.7" "expo-router@~57.0.8" "expo-splash-screen@~57.0.5" "expo-web-browser@~57.0.2" "react-native-screens@~4.26.0"
if errorlevel 1 exit /b 1

echo [2/2] Confirm Expo dependency alignment
call npx expo install --check
if errorlevel 1 exit /b 1

echo.
echo [OK] Phase 3 dependencies are aligned.
endlocal
