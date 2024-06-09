@echo off
echo Checking if Flask is installed
python -c "import flask" 2>nul
if %errorlevel% neq 0 (
    echo Flask is not installed. Installing Flask...
    pip install flask
)

echo Start the Flask server
start "" /b cmd /c "python solver.py"

echo Wait for the server to start
  
echo Waiting for the server to start...
:waitloop
curl -s http://127.0.0.1:5000 >nul
if %errorlevel% neq 0 (
    timeout /t 1 >nul
    goto waitloop
)

echo Opening the browser
start http://127.0.0.1:5000
echo Server is up & running.
  
exit
