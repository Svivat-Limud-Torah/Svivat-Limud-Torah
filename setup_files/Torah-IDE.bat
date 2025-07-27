@echo off
echo Starting backend server...
pushd backend
start "Backend Server" /min cmd /c "npm start"
popd

echo Starting frontend server...
pushd frontend
start "Frontend Server" cmd /c "npm run dev"
popd

echo Backend server starting minimized, Frontend server starting in a new window.
echo This window will now close.
timeout /t 2 /nobreak > nul
exit
