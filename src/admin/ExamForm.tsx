import React, { useState, useRef } from 'react';
import { Upload, Trash2, Music, CheckCircle, AlertCircle } from 'lucide-react';
import { VstepExamSet, Passage, Question } from '../data/vstepReadingMock';
import { uploadAudio, deleteAudio, getAudioUrl } from '../lib/supabaseService';
import { RichTextEditor } from '../components/RichTextEditor';

interface ExamFormProps {
  initialExam: VstepExamSet;
  onSave: (exam: VstepExamSet) => void;
  onCancel: () => void;
}

export const ExamForm: React.FC<ExamFormProps> = ({ initialExam, onSave, onCancel }) => {
  const [step, setStep] = useState(1);
  const [exam, setExam] = useState<VstepExamSet>(initialExam);
  const [currentPassageIndex, setCurrentPassageIndex] = useState(0);
  const [defaultQuestionCount, setDefaultQuestionCount] = useState(10);
  const [saving, setSaving] = useState(false);
  const [uploadingAudio, setUploadingAudio] = useState(false);
  const [audioUploadError, setAudioUploadError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getNextQuestionId = () => {
    const ids = exam.passages.flatMap(p => p.questions.map(q => q.id));
    return (ids.length > 0 ? Math.max(...ids) : 0) + 1;
  };

  const handleAudioUpload = async (file: File) => {
    if (!file) return;
    setUploadingAudio(true);
    setAudioUploadError('');
    try {
      const url = await uploadAudio(file, exam.id || 'temp', currentPassageIndex + 1);
      updatePassage(currentPassageIndex, 'audioUrl', url);
    } catch (err: any) {
      setAudioUploadError(err.message || 'Failed to upload audio');
    } finally {
      setUploadingAudio(false);
    }
  };

  const handleAudioDelete = async () => {
    const currentAudioUrl = exam.passages[currentPassageIndex]?.audioUrl;
    if (!currentAudioUrl) return;
    try {
      await deleteAudio(currentAudioUrl);
      updatePassage(currentPassageIndex, 'audioUrl', undefined);
    } catch (err: any) {
      setAudioUploadError(err.message || 'Failed to delete audio');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleAudioUpload(file);
    }
    // Reset input so the same file can be re-uploaded
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const updateMetadata = (field: keyof VstepExamSet, value: any) => {
    setExam(prev => ({ ...prev, [field]: value }));
  };

  const addPassage = () => {
    const newId = Math.max(...exam.passages.map(p => p.id), 0) + 1;
    const firstQuestionId = getNextQuestionId();
    const newPassage: Passage = {
      id: newId,
      title: `New Passage ${exam.passages.length + 1}`,
      passageText: '',
      questions: Array.from({ length: defaultQuestionCount }, (_, i) => ({
        id: firstQuestionId + i,
        questionText: '',
        options: ['', '', '', ''],
        correctAnswer: 0,
        explanation: '',
        questionType: 'detail' as const
      }))
    };
    setExam(prev => ({
      ...prev,
      passages: [...prev.passages, newPassage],
      totalQuestions: prev.passages.reduce((sum, p) => sum + p.questions.length, 0) + defaultQuestionCount
    }));
  };

  const removePassage = (index: number) => {
    const newPassages = [...exam.passages];
    newPassages.splice(index, 1);
    setExam(prev => ({
      ...prev,
      passages: newPassages,
      totalQuestions: newPassages.reduce((sum, p) => sum + p.questions.length, 0)
    }));
    if (currentPassageIndex >= newPassages.length) {
      setCurrentPassageIndex(Math.max(0, newPassages.length - 1));
    }
  };

  const updateQuestionCount = (passageIndex: number, count: number) => {
    const safeCount = Math.max(0, Math.min(count, 50));
    const newPassages = [...exam.passages];
    const passage = newPassages[passageIndex];
    const current = passage.questions;

    let questions: Question[];
    if (safeCount > current.length) {
      const firstQuestionId = getNextQuestionId();
      const additions = Array.from({ length: safeCount - current.length }, (_, i) => ({
        id: firstQuestionId + i,
        questionText: '',
        options: ['', '', '', ''],
        correctAnswer: 0,
        explanation: '',
        questionType: 'detail' as const
      }));
      questions = [...current, ...additions];
    } else {
      questions = current.slice(0, safeCount);
    }

    newPassages[passageIndex] = { ...passage, questions };
    setExam(prev => ({
      ...prev,
      passages: newPassages,
      totalQuestions: newPassages.reduce((sum, p) => sum + p.questions.length, 0)
    }));
  };

  const updatePassage = (index: number, field: keyof Passage, value: any) => {
    const newPassages = [...exam.passages];
    newPassages[index] = { ...newPassages[index], [field]: value };
    setExam(prev => ({ ...prev, passages: newPassages }));
  };

  const updateQuestion = (passageIndex: number, questionIndex: number, field: keyof Question, value: any) => {
    const newPassages = [...exam.passages];
    const newQuestions = [...newPassages[passageIndex].questions];
    newQuestions[questionIndex] = { ...newQuestions[questionIndex], [field]: value };
    newPassages[passageIndex] = { ...newPassages[passageIndex], questions: newQuestions };
    setExam(prev => ({ ...prev, passages: newPassages }));
  };

  const updateOption = (passageIndex: number, questionIndex: number, optionIndex: number, value: string) => {
    const newPassages = [...exam.passages];
    const newQuestions = [...newPassages[passageIndex].questions];
    const newOptions = [...newQuestions[questionIndex].options];
    newOptions[optionIndex] = value;
    newQuestions[questionIndex] = { ...newQuestions[questionIndex], options: newOptions };
    newPassages[passageIndex] = { ...newPassages[passageIndex], questions: newQuestions };
    setExam(prev => ({ ...prev, passages: newPassages }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const examToSave = {
        ...exam,
        id: exam.id || `new-${Date.now()}`,
        createdAt: exam.createdAt || new Date().toISOString()
      };
      await onSave(examToSave);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg dark:shadow-gray-900/30 p-4 md:p-8">
      <div className="flex items-center justify-between mb-6 md:mb-8">
        <h2 className="text-xl md:text-2xl font-bold text-indigo-900 dark:text-gray-100">
          {initialExam.id ? 'Edit Exam' : 'Create New Exam'}
        </h2>
        <button
          onClick={onCancel}
          className="px-3 md:px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 text-sm md:text-base"
        >
          Cancel
        </button>
      </div>

      {/* Step Indicator */}
      <div className="flex items-center gap-2 md:gap-4 mb-6 md:mb-8 border-b border-gray-200 dark:border-gray-700 pb-4 overflow-x-auto">
        {[1, 2, 3].map(num => (
          <div
            key={num}
            className={`flex items-center gap-1 md:gap-2 cursor-pointer transition-all whitespace-nowrap ${step >= num ? 'text-indigo-600 dark:text-indigo-400 font-semibold' : 'text-gray-400 dark:text-gray-500'}`}
            onClick={() => setStep(num)}
          >
            <div className={`w-6 h-6 md:w-8 md:h-8 rounded-full flex items-center justify-center border-2 text-xs md:text-sm ${step >= num ? 'bg-indigo-600 text-white border-indigo-600' : 'border-gray-300 dark:border-gray-600'}`}>
              {num}
            </div>
            <span className="text-xs md:text-sm">
              {num === 1 ? 'Metadata' : num === 2 ? 'Passages' : 'Questions'}
            </span>
          </div>
        ))}
      </div>

      {/* Step 1: Metadata */}
      {step === 1 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Exam Title</label>
            <input
              type="text"
              value={exam.examTitle}
              onChange={(e) => updateMetadata('examTitle', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-gray-200"
              placeholder="English Reading Practice Test"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Skill Type</label>
            <select
              value={exam.skillType}
              onChange={(e) => updateMetadata('skillType', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-gray-200"
            >
              <option value="reading">Reading</option>
              <option value="listening">Listening</option>
              <option value="writing">Writing</option>
              <option value="speaking">Speaking</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Duration (minutes)</label>
            <input
              type="number"
              value={exam.totalDurationMinutes}
              onChange={(e) => updateMetadata('totalDurationMinutes', parseInt(e.target.value) || 60)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-gray-200"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Description</label>
            <textarea
              value={exam.description}
              onChange={(e) => updateMetadata('description', e.target.value)}
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-gray-200"
              placeholder="Describe this exam set..."
            />
          </div>
          <div className="md:col-span-2 flex justify-end">
            <button
              onClick={() => setStep(2)}
              disabled={!exam.examTitle.trim()}
              className="px-4 md:px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm md:text-base"
            >
              Next: Add Passages
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Passages */}
      {step === 2 && (
        <div>
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 mb-4 md:mb-6">
            <h3 className="text-lg md:text-xl font-semibold text-indigo-900 dark:text-gray-100">Passages ({exam.passages.length}/4)</h3>
            <div className="flex items-center gap-3 w-full md:w-auto">
              <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-700 rounded-lg px-3 py-2">
                <label className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">Questions / new passage</label>
                <input
                  type="number"
                  min={1}
                  max={50}
                  value={defaultQuestionCount}
                  onChange={(e) => setDefaultQuestionCount(Math.max(0, Math.min(parseInt(e.target.value) || 0, 50)))}
                  className="w-16 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-md text-sm dark:bg-gray-800 dark:text-gray-200 text-center"
                />
              </div>
              {exam.passages.length < 4 && (
                <button
                  onClick={addPassage}
                  className="px-3 md:px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm md:text-base whitespace-nowrap"
                >
                  + Add Passage
                </button>
              )}
            </div>
          </div>

          {exam.passages.length > 0 && (
            <>
              <div className="flex gap-2 md:gap-4 mb-4 md:mb-6 overflow-x-auto pb-2">
                {exam.passages.map((passage, index) => (
                  <button
                    key={passage.id}
                    onClick={() => setCurrentPassageIndex(index)}
                    className={`px-3 md:px-4 py-2 rounded-lg border-2 transition-all whitespace-nowrap text-xs md:text-sm ${
                      currentPassageIndex === index
                        ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-900 dark:text-indigo-100'
                        : 'border-gray-300 dark:border-gray-600 hover:border-indigo-300 dark:hover:border-indigo-500'
                    }`}
                  >
                    Passage {index + 1}: {passage.title || 'Untitled'}
                  </button>
                ))}
              </div>

              <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4 md:p-6">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 md:gap-0 mb-4">
                  <input
                    type="text"
                    value={exam.passages[currentPassageIndex].title}
                    onChange={(e) => updatePassage(currentPassageIndex, 'title', e.target.value)}
                    className="w-full md:flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm md:text-base dark:bg-gray-800 dark:text-gray-200"
                    placeholder="Passage Title"
                  />
                  <div className="flex items-center gap-3 w-full md:w-auto">
                    <div className="flex items-center gap-2">
                      <label className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">Questions</label>
                      <input
                        type="number"
                        min={0}
                        max={50}
                        value={exam.passages[currentPassageIndex].questions.length}
                        onChange={(e) => updateQuestionCount(currentPassageIndex, parseInt(e.target.value) || 0)}
                        className="w-16 px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md text-sm dark:bg-gray-800 dark:text-gray-200 text-center"
                      />
                    </div>
                    <button
                      onClick={() => removePassage(currentPassageIndex)}
                      className="px-3 py-2 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 text-sm md:text-base w-full md:w-auto"
                    >
                      Remove Passage
                    </button>
                  </div>
                </div>
                <RichTextEditor
                  key={exam.passages[currentPassageIndex].id}
                  value={exam.passages[currentPassageIndex].passageText}
                  onChange={(html) => updatePassage(currentPassageIndex, 'passageText', html)}
                  placeholder="Enter passage content..."
                />

                {/* Audio Upload - only for listening exams */}
                {exam.skillType === 'listening' && (
                  <div className="mt-6 border-t border-gray-200 pt-6">
                    <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                      <Music size={16} />
                      Audio File
                    </h4>

                    {exam.passages[currentPassageIndex].audioUrl ? (
                      <div className="bg-indigo-50 dark:bg-indigo-900/30 rounded-xl p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2 text-sm text-indigo-700 dark:text-indigo-300">
                            <CheckCircle size={16} />
                            <span>Audio uploaded</span>
                          </div>
                          <button
                            onClick={handleAudioDelete}
                            disabled={uploadingAudio}
                            className="flex items-center gap-1 px-3 py-1.5 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 text-xs font-medium transition-colors"
                          >
                            <Trash2 size={14} />
                            Delete
                          </button>
                        </div>
                        <audio
                          controls
                          preload="metadata"
                          className="w-full h-10 rounded-lg"
                          src={getAudioUrl(exam.passages[currentPassageIndex].audioUrl!)}
                        >
                          Your browser does not support the audio element.
                        </audio>
                      </div>
                    ) : (
                      <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-6 text-center hover:border-indigo-400 transition-colors">
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept=".mp3,.wav,.m4a,audio/*"
                          onChange={handleFileChange}
                          className="hidden"
                          id="audio-upload"
                        />
                        <label
                          htmlFor="audio-upload"
                          className="cursor-pointer flex flex-col items-center gap-2"
                        >
                          <div className="p-3 bg-indigo-100 dark:bg-indigo-900/30 rounded-full">
                            <Upload size={24} className="text-indigo-600" />
                          </div>
                          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            {uploadingAudio ? 'Uploading...' : 'Click to upload audio'}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            Supported formats: MP3, WAV, M4A
                          </p>
                        </label>
                      </div>
                    )}

                    {audioUploadError && (
                      <div className="mt-2 flex items-center gap-1 text-red-600 dark:text-red-400 text-xs">
                        <AlertCircle size={12} />
                        <span>{audioUploadError}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          )}

          {exam.passages.length === 0 && (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              No passages yet. Click "Add Passage" to get started.
            </div>
          )}

          <div className="flex justify-between mt-4 md:mt-6">
            <button
              onClick={() => setStep(1)}
              className="px-4 md:px-6 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-100 text-sm md:text-base"
            >
              Back
            </button>
            <button
              onClick={() => setStep(3)}
              disabled={exam.passages.length === 0}
              className="px-4 md:px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm md:text-base"
            >
              Next: Add Questions
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Questions */}
      {step === 3 && (
        <div>
          <div className="flex items-center gap-2 md:gap-4 mb-4 md:mb-6 overflow-x-auto pb-2">
            {exam.passages.map((passage, index) => (
              <button
                key={passage.id}
                onClick={() => setCurrentPassageIndex(index)}
                className={`px-3 md:px-4 py-2 rounded-lg border-2 transition-all flex-shrink-0 text-xs md:text-sm ${
                currentPassageIndex === index
                  ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-900 dark:text-indigo-100'
                  : 'border-gray-300 dark:border-gray-600 hover:border-indigo-300 dark:hover:border-indigo-500'
              }`}
              >
                Passage {index + 1} Questions
              </button>
            ))}
          </div>

          {exam.passages.length > 0 && (
            <div className="space-y-4 md:space-y-6">
              {exam.passages[currentPassageIndex].questions.map((question, qIndex) => (
                <div key={question.id} className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4 md:p-6 border border-gray-200 dark:border-gray-600">
                  <div className="flex items-center justify-between mb-3 md:mb-4">
                    <h4 className="text-base md:text-lg font-semibold text-indigo-900 dark:text-gray-100">Question {qIndex + 1}</h4>
                  </div>

                  <div className="mb-4">
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Question Text</label>
                    <textarea
                      value={question.questionText}
                      onChange={(e) => updateQuestion(currentPassageIndex, qIndex, 'questionText', e.target.value)}
                      rows={2}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-800 dark:text-gray-200"
                      placeholder="Enter question text..."
                    />
                  </div>

                  <div className="mb-4">
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Options</label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {['A', 'B', 'C', 'D'].map((label, optIndex) => (
                        <div key={label} className="flex items-center gap-2">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 ${
                            question.correctAnswer === optIndex
                              ? 'bg-green-500 text-white'
                              : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                          }`}>
                            {label}
                          </div>
                          <input
                            type="text"
                            value={question.options[optIndex] || ''}
                            onChange={(e) => updateOption(currentPassageIndex, qIndex, optIndex, e.target.value)}
                            placeholder={`Option ${label}`}
                            className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-800 dark:text-gray-200"
                          />
                          <button
                            type="button"
                            onClick={() => updateQuestion(currentPassageIndex, qIndex, 'correctAnswer', optIndex)}
                            className={`px-2 py-1 text-xs rounded flex-shrink-0 ${
                              question.correctAnswer === optIndex
                                ? 'bg-green-100 text-green-700'
                                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                            }`}
                          >
                            Correct
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Explanation</label>
                    <textarea
                      value={question.explanation}
                      onChange={(e) => updateQuestion(currentPassageIndex, qIndex, 'explanation', e.target.value)}
                      rows={2}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-800 dark:text-gray-200"
                      placeholder="Explain why this answer is correct..."
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-between mt-6 md:mt-8">
            <button
              onClick={() => setStep(2)}
              className="px-4 md:px-6 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-100 text-sm md:text-base"
            >
              Back
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 md:px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2 text-sm md:text-base"
            >
              {saving ? 'Saving...' : 'Save Exam'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
