// Shared printing for department slips.
// One slip = one department's examination of one student, on one A4 page,
// with that department's prescription AND referral (if any) together.
import { specialtyLabel } from '../constants/specialties';
import { formatBP } from './vitals';

export interface SlipStudent {
  name?: string; age?: number | string; gender?: string;
  student_class?: string; section?: string; father_name?: string;
  phone?: string; registration_number?: string;
}

export interface SlipRecord {
  category: string;
  doctor_id?: string;
  doctor_name?: string;
  timestamp?: string;
  parsed_data: any;
}

export interface Slip {
  student: SlipStudent;
  generalInfo?: { height?: string; weight?: string; bmi?: string } | null;
  record: SlipRecord;
  campName?: string;
}

const esc = (v: unknown): string =>
  String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const nz = (v: unknown) => (v === null || v === undefined || String(v).trim() === '' ? '—' : esc(v));

const hasText = (v: unknown) => typeof v === 'string' ? v.trim() !== '' : v != null && v !== '';

function hasRx(d: any): boolean {
  return hasText(d.clinicalFindings) || hasText(d.diagnosis) || hasText(d.advice) ||
    (Array.isArray(d.medicines) && d.medicines.some((m: any) => hasText(m?.name)));
}

function hasReferral(d: any): boolean {
  return d.status === 'R';
}

/** True when a record should produce a printable slip (Observation or Referral with some content). */
export function recordHasSlip(d: any): boolean {
  if (!d || (d.status !== 'O' && d.status !== 'R')) return false;
  if (d.status === 'R') return true;
  return hasRx(d);
}

/** Short department-specific findings shown above the prescription. */
function deptSummary(category: string, d: any): [string, string][] {
  const out: [string, string][] = [];
  switch (category) {
    case 'Eye_Specialist':
      if (d.rightEye || d.leftEye) out.push(['Vision (R / L)', `${d.rightEye || '—'} / ${d.leftEye || '—'}`]);
      if (d.accessories) out.push(['Spectacles', d.accessories]);
      break;
    case 'Dental': {
      const teeth = d.dentalComplaints?.affectedTeeth || [];
      if (teeth.length) out.push(['Affected teeth', [...teeth].sort((a: number, b: number) => a - b).join(', ')]);
      if (d.teethGums) out.push(['Teeth & gums', d.teethGums]);
      break;
    }
    case 'ENT':
      if (d.ear) out.push(['Ear', d.ear]);
      if (d.nose) out.push(['Nose', d.nose]);
      if (d.throat) out.push(['Throat', d.throat]);
      break;
    case 'Skin_Specialist':
      if (d.skinExam) out.push(['Skin / hair / nails', d.skinExam]);
      break;
    case 'Community_Medicine':
    case 'Other':
      if (d.presentComplaint) out.push(['Present complaint', d.presentComplaint]);
      if (d.anaemia) out.push(['Anaemia', d.anaemia]);
      break;
    case 'Pediatrics':
      if (Array.isArray(d.growthFlags) && d.growthFlags.length) out.push(['Growth', d.growthFlags.join(', ')]);
      if (Array.isArray(d.deficiencySigns) && d.deficiencySigns.length) out.push(['Deficiency signs', d.deficiencySigns.join(', ')]);
      break;
    case 'OBGYN':
      if (d.menarche) out.push(['Menarche', d.menarche === 'Yes' && d.menarcheAge ? `Yes (age ${d.menarcheAge})` : d.menarche]);
      if (d.cycleRegularity) out.push(['Cycles', d.cycleRegularity]);
      break;
  }
  return out;
}

const CSS = `
  @page { size: A4; margin: 12mm; }
  * { box-sizing: border-box; }
  body { margin: 0; font-family: Georgia, 'Times New Roman', serif; color: #000; font-size: 12px; }
  .slip { max-width: 186mm; margin: 0 auto; }
  .slip + .slip { page-break-before: always; break-before: page; }
  .hdr { text-align: center; border-bottom: 2px solid #000; padding-bottom: 8px; margin-bottom: 10px; }
  .hdr h1 { font-size: 17px; margin: 0; letter-spacing: .02em; }
  .hdr p { margin: 3px 0 0; font-size: 11px; color: #444; }
  .meta { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
  .tag { display: inline-block; padding: 3px 10px; border: 2px solid #000; border-radius: 3px; font-weight: bold; font-size: 12px; text-transform: uppercase; }
  .dept { margin-left: 8px; font-size: 12px; }
  table { width: 100%; border-collapse: collapse; }
  .pt td { padding: 2px 4px 2px 0; vertical-align: top; }
  .pt .k { font-weight: bold; white-space: nowrap; width: 1%; }
  .sec { border-top: 1px solid #999; padding-top: 6px; margin-top: 8px; break-inside: avoid; }
  .sec h3 { font-size: 13px; margin: 0 0 4px; }
  .sec h3.ref { text-transform: uppercase; }
  .kv { margin: 2px 0; }
  .kv b { display: inline-block; min-width: 120px; }
  .pre { white-space: pre-wrap; margin: 2px 0; }
  .rx th, .rx td { border-bottom: 1px solid #ddd; padding: 3px 4px; text-align: left; }
  .rx th { border-bottom: 1px solid #666; }
  .muted { color: #777; }
  .ftr { border-top: 2px solid #000; margin-top: 18px; padding-top: 10px; display: flex; justify-content: space-between; break-inside: avoid; }
  .sig { margin-top: 26px; border-top: 1px solid #000; padding-top: 3px; min-width: 150px; text-align: center; }
`;

export function buildSlipBody(slip: Slip, today: string): string {
  const { student: s, generalInfo: gi, record: r, campName } = slip;
  const d = r.parsed_data || {};
  const dept = specialtyLabel(r.category);
  const doctor = r.doctor_name || r.doctor_id || '—';
  const sex = s.gender === 'M' ? 'Male' : s.gender === 'F' ? 'Female' : s.gender;
  const referred = hasReferral(d);
  const title = referred && hasRx(d) ? 'Prescription & Referral' : referred ? 'Referral' : 'Prescription';

  const vitals: string[] = [];
  if (gi?.height) vitals.push(`Height ${esc(gi.height)} cm`);
  if (gi?.weight) vitals.push(`Weight ${esc(gi.weight)} kg`);
  if (gi?.bmi) vitals.push(`BMI ${esc(gi.bmi)}`);
  const bp = formatBP(d);
  if (bp) vitals.push(`BP ${esc(bp)}`);
  if (d.pulse) vitals.push(`Pulse ${esc(d.pulse)} /min`);

  let h = `<div class="slip">`;
  h += `<div class="hdr"><h1>AIIMS BATHINDA — SCHOOL HEALTH CAMP</h1>${campName ? `<p>${esc(campName)}</p>` : ''}</div>`;
  h += `<div class="meta"><div><span class="tag">${title}</span><span class="dept">Department: <b>${esc(dept)}</b></span></div><div>Date: ${esc(today)}</div></div>`;

  h += `<table class="pt"><tbody>`;
  h += `<tr><td class="k">Student:</td><td>${nz(s.name)}</td><td class="k">Age:</td><td>${nz(s.age)}</td><td class="k">Sex:</td><td>${nz(sex)}</td></tr>`;
  h += `<tr><td class="k">Class:</td><td>${nz(s.student_class)}${s.section ? `-${esc(s.section)}` : ''}</td><td class="k">Reg No:</td><td>${nz(s.registration_number)}</td><td class="k">Contact:</td><td>${nz(s.phone)}</td></tr>`;
  h += `<tr><td class="k">Father:</td><td colspan="5">${nz(s.father_name)}</td></tr>`;
  if (vitals.length) h += `<tr><td class="k">Vitals:</td><td colspan="5">${vitals.join(' &nbsp;·&nbsp; ')}</td></tr>`;
  h += `</tbody></table>`;

  // Findings
  const summary = deptSummary(r.category, d);
  h += `<div class="sec"><h3>Clinical Findings</h3>`;
  summary.forEach(([k, v]) => { h += `<p class="kv"><b>${esc(k)}:</b> ${esc(v)}</p>`; });
  h += `<p class="pre">${hasText(d.clinicalFindings) ? esc(d.clinicalFindings) : (summary.length ? '' : '—')}</p></div>`;

  // Prescription
  if (hasRx(d) || d.status === 'O') {
    h += `<div class="sec"><h3>Diagnosis</h3><p class="pre">${nz(d.diagnosis)}</p>`;
    h += `<h3 style="margin-top:6px">Prescription (Rx)</h3>`;
    const meds = (Array.isArray(d.medicines) ? d.medicines : []).filter((m: any) => hasText(m?.name));
    if (meds.length) {
      h += `<table class="rx"><thead><tr><th>#</th><th>Medicine</th><th>Dosage</th><th>Freq</th><th>Duration</th></tr></thead><tbody>`;
      meds.forEach((m: any, i: number) => {
        h += `<tr><td>${i + 1}.</td><td>${nz(m.name)}</td><td>${nz(m.dosage)}</td><td>${nz(m.frequency)}</td><td>${nz(m.duration)}</td></tr>`;
      });
      h += `</tbody></table>`;
    } else {
      h += `<p class="muted">No medicines prescribed.</p>`;
    }
    if (hasText(d.advice)) h += `<h3 style="margin-top:6px">Advice</h3><p class="pre">${esc(d.advice)}</p>`;
    h += `</div>`;
  }

  // Referral (same page)
  if (referred) {
    h += `<div class="sec"><h3 class="ref">Referral</h3>`;
    h += `<p class="kv"><b>Referred to:</b> ${nz(d.referralDept)}</p>`;
    h += `<p class="kv"><b>Urgency:</b> ${nz(d.urgency || 'Routine')}</p>`;
    h += `<p class="kv"><b>Reason:</b></p><p class="pre">${nz(d.referralReason)}</p></div>`;
  }

  h += `<div class="ftr"><div><b>${esc(doctor)}</b><br/><span class="muted">${esc(dept)}</span></div><div class="sig">Signature</div></div>`;
  h += `</div>`;
  return h;
}

/**
 * Open the print window synchronously inside a click handler (before any `await`),
 * otherwise pop-up blockers reject it. Pass the result to `printSlips`.
 */
export function openPrintWindow(): Window | null {
  const w = window.open('', '_blank');
  if (w) {
    w.document.write('<!doctype html><title>Preparing…</title><p style="font-family:sans-serif;padding:24px;color:#555">Preparing slips…</p>');
  } else {
    alert('Please allow pop-ups for this site to print slips.');
  }
  return w;
}

/** Render one page per slip into a print window (opened here if not supplied) and print. */
export function printSlips(slips: Slip[], win?: Window | null, title = 'Prescription & Referral'): boolean {
  if (!slips.length) { win?.close(); return false; }
  const today = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const body = slips.map(s => buildSlipBody(s, today)).join('');
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${esc(title)}</title><style>${CSS}</style></head><body>${body}</body></html>`;
  const w = win ?? window.open('', '_blank');
  if (!w) { alert('Please allow pop-ups for this site to print slips.'); return false; }
  w.document.open();
  w.document.write(html);
  w.document.close();
  w.focus();
  setTimeout(() => { w.print(); }, 300);
  return true;
}

/** Load printable slips for an event (optionally one student / one department) from the server. */
export async function fetchSlips(eventId: number, opts: { studentId?: number; category?: string } = {}): Promise<Slip[]> {
  const p = new URLSearchParams();
  if (opts.studentId) p.set('student_id', String(opts.studentId));
  if (opts.category) p.set('category', opts.category);
  const res = await fetch(`/api/events/${eventId}/slips${p.toString() ? `?${p}` : ''}`);
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || `HTTP ${res.status}`);
  const data = await res.json();
  const campName: string = data.camp_name || '';
  return (data.slips || [])
    .map((x: any) => ({
      student: x.student,
      generalInfo: x.general_info,
      record: x.record,
      campName,
    }))
    .filter((s: Slip) => recordHasSlip(s.record.parsed_data));
}
