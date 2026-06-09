
import React from 'react';
import { Check } from 'lucide-react';

interface ComplaintSelectorProps {
  title?: string;
  complaints: readonly string[] | string[];
  selected: string[];
  onChange: (selected: string[]) => void;
  multiSelect?: boolean;
  disabled?: boolean;
  className?: string;
}

/**
 * Reusable component for selecting chief complaints
 * Displays a grid of selectable complaint boxes
 */
export function ComplaintSelector({
  title,
  complaints,
  selected,
  onChange,
  multiSelect = true,
  disabled = false,
  className = '',
}: ComplaintSelectorProps) {
  const handleToggle = (complaint: string) => {
    if (disabled) return;
    
    if (multiSelect) {
      // Multi-select mode: toggle complaint in array
      if (selected.includes(complaint)) {
        onChange(selected.filter(c => c !== complaint));
      } else {
        onChange([...selected, complaint]);
      }
    } else {
      // Single-select mode: replace selection
      onChange(selected.includes(complaint) ? [] : [complaint]);
    }
  };

  return (
    <div className={className}>
      {title && (
        <label className="block text-sm font-semibold text-[#374151] mb-2">
          {title}
        </label>
      )}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
        {complaints.map((complaint) => {
          const isSelected = selected.includes(complaint);
          return (
            <button
              key={complaint}
              type="button"
              onClick={() => handleToggle(complaint)}
              disabled={disabled}
              className={`
                relative min-h-[44px] rounded-lg border-2 px-3 py-2 text-sm font-medium 
                text-left transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed
                ${isSelected
                  ? 'border-[#2563EB] bg-[#EFF6FF] text-[#1E40AF] shadow-sm'
                  : 'border-[#E5E7EB] bg-white text-[#6B7280] hover:border-[#D1D5DB] hover:shadow-sm'
                }
              `}
            >
              <div className="flex items-start space-x-2">
                <div
                  className={`
                    mt-0.5 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded border-2 transition-all
                    ${isSelected
                      ? 'border-[#2563EB] bg-[#2563EB]'
                      : 'border-[#D1D5DB] bg-white'
                    }
                  `}
                >
                  {isSelected && <Check className="h-3 w-3 text-white" strokeWidth={3} />}
                </div>
                <span className="flex-1 leading-tight">{complaint}</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
