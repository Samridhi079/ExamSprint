const express = require('express');
const router = express.Router();
const crypto = require('node:crypto');
const {
  KIIT_SCHOOLS,
  PRELOADED_SUBJECTS,
  generateContextSummary,
  analyzePyqsAndGenerateQuestions,
  generateOneMarkers,
  generateDerivationsAndDiagrams,
  chatWithNotes
} = require('../services/examEngine');

// Custom uploaded subjects stored in memory per session
const customSubjects = new Map();

// ─── GET /api/exams/schools ───────────────────────────────────────────────
router.get('/schools', (req, res) => {
  res.json({ schools: KIIT_SCHOOLS });
});

// ─── GET /api/exams/subjects ──────────────────────────────────────────────
router.get('/subjects', (req, res) => {
  const { branch, semester } = req.query;

  let all = Object.values(PRELOADED_SUBJECTS).map(s => ({
    id: s.id,
    name: s.name,
    code: s.code,
    school: s.school || 'SCE',
    branch: s.branch || 'CSE',
    branches: s.branches || ['CSE', 'CSCE', 'CSSE', 'IT'],
    semester: s.semester || 4,
    hasNotes: !!s.notesText,
    hasPyqs: !!s.pyqText,
    isPreloaded: true
  }));

  const custom = Array.from(customSubjects.values()).map(s => ({
    id: s.id,
    name: s.name,
    code: s.code || 'CUSTOM',
    school: s.school || 'SCE',
    branch: s.branch || 'CSE',
    branches: s.branches || [s.branch || 'CSE'],
    semester: s.semester || 4,
    hasNotes: !!s.notesText,
    hasPyqs: !!s.pyqText,
    isPreloaded: false
  }));

  let combined = [...all, ...custom];

  if (branch) {
    combined = combined.filter(s => {
      if (Array.isArray(s.branches)) return s.branches.includes(branch);
      return s.branch === branch;
    });
  }
  if (semester) {
    combined = combined.filter(s => s.semester === parseInt(semester, 10));
  }

  res.json({ subjects: combined, total: combined.length });
});

// ─── GET /api/exams/subjects/:id ─────────────────────────────────────────
router.get('/subjects/:id', (req, res) => {
  const s = PRELOADED_SUBJECTS[req.params.id] || customSubjects.get(req.params.id);
  if (!s) return res.status(404).json({ error: 'Subject not found' });
  res.json({
    id: s.id, name: s.name, code: s.code,
    school: s.school, branch: s.branch, semester: s.semester,
    notesText: s.notesText || '', pyqText: s.pyqText || '',
    handoutText: s.handoutText || ''
  });
});

// ─── POST /api/exams/upload-subject ──────────────────────────────────────
// Student uploads custom subject with PDF text, PYQ text, and/or handout text
router.post('/upload-subject', (req, res) => {
  const { name, code, branch, semester, notesText, pyqText, handoutText } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Subject name is required.' });
  }

  const id = 'custom-' + crypto.randomBytes(6).toString('hex');
  const subject = {
    id, name: name.trim(),
    code: code || 'CUSTOM',
    school: 'SCE',
    branch: branch || 'CSE',
    branches: [branch || 'CSE'],
    semester: parseInt(semester, 10) || 4,
    notesText: notesText || '',
    pyqText: pyqText || '',
    handoutText: handoutText || ''
  };

  customSubjects.set(id, subject);
  res.json({ success: true, subject: { id, name: subject.name, code: subject.code, semester: subject.semester } });
});

// ─── POST /api/exams/notes ───────────────────────────────────────────────
// Button 1: AI Summarized Notes (unit breakdown + comparison tables + flashcards)
router.post('/notes', (req, res) => {
  const { subjectId, subjectName, notesText } = req.body;
  let text = notesText;
  let title = subjectName || 'Exam Notes';

  if (!text && subjectId) {
    const s = PRELOADED_SUBJECTS[subjectId] || customSubjects.get(subjectId);
    if (s) { text = s.notesText; title = s.name; }
  }

  if (!text || !text.trim()) {
    return res.status(400).json({ error: 'No notes found. Please upload your course PDF or lecture notes.' });
  }

  const summary = generateContextSummary(text, title);
  res.json({ success: true, summary });
});

// ─── POST /api/exams/important-questions ────────────────────────────────
// Button 2: Important Questions from PYQs + Handout
router.post('/important-questions', (req, res) => {
  const { subjectId, subjectName, notesText, pyqText, handoutText } = req.body;
  let notes = notesText;
  let pyqs = pyqText;
  let handout = handoutText;
  let title = subjectName || 'Course Exam Prep';

  if (subjectId) {
    const s = PRELOADED_SUBJECTS[subjectId] || customSubjects.get(subjectId);
    if (s) {
      if (!notes) notes = s.notesText;
      if (!pyqs) pyqs = s.pyqText;
      if (!handout) handout = s.handoutText;
      title = s.name;
    }
  }

  const combinedPyqs = [pyqs, handout].filter(Boolean).join('\n\n');
  if (!combinedPyqs.trim()) {
    return res.status(400).json({ error: 'Please upload your PYQ paper or course handout first.' });
  }

  const analysis = analyzePyqsAndGenerateQuestions(notes || '', combinedPyqs, title);
  res.json({ success: true, analysis });
});

// ─── POST /api/exams/one-markers ─────────────────────────────────────────
// Button 3: Last-Minute 1-Marker Bullet Points
router.post('/one-markers', (req, res) => {
  const { subjectId, subjectName, notesText } = req.body;
  let text = notesText;
  let title = subjectName || 'Course';

  if (!text && subjectId) {
    const s = PRELOADED_SUBJECTS[subjectId] || customSubjects.get(subjectId);
    if (s) { text = s.notesText; title = s.name; }
  }

  const result = generateOneMarkers(title, text || '');
  res.json({ success: true, oneMarkers: result });
});

// ─── POST /api/exams/derivations ─────────────────────────────────────────
// Button 4: Important Derivations & Diagrams
router.post('/derivations', (req, res) => {
  const { subjectId, subjectName, notesText, pyqText } = req.body;
  let notes = notesText;
  let pyqs = pyqText;
  let title = subjectName || 'Course';

  if (subjectId) {
    const s = PRELOADED_SUBJECTS[subjectId] || customSubjects.get(subjectId);
    if (s) {
      if (!notes) notes = s.notesText;
      if (!pyqs) pyqs = s.pyqText;
      title = s.name;
    }
  }

  const result = generateDerivationsAndDiagrams(title, notes || '', pyqs || '');
  res.json({ success: true, derivations: result });
});

// ─── POST /api/exams/chat ─────────────────────────────────────────────────
// Chat with Notes (with ELI10 mode)
router.post('/chat', (req, res) => {
  const { question, subjectId, subjectName, notesText, isEli10 } = req.body;
  if (!question || !question.trim()) {
    return res.status(400).json({ error: 'Please type a question.' });
  }

  let text = notesText;
  let title = subjectName || 'Your Notes';

  if (!text && subjectId) {
    const s = PRELOADED_SUBJECTS[subjectId] || customSubjects.get(subjectId);
    if (s) { text = s.notesText; title = s.name; }
  }

  const result = chatWithNotes(question, title, text || '', !!isEli10);
  res.json({ success: true, chat: result });
});

// ─── Legacy endpoints (kept for backward compatibility) ───────────────────
router.post('/summarize', (req, res) => {
  const { subjectId, subjectName, notesText } = req.body;
  let text = notesText;
  let title = subjectName || 'Exam Syllabus';
  if (!text && subjectId) {
    const s = PRELOADED_SUBJECTS[subjectId] || customSubjects.get(subjectId);
    if (s) { text = s.notesText; title = s.name; }
  }
  if (!text || !text.trim()) {
    return res.status(400).json({ error: 'Please provide notes text.' });
  }
  res.json({ summary: generateContextSummary(text, title) });
});

router.post('/pyq-analyze', (req, res) => {
  const { subjectId, subjectName, notesText, pyqText } = req.body;
  let notes = notesText, pyqs = pyqText, title = subjectName || 'Course';
  if (subjectId) {
    const s = PRELOADED_SUBJECTS[subjectId] || customSubjects.get(subjectId);
    if (s) { if (!notes) notes = s.notesText; if (!pyqs) pyqs = s.pyqText; title = s.name; }
  }
  if (!pyqs || !pyqs.trim()) return res.status(400).json({ error: 'PYQ text required.' });
  res.json({ analysis: analyzePyqsAndGenerateQuestions(notes || '', pyqs, title) });
});

module.exports = router;
