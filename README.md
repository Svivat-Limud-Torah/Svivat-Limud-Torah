
# TORAH-IDE INSTALLATION REQUIREMENTS

## 1. OVERVIEW

**Purpose**: Guide the user through installing and launching Torah‑IDE on Windows & macOS.  
**Audience**: Developers, testers, and end-users who need to setup Torah‑IDE.

---

## 2. SYSTEM REQUIREMENTS

**Node.js**  
- Windows: Node.js v22.15.0 (x64) or the appropriate version for your PC  
- macOS: Latest stable Node.js from the official site

**Operating Systems**  
- Windows 10 or newer (64‑bit)  
- macOS 10.15 (Catalina) or newer

**Hardware**  
- 4 GB RAM minimum (8 GB+ recommended)  
- 200 MB free disk space

---

## 3. INSTALLATION INSTRUCTIONS

### 3.1 WINDOWS EDITION

**Level 1 – Node.js Install**  
- Download `node-v22.15.0-x64.msi` from the official Node.js site.  
- Run the MSI and follow the wizard.

**Level 2 – Dependencies Setup**  
- Open **Command Prompt** and navigate to the Torah‑IDE root folder.  
- Run:
  ```bat
  Torah-IDE-Setup.bat
  ```
- This installs all required npm packages.

**Level 3 – First Launch**  
- A window will open displaying a URL.  
- Click the link to start the IDE in your default browser.  
- **Important**: Do **NOT** close this Command Prompt window—it’s running the server for the IDE.

**Subsequent Launches**  
- Double-click the **Torah‑IDE** desktop shortcut.  
- The IDE will start; **do NOT close the original terminal window** or the IDE server will shut down.

### 3.2 MACOS EDITION

**Level 1 – Node.js Install**  
- Visit [nodejs.org](https://nodejs.org) and download the macOS installer.  
- Run the installer and complete setup.

**Level 2 – Dependencies Setup**  
- Open **Terminal** and `cd` into the `setup_files` directory.  
- Execute:
  ```sh
  ./Torah-IDE.sh
  ```
- This installs dependencies and opens a browser with the IDE link.

**Level 3 – First & Future Launches**  
- **First Time**: Click the link to start the IDE.  
- **Subsequent**: Use the desktop shortcut in **Applications** or your custom alias.  
- **Important**: Do **NOT** close the Terminal window running the script—it’s the IDE server.

---

## 4. VERIFICATION & TROUBLESHOOTING

**Check Node Version**:
```bash
node -v
```
Should return v22.15.0 (or your installed version).

**Log Files**:  
- Windows: `%USERPROFILE%\Torah-IDE\logs\`  
- macOS: `~/Torah-IDE/logs/`

**Common Issues**:
- **“Command not found”**: Ensure `.sh` is executable (`chmod +x Torah-IDE.sh`).  
- **Port already in use**: Change default port in `config.json`.

---

## 5. GLOSSARY & NOTES

- **Torah‑IDE**: A Bible-based, ultra-fast code editor.  
- **Support**: Raise issues on the GitHub Issues page if you hit roadblocks.

---

*End of SRS Document*
