@echo off
cd /d "D:\Gaurav Kumar Singh — AI-for-All"
start "AI-for-All Local Server" cmd /k "node local-server.js"
timeout /t 2 /nobreak >nul
start "" http://127.0.0.1:8080
