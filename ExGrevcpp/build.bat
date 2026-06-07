@echo off
cd /d "%~dp0"
g++ *.cpp -o authentication.exe
if %errorlevel% neq 0 (
    echo Build failed.
    pause
    exit /b %errorlevel%
)
echo Build succeeded: authentication.exe
