import React from 'react';
import { Check, CircleDot, Clock } from 'lucide-react';

interface StageProgressProps {
  currentStage: string;
  isComplete: boolean;
  isFailed?: boolean;
}

const STAGES = [
  { id: 'clarification', label: '1. Problem Clarification', sub: 'Agenda framing' },
  { id: 'specialist_analysis', label: '2. Specialist Analyses', sub: 'Independent review' },
  { id: 'critique_rebuttal', label: '3. Critique & Rebuttal', sub: 'Debating friction' },
  { id: 'ceo_synthesis', label: '4. Executive Synthesis', sub: 'Decision & dissent' },
  { id: 'completed', label: '5. Action Plan', sub: 'Prioritized tasks' }
];

export const StageProgress: React.FC<StageProgressProps> = ({
  currentStage,
  isComplete,
  isFailed
}) => {
  const getStageIndex = (stageId: string) => {
    if (isComplete) return 5;
    const idx = STAGES.findIndex(s => s.id === stageId);
    return idx >= 0 ? idx : 0;
  };

  const currentIndex = getStageIndex(currentStage);

  return (
    <div className="w-full bg-slate-900/80 border border-slate-800 rounded-xl p-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 overflow-x-auto pb-1 sm:pb-0">
        {STAGES.map((stage, idx) => {
          const isPassed = isComplete || idx < currentIndex;
          const isCurrent = !isComplete && idx === currentIndex;

          return (
            <div key={stage.id} className="flex items-center gap-3 min-w-[170px] sm:min-w-0 flex-1">
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                    isPassed
                      ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-500/20'
                      : isCurrent
                      ? 'bg-blue-600 text-white ring-4 ring-blue-500/20 animate-pulse'
                      : 'bg-slate-800 text-slate-500 border border-slate-700/60'
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

                <div className="flex flex-col">
                  <span
                    className={`text-xs font-semibold ${
                      isPassed
                        ? 'text-slate-200'
                        : isCurrent
                        ? 'text-blue-400 font-bold'
                        : 'text-slate-500'
                    }`}
                  >
                    {stage.label}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {stage.sub}
                  </span>
                </div>
              </div>

              {idx < STAGES.length - 1 && (
                <div
                  className={`hidden lg:block flex-1 h-[2px] mx-2 rounded transition-colors duration-300 ${
                    isPassed ? 'bg-emerald-500/60' : 'bg-slate-800'
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
