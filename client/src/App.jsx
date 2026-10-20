import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';

// ================= DATA (edit here) =================
// On your computer the generator runs on port 3100. When hosted online, the website and server share one address.
const MAX_MB = 10; // total size of files per processing run (kept small for a small hosted server)
const API = import.meta.env.DEV ? 'http://localhost:3100' : '';
// Talks to the generator server and sends the student's login token with every request.
async function api(path, opts = {}) {
  const r = await fetch(API + path, { ...opts, headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + (localStorage.getItem('examsprint_token') || ''), ...(opts.headers || {}) } });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) { const e = new Error(j.error || 'Request failed'); e.status = r.status; throw e; }
  return j;
}
const mk = l => l.map(([code, name, papers]) => ({ code, name, papers }));
const OS = {
  code: 'CS20002', name: 'Operating Systems', papers: 20,
  units: [
    { title: 'Unit 1: Introduction & Process Management', points: [
      'OS functions: resource allocator, control program, abstract machine.',
      'Dual-mode operation: user mode (bit 1) and kernel mode (bit 0).',
      'Process: program in execution. Segments: text, stack, data, heap.',
      'PCB holds state, PID, PC, CPU registers, scheduling info, memory limits, open files.',
      'State transition: New → Ready → Running → Waiting → Terminated.',
      'Threads share address space, globals, code and open files; each has its own stack, PC and registers.',
      'Context switch: save PCB of current process, restore PCB of next. Pure overhead.'] },
    { title: 'Unit 2: CPU Scheduling & Synchronization', points: [
      'FCFS is simple but suffers from the convoy effect.',
      'SJF gives the best average waiting time but needs burst prediction.',
      'Round Robin uses a time quantum and gives good response time.',
      'Critical section needs mutual exclusion, progress and bounded waiting.',
      'Semaphores use wait() and signal(); binary and counting types.'] },
    { title: 'Unit 3: Memory Management & Virtual Memory', points: [
      'Paging removes external fragmentation; the page table maps page to frame.',
      'Segmentation follows the user\'s logical view of memory.',
      'Page replacement: FIFO, LRU, Optimal. FIFO can show Belady\'s anomaly.',
      'Thrashing: more time spent paging than executing.'] },
  ],
  topics: [
    { keys: ['process', 'pcb'], plain: 'A process is a program in execution. The OS tracks it with a PCB holding its state, PID, program counter and registers.', simple: 'A program is a recipe in a book. A process is you actually cooking it. The PCB is a sticky note saying which step you are on, so someone else can take over and continue.' },
    { keys: ['thread'], plain: 'A thread is a lightweight unit of execution inside a process. Threads share code, data and files but have their own stack and registers.', simple: 'A process is a kitchen. Threads are cooks in that kitchen: they share the fridge and stove, but each cook has their own cutting board.' },
    { keys: ['context switch'], plain: 'The OS saves the PCB of the running process and loads the PCB of the next one. It does no useful work itself.', simple: 'It is bookmarking your page, putting the book down, and opening your friend\'s book at their bookmark. Time spent swapping is time not reading.' },
    { keys: ['deadlock'], plain: 'Deadlock needs mutual exclusion, hold and wait, no preemption and circular wait, all at once.', simple: 'Two kids each hold one crayon and both want the other\'s. Neither gives up, so nobody can draw.' },
    { keys: ['thrashing', 'paging', 'page'], plain: 'Paging splits memory into fixed frames. Thrashing happens when the system spends more time swapping pages than running.', simple: 'Your desk fits only 4 books but you need 6, so you keep swapping them with the shelf and never finish homework.' },
  ],
  pyqs: {
    2: [
      { q: 'Define context switch.', a: 'Saving the state of the current process and restoring the state of the next scheduled process.', rep: 4 },
      { q: 'What is Belady\'s anomaly?', a: 'With FIFO replacement, more frames can cause more page faults.', rep: 3 },
    ],
    5: [
      { q: 'Differentiate between process and thread.', a: 'Process: heavyweight, own address space, costly switch. Thread: lightweight, shares address space, cheap switch. Draw a 3-column table.', rep: 5 },
      { q: 'Explain the process state diagram.', a: 'New → Ready → Running → Waiting → Ready, Running → Terminated. Draw the diagram and label each transition.', rep: 4 },
    ],
    10: [
      { q: 'Explain Round Robin scheduling with a Gantt chart and average waiting time.', a: 'Marking scheme: definition (1), quantum rule (2), Gantt chart (3), waiting time table (3), average (1).', rep: 4 },
    ],
  },
  ones: ['Kernel mode runs privileged instructions.', 'PCB = Process Control Block.', 'SJF gives minimum average waiting time.', 'Thrashing = excessive paging.', 'Deadlock needs 4 conditions together.', 'Context switch is pure overhead.', 'Semaphore operations: wait() and signal().'],
  derivs: [{ title: 'Average waiting time in Round Robin', steps: [
    'Given P1, P2, P3 with burst 24, 3, 3 and quantum 4.',
    'Gantt: P1 0–4, P2 4–7, P3 7–10, P1 10–30.',
    'Waiting = finish − burst − arrival.',
    'P1 = 30 − 24 = 6, P2 = 7 − 3 = 4, P3 = 10 − 3 = 7.',
    'Average = (6 + 4 + 7) / 3 = 5.67 ms.'] }],
  diagrams: [
    { title: 'Process state transition diagram', draw: 'Five circles: New, Ready, Running, Waiting, Terminated. Arrows: admitted, dispatch, interrupt, I/O wait, I/O done, exit. Label every arrow.' },
    { title: 'Paging address translation', draw: 'CPU box → logical address (p, d) → page table → frame f → physical address (f, d) → memory.' },
  ],
};
const S1 = mk([['PH10001', 'Physics', 15], ['MA11001', 'Differential Equations & Linear Algebra', 7], ['LS10001', 'Science of Living Systems', 14], ['CH10003', 'Environmental Science', 7], ['EE10001', 'Elements of Machine Learning', 3], ['ME10001', 'Engineering Mechanics', 1], ['EC10003', 'Biomedical Engineering', 1], ['EE10003', 'Basic Instrumentation', 1], ['CH10005', 'Nanoscience', 1], ['PH10003', 'Smart Materials', 1], ['LS10003', 'Molecular Diagnostics', 5], ['PE10002', 'Science of Public Health', 5], ['MA10003', 'Optimization Techniques', 6]]);
const S2 = mk([['CH10001', 'Chemistry', 18], ['MA11002', 'Transform Calculus & Numerical Analysis', 7], ['HS10001', 'English', 17], ['EC10001', 'Basic Electronics', 13], ['CE10001', 'Basic Civil Engineering', 5], ['ME10003', 'Basic Mechanical Engineering', 5], ['EE10002', 'Basic Electrical Engineering', 17], ['HS10013', 'Society, Science, and Technology', 2], ['HS10202', 'Essential of Management', 1], ['HS10102', 'Shades of Economics', 1], ['HS10123', 'India Economy Post Liberalisation', 0], ['SO10043', 'Socio-Political Environment', 0], ['PS10043', 'Thinking Perspectives', 0], ['PS10045', 'Creativity, Innovation and Entrepreneurship', 0], ['EX17001', 'Community/Environment-based Project', 0]]);
const S3 = mk([['EX20003', 'Scientific and Technical Writing', 5], ['MA21001', 'Probability and Statistics', 9], ['EX20001', 'Industry 4.0 Technologies', 6], ['CS21001', 'Data Structures', 12], ['EC20005', 'Digital Systems Design', 4], ['CS21003', 'Automata Theory and Formal Languages', 7], ['HS20220', 'Organizational Behavior', 5], ['HS20120', 'Economics of Development', 8], ['HS20122', 'International Economic Cooperation', 7]]);
const S4 = mk([['EX20003', 'Scientific and Technical Writing', 5], ['MA21002', 'Discrete Structures', 11], ['CS20002', 'Operating Systems', 20], ['CS20004', 'Object Oriented Programming in JAVA', 14], ['CS20006', 'Database Management Systems', 24], ['CS21002', 'Computer Organization and Architecture', 13], ['HS20220', 'Organizational Behavior', 5], ['HS20120', 'Economics of Development', 8], ['HS20122', 'International Economic Cooperation', 7]]).map(x => x.code === 'CS20002' ? { ...OS, ...x } : x);
const S5 = mk([['CS31001', 'Software Engineering', 10], ['CS30003', 'Computer Networks', 10], ['CS30001', 'Design & Analysis of Algorithms', 13], ['HS30101', 'Engineering Economics & Costing', 12], ['CS30009', 'Distributed Operating Systems', 5], ['CS30011', 'Computational Intelligence', 10], ['CS30005', 'High Performance Computing', 6], ['EC30007', 'ARM and Advanced Microprocessors', 2], ['CS30007', 'Multi-Core Programming', 0], ['CM30006', 'Compiler', 8], ['CS30013', 'Data Mining and Data Warehousing', 8]]);
const S6 = mk([['CS31002', 'Machine Learning', 20], ['CS30002', 'Artificial Intelligence', 17], ['HS30401', 'Universal Human Values', 8], ['CS30010', 'Cloud Computing', 11], ['CS30026', 'Computer Vision', 0], ['CS30012', 'Software Project Management', 10], ['CS30014', 'Time Series Forecasting', 0], ['CS30016', 'Natural Language Processing', 10]]);
const S7 = mk([['EX40003', 'Engineering Professional Practice', 0], ['CS40001', 'Deep Learning Techniques', 1], ['CS40003', 'Software Testing and Automation', 0], ['CS40005', 'Human Computer Interaction', 2], ['CS40007', 'Computer Graphics and Multimedia Systems', 5], ['CS40009', 'Principles of Cryptography', 3]]);
// Semester 8 is not announced yet: students add their own subjects with the "Add subject" button.
const SUBJECTS = { 'CSE-1': S1, 'CSE-2': S2, 'CSE-3': S3, 'CSE-4': S4, 'CSE-5': S5, 'CSE-6': S6, 'CSE-7': S7 };
const BRANCHES = ['CSE', 'CSCE', 'CSSE', 'IT', 'ETC', 'EEE'];
const MATERIALS = [['pdf', 'Course PDFs / lecture notes (required, add as many as you like)'], ['pyq', 'Previous year question papers (optional)'], ['handout', 'Course handout / syllabus (optional)']];
const WINDOWS = [['notes', 'Summarised notes', 'Revision notes and a chat for your doubts'], ['questions', 'Important questions', '2, 5 and 10 mark questions from PYQs'], ['ones', 'Last-minute 1-markers', 'Quick bullets for the exam hall'], ['derivs', 'Derivations & diagrams', 'Proofs and what to draw']];

// ================= small pieces =================
const Top = ({ user, onLogout }) => (
  <div className="top"><div className="brand">Exam<span>Sprint</span></div>
    {user && <button className="link" onClick={onLogout}>{user.name} ({user.roll}) · Log out</button>}</div>
);
const Empty = ({ children }) => <div className="card empty">{children}</div>;
const NEED = 'No content loaded for this subject yet. Upload your material and process it first.';

function Reveal({ q, a, rep }) {
  const [o, setO] = useState(false);
  return (<div className="card"><div className="q"><span>{q}</span>{rep && <span className="badge">Asked {rep}×</span>}</div>
    {o && <div className="ans">{a}</div>}<button className="link" onClick={() => setO(!o)}>{o ? 'Hide answer' : 'Show answer'}</button></div>);
}

// ================= upload -> process -> study =================
const pick = x => ({ units: x.units, topics: x.topics, pyqs: x.pyqs, ones: x.ones, derivs: x.derivs, diagrams: x.diagrams });
// Saves uploaded files in the browser (IndexedDB) so they survive a refresh.
const idb = (mode, fn) => new Promise((res, rej) => {
  const o = indexedDB.open('examsprint', 1);
  o.onupgradeneeded = () => o.result.createObjectStore('kv');
  o.onsuccess = () => { const t = o.result.transaction('kv', mode); const r = fn(t.objectStore('kv')); t.oncomplete = () => { o.result.close(); res(r.result); }; t.onerror = () => rej(t.error); };
  o.onerror = () => rej(o.error);
});
const kvGet = k => idb('readonly', st => st.get(k));
const kvSet = (k, v) => idb('readwrite', st => st.put(v, k));

// Sends every uploaded file to the generator server. If it is not running, demo content is used for Operating Systems only.
async function generate(subject, files) {
  const list = Object.entries(files).flatMap(([slot, arr]) => arr.map(f => ({ slot, ...f })));
  try { return await api('/api/generate', { method: 'POST', body: JSON.stringify({ subject: subject.name, code: subject.code, files: list }) }); }
  catch (e) { if (e.status) throw e; /* no status means the server is not running */ }
  if (import.meta.env.DEV && subject.units) return pick(subject); // demo content only on your own computer
  throw new Error('Could not reach the server. It may be waking up, which can take up to a minute. Please wait a moment and press Process again. Your files are saved.');
}

function Work({ subject, onOpen }) {
  const key = subject.code || subject.name;
  const sk = 'gen_' + key.replace(/[^A-Za-z0-9_.-]/g, '_');
  const [files, setFiles] = useState({ pdf: [], pyq: [], handout: [] });
  const [gen, setGen] = useState(() => { try { return JSON.parse(localStorage.getItem('examsprint_gen_' + key)); } catch { return null; } });
  const [busy, setBusy] = useState(false); const [err, setErr] = useState('');
  useEffect(() => { kvGet('files_' + key).then(v => v && setFiles(v)).catch(() => {}); }, [key]);
  useEffect(() => { api('/api/state/' + sk).then(j => { if (j.value) { setGen(j.value); localStorage.setItem('examsprint_gen_' + key, JSON.stringify(j.value)); } }).catch(() => {}); }, [sk]);
  const persist = next => { setFiles(next); kvSet('files_' + key, next).catch(() => {}); };
  const read = f => new Promise(res => { const r = new FileReader(); r.onload = () => res({ name: f.name, mime: f.type || (f.name.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'text/plain'), data: String(r.result).split(',')[1] || '' }); r.readAsDataURL(f); });
  const add = async (slot, list) => { const added = await Promise.all([...list].map(read)); const have = new Set(files[slot].map(x => x.name)); persist({ ...files, [slot]: [...files[slot], ...added.filter(x => !have.has(x.name))] }); };
  const remove = (slot, name) => persist({ ...files, [slot]: files[slot].filter(x => x.name !== name) });
  const mb = Object.values(files).flat().reduce((n, f) => n + f.data.length * 0.75, 0) / 1e6;
  const ready = files.pdf.length > 0 && mb < MAX_MB;
  const run = async () => {
    setBusy(true); setErr('');
    try { const g = await generate(subject, files); localStorage.setItem('examsprint_gen_' + key, JSON.stringify(g)); setGen(g); api('/api/state/' + sk, { method: 'PUT', body: JSON.stringify({ value: g }) }).catch(() => {}); }
    catch (e) { setErr(e.message); }
    setBusy(false);
  };
  return (<>
    <h2>Step 1: Upload your course material</h2>
    <p className="sub">Upload as many PDFs as you need. Everything you upload is processed together, and the results come only from these files.</p>
    {MATERIALS.map(([k, label]) => (
      <div className="card" key={k}><b>{label}</b>
        {files[k].map(f => <div key={f.name} className="q" style={{ fontWeight: 400, marginTop: 6 }}><span>{f.name}</span><button className="link" onClick={() => remove(k, f.name)}>Remove</button></div>)}
        <input type="file" multiple accept=".pdf,.txt,.md" style={{ marginTop: 10, marginBottom: 0 }} onChange={e => { add(k, e.target.files); e.target.value = ''; }} />
      </div>))}
    <p className="sub">{files.pdf.length} course PDF(s) added · {mb.toFixed(1)} MB in total (limit about {MAX_MB} MB per run). Without question papers, practice questions are written from your notes instead.</p>
    {err && <p style={{ color: '#f87171', marginBottom: 12 }}>{err}</p>}
    <button className="primary" disabled={!ready || busy} onClick={run} style={!ready || busy ? { opacity: .5, cursor: 'not-allowed' } : {}}>
      {busy ? 'Processing... this can take a few minutes' : gen ? 'Process again' : 'Process my material'}</button>
    {!files.pdf.length && <p className="sub" style={{ marginTop: 8 }}>Add at least one course PDF to continue.</p>}
    {mb >= MAX_MB && <p className="sub" style={{ marginTop: 8 }}>Too much at once. Remove a few files and process in two rounds.</p>}
    {gen && <><h2>Step 2: Your study material is ready</h2>
      <div className="grid4">{WINDOWS.map(([k, t, d]) => <button key={k} className="big" onClick={() => onOpen(k, gen)}>{t}<small>{d}</small></button>)}</div></>}
  </>);
}

// ================= formatted text + drawn diagrams =================
// Draws a Mermaid diagram (flowchart, state diagram, etc.). If the diagram code is invalid, the code is shown instead.
function Mermaid({ chart }) {
  const [svg, setSvg] = useState(''); const [bad, setBad] = useState(false);
  useEffect(() => {
    let live = true; setSvg(''); setBad(false);
    const id = 'mm' + Math.random().toString(36).slice(2);
    (async () => {
      try {
        const m = (await import('mermaid')).default;
        m.initialize({ startOnLoad: false, theme: 'dark', securityLevel: 'strict' });
        const out = await m.render(id, chart);
        if (live) setSvg(out.svg);
      } catch { document.getElementById('d' + id)?.remove(); if (live) setBad(true); }
    })();
    return () => { live = false; };
  }, [chart]);
  if (bad) return <pre className="codeblock">{chart}</pre>;
  return svg ? <div className="diagram" dangerouslySetInnerHTML={{ __html: svg }} /> : <p className="sub">Drawing diagram...</p>;
}

function Md({ text }) {
  return (<ReactMarkdown components={{
    pre: ({ children }) => <>{children}</>,
    code: ({ className, children }) => {
      const t = String(children).replace(/\n$/, '');
      if (/language-mermaid/.test(className || '')) return <Mermaid chart={t} />;
      return className || t.includes('\n') ? <pre className="codeblock"><code>{t}</code></pre> : <code>{children}</code>;
    },
  }}>{text}</ReactMarkdown>);
}

// ================= windows =================
function Notes({ s }) {
  const [q, setQ] = useState(''); const [msgs, setMsgs] = useState([]); const [busy, setBusy] = useState(false);
  if (!s.units) return <Empty>{NEED}</Empty>;
  const notes = s.units.map(u => u.title + ': ' + u.points.join(' ')).join('\n');
  const SIMPLE = ['10 year', '10-year', 'ten year', 'child', 'kid', 'five year', '5 year', 'simple', 'eli5', 'eli10', 'easy words', 'layman'];
  const offline = text => {
    const low = text.toLowerCase();
    const t = (s.topics || []).find(x => (x.keys || []).some(k => low.includes(k.toLowerCase())));
    return t ? (SIMPLE.some(w => low.includes(w)) ? t.simple : t.plain) : 'I could not reach the server right now. Please try again in a moment.';
  };
  const ask = async () => {
    const text = q.trim(); if (!text || busy) return;
    setQ(''); setBusy(true);
    let reply = '';
    try {
      const j = await api('/api/chat', { method: 'POST', body: JSON.stringify({ subject: s.name, notes, question: text }) });
      reply = j.answer || '';
    } catch (e) { if (e.status) reply = e.message; /* no status: server not running */ }
    setMsgs(m => [...m, { who: 'you', text }, { who: 'bot', text: reply || offline(text) }]); setBusy(false);
  };
  return (<>
    {s.units.map((u, i) => <div className="card" key={i}><h2 style={{ marginTop: 0 }}>{u.title}</h2>{u.source && <p className="sub" style={{ margin: "-6px 0 6px", fontSize: ".8rem" }}>From: {u.source}</p>}<ul className="pts">{u.points.map((p, i) => <li key={i}>{p}</li>)}</ul>{u.diagram && <Mermaid chart={u.diagram} />}</div>)}
    <div className="card"><h2 style={{ marginTop: 0 }}>Chat with your notes</h2>
      <p className="sub" style={{ marginBottom: 10 }}>Ask anything about your notes.</p>
      {msgs.map((m, i) => <div className="bubble" key={i} style={m.who === 'you' ? { borderColor: 'var(--accent)' } : {}}><b>{m.who === 'you' ? 'You' : 'Notes assistant'}</b>{m.who === 'you' ? <span>: {m.text}</span> : <div className="md"><Md text={m.text} /></div>}</div>)}
      <input value={q} onChange={e => setQ(e.target.value)} onKeyDown={e => e.key === 'Enter' && ask()} placeholder="Type your question..." />
      <button className="primary" disabled={busy} onClick={ask}>{busy ? 'Thinking...' : 'Ask'}</button></div></>);
}
function Questions({ s }) {
  if (!s.pyqs) return <Empty>{NEED}</Empty>;
  if ([2, 5, 10].every(m => !(s.pyqs[m] || []).length)) return <Empty>No questions found. Upload the previous year papers and press Process again.</Empty>;
  return (<>{s.pyqSource === 'notes' && <div className="card tip">No previous year papers were uploaded, so these practice questions are based on your notes only. Upload papers and process again for real repeated questions.</div>}
    {[2, 5, 10].map(m => (s.pyqs[m] || []).length > 0 && (<div key={m}><h2>{m}-mark questions</h2>{s.pyqs[m].map((x, i) => <Reveal key={i} {...x} />)}</div>))}</>);
}
function Ones({ s }) {
  if (!s.ones) return <Empty>{NEED}</Empty>;
  return <div className="card"><ul className="pts">{s.ones.map((o, i) => <li key={i}>{o}</li>)}</ul></div>;
}
function Derivs({ s }) {
  if (!s.derivs) return <Empty>{NEED}</Empty>;
  return (<><h2>Derivations</h2>{s.derivs.map(d => <div className="card" key={d.title}><b>{d.title}</b>{d.steps.map((t, i) => <div className="step" key={i}>{t}</div>)}</div>)}
    <h2>Diagrams to draw</h2>{s.diagrams.map(d => <div className="card" key={d.title}><b>{d.title}</b>{d.mermaid && <Mermaid chart={d.mermaid} />}<p className="sub" style={{ margin: '6px 0 0' }}>{d.draw}</p></div>)}</>);
}
const VIEW = { notes: Notes, questions: Questions, ones: Ones, derivs: Derivs };

// ================= signup / login (accounts are stored on the server) =================
function Auth({ onDone }) {
  const [mode, setMode] = useState('signup');
  const [f, setF] = useState({ name: '', roll: '', pw: '', pw2: '' });
  const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);
  const set = k => e => setF({ ...f, [k]: e.target.value });
  const submit = async () => {
    setErr('');
    const roll = f.roll.trim(), name = f.name.trim();
    if (!roll || !f.pw) return setErr('Please enter your roll number and password.');
    if (mode === 'signup') {
      if (!name) return setErr('Please enter your name.');
      if (f.pw.length < 6) return setErr('Password must be at least 6 characters.');
      if (f.pw !== f.pw2) return setErr('Passwords do not match.');
    }
    setBusy(true);
    try {
      const j = await api('/api/' + mode, { method: 'POST', body: JSON.stringify(mode === 'signup' ? { name, roll, password: f.pw } : { roll, password: f.pw }) });
      localStorage.setItem('examsprint_token', j.token); localStorage.setItem('examsprint_user', JSON.stringify(j.user));
      onDone(j.user);
    } catch (e) { setErr(e.status ? e.message : 'Could not reach the server. It may be waking up, which can take up to a minute. Please try again shortly.'); }
    setBusy(false);
  };
  const key = e => e.key === 'Enter' && submit();
  return (<div className="wrap" style={{ maxWidth: 420, paddingTop: 60 }}><Top />
    <h1>{mode === 'signup' ? 'Create your account' : 'Welcome back'}</h1>
    <p className="sub">{mode === 'signup' ? 'Sign up once with your roll number, then log in from any device.' : 'Log in with your roll number and password.'}</p>
    {mode === 'signup' && <><label>Full name</label><input value={f.name} onChange={set('name')} onKeyDown={key} placeholder="Your name" /></>}
    <label>Roll number</label><input value={f.roll} onChange={set('roll')} onKeyDown={key} placeholder="e.g. 24051508" />
    <label>Password</label><input type="password" value={f.pw} onChange={set('pw')} onKeyDown={key} placeholder="At least 6 characters" />
    {mode === 'signup' && <><label>Confirm password</label><input type="password" value={f.pw2} onChange={set('pw2')} onKeyDown={key} /></>}
    {err && <p style={{ color: '#f87171', marginBottom: 12 }}>{err}</p>}
    <button className="primary" disabled={busy} onClick={submit}>{busy ? 'Please wait...' : mode === 'signup' ? 'Sign up' : 'Log in'}</button>
    <p className="sub" style={{ marginTop: 16 }}>{mode === 'signup' ? 'Already have an account? ' : 'New here? '}
      <button className="link" style={{ color: 'var(--accent)' }} onClick={() => { setMode(mode === 'signup' ? 'login' : 'signup'); setErr(''); }}>{mode === 'signup' ? 'Log in' : 'Sign up'}</button></p>
  </div>);
}

function AddSubject({ onAdd }) {
  const [open, setOpen] = useState(false); const [name, setName] = useState(''); const [code, setCode] = useState('');
  const add = () => { if (!name.trim()) return; onAdd({ name: name.trim(), code: code.trim(), papers: 0 }); setName(''); setCode(''); setOpen(false); };
  if (!open) return <button onClick={() => setOpen(true)}>+ Add subject</button>;
  return (<div className="card"><label>Subject name</label><input value={name} onChange={e => setName(e.target.value)} onKeyDown={e => e.key === 'Enter' && add()} placeholder="e.g. Big Data Analytics" />
    <label>Subject code (optional)</label><input value={code} onChange={e => setCode(e.target.value)} placeholder="e.g. CS40011" />
    <div className="row" style={{ marginBottom: 0 }}><button className="primary" onClick={add}>Add</button><button onClick={() => setOpen(false)}>Cancel</button></div></div>);
}

// ================= app =================
export default function App() {
  const [user, setUser] = useState(() => { try { return JSON.parse(localStorage.getItem('examsprint_user')); } catch { return null; } });
  const [screen, setScreen] = useState('pick');
  const [branch, setBranch] = useState('CSE');
  const [sem, setSem] = useState(4);
  const [subject, setSubject] = useState(null);
  const [win, setWin] = useState(null);
  const [gen, setGen] = useState(null);
  const [custom, setCustom] = useState(() => { try { return JSON.parse(localStorage.getItem('examsprint_custom')) || {}; } catch { return {}; } });

  const logout = () => {
    api('/api/logout', { method: 'POST' }).catch(() => {}).finally(() => {
      Object.keys(localStorage).filter(k => k.startsWith('examsprint_')).forEach(k => localStorage.removeItem(k));
      indexedDB.deleteDatabase('examsprint');
      window.location.reload();
    });
  };
  useEffect(() => {
    if (!user) return;
    api('/api/me').then(j => setUser(j.user)).catch(e => { if (e.status === 401) { localStorage.removeItem('examsprint_user'); localStorage.removeItem('examsprint_token'); setUser(null); } });
    api('/api/state/custom').then(j => j.value && setCustom(j.value)).catch(() => {});
  }, [user?.roll]);

  // ----- Browser Back / Forward buttons move one screen at a time inside the app -----
  const snap = (scr, subj, w) => ({ app: 1, screen: scr, branch, sem, sub: subj ? { name: subj.name, code: subj.code } : null, win: w || null });
  const go = (scr, subj, w) => { history.pushState(snap(scr, subj, w), ''); setScreen(scr); };
  useEffect(() => { history.replaceState(snap('pick'), ''); }, []);
  useEffect(() => {
    const onPop = e => {
      const st = e.state;
      if (!st || !st.app || st.screen === 'pick') { if (st && st.app) { setBranch(st.branch); setSem(st.sem); } setScreen('pick'); return; }
      const ck = `${st.branch}-${st.sem}`;
      const list = [...(SUBJECTS[ck] || []), ...(custom[ck] || []).map(x => ({ ...x, custom: true }))];
      const found = list.find(x => x.name === st.sub?.name && x.code === st.sub?.code);
      if (!found) { setScreen('pick'); return; }
      setBranch(st.branch); setSem(st.sem); setSubject(found);
      if (st.screen === 'win') {
        let g = null; try { g = JSON.parse(localStorage.getItem('examsprint_gen_' + (found.code || found.name))); } catch { /* none saved */ }
        if (g) { setWin(st.win); setGen(g); setScreen('win'); } else setScreen('work');
      } else setScreen('work');
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [custom]);

  if (!user) return <Auth onDone={setUser} />;

  if (screen === 'pick') {
    const ck = `${branch}-${sem}`;
    const mine = custom[ck] || [];
    const list = [...(SUBJECTS[ck] || []), ...mine.map(x => ({ ...x, custom: true }))];
    const saveCustom = next => { setCustom(next); localStorage.setItem('examsprint_custom', JSON.stringify(next)); api('/api/state/custom', { method: 'PUT', body: JSON.stringify({ value: next }) }).catch(() => {}); };
    const addSub = x => saveCustom({ ...custom, [ck]: [...mine, x] });
    const delSub = name => saveCustom({ ...custom, [ck]: mine.filter(m => m.name !== name) });
    return (
    <div className="wrap"><Top user={user} onLogout={logout} /><h1>Choose your semester</h1><p className="sub">Your subjects appear below.</p>
      <div className="grid2"><div><label>Branch</label><select value={branch} onChange={e => setBranch(e.target.value)}>{BRANCHES.map(b => <option key={b}>{b}</option>)}</select></div>
        <div><label>Semester</label><select value={sem} onChange={e => setSem(+e.target.value)}>{[1, 2, 3, 4, 5, 6, 7, 8].map(n => <option key={n} value={n}>Semester {n}</option>)}</select></div></div>
      {list.length === 0 && <Empty>{sem === 8 ? 'Semester 8 subjects are not announced yet.' : `No subjects added for ${branch} Semester ${sem} yet.`} Use the Add subject button below.</Empty>}
      {list.map(x => (<React.Fragment key={x.name + x.code}>
        <button className="card subject" onClick={() => { setSubject(x); go('work', x); }}>
          <b>{x.name}</b><small>{x.code || 'No code'}{x.papers ? ` · ${x.papers} papers` : ''}</small></button>
        {x.custom && <button className="link" style={{ marginTop: -4, marginBottom: 10 }} onClick={() => delSub(x.name)}>Remove "{x.name}"</button>}
      </React.Fragment>))}
      <AddSubject onAdd={addSub} /></div>); }

  if (screen === 'work') return (<div className="wrap"><Top user={user} onLogout={logout} />
    <button className="link" onClick={() => history.back()}>← All subjects</button><h1>{subject.name}</h1><p className="sub">{subject.code}</p>
    <Work subject={subject} onOpen={(k, g) => { setWin(k); setGen(g); go('win', subject, k); }} /></div>);

  const View = VIEW[win]; const title = WINDOWS.find(w => w[0] === win)[1];
  return (<div className="wrap"><Top user={user} onLogout={logout} />
    <button className="link" onClick={() => history.back()}>← {subject.name}</button><h1>{title}</h1><p className="sub">{subject.name}</p><View s={{ ...subject, ...gen }} /></div>);
}