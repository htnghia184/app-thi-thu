import { VstepExamSet } from './vstepReadingMock';

export const listeningExamSets: VstepExamSet[] = [
  {
    id: 'listening-001',
    examTitle: 'English Listening Practice Test 1',
    description: 'Full English Listening section with 3 audio passages. Each audio can be played only once.',
    skillType: 'listening',
    totalDurationMinutes: 25,
    totalQuestions: 15,
    passages: [
      {
        id: 1,
        title: 'Conversation: University Registration',
        passageText: '',
        audioUrl: '', // Upload audio via admin UI (Supabase Storage bucket 'exam-audio')
        questions: [
          {
            id: 1,
            questionText: 'Where does the conversation most likely take place?',
            options: ['At the library', 'At the registration office', 'At a coffee shop', 'At the dormitory'],
            correctAnswer: 1,
            explanation: 'The speaker mentions "registration forms" and "student ID", indicating a registration office setting.',
            questionType: 'main_idea'
          },
          {
            id: 2,
            questionText: 'What does the student need to bring to complete registration?',
            options: ['A passport photo', 'A letter of acceptance', 'A health certificate', 'A bank statement'],
            correctAnswer: 0,
            explanation: 'The advisor mentions needing two passport-sized photos for the student ID card.',
            questionType: 'detail'
          },
          {
            id: 3,
            questionText: 'What is the deadline for course registration?',
            options: ['August 30', 'September 5', 'September 15', 'September 20'],
            correctAnswer: 2,
            explanation: 'The advisor clearly states that all course registration must be completed by September 15th.',
            questionType: 'detail'
          },
          {
            id: 4,
            questionText: 'What does the advisor suggest the student do first?',
            options: ['Pay tuition fees', 'Visit the department office', 'Check the course catalog online', 'Meet with a faculty advisor'],
            correctAnswer: 2,
            explanation: 'The advisor recommends checking the updated course catalog on the university website first.',
            questionType: 'detail'
          },
          {
            id: 5,
            questionText: 'How does the student feel about the registration process?',
            options: ['Confident and prepared', 'Confused and overwhelmed', 'Indifferent', 'Excited'],
            correctAnswer: 1,
            explanation: 'The student uses phrases like "I\'m a bit lost" and "this is confusing", showing they feel overwhelmed.',
            questionType: 'inference'
          },
        ],
      },
      {
        id: 2,
        title: 'Lecture: Climate Change Impact',
        passageText: '',
        audioUrl: '', // Upload audio via admin UI (Supabase Storage bucket 'exam-audio')
        questions: [
          {
            id: 6,
            questionText: 'What is the main topic of the lecture?',
            options: ['The causes of global warming', 'The effects of climate change on coastal cities', 'Renewable energy solutions', 'International climate agreements'],
            correctAnswer: 1,
            explanation: 'The lecture focuses specifically on how climate change is affecting coastal cities worldwide.',
            questionType: 'main_idea'
          },
          {
            id: 7,
            questionText: 'By what year does the speaker predict sea levels could rise by 1 meter?',
            options: ['2030', '2050', '2070', '2100'],
            correctAnswer: 3,
            explanation: 'The speaker cites studies predicting up to 1 meter sea level rise by the year 2100.',
            questionType: 'detail'
          },
          {
            id: 8,
            questionText: 'Which city is mentioned as an example of flooding risk?',
            options: ['New York', 'Ho Chi Minh City', 'Tokyo', 'London'],
            correctAnswer: 1,
            explanation: 'Ho Chi Minh City is highlighted as one of the most vulnerable cities to sea level rise.',
            questionType: 'detail'
          },
          {
            id: 9,
            questionText: 'What percentage of the Netherlands is already below sea level?',
            options: ['About 20%', 'About 25%', 'About 33%', 'About 40%'],
            correctAnswer: 2,
            explanation: 'The speaker notes that approximately one-third (about 33%) of the Netherlands is below sea level.',
            questionType: 'detail'
          },
        ],
      },
      {
        id: 3,
        title: 'Announcement: Campus Event',
        passageText: '',
        audioUrl: '', // Upload audio via admin UI (Supabase Storage bucket 'exam-audio')
        questions: [
          {
            id: 10,
            questionText: 'What is the purpose of the announcement?',
            options: ['To announce a holiday', 'To inform about a career fair', 'To promote a sports event', 'To invite to a music concert'],
            correctAnswer: 1,
            explanation: 'The announcement is about the upcoming annual career fair at the university.',
            questionType: 'tone_purpose'
          },
          {
            id: 11,
            questionText: 'When will the event take place?',
            options: ['Monday, March 12', 'Wednesday, March 14', 'Friday, March 16', 'Saturday, March 17'],
            correctAnswer: 2,
            explanation: 'The event is scheduled for Friday, March 16th from 9 AM to 4 PM.',
            questionType: 'detail'
          },
          {
            id: 12,
            questionText: 'How many companies are expected to attend?',
            options: ['About 30', 'About 50', 'About 70', 'About 100'],
            correctAnswer: 1,
            explanation: 'Approximately 50 companies from various industries will be participating.',
            questionType: 'detail'
          },
          {
            id: 13,
            questionText: 'What should students bring to the event?',
            options: ['Reference letters', 'Multiple copies of their resume', 'A laptop', 'Business cards'],
            correctAnswer: 1,
            explanation: 'Students are advised to bring multiple copies of their updated resume.',
            questionType: 'detail'
          },
          {
            id: 14,
            questionText: 'What service will be available at the event?',
            options: ['Free photography', 'Mock interview sessions', 'Resume review booth', 'Free lunch'],
            correctAnswer: 2,
            explanation: 'There will be a resume review booth where students can get feedback on their resumes.',
            questionType: 'detail'
          },
          {
            id: 15,
            questionText: 'How can students register for the event?',
            options: ['By email', 'Through the university website', 'At the student center', 'No registration needed'],
            correctAnswer: 1,
            explanation: 'Students must register through the university career services website in advance.',
            questionType: 'detail'
          },
        ],
      },
    ],
    createdAt: '2026-07-20T00:00:00Z',
  },
];
