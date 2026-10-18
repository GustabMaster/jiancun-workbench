@echo off
chcp 65001 >nul
title Jiancun OCR Proxy
echo Starting local OCR proxy... keep this window open while using camera/OCR.
where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo Node.js not found. Please install Node.js 18 or newer, then run this file again.
  echo Download: https://nodejs.org/
  echo.
  pause
  exit /b 1
)
node "%~dp0ocr-proxy.js"
echo Proxy stopped.
pause
