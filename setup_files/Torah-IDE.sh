#!/bin/bash

# Determine the absolute path to the project root directory
PROJECT_ROOT=$(cd "$(dirname "$0")/.." && pwd)

echo "Torah IDE macOS Helper Script"
echo "Project Root: ${PROJECT_ROOT}"
echo "-------------------------------------"

# 1. Check for Node.js
echo "Checking for Node.js..."
if ! command -v node &> /dev/null || ! command -v npm &> /dev/null; then
    echo "[ERROR] Node.js or npm is not installed."
    echo "Please install Node.js (which includes npm) from https://nodejs.org/"
    osascript -e 'open location "https://nodejs.org/"' &> /dev/null
    exit 1
fi
echo "Node.js and npm found."
echo "Node version: $(node -v)"
echo "npm version: $(npm -v)"
echo "-------------------------------------"

# 2. Conditional Dependency Installation
NEEDS_INSTALL=0
# Backend dependencies
echo "Checking backend dependencies..."
if [ ! -d "${PROJECT_ROOT}/backend/node_modules" ]; then
    echo "Backend 'node_modules' folder not found. Installing dependencies..."
    (cd "${PROJECT_ROOT}/backend" && npm install)
    if [ $? -ne 0 ]; then echo "[ERROR] Failed to install backend dependencies."; exit 1; fi
    NEEDS_INSTALL=1
else
    echo "Backend dependencies appear to be installed."
fi
# Frontend dependencies
echo "Checking frontend dependencies..."
if [ ! -d "${PROJECT_ROOT}/frontend/node_modules" ]; then
    echo "Frontend 'node_modules' folder not found. Installing dependencies..."
    (cd "${PROJECT_ROOT}/frontend" && npm install)
    if [ $? -ne 0 ]; then echo "[ERROR] Failed to install frontend dependencies."; exit 1; fi
    NEEDS_INSTALL=1
else
    echo "Frontend dependencies appear to be installed."
fi
if [ ${NEEDS_INSTALL} -eq 1 ]; then echo "All necessary dependencies installed."; else echo "All dependencies were already installed."; fi
echo "-------------------------------------"

# 3. Create Desktop Launcher App (if it doesn't exist)
APP_NAME="Start Torah IDE.app"
DESKTOP_APP_PATH="${HOME}/Desktop/${APP_NAME}"
THIS_SCRIPT_PATH="${PROJECT_ROOT}/setup_files/Torah-IDE.sh"
SOURCE_ICON_PATH="${PROJECT_ROOT}/setup_files/icon/icon.icns"

echo "Checking for Desktop launcher app..."
if [ ! -d "${DESKTOP_APP_PATH}" ]; then
    echo "Creating Desktop launcher app: ~${DESKTOP_APP_PATH#$HOME}"
    TEMP_AS_PATH="/tmp/temp_torah_ide_launcher_$(date +%s).applescript"
    
    # Prepare AppleScript content to run this shell script
    # Ensure the path to THIS_SCRIPT_PATH is correctly quoted for shell execution within AppleScript
    escaped_this_script_path=$(printf '%q' "${THIS_SCRIPT_PATH}")
    echo "do shell script ${escaped_this_script_path} & \" --launched-from-app\"" > "${TEMP_AS_PATH}"

    # Compile the AppleScript into an application bundle
    osacompile -o "${DESKTOP_APP_PATH}" "${TEMP_AS_PATH}"
    compile_status=$?
    rm -f "${TEMP_AS_PATH}" # Clean up temporary AppleScript file

    if [ ${compile_status} -eq 0 ] && [ -d "${DESKTOP_APP_PATH}" ]; then
        echo "App bundle created successfully."
        echo "Attempting to set custom icon..."
        if [ -f "${SOURCE_ICON_PATH}" ]; then
            # Ensure Resources directory exists (osacompile should create it)
            mkdir -p "${DESKTOP_APP_PATH}/Contents/Resources"
            # Copy the custom icon into the app bundle, naming it applet.icns or as per Info.plist
            cp "${SOURCE_ICON_PATH}" "${DESKTOP_APP_PATH}/Contents/Resources/applet.icns"
            
            # Update Info.plist to use this icon file
            # Check if Info.plist exists
            if [ -f "${DESKTOP_APP_PATH}/Contents/Info.plist" ]; then
                plutil -replace CFBundleIconFile -string "applet.icns" "${DESKTOP_APP_PATH}/Contents/Info.plist"
                # Touch the app bundle to help Finder refresh the icon
                touch "${DESKTOP_APP_PATH}"
                echo "Custom icon set for the app bundle."
            else
                echo "[WARNING] Info.plist not found in app bundle. Cannot set icon reference."
            fi
        else
            echo "[WARNING] Icon file not found at ${SOURCE_ICON_PATH}. App will have default icon."
        fi
        echo "Desktop launcher app created. You might need to right-click -> Open it the first time."
    else
        echo "[ERROR] Failed to create app bundle using osacompile. Status: ${compile_status}"
    fi
else
    echo "Desktop launcher app already exists at ~${DESKTOP_APP_PATH#$HOME}"
fi
echo "-------------------------------------"

# 4. Start Servers
# Check if this script was launched from the app to avoid re-launching servers if already running
# This simple check might not be foolproof for all server states.
# For now, we always attempt to start, osascript will just open new terminals or new tabs.
# if [[ "$*" != *"--launched-from-app"* ]]; then ... (add this if needed)

echo "Starting servers..."
# Backend Server
echo "Starting backend server in a new Terminal window..."
osascript <<EOF
tell application "Terminal"
    activate
    do script "echo 'Starting Torah IDE Backend...'; cd '${PROJECT_ROOT}/backend'; npm start"
end tell
EOF
# Frontend Server
echo "Starting frontend server in a new Terminal window..."
osascript <<EOF
tell application "Terminal"
    activate
    do script "echo 'Starting Torah IDE Frontend (Vite)...'; cd '${PROJECT_ROOT}/frontend'; npm run dev"
end tell
EOF

echo "-------------------------------------"
echo "Torah IDE servers are being launched in separate Terminal windows."
echo "The frontend (Vite) window will show the URL (e.g., http://localhost:5173/)."
# If not launched from app, this script's window can be closed. If launched from app, app handles it.
if [[ "$*" != *"--launched-from-app"* ]]; then
    echo "This script window can be closed once the servers are running."
fi
exit 0
