# ExamSprint

An AI exam-prep web app for college students. Upload your course PDFs and previous year question papers, and ExamSprint turns them into chapter-wise study notes, diagrams and a list of the most important exam questions, then lets you ask follow-up questions to an AI tutor.

**Live demo:** https://examsprint-77hi.onrender.com

> The demo runs on a free hosting plan. The first load after a quiet period can take up to a minute, and accounts or saved material may be reset when the server restarts.

<!-- Add a screenshot here, for example: ![ExamSprint home screen](screenshots/home.png) -->

## What it does

- **Chapter-wise summaries.** Every uploaded course PDF is summarised on its own, chapter by chapter, in simple language, so nothing gets skipped.
- **Key topics and one-liners.** Short explanations, plain-language versions with everyday analogies, and quick definitions or formulas for revision.
- **Derivations and diagrams.** Step-by-step derivations and algorithms found in the notes, plus Mermaid diagrams for processes, flows, layers and states.
- **Important questions from past papers.** Upload previous year papers and get questions grouped as 2, 5 and 10 marks, with a count of how many papers each question appears in. Answers are written only from your notes. If you upload no papers, practice questions are written from your notes instead.
- **AI tutor chat.** Ask questions about a subject and get Markdown answers that can include Mermaid diagrams.
- **Accounts.** Sign up with name, roll number and password. Each student's generated material and added subjects are saved to their own account.
- **Optional signup allow-list.** Put approved roll numbers in `ai-server/allowed-rolls.txt` (one per line) and only those students can sign up.

## How it works

ExamSprint is not a RAG pipeline. There is no chunking, embedding or vector search. The server sends the uploaded PDFs directly to Gemini, which reads them natively, together with a detailed prompt that tells it what to produce. Course PDFs are summarised one at a time, then the combined summary is used to write model answers for the questions found in the past papers.

## Tech stack

| Part | Technology |
|---|---|
| Frontend | React 19, Vite, Tailwind CSS, Mermaid, react-markdown, lucide-react |
| Backend | Node.js (22.13 or newer), Express |
| Database | SQLite through Node's built-in `node:sqlite` |
| AI | Google Gemini API |
| Hosting | Render |

## Security and fair use

- Passwords are stored as salted `scrypt` hashes, never in plain text.
- Login uses random session tokens that expire after 30 days.
- Eight wrong password attempts lock a roll number for 10 minutes.
- Each student has a daily limit on generations and chat messages, so one person cannot use up the Gemini quota.
- The Gemini key lives only on the server, in environment variables. It is never sent to the browser.

## Reliability

- If Gemini asks the server to slow down, the server waits for the time Google gives and retries automatically.
- If a model's daily allowance runs out, the server switches to the next model in the `GEMINI_MODELS` list.
- Course PDFs are processed one at a time by default to stay inside free-tier rate limits.

## Project structure

```
ExamSprint/
├── ai-server/        Express server: accounts, saved data, Gemini calls, serves the built site
│   ├── server.js
│   └── package.json
└── client/           React app (Vite)
    ├── src/
    └── package.json
```

## Run it locally

You need Node.js 22.13 or newer and a Gemini API key from [Google AI Studio](https://aistudio.google.com).

1. **Set up the server.**
   ```
   cd ai-server
   npm install
   ```
   Create a file named `.env` inside `ai-server`:
   ```
   GEMINI_API_KEY=your_key_here
   GEMINI_MODELS=model-name-1,model-name-2
   ```
   Use the model names currently offered in your Google AI Studio account.

2. **Start the server.**
   ```
   npm start
   ```
   It runs on `http://localhost:3100`.

3. **Start the website** in a second terminal.
   ```
   cd client
   npm install
   npm run dev
   ```
   Open the address Vite prints, usually `http://localhost:3001` or the next free port.

## Configuration

All settings are environment variables on the server.

| Variable | Purpose | Default |
|---|---|---|
| `GEMINI_API_KEY` | Your Gemini API key (required) | none |
| `GEMINI_MODELS` | Comma-separated models, tried in order | `gemini-3.8-flash` |
| `PORT` | Server port | `3100` |
| `DB_PATH` | Where the SQLite file is stored | `ai-server/examsprint.db` |
| `DAILY_GENERATE_LIMIT` | Generations per student per day | `15` |
| `DAILY_CHAT_LIMIT` | Chat messages per student per day | `100` |
| `CONCURRENCY` | PDFs processed at the same time | `1` |

## Deploy on Render

The server also serves the built website, so the whole app runs as one web service.

- **Build command:** `cd client && npm install --include=dev && npm run build && cd ../ai-server && npm install`
- **Start command:** `cd ai-server && npm start`
- **Environment variables:** `GEMINI_API_KEY`, `GEMINI_MODELS`, `NODE_VERSION`
- **To keep accounts and saved material across restarts:** use a paid instance, attach a persistent disk (for example mounted at `/var/data`), and set `DB_PATH=/var/data/examsprint.db`.

## Known limitations

- On the free hosting plan the database is not persistent, so accounts and saved material can be lost when the server restarts or redeploys.
- The free plan sleeps after about 15 minutes without visitors, and large PDFs (around 12 MB or more) can be slow or fail on its limited memory.
- Gemini's free tier has rate limits, so generating several PDFs can take a few minutes.
- Output quality depends on the quality of the uploaded PDFs. Scanned or handwritten pages may be read poorly.