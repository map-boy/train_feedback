import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, GraduationCap, ArrowRight, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { felixTeacherSignIn, felixStudentJoin } from './felix_storage';
import { FelixUser, FelixExam } from './types';

interface Props {
  onTeacherLogin: (user: FelixUser) => void;
  onStudentJoin: (user: FelixUser, exam: FelixExam) => void;
}

type Mode = 'select' | 'teacher' | 'student';

export default function FelixLandingPage({ onTeacherLogin, onStudentJoin }: Props) {
  const [mode, setMode] = useState<Mode>('select');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Teacher fields
  const [teacherEmail, setTeacherEmail] = useState('');
  const [teacherPassword, setTeacherPassword] = useState('');
  const [showPw, setShowPw] = useState(false);

  // Student fields
  const [studentName, setStudentName] = useState('');
  const [studentEmail, setStudentEmail] = useState('');
  const [sessionCode, setSessionCode] = useState('');

  const handleTeacherLogin = async () => {
    if (!teacherEmail || !teacherPassword) return;
    setLoading(true);
    setError('');
    const { error } = await felixTeacherSignIn(teacherEmail, teacherPassword);
    setLoading(false);
    if (error) { setError(error); return; }
    onTeacherLogin({ name: teacherEmail, email: teacherEmail, role: 'teacher' });
  };

  const handleStudentJoin = async () => {
    if (!studentName || !studentEmail || !sessionCode) return;
    setLoading(true);
    setError('');
    const { user, examId, error } = await felixStudentJoin(studentName, studentEmail, sessionCode);
    setLoading(false);
    if (error || !user || !examId) { setError(error ?? 'Failed to join.'); return; }
    // Fetch full exam
    const { fetchFelixExamByCode } = await import('./felix_storage');
    const { exam, error: examErr } = await fetchFelixExamByCode(sessionCode);
    if (examErr || !exam) { setError(examErr ?? 'Could not load exam.'); return; }
    onStudentJoin(user, exam);
  };

  return (
    <div className="min-h-screen bg-[#080C14] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background grid */}
      <div className="absolute inset-0 opacity-[0.04]"
        style={{ backgroundImage: 'linear-gradient(#4f8ef7 1px, transparent 1px), linear-gradient(90deg, #4f8ef7 1px, transparent 1px)', backgroundSize: '40px 40px' }} />

      {/* Glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-blue-600/10 rounded-full blur-[100px] pointer-events-none" />

      <AnimatePresence mode="wait">
        {mode === 'select' && (
          <motion.div key="select"
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            className="w-full max-w-md text-center"
          >
            {/* Logo */}
            <div className="flex items-center justify-center gap-3 mb-2">
              <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <span className="text-white text-2xl font-black tracking-tight">RMI·FELIX</span>
            </div>
            <p className="text-slate-500 text-sm mb-12">Digital Exam Proctoring Platform</p>

            <div className="grid grid-cols-2 gap-4">
              <button onClick={() => { setMode('teacher'); setError(''); }}
                className="group relative bg-white/[0.04] border border-white/[0.08] hover:border-blue-500/50 rounded-2xl p-6 text-left transition-all duration-200 hover:bg-white/[0.07]">
                <Shield className="w-8 h-8 text-blue-400 mb-3" />
                <div className="text-white font-bold text-sm">Teacher</div>
                <div className="text-slate-600 text-xs mt-1">Manage & proctor exams</div>
                <ArrowRight className="w-4 h-4 text-blue-400 absolute bottom-5 right-5 opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>

              <button onClick={() => { setMode('student'); setError(''); }}
                className="group relative bg-white/[0.04] border border-white/[0.08] hover:border-emerald-500/50 rounded-2xl p-6 text-left transition-all duration-200 hover:bg-white/[0.07]">
                <GraduationCap className="w-8 h-8 text-emerald-400 mb-3" />
                <div className="text-white font-bold text-sm">Student</div>
                <div className="text-slate-600 text-xs mt-1">Join an exam session</div>
                <ArrowRight className="w-4 h-4 text-emerald-400 absolute bottom-5 right-5 opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
            </div>

            <p className="text-slate-700 text-xs mt-8">© {new Date().getFullYear()} BIG DATA FACTORY · Rwanda Management Institute</p>
          </motion.div>
        )}

        {mode === 'teacher' && (
          <motion.div key="teacher"
            initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }}
            className="w-full max-w-sm"
          >
            <button onClick={() => { setMode('select'); setError(''); }} className="text-slate-600 hover:text-slate-300 text-xs mb-6 flex items-center gap-1 transition-colors">
              ← Back
            </button>

            <div className="flex items-center gap-2 mb-6">
              <Shield className="w-5 h-5 text-blue-400" />
              <h2 className="text-white font-black text-xl">Teacher Login</h2>
            </div>

            <div className="space-y-3">
              <input type="email" value={teacherEmail} onChange={e => setTeacherEmail(e.target.value)}
                placeholder="Email address"
                className="w-full px-4 py-3 bg-white/[0.04] border border-white/[0.08] rounded-xl text-white placeholder-slate-700 text-sm outline-none focus:border-blue-500 transition-colors" />

              <div className="relative">
                <input type={showPw ? 'text' : 'password'} value={teacherPassword}
                  onChange={e => setTeacherPassword(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleTeacherLogin()}
                  placeholder="Password"
                  className="w-full px-4 py-3 pr-12 bg-white/[0.04] border border-white/[0.08] rounded-xl text-white placeholder-slate-700 text-sm outline-none focus:border-blue-500 transition-colors" />
                <button type="button" onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-300 transition-colors">
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {error && (
                <div className="flex items-center gap-2 text-red-400 text-xs bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                  <AlertCircle className="w-3 h-3 shrink-0" />{error}
                </div>
              )}

              <button onClick={handleTeacherLogin} disabled={!teacherEmail || !teacherPassword || loading}
                className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl font-bold text-sm transition-colors flex items-center justify-center gap-2">
                {loading ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                {loading ? 'Signing in...' : 'Enter Dashboard'}
              </button>
            </div>
          </motion.div>
        )}

        {mode === 'student' && (
          <motion.div key="student"
            initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }}
            className="w-full max-w-sm"
          >
            <button onClick={() => { setMode('select'); setError(''); }} className="text-slate-600 hover:text-slate-300 text-xs mb-6 flex items-center gap-1 transition-colors">
              ← Back
            </button>

            <div className="flex items-center gap-2 mb-6">
              <GraduationCap className="w-5 h-5 text-emerald-400" />
              <h2 className="text-white font-black text-xl">Join Exam</h2>
            </div>

            <div className="space-y-3">
              <input type="text" value={studentName} onChange={e => setStudentName(e.target.value)}
                placeholder="Your full name"
                className="w-full px-4 py-3 bg-white/[0.04] border border-white/[0.08] rounded-xl text-white placeholder-slate-700 text-sm outline-none focus:border-emerald-500 transition-colors" />

              <input type="email" value={studentEmail} onChange={e => setStudentEmail(e.target.value)}
                placeholder="Email address"
                className="w-full px-4 py-3 bg-white/[0.04] border border-white/[0.08] rounded-xl text-white placeholder-slate-700 text-sm outline-none focus:border-emerald-500 transition-colors" />

              <input type="text" value={sessionCode} onChange={e => setSessionCode(e.target.value.toUpperCase())}
                onKeyDown={e => e.key === 'Enter' && handleStudentJoin()}
                placeholder="Session code (e.g. AB3X9K2P)"
                maxLength={8}
                className="w-full px-4 py-3 bg-white/[0.04] border border-white/[0.08] rounded-xl text-white placeholder-slate-700 text-sm outline-none focus:border-emerald-500 transition-colors font-mono tracking-widest uppercase" />

              {error && (
                <div className="flex items-center gap-2 text-red-400 text-xs bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                  <AlertCircle className="w-3 h-3 shrink-0" />{error}
                </div>
              )}

              <button onClick={handleStudentJoin} disabled={!studentName || !studentEmail || sessionCode.length < 8 || loading}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl font-bold text-sm transition-colors flex items-center justify-center gap-2">
                {loading ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                {loading ? 'Joining...' : 'Join Exam'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}