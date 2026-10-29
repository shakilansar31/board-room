import React from 'react';
import { Check, CircleDot } from 'lucide-react';

interface StageProgressProps {
  currentStage: string;
  isComplete: boolean;
}

const STAGES = [
  { id: 'clarification', label: '1. Clarification', sub: 'Agenda framing' },
  { id: 'specialist_analysis', label: '2. Specialist Review', sub: 'Evidence analysis' },
  { id: 'critique_rebuttal', label: '3. Cross-Exam', sub: 'Debating friction' },
  { id: 'ceo_synthesis', label: '4. CEO Synthesis', sub: 'Decision & dissent' },
  { id: 'completed', label: '5. Action Plan', sub: 'Prioritized tasks' }
];

export const StageProgress: React.FC<StageProgressProps> = ({
  currentStage,
  isComplete
}) => {
  const getStageIndex = (stageId: string) => {
    if (isComplete) return 5;
    const idx = STAGES.findIndex(s => s.id === stageId);
    return idx >= 0 ? idx : 0;
  };

  const currentIndex = getStageIndex(currentStage);

  return (
    <div className="w-full bg-white border border-slate-200 rounded-xl p-3 shadow-sm">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 overflow-x-auto pb-1 sm:pb-0">
        {STAGES.map((stage, idx) => {
          const isPassed = isComplete || idx < currentIndex;
          const isCurrent = !isComplete && idx === currentIndex;

          return (
            <div key={stage.id} className="flex items-center gap-2.5 min-w-[150px] sm:min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-semibold transition-all duration-200 ${
                    isPassed
                      ? 'bg-emerald-600 text-white'
                      : isCurrent
                      ? 'bg-slate-900 text-white ring-4 ring-slate-900/10'
                      : 'bg-slate-100 text-slate-400'
                  }`}
                >
                  {isPassed ? (
                    <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                  ) : isCurrent ? (
                    <CircleDot className="w-3.5 h-3.5" />
                  ) : (
                    <span>{idx + 1}</span>
                  )}
                </div>

                <div className="flex flex-col min-w-0">
                  <span
                    className={`text-xs font-medium truncate ${
                      isPassed
                        ? 'text-slate-900 font-semibold'
                        : isCurrent
                        ? 'text-slate-900 font-bold'
                        : 'text-slate-400'
                    }`}
                  >
                    {stage.label}
                  </span>
                  <span className="text-[10px] text-slate-400 truncate hidden md:inline">
                    {stage.sub}
                  </span>
                </div>
              </div>

              {idx < STAGES.length - 1 && (
                <div
                  className={`hidden lg:block flex-1 h-[1.5px] mx-1 rounded transition-colors duration-200 ${
                    isPassed ? 'bg-emerald-500' : 'bg-slate-200'
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
