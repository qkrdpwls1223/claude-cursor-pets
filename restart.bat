@echo off
taskkill /f /im electron.exe 2>nul
taskkill /f /im "claude-pets.exe" 2>nul
timeout /t 2 /nobreak >nul
start "" "J:\02.Projects\claude-pets\start-silent.vbs"
