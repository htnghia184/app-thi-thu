
import React from 'react';
import { CheckCircle2, XCircle, RotateCcw, AlertTriangle, BarChart3, BookmarkCheck } from 'lucide-react';
import { Question } from '../data/vstepReadingMock';
import { analyzeByQuestionType, generateWeaknessMessage } from '../utils/questionAnalysis';

interface QuestionResult {
  question: Question;
  userAnswer: number | null;
  isCorrect: boolean;
}

interface ResultViewProps {
  correctCount: number;
  totalCount: number;
  percentage: number;
  vstepScore: number;
  timeTaken: number;
  results: QuestionResult[];
  passages: { id: number; title: string; questions: Question[] }[];
  onReset: () => void;
  bookmarkedQuestions?: Set<number>;
}

const formatTime = (totalSeconds: number) => {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) {
    return `${hours}h ${minutes}m ${seconds}s`;
  }
  return `${minutes}m ${seconds}s`;
};

export const ResultView: React.FC<ResultViewProps> = ({
  correctCount,
  totalCount,
  percentage,
  vstepScore,
  timeTaken,
  results,
  passages,
  onReset,
  bookmarkedQuestions
}) => {
  const optionLabels = ['A', 'B', 'C', 'D'];

  // Analyze by question type
  const typeStats = analyzeByQuestionType(results);
  const weaknessMsg = generateWeaknessMessage(results);

  // Group results by passage
  const resultsByPassage = passages.map(passage => ({
    passage,
    results: results.filter(r => 
      passage.questions.some(q => q.id === r.question.id)
    )
  }));

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-blue-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 py-8 px-4">
      <div className="max-w-5xl mx-auto">
        {/* Score Overview */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl dark:shadow-gray-900/30 p-4 md:p-8 mb-6 md:mb-8">
          <div className="text-center mb-6 md:mb-8">
            <h1 className="text-2xl md:text-3xl font-bold text-indigo-900 dark:text-gray-100 mb-2">Test Complete!</h1>
            <p className="text-sm md:text-base text-gray-600 dark:text-gray-400">Here's how you did</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 md:gap-6 mb-6 md:mb-8">
            <div className="text-center p-4 md:p-6 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg">
              <div className="text-2xl md:text-3xl font-bold text-indigo-600 dark:text-indigo-400 mb-1">
                {correctCount} / {totalCount}
              </div>
              <div className="text-xs md:text-sm text-indigo-800 dark:text-indigo-300">Total Score</div>
            </div>
            <div className="text-center p-4 md:p-6 bg-emerald-50 dark:bg-emerald-900/30 rounded-lg">
              <div className="text-2xl md:text-3xl font-bold text-emerald-600 dark:text-emerald-400 mb-1">{Math.round(percentage * 100)}%</div>
              <div className="text-xs md:text-sm text-emerald-800 dark:text-emerald-300">Percentage</div>
            </div>
            <div className="text-center p-4 md:p-6 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
              <div className="text-2xl md:text-3xl font-bold text-blue-600 dark:text-blue-400 mb-1">{vstepScore}</div>
              <div className="text-xs md:text-sm text-blue-800 dark:text-blue-300">VSTEP Score (0-10)</div>
            </div>
            <div className="text-center p-4 md:p-6 bg-purple-50 dark:bg-purple-900/30 rounded-lg">
              <div className="text-2xl md:text-3xl font-bold text-purple-600 dark:text-purple-400 mb-1">
                {formatTime(timeTaken)}
              </div>
              <div className="text-xs md:text-sm text-purple-800 dark:text-purple-300">Time Taken</div>
            </div>
          </div>

          {/* Weakest Area Alert */}
          {weaknessMsg && (
            <div className="mb-6 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl flex items-start gap-3">
              <AlertTriangle size={24} className="text-amber-500 dark:text-amber-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-amber-800 dark:text-amber-100">Areas for Improvement</p>
                <p className="text-amber-700 dark:text-amber-200 text-sm mt-1">{weaknessMsg}</p>
              </div>
            </div>
          )}

          <button
            onClick={onReset}
            className="w-full py-3 md:py-4 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-lg font-semibold text-base md:text-lg hover:from-indigo-700 hover:to-indigo-800 shadow-lg transition-all flex items-center justify-center gap-2"
          >
            <RotateCcw size={20} className="md:size-[24px]" />
            Take New Test
          </button>
        </div>

        {/* Question Type Analysis */}
        {typeStats.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl dark:shadow-gray-900/30 p-4 md:p-8 mb-6 md:mb-8">
            <div className="flex items-center gap-2 mb-4 md:mb-6">
              <BarChart3 size={20} className="md:size-[24px] text-indigo-600" />
              <h2 className="text-lg md:text-2xl font-bold text-indigo-900 dark:text-gray-100">Question Type Analysis</h2>
            </div>
            <div className="space-y-4">
              {typeStats.map(stat => (
                <div key={stat.type}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{stat.label}</span>
                    <span className={`text-sm font-bold ${
                      stat.accuracy >= 70 ? 'text-green-600' : stat.accuracy >= 40 ? 'text-amber-600' : 'text-red-600'
                    }`}>
                      {stat.correct}/{stat.total} ({stat.accuracy}%)
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                    <div
                      className={`h-2.5 rounded-full transition-all ${
                        stat.accuracy >= 70 ? 'bg-green-500' : stat.accuracy >= 40 ? 'bg-amber-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${stat.accuracy}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Review Section per Passage */}
        <div className="space-y-6 md:space-y-10">
          {resultsByPassage.map(({ passage, results }) => (
            <div key={passage.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-lg dark:shadow-gray-900/30 p-4 md:p-8">
              <h2 className="text-lg md:text-2xl font-bold text-indigo-900 dark:text-gray-100 mb-4 md:mb-6">
                Passage {passage.id}: {passage.title}
              </h2>
              <div className="space-y-4 md:space-y-6">
                {results.map((result, i) => {
                  const globalQuestionNumber = i + (passage.id - 1) * 10 + 1;
                  return (
                    <div
                      key={result.question.id}
                      className={`
                        p-4 md:p-6 rounded-lg border-2
                        ${result.isCorrect
                          ? 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20'
                          : 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20'
                        }
                      `}
                    >
                      <div className="flex items-start gap-2 md:gap-3 mb-3 md:mb-4">
                        <div className="flex items-center gap-2 mt-1">
                          {result.isCorrect ? (
                            <CheckCircle2 className="text-green-600 flex-shrink-0 md:size-[24px]" size={20} />
                          ) : (
                            <XCircle className="text-red-600 flex-shrink-0 md:size-[24px]" size={20} />
                          )}
                          {bookmarkedQuestions?.has(result.question.id) && (
                            <BookmarkCheck size={16} className="text-amber-500 fill-amber-500 flex-shrink-0" />
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs md:text-sm font-semibold text-gray-500 dark:text-gray-400">
                              Question {globalQuestionNumber}
                            </span>
                            <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 font-medium">
                              {result.question.questionType?.replace(/_/g, ' ') || 'General'}
                            </span>
                          </div>
                          <div className="text-sm md:text-lg font-semibold text-gray-900 dark:text-gray-100">
                            {result.question.questionText}
                          </div>
                        </div>
                      </div>
                      
                      <div className="space-y-2 mb-3 md:mb-4">
                        {result.question.options.map((option, optIndex) => {
                          let bgColor = 'bg-white dark:bg-gray-700';
                          let textColor = 'text-gray-700 dark:text-gray-300';
                          let borderColor = 'border-gray-200 dark:border-gray-600';
                          
                          if (optIndex === result.question.correctAnswer) {
                            bgColor = 'bg-green-100';
                            textColor = 'text-green-800';
                            borderColor = 'border-green-300';
                          } else if (
                            result.userAnswer === optIndex &&
                            optIndex !== result.question.correctAnswer
                          ) {
                            bgColor = 'bg-red-100';
                            textColor = 'text-red-800';
                            borderColor = 'border-red-300';
                          }
                          
                          return (
                            <div
                              key={optIndex}
                              className={`
                                p-3 rounded-lg border-2 flex items-center gap-3
                                ${bgColor} ${textColor} ${borderColor}
                              `}
                            >
                              <span className="font-bold w-6 text-sm md:text-base">{optionLabels[optIndex]}.</span>
                              <span className="text-sm md:text-base">{option}</span>
                              {optIndex === result.question.correctAnswer && (
                                <span className="ml-auto text-xs font-semibold text-green-700 dark:text-green-400">
                                  Correct
                                </span>
                              )}
                              {result.userAnswer === optIndex &&
                                optIndex !== result.question.correctAnswer && (
                                <span className="ml-auto text-xs font-semibold text-red-700 dark:text-red-400">
                                  Your Answer
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      <div className="p-3 md:p-4 bg-white dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
                        <div className="text-xs md:text-sm font-semibold text-indigo-700 dark:text-indigo-300 mb-1">
                          Explanation:
                        </div>
                        <div className="text-xs md:text-sm text-gray-600 dark:text-gray-400">
                          {result.question.explanation}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
