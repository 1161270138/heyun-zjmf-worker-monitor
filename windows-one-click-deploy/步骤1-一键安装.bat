@echo off
chcp 65001 >nul
setlocal EnableExtensions

cd /d "%~dp0"
set "SCRIPT_DIR=%CD%"
set "REMOTE_BASE=https://raw.githubusercontent.com/loqwe/heyun-zjmf-worker-monitor/main/windows-one-click-deploy"
set "STEP2_FILE=%SCRIPT_DIR%\步骤2-一键部署.bat"
set "PS1_FILE=%SCRIPT_DIR%\deploy-one-click.ps1"
set "EXAMPLE_FILE=%SCRIPT_DIR%\one-click.config.example.jsonc"
set "CONFIG_FILE=%SCRIPT_DIR%\one-click.config.jsonc"
set "STEP2_URL=%REMOTE_BASE%/步骤2-一键部署.bat"
set "PS1_URL=%REMOTE_BASE%/deploy-one-click.ps1"
set "EXAMPLE_URL=%REMOTE_BASE%/one-click.config.example.jsonc"

where pwsh >nul 2>nul
if %ERRORLEVEL%==0 (set "PS_EXE=pwsh") else (set "PS_EXE=powershell")

echo.
echo ========================================
echo heyun-zjmf-worker-monitor 步骤1-一键安装
echo ========================================
echo 本脚本会下载部署脚本、配置模板，然后启动步骤2。
echo.

call :fetch "%STEP2_FILE%" "%STEP2_URL%" "步骤2-一键部署.bat"
if errorlevel 1 exit /b 1
call :fix_crlf "%STEP2_FILE%"
if errorlevel 1 exit /b 1
call :fetch "%PS1_FILE%" "%PS1_URL%" "deploy-one-click.ps1"
if errorlevel 1 exit /b 1
call :fetch "%EXAMPLE_FILE%" "%EXAMPLE_URL%" "one-click.config.example.jsonc"
if errorlevel 1 exit /b 1

if not exist "%CONFIG_FILE%" (
  copy /Y "%EXAMPLE_FILE%" "%CONFIG_FILE%" >nul
  echo [OK] 已创建 one-click.config.jsonc
)

if /I "%~1"=="--self-test" set "ZJMF_ADMIN_TOKEN=admin"
call "%STEP2_FILE%" %*
exit /b %ERRORLEVEL%

:fetch
if exist "%~1" exit /b 0
echo 下载: %~3
"%PS_EXE%" -NoProfile -ExecutionPolicy Bypass -Command "$ErrorActionPreference='Stop'; $ProgressPreference='SilentlyContinue'; [Net.ServicePointManager]::SecurityProtocol=[Net.SecurityProtocolType]::Tls12; Invoke-WebRequest -Uri '%~2' -OutFile '%~1' -UseBasicParsing"
exit /b %ERRORLEVEL%

:fix_crlf
"%PS_EXE%" -NoProfile -ExecutionPolicy Bypass -Command "$p='%~1'; $t=Get-Content -LiteralPath $p -Raw -Encoding UTF8; $t=$t -replace '\r?\n', [Environment]::NewLine; [System.IO.File]::WriteAllText($p,$t,[System.Text.UTF8Encoding]::new($false))"
exit /b %ERRORLEVEL%
