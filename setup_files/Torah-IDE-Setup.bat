@echo off
cls
echo =====================================
echo  Torah IDE Setup by Cline            
echo =====================================
echo.
echo This script will install necessary dependencies for the Torah IDE project.
echo It will also create a Desktop shortcut to launch the application.
echo Please ensure you have Node.js and npm installed.
echo.
echo Press any key to begin the setup...
pause > nul

:INSTALL_BACKEND
cls
echo Installing backend dependencies...
cd backend
call :LOADING_ANIMATION npm install
if errorlevel 1 (
    echo ERROR: Failed to install backend dependencies.
    cd ..
    call :CLEANUP_AND_EXIT
)
cd ..
echo Backend dependencies installed successfully.
echo.

:INSTALL_FRONTEND
cls
echo Installing frontend dependencies...
cd frontend
call :LOADING_ANIMATION npm install
if errorlevel 1 (
    echo ERROR: Failed to install frontend dependencies.
    cd ..
    call :CLEANUP_AND_EXIT
)
cd ..
echo Frontend dependencies installed successfully.
echo.

:FINALIZE_SETUP
cls
echo Finalizing setup...

echo Creating Desktop shortcut for Torah-IDE...
powershell -NoProfile -ExecutionPolicy Bypass -Command "$ws = New-Object -ComObject WScript.Shell; $s = $ws.CreateShortcut([System.Environment]::GetFolderPath('Desktop') + '\Torah-IDE.lnk'); $s.TargetPath = '%CD%\setup_files\Torah-IDE.bat'; $s.IconLocation = '%CD%\setup_files\icon\icon.ico,0'; $s.WorkingDirectory = '%CD%'; $s.Save()"
if errorlevel 1 (
    echo WARNING: Could not create Desktop shortcut. You might need to run this script as Administrator or check PowerShell execution policy.
    echo You can create the shortcut manually:
    echo   Target: %CD%\setup_files\Torah-IDE.bat
    echo   Start in: %CD%
) else (
    echo Desktop shortcut 'Torah-IDE.lnk' created successfully.
)
echo.

echo Torah IDE setup complete!
echo You can now use the Desktop shortcut or run '%CD%\setup_files\Torah-IDE.bat' directly to start the application.
echo.
echo Launching Torah IDE now...
timeout /t 3 /nobreak > nul
start "Torah IDE" "%CD%\setup_files\Torah-IDE.bat"

echo.
echo Setup script finished. This window can be closed.
pause
exit /b 0

:: Subroutine for loading animation
:LOADING_ANIMATION
setlocal
set "chars=|/-\"
set "cmd_to_run=%*"
echo Running: %cmd_to_run%
echo.
(
  %cmd_to_run%
) > install.log 2>&1 &
set /a "spinner_count=0"
:LOAD_LOOP
for /f "delims=" %%a in ('type install.log ^| find /v /c ""') do set lines=%%a
if %lines% gtr 0 (
    type install.log
    del install.log > nul 2>&1
)
set /a "char_index=spinner_count %% 4"
for /f %%i in ('echo %char_index%') do set char=!chars:~%%i,1!
echo|set /p="Loading %char% "
ping -n 2 127.0.0.1 > nul
set /a "spinner_count+=1"
tasklist /fi "imagename eq node.exe" | find /i "node.exe" > nul
if errorlevel 1 (
  tasklist /fi "imagename eq npm.cmd" | find /i "npm.cmd" > nul
  if errorlevel 1 (
    goto :LOAD_DONE
  )
)
goto :LOAD_LOOP
:LOAD_DONE
del install.log > nul 2>&1
echo.
echo Command finished.
endlocal
goto :eof

:CLEANUP_AND_EXIT
echo.
echo Setup failed. Please check the error messages above.
echo The setup script will remain for you to inspect or retry.
pause
exit /b 1
