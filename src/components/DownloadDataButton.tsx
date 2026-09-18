import React, { useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import { downloadEventData, ExportFilters, ExportFormat } from '../lib/exportData';

export default function DownloadDataButton({ eventId, filters }: { eventId: number; filters?: ExportFilters }) {
  const [busy, setBusy] = useState<ExportFormat | null>(null);

  const run = async (format: ExportFormat) => {
    setBusy(format);
    try {
      await downloadEventData(eventId, format, filters);
    } catch (e: any) {
      alert(e?.message || 'Download failed');
    } finally {
      setBusy(null);
    }
  };

  const btn = 'inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all disabled:opacity-50';
  return (
    <div className="inline-flex items-center gap-2">
      <button type="button" onClick={() => run('xlsx')} disabled={!!busy}
        className={`${btn} bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border-emerald-500/30`}
        title="Students + health records, two sheets">
        {busy === 'xlsx' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
        <span>Download Excel</span>
      </button>
      <button type="button" onClick={() => run('csv')} disabled={!!busy}
        className={`${btn} bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700`}
        title="Health records only, CSV">
        {busy === 'csv' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
        <span>CSV</span>
      </button>
    </div>
  );
}
