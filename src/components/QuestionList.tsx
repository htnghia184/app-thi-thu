
import React from 'react';
import { Question } from '../data/vstepReadingMock';
import { Bookmark, BookmarkCheck } from 'lucide-react';

interface QuestionListProps {
  questions: Question[];
  userAnswers: { [questionId: number]: number | null };
  onAnswer: (questionId: number, answerIndex: number | null) => void;
  onToggleBookmark?: (questionId: number) => void;
  isBookmarked?: (questionId: number) => boolean;
  prefix?: string;
  /** Số thứ tự bắt đầu (tính gộp từ các passage trước) để khớp QuestionMap */
  startNumber?: number;
}

export const QuestionList: React.FC<QuestionListProps> = ({
  questions,
  userAnswers,
  onAnswer,
  onToggleBookmark,
  isBookmarked,
  prefix = 'question-',
  startNumber = 0,
}) => {
  const optionLabels = ['A', 'B', 'C', 'D'];

  return (
    <div className="space-y-4 md:space-y-6 pb-8">
      {questions.map((question, i) => {
        const questionNumber = startNumber + i + 1;
        const selectedAnswer = userAnswers[question.id];
        return (
        <div
          key={question.id}
          id={`${prefix}${question.id}`}
          className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-4 md:p-6 border border-gray-100 dark:border-gray-700"
        >
          <div className="mb-3 md:mb-4">
            <div className="flex items-center justify-between">
              <div className="text-indigo-600 font-semibold text-xs md:text-sm mb-2">
                Question {questionNumber}
              </div>
              {onToggleBookmark && isBookmarked && (
                <button
                  onClick={(e) => { e.stopPropagation(); onToggleBookmark(question.id); }}
                  className="p-1.5 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-900/30 transition-colors -mt-1"
                  title={isBookmarked(question.id) ? 'Remove bookmark' : 'Bookmark for review'}
                >
                  {isBookmarked(question.id) ? (
                    <BookmarkCheck size={18} className="text-amber-500 fill-amber-500" />
                  ) : (
                    <Bookmark size={18} className="text-gray-400 hover:text-amber-500" />
                  )}
                </button>
              )}
            </div>
            <h3 className="text-sm md:text-lg font-semibold text-gray-900 dark:text-gray-100 leading-relaxed">
              {question.questionText}
            </h3>
          </div>
          <div className="space-y-2">
            {question.options.map((option, optIndex) => (
              <button
                key={optIndex}
                onClick={() => onAnswer(question.id, optIndex)}
                className={`
                  w-full text-left px-4 py-3 rounded-lg border-2 flex items-center gap-3 transition-all min-h-[44px]
                  ${selectedAnswer === optIndex
                    ? 'border-indigo-600 bg-indigo-50 text-indigo-800'
                    : 'border-gray-200 dark:border-gray-600 hover:border-indigo-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }
                `}
              >
                <div
                  className={`
                    w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0
                    ${selectedAnswer === optIndex
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                    }
                  `}
                >
                  {optionLabels[optIndex]}
                </div>
                <span className="text-gray-700 dark:text-gray-300 text-sm md:text-base">{option}</span>
              </button>
            ))}
          </div>
        </div>
      );
    })}
    </div>
  );
};

