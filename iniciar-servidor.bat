@echo off
chcp 65001 >nul
title SINDSEPS - Servidor de Presenca Sindical
cd /d "%~dp0"

echo ========================================================
echo   SINDSEPS — Sistema de Presenca Sindical em Tempo Real
echo ========================================================
echo.
echo Iniciando servidor Node.js...
echo.
echo  TOKEN_ADMIN atual: sindseps-admin-2026
echo  Para alterar, edite esta linha:
echo    set TOKEN_ADMIN=suasenha
echo.

set TOKEN_ADMIN=sindseps-admin-2026
node servidor.js

pause
