import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield, AlertTriangle, Users, CheckCircle2,
  ArrowLeft, Send, Eye, EyeOff, Clock, Zap,
  UserX, Bell, StopCircle
} from 'lucide-react';
import {
  subscribeToExamViolations, subscribeToExamResults,
  createFelixBroadcastChannel, fetchFelixViolations,
  fetchFelixLeaderboard, forceSubmitFelixStudent,
  deactivateFelixExam
} from './felix_storage';
import { FelixExam, FelixViolation, FelixResult } from './types';

interface Props {
  exam: FelixExam;
  onExit: () => void;
}

interface StudentStatus {
  id: string;
  name: string;
  violations: number;
  frozen: boolean;
  submitted: boolean;
  score?: number;
  percentage?: number;
  lastViolationType?: string;
  online: boolean;
}

interface Alert {
  id: string;
  studentName: string;
  studentId: string;
  type: string;
  time: Date;
  confidence: number;
  notes?: string;
}

const VIOLATION_LABELS: Record<string, { label: string; color: string; emoji: string }> = {
  no_face:        { label: 'No face detected',   color: 'text-red-400',    emoji: '👤' },
  looking_away:   { label: 'Looking away',        color: 'text-orange-400', emoji: '👁️' },
  multiple_faces: { label: 'Multiple faces',      color: 'text-red-500',    emoji: '👥' },
  phone:          { label: 'Phone detected',      color: 'text-orange-500', emoji: '📱' },
  tab_switch:     { label: 'Tab switched',        color: 'text-yellow-400', emoji: '🗂️' },
};

export default function FelixLiveProctor({ exam, onExit }: Props) {
  const [violations, setViolations] = useState<FelixViolation[]>([]);
  const [results, setResults] = useState<FelixResult[]>([]);
  const [students, setStudents] = useState<Map<string, StudentStatus>>(new Map());
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [warningStudentId, setWarningStudentId] = useState<string | null>(null);
  const [warningMsg, setWarningMsg] = useState('');
  const [elapsed, setElapsed] = useState(0);
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null);
  const broadcastRef = useRef<{ send: (msg: Record<string, unknown>) => void; unsubscribe: () => void } | null>(null);
  const alertSoundRef = useRef<AudioContext | null>(null);

  // Play alert beep using Web Audio API
  const playAlert = () => {
    try {
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 880;
      osc.type = 'sine';
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.4);
    } catch {}
  };

  const addAlert = (v: FelixViolation) => {
    const alert: Alert = {
      id: v.id ?? Math.random().toString(),
      studentName: v.student_name,
      studentId: v.student_id,
      type: v.violation_type,
      time: new Date(v.detected_at ?? Date.now()),
      confidence: v.confidence,
      notes: v.notes,
    };
    setAlerts(prev => [alert, ...prev].slice(0, 50));
    playAlert();
  };

  const upsertStudent = (id: string, name: string, patch: Partial<StudentStatus>) => {
    setStudents(prev => {
      const m = new Map(prev);
      const existing = m.get(id) ?? { id, name, violations: 0, frozen: false, submitted: false, online: false };
      m.set(id, { ...existing, ...patch });
      return m;
    });
  };

  useEffect(() => {
    // Load existing data
    (async () => {
      const { data: v } = await fetchFelixViolations(exam.id!);
      setViolations(v);
      v.forEach(viol => upsertStudent(viol.student_id, viol.student_name, {
        violations: (students.get(viol.student_id)?.violations ?? 0) + 1,
        lastViolationType: viol.violation_type,
      }));

      const { data: r } = await fetchFelixLeaderboard(exam.id!);
      setResults(r);
      r.forEach(res => upsertStudent(res.student_id, res.student_name, {
        submitted: true, score: res.score, percentage: res.percentage,
      }));
    })();

    // Realtime: violations
    const unsubViolations = subscribeToExamViolations(exam.id!, (v) => {
      setViolations(prev => [v, ...prev]);
      addAlert(v);
      setStudents(prev => {
        const m = new Map(prev);
        const existing = m.get(v.student_id) ?? { id: v.student_id, name: v.student_name, violations: 0, frozen: false, submitted: false, online: true };
        m.set(v.student_id, { ...existing, violations: existing.violations + 1, lastViolationType: v.violation_type });
        return m;
      });
    });

    // Realtime: results
    const unsubResults = subscribeToExamResults(exam.id!, (r) => {
      setResults(prev => [r, ...prev.filter(x => x.student_id !== r.student_id)]);
      upsertStudent(r.student_id, r.student_name, { submitted: true, score: r.score, percentage: r.percentage });
    });

    // Broadcast: student join/leave
    const bc = createFelixBroadcastChannel(exam.id!, (msg) => {
      const m = msg as any;
      if (m.type === 'student_joined') {
        setStudents(prev => {
          const map = new Map(prev);
          const existing = map.get(m.student_id) ?? { id: m.student_id, name: m.student_name, violations: 0, frozen: false, submitted: false, online: false };
          map.set(m.student_id, { ...existing, online: true });
          return map;
        });
      }
      if (m.type === 'student_left') {
        setStudents(prev => {
          const map = new Map(prev);
          const s = map.get(m.student_id);
          if (s) map.set(m.student_id, { ...s, online: false });
          return map;
        });
      }
    });
    broadcastRef.current = bc;

    const timer = setInterval(() => setElapsed(s => s + 1), 1000);

    return () => {
      unsubViolations();
      unsubResults();
      bc.unsubscribe();
      clearInterval(timer);
    };
  }, [exam.id]);

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  const handleFreeze = (studentId: string) => {
    broadcastRef.current?.send({ type: 'freeze', student_id: studentId });
    setStudents(prev => {
      const m = new Map(prev);
      const s = m.get(studentId);
      if (s) m.set(studentId, { ...s, frozen: true });
      return m;
    });
  };

  const handleUnfreeze = (studentId: string) => {
    broadcastRef.current?.send({ type: 'unfreeze', student_id: studentId });
    setStudents(prev => {
      const m = new Map(prev);
      const s = m.get(studentId);
      if (s) m.set(studentId, { ...s, frozen: false });
      return m;
    });
  };

  const handleWarning = () => {
    if (!warningStudentId || !warningMsg.trim()) return;
    broadcastRef.current?.send({ type: 'warning_sent', student_id: warningStudentId, message: warningMsg });
    setWarningStudentId(null);
    setWarningMsg('');
  };

  const handleForceSubmit = async (studentId: string, studentName: string) => {
    if (!confirm(`Force-submit exam for ${studentName}? This will mark them as submitted.`)) return;
    broadcastRef.current?.send({ type: 'force_submit', student_id: studentId });
    await forceSubmitFelixStudent(exam.id!, studentId);
    upsertStudent(studentId, studentName, { submitted: true });
  };

  const handleStopExam = async () => {
    if (!confirm('Stop this exam for ALL students?')) return;
    broadcastRef.current?.send({ type: 'stop_exam' });
    await deactivateFelixExam(exam.id!);
    onExit();
  };

  const studentList = Array.from(students.values());
  const onlineCount = studentList.filter(s => s.online && !s.submitted).length;
  const submittedCount = studentList.filter(s => s.submitted).length;

  return (
    <div className="min-h-screen bg-[#080C14] text-white flex flex-col">

      {/* Header */}
      <div className="border-b border-white/[0.06] px-6 py-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={onExit} className="text-slate-600 hover:text-slate-300 transition-colors p-1">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="font-black text-sm">{exam.name}</div>
            <div className="flex items-center gap-3 text-xs text-slate-600 mt-0.5">
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse inline-block" />
                Live · {formatTime(elapsed)}
              </span>
              <span className="font-mono tracking-widest text-blue-400">{exam.session_code}</span>
            </div>
          </div>
        </div>

        {/* Stats pills */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-1.5 text-xs">
            <Users className="w-3.5 h-3.5 text-blue-400" />
            <span className="text-white font-bold">{onlineCount}</span>
            <span className="text-slate-600">active</span>
          </div>
          <div className="flex items-center gap-1.5 bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-1.5 text-xs">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-white font-bold">{submittedCount}</span>
            <span className="text-slate-600">submitted</span>
          </div>
          <div className="flex items-center gap-1.5 bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-1.5 text-xs">
            <Bell className="w-3.5 h-3.5 text-red-400" />
            <span className="text-white font-bold">{alerts.length}</span>
            <span className="text-slate-600">alerts</span>
          </div>
          <button onClick={handleStopExam}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600/20 border border-red-500/30 text-red-400 rounded-lg text-xs font-semibold hover:bg-red-600/30 transition-colors">
            <StopCircle className="w-3.5 h-3.5" /> Stop Exam
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">

        {/* ── LEFT: Student List ── */}
        <div className="w-72 shrink-0 border-r border-white/[0.06] flex flex-col">
          <div className="px-4 py-3 border-b border-white/[0.04]">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Students ({studentList.length})</h3>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {studentList.length === 0 ? (
              <p className="text-slate-700 text-xs text-center py-8">Waiting for students to join...</p>
            ) : (
              studentList.map(s => (
                <div key={s.id}
                  onClick={() => setSelectedStudent(prev => prev === s.id ? null : s.id)}
                  className={`rounded-xl p-3 border cursor-pointer transition-all ${
                    selectedStudent === s.id ? 'border-blue-500/50 bg-blue-500/10' :
                    s.violations >= 3 ? 'border-red-500/30 bg-red-500/[0.06]' :
                    s.frozen ? 'border-yellow-500/30 bg-yellow-500/[0.06]' :
                    s.submitted ? 'border-emerald-500/20 bg-emerald-500/[0.04]' :
                    'border-white/[0.06] bg-white/[0.02] hover:border-white/10'
                  }`}>

                  {/* Name row */}
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${s.online && !s.submitted ? 'bg-emerald-400 animate-pulse' : s.submitted ? 'bg-blue-400' : 'bg-slate-600'}`} />
                      <span className="text-sm font-semibold truncate">{s.name}</span>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {s.submitted && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                      {s.frozen && <span className="text-yellow-400 text-[9px] font-black bg-yellow-400/10 px-1.5 py-0.5 rounded">FROZEN</span>}
                      {s.violations >= 3 && <AlertTriangle className="w-3.5 h-3.5 text-red-400" />}
                    </div>
                  </div>

                  {/* Stats row */}
                  <div className="flex items-center justify-between text-[10px] mb-2">
                    <span className={`${s.violations >= 3 ? 'text-red-400 font-bold' : s.violations > 0 ? 'text-orange-400' : 'text-slate-600'}`}>
                      {s.violations} violation{s.violations !== 1 ? 's' : ''}
                    </span>
                    {s.submitted && <span className="text-emerald-400 font-bold">{s.percentage?.toFixed(0)}%</span>}
                    {s.lastViolationType && !s.submitted && (
                      <span className="text-slate-600">{VIOLATION_LABELS[s.lastViolationType]?.emoji}</span>
                    )}
                  </div>

                  {/* Action buttons — shown when selected */}
                  <AnimatePresence>
                    {selectedStudent === s.id && !s.submitted && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden">
                        <div className="grid grid-cols-3 gap-1 pt-1 border-t border-white/[0.06]">
                          <button onClick={(e) => { e.stopPropagation(); s.frozen ? handleUnfreeze(s.id) : handleFreeze(s.id); }}
                            className={`py-1.5 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 transition-colors ${
                              s.frozen
                                ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30'
                                : 'bg-blue-500/20 text-blue-400 hover:bg-blue-500/30'
                            }`}>
                            {s.frozen ? <><Eye className="w-3 h-3" />Unfreeze</> : <><EyeOff className="w-3 h-3" />Freeze</>}
                          </button>
                          <button onClick={(e) => { e.stopPropagation(); setWarningStudentId(s.id); setWarningMsg(''); }}
                            className="py-1.5 rounded-lg text-[10px] font-bold bg-orange-500/20 text-orange-400 hover:bg-orange-500/30 flex items-center justify-center gap-1 transition-colors">
                            <Bell className="w-3 h-3" />Warn
                          </button>
                          <button onClick={(e) => { e.stopPropagation(); handleForceSubmit(s.id, s.name); }}
                            className="py-1.5 rounded-lg text-[10px] font-bold bg-red-500/20 text-red-400 hover:bg-red-500/30 flex items-center justify-center gap-1 transition-colors">
                            <Send className="w-3 h-3" />Submit
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))
            )}
          </div>
        </div>

        {/* ── RIGHT: Live Alerts Feed ── */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="px-5 py-3 border-b border-white/[0.04] flex items-center justify-between shrink-0">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
              <Zap className="w-3.5 h-3.5 text-yellow-400" />
              Live Violation Alerts
            </h3>
            <span className="text-xs text-slate-700">{alerts.length} total</span>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {alerts.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <Shield className="w-12 h-12 text-slate-800 mb-3" />
                <p className="text-slate-700 text-sm font-semibold">No violations yet</p>
                <p className="text-slate-800 text-xs mt-1">Alerts appear here instantly when detected</p>
              </div>
            ) : (
              <div className="space-y-2">
                <AnimatePresence initial={false}>
                  {alerts.map((alert) => {
                    const info = VIOLATION_LABELS[alert.type] ?? { label: alert.type, color: 'text-slate-400', emoji: '⚠️' };
                    const isCritical = alert.type === 'multiple_faces' || alert.type === 'phone';
                    return (
                      <motion.div key={alert.id}
                        initial={{ opacity: 0, x: 30, scale: 0.97 }}
                        animate={{ opacity: 1, x: 0, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className={`flex items-start gap-3 rounded-xl p-4 border ${
                          isCritical
                            ? 'bg-red-500/10 border-red-500/30'
                            : 'bg-white/[0.03] border-white/[0.06]'
                        }`}>

                        {/* Severity dot */}
                        <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                          alert.type === 'multiple_faces' ? 'bg-red-400' :
                          alert.type === 'phone' ? 'bg-orange-400' :
                          alert.type === 'no_face' ? 'bg-red-300' :
                          'bg-yellow-400'
                        }`} />

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-bold text-white">{alert.studentName}</span>
                              {isCritical && <span className="text-[9px] bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded font-black">CRITICAL</span>}
                            </div>
                            <span className="text-[10px] text-slate-600 shrink-0 flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {alert.time.toLocaleTimeString()}
                            </span>
                          </div>
                          <div className={`text-xs mt-0.5 font-semibold ${info.color}`}>
                            {info.emoji} {info.label}
                            {alert.confidence > 0 && (
                              <span className="ml-2 text-slate-600 font-normal">· {(alert.confidence * 100).toFixed(0)}% confidence</span>
                            )}
                          </div>
                          {alert.notes && <div className="text-[10px] text-slate-700 mt-0.5">{alert.notes}</div>}
                        </div>

                        {/* Quick action from alert */}
                        <div className="shrink-0 flex gap-1">
                          {students.get(alert.studentId) && !students.get(alert.studentId)!.submitted && (
                            <button
                              onClick={() => {
                                const s = students.get(alert.studentId);
                                if (!s) return;
                                s.frozen ? handleUnfreeze(alert.studentId) : handleFreeze(alert.studentId);
                              }}
                              className="text-[10px] px-2 py-1 rounded-lg bg-white/[0.06] text-slate-400 hover:bg-blue-500/20 hover:text-blue-400 transition-colors font-semibold">
                              {students.get(alert.studentId)?.frozen ? 'Unfreeze' : 'Freeze'}
                            </button>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            )}
          </div>

          {/* Results summary bar at bottom */}
          {results.length > 0 && (
            <div className="border-t border-white/[0.06] p-4 shrink-0">
              <h4 className="text-[10px] text-slate-600 uppercase tracking-wider font-semibold mb-2">Submitted Results</h4>
              <div className="flex gap-2 overflow-x-auto">
                {results.map(r => (
                  <div key={r.id} className="shrink-0 bg-white/[0.03] border border-white/[0.06] rounded-xl px-3 py-2 text-center min-w-[80px]">
                    <div className={`text-sm font-black ${r.percentage >= 70 ? 'text-emerald-400' : r.percentage >= 50 ? 'text-yellow-400' : 'text-red-400'}`}>
                      {r.percentage.toFixed(0)}%
                    </div>
                    <div className="text-[9px] text-slate-600 truncate max-w-[72px]">{r.student_name}</div>
                    {r.cheating_detected && <div className="text-[8px] text-red-400 font-bold">⚠️ flagged</div>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Warning Modal */}
      <AnimatePresence>
        {warningStudentId && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setWarningStudentId(null)}>
            <motion.div initial={{ scale: 0.9, y: 10 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9 }}
              className="bg-[#111827] border border-white/[0.1] rounded-2xl p-6 w-full max-w-sm"
              onClick={e => e.stopPropagation()}>
              <h3 className="font-bold mb-1 text-sm">Send Warning</h3>
              <p className="text-slate-600 text-xs mb-3">
                To: <span className="text-white">{students.get(warningStudentId)?.name}</span>
              </p>

              {/* Quick presets */}
              <div className="flex flex-wrap gap-1.5 mb-3">
                {[
                  'Keep your eyes on the screen.',
                  'No phones allowed.',
                  'Stay on the exam tab.',
                  'Make sure your face is visible.',
                ].map(preset => (
                  <button key={preset} onClick={() => setWarningMsg(preset)}
                    className="text-[10px] px-2 py-1 bg-white/[0.05] border border-white/[0.08] rounded-lg text-slate-400 hover:text-white hover:border-white/20 transition-colors">
                    {preset}
                  </button>
                ))}
              </div>

              <textarea value={warningMsg} onChange={e => setWarningMsg(e.target.value)}
                placeholder="Or type a custom warning..."
                rows={3}
                className="w-full px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-xl text-white placeholder-slate-700 text-sm outline-none focus:border-orange-500 resize-none mb-3" />
              <div className="flex gap-2">
                <button onClick={() => setWarningStudentId(null)}
                  className="flex-1 py-2 border border-white/[0.1] rounded-lg text-sm text-slate-400 hover:text-white transition-colors">
                  Cancel
                </button>
                <button onClick={handleWarning} disabled={!warningMsg.trim()}
                  className="flex-1 py-2 bg-orange-600 hover:bg-orange-500 disabled:opacity-40 rounded-lg text-sm font-bold transition-colors flex items-center justify-center gap-2">
                  <Bell className="w-3.5 h-3.5" />Send Warning
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}