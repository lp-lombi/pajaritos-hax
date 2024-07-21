cd /D "%~dp0"

cd webapp\frontend
start "" npx vite

explorer "http://localhost:8000"

cd ..
cd backend
node server.js
