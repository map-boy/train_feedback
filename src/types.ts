// ─── TEACHER PASSWORD ────────────────────────────────────────────────────────
export const TEACHER_PASSWORD = 'RMI@2024';

// ─── APP VIEWS ────────────────────────────────────────────────────────────────
export type AppView = 'login' | 'dashboard';
export type SurveyType = 'training' | 'customer';

// ─────────────────────────────────────────────────────────────────────────────
// SURVEY 1 – Post-Training Evaluation
// URL: /survey-training
// Table: evaluations
// ─────────────────────────────────────────────────────────────────────────────

export interface Evaluation {
  id?: string;
  submitted_at?: string;
  module_title: string;
  trainer_name: string;
  evaluation_date: string;
  delivery_from: string;
  delivery_to: string;
  module_q1: number | null;
  module_q2: number | null;
  module_q3: number | null;
  module_q4: number | null;
  module_q5: number | null;
  trainer_q1: number | null;
  trainer_q2: number | null;
  trainer_q3: number | null;
  trainer_q4: number | null;
  trainer_q5: number | null;
  trainer_q6: number | null;
  trainer_q7: number | null;
  trainer_q8: number | null;
  comments: string;
  challenges: string;
  suggestions: string;
}

export const MODULE_QUESTIONS: { key: keyof Evaluation; label: string; high: string; low: string }[] = [
  { key: 'module_q1', label: 'Appropriateness of the MODULE in relation to your experience',  high: 'Very Appropriate', low: 'Not Appropriate' },
  { key: 'module_q2', label: 'Usefulness and practical relevance of the Module',              high: 'Very Useful',      low: 'Useless'         },
  { key: 'module_q3', label: 'Level and standard of the Module',                              high: 'High Standard',    low: 'Low Standard'    },
  { key: 'module_q4', label: 'Clarity of the Module outline',                                 high: 'More Clear',       low: 'Not clear'       },
  { key: 'module_q5', label: 'Quality of Module materials and handouts provided',             high: 'High Quality',     low: 'Low Quality'     },
];

export const TRAINER_QUESTIONS: { key: keyof Evaluation; label: string; high: string; low: string }[] = [
  { key: 'trainer_q1', label: 'Punctuality for trainer',                                                   high: 'Always Punctual',         low: 'Always Late'       },
  { key: 'trainer_q2', label: 'Competence in training',                                                    high: 'Very Competent',          low: 'Very Incompetent'  },
  { key: 'trainer_q3', label: 'Ability to communicate',                                                    high: 'Good Communicator',       low: 'Poor Communicator' },
  { key: 'trainer_q4', label: "Trainer's effort to make the subject matter interesting/understandable",    high: 'Puts in a lot of effort',  low: 'No effort at all'  },
  { key: 'trainer_q5', label: "Trainer's ability to generate participation in the session",                high: 'Very able',               low: 'Not Able'          },
  { key: 'trainer_q6', label: 'Demonstration techniques/methodology used by the trainer',                  high: 'Very Appropriate',        low: 'Not appropriate'   },
  { key: 'trainer_q7', label: 'Coverage of the module',                                                    high: 'Well covered',            low: 'Poorly covered'    },
  { key: 'trainer_q8', label: "The trainer's suitability to teach this Module",                            high: 'The right person',        low: 'The wrong person'  },
];

// ─────────────────────────────────────────────────────────────────────────────
// SURVEY 2 – Customer Feedback Form
// URL: /survey-customer
// Table: customer_feedback
// Rating scale: Excellent | Very Good | Good | Fair | Poor  (stored as 5|4|3|2|1)
// ─────────────────────────────────────────────────────────────────────────────

export interface CustomerFeedback {
  id?: string;
  submitted_at?: string;

  // Section 1 – All customers
  reception_rating: number | null;
  reception_suggestion: string;
  service_rating: number | null;
  service_suggestion: string;

  // Section 2 – Resident customers only
  is_resident: boolean;
  room_rating: number | null;
  room_suggestion: string;
  catering_rating: number | null;
  catering_suggestion: string;

  // Meta
  room_number: string;
  period_from: string;
  period_to: string;
  courses_attended: string;
}

export const RATING_LABELS = ['Poor', 'Fair', 'Good', 'Very Good', 'Excellent'] as const;
export const RATING_OPTIONS = [5, 4, 3, 2, 1] as const;
export const ratingLabel = (v: number | null): string =>
  v ? RATING_LABELS[v - 1] : '–';


// ═════════════════════════════════════════════════════════════════════════════
// RMI-FELIX – Digital Exam Proctoring Platform
// ═════════════════════════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────────────────────────
// FELIX AUTH
// Table: felix_users
// ─────────────────────────────────────────────────────────────────────────────

export type FelixRole = 'teacher' | 'student';

export interface FelixUser {
  id?: string;
  name: string;
  email: string;
  role: FelixRole;
  created_at?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// FELIX EXAMS & QUESTIONS
// Tables: felix_exams, felix_questions
// ─────────────────────────────────────────────────────────────────────────────

export type QuestionType = 'multiple_choice' | 'true_false' | 'short_answer';

export interface FelixQuestion {
  id?: string;
  exam_id?: string;
  text: string;
  question_type: QuestionType;
  options: string[];           // JSON array – used for multiple_choice
  correct_answer: string;
  order_index: number;
}

export interface FelixExam {
  id?: string;
  name: string;
  session_code: string;        // unique 8-char code e.g. 'AB3X9K2P'
  teacher_id?: string;
  duration_minutes: number;
  is_active: boolean;
  created_at?: string;
  questions?: FelixQuestion[]; // populated client-side when loading
}

// ─────────────────────────────────────────────────────────────────────────────
// FELIX RESULTS
// Table: felix_results
// ─────────────────────────────────────────────────────────────────────────────

export interface FelixResult {
  id?: string;
  exam_id: string;
  student_id: string;
  student_name: string;
  answers: Record<string, string>; // { question_id: answer_string }
  score: number;
  total_questions: number;
  percentage: number;
  cheating_detected: boolean;
  violation_count: number;
  submitted_at?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// FELIX VIOLATIONS (Proctoring)
// Table: felix_violations
// ─────────────────────────────────────────────────────────────────────────────

export type ViolationType =
  | 'no_face'
  | 'looking_away'
  | 'multiple_faces'
  | 'phone'
  | 'tab_switch';

export interface FelixViolation {
  id?: string;
  exam_id: string;
  student_id: string;
  student_name: string;
  violation_type: ViolationType;
  confidence: number;          // 0.0 – 1.0
  notes: string;
  detected_at?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// FELIX REALTIME – WebSocket-style messages via Supabase Realtime
// ─────────────────────────────────────────────────────────────────────────────

// Messages the teacher receives
export type TeacherIncomingMessage =
  | { type: 'student_joined';  student_id: string; student_name: string }
  | { type: 'student_left';    student_id: string; student_name: string }
  | { type: 'violation';       student_id: string; student_name: string; violation_type: ViolationType; confidence: number }
  | { type: 'answer_update';   student_id: string; question_id: string };

// Messages the teacher sends
export type TeacherOutgoingMessage =
  | { type: 'freeze';          student_id: string }
  | { type: 'unfreeze';        student_id: string }
  | { type: 'stop_exam' }
  | { type: 'warning_sent';    student_id: string; message: string };

// Messages the student receives
export type StudentIncomingMessage =
  | { type: 'frozen' }
  | { type: 'unfrozen' }
  | { type: 'exam_stopped' }
  | { type: 'warning_sent';    message: string };

// ─────────────────────────────────────────────────────────────────────────────
// FELIX UI STATE (used inside App.tsx)
// ─────────────────────────────────────────────────────────────────────────────

export type FelixPage =
  | 'felix_landing'
  | 'felix_teacher_dashboard'
  | 'felix_live_proctor'
  | 'felix_exam'
  | 'felix_result';

export interface FelixSessionState {
  user: FelixUser | null;
  exam: FelixExam | null;
  result: FelixResult | null;
  currentPage: FelixPage;
}