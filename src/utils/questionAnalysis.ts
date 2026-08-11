import { Question, QuestionType, QUESTION_TYPE_LABELS } from '../data/vstepReadingMock';

interface QuestionTypeStats {
  type: QuestionType;
  label: string;
  correct: number;
  total: number;
  accuracy: number;
}

interface WeakArea {
  type: QuestionType;
  label: string;
  correct: number;
  total: number;
  accuracy: number;
}

/**
 * Analyze results grouped by question type
 */
export function analyzeByQuestionType(
  results: { question: Question; userAnswer: number | null; isCorrect: boolean }[]
): QuestionTypeStats[] {
  const typeMap = new Map<QuestionType, { correct: number; total: number }>();

  for (const r of results) {
    const qt = r.question.questionType;
    if (!typeMap.has(qt)) {
      typeMap.set(qt, { correct: 0, total: 0 });
    }
    const entry = typeMap.get(qt)!;
    entry.total++;
    if (r.isCorrect) entry.correct++;
  }

  const stats: QuestionTypeStats[] = [];
  typeMap.forEach((val, type) => {
    stats.push({
      type,
      label: QUESTION_TYPE_LABELS[type] || type,
      correct: val.correct,
      total: val.total,
      accuracy: val.total > 0 ? Math.round((val.correct / val.total) * 100) : 0,
    });
  });

  stats.sort((a, b) => a.accuracy - b.accuracy);
  return stats;
}

/**
 * Find the weakest question type(s)
 */
function findWeakestAreas(stats: QuestionTypeStats[]): WeakArea[] {
  if (stats.length === 0) return [];

  const lowestAccuracy = stats[0].accuracy;
  return stats.filter(s => s.accuracy === lowestAccuracy && s.total > 0);
}

/**
 * Generate a personalized weakness message
 */
export function generateWeaknessMessage(
  results: { question: Question; userAnswer: number | null; isCorrect: boolean }[]
): string {
  const stats = analyzeByQuestionType(results);
  const weakest = findWeakestAreas(stats);

  if (weakest.length === 0 || weakest[0].accuracy >= 80) return '';

  const w = weakest[0];
  return `You're weakest at "${w.label}" - Only ${w.correct}/${w.total} correct (${w.accuracy}%). Focus on improving this question type!`;
}
