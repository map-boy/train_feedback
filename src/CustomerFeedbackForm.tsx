import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, ChevronRight, Send, Star, Home, Users, AlertCircle, ClipboardCheck } from 'lucide-react';
import { CustomerFeedback, RATING_OPTIONS, RATING_LABELS } from './types';
import { submitCustomerFeedback } from './storage';

interface Props {
  onSubmit: () => void;
}

const blank = (): Omit<CustomerFeedback, 'id' | 'submitted_at'> => ({
  reception_rating: null, reception_suggestion: '',
  service_rating: null,   service_suggestion: '',
  is_resident: false,
  room_rating: null,      room_suggestion: '',
  catering_rating: null,  catering_suggestion: '',
  room_number: '', period_from: '', period_to: '', courses_attended: '',
});

const TOTAL_NON_RESIDENT = 2; // step 0 (section1) + step 1 (meta)
const TOTAL_RESIDENT     = 3; // step 0 (section1) + step 1 (section2) + step 2 (meta)

// Rating selector component
const RatingSelector = ({
  label, value, onChange, suggestion, onSuggestion,
}: {
  label: string;
  value: number | null;
  onChange: (v: number) => void;
  suggestion: string;
  onSuggestion: (v: string) => void;
}) => (
  <div className="space-y-3 pb-6 border-b border-slate-100 last:border-0">
    <p className="text-sm font-semibold text-slate-700">{label}</p>
    {/* Rating buttons: Excellent → Poor */}
    <div className="flex gap-2 flex-wrap">
      {RATING_OPTIONS.map((val) => {
        const labelText = RATING_LABELS[val - 1];
        const selected = value === val;
        const colors: Record<number, string> = {
          5: selected ? 'bg-green-600 border-green-600 text-white' : 'border-green-200 text-green-600 hover:border-green-400 hover:bg-green-50',
          4: selected ? 'bg-teal-600 border-teal-600 text-white'  : 'border-teal-200 text-teal-600 hover:border-teal-400 hover:bg-teal-50',
          3: selected ? 'bg-blue-600 border-blue-600 text-white'   : 'border-blue-200 text-blue-600 hover:border-blue-400 hover:bg-blue-50',
          2: selected ? 'bg-amber-500 border-amber-500 text-white' : 'border-amber-200 text-amber-600 hover:border-amber-400 hover:bg-amber-50',
          1: selected ? 'bg-red-600 border-red-600 text-white'     : 'border-red-200 text-red-600 hover:border-red-400 hover:bg-red-50',
        };
        return (
          <button
            key={val}
            type="button"
            onClick={() => onChange(val)}
            className={`px-4 py-2 rounded-xl border-2 text-sm font-bold transition-all ${colors[val]} ${selected ? 'scale-105 shadow-md' : ''}`}
          >
            {labelText}
          </button>
        );
      })}
    </div>
    <div>
      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
        Suggestion for improvement (optional)
      </label>
      <textarea
        rows={2}
        value={suggestion}
        onChange={(e) => onSuggestion(e.target.value)}
        placeholder="Your suggestion..."
        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-400 resize-none transition-all"
      />
    </div>
  </div>
);

export default function CustomerFeedbackForm({ onSubmit }: Props) {
  const [step, setStep]               = useState(0);
  const [data, setData]               = useState(blank());
  const [submitting, setSubmitting]   = useState(false);
  const [submitError, setSubmitError] = useState('');

  const set = <K extends keyof typeof data>(k: K, v: (typeof data)[K]) =>
    setData((prev) => ({ ...prev, [k]: v }));

  const totalSteps = data.is_resident ? TOTAL_RESIDENT : TOTAL_NON_RESIDENT;

  const handleSubmit = async () => {
    setSubmitting(true);
    setSubmitError('');
    const { error } = await submitCustomerFeedback(data);
    if (error) {
      setSubmitError(`Failed to submit: ${error}. Please check your internet connection.`);
      setSubmitting(false);
      return;
    }
    setSubmitting(false);
    onSubmit();
  };

  const inputCls = 'w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all bg-white';

  // Step labels depend on residency
  const stepLabels = data.is_resident
    ? ['Section 1', 'Section 2', 'Your Info']
    : ['Section 1', 'Your Info'];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-green-50/30 py-10 px-4">
      <div className="max-w-xl mx-auto">

        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-3">
            <div className="bg-green-700 p-2 rounded-xl shadow-lg shadow-green-900/20">
              <Star className="w-6 h-6 text-white" />
            </div>
            <div className="text-left">
              <div className="font-black text-slate-900 text-xl leading-none">RMI</div>
              <div className="text-[9px] text-slate-400 uppercase tracking-widest mt-0.5">Rwanda Management Institute</div>
            </div>
          </div>
          <h2 className="text-lg font-black text-slate-800 uppercase tracking-wide">Customer Feedback Form</h2>
          <p className="text-green-600 text-xs font-semibold mt-1">Prepared by BIG DATA FACTORY</p>
          <p className="text-slate-500 text-xs mt-2 max-w-sm mx-auto">
            Thank you for visiting RMI. Please spare a moment to tell us about your experience.
          </p>
        </div>

        {/* Progress */}
        <div className="mb-6">
          <div className="flex justify-between text-xs font-bold text-slate-400 mb-2">
            <span>Step {step + 1} / {totalSteps}</span>
            <span>{Math.round(((step + 1) / totalSteps) * 100)}%</span>
          </div>
          <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
            <motion.div className="h-full bg-gradient-to-r from-green-500 to-teal-500 rounded-full"
              animate={{ width: `${((step + 1) / totalSteps) * 100}%` }} transition={{ duration: 0.35 }} />
          </div>
          <div className="flex justify-between mt-2">
            {stepLabels.map((label, i) => (
              <div key={label} className="flex flex-col items-center gap-1">
                <div className={`w-2 h-2 rounded-full transition-colors ${i <= step ? 'bg-green-600' : 'bg-slate-200'}`} />
                <span className={`text-[9px] uppercase tracking-widest ${i <= step ? 'text-green-600 font-bold' : 'text-slate-300'}`}>{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Card */}
        <div className="bg-white rounded-3xl shadow-xl shadow-slate-900/5 border border-slate-100 overflow-hidden">
          <AnimatePresence mode="wait">

            {/* ── Step 0: Section 1 — All customers ── */}
            {step === 0 && (
              <motion.div key="s0" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} className="p-6 space-y-6">
                <div className="flex items-center gap-2 text-green-700 mb-1">
                  <Users className="w-4 h-4" />
                  <h3 className="font-black text-base uppercase">Section 1 · For All Customers</h3>
                </div>
                <p className="text-xs text-slate-400 -mt-4">Please circle your rating for each question</p>

                <RatingSelector
                  label="1. Rate how you were received in RMI"
                  value={data.reception_rating}
                  onChange={(v) => set('reception_rating', v)}
                  suggestion={data.reception_suggestion}
                  onSuggestion={(v) => set('reception_suggestion', v)}
                />
                <RatingSelector
                  label="2. How satisfied were you with the quality of service rendered to you?"
                  value={data.service_rating}
                  onChange={(v) => set('service_rating', v)}
                  suggestion={data.service_suggestion}
                  onSuggestion={(v) => set('service_suggestion', v)}
                />

                {/* Resident toggle */}
                <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4">
                  <p className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                    <Home className="w-4 h-4 text-blue-600" />
                    Are you a resident customer?
                  </p>
                  <div className="flex gap-3">
                    {[
                      { val: true,  label: 'Yes, I am a resident' },
                      { val: false, label: 'No, non-resident'      },
                    ].map(({ val, label }) => (
                      <button key={String(val)} type="button"
                        onClick={() => set('is_resident', val)}
                        className={`flex-1 py-2.5 rounded-xl text-sm font-bold border-2 transition-all ${
                          data.is_resident === val
                            ? 'bg-blue-600 border-blue-600 text-white'
                            : 'border-slate-200 text-slate-500 hover:border-blue-300'
                        }`}
                      >{label}</button>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {/* ── Step 1 (resident): Section 2 — Resident customers ── */}
            {step === 1 && data.is_resident && (
              <motion.div key="s1r" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} className="p-6 space-y-6">
                <div className="flex items-center gap-2 text-green-700 mb-1">
                  <Home className="w-4 h-4" />
                  <h3 className="font-black text-base uppercase">Section 2 · Resident Customers</h3>
                </div>
                <p className="text-xs text-slate-400 -mt-4">These questions apply to overnight stay customers</p>

                <RatingSelector
                  label="3. How convenient was your room? (cleanliness, lighting, water supply, comfort, and other aspects)"
                  value={data.room_rating}
                  onChange={(v) => set('room_rating', v)}
                  suggestion={data.room_suggestion}
                  onSuggestion={(v) => set('room_suggestion', v)}
                />
                <RatingSelector
                  label="4. How satisfied were you with the catering services? (food, drinks, waiters, venue and other restaurant services)"
                  value={data.catering_rating}
                  onChange={(v) => set('catering_rating', v)}
                  suggestion={data.catering_suggestion}
                  onSuggestion={(v) => set('catering_suggestion', v)}
                />
              </motion.div>
            )}

            {/* ── Last step: meta info ── */}
            {((step === 1 && !data.is_resident) || (step === 2 && data.is_resident)) && (
              <motion.div key="meta" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} className="p-6 space-y-5">
                <div className="flex items-center gap-2 text-green-700 mb-1">
                  <ClipboardCheck className="w-4 h-4" />
                  <h3 className="font-black text-base uppercase">Your Information</h3>
                </div>
                <p className="text-xs text-slate-400 -mt-3">Optional — helps us follow up on your feedback</p>

                {data.is_resident && (
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Room Number</label>
                    <input type="text" className={inputCls} placeholder="e.g. 204" value={data.room_number} onChange={(e) => set('room_number', e.target.value)} />
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Period From</label>
                    <input type="date" className={inputCls} value={data.period_from} onChange={(e) => set('period_from', e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">To</label>
                    <input type="date" className={inputCls} value={data.period_to} onChange={(e) => set('period_to', e.target.value)} />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Course(s) Attended</label>
                  <input type="text" className={inputCls} placeholder="Course name(s)" value={data.courses_attended} onChange={(e) => set('courses_attended', e.target.value)} />
                </div>

                {submitError && (
                  <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-xs">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    {submitError}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Footer nav */}
          <div className="px-6 py-4 bg-slate-50/60 border-t border-slate-100 flex justify-between items-center">
            {step > 0 ? (
              <button onClick={() => setStep((s) => s - 1)}
                className="flex items-center gap-1 px-4 py-2.5 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-200 font-semibold text-sm transition-all">
                <ChevronLeft className="w-4 h-4" /> Back
              </button>
            ) : <div />}

            {step < totalSteps - 1 ? (
              <button onClick={() => setStep((s) => s + 1)}
                className="flex items-center gap-1 px-6 py-2.5 bg-green-700 hover:bg-green-600 text-white rounded-xl font-bold text-sm transition-all shadow-lg shadow-green-900/20">
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

        <p className="text-center text-[10px] text-slate-400 mt-4 font-semibold">
          THANK YOU FOR YOUR FEEDBACK; WE LOOK FORWARD TO RECEIVING YOU AGAIN
        </p>
        <p className="text-center text-[10px] text-slate-300 mt-1">
          © BIG DATA FACTORY · Rwanda Management Institute
        </p>
      </div>
    </div>
  );
}