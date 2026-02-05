@echo off
chcp 65001 >nul
title Taxi Management System - Production Launcher

echo ========================================
echo    TAXI MANAGEMENT SYSTEM LAUNCHER
echo ========================================
echo.

:: Проверка наличия Node.js
node --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Node.js не найден! Установите Node.js и попробуйте снова.
    pause
    exit /b 1
)

echo ✅ Node.js найден
echo.

:: Установка зависимостей если нужно
if not exist "backend-json\node_modules" (
    echo 📦 Установка зависимостей бэкенда...
    cd backend-json
    call npm install
    cd ..
    echo.
)

if not exist "client\node_modules" (
    echo 📦 Установка зависимостей клиента...
    cd client
    call npm install
    cd ..
    echo.
)

:RESTART
echo ========================================
echo 🚀 Запуск Taxi Management System...
echo ========================================
echo.
echo 🔧 Бэкенд: http://localhost:8848 (с встроенным Telegram ботом)
echo 🌐 Фронтенд: http://localhost:8847
echo.

:: Создание папки для логов
if not exist "logs" mkdir logs

:: Остановка предыдущих процессов
echo 🛑 Остановка предыдущих процессов...
taskkill /f /im node.exe >nul 2>&1
timeout /t 2 /nobreak >nul

:: Запуск бэкенда (production mode - без nodemon)
echo 🔧 Запуск бэкенда...
cd backend-json
start "Taxi Backend" cmd /c "npm start > ../logs/backend.log 2>&1"
cd ..

:: Даем время на запуск процесса
echo ⏳ Ожидание запуска процесса бэкенда...
timeout /t 5 /nobreak >nul

:: Проверяем готовность бэкенда (максимум 30 секунд)
echo 🔍 Проверка готовности бэкенда...
set /a counter=0
:WAIT_BACKEND
set /a counter+=1
if %counter% gtr 15 (
    echo ❌ Бэкенд не запустился за 30 секунд. Проверьте логи в logs/backend.log
    pause
    exit /b 1
)
timeout /t 2 /nobreak >nul
powershell -Command "try { Invoke-WebRequest -Uri 'http://localhost:8848/health' -UseBasicParsing -TimeoutSec 3 | Out-Null; exit 0 } catch { exit 1 }" >nul 2>&1
if errorlevel 1 (
    echo 🔄 Попытка %counter%/15 - бэкенд еще не готов...
    goto WAIT_BACKEND
)
echo ✅ Бэкенд готов!

:: Запуск фронтенда
echo 🌐 Запуск фронтенда...
cd client
start "Taxi Frontend" cmd /c "npm run dev > ../logs/frontend.log 2>&1"
cd ..

:: Ждем запуска фронтенда
echo ⏳ Ожидание готовности фронтенда...
timeout /t 5 /nobreak >nul

echo.
echo ========================================
echo ✅ Система запущена!
echo ========================================
echo.
echo 🌐 Откройте браузер: http://localhost:8847
echo 📊 Проверка здоровья: http://localhost:8848/health
echo 📋 Логи находятся в папке: logs/
echo.
echo 📊 Мониторинг сервисов каждые 15 секунд...
echo 💡 Нажмите Ctrl+C для остановки мониторинга
echo.

:MONITOR
timeout /t 15 /nobreak >nul

:: Проверка бэкенда
powershell -Command "try { $response = Invoke-WebRequest -Uri 'http://localhost:8848/health' -UseBasicParsing -TimeoutSec 3; if ($response.StatusCode -eq 200) { exit 0 } else { exit 1 } } catch { exit 1 }" >nul 2>&1
if errorlevel 1 (
    echo ⚠️  [%time%] Бэкенд недоступен! Перезапуск через 5 секунд...
    timeout /t 5 /nobreak >nul
    taskkill /f /im node.exe >nul 2>&1
    timeout /t 2 /nobreak >nul
    goto RESTART
)

:: Проверка фронтенда
powershell -Command "try { $response = Invoke-WebRequest -Uri 'http://localhost:8847' -UseBasicParsing -TimeoutSec 3; if ($response.StatusCode -eq 200 -or $response.StatusCode -eq 404) { exit 0 } else { exit 1 } } catch { exit 1 }" >nul 2>&1
if errorlevel 1 (
    echo ⚠️  [%time%] Фронтенд недоступен! Перезапуск через 5 секунд...
    timeout /t 5 /nobreak >nul
    taskkill /f /im node.exe >nul 2>&1
    timeout /t 2 /nobreak >nul
    goto RESTART
)

echo ✅ [%time%] Все сервисы работают нормально
goto MONITOR