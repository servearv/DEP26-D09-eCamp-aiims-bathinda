import React, { useState, useEffect, useRef } from 'react';
import * as XLSX from 'xlsx';
import { X, Check, UserPlus, Upload, Download, FileText, AlertTriangle } from 'lucide-react';

// ── Helpers ──
function calcAge(dob: string): number | null {
  if (!dob) return null;
  const birth = new Date(dob);
  if (isNaN(birth.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

/** Normalize dates: Handles DD/MM/YYYY and MM/DD/YYYY smartly */
function normalizeDateStr(raw: string): string {
  if (!raw) return raw;
  raw = raw.trim();
  for (const sep of ['-', '/']) {
    const parts = raw.split(sep);
    if (parts.length === 3) {
      const [a, b, c] = parts;
      if (a.length <= 2 && b.length <= 2 && c.length === 4) {
        const numA = parseInt(a, 10);
        const numB = parseInt(b, 10);
        // If middle part > 12, it MUST be the day -> MM/DD/YYYY format
        if (numB > 12) {
          return `${c}-${a.padStart(2, '0')}-${b.padStart(2, '0')}`;
        }
        // Otherwise assume DD/MM/YYYY format as standard
        return `${c}-${b.padStart(2, '0')}-${a.padStart(2, '0')}`;
      }
    }
  }
  return raw;
}

const CLASSES = ['', 'Nursery', 'LKG', 'UKG', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];
const SECTIONS = ['', 'A', 'B', 'C', 'D', 'E'];
const BLOOD_GROUPS = ['', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

// ════════════════════════════════════════
// ██ ADD STUDENT MODAL
// ════════════════════════════════════════
export function AddStudentModal({ onClose, onCreated, userId, eventId }: {
  onClose: () => void; onCreated: () => void; userId: string; eventId: number;
}) {
  const [f, setF] = useState({ name: '', age: '', dob: '', gender: '', student_class: '', section: '', blood_group: '', father_name: '', phone: '', registration_number: '' });
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const nameRef = useRef<HTMLInputElement>(null);
  useEffect(() => { nameRef.current?.focus(); }, []);

  const upd = (k: string, v: string) => {
    setF(p => ({ ...p, [k]: v }));
    setErrors(p => ({ ...p, [k]: '' }));
    // Auto-calc age from DOB
    if (k === 'dob' && v) {
      const age = calcAge(v);
      if (age !== null) setF(p => ({ ...p, dob: v, age: String(age) }));
    }
  };

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!f.name.trim()) e.name = 'Name is required';
    if (!f.gender) e.gender = 'Sex is required';
    if (!f.registration_number.trim()) e.registration_number = 'Registration number is required';
    if (f.phone?.trim() && !/^\d{10}$/.test(f.phone.replace(/\D/g, ''))) e.phone = 'Valid 10-digit phone is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    try {
      const searchRes = await fetch(`/api/students/search?event_id=${eventId}&query=${encodeURIComponent(f.registration_number.trim())}`);
      const searchData = await searchRes.json();
      if (searchData.some((s: any) => s.registration_number === f.registration_number.trim())) {
        setErrors(p => ({ ...p, registration_number: 'Registration number already exists in this camp' }));
        setSaving(false);
        return;
      }

      const res = await fetch('/api/students', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...f, age: f.age ? parseInt(f.age) : null, user_id: userId, event_id: eventId, added_by: userId }),
      });
      const data = await res.json();
      if (data.success) onCreated();
    } catch { alert('Error creating student'); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-lg p-6 shadow-2xl relative" onClick={e => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
        <h3 className="text-xl font-bold text-white mb-5 flex items-center"><UserPlus className="w-5 h-5 mr-2 text-violet-400" /> Add New Student</h3>
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-1.5">Student Name *</label>
              <input ref={nameRef} value={f.name} onChange={e => upd('name', e.target.value)} required
                className={`w-full bg-slate-950 border rounded-xl px-4 py-3 text-white text-lg focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 placeholder-slate-600 ${errors.name ? 'border-red-500/50' : 'border-slate-800'}`} placeholder="Full name" />
              {errors.name && <p className="text-red-400 text-xs mt-1">{errors.name}</p>}
            </div>

            {/* Sex */}
            <div>
              <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-1.5">Sex *</label>
              <div className="flex space-x-3 mt-1">
                {[{ v: 'M', label: 'Male' }, { v: 'F', label: 'Female' }].map(opt => (
                  <button key={opt.v} type="button" onClick={() => upd('gender', opt.v)}
                    className={`flex-1 py-2.5 rounded-xl font-bold text-sm transition-all border flex items-center justify-center space-x-2 ${
                      f.gender === opt.v
                        ? 'bg-violet-500/20 text-violet-400 border-violet-500/30'
                        : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-600'
                    }`}>
                    {f.gender === opt.v && <Check className="w-3.5 h-3.5" />}
                    <span>{opt.label}</span>
                  </button>
                ))}
              </div>
              {errors.gender && <p className="text-red-400 text-xs mt-1">{errors.gender}</p>}
            </div>

            {/* DOB */}
            <div>
              <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-1.5">Date of Birth *</label>
              <input type="date" value={f.dob} onChange={e => upd('dob', e.target.value)}
                className={`w-full bg-slate-950 border rounded-xl px-3 py-2.5 text-white text-sm focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 transition-all ${errors.dob ? 'border-red-500/50' : 'border-slate-800'}`} />
              {errors.dob && <p className="text-red-400 text-xs mt-1">{errors.dob}</p>}
            </div>

            {/* Class */}
            <div>
              <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-1.5">Class</label>
              <select value={f.student_class} onChange={e => upd('student_class', e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white text-sm focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 transition-all">
                {CLASSES.map(o => <option key={o} value={o}>{o || '— Select —'}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-1.5">Section</label>
              <select value={f.section} onChange={e => upd('section', e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white text-sm focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 transition-all">
                {SECTIONS.map(o => <option key={o} value={o}>{o || '— Select —'}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-1.5">Blood Group</label>
              <select value={f.blood_group} onChange={e => upd('blood_group', e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white text-sm focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 transition-all">
                {BLOOD_GROUPS.map(o => <option key={o} value={o}>{o || '— Select —'}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-1.5">Father's Name</label>
              <input value={f.father_name} onChange={e => upd('father_name', e.target.value)} placeholder="Optional"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white text-sm focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 transition-all placeholder-slate-600" />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-1.5">Registration Number *</label>
              <input value={f.registration_number} onChange={e => upd('registration_number', e.target.value)} placeholder="School reg. no"
                className={`w-full bg-slate-950 border rounded-xl px-3 py-2.5 text-white text-sm focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 transition-all placeholder-slate-600 ${errors.registration_number ? 'border-red-500/50' : 'border-slate-800'}`} />
              {errors.registration_number && <p className="text-red-400 text-xs mt-1">{errors.registration_number}</p>}
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-1.5">Phone</label>
              <input value={f.phone} onChange={e => upd('phone', e.target.value)} placeholder="Optional" type="tel"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white text-sm focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 transition-all placeholder-slate-600" />
            </div>
          </div>
          <button type="submit" disabled={saving}
            className="w-full bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-400 hover:to-purple-500 text-white font-bold py-3.5 rounded-xl shadow-lg transition-all disabled:opacity-50 mt-2">
            {saving ? 'Saving...' : 'Add Student'}
          </button>
        </form>
      </div>
    </div>
  );
}

// ════════════════════════════════════════
// ██ STUDENT UPLOAD PANEL (EXCEL/CSV)
// ════════════════════════════════════════
interface ParsedRow {
  data: Record<string, string>;
  valid: boolean;
  errors: string[];
}

export function CSVUploadPanel({ eventId, userId, onClose, onDone }: {
  eventId: number; userId: string; onClose: () => void; onDone: () => void;
}) {
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [result, setResult] = useState<{ inserted: any[]; errors: any[] } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const downloadTemplate = () => {
    window.open('/api/students/csv-template', '_blank');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadError(null);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws, { defval: '' });
        
        if (data.length > 0) {
          const normalizedData = data.map((row: any) => {
            const newRow: any = {};
            for (const key of Object.keys(row)) {
              newRow[key.trim().toLowerCase()] = row[key];
            }
            return newRow;
          });

          const firstRow = normalizedData[0];
          if (firstRow.name === undefined && firstRow.gender === undefined && firstRow.dob === undefined) {
             const detected = Object.keys(firstRow).join(', ') || 'None';
             setUploadError(`Invalid columns detected. Expected 'name', 'dob', etc. \n\nFound: [${detected}]. \n\nPlease upload a valid Excel or CSV file with appropriate headers.`);
             setParsedRows([]);
             return;
          }

          const rows: ParsedRow[] = normalizedData.map((row: any) => {
            const errors: string[] = [];
            if (!row.name?.toString().trim()) errors.push('Name is required');
            if (row.gender && !['M', 'F', 'm', 'f'].includes(row.gender.toString().trim())) errors.push('Gender must be M or F');
            if (row.dob) {
              let dobStr = row.dob.toString();
              if (typeof row.dob === 'number') {
                const d = new Date((row.dob - 25569) * 86400 * 1000);
                dobStr = d.toISOString().split('T')[0];
              }
              const normalized = normalizeDateStr(dobStr);
              row.dob = normalized;  
              const d = new Date(normalized);
              if (isNaN(d.getTime())) errors.push('Invalid DOB format (use DD-MM-YYYY or YYYY-MM-DD)');
            }
            if (row.phone?.toString().trim()) {
              if (!/^\d{10}$/.test(row.phone.toString().replace(/\D/g, ''))) errors.push('Invalid 10-digit phone number');
            }
            return { data: row, valid: errors.length === 0, errors };
          });
          setParsedRows(rows);
          setResult(null);
        } else {
           setUploadError('The uploaded file is empty.');
           setParsedRows([]);
        }
      } catch (err) {
        console.error(err);
        setUploadError('Failed to parse file. Please ensure it is a valid .xlsx, .xls or .csv file.');
        setParsedRows([]);
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleUpload = async () => {
    const validRows = parsedRows.filter(r => r.valid).map(r => r.data);
    if (validRows.length === 0) return;

    setUploading(true);
    try {
      const res = await fetch('/api/students/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ students: validRows, event_id: eventId, added_by: userId }),
      });
      const data = await res.json();
      setResult({ inserted: data.inserted, errors: data.errors });
    } catch { alert('Upload failed'); }
    finally { setUploading(false); }
  };

  const validCount = parsedRows.filter(r => r.valid).length;
  const errorCount = parsedRows.filter(r => !r.valid).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-3xl p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
        <h3 className="text-xl font-bold text-white mb-5 flex items-center"><Upload className="w-5 h-5 mr-2 text-violet-400" /> Bulk Student Upload</h3>

        {/* Step 1: Template + File */}
        <div className="space-y-4">
          <div className="flex space-x-3">
            <button onClick={downloadTemplate}
              className="flex items-center space-x-2 bg-slate-800 hover:bg-slate-700 text-violet-400 border border-slate-700 px-4 py-2.5 rounded-xl text-sm font-medium transition-all">
              <Download className="w-4 h-4" /><span>Download Template</span>
            </button>
            <button onClick={() => fileRef.current?.click()}
              className="flex items-center space-x-2 bg-violet-500/20 hover:bg-violet-500/30 text-violet-400 border border-violet-500/30 px-4 py-2.5 rounded-xl text-sm font-medium transition-all">
              <FileText className="w-4 h-4" /><span>Choose Excel File</span>
            </button>
            <input ref={fileRef} type="file" accept=".xlsx, .xls, .csv" onChange={handleFileChange} className="hidden" />
          </div>

          {uploadError && (
            <div className="bg-red-500/10 border border-red-500/30 p-4 rounded-xl mt-4">
              <div className="flex items-start space-x-3">
                <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-red-300 font-medium whitespace-pre-wrap">{uploadError}</div>
              </div>
            </div>
          )}

          {/* Dry Run Preview */}
          {parsedRows.length > 0 && !result && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <span className="text-sm text-slate-400">Preview: {parsedRows.length} rows</span>
                  <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2.5 py-0.5 rounded-full text-xs font-bold">{validCount} valid</span>
                  {errorCount > 0 && <span className="bg-red-500/20 text-red-400 border border-red-500/30 px-2.5 py-0.5 rounded-full text-xs font-bold">{errorCount} errors</span>}
                </div>
                <button onClick={handleUpload} disabled={uploading || validCount === 0}
                  className="bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-400 hover:to-purple-500 text-white px-5 py-2 rounded-xl font-bold text-sm transition-all disabled:opacity-50 flex items-center space-x-2">
                  <Upload className="w-4 h-4" /><span>{uploading ? 'Uploading...' : `Upload ${validCount} Students`}</span>
                </button>
              </div>

              <div className="overflow-x-auto max-h-60 overflow-y-auto rounded-xl border border-slate-800">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950 text-slate-500 sticky top-0">
                    <tr>
                      <th className="px-3 py-2 font-medium">#</th>
                      <th className="px-3 py-2 font-medium">Name</th>
                      <th className="px-3 py-2 font-medium">Gender</th>
                      <th className="px-3 py-2 font-medium">DOB</th>
                      <th className="px-3 py-2 font-medium">Class</th>
                      <th className="px-3 py-2 font-medium">Phone</th>
                      <th className="px-3 py-2 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50">
                    {parsedRows.map((row, i) => (
                      <tr key={i} className={row.valid ? 'bg-emerald-500/5' : 'bg-red-500/5'}>
                        <td className="px-3 py-2 text-slate-400">{i + 1}</td>
                        <td className="px-3 py-2 text-white font-medium">{row.data.name || '—'}</td>
                        <td className="px-3 py-2 text-slate-300">{row.data.gender || '—'}</td>
                        <td className="px-3 py-2 text-slate-300">{row.data.dob || '—'}</td>
                        <td className="px-3 py-2 text-slate-300">{row.data.student_class || '—'}</td>
                        <td className="px-3 py-2 text-slate-300">{row.data.phone || '—'}</td>
                        <td className="px-3 py-2">
                          {row.valid ? (
                            <span className="text-emerald-400 font-bold">✓ Valid</span>
                          ) : (
                            <span className="text-red-400 font-bold" title={row.errors.join('; ')}>✗ {row.errors.join(', ')}</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Result */}
          {result && (
            <div className="space-y-3">
              <div className="bg-emerald-500/10 border border-emerald-500/30 p-4 rounded-xl">
                <p className="text-emerald-400 font-bold text-sm"><Check className="w-4 h-4 inline mr-1" /> {result.inserted.length} students uploaded successfully!</p>
              </div>
              {result.errors.length > 0 && (
                <div className="bg-red-500/10 border border-red-500/30 p-4 rounded-xl">
                  <p className="text-red-400 font-bold text-sm mb-2"><AlertTriangle className="w-4 h-4 inline mr-1" /> {result.errors.length} rows failed:</p>
                  <div className="space-y-1">
                    {result.errors.map((err: any, i: number) => (
                      <p key={i} className="text-red-300 text-xs">Row {err.row}: {err.errors.map((e: any) => `${e.column}: ${e.reason}`).join(', ')}</p>
                    ))}
                  </div>
                </div>
              )}
              <button onClick={onDone}
                className="w-full bg-gradient-to-r from-violet-500 to-purple-600 text-white font-bold py-3 rounded-xl transition-all">
                Done
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
