// Blood pressure / pulse helpers. Values live in exam JSON as
// `bpSystolic`, `bpDiastolic`, `pulse` (strings, as typed by the clinician).

export function formatBP(d: any): string {
  if (!d || (!d.bpSystolic && !d.bpDiastolic)) return '';
  return `${d.bpSystolic || '—'}/${d.bpDiastolic || '—'} mmHg`;
}

/** Returns a human-readable warning, or '' if the values look plausible. Never blocks saving. */
export function bpWarning(sys: string, dia: string): string {
  const s = parseFloat(sys);
  const d = parseFloat(dia);
  const hasS = sys !== '' && sys != null;
  const hasD = dia !== '' && dia != null;
  if (hasS && (isNaN(s) || s < 60 || s > 200)) return 'Systolic usually 60–200 mmHg — please re-check';
  if (hasD && (isNaN(d) || d < 30 || d > 130)) return 'Diastolic usually 30–130 mmHg — please re-check';
  if (hasS && hasD && !isNaN(s) && !isNaN(d) && s <= d) return 'Systolic should be higher than diastolic';
  return '';
}

export function pulseWarning(pulse: string): string {
  if (pulse === '' || pulse == null) return '';
  const p = parseFloat(pulse);
  if (isNaN(p) || p < 40 || p > 180) return 'Pulse usually 40–180 /min — please re-check';
  return '';
}
