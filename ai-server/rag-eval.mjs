// Measure how well retrieval finds the right page in YOUR notes.
//   node rag-eval.mjs                         -> lists what is indexed (roll number and subject names)
//   node rag-eval.mjs <roll> "<subject>" cases.json [k]
// cases.json: [ { "q": "your question", "file": "notes.pdf", "page": 14 }, ... ]   ("file" is optional)
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';
import { evaluate, subjectKey } from './rag.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const db = new DatabaseSync(process.env.DB_PATH || path.join(here, 'examsprint.db'), { readOnly: true });
const [roll, subject, casesFile, kArg] = process.argv.slice(2);

if (!roll) {
  const rows = db.prepare('SELECT roll, subject, COUNT(*) AS chunks FROM chunks GROUP BY roll, subject').all();
  console.log(rows.length ? 'Indexed so far:' : 'Nothing is indexed yet. Press Process on the website first.');
  for (const r of rows) console.log(`  roll ${r.roll} | subject "${r.subject}" | ${r.chunks} chunks`);
  process.exit(0);
}
if (!subject || !casesFile) { console.error('Usage: node rag-eval.mjs <roll> "<subject>" cases.json [k]'); process.exit(1); }

const cases = JSON.parse(fs.readFileSync(casesFile, 'utf8'));
const k = Number(kArg) || 5;
const res = await evaluate(db, roll.toUpperCase(), subjectKey(subject), cases, k);
console.log('');
for (const r of res.rows) console.log(`${r.found ? 'FOUND ' : 'MISSED'}  ${r.rank ? 'rank ' + r.rank : '      '}  ${r.q}`);
console.log(`\nCorrect page in the top ${k} chunks for ${res.hit} of ${res.total} questions (${(res.hitRate * 100).toFixed(0)}%).`);
if (res.meanRank) console.log(`Average rank when found: ${res.meanRank.toFixed(1)}`);