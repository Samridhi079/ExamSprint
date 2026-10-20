import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import crypto from 'node:crypto';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';

const app = express();
app.use(cors());
app.use(express.json({ limit: '40mb' }));

const KEY = process.env.GEMINI_API_KEY;
// Models are tried in order. When one runs out of its daily allowance, the next one is used.
const MODELS = (process.env.GEMINI_MODELS || process.env.GEMINI_MODEL || 'gemini-3.8-flash').split(',').map(x => x.trim()).filter(Boolean);
const BASE = process.env.GEMINI_BASE || 'https://generativelanguage.googleapis.com/v1beta';
const blocked = new Map(); // model -> time when it can be used again
const PORT = process.env.PORT || 3100;
const log = m => console.log(`[${new Date().toLocaleTimeString()}] ${m}`);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const arr = x => (Array.isArray(x) ? x : []);

async function gemini(parts, asJson, tries = 6) {
  if (!KEY) throw new Error('GEMINI_API_KEY is missing. Add it to the .env file in the ai-server folder.');
  const body = { contents: [{ parts }] };
  if (asJson) body.generationConfig = { responseMimeType: 'application/json' };
  let attempt = 0;
  while (true) {
    const now = Date.now();
    const live = MODELS.filter(m => (blocked.get(m) || 0) <= now);
    if (!live.length) {
      const secs = Math.ceil((Math.min(...MODELS.map(m => blocked.get(m))) - now) / 1000);
      throw new Error(`The free daily limit is used up for every model in your list. The first one resets in about ${Math.floor(secs / 3600)}h ${Math.round((secs % 3600) / 60)}m. Please try again then, or add more models to GEMINI_MODELS in the .env file.`);
    }
    const model = live[0];
    const r = await fetch(`${BASE}/models/${model}:generateContent`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': KEY }, body: JSON.stringify(body),
    });
    const j = await r.json();
    if (r.ok) return (j.candidates?.[0]?.content?.parts || []).map(p => p.text).join('');
    const msg = j.error?.message || '';
    if (r.status === 404 || /no longer available/i.test(msg)) {
      blocked.set(model, now + 864e5); log(`${model} is not available. Switching to the next model...`); continue;
    }
    if (r.status === 429 || r.status === 503) {
      // Google tells us how long to wait, for example "retry in 33.1s" or "retry in 3h26m26s".
      const m = /retry in (?:(\d+)h)?(?:(\d+)m)?([\d.]+)s/i.exec(msg);
      const secs = m ? (Number(m[1]) || 0) * 3600 + (Number(m[2]) || 0) * 60 + Math.ceil(Number(m[3])) : 25;
      if (secs > 120) { blocked.set(model, now + secs * 1000); log(`${model} has used up its daily limit. Switching to the next model...`); continue; }
      if (++attempt >= tries) throw new Error(msg || 'Gemini is busy. Please try again in a minute.');
      log(`Google asked us to slow down. Waiting ${secs + 2}s, then retrying (attempt ${attempt + 1} of ${tries})...`);
      await sleep((secs + 2) * 1000);
      continue;
    }
    throw new Error(msg || 'Gemini request failed');
  }
}

// PDFs are sent to Gemini as-is; text files are decoded and sent as text.
const filePart = f => f.mime === 'application/pdf'
  ? { inlineData: { mimeType: 'application/pdf', data: f.data } }
  : { text: `[File: ${f.name}]\n` + Buffer.from(f.data, 'base64').toString('utf8').slice(0, 200000) };

async function pool(items, n, fn) {
  const out = []; let i = 0;
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, async () => {
    while (i < items.length) { const k = i++; out[k] = await fn(items[k]); }
  }));
  return out;
}
const parse = raw => { try { return JSON.parse(raw); } catch { throw new Error('The AI returned an unreadable answer. Please press Process again.'); } };

// ================= accounts (SQLite database file: ai-server/examsprint.db) =================
const db = new DatabaseSync(process.env.DB_PATH || path.join(path.dirname(fileURLToPath(import.meta.url)), 'examsprint.db'));
db.exec(`
CREATE TABLE IF NOT EXISTS users (roll TEXT PRIMARY KEY, name TEXT NOT NULL, salt TEXT NOT NULL, hash TEXT NOT NULL, created INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS sessions (token TEXT PRIMARY KEY, roll TEXT NOT NULL, created INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS state (roll TEXT NOT NULL, key TEXT NOT NULL, value TEXT NOT NULL, updated INTEGER NOT NULL, PRIMARY KEY (roll, key));
CREATE TABLE IF NOT EXISTS usage (roll TEXT NOT NULL, day TEXT NOT NULL, kind TEXT NOT NULL, n INTEGER NOT NULL, PRIMARY KEY (roll, day, kind));
`);
const here = path.dirname(fileURLToPath(import.meta.url));
// Optional: put approved roll numbers (one per line) in ai-server/allowed-rolls.txt and only those can sign up.
const allowFile = path.join(here, 'allowed-rolls.txt');
const allowed = fs.existsSync(allowFile) ? new Set(fs.readFileSync(allowFile, 'utf8').split(/\s+/).map(x => x.trim().toUpperCase()).filter(Boolean)) : null;
const DAY = 864e5;
db.prepare('DELETE FROM sessions WHERE created < ?').run(Date.now() - 30 * DAY);

const hashPw = (pw, salt) => crypto.scryptSync(pw, salt, 64).toString('hex');
const newSession = roll => { const token = crypto.randomBytes(32).toString('hex'); db.prepare('INSERT INTO sessions (token, roll, created) VALUES (?, ?, ?)').run(token, roll, Date.now()); return token; };

const fails = new Map(); // wrong-password counter per roll number
const locked = roll => { const f = fails.get(roll); return f && f.until > Date.now() && f.n >= 8; };
const failed = roll => { const f = fails.get(roll), now = Date.now(); if (!f || f.until < now) fails.set(roll, { n: 1, until: now + 10 * 60 * 1000 }); else f.n++; };

app.post('/api/signup', (req, res) => {
  const roll = String(req.body.roll || '').trim().toUpperCase(), name = String(req.body.name || '').trim(), pw = String(req.body.password || '');
  if (!/^[A-Z0-9_-]{3,30}$/.test(roll)) return res.status(400).json({ error: 'Roll number must be 3 to 30 letters or numbers.' });
  if (allowed && !allowed.has(roll)) return res.status(403).json({ error: 'This roll number is not on the approved list. Please contact the site admin.' });
  if (!name || name.length > 60) return res.status(400).json({ error: 'Please enter your name.' });
  if (pw.length < 6 || pw.length > 100) return res.status(400).json({ error: 'Password must be at least 6 characters.' });
  if (db.prepare('SELECT 1 FROM users WHERE roll = ?').get(roll)) return res.status(409).json({ error: 'This roll number already has an account. Please log in.' });
  const salt = crypto.randomBytes(16).toString('hex');
  db.prepare('INSERT INTO users (roll, name, salt, hash, created) VALUES (?, ?, ?, ?, ?)').run(roll, name, salt, hashPw(pw, salt), Date.now());
  res.json({ token: newSession(roll), user: { roll, name } });
});

app.post('/api/login', (req, res) => {
  const roll = String(req.body.roll || '').trim().toUpperCase(), pw = String(req.body.password || '');
  if (locked(roll)) return res.status(429).json({ error: 'Too many wrong attempts. Please try again in 10 minutes.' });
  const u = db.prepare('SELECT * FROM users WHERE roll = ?').get(roll);
  const ok = u && crypto.timingSafeEqual(Buffer.from(hashPw(pw, u.salt), 'hex'), Buffer.from(u.hash, 'hex'));
  if (!ok) { failed(roll); return res.status(401).json({ error: 'Wrong roll number or password.' }); }
  fails.delete(roll);
  res.json({ token: newSession(roll), user: { roll: u.roll, name: u.name } });
});

const auth = (req, res, next) => {
  const t = (req.headers.authorization || '').replace('Bearer ', '');
  const row = t && db.prepare('SELECT s.created, u.roll, u.name FROM sessions s JOIN users u ON u.roll = s.roll WHERE s.token = ?').get(t);
  if (!row || Date.now() - row.created > 30 * DAY) return res.status(401).json({ error: 'Please log in again.' });
  req.user = { roll: row.roll, name: row.name }; req.token = t; next();
};

app.get('/api/me', auth, (req, res) => res.json({ user: req.user }));
app.post('/api/logout', auth, (req, res) => { db.prepare('DELETE FROM sessions WHERE token = ?').run(req.token); res.json({ ok: true }); });

// Each student's saved data (generated notes, added subjects), stored as JSON.
const okKey = k => /^[A-Za-z0-9_.-]{1,120}$/.test(k);
app.get('/api/state/:key', auth, (req, res) => {
  if (!okKey(req.params.key)) return res.status(400).json({ error: 'Bad key.' });
  const row = db.prepare('SELECT value FROM state WHERE roll = ? AND key = ?').get(req.user.roll, req.params.key);
  res.json({ value: row ? JSON.parse(row.value) : null });
});
app.put('/api/state/:key', auth, (req, res) => {
  if (!okKey(req.params.key)) return res.status(400).json({ error: 'Bad key.' });
  const v = JSON.stringify(req.body.value ?? null);
  if (v.length > 5e6) return res.status(413).json({ error: 'Too large to save.' });
  db.prepare('INSERT INTO state (roll, key, value, updated) VALUES (?, ?, ?, ?) ON CONFLICT(roll, key) DO UPDATE SET value = excluded.value, updated = excluded.updated').run(req.user.roll, req.params.key, v, Date.now());
  res.json({ ok: true });
});

// Daily limit per student so one person cannot use up the Gemini quota.
const quota = (kind, max) => (req, res, next) => {
  const day = new Date().toISOString().slice(0, 10);
  const row = db.prepare('SELECT n FROM usage WHERE roll = ? AND day = ? AND kind = ?').get(req.user.roll, day, kind);
  if ((row?.n || 0) >= max) return res.status(429).json({ error: `Daily limit reached (${max} ${kind} requests). Please try again tomorrow.` });
  db.prepare('INSERT INTO usage (roll, day, kind, n) VALUES (?, ?, ?, 1) ON CONFLICT(roll, day, kind) DO UPDATE SET n = n + 1').run(req.user.roll, day, kind);
  next();
};

app.post('/api/generate', auth, quota('generate', Number(process.env.DAILY_GENERATE_LIMIT) || 15), async (req, res) => {
  try {
    const { subject, files = [] } = req.body;
    const notes = files.filter(f => f.slot === 'pdf');
    const pyqs = files.filter(f => f.slot === 'pyq');
    const handouts = files.filter(f => f.slot === 'handout');
    if (!notes.length) throw new Error('Please upload at least one course PDF.');

    // 1. Every course PDF is summarised on its own, so nothing gets skipped.
    const per = await pool(notes, Number(process.env.CONCURRENCY) || 1, async f => {
      const prompt = `You are an exam-preparation tutor for college students.
The attached document is course material for "${subject}" (file name: ${f.name}).
Summarise the ENTIRE document, chapter by chapter, in enough detail that a student who has not read the PDF can understand every concept from your summary alone.
Use ONLY what is in the document. Do not add outside content. Do not skip any chapter, section or concept.

Writing style:
- Explain every concept in simple, clear words, as a patient teacher would. Avoid jargon; when a technical term is needed, define it in plain words the first time.
- Each point should be 2 to 4 sentences: what the concept is, how it works or why it matters, and a small example or everyday analogy where it helps.
- Keep the order of the document. Include definitions, steps, formulas, types, advantages and disadvantages when they appear.

Return ONLY valid JSON:
{
 "units": [ { "title": "chapter or unit title", "points": ["detailed, simple explanation of one concept (2-4 sentences)", "..."], "diagram": "Mermaid code that visualises this chapter, or an empty string" } ],
 "topics": [ { "keys": ["keyword1","keyword2"], "plain": "detailed explanation of this topic from the document in simple words", "simple": "same idea explained very simply with an everyday analogy" } ],
 "ones": ["one-line definition, formula or fact from the document"],
 "derivs": [ { "title": "derivation or algorithm that appears in the document", "steps": ["step 1 with a short reason", "step 2"] } ],
 "diagrams": [ { "title": "diagram that appears in the document", "draw": "what to draw and label to score full marks", "mermaid": "Mermaid code that draws it, or an empty string" } ]
}
For any chapter that describes a process, flow, architecture, layers, network topology or states, add a Mermaid diagram in "diagram" (otherwise leave it empty). Put the same kind of Mermaid code in the "mermaid" field of each diagram.
Diagram rules (Mermaid): use only "flowchart TD", "flowchart LR", "stateDiagram-v2" or "sequenceDiagram". Put every node label in double quotes, for example A["Star hub"]. Use at most 12 nodes, short labels, and no other special characters outside quotes.
Give 10 to 30 detailed points per chapter, covering everything important. If the document has no derivations or diagrams, return empty arrays.`;
      let d;
      log(`Summarising ${f.name}...`);
      try { d = parse(await gemini([filePart(f), { text: prompt }], true)); log(`Finished ${f.name}`); }
      catch (e) { throw new Error(`${f.name}: ${e.message}`); }
      return { ...d, units: arr(d.units).map(u => ({ ...u, source: f.name })) };
    });

    const merged = {
      units: per.flatMap(d => arr(d.units)),
      topics: per.flatMap(d => arr(d.topics)),
      ones: [...new Set(per.flatMap(d => arr(d.ones)))],
      derivs: per.flatMap(d => arr(d.derivs)),
      diagrams: per.flatMap(d => arr(d.diagrams)),
      pyqs: { 2: [], 5: [], 10: [] },
    };

    // 2. Important questions come only from the uploaded previous year papers.
    const summary = merged.units.map(u => u.title + ': ' + arr(u.points).join(' ')).join('\n').slice(0, 120000);
    merged.pyqSource = pyqs.length ? 'papers' : 'notes';
    log('Building important questions...');
    if (pyqs.length) {
      const prompt = `You are an exam-preparation tutor for "${subject}".
The attached files are previous year question papers${handouts.length ? ' and the course handout' : ''}.
Extract the important questions STRICTLY from those question papers. Never invent a question and never add a question that is not in the papers.
- Group by marks, using the marks printed in the paper. If a question has no marks, infer 2, 5 or 10 from the paper's pattern.
- "rep" = in how many of the papers this question or a close variant appears. Put the most repeated first.
- Write the model answer ONLY from the course notes summary below. If the notes do not cover it, set the answer to "Not covered in the uploaded notes."
- Use the handout only to judge which topics matter.

COURSE NOTES SUMMARY:
${summary}

Return ONLY valid JSON:
{ "pyqs": { "2": [ { "q": "question", "a": "answer", "rep": 3 } ], "5": [ ... ], "10": [ { "q": "question", "a": "step-by-step answer with a marking scheme", "rep": 1 } ] } }`;
      const d = parse(await gemini([...pyqs.map(filePart), ...handouts.map(filePart), { text: prompt }], true));
      merged.pyqs = { 2: arr(d.pyqs?.['2']), 5: arr(d.pyqs?.['5']), 10: arr(d.pyqs?.['10']) };
    } else {
      // No question papers uploaded: build practice questions from the notes only.
      const prompt = `You are an exam-preparation tutor for "${subject}".
No previous year papers were uploaded. Write the most important likely exam questions using ONLY the course notes summary below${handouts.length ? ' and the attached course handout' : ''}. Do not use outside content. Write answers only from the notes.
Group them as 2-mark, 5-mark and 10-mark questions. Set "rep" to 0 for every question.

COURSE NOTES SUMMARY:
${summary}

Return ONLY valid JSON:
{ "pyqs": { "2": [ { "q": "question", "a": "answer", "rep": 0 } ], "5": [ ... ], "10": [ { "q": "question", "a": "step-by-step answer with a marking scheme", "rep": 0 } ] } }`;
      const d = parse(await gemini([...handouts.map(filePart), { text: prompt }], true));
      merged.pyqs = { 2: arr(d.pyqs?.['2']), 5: arr(d.pyqs?.['5']), 10: arr(d.pyqs?.['10']) };
    }
    log('All done.');
    res.json(merged);
  } catch (e) { log('Error: ' + e.message); res.status(500).json({ error: e.message }); }
});

app.post('/api/chat', auth, quota('chat', Number(process.env.DAILY_CHAT_LIMIT) || 100), async (req, res) => {
  try {
    const { subject, notes, question } = req.body;
    const prompt = `You are a friendly, patient tutor for "${subject}". Answer the student's question using these notes.
- Explain in detail but in simple words, step by step, as if teaching someone who is new to the topic.
- Define any technical term in plain words, and give an everyday analogy or a small example where it helps.
- If the notes do not cover the question, say so briefly, then answer from general knowledge.
- Format the answer in Markdown: short headings, bullet points and **bold** key terms.
- Whenever a diagram, flowchart, process, comparison or structure would help, or the student asks for one, DRAW it using a Mermaid code block, written exactly like this:
\`\`\`mermaid
flowchart TD
  A["Start"] --> B["Next step"]
\`\`\`
  Diagram rules (Mermaid): use only "flowchart TD", "flowchart LR", "stateDiagram-v2" or "sequenceDiagram". Put every node label in double quotes, for example A["Star hub"]. Use at most 12 nodes, short labels, and no other special characters outside quotes.
  Never draw diagrams with text characters such as dashes or pipes. Add one or two sentences under each diagram explaining it.
- If the student asks for a particular style, follow it.

NOTES:
${String(notes || '').slice(0, 120000)}

STUDENT QUESTION: ${String(question || '').slice(0, 2000)}`;
    res.json({ answer: await gemini([{ text: prompt }], false) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Serves the built website (client/dist) so the whole app is one service on one web address.
const dist = path.join(here, '..', 'client', 'dist');
if (fs.existsSync(dist)) {
  app.use(express.static(dist));
  app.get(/^(?!\/api).*/, (req, res) => res.sendFile(path.join(dist, 'index.html')));
}

const srv = app.listen(PORT, () => console.log(`ExamSprint generator running on http://localhost:${PORT}`));
srv.requestTimeout = 0; // processing many PDFs can take several minutes