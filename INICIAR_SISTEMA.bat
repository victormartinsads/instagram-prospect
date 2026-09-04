@echo off
title Mart Digital - Sistema de Prospeccao Autonomo Instagram
chcp 65001 > nul

echo =======================================================
echo          MART DIGITAL - PROSPECÇÃO INSTAGRAM           
echo =======================================================
echo.

set PROJECT_DIR=%~dp0
cd /d "%PROJECT_DIR%"

REM Garantir que o .env existe
if not exist ".env" (
    echo [!] Criando arquivo de configuracao .env...
    copy .env.example .env > nul
)

echo [1/3] Garantindo que o banco de dados esta atualizado...
call pnpm tsx src/db/migrate.ts

echo.
echo [2/3] Abrindo Chrome de automacao (se ja nao estiver aberto)...
start "" "C:\Program Files\Google\Chrome\Application\chrome.exe" --remote-debugging-port=9222 --user-data-dir="C:\ChromeProfiles\InstagramAutomation" https://instagram.com

echo.
echo [3/3] Iniciando Servidor e Worker do Prospector...
echo [i] O Painel sera aberto no seu navegador em http://localhost:3000
echo.
timeout /t 3 > nul
start http://localhost:3000

call pnpm run dev:all

pause
