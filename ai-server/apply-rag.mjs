// Run once from the ai-server folder:  node apply-rag.mjs
// It backs up server.js to server.backup.js, then makes 7 small edits. If anything looks different from
// what it expects, it stops without changing the file.
import fs from 'node:fs';

const FILE = 'server.js';
if (!fs.existsSync(FILE)) { console.error('server.js not found. Run this from the ai-server folder.'); process.exit(1); }
let src = fs.readFileSync(FILE, 'utf8');
if (src.includes("from './rag.js'")) { console.log('server.js already uses rag.js. Nothing to do.'); process.exit(0); }

const edits = [
  [
    "import { DatabaseSync } from 'node:sqlite';",
    "import { DatabaseSync } from 'node:sqlite';\nimport { initRag, indexFiles, retrieve, buildContext, sourcesMarkdown } from './rag.js';",
  ],
  [
    "const here = path.dirname(fileURLToPath(import.meta.url));",
    "initRag(db);\nconst here = path.dirname(fileURLToPath(import.meta.url));",
  ],
  [
    "res.json(merged);",
    "res.json(merged);\n    // Index the course PDFs for chat. Runs after the answer is sent, and its errors never reach the student.\n    indexFiles(db, req.user.roll, subject, notes).catch(e => log('Indexing failed: ' + e.message));",
  ],
  [
    "const { subject, notes, question } = req.body;",
    "const { subject, notes, question } = req.body;\n" +
    "    let hits = [];\n" +
    "    try { hits = await retrieve(db, req.user.roll, subject, question); } catch (e) { log('Retrieval failed, using the notes instead: ' + e.message); }\n" +
    "    const ctx = hits.length ? buildContext(hits) : String(notes || '').slice(0, 120000);\n" +
    "    const srcMd = sourcesMarkdown(hits);",
  ],
  [
    "${String(notes || '').slice(0, 120000)}",
    "${ctx}",
  ],
  [
    "res.json({ answer: await gemini([{ text: prompt }], false) });",
    "res.json({ answer: (await gemini([{ text: prompt }], false)) + srcMd });",
  ],
  [
    "- If the student asks for a particular style, follow it.",
    "- If the student asks for a particular style, follow it.\n- When the notes are labelled [Source n], base the answer on them and mention which source you used, like (Source 2).",
  ],
];

// Every anchor must appear exactly once in the ORIGINAL file.
for (const [from] of edits) {
  const n = src.split(from).length - 1;
  if (n !== 1) {
    console.error(`Stopped. Expected to find this exactly once but found it ${n} times:\n  ${from}\nserver.js was NOT changed. Send me this message.`);
    process.exit(1);
  }
}

if (!fs.existsSync('server.backup.js')) fs.writeFileSync('server.backup.js', src);
for (const [from, to] of edits) src = src.split(from).join(to);
fs.writeFileSync(FILE, src);
console.log('Done. server.js now uses RAG for chat. The old version is saved as server.backup.js.');