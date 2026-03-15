import React, { useState } from 'react';
import { Survey } from '../types';
import { Clock, Coins, ChevronRight, CheckCircle, ArrowLeft, Tag } from 'lucide-react';

interface SurveyPageProps {
  surveys: Survey[];
  onComplete: (surveyId: number, reward: number) => void;
}

const categoryColors: Record<string, string> = {
  Lifestyle: 'bg-green-100 text-green-700',
  Technology: 'bg-blue-100 text-blue-700',
  Food: 'bg-orange-100 text-orange-700',
  Shopping: 'bg-purple-100 text-purple-700',
  Entertainment: 'bg-pink-100 text-pink-700',
};

export const SurveyPage: React.FC<SurveyPageProps> = ({ surveys, onComplete }) => {
  const [activeSurvey, setActiveSurvey] = useState<Survey | null>(null);
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string | string[]>>({});
  const [done, setDone] = useState(false);

  const startSurvey = (survey: Survey) => {
    setActiveSurvey(survey);
    setCurrentQ(0);
    setAnswers({});
    setDone(false);
  };

  const handleRadio = (val: string) => {
    if (!activeSurvey) return;
    setAnswers((prev) => ({ ...prev, [activeSurvey.questions[currentQ].id]: val }));
  };

  const handleCheckbox = (val: string) => {
    if (!activeSurvey) return;
    const qId = activeSurvey.questions[currentQ].id;
    const curr = (answers[qId] as string[]) || [];
    if (curr.includes(val)) {
      setAnswers((prev) => ({ ...prev, [qId]: curr.filter((v) => v !== val) }));
    } else {
      setAnswers((prev) => ({ ...prev, [qId]: [...curr, val] }));
    }
  };

  const handleText = (val: string) => {
    if (!activeSurvey) return;
    setAnswers((prev) => ({ ...prev, [activeSurvey.questions[currentQ].id]: val }));
  };

  const isAnswered = () => {
    if (!activeSurvey) return false;
    const q = activeSurvey.questions[currentQ];
    const ans = answers[q.id];
    if (q.type === 'radio') return !!ans;
    if (q.type === 'checkbox') return Array.isArray(ans) && ans.length > 0;
    if (q.type === 'text') return typeof ans === 'string' && ans.trim().length > 2;
    return false;
  };

  const nextQuestion = () => {
    if (!activeSurvey) return;
    if (currentQ < activeSurvey.questions.length - 1) {
      setCurrentQ((q) => q + 1);
    } else {
      setDone(true);
      onComplete(activeSurvey.id, activeSurvey.reward);
    }
  };

  if (activeSurvey && !done) {
    const question = activeSurvey.questions[currentQ];
    const progress = ((currentQ + 1) / activeSurvey.questions.length) * 100;

    return (
      <div className="max-w-xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setActiveSurvey(null)}
            className="bg-white border border-gray-200 rounded-xl p-2 shadow-sm hover:bg-gray-50 transition"
          >
            <ArrowLeft size={18} className="text-gray-600" />
          </button>
          <div className="flex-1">
            <h2 className="font-bold text-gray-800 text-base leading-tight">{activeSurvey.title}</h2>
            <p className="text-xs text-gray-400">Question {currentQ + 1} of {activeSurvey.questions.length}</p>
          </div>
          <div className="flex items-center gap-1 bg-yellow-50 border border-yellow-200 rounded-full px-3 py-1">
            <Coins size={14} className="text-yellow-500" />
            <span className="text-yellow-600 font-bold text-sm">{activeSurvey.reward}</span>
          </div>
        </div>

        {/* Progress */}
        <div className="bg-gray-100 rounded-full h-2">
          <div
            className="bg-gradient-to-r from-amber-400 to-orange-500 rounded-full h-2 transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Question Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-5">
          <h3 className="text-gray-800 font-semibold text-lg">{question.text}</h3>

          {question.type === 'radio' && question.options && (
            <div className="space-y-3">
              {question.options.map((opt) => (
                <label
                  key={opt}
                  className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all duration-150 ${
                    answers[question.id] === opt
                      ? 'border-amber-400 bg-amber-50'
                      : 'border-gray-200 hover:border-amber-200 hover:bg-amber-50/30'
                  }`}
                >
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                    answers[question.id] === opt ? 'border-amber-500 bg-amber-500' : 'border-gray-300'
                  }`}>
                    {answers[question.id] === opt && (
                      <div className="w-2 h-2 rounded-full bg-white" />
                    )}
                  </div>
                  <input type="radio" className="hidden" onChange={() => handleRadio(opt)} />
                  <span className="text-gray-700 font-medium text-sm">{opt}</span>
                </label>
              ))}
            </div>
          )}

          {question.type === 'checkbox' && question.options && (
            <div className="space-y-3">
              {question.options.map((opt) => {
                const checked = Array.isArray(answers[question.id]) && (answers[question.id] as string[]).includes(opt);
                return (
                  <label
                    key={opt}
                    className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all duration-150 ${
                      checked ? 'border-amber-400 bg-amber-50' : 'border-gray-200 hover:border-amber-200'
                    }`}
                    onClick={() => handleCheckbox(opt)}
                  >
                    <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 ${
                      checked ? 'border-amber-500 bg-amber-500' : 'border-gray-300'
                    }`}>
                      {checked && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                    </div>
                    <span className="text-gray-700 font-medium text-sm">{opt}</span>
                  </label>
                );
              })}
            </div>
          )}

          {question.type === 'text' && (
            <textarea
              rows={3}
              placeholder="Type your answer here..."
              className="w-full border-2 border-gray-200 rounded-xl p-3 text-gray-700 text-sm focus:outline-none focus:border-amber-400 resize-none transition"
              value={(answers[question.id] as string) || ''}
              onChange={(e) => handleText(e.target.value)}
            />
          )}
        </div>

        <button
          disabled={!isAnswered()}
          onClick={nextQuestion}
          className={`w-full py-4 rounded-2xl font-bold text-white flex items-center justify-center gap-2 transition-all duration-200 ${
            isAnswered()
              ? 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 shadow-lg active:scale-95'
              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
          }`}
        >
          {currentQ < activeSurvey.questions.length - 1 ? (
            <>Next Question <ChevronRight size={18} /></>
          ) : (
            <>Submit & Earn 🪙</>
          )}
        </button>
      </div>
    );
  }

  if (done && activeSurvey) {
    return (
      <div className="max-w-md mx-auto text-center space-y-6 py-10">
        <div className="inline-flex items-center justify-center w-24 h-24 bg-green-100 rounded-full mb-4">
          <CheckCircle className="text-green-500" size={48} />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Survey Complete! 🎉</h2>
          <p className="text-gray-500 mt-2">You've earned coins for completing the survey.</p>
        </div>
        <div className="bg-gradient-to-br from-yellow-400 to-amber-500 rounded-2xl p-6 text-white shadow-lg">
          <p className="text-white/80 text-sm mb-1">Coins Earned</p>
          <p className="text-5xl font-black">+{activeSurvey.reward} 🪙</p>
        </div>
        <button
          onClick={() => setActiveSurvey(null)}
          className="w-full bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold py-4 rounded-2xl shadow-lg hover:from-amber-600 hover:to-orange-600 transition active:scale-95"
        >
          Do More Surveys
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold text-gray-800">Available Surveys</h2>
        <p className="text-gray-500 text-sm mt-1">Complete surveys to earn coins instantly!</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {surveys.map((survey) => (
          <div
            key={survey.id}
            className={`bg-white rounded-2xl border shadow-sm p-5 flex flex-col gap-3 transition-all duration-200 ${
              survey.completed ? 'opacity-60 border-gray-100' : 'border-gray-100 hover:shadow-md hover:-translate-y-0.5'
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-bold text-gray-800 text-base leading-snug">{survey.title}</h3>
              {survey.completed && (
                <span className="flex-shrink-0 bg-green-100 text-green-600 text-xs font-bold px-2 py-1 rounded-full">Done ✓</span>
              )}
            </div>
            <p className="text-gray-500 text-sm leading-relaxed">{survey.description}</p>
            <div className="flex items-center gap-3 flex-wrap">
              <span className={`flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ${categoryColors[survey.category] || 'bg-gray-100 text-gray-600'}`}>
                <Tag size={10} /> {survey.category}
              </span>
              <span className="flex items-center gap-1 text-xs text-gray-400 font-medium">
                <Clock size={12} /> {survey.duration}
              </span>
              <span className="flex items-center gap-1 text-xs font-bold text-amber-600 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full ml-auto">
                <Coins size={12} /> {survey.reward} coins
              </span>
            </div>
            <button
              disabled={survey.completed}
              onClick={() => startSurvey(survey)}
              className={`mt-1 w-full py-3 rounded-xl font-bold text-sm transition-all duration-200 active:scale-95 ${
                survey.completed
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md hover:from-amber-600 hover:to-orange-600'
              }`}
            >
              {survey.completed ? '✓ Completed' : 'Start Survey →'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
