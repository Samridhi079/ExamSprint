# ExamSprint

An AI exam-prep web app for college students. Upload your course PDFs and previous year question papers, and ExamSprint turns them into chapter-wise study notes, diagrams and a list of the most important exam questions, then lets you ask follow-up questions to an AI tutor that answers from your own notes and cites the source page.

**Live demo:** https://examsprint-77hi.onrender.com

> The demo runs on a free hosting plan. The first load after a quiet period can take up to a minute, and accounts or saved material may be reset when the server restarts.

<!-- Add a screenshot here, for example: ![ExamSprint home screen](screenshots/home.png) -->

## What it does

- **Chapter-wise summaries.** Every uploaded course PDF is summarised on its own, chapter by chapter, in simple language, so nothing gets skipped.
- **Key topics and one-liners.** Short explanations, plain-language versions with everyday analogies, and quick definitions or formulas for revision.
- **Derivations and diagrams.** Step-by-step derivations and algorithms found in the notes, plus Mermaid diagrams for processes, flows, layers and states.
- **Important questions from past papers.** Upload previous year papers and get questions grouped as 2, 5 and 10 marks, with a count of how many papers each question appears in. Answers are written only from your notes. If you upload no papers, practice questions are written from your notes instead.
- **AI tutor chat with citations.** Ask questions about a subject. The answer is built from the passages of your own PDFs that best match the question, written in Markdown (with Mermaid diagrams when they help), and ends with the source file and page numbers it used. If your notes do not cover the question, the tutor says so before answering from general knowledge.
- **Accounts.** Sign up with name, roll number and password. Each student's generated material and added subjects are saved to their own account.
- **Optional signup allow-list.** Put approved roll numbers in `ai-server/allowed-rolls.txt` (one per line) and only those students can sign up.

## How it works

ExamSprint uses two different strategies, because the two jobs need different things.

**Generation (summaries, important questions): whole-document prompting.** These need to see the entire document, so the server sends the uploaded PDFs directly to Gemini, which reads them natively, together with a detailed prompt. Course PDFs are summarised one at a time, then the combined summary is used to write model answers for the questions found in the past papers.

**Chat: retrieval-augmented generation (RAG).** Pasting every note into every question is slow and wastes quota, so the chat searches your PDFs instead:

1. **Extract.** After you press Process, the text of each course PDF is extracted page by page.
2. **Chunk.** The text is split into overlapping chunks of about 350 words (60 words of overlap), and each chunk remembers its file and page range.
3. **Embed.** Each chunk is turned into a 768-dimension vector with Gemini's `gemini-embedding-001` model and stored in SQLite, per student and per subject.
4. **Retrieve.** For each question, the question is embedded, compared with the stored chunks by cosine similarity (plus a small bonus for exact keyword matches, so terms like "semaphore" are not missed), and the top 6 passages are selected.
5. **Answer.** Only those passages are sent to Gemini, which answers from them and cites the sources. The list of source files and pages is added to the end of the answer.

If a subject has no indexed text (for example, scanned PDFs with no selectable text), the chat falls back to the generated notes, so it always answers.

## Tech stack

| Part | Technology |
|---|---|
| Frontend | React 19, Vite, Tailwind CSS, Mermaid, react-markdown, lucide-react |
| Backend | Node.js (22.13 or newer), Express |
| Database | SQLite through Node's built-in `node:sqlite` |
| AI | Google Gemini API (text generation and `gemini-embedding-001` embeddings) |
| PDF text extraction | unpdf |
| Hosting | Render |

## Security and fair use

- Passwords are stored as salted `scrypt` hashes, never in plain text.
- Login uses random session tokens that expire after 30 days.
- Eight wrong password attempts lock a roll number for 10 minutes.
- Each student has a daily limit on generations and chat messages, so one person cannot use up the Gemini quota.
- Retrieval is scoped to the signed-in student, so one student can never retrieve another student's notes.
- The Gemini key lives only on the server, in environment variables. It is never sent to the browser.

## Reliability

- If Gemini asks the server to slow down, the server waits for the time Google gives and retries automatically.
- If a model's daily allowance runs out, the server switches to the next model in the `GEMINI_MODELS` list.
- Course PDFs are processed one at a time by default to stay inside free-tier rate limits.
- Indexing for chat runs after the results are sent, and if it fails the student still gets their results and the chat uses the fallback.

## Project structure

```
ExamSprint/
├── ai-server/        Express server: accounts, saved data, Gemini calls, serves the built site
│   ├── server.js
│   ├── rag.js        RAG: PDF text extraction, chunking, embeddings, storage, retrieval
│   └── rag-eval.mjs  Measures retrieval accuracy against questions you write
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

## Measure retrieval quality

`rag-eval.mjs` checks how often the page that holds an answer appears in the retrieved chunks.

```
node rag-eval.mjs                                   # lists what is indexed
node rag-eval.mjs <roll> "<subject>" cases.json 5   # runs your test questions
```

`cases.json` is a list of questions with the file and page that answers each one:

```json
[ { "q": "What is a semaphore?", "file": "notes.pdf", "page": 12 } ]
```

## Configuration

All settings are environment variables on the server.

| Variable | Purpose | Default |
|---|---|---|
| `GEMINI_API_KEY` | Your Gemini API key (required) | none |
| `GEMINI_MODELS` | Comma-separated generation models, tried in order | `gemini-3.8-flash` |
| `EMBED_MODEL` | Embedding model used for chat retrieval | `gemini-embedding-001` |
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

- Chat retrieval needs PDFs with selectable text. Scanned or handwritten PDFs are still summarised (Gemini reads them as images) but are not indexed, so the chat falls back to the generated notes for them.
- Only course PDFs are indexed for chat. Question papers and handouts are used only to build the important-questions list.
- The search index for a subject is rebuilt each time you press Process.
- On the free hosting plan the database is not persistent, so accounts and saved material can be lost when the server restarts or redeploys, and the site sleeps after about 15 minutes without visitors.
- Large PDFs can be slow or fail on the free plan's limited memory, and Gemini's free tier has rate limits, so generating several PDFs can take a few minutes.