
import React from 'react';

interface OtherComplaintInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  label?: string;
}

/**
 * Text input component for "Other complaints" section
 * Allows doctors to write custom complaints not in the predefined list
 */
export function OtherComplaintInput({
  value,
  onChange,
  placeholder = 'Describe any other complaints...',
  disabled = false,
  label = 'Other Complaints',
}: OtherComplaintInputProps) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-semibold text-[#374151]">
        {label}
      </label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        rows={2}
        className="
          min-h-[60px] w-full rounded-lg border border-[#E5E7EB] bg-white 
          px-3 py-2.5 text-[15px] leading-snug text-[#1F2937] 
          transition-all placeholder-[#9CA3AF] 
          focus:border-[#2563EB] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20
          disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-[#F9FAFB]
        "
      />
      {value && (
        <div className="text-xs text-[#6B7280]">
          {value.length} characters
        </div>
      )}
    </div>
  );
}
