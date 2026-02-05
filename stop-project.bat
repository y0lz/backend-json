@echo off
chcp 65001 >nul
title Taxi Management - Stop Services

echo ========================================
echo    ОСТАНОВКА TAXI MANAGEMENT SYSTEM
echo ========================================
echo.

echo 🛑 Остановка всех Node.js процессов...

:: Остановка всех процессов Node.js
taskkill /f /im node.exe >nul 2>&1
taskkill /f /im nodemon.exe >nul 2>&1

:: Освобождение портов
netstat -ano | findstr :8848 >nul 2>&1
if not errorlevel 1 (
    echo 🔧 Освобождение порта 8848...
    for /f "tokens=5" %%a in ('netstat -ano ^| findstr :8848') do taskkill /f /pid %%a >nul 2>&1
)

netstat -ano | findstr :8847 >nul 2>&1
if not errorlevel 1 (
    echo 🌐 Освобождение порта 8847...
    for /f "tokens=5" %%a in ('netstat -ano ^| findstr :8847') do taskkill /f /pid %%a >nul 2>&1
)

echo.
echo ✅ Все сервисы остановлены!
echo 🧹 Порты освобождены!
echo.
pause