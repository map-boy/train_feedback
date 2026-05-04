import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Play, Square, Trash2, Eye, BookOpen,
  Copy, Check, Link, AlertTriangle, CheckCircle2, Download,
  FileText, Upload, ChevronDown, ChevronUp, Pencil, Save, X,
} from 'lucide-react';
import {
  fetchMyFelixExams, createFelixExam, deleteFelixExam,
  activateFelixExam, deactivateFelixExam, replaceFelixQuestions,
  fetchFelixLeaderboard
} from './felix_storage';
import { FelixExam, FelixQuestion, FelixUser, QuestionType } from './types';

interface Props {
  teacher: FelixUser;
  onProctor: (exam: FelixExam) => void;
  onLogout?: () => void;
}

const EMPTY_QUESTION = (): Omit<FelixQuestion, 'id'> => ({
  exam_id: '',
  text: '',
  question_type: 'multiple_choice',
  options: ['', '', '', ''],
  correct_answer: '',
  order_index: 0,
});

const examLink = (sessionCode: string) =>
  `${window.location.origin}/felix/exam?code=${sessionCode}`;

// ─────────────────────────────────────────────────────────────────────────────
// HARDCODED DRAFT — AIPI Digital Literacy Pre-Assessment
// ─────────────────────────────────────────────────────────────────────────────
const AIPI_DRAFT_QUESTIONS: Omit<FelixQuestion, 'id'>[] = [
  // Section A: Multiple Choice (Q1–Q60)
  // 1. Intro to Data Analytics (Q1–Q10)
  { exam_id:'', text:'Data analytics is used to:', question_type:'multiple_choice', options:['Make decisions','Store files','Print reports','Code software'], correct_answer:'Make decisions', order_index:0 },
  { exam_id:'', text:'Which of the following is a type of data analytics?', question_type:'multiple_choice', options:['Predictive','Corrective','Selective','Projective'], correct_answer:'Predictive', order_index:1 },
  { exam_id:'', text:'Descriptive analytics tells us:', question_type:'multiple_choice', options:['What happened','What will happen','Why it happened','How to fix it'], correct_answer:'What happened', order_index:2 },
  { exam_id:'', text:'Predictive analytics uses:', question_type:'multiple_choice', options:['Historical data','Future guesses','Random data','No data'], correct_answer:'Historical data', order_index:3 },
  { exam_id:'', text:'Business analytics helps organizations:', question_type:'multiple_choice', options:['Improve decisions','Delete records','Slow processes','Avoid data'], correct_answer:'Improve decisions', order_index:4 },
  { exam_id:'', text:'Data-driven decisions are based on:', question_type:'multiple_choice', options:['Evidence','Opinions','Guesses','Feelings'], correct_answer:'Evidence', order_index:5 },
  { exam_id:'', text:'Which tool is commonly used in data analytics?', question_type:'multiple_choice', options:['Excel','Notepad','Paint','Calculator'], correct_answer:'Excel', order_index:6 },
  { exam_id:'', text:'Raw data needs to be ___ before analysis:', question_type:'multiple_choice', options:['Cleaned','Deleted','Printed','Ignored'], correct_answer:'Cleaned', order_index:7 },
  { exam_id:'', text:'KPI stands for:', question_type:'multiple_choice', options:['Key Performance Indicator','Key Process Input','Key Product Information','Key Program Index'], correct_answer:'Key Performance Indicator', order_index:8 },
  { exam_id:'', text:'Dashboards are used to:', question_type:'multiple_choice', options:['Visualize data','Delete data','Store backups','Write code'], correct_answer:'Visualize data', order_index:9 },

  // 2. Big Data (Q11–Q20)
  { exam_id:'', text:'Big Data is characterized by:', question_type:'multiple_choice', options:['Volume, Velocity, Variety','Size, Speed, Type','Amount, Rate, Kind','Number, Flow, Form'], correct_answer:'Volume, Velocity, Variety', order_index:10 },
  { exam_id:'', text:'Which of the following is a Big Data tool?', question_type:'multiple_choice', options:['Hadoop','MS Word','Excel','PowerPoint'], correct_answer:'Hadoop', order_index:11 },
  { exam_id:'', text:'Volume in Big Data refers to:', question_type:'multiple_choice', options:['Amount of data','Speed of data','Type of data','Quality of data'], correct_answer:'Amount of data', order_index:12 },
  { exam_id:'', text:'Velocity in Big Data refers to:', question_type:'multiple_choice', options:['Speed of data','Amount of data','Variety of data','Value of data'], correct_answer:'Speed of data', order_index:13 },
  { exam_id:'', text:'Variety in Big Data refers to:', question_type:'multiple_choice', options:['Types of data','Speed of data','Amount of data','Value of data'], correct_answer:'Types of data', order_index:14 },
  { exam_id:'', text:'Big Data is processed using:', question_type:'multiple_choice', options:['Distributed computing','Single PC','Notebook','Calculator'], correct_answer:'Distributed computing', order_index:15 },
  { exam_id:'', text:'HDFS stands for:', question_type:'multiple_choice', options:['Hadoop Distributed File System','High Data File Store','Hadoop Data File System','Hard Disk File Storage'], correct_answer:'Hadoop Distributed File System', order_index:16 },
  { exam_id:'', text:'MapReduce is used for:', question_type:'multiple_choice', options:['Processing large data','Storing images','Sending emails','Printing reports'], correct_answer:'Processing large data', order_index:17 },
  { exam_id:'', text:'Structured data includes:', question_type:'multiple_choice', options:['Tables','Videos','Emails','Images'], correct_answer:'Tables', order_index:18 },
  { exam_id:'', text:'Unstructured data includes:', question_type:'multiple_choice', options:['Videos and images','Tables','Spreadsheets','Databases'], correct_answer:'Videos and images', order_index:19 },

  // 3. Data Visualization (Q21–Q25)
  { exam_id:'', text:'Data visualization helps to:', question_type:'multiple_choice', options:['Understand data quickly','Delete data','Store data','Print data'], correct_answer:'Understand data quickly', order_index:20 },
  { exam_id:'', text:'A bar chart is used for:', question_type:'multiple_choice', options:['Comparing categories','Showing trends','Showing parts of a whole','None'], correct_answer:'Comparing categories', order_index:21 },
  { exam_id:'', text:'A pie chart shows:', question_type:'multiple_choice', options:['Parts of a whole','Trends over time','Comparisons','Distributions'], correct_answer:'Parts of a whole', order_index:22 },
  { exam_id:'', text:'Which tool is used for data visualization?', question_type:'multiple_choice', options:['Power BI','Notepad','Calculator','Word'], correct_answer:'Power BI', order_index:23 },
  { exam_id:'', text:'Line charts are best for showing:', question_type:'multiple_choice', options:['Trends over time','Parts of a whole','Comparisons','Frequencies'], correct_answer:'Trends over time', order_index:24 },

  // 4. Data Quality & Cleaning (Q26–Q30)
  { exam_id:'', text:'Data quality refers to:', question_type:'multiple_choice', options:['Accuracy and completeness','Speed of entry','Color of charts','Size of files'], correct_answer:'Accuracy and completeness', order_index:25 },
  { exam_id:'', text:'Data cleaning involves:', question_type:'multiple_choice', options:['Removing errors','Adding more data','Printing reports','Deleting databases'], correct_answer:'Removing errors', order_index:26 },
  { exam_id:'', text:'Duplicate data should be:', question_type:'multiple_choice', options:['Removed','Kept','Ignored','Printed'], correct_answer:'Removed', order_index:27 },
  { exam_id:'', text:'Missing values in data should be:', question_type:'multiple_choice', options:['Handled appropriately','Ignored','Doubled','Printed'], correct_answer:'Handled appropriately', order_index:28 },
  { exam_id:'', text:'Data validation ensures:', question_type:'multiple_choice', options:['Correct data entry','Fast printing','Large storage','Quick emails'], correct_answer:'Correct data entry', order_index:29 },

  // 5. Databases (Q31–Q35)
  { exam_id:'', text:'A database is used to:', question_type:'multiple_choice', options:['Store data','Send emails','Print files','Draw charts'], correct_answer:'Store data', order_index:30 },
  { exam_id:'', text:'SQL stands for:', question_type:'multiple_choice', options:['Structured Query Language','Simple Query Logic','Standard Query List','Structured Question Logic'], correct_answer:'Structured Query Language', order_index:31 },
  { exam_id:'', text:'A relational database stores data in:', question_type:'multiple_choice', options:['Tables','Folders','Images','Videos'], correct_answer:'Tables', order_index:32 },
  { exam_id:'', text:'NoSQL databases are used for:', question_type:'multiple_choice', options:['Unstructured data','Only numbers','Printing','Emails'], correct_answer:'Unstructured data', order_index:33 },
  { exam_id:'', text:'A primary key uniquely identifies:', question_type:'multiple_choice', options:['A record','A table','A database','A column'], correct_answer:'A record', order_index:34 },

  // 6. Data Governance (Q36–Q40)
  { exam_id:'', text:'Data governance ensures:', question_type:'multiple_choice', options:['Data quality and compliance','Faster internet','More storage','Better printing'], correct_answer:'Data quality and compliance', order_index:35 },
  { exam_id:'', text:'Data privacy protects:', question_type:'multiple_choice', options:['Personal information','Company profits','Hardware','Software'], correct_answer:'Personal information', order_index:36 },
  { exam_id:'', text:'Data security involves:', question_type:'multiple_choice', options:['Protecting data from unauthorized access','Deleting old files','Printing records','Sharing passwords'], correct_answer:'Protecting data from unauthorized access', order_index:37 },
  { exam_id:'', text:'Data governance involves:', question_type:'multiple_choice', options:['All','Users','Management','IT'], correct_answer:'All', order_index:38 },
  { exam_id:'', text:'Governance includes:', question_type:'multiple_choice', options:['All','Standards','Policies','Procedures'], correct_answer:'All', order_index:39 },

  // 7. OLAP vs OLTP (Q41–Q45)
  { exam_id:'', text:'OLTP is used for:', question_type:'multiple_choice', options:['Transactions','Analysis','Visualization','Storage'], correct_answer:'Transactions', order_index:40 },
  { exam_id:'', text:'OLAP is used for:', question_type:'multiple_choice', options:['Analysis','Transactions','Entry','Coding'], correct_answer:'Analysis', order_index:41 },
  { exam_id:'', text:'OLTP is:', question_type:'multiple_choice', options:['Fast for transactions','Slow','Analytical','Predictive'], correct_answer:'Fast for transactions', order_index:42 },
  { exam_id:'', text:'OLAP supports:', question_type:'multiple_choice', options:['All','Queries','Reports','Analysis'], correct_answer:'All', order_index:43 },
  { exam_id:'', text:'Data warehouses use:', question_type:'multiple_choice', options:['OLAP','OLTP','Both','None'], correct_answer:'OLAP', order_index:44 },

  // 8. ETL (Q46–Q50)
  { exam_id:'', text:'ETL stands for:', question_type:'multiple_choice', options:['Extract, Transform, Load','Enter, Transfer, Load','Extract, Transfer, Link','None'], correct_answer:'Extract, Transform, Load', order_index:45 },
  { exam_id:'', text:'Extract means:', question_type:'multiple_choice', options:['Collect data','Clean data','Store data','Delete'], correct_answer:'Collect data', order_index:46 },
  { exam_id:'', text:'Transform means:', question_type:'multiple_choice', options:['Format data','Collect','Store','Remove'], correct_answer:'Format data', order_index:47 },
  { exam_id:'', text:'Load means:', question_type:'multiple_choice', options:['Save data','Clean','Analyze','Code'], correct_answer:'Save data', order_index:48 },
  { exam_id:'', text:'ETL is used in:', question_type:'multiple_choice', options:['Data warehousing','Gaming','Networking','None'], correct_answer:'Data warehousing', order_index:49 },

  // 9. Statistics & Data Analysis (Q51–Q60)
  { exam_id:'', text:'Mean is:', question_type:'multiple_choice', options:['Average','Middle','Mode','None'], correct_answer:'Average', order_index:50 },
  { exam_id:'', text:'Median is:', question_type:'multiple_choice', options:['Middle value','Average','Highest','Lowest'], correct_answer:'Middle value', order_index:51 },
  { exam_id:'', text:'Mode is:', question_type:'multiple_choice', options:['Most frequent','Average','Middle','None'], correct_answer:'Most frequent', order_index:52 },
  { exam_id:'', text:'Standard deviation measures:', question_type:'multiple_choice', options:['Spread','Mean','Median','Mode'], correct_answer:'Spread', order_index:53 },
  { exam_id:'', text:'Outliers are:', question_type:'multiple_choice', options:['Extreme values','Normal values','Average values','None'], correct_answer:'Extreme values', order_index:54 },
  { exam_id:'', text:'Data summarization includes:', question_type:'multiple_choice', options:['All','Charts','Tables','Statistics'], correct_answer:'All', order_index:55 },
  { exam_id:'', text:'Anomaly detection finds:', question_type:'multiple_choice', options:['All','Patterns','Errors','Unusual data'], correct_answer:'All', order_index:56 },
  { exam_id:'', text:'Data profiling checks:', question_type:'multiple_choice', options:['All','Quality','Structure','Distribution'], correct_answer:'All', order_index:57 },
  { exam_id:'', text:'KPI tracking uses:', question_type:'multiple_choice', options:['All','Dashboards','Reports','Charts'], correct_answer:'All', order_index:58 },
  { exam_id:'', text:'Benchmarking compares:', question_type:'multiple_choice', options:['All','Internal data','Competitors','Industry'], correct_answer:'All', order_index:59 },

  // Section B: True / False (Q61–Q70)
  { exam_id:'', text:'Data analytics reduces uncertainty.', question_type:'true_false', options:['true','false'], correct_answer:'true', order_index:60 },
  { exam_id:'', text:'OLAP is used for transactions.', question_type:'true_false', options:['true','false'], correct_answer:'false', order_index:61 },
  { exam_id:'', text:'KPIs must be measurable.', question_type:'true_false', options:['true','false'], correct_answer:'true', order_index:62 },
  { exam_id:'', text:'ETL includes cleaning data.', question_type:'true_false', options:['true','false'], correct_answer:'true', order_index:63 },
  { exam_id:'', text:'Predictive analytics uses historical data.', question_type:'true_false', options:['true','false'], correct_answer:'true', order_index:64 },
  { exam_id:'', text:'Data governance is not important.', question_type:'true_false', options:['true','false'], correct_answer:'false', order_index:65 },
  { exam_id:'', text:'Data cleaning improves quality.', question_type:'true_false', options:['true','false'], correct_answer:'true', order_index:66 },
  { exam_id:'', text:'Dashboards are used for coding.', question_type:'true_false', options:['true','false'], correct_answer:'false', order_index:67 },
  { exam_id:'', text:'Benchmarking helps improve performance.', question_type:'true_false', options:['true','false'], correct_answer:'true', order_index:68 },
  { exam_id:'', text:'Data profiling identifies issues.', question_type:'true_false', options:['true','false'], correct_answer:'true', order_index:69 },

  // Section C: Short Answer (Q71–Q80)
  { exam_id:'', text:'Define Business Analytics.', question_type:'short_answer', options:[], correct_answer:'The practice of using data to make informed business decisions through statistical analysis and reporting.', order_index:70 },
  { exam_id:'', text:'Explain the difference between OLAP and OLTP.', question_type:'short_answer', options:[], correct_answer:'OLTP handles real-time transaction processing; OLAP handles analytical queries on large historical datasets.', order_index:71 },
  { exam_id:'', text:'List the steps in ETL.', question_type:'short_answer', options:[], correct_answer:'Extract, Transform, Load.', order_index:72 },
  { exam_id:'', text:'What is a KPI? Give one example.', question_type:'short_answer', options:[], correct_answer:'Key Performance Indicator — a measurable value showing how well objectives are being achieved. Example: Monthly Revenue.', order_index:73 },
  { exam_id:'', text:'Explain data cleaning.', question_type:'short_answer', options:[], correct_answer:'The process of detecting and correcting inaccurate, incomplete, or duplicate records in a dataset.', order_index:74 },
  { exam_id:'', text:'What is predictive analytics?', question_type:'short_answer', options:[], correct_answer:'Using historical data and statistical models to forecast future outcomes.', order_index:75 },
  { exam_id:'', text:'Define data governance.', question_type:'short_answer', options:[], correct_answer:'A framework of policies, standards, and procedures ensuring data quality, security, and compliance.', order_index:76 },
  { exam_id:'', text:'What is anomaly detection?', question_type:'short_answer', options:[], correct_answer:'The process of identifying unusual patterns or outliers in data that differ significantly from expected behaviour.', order_index:77 },
  { exam_id:'', text:'Explain benchmarking.', question_type:'short_answer', options:[], correct_answer:'Comparing an organization\'s performance metrics against industry standards or competitors to identify improvement areas.', order_index:78 },
  { exam_id:'', text:'List two benefits of data-driven decision making.', question_type:'short_answer', options:[], correct_answer:'1. Reduces uncertainty. 2. Improves accuracy and business performance.', order_index:79 },
];

const AIPI_DRAFT = {
  name: 'AIPI Digital Literacy Pre-Assessment',
  duration_minutes: 90,
  questions: AIPI_DRAFT_QUESTIONS,
};

// ─────────────────────────────────────────────────────────────────────────────

export default function FelixTeacherDashboard({ teacher, onProctor }: Props) {
  const [exams, setExams] = useState<FelixExam[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'exams' | 'create' | 'drafts'>('exams');
  const [copied, setCopied] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [toggling, setToggling] = useState<string | null>(null);
  const [exportingCsv, setExportingCsv] = useState<string | null>(null);

  // Create tab state
  const [examName, setExamName] = useState('');
  const [duration, setDuration] = useState(60);
  const [questions, setQuestions] = useState<Omit<FelixQuestion, 'id'>[]>([EMPTY_QUESTION()]);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  // Draft publishing state
  const [publishingDraft, setPublishingDraft] = useState(false);
  const [draftPublished, setDraftPublished] = useState(false);
  const [expandedDraftSection, setExpandedDraftSection] = useState<string | null>('mc');
  const [draftQuestions, setDraftQuestions] = useState<Omit<FelixQuestion, 'id'>[]>([...AIPI_DRAFT_QUESTIONS]);
  const [editingQIdx, setEditingQIdx] = useState<number | null>(null);

  useEffect(() => { loadExams(); }, []);

  const loadExams = async () => {
    setLoading(true);
    const { data } = await fetchMyFelixExams();
    setExams(data);
    setLoading(false);
  };

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleToggle = async (exam: FelixExam) => {
    if (!exam.id) return;
    setToggling(exam.id);
    if (exam.is_active) await deactivateFelixExam(exam.id);
    else await activateFelixExam(exam.id);
    await loadExams();
    setToggling(null);
  };

  const handleDelete = async (examId: string) => {
    if (!confirm('Delete this exam and all its data?')) return;
    setDeleting(examId);
    await deleteFelixExam(examId);
    await loadExams();
    setDeleting(null);
  };

  const handleExportCsv = async (exam: FelixExam) => {
    if (!exam.id) return;
    setExportingCsv(exam.id);
    try {
      const { data: results } = await fetchFelixLeaderboard(exam.id);
      if (!results || results.length === 0) { alert('No results yet for this exam.'); return; }
      const header = ['Student Name','Student ID','Score (%)','Correct Answers','Total Questions','Violations','Submitted At'];
      const esc = (v: unknown) => { const s = String(v ?? ''); return s.match(/[",\n]/) ? `"${s.replace(/"/g,'""')}"` : s; };
      const rows = results.map(r => [
        esc(r.student_name), esc(r.student_id),
        esc(r.total_questions > 0 ? ((r.score / r.total_questions) * 100).toFixed(1) : '0.0'),
        esc(r.score), esc(r.total_questions), esc(r.violation_count ?? 0),
        esc(r.submitted_at ? new Date(r.submitted_at).toLocaleString() : ''),
      ]);
      const csv = [header.join(','), ...rows.map(r => r.join(','))].join('\n');
      const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `results_${exam.name.replace(/[^a-z0-9]/gi,'_').toLowerCase()}_${new Date().toISOString().slice(0,10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } finally { setExportingCsv(null); }
  };

  // ── Publish draft to live ────────────────────────────────────────────────
  const handlePublishDraft = async () => {
    setPublishingDraft(true);
    try {
      const { data: { user } } = await (await import('./storage')).supabase.auth.getUser();
      const { exam, error } = await createFelixExam({
        name: AIPI_DRAFT.name,
        teacher_id: user?.id,
        duration_minutes: AIPI_DRAFT.duration_minutes,
        is_active: false,
      });
      if (error || !exam?.id) { alert(error ?? 'Failed to publish draft.'); return; }
      await replaceFelixQuestions(exam.id, draftQuestions.map((q, i) => ({ ...q, exam_id: exam.id!, order_index: i })));
      setDraftPublished(true);
      await loadExams();
      setTab('exams');
    } finally { setPublishingDraft(false); }
  };

  // ── Create tab helpers ───────────────────────────────────────────────────
  const addQuestion = () => setQuestions(prev => [...prev, EMPTY_QUESTION()]);

  const updateQuestion = (i: number, field: string, value: unknown) =>
    setQuestions(prev => prev.map((q, idx) => idx === i ? { ...q, [field]: value } : q));

  const updateOption = (qi: number, oi: number, value: string) => {
    setQuestions(prev => prev.map((q, idx) => {
      if (idx !== qi) return q;
      const newOptions = q.options.map((o, j) => j === oi ? value : o);
      const newCorrect = q.correct_answer === q.options[oi] ? value : q.correct_answer;
      return { ...q, options: newOptions, correct_answer: newCorrect };
    }));
  };

  const setCorrectAnswer = (qi: number, value: string) => {
    setQuestions(prev => prev.map((q, idx) => {
      if (idx !== qi) return q;
      // Toggle off if same answer clicked again
      return { ...q, correct_answer: q.correct_answer === value ? '' : value };
    }));
  };

  const removeQuestion = (i: number) => setQuestions(prev => prev.filter((_, idx) => idx !== i));

  const handleCreate = async () => {
    if (!examName.trim()) { setSaveError('Enter an exam name.'); return; }
    if (questions.some(q => !q.text.trim())) { setSaveError('Fill in all question texts.'); return; }
    const missing = questions.filter(q => q.question_type !== 'short_answer' && !q.correct_answer.trim());
    if (missing.length > 0) { setSaveError('Select the correct answer for every question.'); return; }
    setSaving(true); setSaveError('');
    const { data: { user } } = await (await import('./storage')).supabase.auth.getUser();
    const { exam, error } = await createFelixExam({
      name: examName, teacher_id: user?.id, duration_minutes: duration, is_active: false
    });
    if (error || !exam?.id) { setSaveError(error ?? 'Failed to create exam.'); setSaving(false); return; }
    await replaceFelixQuestions(exam.id, questions.map((q, i) => ({ ...q, exam_id: exam.id!, order_index: i })));
    setExamName(''); setDuration(60); setQuestions([EMPTY_QUESTION()]);
    await loadExams();
    setSaving(false);
    setTab('exams');
  };

  // ── Draft section groups for preview ────────────────────────────────────
  const draftSections = [
    { key: 'mc',    label: 'Section A — Multiple Choice (Q1–Q60)', start: 0,  end: 60 },
    { key: 'tf',    label: 'Section B — True / False (Q61–Q70)',    start: 60, end: 70 },
    { key: 'short', label: 'Section C — Short Answer (Q71–Q80)',    start: 70, end: draftQuestions.length },
  ];

  return (
    <div className="min-h-screen bg-[#080C14] text-white">
      {/* Header */}
      <div className="border-b border-white/[0.06] px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-xs font-black">F</div>
          <span className="font-black text-sm tracking-tight">RMI·FELIX</span>
          <span className="text-slate-700 text-xs">/ Teacher Dashboard</span>
        </div>
        <span className="text-slate-500 text-xs hidden sm:block">{teacher.email || teacher.name}</span>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-white/[0.06] px-6">
        {([
          { key: 'exams',  label: 'My Exams' },
          { key: 'create', label: '+ Create Exam' },
          { key: 'drafts', label: '📄 Drafts' },
        ] as const).map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`py-3 px-4 text-sm font-semibold border-b-2 transition-colors ${
              tab === t.key ? 'border-blue-500 text-white' : 'border-transparent text-slate-600 hover:text-slate-400'
            }`}>
            {t.label}
            {t.key === 'drafts' && (
              <span className="ml-2 text-[10px] bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded-full font-bold">1</span>
            )}
          </button>
        ))}
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8">

        {/* ── EXAMS TAB ── */}
        {tab === 'exams' && (
          <div>
            {loading ? (
              <div className="flex justify-center py-20">
                <span className="w-6 h-6 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
              </div>
            ) : exams.length === 0 ? (
              <div className="text-center py-20">
                <BookOpen className="w-10 h-10 text-slate-700 mx-auto mb-3" />
                <p className="text-slate-600">No exams yet.</p>
                <button onClick={() => setTab('create')} className="mt-4 text-blue-400 text-sm hover:text-blue-300 transition-colors">
                  Create your first exam →
                </button>
                <p className="mt-2 text-slate-700 text-xs">or check <button onClick={() => setTab('drafts')} className="text-amber-400 hover:text-amber-300">Drafts</button> to publish the AIPI exam</p>
              </div>
            ) : (
              <div className="space-y-4">
                {exams.map(exam => (
                  <motion.div key={exam.id} layout
                    className="bg-white/[0.03] border border-white/[0.07] rounded-2xl p-5 space-y-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={`w-2 h-2 rounded-full shrink-0 ${exam.is_active ? 'bg-emerald-400 animate-pulse' : 'bg-slate-700'}`} />
                        <h3 className="font-bold text-sm truncate">{exam.name}</h3>
                        <span className="text-slate-600 text-xs shrink-0">{exam.duration_minutes}min</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
                        <button onClick={() => handleToggle(exam)} disabled={toggling === exam.id}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                            exam.is_active
                              ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20'
                              : 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'
                          }`}>
                          {toggling === exam.id
                            ? <span className="w-3 h-3 border border-current/30 border-t-current rounded-full animate-spin" />
                            : exam.is_active ? <Square className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                          {exam.is_active ? 'Deactivate' : 'Activate'}
                        </button>
                        {exam.is_active && (
                          <button onClick={() => onProctor(exam)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-colors">
                            <Eye className="w-3 h-3" />Proctor
                          </button>
                        )}
                        <button onClick={() => handleExportCsv(exam)} disabled={exportingCsv === exam.id}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-colors disabled:opacity-50">
                          {exportingCsv === exam.id
                            ? <span className="w-3 h-3 border border-current/30 border-t-current rounded-full animate-spin" />
                            : <Download className="w-3 h-3" />}
                          {exportingCsv === exam.id ? 'Exporting…' : 'Export CSV'}
                        </button>
                        <button onClick={() => handleDelete(exam.id!)} disabled={deleting === exam.id}
                          className="p-1.5 rounded-lg text-slate-700 hover:text-red-400 hover:bg-red-500/10 transition-colors">
                          {deleting === exam.id
                            ? <span className="w-3 h-3 border border-current/30 border-t-current rounded-full animate-spin block" />
                            : <Trash2 className="w-3 h-3" />}
                        </button>
                      </div>
                    </div>

                    <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-3 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-slate-600 text-[10px] uppercase tracking-wider font-semibold">Session Code</span>
                          <span className="font-mono text-blue-300 text-sm tracking-widest font-bold">{exam.session_code}</span>
                        </div>
                        <button onClick={() => copyToClipboard(exam.session_code, `code-${exam.id}`)}
                          className="flex items-center gap-1 text-[10px] text-slate-500 hover:text-slate-300 transition-colors">
                          {copied === `code-${exam.id}` ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                          {copied === `code-${exam.id}` ? 'Copied!' : 'Copy code'}
                        </button>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <Link className="w-3 h-3 text-slate-600 shrink-0" />
                          <span className="text-slate-600 text-[10px] truncate">{examLink(exam.session_code)}</span>
                        </div>
                        <button onClick={() => copyToClipboard(examLink(exam.session_code), `link-${exam.id}`)}
                          className="flex items-center gap-1 text-[10px] shrink-0 text-blue-400 hover:text-blue-300 transition-colors font-semibold">
                          {copied === `link-${exam.id}` ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                          {copied === `link-${exam.id}` ? 'Copied!' : 'Copy link'}
                        </button>
                      </div>
                      {!exam.is_active && (
                        <p className="text-[10px] text-amber-600 mt-1 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" /> Activate before sharing link with students.
                        </p>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── CREATE TAB ── */}
        {tab === 'create' && (
          <div className="max-w-2xl">
            <div className="space-y-4 mb-8">
              <div>
                <label className="text-xs text-slate-500 mb-1.5 block font-semibold uppercase tracking-wider">Exam Name</label>
                <input value={examName} onChange={e => setExamName(e.target.value)} placeholder="e.g. Data Science Midterm"
                  className="w-full px-4 py-3 bg-white/[0.04] border border-white/[0.08] rounded-xl text-white placeholder-slate-700 text-sm outline-none focus:border-blue-500 transition-colors" />
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1.5 block font-semibold uppercase tracking-wider">Duration (minutes)</label>
                <input type="number" value={duration} onChange={e => setDuration(Number(e.target.value))} min={5} max={300}
                  className="w-32 px-4 py-3 bg-white/[0.04] border border-white/[0.08] rounded-xl text-white text-sm outline-none focus:border-blue-500 transition-colors" />
              </div>
            </div>

            <div className="space-y-5">
              <h3 className="font-bold text-sm text-slate-300">Questions ({questions.length})</h3>

              {questions.map((q, qi) => (
                <motion.div key={qi} layout className="bg-white/[0.03] border border-white/[0.07] rounded-2xl p-5 space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-blue-400 text-xs font-black mt-1 shrink-0 bg-blue-500/10 px-2 py-0.5 rounded-md">Q{qi + 1}</span>
                    <textarea value={q.text} onChange={e => updateQuestion(qi, 'text', e.target.value)}
                      placeholder="Type the question here..." rows={2}
                      className="flex-1 px-3 py-2 bg-white/[0.04] border border-white/[0.06] rounded-lg text-white placeholder-slate-700 text-sm outline-none focus:border-blue-500 transition-colors resize-none" />
                    <button onClick={() => removeQuestion(qi)} className="text-slate-700 hover:text-red-400 transition-colors shrink-0 mt-1">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <select value={q.question_type} onChange={e => {
                    updateQuestion(qi, 'question_type', e.target.value as QuestionType);
                    updateQuestion(qi, 'correct_answer', '');
                  }}
                    className="px-3 py-2 bg-white/[0.04] border border-white/[0.06] rounded-lg text-white text-xs outline-none focus:border-blue-500 transition-colors">
                    <option value="multiple_choice">Multiple Choice</option>
                    <option value="true_false">True / False</option>
                    <option value="short_answer">Short Answer</option>
                  </select>

                  {/* ── MULTIPLE CHOICE ── */}
                  {q.question_type === 'multiple_choice' && (
                    <div className="space-y-2">
                      <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">
                        Options — click a letter to mark it as the correct answer
                      </p>
                      {q.options.map((opt, oi) => {
                        const letter = String.fromCharCode(65 + oi);
                        const isSelected = q.correct_answer !== '' && q.correct_answer === opt;
                        return (
                          <div key={oi} className={`flex items-center gap-2 p-2 rounded-xl border transition-all ${
                            isSelected ? 'border-emerald-500/60 bg-emerald-500/10' : 'border-white/[0.05] bg-white/[0.02]'
                          }`}>
                            {/* Correct answer toggle — explicit radio style */}
                            <button
                              type="button"
                              onClick={() => setCorrectAnswer(qi, opt)}
                              title={isSelected ? 'Click to deselect' : 'Mark as correct answer'}
                              className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 font-black text-xs transition-all border-2 ${
                                isSelected
                                  ? 'bg-emerald-500 border-emerald-400 text-white shadow-lg shadow-emerald-900/30'
                                  : 'bg-white/[0.04] border-white/[0.12] text-slate-500 hover:border-emerald-500/60 hover:text-emerald-400 hover:bg-emerald-500/10'
                              }`}
                            >
                              {isSelected ? <CheckCircle2 className="w-4 h-4" /> : letter}
                            </button>
                            <input
                              value={opt}
                              onChange={e => updateOption(qi, oi, e.target.value)}
                              placeholder={`Option ${letter}`}
                              className="flex-1 bg-transparent text-white placeholder-slate-700 text-sm outline-none"
                            />
                            {isSelected && (
                              <span className="text-emerald-400 text-[10px] font-black shrink-0 bg-emerald-500/10 px-2 py-0.5 rounded-md">
                                ✓ CORRECT
                              </span>
                            )}
                          </div>
                        );
                      })}
                      {!q.correct_answer && (
                        <p className="text-amber-600 text-[10px] flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" /> Click a letter button to mark the correct option.
                        </p>
                      )}
                    </div>
                  )}

                  {/* ── TRUE / FALSE ── */}
                  {q.question_type === 'true_false' && (
                    <div className="space-y-2">
                      <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Select the correct answer</p>
                      <div className="flex gap-3">
                        {['true', 'false'].map(val => {
                          const isSelected = q.correct_answer === val;
                          return (
                            <button key={val} type="button"
                              onClick={() => setCorrectAnswer(qi, val)}
                              className={`flex-1 py-3 rounded-xl border-2 font-bold capitalize text-sm transition-all flex items-center justify-center gap-2 ${
                                isSelected
                                  ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 shadow-lg shadow-emerald-900/20'
                                  : 'bg-white/[0.03] border-white/[0.1] text-slate-500 hover:border-emerald-500/40 hover:text-emerald-400 hover:bg-emerald-500/5'
                              }`}>
                              {isSelected && <CheckCircle2 className="w-4 h-4" />}
                              {val}
                              {isSelected && <span className="text-[10px] font-black">✓</span>}
                            </button>
                          );
                        })}
                      </div>
                      {!q.correct_answer && (
                        <p className="text-amber-600 text-[10px] flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" /> Select True or False as the correct answer.
                        </p>
                      )}
                    </div>
                  )}

                  {/* ── SHORT ANSWER ── */}
                  {q.question_type === 'short_answer' && (
                    <div className="space-y-1">
                      <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Model / Expected Answer</p>
                      <input value={q.correct_answer} onChange={e => updateQuestion(qi, 'correct_answer', e.target.value)}
                        placeholder="Type the expected answer here (used for auto-grading)"
                        className="w-full px-3 py-2 bg-white/[0.04] border border-white/[0.06] rounded-lg text-white placeholder-slate-700 text-xs outline-none focus:border-blue-500 transition-colors" />
                      <p className="text-[10px] text-slate-700">Short answers are graded by exact match (case-insensitive).</p>
                    </div>
                  )}
                </motion.div>
              ))}

              <button onClick={addQuestion}
                className="w-full py-3 border border-dashed border-white/[0.1] rounded-xl text-slate-600 hover:text-slate-400 hover:border-white/[0.2] transition-colors text-sm flex items-center justify-center gap-2">
                <Plus className="w-4 h-4" />Add Question
              </button>
            </div>

            <AnimatePresence>
              {saveError && (
                <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className="mt-4 flex items-center gap-2 text-red-400 text-xs bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                  <AlertTriangle className="w-3 h-3 shrink-0" />{saveError}
                </motion.div>
              )}
            </AnimatePresence>

            <button onClick={handleCreate} disabled={saving || !examName.trim()}
              className="mt-6 w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl font-bold text-sm transition-colors flex items-center justify-center gap-2">
              {saving ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Plus className="w-4 h-4" />}
              {saving ? 'Creating...' : 'Create Exam'}
            </button>
          </div>
        )}

        {/* ── DRAFTS TAB ── */}
        {tab === 'drafts' && (
          <div className="max-w-3xl">
            {/* Draft card */}
            <div className="bg-white/[0.03] border border-amber-500/30 rounded-2xl overflow-hidden">
              {/* Draft header */}
              <div className="p-5 border-b border-white/[0.06]">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-amber-500/20 border border-amber-500/30 rounded-xl flex items-center justify-center shrink-0 mt-0.5">
                      <FileText className="w-5 h-5 text-amber-400" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">Draft</span>
                        <span className="text-[10px] text-slate-600">Not yet published</span>
                      </div>
                      <h3 className="font-black text-white text-base">{AIPI_DRAFT.name}</h3>
                      <p className="text-slate-500 text-xs mt-1">
                        {AIPI_DRAFT.duration_minutes} min · {AIPI_DRAFT.questions.length} questions
                        <span className="mx-1.5 text-slate-700">·</span>
                        60 MCQ + 10 True/False + 10 Short Answer
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={handlePublishDraft}
                    disabled={publishingDraft || draftPublished}
                    className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-bold text-sm transition-colors shrink-0 shadow-lg shadow-blue-900/30"
                  >
                    {publishingDraft
                      ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      : draftPublished
                        ? <Check className="w-4 h-4 text-emerald-300" />
                        : <Upload className="w-4 h-4" />
                    }
                    {publishingDraft ? 'Publishing…' : draftPublished ? 'Published!' : 'Publish to Live'}
                  </button>
                </div>

                {draftPublished && (
                  <div className="mt-3 flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-3 py-2 text-emerald-400 text-xs font-semibold">
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                    Exam published! Go to <button onClick={() => setTab('exams')} className="underline ml-1">My Exams</button> to activate it.
                  </div>
                )}
              </div>

              {/* Question editor by section */}
              <div className="divide-y divide-white/[0.05]">
                {draftSections.map(section => (
                  <div key={section.key}>
                    <button
                      onClick={() => setExpandedDraftSection(expandedDraftSection === section.key ? null : section.key)}
                      className="w-full flex items-center justify-between px-5 py-3 hover:bg-white/[0.02] transition-colors text-left"
                    >
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{section.label}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-slate-600">{section.end - section.start} questions</span>
                        {expandedDraftSection === section.key
                          ? <ChevronUp className="w-3.5 h-3.5 text-slate-600" />
                          : <ChevronDown className="w-3.5 h-3.5 text-slate-600" />}
                      </div>
                    </button>

                    <AnimatePresence>
                      {expandedDraftSection === section.key && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div className="px-5 pb-4 space-y-2 max-h-[520px] overflow-y-auto">
                            {draftQuestions.slice(section.start, section.end).map((q, i) => {
                              const globalIdx = section.start + i;
                              const isEditing = editingQIdx === globalIdx;
                              return (
                                <div key={globalIdx} className={`rounded-xl border transition-all ${isEditing ? "border-blue-500/40 bg-blue-500/5" : "border-white/[0.04] bg-white/[0.01] hover:border-white/[0.08]"}`}>

                                  {/* ── READ VIEW ── */}
                                  {!isEditing && (
                                    <div className="flex items-start gap-3 px-3 py-2.5">
                                      <span className="text-blue-400 text-[10px] font-black shrink-0 bg-blue-500/10 px-1.5 py-0.5 rounded mt-0.5">
                                        Q{globalIdx + 1}
                                      </span>
                                      <div className="flex-1 min-w-0">
                                        <p className="text-slate-300 text-xs leading-relaxed">{q.text}</p>
                                        {q.question_type === "multiple_choice" && (
                                          <div className="mt-1.5 flex flex-wrap gap-1">
                                            {q.options.map((opt, oi) => (
                                              <span key={oi} className={`text-[10px] px-2 py-0.5 rounded-md font-semibold ${
                                                opt === q.correct_answer
                                                  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                                                  : "bg-white/[0.04] text-slate-600"
                                              }`}>
                                                {String.fromCharCode(65 + oi)}. {opt}
                                              </span>
                                            ))}
                                          </div>
                                        )}
                                        {q.question_type === "true_false" && (
                                          <p className="text-[10px] text-emerald-400 mt-1 font-semibold">
                                            ✓ {q.correct_answer.charAt(0).toUpperCase() + q.correct_answer.slice(1)}
                                          </p>
                                        )}
                                        {q.question_type === "short_answer" && (
                                          <p className="text-[10px] text-slate-500 mt-1 italic">{q.correct_answer}</p>
                                        )}
                                      </div>
                                      <button
                                        onClick={() => { setEditingQIdx(globalIdx); setExpandedDraftSection(section.key); }}
                                        className="shrink-0 p-1.5 rounded-lg text-slate-600 hover:text-blue-400 hover:bg-blue-500/10 transition-colors"
                                        title="Edit this question"
                                      >
                                        <Pencil className="w-3 h-3" />
                                      </button>
                                    </div>
                                  )}

                                  {/* ── EDIT VIEW ── */}
                                  {isEditing && (
                                    <div className="p-3 space-y-3">
                                      {/* Header row */}
                                      <div className="flex items-center justify-between">
                                        <span className="text-blue-400 text-[10px] font-black bg-blue-500/10 px-1.5 py-0.5 rounded">Q{globalIdx + 1} — Editing</span>
                                        <button
                                          onClick={() => setEditingQIdx(null)}
                                          className="p-1 rounded-lg text-slate-600 hover:text-slate-300 hover:bg-white/[0.06] transition-colors"
                                        >
                                          <X className="w-3.5 h-3.5" />
                                        </button>
                                      </div>

                                      {/* Question text */}
                                      <div>
                                        <label className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold block mb-1">Question Text</label>
                                        <textarea
                                          value={q.text}
                                          onChange={e => setDraftQuestions(prev => prev.map((dq, di) => di === globalIdx ? { ...dq, text: e.target.value } : dq))}
                                          rows={2}
                                          className="w-full px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-lg text-white text-xs outline-none focus:border-blue-500 transition-colors resize-none"
                                        />
                                      </div>

                                      {/* Type selector */}
                                      <div>
                                        <label className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold block mb-1">Question Type</label>
                                        <select
                                          value={q.question_type}
                                          onChange={e => setDraftQuestions(prev => prev.map((dq, di) =>
                                            di === globalIdx
                                              ? { ...dq, question_type: e.target.value as QuestionType, correct_answer: "", options: e.target.value === "multiple_choice" ? ["","","",""] : dq.options }
                                              : dq
                                          ))}
                                          className="px-2 py-1.5 bg-white/[0.04] border border-white/[0.08] rounded-lg text-white text-xs outline-none focus:border-blue-500 transition-colors"
                                        >
                                          <option value="multiple_choice">Multiple Choice</option>
                                          <option value="true_false">True / False</option>
                                          <option value="short_answer">Short Answer</option>
                                        </select>
                                      </div>

                                      {/* Multiple choice options */}
                                      {q.question_type === "multiple_choice" && (
                                        <div className="space-y-1.5">
                                          <label className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold block">Options — click letter to mark correct</label>
                                          {q.options.map((opt, oi) => {
                                            const letter = String.fromCharCode(65 + oi);
                                            const isCorrect = q.correct_answer === opt && opt !== "";
                                            return (
                                              <div key={oi} className={`flex items-center gap-2 p-1.5 rounded-lg border transition-all ${isCorrect ? "border-emerald-500/50 bg-emerald-500/5" : "border-white/[0.05]"}`}>
                                                <button
                                                  type="button"
                                                  onClick={() => setDraftQuestions(prev => prev.map((dq, di) =>
                                                    di === globalIdx ? { ...dq, correct_answer: dq.correct_answer === opt ? "" : opt } : dq
                                                  ))}
                                                  className={`w-7 h-7 rounded-md flex items-center justify-center shrink-0 font-black text-[10px] border-2 transition-all ${
                                                    isCorrect
                                                      ? "bg-emerald-500 border-emerald-400 text-white"
                                                      : "bg-white/[0.04] border-white/[0.1] text-slate-500 hover:border-emerald-500/50 hover:text-emerald-400"
                                                  }`}
                                                >
                                                  {isCorrect ? <CheckCircle2 className="w-3.5 h-3.5" /> : letter}
                                                </button>
                                                <input
                                                  value={opt}
                                                  onChange={e => {
                                                    const newVal = e.target.value;
                                                    setDraftQuestions(prev => prev.map((dq, di) => {
                                                      if (di !== globalIdx) return dq;
                                                      const newOpts = dq.options.map((o, j) => j === oi ? newVal : o);
                                                      const newCorrect = dq.correct_answer === opt ? newVal : dq.correct_answer;
                                                      return { ...dq, options: newOpts, correct_answer: newCorrect };
                                                    }));
                                                  }}
                                                  placeholder={`Option ${letter}`}
                                                  className="flex-1 bg-transparent text-white placeholder-slate-700 text-xs outline-none"
                                                />
                                                {isCorrect && <span className="text-emerald-400 text-[9px] font-black shrink-0">✓ CORRECT</span>}
                                              </div>
                                            );
                                          })}
                                        </div>
                                      )}

                                      {/* True / False */}
                                      {q.question_type === "true_false" && (
                                        <div>
                                          <label className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold block mb-1.5">Correct Answer</label>
                                          <div className="flex gap-2">
                                            {["true", "false"].map(val => (
                                              <button key={val} type="button"
                                                onClick={() => setDraftQuestions(prev => prev.map((dq, di) =>
                                                  di === globalIdx ? { ...dq, correct_answer: val } : dq
                                                ))}
                                                className={`flex-1 py-2 rounded-lg border-2 font-bold capitalize text-xs transition-all flex items-center justify-center gap-1.5 ${
                                                  q.correct_answer === val
                                                    ? "bg-emerald-500/20 border-emerald-500 text-emerald-300"
                                                    : "bg-white/[0.03] border-white/[0.1] text-slate-500 hover:border-emerald-500/40 hover:text-emerald-400"
                                                }`}>
                                                {q.correct_answer === val && <CheckCircle2 className="w-3 h-3" />}
                                                {val}
                                              </button>
                                            ))}
                                          </div>
                                        </div>
                                      )}

                                      {/* Short answer */}
                                      {q.question_type === "short_answer" && (
                                        <div>
                                          <label className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold block mb-1">Expected Answer</label>
                                          <textarea
                                            value={q.correct_answer}
                                            onChange={e => setDraftQuestions(prev => prev.map((dq, di) =>
                                              di === globalIdx ? { ...dq, correct_answer: e.target.value } : dq
                                            ))}
                                            rows={2}
                                            placeholder="Expected / model answer"
                                            className="w-full px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-lg text-white text-xs outline-none focus:border-blue-500 transition-colors resize-none"
                                          />
                                        </div>
                                      )}

                                      {/* Done button */}
                                      <button
                                        onClick={() => setEditingQIdx(null)}
                                        className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold transition-colors"
                                      >
                                        <Save className="w-3 h-3" /> Save Changes
                                      </button>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ))}
              </div>
            </div>

            <p className="text-slate-700 text-xs mt-4 text-center">
              Drafts are pre-built exams ready to publish. Once published they appear in My Exams and can be activated.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}