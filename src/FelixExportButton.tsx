import { useState } from 'react';
import { Download } from 'lucide-react';
import { getFelixResults } from './felix_storage';   // adjust path if needed
import { FelixResult } from './types';

interface Props {
  examId: string;
  examName?: string;
}

/**
 * Drop this button anywhere in your teacher/proctor view.
 * It fetches all FelixResult rows for the given exam and
 * downloads them as a UTF-8 CSV file.
 *
 * CSV columns:
 *   Student Name, Student ID, Score (%), Correct Answers,
 *   Total Questions, Violations, Submitted At
 */
export default function FelixExportButton({ examId, examName = 'exam' }: Props) {
  const [loading, setLoading] = useState(false);

  const handleExport = async () => {
    setLoading(true);
    try {
      // ── 1. Fetch results ─────────────────────────────────────────────────
      const { results }: { results: FelixResult[] } = await getFelixResults(examId);

      if (!results || results.length === 0) {
        alert('No results found for this exam yet.');
        setLoading(false);
        return;
      }

      // ── 2. Build CSV rows ────────────────────────────────────────────────
      const header = [
        'Student Name',
        'Student ID',
        'Score (%)',
        'Correct Answers',
        'Total Questions',
        'Violations',
        'Submitted At',
      ];

      const escape = (v: unknown) => {
        const s = String(v ?? '');
        // wrap in quotes if it contains comma, quote, or newline
        return s.match(/[",\n]/) ? `"${s.replace(/"/g, '""')}"` : s;
      };

      const rows = results.map((r: FelixResult) => [
        escape(r.student_name),
        escape(r.student_id),
        escape(
          r.total_questions > 0
            ? ((r.score / r.total_questions) * 100).toFixed(1)
            : '0.0'
        ),
        escape(r.score),
        escape(r.total_questions),
        escape(r.violations_count ?? 0),
        escape(r.submitted_at ? new Date(r.submitted_at).toLocaleString() : ''),
      ]);

      const csv = [header.join(','), ...rows.map(r => r.join(','))].join('\n');

      // ── 3. Trigger download ──────────────────────────────────────────────
      const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      const safe = examName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
      a.href     = url;
      a.download = `felix_results_${safe}_${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export failed:', err);
      alert('Export failed — check the console for details.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleExport}
      disabled={loading}
      className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500
                 disabled:opacity-50 text-white rounded-xl text-sm font-bold transition-colors"
    >
      {loading
        ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        : <Download className="w-4 h-4" />
      }
      {loading ? 'Exporting…' : 'Export CSV'}
    </button>
  );
}