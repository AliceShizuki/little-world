@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo.
echo   Little World  小小世界
echo   ------------------------------------
echo   正在启动本地服务器，请稍候...
echo   浏览器会自动打开；关闭本窗口即停止服务器。
echo.
start "" cmd /c "timeout /t 4 >nul & start "" http://127.0.0.1:5173/"
call npm run dev
pause
