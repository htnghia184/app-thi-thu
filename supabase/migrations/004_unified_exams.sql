-- ============================================================
-- 004_unified_exams.sql
-- Hợp nhất mọi đề thi (cả listening/writing trước đây là mock local)
-- vào bảng exams — admin quản lý chung một chỗ, app chỉ đọc từ DB.
-- ============================================================

-- 1. Mở rộng bảng passages để chứa audio (listening) và cấu hình task (writing)
ALTER TABLE passages
  ADD COLUMN IF NOT EXISTS audio_url TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS task_type TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS word_limit INTEGER,
  ADD COLUMN IF NOT EXISTS instructions TEXT DEFAULT '';

-- 2. Seed đề Listening Practice Test 1
INSERT INTO exams (id, title, description, duration_minutes, skill_type, is_published)
VALUES (
  '00000000-0000-4000-8000-000000000011',
  'English Listening Practice Test 1',
  'Full English Listening section with 3 audio passages. Each audio can be played only once.',
  25,
  'listening',
  TRUE
)
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  duration_minutes = EXCLUDED.duration_minutes,
  skill_type = EXCLUDED.skill_type,
  is_published = EXCLUDED.is_published;

INSERT INTO passages (id, exam_id, passage_number, title, content, audio_url) VALUES
  ('10000000-0000-4000-8000-000000000011', '00000000-0000-4000-8000-000000000011', 1,
   'Conversation: University Registration', '', ''),
  ('10000000-0000-4000-8000-000000000012', '00000000-0000-4000-8000-000000000011', 2,
   'Lecture: Climate Change Impact', '', ''),
  ('10000000-0000-4000-8000-000000000013', '00000000-0000-4000-8000-000000000011', 3,
   'Announcement: Campus Event', '', '')
ON CONFLICT (id) DO NOTHING;

INSERT INTO questions (passage_id, question_number, question_text, options, correct_answer, explanation) VALUES
  ('10000000-0000-4000-8000-000000000011', 1,
   'Where does the conversation most likely take place?',
   '["At the library", "At the registration office", "At a coffee shop", "At the dormitory"]'::jsonb,
   1,
   'The speaker mentions "registration forms" and "student ID", indicating a registration office setting.'),
  ('10000000-0000-4000-8000-000000000011', 2,
   'What does the student need to bring to complete registration?',
   '["A passport photo", "A letter of acceptance", "A health certificate", "A bank statement"]'::jsonb,
   0,
   'The advisor mentions needing two passport-sized photos for the student ID card.'),
  ('10000000-0000-4000-8000-000000000011', 3,
   'What is the deadline for course registration?',
   '["August 30", "September 5", "September 15", "September 20"]'::jsonb,
   2,
   'The advisor clearly states that all course registration must be completed by September 15th.'),
  ('10000000-0000-4000-8000-000000000011', 4,
   'What does the advisor suggest the student do first?',
   '["Pay tuition fees", "Visit the department office", "Check the course catalog online", "Meet with a faculty advisor"]'::jsonb,
   2,
   'The advisor recommends checking the updated course catalog on the university website first.'),
  ('10000000-0000-4000-8000-000000000011', 5,
   'How does the student feel about the registration process?',
   '["Confident and prepared", "Confused and overwhelmed", "Indifferent", "Excited"]'::jsonb,
   1,
   'The student uses phrases like "I''m a bit lost" and "this is confusing", showing they feel overwhelmed.'),
  ('10000000-0000-4000-8000-000000000012', 1,
   'What is the main topic of the lecture?',
   '["The causes of global warming", "The effects of climate change on coastal cities", "Renewable energy solutions", "International climate agreements"]'::jsonb,
   1,
   'The lecture focuses specifically on how climate change is affecting coastal cities worldwide.'),
  ('10000000-0000-4000-8000-000000000012', 2,
   'By what year does the speaker predict sea levels could rise by 1 meter?',
   '["2030", "2050", "2070", "2100"]'::jsonb,
   3,
   'The speaker cites studies predicting up to 1 meter sea level rise by the year 2100.'),
  ('10000000-0000-4000-8000-000000000012', 3,
   'Which city is mentioned as an example of flooding risk?',
   '["New York", "Ho Chi Minh City", "Tokyo", "London"]'::jsonb,
   1,
   'Ho Chi Minh City is highlighted as one of the most vulnerable cities to sea level rise.'),
  ('10000000-0000-4000-8000-000000000012', 4,
   'What percentage of the Netherlands is already below sea level?',
   '["About 20%", "About 25%", "About 33%", "About 40%"]'::jsonb,
   2,
   'The speaker notes that approximately one-third (about 33%) of the Netherlands is below sea level.'),
  ('10000000-0000-4000-8000-000000000013', 1,
   'What is the purpose of the announcement?',
   '["To announce a holiday", "To inform about a career fair", "To promote a sports event", "To invite to a music concert"]'::jsonb,
   1,
   'The announcement is about the upcoming annual career fair at the university.'),
  ('10000000-0000-4000-8000-000000000013', 2,
   'When will the event take place?',
   '["Monday, March 12", "Wednesday, March 14", "Friday, March 16", "Saturday, March 17"]'::jsonb,
   2,
   'The event is scheduled for Friday, March 16th from 9 AM to 4 PM.'),
  ('10000000-0000-4000-8000-000000000013', 3,
   'How many companies are expected to attend?',
   '["About 30", "About 50", "About 70", "About 100"]'::jsonb,
   1,
   'Approximately 50 companies from various industries will be participating.'),
  ('10000000-0000-4000-8000-000000000013', 4,
   'What should students bring to the event?',
   '["Reference letters", "Multiple copies of their resume", "A laptop", "Business cards"]'::jsonb,
   1,
   'Students are advised to bring multiple copies of their updated resume.'),
  ('10000000-0000-4000-8000-000000000013', 5,
   'What service will be available at the event?',
   '["Free photography", "Mock interview sessions", "Resume review booth", "Free lunch"]'::jsonb,
   2,
   'There will be a resume review booth where students can get feedback on their resumes.'),
  ('10000000-0000-4000-8000-000000000013', 6,
   'How can students register for the event?',
   '["By email", "Through the university website", "At the student center", "No registration needed"]'::jsonb,
   1,
   'Students must register through the university career services website in advance.')
ON CONFLICT (passage_id, question_number) DO NOTHING;

-- 3. Seed đề Writing Practice Test 1 (mỗi task là một passage)
INSERT INTO exams (id, title, description, duration_minutes, skill_type, is_published)
VALUES (
  '00000000-0000-4000-8000-000000000012',
  'English Writing Practice Test 1',
  'Complete English Writing section: Task 1 (Email) and Task 2 (Essay). 60 minutes total.',
  60,
  'writing',
  TRUE
)
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  duration_minutes = EXCLUDED.duration_minutes,
  skill_type = EXCLUDED.skill_type,
  is_published = EXCLUDED.is_published;

INSERT INTO passages (id, exam_id, passage_number, title, content, task_type, word_limit, instructions) VALUES
  ('10000000-0000-4000-8000-000000000021', '00000000-0000-4000-8000-000000000012', 1,
   'Task 1: Email Response', E'You have just received an email from your friend, David, who is planning to visit your city for a week. Read the email below:\n\n"Dear friend,\n\nI hope you are doing well! I am so excited about my upcoming trip to your city next month. I will be staying for a week and would love to see the best places there. Could you recommend some interesting places to visit? Also, what is the best way to get around the city? Should I use public transportation or rent a car?\n\nLooking forward to your reply!\n\nBest regards,\nDavid"\n\nWrite an email responding to David. In your email, you should:\n- Express happiness about his visit\n- Recommend at least 3 places to visit\n- Suggest the best way to travel around the city\n- Offer to help him further if needed',
   'email', 150, 'Write a response of about 150 words. You should spend approximately 20 minutes on this task.'),
  ('10000000-0000-4000-8000-000000000022', '00000000-0000-4000-8000-000000000012', 2,
   'Task 2: Essay', E'Some people believe that social media has a negative impact on society, while others think it brings many benefits.\n\nWrite an essay discussing both views and give your own opinion.\n\nIn your essay, you should:\n- Explain the positive aspects of social media\n- Discuss the negative effects of social media\n- Give your own opinion with supporting reasons\n- Provide examples to support your points',
   'essay', 300, 'Write an essay of about 300 words. You should spend approximately 40 minutes on this task.')
ON CONFLICT (id) DO NOTHING;
