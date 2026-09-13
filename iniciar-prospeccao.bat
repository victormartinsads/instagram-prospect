@echo off
chcp 65001 > nul
echo ========================================================
echo        ÓRBITA.IO - SISTEMA DE PROSPECÇÃO INTELIGENTE
echo ========================================================
echo.

echo [1/3] Verificando Chrome com porta de automação 9222...
netstat -ano | findstr :9222 > nul
if %errorlevel% neq 0 (
    echo [i] Iniciando Chrome em modo de automação...
    start "" "chrome.exe" --remote-debugging-port=9222 --user-data-dir="c:\chrome-automation"
    timeout /t 3 > nul
) else (
    echo [v] Chrome já está aberto na porta 9222!
)

echo.
echo [2/3] Abrindo painel de controle no navegador...
start http://localhost:3000

echo.
echo [3/3] Iniciando Sistema e Robô de Prospecção (Órbita IO)...
echo.
echo --------------------------------------------------------
echo  Painel Web:   http://localhost:3000
echo  Painel Demo:  http://localhost:3001 (se desejar rodar pnpm demo)
echo --------------------------------------------------------
echo.
pnpm dev:all
pause
