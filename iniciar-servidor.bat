@echo off
chcp 65001 > nul
title SINDSEPS - Servidor de Presenca Sindical
cd /d "%~dp0"

echo ========================================================
echo   SINDSEPS — Sistema de Presenca Sindical em Tempo Real
echo ========================================================
echo.
echo Iniciando servidor Node.js...
echo.

node servidor.js

pause
