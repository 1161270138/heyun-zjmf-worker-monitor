@echo off
chcp 65001 >nul
setlocal EnableExtensions

cd /d "%~dp0"
where pwsh >nul 2>nul
if %ERRORLEVEL%==0 (set "PS_EXE=pwsh") else (set "PS_EXE=powershell")

echo.
echo ========================================
echo heyun-zjmf-worker-monitor 步骤2-一键部署
echo ========================================
echo 接下来会引导你填写 Cloudflare Token、Account ID、仓库地址和网站密码。
echo.

if not exist ".\deploy-one-click.ps1" (
  echo [ERROR] 缺少 deploy-one-click.ps1，请先运行 步骤1-一键安装.bat。
  pause
  exit /b 1
)

if /I "%~1"=="--self-test" (
  set "ZJMF_ADMIN_TOKEN=admin"
  "%PS_EXE%" -NoProfile -ExecutionPolicy Bypass -File ".\deploy-one-click.ps1" -ConfigPath ".\one-click.config.jsonc" -PreflightOnly
  exit /b %ERRORLEVEL%
)

"%PS_EXE%" -NoProfile -ExecutionPolicy Bypass -File ".\deploy-one-click.ps1" -ConfigPath ".\one-click.config.jsonc" -Interactive
set "SCRIPT_EXIT=%ERRORLEVEL%"
echo.
if not "%SCRIPT_EXIT%"=="0" (
  echo [ERROR] 部署已中断，退出码：%SCRIPT_EXIT%
  echo 请查看上方错误信息。
) else (
  echo [OK] 部署脚本执行完成。
)
pause
exit /b %SCRIPT_EXIT%
