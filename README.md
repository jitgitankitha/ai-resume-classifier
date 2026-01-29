🧠 AI Resume Classifier

An AI-powered resume classification web application that compares a candidate’s resume against a job description and provides an intelligent match score, keyword analysis, and skill gap insights — all without using a backend or database.

Built using React + Vite and Google Gemini API, this project demonstrates practical AI integration, file parsing, and modern frontend engineering.

🚀 Features

📄 Upload resumes in PDF, DOCX, or TXT format

🧠 AI-driven resume-to-job matching using Google Gemini

📊 Match score with detailed summary

🔑 Highlights matched keywords and missing crucial skills

🕘 Local scan history stored in browser localStorage

⚡ Fast, lightweight frontend-only architecture

🧩 Clean and modern UI built with Tailwind CSS

❌ No database, no backend — runs fully in the browser

🛠 Tech Stack

Frontend: React, Vite

Styling: Tailwind CSS

AI: Google Gemini API

File Parsing:

PDF → pdf.js

DOCX → mammoth.js

Icons: Lucide React

State Management: React Hooks

Storage: Browser localStorage

📂 Project Structure
ai-resume-classifier/
├── public/
│   └── vite.svg
├── src/
│   ├── App.jsx
│   ├── main.jsx
│   ├── App.css
│   └── index.css
├── index.html
├── package.json
├── vite.config.js
├── .gitignore
└── README.md

📥 Installation & Setup
1️⃣ Clone the repository
git clone https://github.com/your-username/ai-resume-classifier.git
cd ai-resume-classifier

2️⃣ Install dependencies
npm install

3️⃣ Add your Gemini API key

In App.jsx:

const API_KEY = "YOUR_GOOGLE_GEMINI_API_KEY";

4️⃣ Start the development server
npm run dev
