import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { GraduationCap, Loader2, AlertTriangle, ArrowRight } from 'lucide-react';
import { felixStudentJoin, fetchFelixExamByCode } from './felix_storage';
import { FelixExam, FelixUser, FelixResult } from './types';
import FelixExamPage from './FelixExamPage';
import FelixResultPage from './FelixResult';

type Stage = 'join' | 'loading' | 'exam' | 'result' | 'error';

export default function FelixStudentEntry() {
  const [searchParams] = useSearchParams();
  const codeFromUrl = searchParams.get('code') ?? '';

  const [stage, setStage]     = useState<Stage>('join');
  const [name, setName]       = useState('');
  const [email, setEmail]     = useState('');
  const [code, setCode]       = useState(codeFromUrl);
  const [error, setError]     = useState('');
  const [exam, setExam]       = useState<FelixExam | null>(null);
  const [student, setStudent] = useState<FelixUser | null>(null);
  const [result, setResult]   = useState<FelixResult | null>(null);
  const [joining, setJoining] = useState(false);

  // If code came from URL, pre-validate it exists (just UX polish — actual gate is on submit)
  useEffect(() => {
    if (codeFromUrl) setCode(codeFromUrl);
  }, [codeFromUrl]);

  const handleJoin = async () => {
    setError('');
    if (!name.trim())  return setError('Please enter your full name.');
    if (!email.trim()) return setError('Please enter your email.');
    if (!code.trim())  return setError('Please enter the session code.');

    setJoining(true);

    // 1. Verify code + create/get student user
    const { user, examId, error: joinErr } = await felixStudentJoin(name.trim(), email.trim(), code.trim());
    if (joinErr || !user || !examId) {
      setError(joinErr ?? 'Could not join exam.');
      setJoining(false);
      return;
    }

    // 2. Fetch full exam with questions
    const { exam: fetchedExam, error: examErr } = await fetchFelixExamByCode(code.trim());
    if (examErr || !fetchedExam) {
      setError(examErr ?? 'Could not load exam.');
      setJoining(false);
      return;
    }

    setStudent(user);
    setExam(fetchedExam);
    setJoining(false);
    setStage('exam');
  };

  const handleComplete = (r: FelixResult) => {
    setResult(r);
    setStage('result');
  };

  if (stage === 'exam' && exam && student) {
    return <FelixExamPage exam={exam} student={student} onComplete={handleComplete} />;
  }

  if (stage === 'result' && result && exam) {
    return (
      <FelixResultPage
        result={result}
        exam={exam}
        onReturnHome={() => { setStage('join'); setResult(null); setExam(null); }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#06090f] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-purple-900/40">
            <GraduationCap className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-black text-white">FELIX Exam</h1>
          <p className="text-slate-500 text-sm mt-1">Enter your details to join</p>
        </div>

        {/* Card */}
        <div className="bg-[#0d1117] border border-white/[0.08] rounded-3xl p-7 space-y-4">

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Full Name</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Jean Pierre"
              className="w-full px-4 py-3 bg-white/[0.04] border border-white/[0.08] rounded-xl text-white placeholder-slate-700 text-sm outline-none focus:border-purple-500 transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="your@email.com"
              className="w-full px-4 py-3 bg-white/[0.04] border border-white/[0.08] rounded-xl text-white placeholder-slate-700 text-sm outline-none focus:border-purple-500 transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Session Code</label>
            <input
              type="text"
              value={code}
              onChange={e => setCode(e.target.value.toUpperCase())}
              placeholder="e.g. 7H9USL9Z"
              maxLength={8}
              className="w-full px-4 py-3 bg-white/[0.04] border border-white/[0.08] rounded-xl text-white placeholder-slate-700 text-sm font-mono tracking-widest outline-none focus:border-purple-500 transition-colors uppercase"
            />
          </div>

          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-red-400 text-sm"
              >
                <AlertTriangle className="w-4 h-4 shrink-0" />
                {error}
              </motion.div>
            )}
          </AnimatePresence>

          <button
            onClick={handleJoin}
            disabled={joining}
            className="w-full flex items-center justify-center gap-2 py-3.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-bold rounded-2xl transition-colors mt-2"
          >
            {joining
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Joining...</>
              : <><ArrowRight className="w-4 h-4" /> Join Exam</>
            }
          </button>
        </div>

        <p className="text-center text-slate-700 text-xs mt-5">
          Get the session code from your teacher · RMI · BIG DATA FACTORY
        </p>
      </motion.div>
    </div>
  );
}