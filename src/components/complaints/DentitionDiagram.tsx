
import React from 'react';

interface DentitionDiagramProps {
  selectedTeeth: number[];
  onToothSelect: (toothNumber: number) => void;
  disabled?: boolean;
}

/**
 * Interactive dentition diagram component for tooth selection
 * Uses FDI World Dental Federation notation (1-32)
 * 
 * Quadrants:
 * - Upper Right: 11-18 (Quadrant 1)
 * - Upper Left: 21-28 (Quadrant 2)
 * - Lower Left: 31-38 (Quadrant 3)
 * - Lower Right: 41-48 (Quadrant 4)
 */
export function DentitionDiagram({
  selectedTeeth,
  onToothSelect,
  disabled = false,
}: DentitionDiagramProps) {
  // FDI notation tooth numbers
  const upperRight = [18, 17, 16, 15, 14, 13, 12, 11];
  const upperLeft = [21, 22, 23, 24, 25, 26, 27, 28];
  const lowerLeft = [31, 32, 33, 34, 35, 36, 37, 38];
  const lowerRight = [48, 47, 46, 45, 44, 43, 42, 41];

  const handleToothClick = (toothNumber: number) => {
    if (!disabled) {
      onToothSelect(toothNumber);
    }
  };

  const isSelected = (toothNumber: number) => selectedTeeth.includes(toothNumber);

  const ToothButton = ({ toothNumber }: { toothNumber: number }) => {
    const selected = isSelected(toothNumber);
    return (
      <button
        type="button"
        onClick={() => handleToothClick(toothNumber)}
        disabled={disabled}
        className={`
          relative w-8 h-10 text-[10px] font-bold rounded transition-all
          border-2 disabled:opacity-50 disabled:cursor-not-allowed
          ${selected
            ? 'bg-[#EF4444] border-[#DC2626] text-white shadow-md'
            : 'bg-white border-[#D1D5DB] text-[#6B7280] hover:border-[#9CA3AF] hover:shadow-sm'
          }
        `}
        title={`Tooth ${toothNumber}`}
      >
        {toothNumber}
      </button>
    );
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center space-x-2 text-sm text-[#6B7280]">
        <div className="flex items-center space-x-1.5">
          <div className="w-4 h-4 bg-[#EF4444] border-2 border-[#DC2626] rounded"></div>
          <span className="text-xs font-medium">Selected</span>
        </div>
        <span className="text-[#D1D5DB]">•</span>
        <span className="text-xs">Click teeth to mark as affected</span>
      </div>

      <div className="bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl p-4 space-y-4">
        {/* Upper Jaw */}
        <div className="space-y-2">
          <div className="text-center">
            <span className="text-xs font-semibold text-[#9CA3AF] uppercase tracking-wider">Upper Jaw</span>
          </div>
          <div className="flex justify-center space-x-1">
            {/* Upper Right */}
            <div className="flex space-x-1">
              {upperRight.map(tooth => (
                <ToothButton key={tooth} toothNumber={tooth} />
              ))}
            </div>
            {/* Midline separator */}
            <div className="w-1 bg-[#E5E7EB] mx-1"></div>
            {/* Upper Left */}
            <div className="flex space-x-1">
              {upperLeft.map(tooth => (
                <ToothButton key={tooth} toothNumber={tooth} />
              ))}
            </div>
          </div>
        </div>

        {/* Horizontal separator for upper/lower jaw */}
        <div className="h-px bg-[#D1D5DB]"></div>

        {/* Lower Jaw */}
        <div className="space-y-2">
          <div className="flex justify-center space-x-1">
            {/* Lower Right */}
            <div className="flex space-x-1">
              {lowerRight.map(tooth => (
                <ToothButton key={tooth} toothNumber={tooth} />
              ))}
            </div>
            {/* Midline separator */}
            <div className="w-1 bg-[#E5E7EB] mx-1"></div>
            {/* Lower Left */}
            <div className="flex space-x-1">
              {lowerLeft.map(tooth => (
                <ToothButton key={tooth} toothNumber={tooth} />
              ))}
            </div>
          </div>
          <div className="text-center">
            <span className="text-xs font-semibold text-[#9CA3AF] uppercase tracking-wider">Lower Jaw</span>
          </div>
        </div>
      </div>

      {/* Selected teeth display */}
      {selectedTeeth.length > 0 && (
        <div className="bg-[#FEF2F2] border border-[#FECACA] rounded-lg px-3 py-2">
          <span className="text-xs font-semibold text-[#991B1B]">
            Affected teeth: {selectedTeeth.sort((a, b) => a - b).join(', ')}
          </span>
        </div>
      )}
    </div>
  );
}
