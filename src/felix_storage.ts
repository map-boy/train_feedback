import { supabase } from './storage';
import {
  FelixExam,
  FelixQuestion,
  FelixResult,
  FelixViolation,
  FelixUser,
} from './types';

// ─── ANON CLIENT (for student ops that don't need teacher auth) ──────────────
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL      = 'https://zldqetflyjejwoyfiahp.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpsZHFldGZseWplandveWZpYWhwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUzMjc0NzksImV4cCI6MjA5MDkwMzQ3OX0.xCiMPl85bwzvzExtwsAFr_zQeZCbEPmjpKdUV6TNuJ8';

const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/** Generate a random 8-character uppercase session code like 'AB3X9K2P' */
export const generateSessionCode = (): string => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no O/0/I/1 to avoid confusion
  return Array.from({ length: 8 }, () =>
    chars[Math.floor(Math.random() * chars.length)]
  ).join('');
};

// ─────────────────────────────────────────────────────────────────────────────
// TEACHER AUTH  (teacher uses Supabase Auth - same as existing system)
// ─────────────────────────────────────────────────────────────────────────────

/** Sign in teacher with email + password (Supabase Auth) */
export const felixTeacherSignIn = async (
  email: string,
  password: string
): Promise<{ error: string | null }> => {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  return { error: error?.message ?? null };
};

/** Sign out teacher */
export const felixTeacherSignOut = async (): Promise<void> => {
  await supabase.auth.signOut();
};

// ─────────────────────────────────────────────────────────────────────────────
// STUDENT AUTH  (students join by session code — no Supabase Auth account)
// Table: felix_users
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Student joins an exam with name + email + session_code.
 * Creates or reuses a felix_users row, returns the user row.
 * No password needed — session code is the gate.
 */
export const felixStudentJoin = async (
  name: string,
  email: string,
  sessionCode: string
): Promise<{ user: FelixUser | null; examId: string | null; error: string | null }> => {
  // 1. Verify session code points to an active exam
  const { data: examData, error: examError } = await anonClient
    .from('felix_exams')
    .select('id, is_active')
    .eq('session_code', sessionCode.toUpperCase())
    .single();

  if (examError || !examData) {
    return { user: null, examId: null, error: 'Invalid session code. Ask your teacher to check.' };
  }
  if (!examData.is_active) {
    return { user: null, examId: null, error: 'This exam is not active yet. Wait for your teacher to activate it.' };
  }

  // 2. Upsert student in felix_users (by email — rejoin is fine)
  const { data: userData, error: userError } = await anonClient
    .from('felix_users')
    .upsert(
      { name, email, role: 'student' },
      { onConflict: 'email', ignoreDuplicates: false }
    )
    .select()
    .single();

  if (userError || !userData) {
    return { user: null, examId: null, error: userError?.message ?? 'Could not create student account.' };
  }

  return { user: userData as FelixUser, examId: examData.id, error: null };
};

// ─────────────────────────────────────────────────────────────────────────────
// EXAMS
// Table: felix_exams
// ─────────────────────────────────────────────────────────────────────────────

/** Teacher creates a new exam (without questions — added separately) */
export const createFelixExam = async (
  data: Omit<FelixExam, 'id' | 'created_at' | 'questions' | 'session_code'>
): Promise<{ exam: FelixExam | null; error: string | null }> => {
  const session_code = generateSessionCode();
  const { data: exam, error } = await supabase
    .from('felix_exams')
    .insert([{ ...data, session_code }])
    .select()
    .single();

  return { exam: (exam as FelixExam) ?? null, error: error?.message ?? null };
};

/** Fetch all exams for the currently logged-in teacher */
export const fetchMyFelixExams = async (): Promise<{
  data: FelixExam[];
  error: string | null;
}> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { data: [], error: 'Not authenticated.' };

  const { data, error } = await supabase
    .from('felix_exams')
    .select('*')
    .eq('teacher_id', user.id)
    .order('created_at', { ascending: false });

  return { data: (data as FelixExam[]) ?? [], error: error?.message ?? null };
};

/** Fetch a single exam by session_code (used by students joining) */
export const fetchFelixExamByCode = async (
  sessionCode: string
): Promise<{ exam: FelixExam | null; error: string | null }> => {
  const { data, error } = await anonClient
    .from('felix_exams')
    .select('*, felix_questions(*)')
    .eq('session_code', sessionCode.toUpperCase())
    .eq('is_active', true)
    .single();

  if (!data) return { exam: null, error: error?.message ?? 'Exam not found.' };

  // Re-shape: attach questions array
  const exam: FelixExam = {
    ...(data as FelixExam),
    questions: (data as any).felix_questions ?? [],
  };
  return { exam, error: null };
};

/** Fetch a single exam by id (with questions) */
export const fetchFelixExamById = async (
  examId: string
): Promise<{ exam: FelixExam | null; error: string | null }> => {
  const { data, error } = await supabase
    .from('felix_exams')
    .select('*, felix_questions(*)')
    .eq('id', examId)
    .single();

  if (!data) return { exam: null, error: error?.message ?? 'Exam not found.' };

  const exam: FelixExam = {
    ...(data as FelixExam),
    questions: (data as any).felix_questions ?? [],
  };
  return { exam, error: null };
};

/** Activate exam (students can now join) */
export const activateFelixExam = async (examId: string): Promise<{ error: string | null }> => {
  const { error } = await supabase
    .from('felix_exams')
    .update({ is_active: true })
    .eq('id', examId);
  return { error: error?.message ?? null };
};

/** Deactivate exam (close it) */
export const deactivateFelixExam = async (examId: string): Promise<{ error: string | null }> => {
  const { error } = await supabase
    .from('felix_exams')
    .update({ is_active: false })
    .eq('id', examId);
  return { error: error?.message ?? null };
};

/** Delete exam + all related questions, results, violations */
export const deleteFelixExam = async (examId: string): Promise<{ error: string | null }> => {
  // Supabase will cascade-delete if FK ON DELETE CASCADE is set.
  // If not, delete children first:
  await supabase.from('felix_violations').delete().eq('exam_id', examId);
  await supabase.from('felix_results').delete().eq('exam_id', examId);
  await supabase.from('felix_questions').delete().eq('exam_id', examId);
  const { error } = await supabase.from('felix_exams').delete().eq('id', examId);
  return { error: error?.message ?? null };
};

// ─────────────────────────────────────────────────────────────────────────────
// QUESTIONS
// Table: felix_questions
// ─────────────────────────────────────────────────────────────────────────────

/** Add questions to an exam (bulk insert) */
export const addFelixQuestions = async (
  questions: Omit<FelixQuestion, 'id'>[]
): Promise<{ error: string | null }> => {
  const { error } = await supabase.from('felix_questions').insert(questions);
  return { error: error?.message ?? null };
};

/** Replace all questions for an exam (delete + re-insert) */
export const replaceFelixQuestions = async (
  examId: string,
  questions: Omit<FelixQuestion, 'id'>[]
): Promise<{ error: string | null }> => {
  await supabase.from('felix_questions').delete().eq('exam_id', examId);
  const { error } = await supabase
    .from('felix_questions')
    .insert(questions.map((q, i) => ({ ...q, exam_id: examId, order_index: i })));
  return { error: error?.message ?? null };
};

// ─────────────────────────────────────────────────────────────────────────────
// RESULTS
// Table: felix_results
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Auto-grade and submit a student's answers.
 * Grading: multiple_choice + true_false → exact match (case-insensitive).
 * short_answer → stored but scores 0 (manual grading in Phase 3).
 */
export const submitFelixResult = async (
  exam: FelixExam,
  student: FelixUser,
  answers: Record<string, string>,  // { question_id: answer_string }
  violationCount: number
): Promise<{ result: FelixResult | null; error: string | null }> => {
  const questions = exam.questions ?? [];

  let score = 0;
  for (const q of questions) {
    if (!q.id) continue;
    const studentAnswer = (answers[q.id] ?? '').trim().toLowerCase();
    const correctAnswer = (q.correct_answer ?? '').trim().toLowerCase();
    if (q.question_type !== 'short_answer' && studentAnswer === correctAnswer) {
      score++;
    }
  }

  const totalQuestions = questions.length;
  const percentage = totalQuestions > 0 ? (score / totalQuestions) * 100 : 0;
  const cheatingDetected = violationCount >= 3;

  const payload: Omit<FelixResult, 'id' | 'submitted_at'> = {
    exam_id: exam.id!,
    student_id: student.id!,
    student_name: student.name,
    answers,
    score,
    total_questions: totalQuestions,
    percentage,
    cheating_detected: cheatingDetected,
    violation_count: violationCount,
  };

  const { data, error } = await anonClient
    .from('felix_results')
    .insert([payload])
    .select()
    .single();

  return { result: (data as FelixResult) ?? null, error: error?.message ?? null };
};

/** Teacher force-submits a student (marks cheating = true) */
export const forceSubmitFelixStudent = async (
  examId: string,
  studentId: string
): Promise<{ error: string | null }> => {
  const { error } = await supabase
    .from('felix_results')
    .update({ cheating_detected: true })
    .eq('exam_id', examId)
    .eq('student_id', studentId);
  return { error: error?.message ?? null };
};

/** Fetch leaderboard for an exam (sorted by percentage desc) */
export const fetchFelixLeaderboard = async (
  examId: string
): Promise<{ data: FelixResult[]; error: string | null }> => {
  const { data, error } = await supabase
    .from('felix_results')
    .select('*')
    .eq('exam_id', examId)
    .order('percentage', { ascending: false });

  return { data: (data as FelixResult[]) ?? [], error: error?.message ?? null };
};

/** Student fetches their own result for an exam */
export const fetchMyFelixResult = async (
  examId: string,
  studentId: string
): Promise<{ result: FelixResult | null; error: string | null }> => {
  const { data, error } = await anonClient
    .from('felix_results')
    .select('*')
    .eq('exam_id', examId)
    .eq('student_id', studentId)
    .single();

  return { result: (data as FelixResult) ?? null, error: error?.message ?? null };
};

// ─────────────────────────────────────────────────────────────────────────────
// VIOLATIONS (Proctoring)
// Table: felix_violations
// ─────────────────────────────────────────────────────────────────────────────

/** Log a single proctoring violation (called from student's browser) */
export const logFelixViolation = async (
  violation: Omit<FelixViolation, 'id' | 'detected_at'>
): Promise<{ error: string | null }> => {
  const { error } = await anonClient
    .from('felix_violations')
    .insert([violation]);
  return { error: error?.message ?? null };
};

/** Fetch all violations for an exam (teacher view) */
export const fetchFelixViolations = async (
  examId: string
): Promise<{ data: FelixViolation[]; error: string | null }> => {
  const { data, error } = await supabase
    .from('felix_violations')
    .select('*')
    .eq('exam_id', examId)
    .order('detected_at', { ascending: false });

  return { data: (data as FelixViolation[]) ?? [], error: error?.message ?? null };
};

/** Fetch violations for a specific student in an exam */
export const fetchStudentViolations = async (
  examId: string,
  studentId: string
): Promise<{ data: FelixViolation[]; error: string | null }> => {
  const { data, error } = await supabase
    .from('felix_violations')
    .select('*')
    .eq('exam_id', examId)
    .eq('student_id', studentId)
    .order('detected_at', { ascending: false });

  return { data: (data as FelixViolation[]) ?? [], error: error?.message ?? null };
};

// ─────────────────────────────────────────────────────────────────────────────
// REALTIME (Supabase Realtime — replaces FastAPI WebSockets)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Subscribe to live violations for a teacher's exam dashboard.
 * Returns an unsubscribe function — call it on component unmount.
 *
 * Usage:
 *   const unsub = subscribeToExamViolations(examId, (v) => setViolations(prev => [v, ...prev]));
 *   return () => unsub();
 */
export const subscribeToExamViolations = (
  examId: string,
  onViolation: (violation: FelixViolation) => void
): (() => void) => {
  const channel = supabase
    .channel(`felix_violations_${examId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'felix_violations',
        filter: `exam_id=eq.${examId}`,
      },
      (payload) => onViolation(payload.new as FelixViolation)
    )
    .subscribe();

  return () => { supabase.removeChannel(channel); };
};

/**
 * Subscribe to new results for a teacher's exam (student submitted).
 * Returns an unsubscribe function.
 */
export const subscribeToExamResults = (
  examId: string,
  onResult: (result: FelixResult) => void
): (() => void) => {
  const channel = supabase
    .channel(`felix_results_${examId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'felix_results',
        filter: `exam_id=eq.${examId}`,
      },
      (payload) => onResult(payload.new as FelixResult)
    )
    .subscribe();

  return () => { supabase.removeChannel(channel); };
};

/**
 * Broadcast channel for teacher ↔ student messaging.
 * Teacher sends: freeze, unfreeze, stop_exam, warning_sent
 * Student sends: joined, left
 *
 * Returns { send, unsubscribe }
 * - send(msg) → broadcasts to all listeners on this exam channel
 * - unsubscribe() → call on unmount
 */
export const createFelixBroadcastChannel = (
  examId: string,
  onMessage: (msg: Record<string, unknown>) => void
): { send: (msg: Record<string, unknown>) => void; unsubscribe: () => void } => {
  const channel = supabase
    .channel(`felix_broadcast_${examId}`, {
      config: { broadcast: { self: false } },
    })
    .on('broadcast', { event: 'felix_event' }, (payload) => {
      onMessage(payload.payload as Record<string, unknown>);
    })
    .subscribe();

  const send = (msg: Record<string, unknown>) => {
    channel.send({ type: 'broadcast', event: 'felix_event', payload: msg });
  };

  const unsubscribe = () => { supabase.removeChannel(channel); };

  return { send, unsubscribe };
};