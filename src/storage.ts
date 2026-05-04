import { createClient } from '@supabase/supabase-js';
import { Evaluation, CustomerFeedback, MODULE_QUESTIONS, TRAINER_QUESTIONS, ratingLabel } from './types';
import ExcelJS from 'exceljs';

// ─── SUPABASE ─────────────────────────────────────────────────────────────────
const SUPABASE_URL      = 'https://zldqetflyjejwoyfiahp.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpsZHFldGZseWplandveWZpYWhwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUzMjc0NzksImV4cCI6MjA5MDkwMzQ3OX0.xCiMPl85bwzvzExtwsAFr_zQeZCbEPmjpKdUV6TNuJ8';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// ─── TEACHER AUTH ─────────────────────────────────────────────────────────────
export const teacherSignIn = async (): Promise<{ error: string | null }> => {
  const { error } = await supabase.auth.signInWithPassword({
    email: 'teacher@rmi.local', password: 'RMIteacher2024!',
  });
  return { error: error?.message ?? null };
};
export const teacherSignOut = async (): Promise<void> => { await supabase.auth.signOut(); };

// ─── DB OPS ───────────────────────────────────────────────────────────────────
const cleanDates = (d: Omit<Evaluation,'id'|'submitted_at'>) => ({
  ...d, evaluation_date: d.evaluation_date||null, delivery_from: d.delivery_from||null, delivery_to: d.delivery_to||null,
});
const cleanFeedbackDates = (d: Omit<CustomerFeedback,'id'|'submitted_at'>) => ({
  ...d, period_from: d.period_from||null, period_to: d.period_to||null,
});

export const submitEvaluation = async (data: Omit<Evaluation,'id'|'submitted_at'>): Promise<{error:string|null}> => {
  const { error } = await anonClient.from('evaluations').insert([cleanDates(data)]);
  return { error: error?.message ?? null };
};
export const fetchEvaluations = async (): Promise<{data:Evaluation[];error:string|null}> => {
  const { data, error } = await supabase.from('evaluations').select('*').order('submitted_at',{ascending:false});
  return { data:(data as Evaluation[])??[], error:error?.message??null };
};
export const deleteEvaluation = async (id:string): Promise<void> => {
  await supabase.from('evaluations').delete().eq('id',id);
};
export const submitCustomerFeedback = async (data: Omit<CustomerFeedback,'id'|'submitted_at'>): Promise<{error:string|null}> => {
  const { error } = await anonClient.from('customer_feedback').insert([cleanFeedbackDates(data)]);
  return { error: error?.message ?? null };
};
export const fetchCustomerFeedback = async (): Promise<{data:CustomerFeedback[];error:string|null}> => {
  const { data, error } = await supabase.from('customer_feedback').select('*').order('submitted_at',{ascending:false});
  return { data:(data as CustomerFeedback[])??[], error:error?.message??null };
};
export const deleteCustomerFeedback = async (id:string): Promise<void> => {
  await supabase.from('customer_feedback').delete().eq('id',id);
};

// ─── EXCEL STYLE HELPERS ──────────────────────────────────────────────────────
const C = {
  navy:    '1E3A8A', white:  'FFFFFF', blueBg:  'DBEAFE', blueText:'1E40AF',
  altRow:  'F8FAFC', border: 'CBD5E1', sub:     'EFF6FF', meta:    'F1F5F9',
  green:   'DCFCE7', amber:  'FEF3C7', red:     'FEE2E2',
  gScoreG: '16A34A', gScoreA:'D97706', gScoreR: 'DC2626',
  tealHdr: '065F46', tealSub:'D1FAE5',
};

const bdr = (col=C.border): Partial<ExcelJS.Border> => ({ style:'thin', color:{argb:'FF'+col} });
const borders = (col=C.border): Partial<ExcelJS.Borders> => ({ top:bdr(col), bottom:bdr(col), left:bdr(col), right:bdr(col) });

const scoreBg = (v:number|null): string => {
  if (!v) return 'FFFFFFFF';
  if (v>=4) return 'FF'+C.green; if (v===3) return 'FF'+C.amber; return 'FF'+C.red;
};
const scoreAvgBg = (v:number|null): string => {
  if (!v) return 'FF'+C.gScoreA;
  if (v>=4) return 'FF'+C.gScoreG; if (v>=3) return 'FF'+C.gScoreA; return 'FF'+C.gScoreR;
};

const styleTitle = (cell:ExcelJS.Cell, text:string, bg=C.navy) => {
  cell.value = text;
  cell.font  = { name:'Arial', bold:true, size:13, color:{argb:'FF'+C.white} };
  cell.fill  = { type:'pattern', pattern:'solid', fgColor:{argb:'FF'+bg} };
  cell.alignment = { horizontal:'center', vertical:'middle' };
};
const styleSub = (cell:ExcelJS.Cell, text:string, bg=C.sub, fg='64748B') => {
  cell.value = text;
  cell.font  = { name:'Arial', size:9, italic:true, color:{argb:'FF'+fg} };
  cell.fill  = { type:'pattern', pattern:'solid', fgColor:{argb:'FF'+bg} };
  cell.alignment = { horizontal:'center', vertical:'middle' };
};
const styleSecHdr = (cell:ExcelJS.Cell, text:string, bg=C.navy) => {
  cell.value = text;
  cell.font  = { name:'Arial', bold:true, size:11, color:{argb:'FFFFFFFF'} };
  cell.fill  = { type:'pattern', pattern:'solid', fgColor:{argb:'FF'+bg} };
  cell.alignment = { horizontal:'center', vertical:'middle' };
  ws_noop(cell);
};
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const ws_noop = (_:ExcelJS.Cell) => {};

const styleColHdr = (cell:ExcelJS.Cell, center=false) => {
  cell.font  = { name:'Arial', bold:true, size:9, color:{argb:'FF'+C.white} };
  cell.fill  = { type:'pattern', pattern:'solid', fgColor:{argb:'FF'+C.navy} };
  cell.alignment = { horizontal:center?'center':'left', vertical:'middle', wrapText:true };
  cell.border = borders(C.navy);
};
const styleLbl = (cell:ExcelJS.Cell) => {
  cell.font  = { name:'Arial', bold:true, size:9, color:{argb:'FF'+C.blueText} };
  cell.fill  = { type:'pattern', pattern:'solid', fgColor:{argb:'FF'+C.meta} };
  cell.alignment = { horizontal:'left', vertical:'middle' };
  cell.border = borders();
};
const styleVal = (cell:ExcelJS.Cell, center=false, bold=false, bgArgb='FFFFFFFF') => {
  cell.font  = { name:'Arial', size:9, bold };
  cell.fill  = { type:'pattern', pattern:'solid', fgColor:{argb:bgArgb} };
  cell.alignment = { horizontal:center?'center':'left', vertical:'middle', wrapText:true };
  cell.border = borders();
};

const avgNum = (vals:(number|null)[]):number|null => {
  const v=vals.filter((x):x is number=>x!==null);
  return v.length?v.reduce((a,b)=>a+b,0)/v.length:null;
};
const fmtAvg = (n:number|null):string => n!==null?n.toFixed(2):'N/A';

const dlWorkbook = async (wb:ExcelJS.Workbook, name:string) => {
  const buf = await wb.xlsx.writeBuffer();
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([buf],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}));
  a.download = name; a.click();
};

// ─── buildSummarySheet — shared between single + all eval exports ─────────────
function buildSummarySheet(
  wb: ExcelJS.Workbook,
  list: Evaluation[],
  label: string,
) {
  const ws = wb.addWorksheet('Summary');

  // Title + sub
  ws.mergeCells('A1:C1');
  styleTitle(ws.getCell('A1'), 'POST-TRAINING EVALUATION — SUMMARY REPORT');
  ws.getRow(1).height = 30;
  ws.mergeCells('A2:C2');
  styleSub(ws.getCell('A2'), 'Prepared by BIG DATA FACTORY · Rwanda Management Institute');
  ws.getRow(2).height = 16;

  // Meta
  const allMods     = [...new Set(list.map(e=>e.module_title))].join(', ') || label;
  const allTrainers = [...new Set(list.map(e=>e.trainer_name))].join(', ');
  const metaRows = [
    ['Module(s)',          allMods],
    ['Trainer(s)',         allTrainers],
    ['Total Submissions',  list.length],
    ['Report Generated',   new Date().toLocaleString()],
  ];
  let r=4;
  metaRows.forEach(([l,v])=>{
    ws.mergeCells(`B${r}:C${r}`);
    styleLbl(ws.getCell(`A${r}`)); ws.getCell(`A${r}`).value=l;
    styleVal(ws.getCell(`B${r}`)); ws.getCell(`B${r}`).value=v;
    ws.getRow(r).height=18; r++;
  });
  r++;

  // Section header
  ws.mergeCells(`A${r}:C${r}`);
  styleSecHdr(ws.getCell(`A${r}`),'SCORE AVERAGES PER QUESTION');
  ws.getRow(r).height=22; r++;

  // Col headers
  ['Question ID','Question','Average Score (1–5)'].forEach((h,i)=>{
    styleColHdr(ws.getCell(r,i+1), i===2);
    ws.getCell(r,i+1).value=h;
  });
  ws.getRow(r).height=20; r++;

  // Per question averages
  const allQ = [
    ...MODULE_QUESTIONS.map((q,i)=>({id:`MQ${i+1}`,label:q.label,key:q.key})),
    ...TRAINER_QUESTIONS.map((q,i)=>({id:`TQ${i+1}`,label:q.label,key:q.key})),
  ];
  allQ.forEach(({id,label,key},idx)=>{
    const vals=list.map(e=>e[key as keyof Evaluation] as number|null).filter((v):v is number=>v!==null);
    const avg=vals.length?vals.reduce((a,b)=>a+b,0)/vals.length:null;
    ws.getCell(r,1).value=id;   styleVal(ws.getCell(r,1),true,false,'FF'+C.altRow);
    ws.getCell(r,2).value=label; styleVal(ws.getCell(r,2));
    ws.getCell(r,3).value=avg!==null?+fmtAvg(avg):'N/A'; styleVal(ws.getCell(r,3),true,true,scoreBg(avg!==null?Math.round(avg):null));
    ws.getRow(r).height=18; r++;
    void idx;
  });
  r++;

  // Overall averages
  const mAvg=avgNum(list.flatMap(e=>[e.module_q1,e.module_q2,e.module_q3,e.module_q4,e.module_q5]));
  const tAvg=avgNum(list.flatMap(e=>[e.trainer_q1,e.trainer_q2,e.trainer_q3,e.trainer_q4,e.trainer_q5,e.trainer_q6,e.trainer_q7,e.trainer_q8]));
  [['MODULE SECTION AVERAGE',mAvg],['TEACHER SECTION AVERAGE',tAvg]].forEach(([lbl,score])=>{
    ws.mergeCells(`A${r}:B${r}`);
    const lc=ws.getCell(`A${r}`); const vc=ws.getCell(`C${r}`);
    lc.value=lbl; lc.font={name:'Arial',bold:true,size:10,color:{argb:'FFFFFFFF'}};
    lc.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FF'+C.navy}};
    lc.alignment={horizontal:'left',vertical:'middle'}; lc.border=borders(C.navy);
    const s=score as number|null;
    vc.value=s!==null?+fmtAvg(s):'N/A'; vc.font={name:'Arial',bold:true,size:11,color:{argb:'FFFFFFFF'}};
    vc.fill={type:'pattern',pattern:'solid',fgColor:{argb:scoreAvgBg(s)}};
    vc.alignment={horizontal:'center',vertical:'middle'}; vc.border=borders(C.navy);
    ws.getRow(r).height=24; r++;
  });

  ws.getColumn(1).width=28; ws.getColumn(2).width=55; ws.getColumn(3).width=22;
  ws.views=[{state:'frozen',ySplit:3}];
}

// ─── EXPORT: Single Training Evaluation ──────────────────────────────────────
export const exportOneEvaluation = async (e:Evaluation): Promise<void> => {
  const wb = new ExcelJS.Workbook(); wb.creator='BIG DATA FACTORY';

  // All Submissions sheet (single row)
  buildAllSubmissionsSheet(wb,[e]);

  // Summary sheet
  buildSummarySheet(wb,[e],e.module_title);

  await dlWorkbook(wb, `RMI_TrainingEval_${(e.trainer_name||'Unknown').replace(/\s+/g,'_')}_${(e.id??'X').slice(0,6)}.xlsx`);
};

// ─── EXPORT: All Training Evaluations ────────────────────────────────────────
export const exportAllEvaluations = async (list:Evaluation[]): Promise<void> => {
  const wb = new ExcelJS.Workbook(); wb.creator='BIG DATA FACTORY';
  buildAllSubmissionsSheet(wb, list);
  buildSummarySheet(wb, list, 'All Modules');
  await dlWorkbook(wb, `RMI_AllTrainingEvals_${Date.now()}.xlsx`);
};

function buildAllSubmissionsSheet(wb:ExcelJS.Workbook, list:Evaluation[]) {
  const ws = wb.addWorksheet('All Submissions');

  const COLS = 29; // A–AC
  const colLetter = (n:number) => {
    let s=''; while(n>0){s=String.fromCharCode(65+(n-1)%26)+s;n=Math.floor((n-1)/26);}return s;
  };

  ws.mergeCells(`A1:${colLetter(COLS)}1`);
  styleTitle(ws.getCell('A1'),'POST-TRAINING EVALUATION — ALL SUBMISSIONS');
  ws.getRow(1).height=28;

  ws.mergeCells(`A2:${colLetter(COLS)}2`);
  styleSub(ws.getCell('A2'),`Prepared by BIG DATA FACTORY · ${list.length} submission${list.length!==1?'s':''} · Generated ${new Date().toLocaleString()}`);
  ws.getRow(2).height=16;

  const headers = [
    '#','Student Name','Email','Phone','Session Code',
    'Module Name','Teacher','Period From','Period To','Eval Date','Submitted At',
    ...MODULE_QUESTIONS.map((_,i)=>`MQ${i+1} — ${MODULE_QUESTIONS[i].label}`),
    ...TRAINER_QUESTIONS.map((_,i)=>`TQ${i+1} — ${TRAINER_QUESTIONS[i].label}`),
    'Module Average (1–5)','Teacher Average (1–5)',
    'Q9 — General Comments','Q10 — Job Challenges','Q11 — Suggested Modules',
  ];

  const hr=ws.getRow(3); hr.height=50;
  headers.forEach((h,i)=>{ const c=hr.getCell(i+1); c.value=h; styleColHdr(c,i===0); });

  list.forEach((e,idx)=>{
    const mAvg=avgNum([e.module_q1,e.module_q2,e.module_q3,e.module_q4,e.module_q5]);
    const tAvg=avgNum([e.trainer_q1,e.trainer_q2,e.trainer_q3,e.trainer_q4,e.trainer_q5,e.trainer_q6,e.trainer_q7,e.trainer_q8]);
    const rowBg=idx%2===1?'FF'+C.altRow:'FFFFFFFF';

    const vals=[
      idx+1,
      (e as any).student_name||'',(e as any).email||'',(e as any).phone||'',(e as any).session_code||'',
      e.module_title,e.trainer_name,e.delivery_from??'',e.delivery_to??'',e.evaluation_date??'',
      e.submitted_at?new Date(e.submitted_at).toLocaleString():'',
      e.module_q1,e.module_q2,e.module_q3,e.module_q4,e.module_q5,
      e.trainer_q1,e.trainer_q2,e.trainer_q3,e.trainer_q4,e.trainer_q5,e.trainer_q6,e.trainer_q7,e.trainer_q8,
      mAvg!==null?+fmtAvg(mAvg):'',tAvg!==null?+fmtAvg(tAvg):'',
      e.comments,e.challenges,e.suggestions,
    ];

    const dataRow=ws.addRow(vals); dataRow.height=18;
    dataRow.eachCell({includeEmpty:true},(cell,col)=>{
      const isScore=col>=12&&col<=26;
      const v=cell.value as number|null;
      const bg=isScore&&typeof v==='number'?scoreBg(v):rowBg;
      const isAvg=col===25||col===26;
      styleVal(cell,col===1||isScore,isAvg,bg);
    });
  });

  const widths=[4,20,24,14,13,20,20,12,12,12,20,...Array(13).fill(11),14,14,30,30,30];
  widths.forEach((w,i)=>ws.getColumn(i+1).width=w);
  ws.views=[{state:'frozen',ySplit:3,xSplit:1}];
}

// ─── EXPORT: Single Customer Feedback ────────────────────────────────────────
export const exportOneCustomerFeedback = async (f:CustomerFeedback): Promise<void> => {
  const wb = new ExcelJS.Workbook(); wb.creator='BIG DATA FACTORY';
  const ws = wb.addWorksheet('Customer Feedback');

  ws.mergeCells('A1:C1');
  styleTitle(ws.getCell('A1'),'RMI CUSTOMER FEEDBACK REPORT',C.tealHdr);
  ws.getRow(1).height=30;
  ws.mergeCells('A2:C2');
  styleSub(ws.getCell('A2'),'Prepared by BIG DATA FACTORY · Rwanda Management Institute',C.tealSub);
  ws.getRow(2).height=16;

  const meta=[
    ['Customer Type',    f.is_resident?'Resident':'Non-Resident'],
    ['Room Number',      f.room_number||'–'],
    ['Period',           `${f.period_from||'–'} to ${f.period_to||'–'}`],
    ['Courses Attended', f.courses_attended||'–'],
    ['Submitted At',     f.submitted_at?new Date(f.submitted_at).toLocaleString():''],
    ['Report Generated', new Date().toLocaleString()],
  ];
  let r=4;
  meta.forEach(([l,v])=>{
    ws.mergeCells(`B${r}:C${r}`);
    styleLbl(ws.getCell(`A${r}`)); ws.getCell(`A${r}`).value=l;
    styleVal(ws.getCell(`B${r}`)); ws.getCell(`B${r}`).value=v;
    ws.getRow(r).height=18; r++;
  });
  r++;

  const addRatingSection = (title:string,rows:[string,number|null,string][]) => {
    ws.mergeCells(`A${r}:C${r}`);
    styleSecHdr(ws.getCell(`A${r}`),title,C.tealHdr);
    ws.getRow(r).height=22; r++;
    ['Question','Rating','Suggestion'].forEach((h,i)=>{ styleColHdr(ws.getCell(r,i+1),i===1); ws.getCell(r,i+1).value=h; });
    ws.getRow(r).height=20; r++;
    rows.forEach(([q,rating,suggestion])=>{
      styleVal(ws.getCell(r,1)); ws.getCell(r,1).value=q;
      styleVal(ws.getCell(r,2),true,true,scoreBg(rating)); ws.getCell(r,2).value=ratingLabel(rating);
      styleVal(ws.getCell(r,3)); ws.getCell(r,3).value=suggestion;
      ws.getRow(r).height=20; r++;
    });
    r++;
  };

  addRatingSection('SECTION 1 — ALL CUSTOMERS',[
    ['1. Rate how you were received in RMI',        f.reception_rating,f.reception_suggestion],
    ['2. How satisfied with quality of service?',   f.service_rating,  f.service_suggestion],
  ]);

  if (f.is_resident) {
    addRatingSection('SECTION 2 — RESIDENT CUSTOMERS',[
      ['3. How convenient was your room?',           f.room_rating,     f.room_suggestion],
      ['4. How satisfied with catering services?',   f.catering_rating, f.catering_suggestion],
    ]);
  }

  ws.getColumn(1).width=45; ws.getColumn(2).width=18; ws.getColumn(3).width=40;
  await dlWorkbook(wb,`RMI_CustomerFeedback_${(f.id??'X').slice(0,6)}.xlsx`);
};

// ─── EXPORT: All Customer Feedback ───────────────────────────────────────────
export const exportAllCustomerFeedback = async (list:CustomerFeedback[]): Promise<void> => {
  const wb = new ExcelJS.Workbook(); wb.creator='BIG DATA FACTORY';
  const ws = wb.addWorksheet('All Feedback');

  const COLS=14;
  ws.mergeCells(`A1:N1`);
  styleTitle(ws.getCell('A1'),'RMI CUSTOMER FEEDBACK — ALL RESPONSES',C.tealHdr);
  ws.getRow(1).height=28;
  ws.mergeCells('A2:N2');
  styleSub(ws.getCell('A2'),`Prepared by BIG DATA FACTORY · ${list.length} responses · Generated ${new Date().toLocaleString()}`,C.tealSub);
  ws.getRow(2).height=16;

  const headers=['#','Type','Room','Period From','Period To','Courses',
    'Q1 Reception','Q1 Suggestion','Q2 Service','Q2 Suggestion',
    'Q3 Room','Q3 Suggestion','Q4 Catering','Q4 Suggestion'];
  const hr=ws.getRow(3); hr.height=30;
  headers.forEach((h,i)=>{styleColHdr(hr.getCell(i+1),i===0||i===6||i===8||i===10||i===12); hr.getCell(i+1).value=h;});

  list.forEach((f,idx)=>{
    const bg=idx%2===1?'FF'+C.altRow:'FFFFFFFF';
    const row=ws.addRow([
      idx+1, f.is_resident?'Resident':'Non-Resident',
      f.room_number||'–', f.period_from||'–', f.period_to||'–', f.courses_attended||'–',
      ratingLabel(f.reception_rating), f.reception_suggestion,
      ratingLabel(f.service_rating),   f.service_suggestion,
      f.is_resident?ratingLabel(f.room_rating):'N/A',     f.is_resident?f.room_suggestion:'',
      f.is_resident?ratingLabel(f.catering_rating):'N/A', f.is_resident?f.catering_suggestion:'',
    ]);
    row.height=18;
    row.eachCell({includeEmpty:true},(cell,col)=>styleVal(cell,col===1,false,bg));
  });

  [4,14,8,12,12,22,14,30,14,30,14,30,14,30].forEach((w,i)=>ws.getColumn(i+1).width=w);
  ws.views=[{state:'frozen',ySplit:3,xSplit:1}];
  void COLS;
  await dlWorkbook(wb,`RMI_AllCustomerFeedback_${Date.now()}.xlsx`);
};