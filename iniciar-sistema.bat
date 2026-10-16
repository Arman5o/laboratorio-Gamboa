@echo off
setlocal EnableDelayedExpansion
title Sistema PWA Laboratorio Gamboa
color 0A

echo.
echo  ============================================
echo    INICIANDO SISTEMA PWA LABORATORIO GAMBOA
echo  ============================================
echo.

set "ROOT=%~dp0"

:: =====================================================
:: LIBERAR PUERTOS SI ESTABAN OCUPADOS
:: =====================================================
echo  Liberando puertos 3000 y 3001 si estaban en uso...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3000 ^| findstr LISTENING') do taskkill /f /pid %%a >nul 2>&1
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3001 ^| findstr LISTENING') do taskkill /f /pid %%a >nul 2>&1

:: =====================================================
:: PASO 1: COMPILAR FRONTEND
:: =====================================================
echo.
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

echo  Esperando a que NestJS este listo y respondiendo en puerto 3001...
set /a backend_retries=0

:wait_backend
timeout /t 2 /nobreak >nul
curl.exe -s http://localhost:3001 >nul 2>&1
if %errorlevel% equ 0 goto backend_ready
set /a backend_retries+=1
if !backend_retries! geq 35 goto backend_timeout
echo    Esperando inicio del Backend - intento !backend_retries! de 35
goto wait_backend

:backend_timeout
echo  [AVISO] El Backend esta tardando mas de lo habitual en compilar. Continuando...
goto backend_done

:backend_ready
echo  [OK] Backend NestJS conectado y listo!

:backend_done

:: =====================================================
:: PASO 3: FRONTEND en nueva ventana
:: =====================================================
echo.
echo  [3/3] Arrancando Frontend (Next.js) en puerto 3000...
set "FRONT=%ROOT%frontend-pwa"
start "FRONTEND-NextJS" cmd /k "cd /d ""%FRONT%"" && color 0D && echo [FRONTEND] Next.js Puerto 3000 && npm run start"

echo  Esperando a que Frontend Next.js este listo en puerto 3000...
set /a frontend_retries=0

:wait_frontend
timeout /t 2 /nobreak >nul
curl.exe -s http://localhost:3000 >nul 2>&1
if %errorlevel% equ 0 goto frontend_ready
set /a frontend_retries+=1
if !frontend_retries! geq 25 goto frontend_timeout
echo    Esperando respuesta del Frontend - intento !frontend_retries! de 25
goto wait_frontend

:frontend_timeout
echo  [AVISO] El Frontend esta tardando en responder. Continuando...
goto frontend_done

:frontend_ready
echo  [OK] Frontend Next.js conectado y listo!

:frontend_done

echo.
echo  Abriendo el sistema en el navegador...
timeout /t 1 /nobreak >nul
start "" "http://localhost:3000/login"

echo.
echo  ============================================
echo    SISTEMA INICIADO CORRECTAMENTE
echo    Backend:  http://localhost:3001
echo    Frontend: http://localhost:3000
echo  ============================================
echo.
echo  Cierra las ventanas BACKEND y FRONTEND para detener.
pause
