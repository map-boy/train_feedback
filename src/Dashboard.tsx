import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  LayoutDashboard, QrCode, FileSpreadsheet, LogOut, Users,
  BookOpen, User, TrendingUp, ClipboardCheck, Trash2, Download,
  X, Copy, Check, RefreshCw, Loader2, Star, Home, GraduationCap,
} from 'lucide-react';
import { Evaluation, CustomerFeedback, MODULE_QUESTIONS, TRAINER_QUESTIONS, ratingLabel, FelixUser, FelixExam, FelixResult, FelixPage, FelixSessionState } from './types';
import FelixTeacherDashboard from './FelixTeacherDashboard';
import FelixLiveProctor from './FelixLiveProctor';
import FelixExamPage from './FelixExamPage';
import FelixResultPage from './FelixResult';
import {
  fetchEvaluations, deleteEvaluation, exportOneEvaluation, exportAllEvaluations,
  fetchCustomerFeedback, deleteCustomerFeedback, exportOneCustomerFeedback, exportAllCustomerFeedback,
  teacherSignOut,
} from './storage';

interface Props { onLogout: () => void }

// ─── helpers ──────────────────────────────────────────────────────────────────
const avgOf = (e: Evaluation, keys: (keyof Evaluation)[]): string => {
  const vals = keys.map((k) => e[k] as number | null).filter((v): v is number => v !== null);
  return vals.length ? (vals.reduce((a,b)=>a+b,0)/vals.length).toFixed(1) : '–';
};
const avgModule  = (e: Evaluation) => avgOf(e, ['module_q1','module_q2','module_q3','module_q4','module_q5']);
const avgTrainer = (e: Evaluation) => avgOf(e, ['trainer_q1','trainer_q2','trainer_q3','trainer_q4','trainer_q5','trainer_q6','trainer_q7','trainer_q8']);
const overallAvg = (list: Evaluation[], fn: (e:Evaluation)=>string) => {
  if (!list.length) return '–';
  const vals = list.map(e=>parseFloat(fn(e))).filter(v=>!isNaN(v));
  return vals.length ? (vals.reduce((a,b)=>a+b,0)/vals.length).toFixed(1) : '–';
};
const avgCustomer = (list: CustomerFeedback[], key: keyof CustomerFeedback) => {
  const vals = list.map(f=>f[key] as number|null).filter((v):v is number=>v!==null);
  return vals.length ? (vals.reduce((a,b)=>a+b,0)/vals.length).toFixed(1) : '–';
};

type Tab = 'training' | 'customer' | 'felix';

// ─── QR Modal ─────────────────────────────────────────────────────────────────
function QRModal({ title, url, onClose }: { title: string; url: string; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&color=1e40af&bgcolor=ffffff&data=${encodeURIComponent(url)}`;

  const copy = async () => {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}>
      <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9 }}
        className="bg-[#0d1117] border border-white/[0.1] rounded-3xl p-8 max-w-sm w-full text-center"
        onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-black text-white">{title}</h3>
          <button onClick={onClose} className="text-slate-600 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <p className="text-slate-500 text-sm mb-5">
          Students scan this with their phone to open the form
        </p>
        <div className="bg-white rounded-2xl p-4 inline-block mb-4 shadow-2xl">
          <img src={qrSrc} alt="QR Code" className="w-48 h-48" />
        </div>
        <p className="text-slate-700 text-[10px] font-mono break-all mb-5 px-2">{url}</p>
        <button onClick={copy}
          className="w-full flex items-center justify-center gap-2 py-3 bg-white/[0.06] hover:bg-white/10 border border-white/[0.1] rounded-2xl text-sm font-bold transition-all">
          {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
          {copied ? 'Copied!' : 'Copy link'}
        </button>
        <p className="text-slate-700 text-xs mt-4 leading-relaxed">
          💡 Responses appear <span className="text-white font-semibold">immediately</span> after each student submits.
        </p>
      </motion.div>
    </motion.div>
  );
}

// ─── Training Evaluations Tab ─────────────────────────────────────────────────
function TrainingTab({ trainingUrl }: { trainingUrl: string }) {
  const [items, setItems]   = useState<Evaluation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Evaluation | null>(null);
  const [deleting, setDeleting] = useState<string|null>(null);
  const [showQR, setShowQR] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await fetchEvaluations();
    setItems(data);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (id: string) => {
    setDeleting(id);
    await deleteEvaluation(id);
    if (selected?.id === id) setSelected(null);
    await load();
    setDeleting(null);
  };

  return (
    <>
      {/* Sub-header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <ClipboardCheck className="w-4 h-4 text-blue-400" />
          <span className="text-sm font-black text-white">Post-Training Evaluations</span>
          <span className="text-xs text-slate-600 bg-white/[0.06] px-2 py-0.5 rounded-full">{items.length}</span>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowQR(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-blue-600/20 hover:bg-blue-600/40 border border-blue-500/30 rounded-xl text-blue-400 text-xs font-bold transition-all">
            <QrCode className="w-3.5 h-3.5" /> QR Code
          </button>
          {items.length > 0 && (
            <button onClick={() => exportAllEvaluations(items)}
              className="flex items-center gap-1.5 px-3 py-2 bg-green-600/20 hover:bg-green-600/40 border border-green-500/30 rounded-xl text-green-400 text-xs font-bold transition-all">
              <FileSpreadsheet className="w-3.5 h-3.5" /> Export All
            </button>
          )}
          <button onClick={load} className="p-2 text-slate-600 hover:text-white hover:bg-white/10 rounded-lg transition-all">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3 mb-5">
        {[
          { icon: Users,      val: loading?'…':items.length,                        label:'Submissions',   color:'text-blue-400'   },
          { icon: BookOpen,   val: loading?'…':overallAvg(items,avgModule),          label:'Avg Module',    color:'text-indigo-400' },
          { icon: User,       val: loading?'…':overallAvg(items,avgTrainer),         label:'Avg Trainer',   color:'text-purple-400' },
          { icon: TrendingUp, val: loading?'…':new Set(items.map(s=>s.trainer_name)).size, label:'Trainers', color:'text-green-400' },
        ].map(({icon:Icon,val,label,color})=>(
          <div key={label} className="bg-[#0d1117] border border-white/[0.08] rounded-2xl p-3">
            <Icon className={`w-4 h-4 ${color} mb-1.5`} />
            <div className="text-xl font-black text-white">{val}</div>
            <div className="text-[9px] text-slate-600 uppercase tracking-widest mt-0.5">{label}</div>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 gap-3 text-slate-600">
          <Loader2 className="w-5 h-5 animate-spin" /> Loading...
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center py-20 text-slate-700">
          <ClipboardCheck className="w-12 h-12 mb-3 opacity-20" />
          <p className="font-black text-slate-500">No evaluations yet</p>
          <button onClick={() => setShowQR(true)} className="mt-4 flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 rounded-2xl font-bold text-sm transition-colors">
            <QrCode className="w-4 h-4" /> Show QR Code
          </button>
        </div>
      ) : (
        <div className="grid lg:grid-cols-5 gap-5">
          {/* List */}
          <div className="lg:col-span-2 space-y-2">
            {items.map((s) => (
              <motion.div key={s.id} initial={{ opacity:0,x:-8 }} animate={{ opacity:1,x:0 }}
                onClick={() => setSelected(s)}
                className={`p-4 rounded-2xl border cursor-pointer transition-all ${selected?.id===s.id?'bg-blue-600/15 border-blue-500/40':'bg-[#0d1117] border-white/[0.07] hover:border-white/20'}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="font-bold text-white text-sm truncate">{s.module_title||'Untitled'}</div>
                    <div className="text-slate-500 text-xs truncate mt-0.5">{s.trainer_name||'–'}</div>
                    <div className="text-slate-700 text-[10px] mt-1">{s.submitted_at?new Date(s.submitted_at).toLocaleString():''}</div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-[10px] text-slate-600">Module</div>
                    <div className="font-black text-blue-400 text-sm">{avgModule(s)}</div>
                    <div className="text-[10px] text-slate-600 mt-0.5">Trainer</div>
                    <div className="font-black text-indigo-400 text-sm">{avgTrainer(s)}</div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Detail */}
          <div className="lg:col-span-3">
            {selected ? (
              <motion.div key={selected.id} initial={{ opacity:0,y:8 }} animate={{ opacity:1,y:0 }}
                className="bg-[#0d1117] border border-white/[0.08] rounded-3xl p-6 space-y-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-black text-white">{selected.module_title||'Untitled'}</h2>
                    <p className="text-slate-500 text-sm mt-0.5">Trainer: <span className="text-slate-300">{selected.trainer_name}</span></p>
                    <p className="text-slate-700 text-xs mt-0.5">{selected.delivery_from} → {selected.delivery_to} · {selected.evaluation_date}</p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button onClick={() => exportOneEvaluation(selected)}
                      className="flex items-center gap-1.5 px-3 py-2 bg-green-600/20 hover:bg-green-600/40 border border-green-500/30 rounded-xl text-green-400 text-xs font-bold transition-all">
                      <Download className="w-3.5 h-3.5" /> Excel
                    </button>
                    <button onClick={() => handleDelete(selected.id!)} disabled={deleting===selected.id}
                      className="flex items-center gap-1.5 px-3 py-2 bg-red-600/20 hover:bg-red-600/40 border border-red-500/30 rounded-xl text-red-400 text-xs font-bold transition-all disabled:opacity-50">
                      {deleting===selected.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                {/* Module bars */}
                <div>
                  <h4 className="text-[10px] font-black text-slate-600 uppercase tracking-widest mb-3">Section A – Module</h4>
                  <div className="space-y-2">
                    {MODULE_QUESTIONS.map((q) => {
                      const val = (selected[q.key] as number|null) ?? 0;
                      return (
                        <div key={q.key} className="flex items-center gap-3">
                          <span className="text-[10px] text-slate-600 flex-1 truncate">{q.label}</span>
                          <div className="flex gap-1">{[1,2,3,4,5].map(v=><div key={v} className={`w-4 h-4 rounded-sm ${v<=val?'bg-blue-500':'bg-white/[0.06]'}`}/>)}</div>
                          <span className="text-xs font-black text-white w-4 text-right">{val||'–'}</span>
                        </div>
                      );
                    })}
                    <div className="pt-1 border-t border-white/[0.05] flex justify-between text-xs">
                      <span className="text-slate-600">Average</span>
                      <span className="font-black text-blue-400">{avgModule(selected)} / 5</span>
                    </div>
                  </div>
                </div>

                {/* Trainer bars */}
                <div>
                  <h4 className="text-[10px] font-black text-slate-600 uppercase tracking-widest mb-3">Section B – Trainer</h4>
                  <div className="space-y-2">
                    {TRAINER_QUESTIONS.map((q) => {
                      const val = (selected[q.key] as number|null) ?? 0;
                      return (
                        <div key={q.key} className="flex items-center gap-3">
                          <span className="text-[10px] text-slate-600 flex-1 truncate">{q.label}</span>
                          <div className="flex gap-1">{[1,2,3,4,5].map(v=><div key={v} className={`w-4 h-4 rounded-sm ${v<=val?'bg-indigo-500':'bg-white/[0.06]'}`}/>)}</div>
                          <span className="text-xs font-black text-white w-4 text-right">{val||'–'}</span>
                        </div>
                      );
                    })}
                    <div className="pt-1 border-t border-white/[0.05] flex justify-between text-xs">
                      <span className="text-slate-600">Average</span>
                      <span className="font-black text-indigo-400">{avgTrainer(selected)} / 5</span>
                    </div>
                  </div>
                </div>

                {(selected.comments||selected.challenges||selected.suggestions) && (
                  <div className="space-y-2">
                    {[{l:'Comments',v:selected.comments},{l:'Challenges',v:selected.challenges},{l:'Suggestions',v:selected.suggestions}]
                      .filter(x=>x.v).map(({l,v})=>(
                      <div key={l} className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-3">
                        <div className="text-[10px] font-black text-slate-600 uppercase tracking-widest mb-1">{l}</div>
                        <p className="text-slate-300 text-sm">{v}</p>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            ) : (
              <div className="flex items-center justify-center h-64 text-slate-700 text-sm">← Select a submission</div>
            )}
          </div>
        </div>
      )}

      <AnimatePresence>
        {showQR && <QRModal title="Post-Training Evaluation QR" url={trainingUrl} onClose={() => setShowQR(false)} />}
      </AnimatePresence>
    </>
  );
}

// ─── Customer Feedback Tab ────────────────────────────────────────────────────
function CustomerTab({ customerUrl }: { customerUrl: string }) {
  const [items, setItems]       = useState<CustomerFeedback[]>([]);
  const [loading, setLoading]   = useState(true);
  const [selected, setSelected] = useState<CustomerFeedback|null>(null);
  const [deleting, setDeleting] = useState<string|null>(null);
  const [showQR, setShowQR]     = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await fetchCustomerFeedback();
    setItems(data);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (id: string) => {
    setDeleting(id);
    await deleteCustomerFeedback(id);
    if (selected?.id === id) setSelected(null);
    await load();
    setDeleting(null);
  };

  const RatingBar = ({ label, val }: { label: string; val: number | null }) => (
    <div className="flex items-center gap-3">
      <span className="text-[10px] text-slate-600 flex-1 truncate">{label}</span>
      <div className="flex gap-1">
        {[1,2,3,4,5].map(v=>(
          <div key={v} className={`w-4 h-4 rounded-sm ${v<=(val??0)?'bg-green-500':'bg-white/[0.06]'}`} />
        ))}
      </div>
      <span className="text-xs font-bold text-white w-16 text-right text-[10px]">{ratingLabel(val)}</span>
    </div>
  );

  return (
    <>
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <Star className="w-4 h-4 text-green-400" />
          <span className="text-sm font-black text-white">Customer Feedback</span>
          <span className="text-xs text-slate-600 bg-white/[0.06] px-2 py-0.5 rounded-full">{items.length}</span>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowQR(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-green-600/20 hover:bg-green-600/40 border border-green-500/30 rounded-xl text-green-400 text-xs font-bold transition-all">
            <QrCode className="w-3.5 h-3.5" /> QR Code
          </button>
          {items.length > 0 && (
            <button onClick={() => exportAllCustomerFeedback(items)}
              className="flex items-center gap-1.5 px-3 py-2 bg-green-600/20 hover:bg-green-600/40 border border-green-500/30 rounded-xl text-green-400 text-xs font-bold transition-all">
              <FileSpreadsheet className="w-3.5 h-3.5" /> Export All
            </button>
          )}
          <button onClick={load} className="p-2 text-slate-600 hover:text-white hover:bg-white/10 rounded-lg transition-all">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3 mb-5">
        {[
          { icon: Users,   val: loading?'…':items.length,                             label:'Total',      color:'text-green-400' },
          { icon: Star,    val: loading?'…':avgCustomer(items,'reception_rating'),     label:'Reception',  color:'text-teal-400'  },
          { icon: ClipboardCheck, val: loading?'…':avgCustomer(items,'service_rating'),  label:'Service',    color:'text-blue-400'  },
          { icon: Home,    val: loading?'…':items.filter(f=>f.is_resident).length,    label:'Residents',  color:'text-purple-400'},
        ].map(({icon:Icon,val,label,color})=>(
          <div key={label} className="bg-[#0d1117] border border-white/[0.08] rounded-2xl p-3">
            <Icon className={`w-4 h-4 ${color} mb-1.5`} />
            <div className="text-xl font-black text-white">{val}</div>
            <div className="text-[9px] text-slate-600 uppercase tracking-widest mt-0.5">{label}</div>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 gap-3 text-slate-600">
          <Loader2 className="w-5 h-5 animate-spin" /> Loading...
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center py-20 text-slate-700">
          <Star className="w-12 h-12 mb-3 opacity-20" />
          <p className="font-black text-slate-500">No feedback yet</p>
          <button onClick={() => setShowQR(true)} className="mt-4 flex items-center gap-2 px-5 py-2.5 bg-green-600 hover:bg-green-500 rounded-2xl font-bold text-sm transition-colors">
            <QrCode className="w-4 h-4" /> Show QR Code
          </button>
        </div>
      ) : (
        <div className="grid lg:grid-cols-5 gap-5">
          {/* List */}
          <div className="lg:col-span-2 space-y-2">
            {items.map((f) => (
              <motion.div key={f.id} initial={{ opacity:0,x:-8 }} animate={{ opacity:1,x:0 }}
                onClick={() => setSelected(f)}
                className={`p-4 rounded-2xl border cursor-pointer transition-all ${selected?.id===f.id?'bg-green-600/15 border-green-500/40':'bg-[#0d1117] border-white/[0.07] hover:border-white/20'}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="font-bold text-white text-sm flex items-center gap-2">
                      {f.is_resident ? <Home className="w-3 h-3 text-purple-400 shrink-0"/> : <Users className="w-3 h-3 text-green-400 shrink-0"/>}
                      {f.is_resident ? 'Resident' : 'Non-Resident'}
                    </div>
                    {f.courses_attended && <div className="text-slate-500 text-xs truncate mt-0.5">{f.courses_attended}</div>}
                    <div className="text-slate-700 text-[10px] mt-1">{f.submitted_at?new Date(f.submitted_at).toLocaleString():''}</div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-[10px] text-slate-600">Reception</div>
                    <div className="font-black text-green-400 text-xs">{ratingLabel(f.reception_rating)}</div>
                    <div className="text-[10px] text-slate-600 mt-0.5">Service</div>
                    <div className="font-black text-teal-400 text-xs">{ratingLabel(f.service_rating)}</div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Detail */}
          <div className="lg:col-span-3">
            {selected ? (
              <motion.div key={selected.id} initial={{ opacity:0,y:8 }} animate={{ opacity:1,y:0 }}
                className="bg-[#0d1117] border border-white/[0.08] rounded-3xl p-6 space-y-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      {selected.is_resident
                        ? <><Home className="w-4 h-4 text-purple-400"/><span className="font-black text-white">Resident Customer</span></>
                        : <><Users className="w-4 h-4 text-green-400"/><span className="font-black text-white">Non-Resident Customer</span></>}
                    </div>
                    {selected.room_number && <p className="text-slate-500 text-xs">Room: {selected.room_number}</p>}
                    {selected.courses_attended && <p className="text-slate-500 text-xs">Courses: {selected.courses_attended}</p>}
                    <p className="text-slate-700 text-xs">{selected.period_from} → {selected.period_to}</p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button onClick={() => exportOneCustomerFeedback(selected)}
                      className="flex items-center gap-1.5 px-3 py-2 bg-green-600/20 hover:bg-green-600/40 border border-green-500/30 rounded-xl text-green-400 text-xs font-bold transition-all">
                      <Download className="w-3.5 h-3.5" /> Excel
                    </button>
                    <button onClick={() => handleDelete(selected.id!)} disabled={deleting===selected.id}
                      className="flex items-center gap-1.5 px-3 py-2 bg-red-600/20 hover:bg-red-600/40 border border-red-500/30 rounded-xl text-red-400 text-xs font-bold transition-all disabled:opacity-50">
                      {deleting===selected.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div>
                  <h4 className="text-[10px] font-black text-slate-600 uppercase tracking-widest mb-3">Section 1 – All Customers</h4>
                  <div className="space-y-2">
                    <RatingBar label="1. Reception at RMI" val={selected.reception_rating} />
                    <RatingBar label="2. Quality of service" val={selected.service_rating} />
                  </div>
                </div>

                {selected.is_resident && (
                  <div>
                    <h4 className="text-[10px] font-black text-slate-600 uppercase tracking-widest mb-3">Section 2 – Resident Customers</h4>
                    <div className="space-y-2">
                      <RatingBar label="3. Room convenience" val={selected.room_rating} />
                      <RatingBar label="4. Catering services" val={selected.catering_rating} />
                    </div>
                  </div>
                )}

                {/* Suggestions */}
                <div className="space-y-2">
                  {[
                    { l:'Reception Suggestion', v: selected.reception_suggestion },
                    { l:'Service Suggestion',   v: selected.service_suggestion   },
                    { l:'Room Suggestion',      v: selected.room_suggestion       },
                    { l:'Catering Suggestion',  v: selected.catering_suggestion   },
                  ].filter(x=>x.v).map(({l,v})=>(
                    <div key={l} className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-3">
                      <div className="text-[10px] font-black text-slate-600 uppercase tracking-widest mb-1">{l}</div>
                      <p className="text-slate-300 text-sm">{v}</p>
                    </div>
                  ))}
                </div>
              </motion.div>
            ) : (
              <div className="flex items-center justify-center h-64 text-slate-700 text-sm">← Select a feedback to view details</div>
            )}
          </div>
        </div>
      )}

      <AnimatePresence>
        {showQR && <QRModal title="Customer Feedback QR" url={customerUrl} onClose={() => setShowQR(false)} />}
      </AnimatePresence>
    </>
  );
}

// ─── FELIX Tab ────────────────────────────────────────────────────────────────
const DEFAULT_TEACHER: FelixUser = { name: 'Teacher', email: '', role: 'teacher' };

function FelixTab({ teacher }: { teacher: FelixUser | null }) {
  const [felixState, setFelixState] = React.useState<FelixSessionState>({
    user: teacher ?? DEFAULT_TEACHER,
    exam: null,
    result: null,
    currentPage: 'felix_teacher_dashboard',
  });

  const setPage = (page: FelixPage) => setFelixState(prev => ({ ...prev, currentPage: page }));

  const handleProctor = (exam: FelixExam) =>
    setFelixState(prev => ({ ...prev, exam, currentPage: 'felix_live_proctor' }));

  const handleExamComplete = (result: FelixResult) =>
    setFelixState(prev => ({ ...prev, result, currentPage: 'felix_result' }));

  const handleReturnHome = () =>
    setFelixState({ user: DEFAULT_TEACHER, exam: null, result: null, currentPage: 'felix_teacher_dashboard' });

  switch (felixState.currentPage) {
    case 'felix_landing':
    case 'felix_teacher_dashboard':
      return <FelixTeacherDashboard teacher={felixState.user ?? DEFAULT_TEACHER} onProctor={handleProctor} />;
    case 'felix_live_proctor':
      return felixState.exam
        ? <FelixLiveProctor exam={felixState.exam} onExit={() => setPage('felix_teacher_dashboard')} />
        : <FelixTeacherDashboard teacher={DEFAULT_TEACHER} onProctor={handleProctor} />;
    case 'felix_exam':
      return felixState.exam && felixState.user
        ? <FelixExamPage exam={felixState.exam} student={felixState.user} onComplete={handleExamComplete} />
        : <FelixTeacherDashboard teacher={DEFAULT_TEACHER} onProctor={handleProctor} />;
    case 'felix_result':
      return felixState.result && felixState.exam
        ? <FelixResultPage result={felixState.result} exam={felixState.exam} onReturnHome={handleReturnHome} />
        : <FelixTeacherDashboard teacher={DEFAULT_TEACHER} onProctor={handleProctor} />;
    default:
      return <FelixTeacherDashboard teacher={DEFAULT_TEACHER} onProctor={handleProctor} />;
  }
}

// ─── MAIN DASHBOARD ───────────────────────────────────────────────────────────
export default function Dashboard({ onLogout }: Props) {
  const [tab, setTab] = useState<Tab>('training');

  const base         = `${window.location.origin}`;
  const trainingUrl  = `${base}/survey-training`;
  const customerUrl  = `${base}/survey-customer`;

  const handleLogout = async () => {
    await teacherSignOut();
    onLogout();
  };

  return (
    <div className="min-h-screen bg-[#06090f] text-white flex flex-col">
      {/* Header */}
      <header className="bg-[#0d1117] border-b border-white/[0.08] px-5 py-3.5 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center">
            <LayoutDashboard className="w-5 h-5" />
          </div>
          <div>
            <div className="font-black text-white text-sm leading-none">Teacher Dashboard</div>
            <div className="text-[9px] text-slate-600 uppercase tracking-widest mt-0.5">RMI · BIG DATA FACTORY</div>
          </div>
        </div>
        <button onClick={handleLogout}
          className="flex items-center gap-1 px-3 py-2 text-slate-500 hover:text-white text-xs font-semibold transition-colors">
          <LogOut className="w-3.5 h-3.5" /> Logout
        </button>
      </header>

      {/* Tab switcher */}
      <div className="bg-[#0d1117] border-b border-white/[0.06] px-5 flex gap-1 pt-3">
        {([
          { id: 'training', label: 'Post-Training Evaluation', icon: ClipboardCheck, color: 'blue'   },
          { id: 'customer', label: 'Customer Feedback',         icon: Star,           color: 'green'  },
          { id: 'felix',    label: 'FELIX Exam',                icon: GraduationCap,  color: 'purple' },
        ] as const).map(({ id, label, icon: Icon, color }) => (
          <button key={id} onClick={() => setTab(id)}
            className={`flex items-center gap-2 px-5 py-3 rounded-t-xl text-sm font-bold transition-all border-b-2 ${
              tab === id
                ? color === 'blue'
                  ? 'text-blue-400 border-blue-400 bg-blue-600/10'
                  : color === 'green'
                  ? 'text-green-400 border-green-400 bg-green-600/10'
                  : 'text-purple-400 border-purple-400 bg-purple-600/10'
                : 'text-slate-600 border-transparent hover:text-slate-300'
            }`}>
            <Icon className="w-4 h-4" /> {label}
          </button>
        ))}
      </div>

      <div className="flex-1 p-5 max-w-7xl mx-auto w-full">
        <AnimatePresence mode="wait">
          {tab === 'training' && (
            <motion.div key="training" initial={{ opacity:0,y:6 }} animate={{ opacity:1,y:0 }} exit={{ opacity:0,y:-6 }} transition={{ duration: 0.2 }}>
              <TrainingTab trainingUrl={trainingUrl} />
            </motion.div>
          )}
          {tab === 'customer' && (
            <motion.div key="customer" initial={{ opacity:0,y:6 }} animate={{ opacity:1,y:0 }} exit={{ opacity:0,y:-6 }} transition={{ duration: 0.2 }}>
              <CustomerTab customerUrl={customerUrl} />
            </motion.div>
          )}
          {tab === 'felix' && (
            <motion.div key="felix" initial={{ opacity:0,y:6 }} animate={{ opacity:1,y:0 }} exit={{ opacity:0,y:-6 }} transition={{ duration: 0.2 }}>
              <FelixTab teacher={null} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}