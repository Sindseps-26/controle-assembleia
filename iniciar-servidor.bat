@echo off
chcp 65001 >nul
title SINDSEPS - Servidor de Presenca Sindical
cd /d "%~dp0"

echo ========================================================
echo   SINDSEPS — Sistema de Presenca Sindical em Tempo Real
echo ========================================================
echo.

REM ── SEGURANÇA: altere o TOKEN_ADMIN antes de usar em producao ────────────
REM    O valor abaixo e o padrao do sistema. Qualquer pessoa que conheca
REM    este arquivo pode executar operacoes administrativas com ele.
REM    Troque por uma senha forte e exclusiva para cada evento.
REM ─────────────────────────────────────────────────────────────────────────

set TOKEN_ADMIN=sindseps-admin-2026

REM ── Aviso visual se o token nao foi alterado ─────────────────────────────
if "%TOKEN_ADMIN%"=="sindseps-admin-2026" (
  echo  ┌──────────────────────────────────────────────────┐
  echo  │  ⚠  AVISO DE SEGURANCA                          │
  echo  │                                                  │
  echo  │  Voce esta usando o TOKEN_ADMIN padrao.          │
  echo  │  Recomenda-se trocar antes de usar em producao. │
  echo  │                                                  │
  echo  │  Edite este .bat e defina:                       │
  echo  │    set TOKEN_ADMIN=sua_senha_exclusiva           │
  echo  └──────────────────────────────────────────────────┘
  echo.
)

echo  Token em uso: %TOKEN_ADMIN:~0,6%***
echo  Iniciando servidor na porta 8080...
echo.

node servidor.js

pause
