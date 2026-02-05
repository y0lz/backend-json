@echo off
chcp 65001 >nul
title Taxi Management System - Simple Start

echo ========================================
echo   TAXI SYSTEM - ПРОСТОЙ ЗАПУСК
echo ========================================

:: Остановка предыдущих процессов
taskkill /f /im node.exe >nul 2>&1

:: Создание папки для логов
if not exist "logs" mkdir logs

echo.
echo 🔧 Запуск бэкенда...
cd backend-json
start "Backend" cmd /k "npm start"
cd ..

echo 🕐 Ждем 8 секунд...
timeout /t 8 /nobreak >nul

echo 🌐 Запуск фронтенда...
cd client  
start "Frontend" cmd /k "npm run dev"
cd ..

echo.
echo ========================================
echo ✅ Запуск завершен!
echo ========================================
echo.
echo 🌐 Бэкенд: http://localhost:8848
echo 🌐 Фронтенд: http://localhost:8847
echo.
echo Подождите 10-15 секунд для полной загрузки
echo Затем откройте http://localhost:8847 в браузере
echo.

pause