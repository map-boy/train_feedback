import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Shield, LogIn, Eye, EyeOff, ClipboardCheck } from 'lucide-react';
import { TEACHER_PASSWORD } from './types';
import { teacherSignIn } from './storage';

interface Props {
  onLogin: () => void;
}

export default function TeacherLogin({ onLogin }: Props) {
  const [password, setPassword] = useState('');
  const [showPw, setShowPw]     = useState(false);
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);
  const [attempts, setAttempts] = useState(0);

  const handleSubmit = async () => {
    if (!password) return;
    setLoading(true);
    setError('');

    if (password !== TEACHER_PASSWORD) {
      const next = attempts + 1;
      setAttempts(next);
      setError(next >= 3 ? 'Incorrect password. Hint: RMI@YYYY format.' : 'Incorrect password. Try again.');
      setPassword('');
      setLoading(false);
      return;
    }

    const { error: authError } = await teacherSignIn();
    if (authError) {
      setError(`Auth error: ${authError}. Check Supabase teacher user setup.`);
      setLoading(false);
      return;
    }

    setLoading(false);
    onLogin();
  };

  return (
    <div className="min-h-screen bg-[#06090f] flex flex-col items-center justify-center px-4 relative overflow-hidden">
      <div className="absolute inset-0 opacity-[0.06] pointer-events-none"
        style={{ backgroundImage: 'linear-gradient(#3b82f6 1px,transparent 1px),linear-gradient(90deg,#3b82f6 1px,transparent 1px)', backgroundSize: '64px 64px' }} />
      <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-blue-700 rounded-full blur-[120px] opacity-10 pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex items-center gap-3 mb-10 relative z-10"
      >
        <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-900/40">
          <ClipboardCheck className="w-5 h-5 text-white" />
        </div>
        <div>
          <div className="font-black text-white text-xl tracking-tight leading-none">RMI</div>
          <div className="text-[9px] text-blue-400/80 uppercase tracking-[0.2em] leading-none mt-0.5">Rwanda Management Institute</div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="relative z-10 bg-[#0d1117] border border-white/[0.09] rounded-3xl p-8 w-full max-w-sm shadow-2xl"
      >
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-blue-600/20 border border-blue-500/30 rounded-2xl flex items-center justify-center mb-4">
            <Shield className="w-8 h-8 text-blue-400" />
          </div>
          <h2 className="text-2xl font-black text-white">Teacher Dashboard</h2>
          <p className="text-slate-500 text-sm mt-1 text-center">Enter your access password to continue</p>
        </div>

        <div className="space-y-4">
          <div className="relative">
            <input
              type={showPw ? 'text' : 'password'}
              value={password}
              autoFocus
              onChange={(e) => { setPassword(e.target.value); setError(''); }}
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
              placeholder="Password..."
              className="w-full px-4 py-3 pr-12 bg-white/[0.04] border border-white/[0.1] rounded-xl text-white placeholder-slate-700 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 transition-all text-sm"
            />
            <button
              type="button"
              onClick={() => setShowPw(!showPw)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-300 transition-colors"
            >
              {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          {error && (
            <motion.p
              initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }}
              className="text-red-400 text-xs bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2"
            >
              {error}
            </motion.p>
          )}

          <button
            onClick={handleSubmit}
            disabled={!password || loading}
            className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl font-bold text-sm transition-colors flex items-center justify-center gap-2"
          >
            {loading
              ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              : <LogIn className="w-4 h-4" />}
            {loading ? 'Signing in...' : 'Enter Dashboard'}
          </button>
        </div>

        <p className="text-slate-700 text-[10px] text-center mt-6">
          Students: scan the QR code provided by your teacher
        </p>
      </motion.div>

      <p className="text-slate-800 text-xs text-center mt-8 relative z-10">
        © {new Date().getFullYear()} BIG DATA FACTORY · Rwanda Management Institute
      </p>
    </div>
  );
}