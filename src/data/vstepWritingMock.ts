import { VstepExamSet } from './vstepReadingMock';

export const writingExamSets: VstepExamSet[] = [
  {
    id: 'writing-001',
    examTitle: 'English Writing Practice Test 1',
    description: 'Complete English Writing section: Task 1 (Email) and Task 2 (Essay). 60 minutes total.',
    skillType: 'writing',
    totalDurationMinutes: 60,
    totalQuestions: 2,
    passages: [],
    writingTasks: [
      {
        id: 1,
        taskNumber: 1,
        taskType: 'email',
        prompt: 'You have just received an email from your friend, David, who is planning to visit your city for a week. Read the email below:\n\n"Dear friend,\n\nI hope you are doing well! I am so excited about my upcoming trip to your city next month. I will be staying for a week and would love to see the best places there. Could you recommend some interesting places to visit? Also, what is the best way to get around the city? Should I use public transportation or rent a car?\n\nLooking forward to your reply!\n\nBest regards,\nDavid"\n\nWrite an email responding to David. In your email, you should:\n- Express happiness about his visit\n- Recommend at least 3 places to visit\n- Suggest the best way to travel around the city\n- Offer to help him further if needed',
        wordLimit: 150,
        instructions: 'Write a response of about 150 words. You should spend approximately 20 minutes on this task.',
      },
      {
        id: 2,
        taskNumber: 2,
        taskType: 'essay',
        prompt: 'Some people believe that social media has a negative impact on society, while others think it brings many benefits.\n\nWrite an essay discussing both views and give your own opinion.\n\nIn your essay, you should:\n- Explain the positive aspects of social media\n- Discuss the negative effects of social media\n- Give your own opinion with supporting reasons\n- Provide examples to support your points',
        wordLimit: 300,
        instructions: 'Write an essay of about 300 words. You should spend approximately 40 minutes on this task.',
      },
    ],
    createdAt: '2026-07-20T00:00:00Z',
  },
];
