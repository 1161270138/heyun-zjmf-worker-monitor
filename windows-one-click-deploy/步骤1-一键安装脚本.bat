@echo off
chcp 65001 >nul
setlocal EnableExtensions

cd /d "%~dp0"
set "UPSTREAM_REPO=loqwe/heyun-zjmf-worker-monitor"
set "GITHUB_REPO_URL=https://github.com/%UPSTREAM_REPO%"
set "REAL_FILE=%CD%\步骤1-一键安装.bat"
set "REAL_URL=%GITHUB_REPO_URL%/releases/download/release-step1-bat-v1/step1-install.bat"

if not exist "%REAL_FILE%" (
  echo GitHub 仓库地址：%GITHUB_REPO_URL%
  powershell -NoProfile -ExecutionPolicy Bypass -Command "$ErrorActionPreference='Stop'; $ProgressPreference='SilentlyContinue'; Invoke-WebRequest -Uri '%REAL_URL%' -OutFile '%REAL_FILE%' -UseBasicParsing"
  if errorlevel 1 exit /b 1
)

call "%REAL_FILE%" %*
exit /b %ERRORLEVEL%

rem 步骤1-下载并启动真实安装脚本
