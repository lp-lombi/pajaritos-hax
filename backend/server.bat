@echo off

cd /D "%~dp0"
call npm i
cls
explorer "http://localhost:8000"
node server.js

