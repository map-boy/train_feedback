import { motion } from 'framer-motion';
import { CheckCircle2, XCircle, AlertTriangle, Trophy, RotateCcw, Home } from 'lucide-react';
import { FelixResult, FelixExam } from './types';

interface Props {
  result: FelixResult;
  exam: FelixExam;
  onReturnHome: () => void;
}

export default function FelixResultPage({ result, exam, onReturnHome }: Props) {
  const pct = Math.round(result.percentage);
  const passed = pct >= 50;

  const grade =
    pct >= 90 ? { letter: 'A', label: 'Excellent', color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' } :
    pct >= 80 ? { letter: 'B', label: 'Good', color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20' } :
    pct >= 70 ? { letter: 'C', label: 'Satisfactory', color: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/20' } :
    pct >= 50 ? { letter: 'D', label: 'Passing', color: 'text-orange-400', bg: 'bg-orange-500/10 border-orange-500/20' } :
                { letter: 'F', label: 'Failed', color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20' };

  const questions = exam.questions ?? [];

  return (
    <div className="min-h-screen bg-[#080C14] text-white flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Score card */}
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}
          className="bg-white/[0.03] border border-white/[0.08] rounded-3xl p-8 text-center mb-6">

          {/* Grade circle */}
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.2, type: 'spring' }}
            className={`w-24 h-24 rounded-2xl border-2 ${grade.bg} flex flex-col items-center justify-center mx-auto mb-6`}>
            <span className={`text-4xl font-black ${grade.color}`}>{grade.letter}</span>
          </motion.div>

          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}>
            <div className="text-5xl font-black mb-1">{pct}<span className="text-2xl text-slate-500">%</span></div>
            <div className={`text-sm font-semibold mb-1 ${grade.color}`}>{grade.label}</div>
            <div className="text-slate-600 text-xs">{result.score} / {result.total_questions} correct</div>
          </motion.div>

          {/* Stats row */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
            className="grid grid-cols-3 gap-3 mt-6">
            <div className="bg-white/[0.03] rounded-xl p-3">
              <div className="text-white font-bold text-lg">{result.score}</div>
              <div className="text-slate-600 text-[10px]">Correct</div>
            </div>
            <div className="bg-white/[0.03] rounded-xl p-3">
              <div className="text-white font-bold text-lg">{result.total_questions - result.score}</div>
              <div className="text-slate-600 text-[10px]">Wrong</div>
            </div>
            <div className={`rounded-xl p-3 ${result.violation_count >= 3 ? 'bg-red-500/10' : 'bg-white/[0.03]'}`}>
              <div className={`font-bold text-lg ${result.violation_count >= 3 ? 'text-red-400' : 'text-white'}`}>
                {result.violation_count}
              </div>
              <div className="text-slate-600 text-[10px]">Violations</div>
            </div>
          </motion.div>

          {result.cheating_detected && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}
              className="mt-4 flex items-center gap-2 justify-center bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">
              <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0" />
              <span className="text-red-400 text-xs font-semibold">Flagged for academic integrity review</span>
            </motion.div>
          )}
        </motion.div>

        {/* Answer review */}
        {questions.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
            className="bg-white/[0.03] border border-white/[0.08] rounded-3xl p-6 mb-6">
            <h3 className="font-bold text-sm mb-4 text-slate-300">Answer Review</h3>
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {questions.map((q, i) => {
                const studentAns = result.answers[q.id!] ?? '';
                const correct = q.question_type !== 'short_answer' &&
                  studentAns.trim().toLowerCase() === q.correct_answer.trim().toLowerCase();
                const isShort = q.question_type === 'short_answer';

                return (
                  <div key={q.id ?? i} className="flex items-start gap-3">
                    <div className="shrink-0 mt-0.5">
                      {isShort
                        ? <div className="w-4 h-4 rounded-full bg-slate-700 flex items-center justify-center">
                            <span className="text-[8px] text-slate-400">?</span>
                          </div>
                        : correct
                          ? <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          : <XCircle className="w-4 h-4 text-red-400" />
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-slate-400 truncate">{q.text}</p>
                      {!correct && !isShort && (
                        <p className="text-[10px] text-emerald-500 mt-0.5">Correct: {q.correct_answer}</p>
                      )}
                      {isShort && (
                        <p className="text-[10px] text-slate-600 mt-0.5">Manual grading required</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}

        <motion.button initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }}
          onClick={onReturnHome}
          className="w-full py-3 bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.08] text-white rounded-xl font-bold text-sm transition-colors flex items-center justify-center gap-2">
          <Home className="w-4 h-4" />Return to Home
        </motion.button>
      </div>
    </div>
  );
}