import React from 'react';
import { HeartPulse, Eye, Ear, Scan, Stethoscope, Baby, Flower2 } from 'lucide-react';

// Single source of truth for specialist departments.
// `key` is the value stored in Users.role, Event_Volunteers.category and Health_Records.category.
export interface Specialty {
  key: string;
  label: string;        // full display name
  short: string;        // compact tag (domain progress bar, charts)
  femaleOnly?: boolean; // only applicable to female students
  darkColor: string;    // badge classes for the dark (admin/school) theme
  tagColor: string;     // solid dot colour
}

export const SPECIALTIES: Specialty[] = [
  { key: 'Community_Medicine', label: 'Community Medicine', short: 'CM', darkColor: 'bg-rose-500/20 text-rose-400 border-rose-500/30', tagColor: 'bg-rose-500' },
  { key: 'Dental', label: 'Dental', short: 'Dental', darkColor: 'bg-sky-500/20 text-sky-400 border-sky-500/30', tagColor: 'bg-sky-500' },
  { key: 'ENT', label: 'ENT', short: 'ENT', darkColor: 'bg-amber-500/20 text-amber-400 border-amber-500/30', tagColor: 'bg-amber-500' },
  { key: 'Eye_Specialist', label: 'Ophthalmology', short: 'Ophthal', darkColor: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30', tagColor: 'bg-emerald-500' },
  { key: 'Skin_Specialist', label: 'Dermatology', short: 'Derm', darkColor: 'bg-violet-500/20 text-violet-400 border-violet-500/30', tagColor: 'bg-violet-500' },
  { key: 'Pediatrics', label: 'Paediatrics', short: 'Paed', darkColor: 'bg-teal-500/20 text-teal-400 border-teal-500/30', tagColor: 'bg-teal-500' },
  { key: 'OBGYN', label: 'Obstetrics & Gynaecology', short: 'OBGYN', femaleOnly: true, darkColor: 'bg-pink-500/20 text-pink-400 border-pink-500/30', tagColor: 'bg-pink-500' },
];

/** All roles a specialist user may hold ('Other' uses the Community Medicine form). */
export const SPECIALIST_ROLE_KEYS: string[] = [...SPECIALTIES.map(s => s.key), 'Other'];

export function isSpecialistRole(role: string): boolean {
  return SPECIALIST_ROLE_KEYS.includes(role);
}

export function getSpecialty(key: string): Specialty | undefined {
  return SPECIALTIES.find(s => s.key === key);
}

export function specialtyLabel(key: string): string {
  return getSpecialty(key)?.label ?? (key || '').replace(/_/g, ' ');
}

export function specialtyDarkColor(key: string): string {
  return getSpecialty(key)?.darkColor ?? 'bg-slate-500/20 text-slate-400 border-slate-500/30';
}

/** Whether a department applies to a student of the given sex ('M' | 'F' | ...). */
export function specialtyAppliesTo(key: string, gender?: string): boolean {
  const s = getSpecialty(key);
  if (s?.femaleOnly) return gender === 'F';
  return true;
}

export function SpecialtyIcon({ specialty, className = 'w-4 h-4' }: { specialty: string; className?: string }) {
  switch (specialty) {
    case 'Community_Medicine': return <HeartPulse className={className} />;
    case 'Dental': return <span className="text-xs leading-none">🦷</span>;
    case 'ENT': return <Ear className={className} />;
    case 'Eye_Specialist': return <Eye className={className} />;
    case 'Skin_Specialist': return <Scan className={className} />;
    case 'Pediatrics': return <Baby className={className} />;
    case 'OBGYN': return <Flower2 className={className} />;
    default: return <Stethoscope className={className} />;
  }
}
