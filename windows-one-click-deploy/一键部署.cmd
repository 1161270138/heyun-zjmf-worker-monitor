@echo off
chcp 65001 >nul
cd /d "%~dp0"
call ".\步骤2-一键部署.bat" %*
