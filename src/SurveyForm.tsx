import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, ChevronRight, Send, ClipboardCheck, BookOpen, User, MessageSquare, AlertCircle } from 'lucide-react';
import { Evaluation, MODULE_QUESTIONS, TRAINER_QUESTIONS } from './types';
import { submitEvaluation } from './storage';

interface Props {
  onSubmit: () => void;
}

const blank = (): Omit<Evaluation, 'id' | 'submitted_at'> => ({
  module_title: '', trainer_name: '',
  evaluation_date: new Date().toISOString().split('T')[0],
  delivery_from: '', delivery_to: '',
  module_q1: null, module_q2: null, module_q3: null, module_q4: null, module_q5: null,
  trainer_q1: null, trainer_q2: null, trainer_q3: null, trainer_q4: null,
  trainer_q5: null, trainer_q6: null, trainer_q7: null, trainer_q8: null,
  comments: '', challenges: '', suggestions: '',
});

const TOTAL = 4;

export default function SurveyForm({ onSubmit }: Props) {
  const [step, setStep]               = useState(0);
  const [data, setData]               = useState(blank());
  const [submitting, setSubmitting]   = useState(false);
  const [submitError, setSubmitError] = useState('');

  const set = <K extends keyof typeof data>(k: K, v: (typeof data)[K]) =>
    setData((prev) => ({ ...prev, [k]: v }));

  const handleSubmit = async () => {
    setSubmitting(true);
    setSubmitError('');
    const { error } = await submitEvaluation(data);
    if (error) {
      setSubmitError(`Failed to submit: ${error}. Check your internet connection.`);
      setSubmitting(false);
      return;
    }
    setSubmitting(false);
    onSubmit();
  };

  const inputCls = 'w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white';

  const RatingRow = ({ label, qKey, section }: { label: string; qKey: keyof Evaluation; section: 'module' | 'trainer' }) => {
    const current = data[qKey] as number | null;
    const color = section === 'module' ? 'blue' : 'indigo';
    return (
      <div className="space-y-2 pb-5 border-b border-slate-100 last:border-0">
        <p className="text-sm font-semibold text-slate-700">{label}</p>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] text-slate-400 w-16 text-right">Low</span>
          {[1, 2, 3, 4, 5].map((val) => (
            <button key={val} type="button" onClick={() => set(qKey, val as never)}
              className={`w-10 h-10 rounded-xl text-sm font-black border-2 transition-all ${
                current === val
                  ? color === 'blue'
                    ? 'bg-blue-600 border-blue-600 text-white scale-110 shadow-lg shadow-blue-900/20'
                    : 'bg-indigo-600 border-indigo-600 text-white scale-110 shadow-lg shadow-indigo-900/20'
                  : color === 'blue'
                  ? 'border-slate-200 text-slate-400 hover:border-blue-400 hover:text-blue-500'
                  : 'border-slate-200 text-slate-400 hover:border-indigo-400 hover:text-indigo-500'
              }`}>{val}</button>
          ))}
          <span className="text-[10px] text-slate-400 w-16">High</span>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50/30 py-10 px-4">
      <div className="max-w-xl mx-auto">

        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-3">
            <div className="bg-blue-700 p-2 rounded-xl shadow-lg shadow-blue-900/20">
              <ClipboardCheck className="w-6 h-6 text-white" />
            </div>
            <div className="text-left">
              <div className="font-black text-slate-900 text-xl leading-none">RMI</div>
              <div className="text-[9px] text-slate-400 uppercase tracking-widest mt-0.5">Rwanda Management Institute</div>
            </div>
          </div>
          <h2 className="text-lg font-black text-slate-800 uppercase tracking-wide">Post-Training Evaluation</h2>
          <p className="text-blue-600 text-xs font-semibold mt-1">Prepared by BIG DATA FACTORY</p>
        </div>

        <div className="mb-6">
          <div className="flex justify-between text-xs font-bold text-slate-400 mb-2">
            <span>Step {step + 1} / {TOTAL}</span>
            <span>{Math.round(((step + 1) / TOTAL) * 100)}%</span>
          </div>
          <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
            <motion.div className="h-full bg-gradient-to-r from-blue-600 to-indigo-500 rounded-full"
              animate={{ width: `${((step + 1) / TOTAL) * 100}%` }} transition={{ duration: 0.35 }} />
          </div>
          <div className="flex justify-between mt-2">
            {['Info', 'Module', 'Trainer', 'Feedback'].map((label, i) => (
              <div key={label} className="flex flex-col items-center gap-1">
                <div className={`w-2 h-2 rounded-full transition-colors ${i <= step ? 'bg-blue-600' : 'bg-slate-200'}`} />
                <span className={`text-[9px] uppercase tracking-widest ${i <= step ? 'text-blue-600 font-bold' : 'text-slate-300'}`}>{label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-3xl shadow-xl shadow-slate-900/5 border border-slate-100 overflow-hidden">
          <AnimatePresence mode="wait">

            {step === 0 && (
              <motion.div key="s0" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} className="p-6 space-y-5">
                <div className="flex items-center gap-2 text-blue-700 mb-2">
                  <BookOpen className="w-4 h-4" />
                  <h3 className="font-black text-base">General Information</h3>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Module Title *</label>
                  <input type="text" className={inputCls} placeholder="e.g. Leadership & Management" value={data.module_title} onChange={(e) => set('module_title', e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Trainer Name *</label>
                  <input type="text" className={inputCls} placeholder="Full name of trainer" value={data.trainer_name} onChange={(e) => set('trainer_name', e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Evaluation Date</label>
                  <input type="date" className={inputCls} value={data.evaluation_date} onChange={(e) => set('evaluation_date', e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Delivery From</label>
                    <input type="date" className={inputCls} value={data.delivery_from} onChange={(e) => set('delivery_from', e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">To</label>
                    <input type="date" className={inputCls} value={data.delivery_to} onChange={(e) => set('delivery_to', e.target.value)} />
                  </div>
                </div>
              </motion.div>
            )}

            {step === 1 && (
              <motion.div key="s1" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} className="p-6 space-y-5">
                <div className="flex items-center gap-2 text-blue-700 mb-1">
                  <BookOpen className="w-4 h-4" />
                  <h3 className="font-black text-base uppercase">Section A · Module</h3>
                </div>
                <p className="text-xs text-slate-400">Rate each item: 1 = low, 5 = high</p>
                {MODULE_QUESTIONS.map((q) => <RatingRow key={q.key} label={q.label} qKey={q.key} section="module" />)}
              </motion.div>
            )}

            {step === 2 && (
              <motion.div key="s2" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} className="p-6 space-y-5">
                <div className="flex items-center gap-2 text-indigo-700 mb-1">
                  <User className="w-4 h-4" />
                  <h3 className="font-black text-base uppercase">Section B · Trainer</h3>
                </div>
                <p className="text-xs text-slate-400">Rate each item: 1 = low, 5 = high</p>
                {TRAINER_QUESTIONS.map((q) => <RatingRow key={q.key} label={q.label} qKey={q.key} section="trainer" />)}
              </motion.div>
            )}

            {step === 3 && (
              <motion.div key="s3" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} className="p-6 space-y-5">
                <div className="flex items-center gap-2 text-blue-700">
                  <MessageSquare className="w-4 h-4" />
                  <h3 className="font-black text-base uppercase">Additional Feedback</h3>
                </div>
                {[
                  { label: '9. Any other comments about the module, trainer and training environment?', key: 'comments'    as keyof typeof data, ph: 'Share your comments...'  },
                  { label: '10. Job-related challenges not addressed by this training?',                key: 'challenges'  as keyof typeof data, ph: 'Describe challenges...'   },
                  { label: '11. Suggest training modules to help overcome those challenges:',          key: 'suggestions' as keyof typeof data, ph: 'Your suggestions...'      },
                ].map(({ label, key, ph }) => (
                  <div key={key}>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">{label}</label>
                    <textarea rows={3} placeholder={ph}
                      value={data[key] as string}
                      onChange={(e) => set(key, e.target.value as never)}
                      className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 resize-none transition-all"
                    />
                  </div>
                ))}
                {submitError && (
                  <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-xs">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    {submitError}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          <div className="px-6 py-4 bg-slate-50/60 border-t border-slate-100 flex justify-between items-center">
            {step > 0 ? (
              <button onClick={() => setStep((s) => s - 1)}
                className="flex items-center gap-1 px-4 py-2.5 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-200 font-semibold text-sm transition-all">
                <ChevronLeft className="w-4 h-4" /> Back
              </button>
            ) : <div />}

            {step < TOTAL - 1 ? (
              <button onClick={() => setStep((s) => s + 1)}
                className="flex items-center gap-1 px-6 py-2.5 bg-blue-700 hover:bg-blue-600 text-white rounded-xl font-bold text-sm transition-all shadow-lg shadow-blue-900/20">
                Next <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button onClick={handleSubmit} disabled={submitting}
                className="flex items-center gap-2 px-6 py-2.5 bg-green-600 hover:bg-green-500 disabled:opacity-60 text-white rounded-xl font-bold text-sm transition-all shadow-lg shadow-green-900/20">
                {submitting
                  ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Submitting...</>
                  : <><Send className="w-4 h-4" /> Submit</>}
              </button>
            )}
          </div>
        </div>

        <p className="text-center text-[10px] text-slate-300 mt-6">
          Effective date: 27/12/2023 · TU/RO/023/018 Rev 01 · Prepared by BIG DATA FACTORY
        </p>
      </div>
    </div>
  );
}