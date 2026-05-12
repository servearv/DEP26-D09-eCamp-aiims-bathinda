import React, { useState } from 'react';

const STATUS_CONFIG = {
  normal:      { label: 'Normal',      color: '#10b981' },
  observation: { label: 'Observation', color: '#f59e0b' },
  referred:    { label: 'Referred',    color: '#ef4444' },
  pending:     { label: 'Pending',     color: '#a78bfa' },
  absent:      { label: 'Absent',      color: '#64748b' },
} as const;

type StatusKey = keyof typeof STATUS_CONFIG;

interface ChartData {
  total_students: number;
  screened: number;
  normal: number;
  observation: number;
  referred: number;
  absent: number;
}

export default function AnalyticsPanel({ data, compact = false }: { data: ChartData; compact?: boolean }) {
  const [hovered, setHovered] = useState<StatusKey | null>(null);

  if (data.total_students === 0) return null;

  const pending = Math.max(0, data.total_students - data.screened - data.absent);
  const size = compact ? 140 : 170;

  const segments: { key: StatusKey; value: number }[] = [
    { key: 'normal',      value: data.normal },
    { key: 'observation', value: data.observation },
    { key: 'referred',    value: data.referred },
    { key: 'pending',     value: pending },
    { key: 'absent',      value: data.absent },
  ];

  const total = segments.reduce((s, seg) => s + seg.value, 0);
  if (total === 0) return null;

  const strokeWidth = compact ? 20 : 24;
  const radius = (size - strokeWidth - 4) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * radius;

  let accumulated = 0;
  const arcs = segments
    .filter(s => s.value > 0)
    .map(seg => {
      const fraction = seg.value / total;
      const dashLen = fraction * circumference;
      const gap = circumference - dashLen;
      const offset = -accumulated * circumference + circumference * 0.25;
      accumulated += fraction;
      return { ...seg, fraction, dashLen, gap, offset };
    });

  const hoveredSeg = hovered ? arcs.find(a => a.key === hovered) : null;
  const centerCount = hoveredSeg ? hoveredSeg.value : data.total_students;
  const centerLabel = hoveredSeg ? STATUS_CONFIG[hoveredSeg.key].label : 'Total';
  const centerPct = hoveredSeg ? `${(hoveredSeg.fraction * 100).toFixed(1)}%` : '';

  const screenedPct = data.total_students > 0 ? Math.round((data.screened / data.total_students) * 100) : 0;

  return (
    <div className="bg-slate-900/80 backdrop-blur-xl rounded-2xl border border-slate-800 shadow-xl overflow-hidden">
      <div className="px-5 py-3 border-b border-slate-800/60 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <svg className="w-4 h-4 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <h3 className="text-sm font-bold text-white">Student Status</h3>
        </div>
        <span className="text-[11px] text-slate-500 font-medium">
          {data.screened}/{data.total_students} screened · {screenedPct}%
        </span>
      </div>

      <div className={`flex flex-col items-center ${compact ? 'py-4 px-4' : 'py-5 px-5'}`}>
        <svg width={size} height={size} className="drop-shadow-lg">
          <circle
            cx={cx} cy={cy} r={radius}
            fill="none"
            stroke="rgba(51,65,85,0.3)"
            strokeWidth={strokeWidth}
          />
          {arcs.map(arc => (
            <circle
              key={arc.key}
              cx={cx} cy={cy} r={radius}
              fill="none"
              stroke={STATUS_CONFIG[arc.key].color}
              strokeWidth={hovered === arc.key ? strokeWidth + 5 : strokeWidth}
              strokeDasharray={`${arc.dashLen} ${arc.gap}`}
              strokeDashoffset={arc.offset}
              strokeLinecap="butt"
              className="transition-all duration-300 ease-out cursor-pointer"
              style={{
                opacity: hovered && hovered !== arc.key ? 0.25 : 1,
                filter: hovered === arc.key ? `drop-shadow(0 0 6px ${STATUS_CONFIG[arc.key].color}60)` : 'none',
              }}
              onMouseEnter={() => setHovered(arc.key)}
              onMouseLeave={() => setHovered(null)}
            />
          ))}
          <circle cx={cx} cy={cy} r={radius - strokeWidth / 2 - 2} fill="#0f172a" opacity="0.85" />
          <text x={cx} y={cy - 6} textAnchor="middle" dominantBaseline="central" style={{ fontSize: compact ? '26px' : '30px', fontWeight: 800, fill: '#ffffff' }}>
            {centerCount}
          </text>
          <text x={cx} y={cy + 18} textAnchor="middle" style={{ fontSize: '11px', fontWeight: 600, fill: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            {centerLabel}
          </text>
          {centerPct && (
            <text x={cx} y={cy + 32} textAnchor="middle" style={{ fontSize: '11px', fontWeight: 600, fill: '#cbd5e1' }}>
              {centerPct}
            </text>
          )}
        </svg>

        <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 mt-3">
          {arcs.map(arc => (
            <span
              key={arc.key}
              className={`inline-flex items-center space-x-1 text-[10px] cursor-pointer transition-opacity duration-200 ${hovered && hovered !== arc.key ? 'opacity-30' : 'opacity-100'}`}
              onMouseEnter={() => setHovered(arc.key)}
              onMouseLeave={() => setHovered(null)}
            >
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: STATUS_CONFIG[arc.key].color }} />
              <span className="text-slate-400 font-medium">{STATUS_CONFIG[arc.key].label}</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════
// Department Breakdown — Stacked Horizontal Bar Chart
// ════════════════════════════════════════

const BAR_COLORS = {
  N: { color: '#10b981', label: 'Normal' },
  O: { color: '#f59e0b', label: 'Observation' },
  R: { color: '#ef4444', label: 'Referred' },
} as const;

const DEPT_LABELS: Record<string, string> = {
  Community_Medicine: 'Community Med.',
  Dental: 'Dental',
  ENT: 'ENT',
  Eye_Specialist: 'Ophthalmology',
  Skin_Specialist: 'Dermatology',
};

type AssessKey = 'N' | 'O' | 'R';

interface DeptTally { N: number; O: number; R: number; total: number }

export function DepartmentBreakdownChart({ records }: { records: any[] }) {
  const [hoveredDept, setHoveredDept] = useState<string | null>(null);
  const [hoveredSeg, setHoveredSeg] = useState<{ dept: string; key: AssessKey } | null>(null);

  // Build per-department tallies from records
  const deptMap: Record<string, DeptTally> = {};
  for (const rec of records) {
    const cat = rec.category || 'Other';
    if (!deptMap[cat]) deptMap[cat] = { N: 0, O: 0, R: 0, total: 0 };
    try {
      const d = JSON.parse(rec.json_data);
      const a = d.assessment as string;
      if (a === 'N' || a === 'O' || a === 'R') {
        deptMap[cat][a]++;
        deptMap[cat].total++;
      }
    } catch {}
  }

  const entries = Object.entries(deptMap)
    .filter(([, v]) => v.total > 0)
    .sort((a, b) => b[1].total - a[1].total);

  if (entries.length === 0) {
    return (
      <div className="bg-slate-900/80 backdrop-blur-xl rounded-2xl border border-slate-800 shadow-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-800/60 flex items-center space-x-2">
          <svg className="w-4 h-4 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
          <h3 className="text-sm font-bold text-white">Department Screening</h3>
        </div>
        <div className="px-5 py-6 text-center">
          <p className="text-slate-500 text-xs">No screening records yet. Charts will appear once doctors submit exams.</p>
        </div>
      </div>
    );
  }

  const maxTotal = Math.max(...entries.map(([, v]) => v.total));

  return (
    <div className="bg-slate-900/80 backdrop-blur-xl rounded-2xl border border-slate-800 shadow-xl overflow-hidden">
      <div className="px-5 py-3 border-b border-slate-800/60 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <svg className="w-4 h-4 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
          <h3 className="text-sm font-bold text-white">Department Screening</h3>
        </div>
        <span className="text-[11px] text-slate-500 font-medium">
          {entries.length} dept{entries.length !== 1 ? 's' : ''} · {records.length} records
        </span>
      </div>

      <div className="px-5 py-4 space-y-3">
        {entries.map(([dept, tally]) => {
          const label = DEPT_LABELS[dept] || dept.replace(/_/g, ' ');
          const isActive = hoveredDept === dept;
          const dimmed = hoveredDept !== null && !isActive;

          return (
            <div
              key={dept}
              className={`transition-opacity duration-200 ${dimmed ? 'opacity-30' : 'opacity-100'}`}
              onMouseEnter={() => setHoveredDept(dept)}
              onMouseLeave={() => { setHoveredDept(null); setHoveredSeg(null); }}
            >
              {/* Label row */}
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-semibold text-slate-300 truncate max-w-[120px]">{label}</span>
                <div className="flex items-center space-x-2">
                  {(['N', 'O', 'R'] as AssessKey[]).map(k => (
                    tally[k] > 0 ? (
                      <span
                        key={k}
                        className={`text-sm font-bold transition-all duration-200 cursor-default ${
                          hoveredSeg?.dept === dept && hoveredSeg?.key === k
                            ? 'scale-110'
                            : ''
                        }`}
                        style={{ color: BAR_COLORS[k].color }}
                        onMouseEnter={() => setHoveredSeg({ dept, key: k })}
                        onMouseLeave={() => setHoveredSeg(null)}
                      >
                        {tally[k]}
                      </span>
                    ) : null
                  ))}
                  <span className="text-sm text-slate-500 font-mono w-6 text-right">{tally.total}</span>
                </div>
              </div>

              {/* Stacked bar */}
              <div className="w-full h-5 bg-slate-800/60 rounded-lg overflow-hidden flex">
                {(['N', 'O', 'R'] as AssessKey[]).map(k => {
                  if (tally[k] === 0) return null;
                  const widthPct = (tally[k] / maxTotal) * 100;
                  const isSegHovered = hoveredSeg?.dept === dept && hoveredSeg?.key === k;
                  return (
                    <div
                      key={k}
                      className="h-full transition-all duration-300 ease-out cursor-default relative group"
                      style={{
                        width: `${widthPct}%`,
                        backgroundColor: BAR_COLORS[k].color,
                        opacity: hoveredSeg && !isSegHovered ? 0.35 : 1,
                        filter: isSegHovered ? `brightness(1.2) drop-shadow(0 0 4px ${BAR_COLORS[k].color}80)` : 'none',
                      }}
                      onMouseEnter={() => setHoveredSeg({ dept, key: k })}
                      onMouseLeave={() => setHoveredSeg(null)}
                    >
                      {/* Tooltip */}
                      {isSegHovered && (
                        <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-950 border border-slate-700 text-white text-[10px] font-bold px-2 py-1 rounded-lg shadow-xl whitespace-nowrap z-10 pointer-events-none">
                          {BAR_COLORS[k].label}: {tally[k]}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        {/* Legend */}
        <div className="flex items-center justify-center gap-x-4 pt-2 border-t border-slate-800/40">
          {(['N', 'O', 'R'] as AssessKey[]).map(k => (
            <span key={k} className="inline-flex items-center space-x-1 text-[10px]">
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: BAR_COLORS[k].color }} />
              <span className="text-slate-400 font-medium">{BAR_COLORS[k].label}</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
