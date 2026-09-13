// Camp data download: fetches /api/events/<id>/export and writes .xlsx (two sheets) or .csv (records).
import * as XLSX from 'xlsx';
import { specialtyLabel } from '../constants/specialties';

export type ExportFormat = 'xlsx' | 'csv';

export interface ExportFilters {
  student_class?: string;
  section?: string;
  gender?: string;
}

function safeFileName(s: string): string {
  return (s || 'camp').replace(/[^a-zA-Z0-9-_]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 60) || 'camp';
}

export async function downloadEventData(eventId: number, format: ExportFormat, filters: ExportFilters = {}): Promise<void> {
  const p = new URLSearchParams();
  if (filters.student_class) p.set('student_class', filters.student_class);
  if (filters.section) p.set('section', filters.section);
  if (filters.gender) p.set('gender', filters.gender);
  const res = await fetch(`/api/events/${eventId}/export${p.toString() ? `?${p}` : ''}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Download failed (HTTP ${res.status})`);
  }
  const data = await res.json();
  const departments: string[] = data.departments || [];

  const studentRows = (data.students || []).map((s: any) => {
    const row: Record<string, unknown> = {
      'Reg No': s.registration_number,
      'Name': s.name,
      'Class': s.student_class,
      'Section': s.section,
      'Sex': s.gender,
      'DOB': s.dob,
      'Age': s.age ?? '',
      'Blood Group': s.blood_group,
      "Father's Name": s.father_name,
      "Father's Occupation": s.father_occupation,
      "Mother's Name": s.mother_name,
      "Mother's Occupation": s.mother_occupation,
      'Phone': s.phone,
      'Address': s.address,
      'Pincode': s.pincode,
      'Attendance': s.attendance,
      'Height (cm)': s.height_cm,
      'Weight (kg)': s.weight_kg,
      'BMI': s.bmi,
      'BP (mmHg)': s.bp_mmhg,
      'Symptoms': s.symptoms,
    };
    for (const dep of departments) row[specialtyLabel(dep)] = s.departments?.[dep] || '';
    return row;
  });

  const recordRows = (data.records || []).map((r: any) => ({
    'Reg No': r.registration_number,
    'Student': r.student_name,
    'Class': r.student_class,
    'Section': r.section,
    'Sex': r.gender,
    'Department': specialtyLabel(r.department),
    'Doctor': r.doctor,
    'Date/Time (UTC)': r.timestamp,
    'Assessment': r.status,
    'Chief Complaints': r.chief_complaints,
    'Key Findings': r.key_findings,
    'BP (mmHg)': r.bp_mmhg,
    'Pulse': r.pulse,
    'Clinical Findings': r.clinical_findings,
    'Diagnosis': r.diagnosis,
    'Medicines': r.medicines,
    'Advice': r.advice,
    'Referred To': r.referral_dept,
    'Referral Reason': r.referral_reason,
    'Urgency': r.urgency,
  }));

  const base = `${safeFileName(data.event?.school_name)}_${safeFileName(data.event?.start_date || '')}_screening`;

  if (format === 'csv') {
    const ws = XLSX.utils.json_to_sheet(recordRows);
    const csv = XLSX.utils.sheet_to_csv(ws);
    // BOM so Excel opens UTF-8 correctly
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${base}_records.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return;
  }

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(studentRows.length ? studentRows : [{ Note: 'No students' }]), 'Students');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(recordRows.length ? recordRows : [{ Note: 'No records' }]), 'Health Records');
  XLSX.writeFile(wb, `${base}.xlsx`);
}
