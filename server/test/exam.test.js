const test = require('node:test');
const assert = require('node:assert');
const {
  PRELOADED_SUBJECTS,
  generateContextSummary,
  analyzePyqsAndGenerateQuestions
} = require('../src/services/examEngine');

test('ExamEngine - Stage 1: Generates high-yield summary, comparison tables, and flashcards', () => {
  const os = PRELOADED_SUBJECTS['sub-os'];
  const summary = generateContextSummary(os.notesText, os.name);

  assert.ok(summary.units.length > 0, 'Expected units in summary');
  assert.ok(summary.comparisonTables.length >= 2, 'Expected comparison tables');
  assert.ok(summary.flashcards.length >= 4, 'Expected flashcards');
  assert.strictEqual(summary.subjectTitle, os.name);
});

test('ExamEngine - Stage 2: Cross-references PYQs and extracts 2-mark, 5-mark, 10-mark questions', () => {
  const os = PRELOADED_SUBJECTS['sub-os'];
  const analysis = analyzePyqsAndGenerateQuestions(os.notesText, os.pyqText, os.name);

  assert.ok(analysis.sectionA_2Marks.length >= 2, 'Expected 2-mark questions');
  assert.ok(analysis.sectionB_5Marks.length >= 2, 'Expected 5-mark questions');
  assert.ok(analysis.sectionC_10Marks.length >= 1, 'Expected 10-mark questions');
  assert.ok(analysis.repetitionSummary.length > 0, 'Expected repetition summary');
});
