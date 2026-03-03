# סביבת לימוד תורה — Torah IDE

A full-featured, AI-powered study environment for Torah learning.  
Built with React + Vite (frontend), Node.js + Express (backend), and Google Gemini AI.

---

## ✨ Features

- **File Manager** — create, rename, move, and organize notes in a sidebar tree
- **Rich Editor** — Markdown editing with live preview, RTL support, and syntax highlighting
- **Smart Search** — semantic search across all your notes using AI
- **Judaism Chat** — ask questions in Halacha, Talmud, Jewish history and more
- **Flashcards** — spaced-repetition style review from your notes
- **Text Analysis** — AI-powered analysis, summarization, and Pilpulta (dialectical analysis)
- **Learning Graph** — visualize your study progress over time
- **Progress Questionnaire** — weekly self-assessment with AI-generated personal insights
- **File Conversion** — import PDFs and Word documents into editable notes
- **Guided Tour** — interactive onboarding for new users
- **Themes & Fonts** — fully customizable design including a professional dark theme

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, Vite, CSS Modules |
| Backend | Node.js, Express, SQLite |
| AI | Google Gemini API |
| Auth / DB | Firebase (Firestore, Storage, Auth) |
| Desktop | Electron (optional) |

---

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) v18 or higher
- A [Google Gemini API key](https://aistudio.google.com/apikey) (free tier available)

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/Svivat-Limud-Torah/Svivat-Limud-Torah.git
cd Svivat-Limud-Torah

# 2. Install backend dependencies
cd backend
npm install

# 3. Install frontend dependencies
cd ../frontend
npm install
```

### Running

```bash
# Terminal 1 — start the backend (port 3001)
cd backend
npm start

# Terminal 2 — start the frontend dev server (port 5173)
cd frontend
npm run dev
```

Then open [http://localhost:5173](http://localhost:5173) in your browser.

> **Windows shortcut:** run `setup_files\Torah-IDE-Setup.bat` to install all dependencies automatically,  
> then use `setup_files\Torah-IDE.bat` to launch both servers.

---

## 🔑 API Key Setup

1. Go to [aistudio.google.com/apikey](https://aistudio.google.com/apikey)
2. Create a free API key
3. In the app, click the **key icon** (🔑) in the toolbar and paste your key

---

## 📁 Project Structure

```
├── backend/          # Express server, SQLite DB, AI services
│   ├── routes/       # API route handlers
│   └── services/     # Business logic (AI, search, questionnaire…)
├── frontend/         # React + Vite web app
│   └── src/
│       ├── components/
│       ├── hooks/
│       └── utils/
├── functions/        # Firebase Cloud Functions
└── setup_files/      # Launch & install scripts
```

---

## 📄 License

This project is for educational and personal use.
