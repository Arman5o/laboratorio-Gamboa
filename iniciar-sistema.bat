@echo off
title Sistema PWA Laboratorio Gamboa
color 0A

echo.
echo  ============================================
echo    INICIANDO SISTEMA PWA LABORATORIO GAMBOA
echo  ============================================
echo.

set "ROOT=%~dp0"

:: =====================================================
:: PASO 1: COMPILAR FRONTEND
:: =====================================================
echo  [1/3] Compilando el Frontend (Next.js build)...
echo  -------------------------------------------
cd /d "%ROOT%frontend-pwa"
call npm run build
if %errorlevel% neq 0 (
    color 0C
    echo.
    echo  [ERROR] Fallo al compilar el Frontend.
    pause
    exit /b 1
)

:: =====================================================
:: PASO 2: BACKEND en nueva ventana
:: =====================================================
echo.
echo  [2/3] Arrancando Backend (NestJS) en puerto 3001...
set "BACK=%ROOT%backend-api"
start "BACKEND-NestJS" cmd /k "cd /d ""%BACK%"" && color 0B && echo [BACKEND] NestJS Puerto 3001 && npm run start:dev"

echo  Esperando 8 segundos para que NestJS levante...
timeout /t 8 /nobreak >nul

:: =====================================================
:: PASO 3: FRONTEND en nueva ventana
:: =====================================================
echo  [3/3] Arrancando Frontend (Next.js) en puerto 3000...
set "FRONT=%ROOT%frontend-pwa"
start "FRONTEND-NextJS" cmd /k "cd /d ""%FRONT%"" && color 0D && echo [FRONTEND] Next.js Puerto 3000 && npm run start"

echo  Esperando 5 segundos para abrir el navegador...
timeout /t 5 /nobreak >nul
start "" "http://localhost:3000"

echo.
echo  ============================================
echo    SISTEMA INICIADO CORRECTAMENTE
echo    Backend:  http://localhost:3001
echo    Frontend: http://localhost:3000
echo  ============================================
echo.
echo  Cierra las ventanas BACKEND y FRONTEND para detener.
pause
