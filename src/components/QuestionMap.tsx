
import React, { useState } from 'react';
import { Question } from '../data/vstepReadingMock';
import { BookmarkCheck, Filter } from 'lucide-react';

interface QuestionMapProps {
  passages: { id: number; questions: Question[] }[];
  userAnswers: { [questionId: number]: number | null };
  currentPassageIndex: number;
  onQuestionClick: (questionId: number) => void;
  bookmarkedQuestions?: Set<number>;
  onToggleBookmark?: (questionId: number) => void;
}

export const QuestionMap: React.FC<QuestionMapProps> = ({
  passages,
  userAnswers,
  currentPassageIndex,
  onQuestionClick,
  bookmarkedQuestions,
  onToggleBookmark,
}) => {
  const [showBookmarkedOnly, setShowBookmarkedOnly] = useState(false);

  // Flatten all questions and track which passage each belongs to
  const allQuestionsWithMeta = passages.flatMap((passage, passageIndex) => 
    passage.questions.map(q => ({
      question: q,
      passageIndex
    }))
  );

  const filteredQuestions = showBookmarkedOnly && bookmarkedQuestions
    ? allQuestionsWithMeta.filter(({ question }) => bookmarkedQuestions.has(question.id))
    : allQuestionsWithMeta;

  const bookmarkedCount = bookmarkedQuestions?.size || 0;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-4 md:p-6 border border-gray-100 dark:border-gray-700 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base md:text-lg font-semibold text-indigo-900 dark:text-gray-100">Question Map</h3>
        {bookmarkedCount > 0 && (
          <button
            onClick={() => setShowBookmarkedOnly(!showBookmarkedOnly)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              showBookmarkedOnly
                ? 'bg-amber-100 text-amber-800'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            <Filter size={14} />
            Bookmarked ({bookmarkedCount})
          </button>
        )}
      </div>
      {filteredQuestions.length === 0 && showBookmarkedOnly ? (
        <p className="text-center text-gray-400 dark:text-gray-500 text-sm py-4">No bookmarked questions found.</p>
      ) : (
        <div className="grid grid-cols-5 md:grid-cols-8 gap-1.5 md:gap-2">
          {filteredQuestions.map(({ question, passageIndex }) => {
            const isAnswered = userAnswers[question.id] !== null && userAnswers[question.id] !== undefined;
            const isCurrentPassage = passageIndex === currentPassageIndex;
            const isBm = bookmarkedQuestions?.has(question.id);
            const qNumber = allQuestionsWithMeta.findIndex(q => q.question.id === question.id) + 1;
            return (
              <button
                key={question.id}
                onClick={() => onQuestionClick(question.id)}
                className={`
                  relative h-7 w-7 md:h-9 md:w-9 rounded flex items-center justify-center font-semibold text-xs transition-all
                  ${isAnswered
                    ? 'bg-blue-500 text-white hover:bg-blue-600'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                  }
                  ${isCurrentPassage ? 'ring-2 ring-indigo-400' : ''}
                `}
              >
                {qNumber}
                {isBm && (
                  <BookmarkCheck
                    size={10}
                    className="absolute -top-1 -right-1 text-amber-500 fill-amber-500 drop-shadow-sm"
                  />
                )}
              </button>
            );
          })}
        </div>
      )}
      <div className="flex flex-wrap gap-3 mt-4 text-xs md:text-sm">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 md:w-4 md:h-4 rounded bg-gray-200 dark:bg-gray-700" />
          <span className="text-gray-600 dark:text-gray-400">Unanswered</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 md:w-4 md:h-4 rounded bg-blue-500" />
          <span className="text-gray-600 dark:text-gray-400">Answered</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 md:w-4 md:h-4 rounded border-2 border-indigo-400 bg-gray-200 dark:bg-gray-700" />
          <span className="text-gray-600 dark:text-gray-400">Current</span>
        </div>
        <div className="flex items-center gap-1.5">
          <BookmarkCheck size={14} className="text-amber-500 fill-amber-500" />
          <span className="text-gray-600 dark:text-gray-400">Bookmarked</span>
        </div>
        {onToggleBookmark && (
          <button
            onClick={() => {
              // Toggle bookmark on a question in the QuestionMap by clicking its number
            }}
            className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 font-medium"
          >
            {/* Quick bookmark action available per-question */}
          </button>
        )}
      </div>
    </div>
  );
};

