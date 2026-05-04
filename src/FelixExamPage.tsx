import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, AlertTriangle, ChevronRight, ChevronLeft, Send, Eye, Camera, CameraOff, ShieldAlert } from 'lucide-react';
import {
  submitFelixResult, logFelixViolation,
  createFelixBroadcastChannel
} from './felix_storage';
import { FelixExam, FelixUser, FelixResult, FelixViolation, ViolationType } from './types';

interface Props {
  exam: FelixExam;
  student: FelixUser;
  onComplete: (result: FelixResult) => void;
}

// ── Gemini Vision helper ───────────────────────────────────────────────────────
// Reads VITE_GEMINI_API_KEY from env. If missing, Gemini analysis is skipped
// and only tab-switch detection runs.
const GEMINI_KEY = import.meta.env.VITE_GEMINI_API_KEY as string | undefined;

interface GeminiDetection {
  violation: ViolationType | null;
  confidence: number;
  notes: string;
}

async function analyseFrameWithGemini(base64Jpeg: string): Promise<GeminiDetection> {
  if (!GEMINI_KEY) return { violation: null, confidence: 0, notes: 'Gemini key not set' };

  const prompt = `You are an exam proctoring AI. Analyse this webcam frame and respond ONLY with valid JSON — no markdown, no explanation.

Detect ONE of these situations (choose the most serious):
- "no_face": no human face visible in frame
- "multiple_faces": more than one face visible
- "looking_away": student's gaze is clearly directed away from screen (not at camera)
- "phone": a phone or external device is visible
- "clear": everything looks fine

Respond with exactly this JSON shape:
{"violation": "<one of the five strings above>", "confidence": <0.0-1.0>, "notes": "<brief reason>"}`;

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: prompt },
              { inline_data: { mime_type: 'image/jpeg', data: base64Jpeg } }
            ]
          }],
          generationConfig: { temperature: 0, maxOutputTokens: 120 }
        })
      }
    );
    const json = await res.json();
    const text: string = json?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    const clean = text.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(clean) as { violation: string; confidence: number; notes: string };
    const violation = parsed.violation === 'clear' ? null : parsed.violation as ViolationType;
    return { violation, confidence: parsed.confidence, notes: parsed.notes };
  } catch {
    return { violation: null, confidence: 0, notes: 'Gemini parse error' };
  }
}

// ── Capture a JPEG frame from a <video> element ────────────────────────────────
function captureFrame(video: HTMLVideoElement): string | null {
  if (video.readyState < 2) return null;
  const canvas = document.createElement('canvas');
  canvas.width = 320;
  canvas.height = 240;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.drawImage(video, 0, 0, 320, 240);
  // strip the data:image/jpeg;base64, prefix
  return canvas.toDataURL('image/jpeg', 0.6).split(',')[1];
}

// ── Violation label map (student-facing) ──────────────────────────────────────
const VLABELS: Record<string, { label: string; emoji: string; color: string }> = {
  no_face:        { label: 'No face detected',  emoji: '👤', color: 'text-red-400' },
  looking_away:   { label: 'Looking away',       emoji: '👁️', color: 'text-orange-400' },
  multiple_faces: { label: 'Multiple faces',     emoji: '👥', color: 'text-red-500' },
  phone:          { label: 'Phone detected',     emoji: '📱', color: 'text-orange-500' },
  tab_switch:     { label: 'Tab switched',       emoji: '🗂️', color: 'text-yellow-400' },
};

export default function FelixExamPage({ exam, student, onComplete }: Props) {
  const questions = exam.questions ?? [];
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [currentQ, setCurrentQ] = useState(0);
  const [timeLeft, setTimeLeft] = useState(exam.duration_minutes * 60);
  const [frozen, setFrozen] = useState(false);
  const [warning, setWarning] = useState<string | null>(null);
  const [examStopped, setExamStopped] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Camera
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraOn, setCameraOn] = useState(false);
  const [cameraError, setCameraError] = useState('');

  // Student-visible violation log
  const [myViolations, setMyViolations] = useState<Array<{ type: ViolationType; notes: string; time: Date }>>([]);

  const broadcastRef = useRef<{ send: (msg: Record<string, unknown>) => void; unsubscribe: () => void } | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // ── Violation logger ───────────────────────────────────────────────────────
  const logViolation = useCallback(async (type: ViolationType, confidence = 0.9, notes = '') => {
    const violation: Omit<FelixViolation, 'id' | 'detected_at'> = {
      exam_id: exam.id!,
      student_id: student.id!,
      student_name: student.name,
      violation_type: type,
      confidence,
      notes,
    };
    await logFelixViolation(violation);

    // Update student-side list
    setMyViolations(prev => [{ type, notes, time: new Date() }, ...prev]);

    // Broadcast to teacher's proctor view
    broadcastRef.current?.send({
      type: 'violation',
      student_id: student.id,
      student_name: student.name,
      violation_type: type,
      confidence,
      notes,
    });
  }, [exam.id, student]);

  // ── Camera startup ─────────────────────────────────────────────────────────
  useEffect(() => {
    let mounted = true;
    navigator.mediaDevices?.getUserMedia({ video: { facingMode: 'user', width: 320, height: 240 }, audio: false })
      .then(stream => {
        if (!mounted) { stream.getTracks().forEach(t => t.stop()); return; }
        streamRef.current = stream;
        setCameraOn(true);
      })
      .catch(() => {
        setCameraError('Camera unavailable — tab detection only.');
        logViolation('no_face', 0.5, 'Camera permission denied at exam start');
      });
    return () => {
      mounted = false;
      streamRef.current?.getTracks().forEach(t => t.stop());
    };
  }, [logViolation]);

  // ── Re-attach stream to video element after render (fixes black screen) ────
  // cameraOn triggers a re-render that mounts the <video>; srcObject must be
  // set AFTER the element is in the DOM.
  useEffect(() => {
    if (cameraOn && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch(() => {});
    }
  }, [cameraOn]);

  // ── Gemini Vision — analyse every 60 seconds (free-tier safe) ────────────
  useEffect(() => {
    if (!cameraOn) return;
    // small initial delay so the video can settle
    const interval = setInterval(async () => {
      const video = videoRef.current;
      if (!video) return;
      const frame = captureFrame(video);
      if (!frame) return;

      const result = await analyseFrameWithGemini(frame);
      if (result.violation && result.confidence >= 0.65) {
        await logViolation(result.violation, result.confidence, result.notes);
      }
    }, 60_000);

    return () => clearInterval(interval);
  }, [cameraOn, logViolation]);

  // ── Tab visibility ─────────────────────────────────────────────────────────
  useEffect(() => {
    const handle = () => {
      if (document.hidden) logViolation('tab_switch', 0.95, 'Student switched tabs or minimized window');
    };
    document.addEventListener('visibilitychange', handle);
    return () => document.removeEventListener('visibilitychange', handle);
  }, [logViolation]);

  // ── Broadcast channel ──────────────────────────────────────────────────────
  useEffect(() => {
    const bc = createFelixBroadcastChannel(exam.id!, (msg) => {
      const m = msg as any;
      if (m.type === 'freeze' && m.student_id === student.id) setFrozen(true);
      if (m.type === 'unfreeze' && m.student_id === student.id) setFrozen(false);
      if (m.type === 'stop_exam') setExamStopped(true);
      if (m.type === 'force_submit' && m.student_id === student.id) handleSubmit();
      if (m.type === 'warning_sent' && m.student_id === student.id) {
        setWarning(m.message);
        setTimeout(() => setWarning(null), 8000);
      }
    });
    broadcastRef.current = bc;
    bc.send({ type: 'student_joined', student_id: student.id, student_name: student.name });
    return () => {
      bc.send({ type: 'student_left', student_id: student.id, student_name: student.name });
      bc.unsubscribe();
    };
  }, [exam.id, student]);

  // ── Timer ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) { handleSubmit(); return 0; }
        return t - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  const handleSubmit = async () => {
    if (submitting) return;
    if (timerRef.current) clearInterval(timerRef.current);
    setSubmitting(true);
    streamRef.current?.getTracks().forEach(t => t.stop());
    const { result } = await submitFelixResult(exam, student, answers, myViolations.length);
    if (result) onComplete(result);
    setSubmitting(false);
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  };

  const q = questions[currentQ];
  const answered = Object.keys(answers).length;
  const progress = questions.length > 0 ? (answered / questions.length) * 100 : 0;
  const isLowTime = timeLeft < 120;

  if (examStopped) {
    return (
      <div className="min-h-screen bg-[#080C14] flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-white font-black text-xl mb-2">Exam Stopped</h2>
          <p className="text-slate-500 text-sm">Your teacher has ended the exam session.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-[#080C14] text-white flex flex-col ${frozen ? 'pointer-events-none' : ''}`}>

      {/* Frozen overlay */}
      <AnimatePresence>
        {frozen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-blue-950/80 backdrop-blur-sm z-50 flex items-center justify-center pointer-events-auto">
            <div className="text-center">
              <Eye className="w-12 h-12 text-blue-300 mx-auto mb-4" />
              <h2 className="text-white font-black text-xl mb-2">Screen Frozen</h2>
              <p className="text-slate-400 text-sm">Your teacher has paused your exam. Please wait.</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Warning toast */}
      <AnimatePresence>
        {warning && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            className="fixed top-4 left-1/2 -translate-x-1/2 z-40 bg-orange-500 text-white px-4 py-3 rounded-xl text-sm font-semibold shadow-lg flex items-center gap-2 max-w-sm">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{warning}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Violation banner */}
      {myViolations.length >= 2 && (
        <div className="bg-red-600/20 border-b border-red-500/30 px-4 py-2 text-center">
          <span className="text-red-400 text-xs font-semibold">
            ⚠️ {myViolations.length} violation{myViolations.length !== 1 ? 's' : ''} detected — your teacher has been notified.
          </span>
        </div>
      )}

      {/* Header */}
      <div className="border-b border-white/[0.06] px-6 py-4 flex items-center justify-between">
        <div>
          <div className="font-black text-sm">{exam.name}</div>
          <div className="text-xs text-slate-600">{student.name}</div>
        </div>
        <div className="flex items-center gap-4">
          <div className={`flex items-center gap-1.5 text-xs ${cameraOn ? 'text-emerald-400' : 'text-slate-600'}`}>
            {cameraOn ? <Camera className="w-3.5 h-3.5" /> : <CameraOff className="w-3.5 h-3.5" />}
            {cameraOn ? 'Camera on' : 'No camera'}
          </div>
          {GEMINI_KEY && cameraOn && (
            <div className="flex items-center gap-1 text-[10px] text-purple-400 bg-purple-500/10 border border-purple-500/20 px-2 py-0.5 rounded-full">
              <ShieldAlert className="w-3 h-3" />
              AI Proctoring
            </div>
          )}
          <div className="text-xs text-slate-500">{answered}/{questions.length} answered</div>
          <div className={`flex items-center gap-1.5 font-mono font-bold text-sm ${isLowTime ? 'text-red-400 animate-pulse' : 'text-white'}`}>
            <Clock className="w-3.5 h-3.5" />
            {formatTime(timeLeft)}
          </div>
        </div>
      </div>

      {cameraError && (
        <div className="bg-amber-600/10 border-b border-amber-500/20 px-4 py-1.5 text-center">
          <span className="text-amber-500 text-[10px]">{cameraError}</span>
        </div>
      )}

      {/* Progress bar */}
      <div className="h-1 bg-white/[0.05]">
        <motion.div className="h-full bg-blue-500" animate={{ width: `${progress}%` }} transition={{ duration: 0.3 }} />
      </div>

      {/* Main area */}
      <div className="flex flex-1 overflow-hidden">

        {/* Question area */}
        <div className="flex-1 flex flex-col overflow-y-auto">
          {/* Question nav pills */}
          <div className="px-6 py-3 flex gap-1.5 overflow-x-auto shrink-0">
            {questions.map((_, i) => (
              <button key={i} onClick={() => setCurrentQ(i)}
                className={`w-7 h-7 rounded-lg text-[10px] font-bold shrink-0 transition-colors ${
                  i === currentQ ? 'bg-blue-600 text-white' :
                  answers[questions[i].id!] ? 'bg-emerald-500/20 text-emerald-400' :
                  'bg-white/[0.05] text-slate-600 hover:bg-white/[0.1]'
                }`}>
                {i + 1}
              </button>
            ))}
          </div>

          {/* Question content */}
          <div className="flex-1 px-6 py-6 max-w-2xl w-full">
            {q && (
              <AnimatePresence mode="wait">
                <motion.div key={currentQ}
                  initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                  className="space-y-6">
                  <div>
                    <div className="text-blue-400 text-xs font-bold mb-2 uppercase tracking-wider">
                      Question {currentQ + 1} of {questions.length}
                    </div>
                    <p className="text-white text-lg font-semibold leading-relaxed">{q.text}</p>
                  </div>

                  {q.question_type === 'multiple_choice' && (
                    <div className="space-y-2">
                      {q.options.filter((o: string) => o.trim()).map((opt: string, i: number) => (
                        <button key={i} onClick={() => setAnswers(prev => ({ ...prev, [q.id!]: opt }))}
                          className={`w-full text-left px-4 py-3 rounded-xl border transition-all text-sm ${
                            answers[q.id!] === opt
                              ? 'bg-blue-600/20 border-blue-500 text-white'
                              : 'bg-white/[0.03] border-white/[0.07] text-slate-300 hover:border-white/[0.2] hover:bg-white/[0.06]'
                          }`}>
                          <span className="font-mono text-xs mr-3 opacity-50">{String.fromCharCode(65 + i)}.</span>
                          {opt}
                        </button>
                      ))}
                    </div>
                  )}

                  {q.question_type === 'true_false' && (
                    <div className="flex gap-3">
                      {['true', 'false'].map((val: string) => (
                        <button key={val} onClick={() => setAnswers(prev => ({ ...prev, [q.id!]: val }))}
                          className={`flex-1 py-4 rounded-xl border font-bold capitalize transition-all ${
                            answers[q.id!] === val
                              ? 'bg-blue-600/20 border-blue-500 text-white'
                              : 'bg-white/[0.03] border-white/[0.07] text-slate-300 hover:border-white/[0.2]'
                          }`}>
                          {val}
                        </button>
                      ))}
                    </div>
                  )}

                  {q.question_type === 'short_answer' && (
                    <textarea value={answers[q.id!] ?? ''} onChange={e => setAnswers(prev => ({ ...prev, [q.id!]: e.target.value }))}
                      placeholder="Type your answer here..."
                      rows={5}
                      className="w-full px-4 py-3 bg-white/[0.04] border border-white/[0.08] rounded-xl text-white placeholder-slate-700 text-sm outline-none focus:border-blue-500 transition-colors resize-none" />
                  )}
                </motion.div>
              </AnimatePresence>
            )}
          </div>
        </div>

        {/* ── Camera + violations panel — right side ── */}
        {cameraOn && (
          <div className="hidden md:flex w-52 shrink-0 flex-col items-center pt-6 pr-4 gap-3">

            {/* Camera preview */}
            <div className="relative w-44 h-32 rounded-xl overflow-hidden border border-white/[0.08] bg-black">
              <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover scale-x-[-1]" />
              <div className="absolute bottom-1 left-1 flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-red-400 rounded-full animate-pulse" />
                <span className="text-[8px] text-red-300 font-semibold">REC</span>
              </div>
              {GEMINI_KEY && (
                <div className="absolute top-1 right-1 text-[8px] text-purple-300 bg-purple-900/60 px-1.5 py-0.5 rounded font-bold">
                  AI
                </div>
              )}
            </div>

            <p className="text-[9px] text-slate-700 text-center">Proctoring active · teacher can see alerts</p>

            {/* Student-visible violation log */}
            {myViolations.length > 0 && (
              <div className="w-full">
                <div className="text-[9px] text-slate-600 uppercase tracking-wider font-bold mb-1.5 flex items-center gap-1">
                  <ShieldAlert className="w-3 h-3 text-red-400" />
                  My violations ({myViolations.length})
                </div>
                <div className="space-y-1 max-h-56 overflow-y-auto pr-1">
                  {myViolations.map((v, i) => {
                    const info = VLABELS[v.type] ?? { label: v.type, emoji: '⚠️', color: 'text-slate-400' };
                    return (
                      <div key={i} className="bg-white/[0.03] border border-white/[0.06] rounded-lg px-2 py-1.5">
                        <div className={`text-[10px] font-semibold ${info.color}`}>
                          {info.emoji} {info.label}
                        </div>
                        <div className="text-[9px] text-slate-700 mt-0.5">
                          {v.time.toLocaleTimeString()}
                        </div>
                        {v.notes && (
                          <div className="text-[9px] text-slate-800 mt-0.5 truncate">{v.notes}</div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="border-t border-white/[0.06] px-6 py-4 flex items-center justify-between shrink-0">
        <button onClick={() => setCurrentQ(q => Math.max(0, q - 1))} disabled={currentQ === 0}
          className="flex items-center gap-1.5 px-4 py-2 text-sm text-slate-500 hover:text-white disabled:opacity-30 transition-colors">
          <ChevronLeft className="w-4 h-4" />Prev
        </button>

        {currentQ < questions.length - 1 ? (
          <button onClick={() => setCurrentQ(q => Math.min(questions.length - 1, q + 1))}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-bold transition-colors">
            Next<ChevronRight className="w-4 h-4" />
          </button>
        ) : (
          <button onClick={handleSubmit} disabled={submitting}
            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl text-sm font-bold transition-colors">
            {submitting ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Send className="w-4 h-4" />}
            {submitting ? 'Submitting...' : 'Submit Exam'}
          </button>
        )}
      </div>
    </div>
  );
}