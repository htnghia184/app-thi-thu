-- Add total_questions to exam_results so the UI can display the real question count
-- (instead of assuming a fixed 40 questions)
ALTER TABLE exam_results ADD COLUMN IF NOT EXISTS total_questions INTEGER;

-- Backfill existing rows with the number of questions in each exam
UPDATE exam_results er
SET total_questions = sub.total
FROM (
  SELECT p.exam_id, COUNT(q.id) AS total
  FROM passages p
  JOIN questions q ON q.passage_id = p.id
  GROUP BY p.exam_id
) sub
WHERE er.exam_id = sub.exam_id
  AND er.total_questions IS NULL;
