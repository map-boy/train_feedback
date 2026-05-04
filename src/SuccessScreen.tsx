import React from 'react';
import { motion } from 'motion/react';
import { CheckCircle2 } from 'lucide-react';

interface Props {
  onReset: () => void;
}

export default function SuccessScreen({ onReset }: Props) {
  return (
    <div className="min-h-screen bg-[#06090f] flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="bg-[#0d1117] border border-white/[0.09] rounded-3xl p-10 max-w-md w-full text-center shadow-2xl"
      >
        <div className="relative w-24 h-24 mx-auto mb-6">
          <div className="absolute inset-0 bg-green-500 rounded-full blur-2xl opacity-20" />
          <div className="relative w-full h-full bg-green-500/15 border border-green-500/30 rounded-full flex items-center justify-center">
            <CheckCircle2 className="w-12 h-12 text-green-400" />
          </div>
        </div>

        <h2 className="text-3xl font-black text-white mb-3">Thank You!</h2>
        <p className="text-slate-400 text-sm leading-relaxed mb-8">
          Your evaluation has been submitted successfully and saved.<br />
          Your feedback helps RMI improve its training programs.
        </p>

        <div className="bg-blue-600/10 border border-blue-500/20 rounded-2xl p-4 mb-6 text-left">
          <p className="text-blue-300 text-xs font-semibold mb-1">✅ Saved to database</p>
          <p className="text-slate-500 text-xs">
            Your response is securely stored. The teacher can view it from any device on the Teacher Dashboard.
          </p>
        </div>

        <button
          onClick={onReset}
          className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black transition-colors"
        >
          Submit Another Evaluation
        </button>
      </motion.div>
    </div>
  );
}