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
    <div className="w-full bg-white border-[2.5px] border-black rounded-xl p-4 shadow-[4px_4px_0px_0px_#000]">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 overflow-x-auto pb-1 sm:pb-0">
        {STAGES.map((stage, idx) => {
          const isPassed = isComplete || idx < currentIndex;
          const isCurrent = !isComplete && idx === currentIndex;

          return (
            <div key={stage.id} className="flex items-center gap-3 min-w-[170px] sm:min-w-0 flex-1">
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black transition-all duration-200 border-2 border-black ${
                    isPassed
                      ? 'bg-[#86EFAC] text-black shadow-[2px_2px_0px_0px_#000]'
                      : isCurrent
                      ? 'bg-[#FFE600] text-black shadow-[3px_3px_0px_0px_#000] scale-110 animate-pulse'
                      : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {isPassed ? (
                    <Check className="w-4 h-4 stroke-[3]" />
                  ) : isCurrent ? (
                    <CircleDot className="w-4 h-4" />
                  ) : (
                    <span>{idx + 1}</span>
                  )}
                </div>

                <div className="flex flex-col">
                  <span
                    className={`text-xs font-black ${
                      isPassed
                        ? 'text-black'
                        : isCurrent
                        ? 'text-black underline decoration-2 decoration-[#FFE600]'
                        : 'text-slate-400'
                    }`}
                  >
                    {stage.label}
                  </span>
                  <span className="text-[10px] text-slate-600 font-bold">
                    {stage.sub}
                  </span>
                </div>
              </div>

              {idx < STAGES.length - 1 && (
                <div
                  className={`hidden lg:block flex-1 h-[3px] mx-2 rounded transition-colors duration-200 ${
                    isPassed ? 'bg-black' : 'bg-slate-200'
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
