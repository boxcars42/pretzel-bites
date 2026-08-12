# 🥨 Pretzel Bites

> A personalized Hebrew vocabulary companion built for new Olim mastering modern Israeli Hebrew.

---

## 📖 About

Pretzel Bites was built as a gift for someone who made Aliyah and is working toward fluency in Hebrew. The biggest challenge for new Olim isn't grammar — it's vocabulary and knowing how to use words naturally in daily life.

This app solves that by combining an AI-powered Hebrew dictionary with a personal word bank, daily practice exercises, and a progression system — all in one clean, minimal interface.

---

## ✨ Features

- **AI-Powered Word Lookup** — Search any Hebrew or English word and get a full entry: definition in English and Russian, root (שורש), binyan (בניין), part of speech, transliteration, and 3 real-life example sentences
- **Bulk Word Add** — Paste a list of words in Hebrew, English, or Russian (one per line, or comma/semicolon separated) and add them all at once — each is looked up and saved individually
- **Auto-Save Word Bank** — Every word you look up is automatically saved to your personal bank, no manual saving needed
- **Word Bank Search** — Instantly filter your saved words by Hebrew, transliteration, English, Russian, or root — combines with the confidence/tag/root/mishkal filters, and matches regardless of nikud
- **Daily Practice Sessions** — Three session lengths (קצר / בינוני / ארוך) with three exercise types: flashcards, multiple choice, and fill in the blank
- **Confidence Tracking** — Mark each word as Still Learning 🔴, Getting There 🟡, or Mastered 🟢
- **XP & Progression System** — Earn points for every lookup, completed session, and mastered word. Level up from Ulpan Alef all the way to בן/בת ארץ
- **Daily Streak** — Track how many days in a row you've studied
- **Bilingual Definitions** — Toggle between English and Russian translations for every word and example
- **Context Tags** — Words are tagged by real-life context: 💬 Small talk, 🛒 Supermarket, 🏥 Medical, 🏦 Bank, 🚌 Transport, 📚 University
- **Binyan Conjugation Tables** — For every verb, see the full present, past, and future conjugation table
- **Dark / Light Mode** — Clean toggle between both themes
- **Fully Responsive** — Works on desktop and mobile

---

## 🎯 Who It's For

Built specifically for **Olim Hadashim** — new immigrants to Israel who are studying Hebrew through Ulpan or a university degree and want to build their vocabulary beyond the classroom.

---

## 🛠 Tech Stack

- **Frontend:** React (Vite)
- **Styling:** Inline CSS with CSS variables for theming
- **AI:** Anthropic Claude API (claude-sonnet-4-6) via a secure server-side proxy
- **Fonts:** Frank Ruhl Libre (Hebrew display), Inter (UI)
- **Deployment:** Vercel

---

## 🚀 Running Locally

### Prerequisites
- Node.js v22+
- An Anthropic API key ([console.anthropic.com](https://console.anthropic.com))

### Setup

```bash
# Clone the repo
git clone https://github.com/boxcars42/pretzel-bites.git
cd pretzel-bites

# Install dependencies
npm install
npm install express cors node-fetch dotenv

# Create your environment file
echo VITE_ANTHROPIC_KEY=your_api_key_here > .env

# Start the proxy server (Terminal 1)
node server.js

# Start the React app (Terminal 2)
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

> ⚠️ Never commit your `.env` file or share your API key publicly.

---

## 📁 Project Structure

```
pretzel-bites/
├── src/
│   └── App.jsx          # Main React application
├── server.js            # Secure API proxy (keeps API key server-side)
├── .env                 # Your API key (never committed to Git)
├── .gitignore           # Protects sensitive files
├── index.html           # HTML entry point
└── package.json         # Dependencies and scripts
```

---

## 🔒 Security

- The Anthropic API key is stored server-side only and never exposed to the browser
- `.env` is excluded from version control via `.gitignore`
- All API calls are routed through a local proxy (`server.js`) that injects the key securely

---

## © Copyright

Copyright (c) 2026 David. All rights reserved.

This project, including its concept, design, and implementation, is the original intellectual property of David. Pretzel Bites was conceived, designed, and built as an original work.

Unauthorized copying, modification, distribution, or use of this software or its concept, in whole or in part, without the express written permission of the author is strictly prohibited.

---

## 📬 Contact

For permissions or inquiries, open an issue on this repository.
