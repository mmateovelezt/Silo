@echo off
title Interpreter Assistant Launcher
echo =========================================
echo    Asistente de STT e Interpretacion
echo =========================================
echo.
echo Iniciando el servidor local de Audio y STT (Python)...
start "Interpreter Backend" /MIN cmd /c "cd backend && call venv\Scripts\activate.bat && python main.py"

echo Esperando 3 segundos para que el servidor STT inicie...
timeout /t 3 /nobreak > NUL

echo Iniciando la interfaz en el navegador...
cd frontend
start http://127.0.0.1:5173
npm run dev

echo.
echo Cerrando procesos internos...
taskkill /IM python.exe /F /FI "WINDOWTITLE eq Interpreter Backend*" > NUL 2>&1
exit
