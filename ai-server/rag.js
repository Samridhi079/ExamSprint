// rag.js - retrieval-augmented generation for ExamSprint chat.
// Pipeline: extract text per page -> chunk with overlap -> embed (Gemini) -> store in SQLite -> retrieve top-k per question.
import { extractText, getDocumentProxy } from 'unpdf';

const EMBED_MODEL = () => process.env.EMBED_MODEL || 'gemini-embedding-001';
const BASE = () => process.env.GEMINI_BASE || 'https://generativelanguage.googleapis.com/v1beta';
const DIM = 768;            // smaller vectors = less memory and storage; normalised below
const BATCH = 50;           // texts per embedding request
const CHUNK_WORDS = 350;    // about 500 tokens
const STEP_WORDS = 290;     // overlap of 60 words between neighbouring chunks
const MIN_CHUNK_WORDS = 20;
const TOP_K = 6;

const log = m => console.log(`[${new Date().toLocaleTimeString()}] [rag] ${m}`);
const sleep = ms => new Promise(r => setTimeout(r, ms));

// ---------- helpers ----------
// The website may send the subject as a text or as an object; make a stable key either way.
export const subjectKey = s => {
  const v = s && typeof s === 'object' ? (s.code || s.name || '') : s;
  return String(v || '').trim().toLowerCase().slice(0, 120);
};

const normalize = v => {
  let n = 0; for (const x of v) n += x * x;
  n = Math.sqrt(n) || 1;
  return Float32Array.from(v, x => x / n);   // dimensions below 3072 are not pre-normalised by the API
};
const dot = (a, b) => { let s = 0; for (let i = 0; i < a.length; i++) s += a[i] * b[i]; return s; };
const toBlob = f32 => Buffer.from(f32.buffer, f32.byteOffset, f32.byteLength);
const fromBlob = u8 => new Float32Array(new Uint8Array(u8).buffer);   // copy, so the bytes are 4-aligned

// ---------- 1. text extraction ----------
export async function extractPages(file) {
  const raw = Buffer.from(file.data, 'base64');
  if (file.mime !== 'application/pdf') {
    return [{ page: 1, text: raw.toString('utf8').slice(0, 400000) }];
  }
  const pdf = await getDocumentProxy(new Uint8Array(raw));
  try {
    const { text } = await extractText(pdf, { mergePages: false });
    return text.map((t, i) => ({ page: i + 1, text: String(t || '') }));
  } finally {
    await pdf.destroy?.();
  }
}

// ---------- 2. chunking ----------
export function chunkPages(pages) {
  const words = [];
  for (const { page, text } of pages) {
    for (const w of text.split(/\s+/)) if (w) words.push({ w, page });
  }
  const chunks = [];
  for (let i = 0; i < words.length; i += STEP_WORDS) {
    const win = words.slice(i, i + CHUNK_WORDS);
    if (win.length < MIN_CHUNK_WORDS) break;
    chunks.push({ text: win.map(x => x.w).join(' '), p1: win[0].page, p2: win[win.length - 1].page });
    if (i + CHUNK_WORDS >= words.length) break;
  }
  return chunks;
}

// ---------- 3. embeddings ----------
async function post(url, body, tries = 5) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error('GEMINI_API_KEY is missing.');
  for (let attempt = 1; ; attempt++) {
    const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key }, body: JSON.stringify(body) });
    const j = await r.json().catch(() => ({}));
    if (r.ok) return j;
    const msg = j.error?.message || `Embedding request failed (${r.status})`;
    if ((r.status === 429 || r.status === 503) && attempt < tries) {
      const m = /retry in ([\d.]+)s/i.exec(msg);
      const secs = Math.min(m ? Math.ceil(Number(m[1])) : 20, 60);
      log(`Embedding rate limit. Waiting ${secs + 2}s (attempt ${attempt + 1} of ${tries})...`);
      await sleep((secs + 2) * 1000);
      continue;
    }
    throw new Error(msg);
  }
}

let embedder = null;                         // tests can replace this
export const _setEmbedder = fn => { embedder = fn; };

export async function embed(texts, taskType) {
  if (embedder) return embedder(texts, taskType);
  const out = [];
  for (let i = 0; i < texts.length; i += BATCH) {
    const slice = texts.slice(i, i + BATCH);
    const model = EMBED_MODEL();
    const j = await post(`${BASE()}/models/${model}:batchEmbedContents`, {
      requests: slice.map(t => ({ model: `models/${model}`, content: { parts: [{ text: t }] }, taskType, outputDimensionality: DIM })),
    });
    const got = j.embeddings || [];
    if (got.length !== slice.length) throw new Error('Embedding service returned an unexpected number of vectors.');
    for (const e of got) out.push(normalize(e.values));
  }
  return out;
}

// ---------- 4. storage ----------
export function initRag(db) {
  db.exec(`
CREATE TABLE IF NOT EXISTS chunks (id INTEGER PRIMARY KEY AUTOINCREMENT, roll TEXT NOT NULL, subject TEXT NOT NULL, file TEXT NOT NULL, p1 INTEGER, p2 INTEGER, text TEXT NOT NULL, vec BLOB NOT NULL);
CREATE INDEX IF NOT EXISTS chunks_by_user ON chunks (roll, subject);
`);
}

// Index every course file of one subject. Replaces the older index of that subject.
export async function indexFiles(db, roll, subject, files) {
  const key = subjectKey(subject);
  if (!key) return 0;
  const rows = [];
  for (const f of files) {
    const pages = await extractPages(f);
    const words = pages.reduce((n, p) => n + p.text.split(/\s+/).filter(Boolean).length, 0);
    if (words < 50) { log(`${f.name}: almost no text found (scanned PDF?), skipped.`); continue; }
    const chunks = chunkPages(pages);
    log(`${f.name}: ${pages.length} pages, ${chunks.length} chunks. Embedding...`);
    const vecs = await embed(chunks.map(c => c.text), 'RETRIEVAL_DOCUMENT');
    chunks.forEach((c, i) => rows.push({ file: f.name, ...c, vec: vecs[i] }));
  }
  if (!rows.length) return 0;
  const ins = db.prepare('INSERT INTO chunks (roll, subject, file, p1, p2, text, vec) VALUES (?, ?, ?, ?, ?, ?, ?)');
  db.exec('BEGIN');
  try {
    db.prepare('DELETE FROM chunks WHERE roll = ? AND subject = ?').run(roll, key);
    for (const r of rows) ins.run(roll, key, r.file, r.p1, r.p2, r.text, toBlob(r.vec));
    db.exec('COMMIT');
  } catch (e) { db.exec('ROLLBACK'); throw e; }
  log(`Indexed ${rows.length} chunks for ${roll} / ${key}.`);
  return rows.length;
}

// ---------- 5. retrieval ----------
const words = s => [...new Set(String(s).toLowerCase().match(/[a-z0-9+#]{4,}/g) || [])];

// Cosine similarity (vectors are normalised) plus a small bonus for exact keyword matches,
// so rare terms such as "semaphore" or "B+ tree" are not lost.
export async function retrieve(db, roll, subject, question, k = TOP_K) {
  const key = subjectKey(subject);
  const rows = db.prepare('SELECT file, p1, p2, text, vec FROM chunks WHERE roll = ? AND subject = ?').all(roll, key);
  if (!rows.length) return [];
  const [q] = await embed([String(question).slice(0, 2000)], 'RETRIEVAL_QUERY');
  const qw = words(question);
  return rows.map(r => {
    const t = r.text.toLowerCase();
    const hits = qw.filter(w => t.includes(w)).length;
    return { file: r.file, p1: r.p1, p2: r.p2, text: r.text, score: dot(q, fromBlob(r.vec)) + Math.min(hits * 0.02, 0.1) };
  }).sort((a, b) => b.score - a.score).slice(0, k);
}

export const buildContext = hits => hits.map((h, i) =>
  `[Source ${i + 1}: ${h.file}, ${h.p1 === h.p2 ? 'page ' + h.p1 : 'pages ' + h.p1 + '-' + h.p2}]\n${h.text}`).join('\n\n---\n\n');

export const sourcesMarkdown = hits => !hits.length ? '' :
  '\n\n---\n**Sources used:**\n' + hits.map((h, i) =>
    `${i + 1}. ${h.file}, ${h.p1 === h.p2 ? 'page ' + h.p1 : 'pages ' + h.p1 + '-' + h.p2}`).join('\n');

// ---------- 6. evaluation ----------
// cases: [{ q: "question", file: "notes.pdf" (optional), page: 14 }]
// Reports how often the page that holds the answer appears in the top-k retrieved chunks.
export async function evaluate(db, roll, subject, cases, k = 5) {
  let hit = 0, firstRank = 0;
  const rows = [];
  for (const c of cases) {
    const got = await retrieve(db, roll, subject, c.q, k);
    const rank = got.findIndex(h => (!c.file || h.file === c.file) && c.page >= h.p1 && c.page <= h.p2);
    if (rank >= 0) { hit++; firstRank += rank + 1; }
    rows.push({ q: c.q, found: rank >= 0, rank: rank >= 0 ? rank + 1 : null });
  }
  return { total: cases.length, hit, hitRate: cases.length ? hit / cases.length : 0, meanRank: hit ? firstRank / hit : null, rows };
}