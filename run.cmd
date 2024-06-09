@echo off
echo Checking if Flask is installed
timeout /t 2 >nul

python -c "import flask" 2>nul
if %errorlevel% neq 0 (
    echo Flask is not installed. Installing Flask...
    pip install flask
    timeout /t 2 >nul
)

echo Starting the server
timeout /t 2 >nul

start "" /b cmd /c "python solver.py"

echo Wait for the server to start
timeout /t 2 >nul

echo Waiting for the server to start...
:waitloop
curl -s http://127.0.0.1:5000 >nul
if %errorlevel% neq 0 (
    timeout /t 2 >nul
    goto waitloop
)

echo Opening the browser
timeout /t 2 >nul

start http://127.0.0.1:5000
echo Server is up & running.
timeout /t 2 >nul

exit
