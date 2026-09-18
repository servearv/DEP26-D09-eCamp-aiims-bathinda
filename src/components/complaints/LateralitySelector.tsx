
import React from 'react';

interface LateralitySelectorProps {
  complaint: string;
  value: 'left' | 'right' | 'both' | undefined;
  onChange: (side: 'left' | 'right' | 'both') => void;
  disabled?: boolean;
  label?: string;
}

/**
 * Component for selecting laterality (left/right/both) for bilateral organs
 * Used for ear and eye symptoms
 */
export function LateralitySelector({
  complaint,
  value,
  onChange,
  disabled = false,
  label,
}: LateralitySelectorProps) {
  return (
    <div className="ml-6 mt-2 space-y-1.5">
      <label className="block text-xs font-medium text-[#6B7280]">
        {label || `Which side for "${complaint}"?`}
      </label>
      <div className="flex space-x-2">
        {(['left', 'right', 'both'] as const).map((side) => {
          const isSelected = value === side;
          const displayLabels = {
            left: 'Left',
            right: 'Right',
            both: 'Both',
          };
          
          return (
            <button
              key={side}
              type="button"
              onClick={() => !disabled && onChange(side)}
              disabled={disabled}
              className={`
                flex-1 min-h-[36px] rounded-md border px-3 py-1.5 text-sm font-semibold 
                transition-all disabled:opacity-50 disabled:cursor-not-allowed
                ${isSelected
                  ? 'border-[#2563EB] bg-[#2563EB] text-white shadow-sm'
                  : 'border-[#D1D5DB] bg-white text-[#6B7280] hover:border-[#9CA3AF]'
                }
              `}
            >
              {displayLabels[side]}
            </button>
          );
        })}
      </div>
    </div>
  );
}
