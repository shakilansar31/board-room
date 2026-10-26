import React from 'react';
import { Shield, DollarSign, TrendingUp, Cpu, Wrench, CheckCircle, AlertTriangle } from 'lucide-react';

export interface ExecutiveInfo {
  id: 'ceo' | 'cfo' | 'cmo' | 'coo' | 'cto';
  title: string;
  name: string;
  domain: string;
  focus: string;
}

export const EXECUTIVES: Record<string, ExecutiveInfo> = {
  ceo: {
    id: 'ceo',
    title: 'CEO & Chief of Staff',
    name: 'Elena Vance',
    domain: 'Executive Moderation',
    focus: 'Problem clarification, agenda setting, and synthesis'
  },
  cfo: {
    id: 'cfo',
    title: 'Chief Financial Officer',
    name: 'Marcus Sterling',
    domain: 'Financial Intelligence',
    focus: 'Runway, unit margins, cash caveats, and capital discipline'
  },
  cmo: {
    id: 'cmo',
    title: 'Chief Marketing Officer',
    name: 'Sophia Chen',
    domain: 'Customer & Growth',
    focus: 'Positioning, CAC/LTV, demand generation, and branding'
  },
  coo: {
    id: 'coo',
    title: 'Chief Operating Officer',
    name: 'David Keller',
    domain: 'Operations & Execution',
    focus: 'Capacity constraints, fulfillment, vendor SLAs, and efficiency'
  },
  cto: {
    id: 'cto',
    title: 'Chief Technology Officer',
    name: 'Dr. Tariq Al-Mansoor',
    domain: 'Technology & Feasibility',
    focus: 'Architecture, off-the-shelf vs custom, APIs, and technical debt'
  }
};

interface ExecutiveCardProps {
  id: 'ceo' | 'cfo' | 'cmo' | 'coo' | 'cto';
  isSpeaking: boolean;
  hasSpoken: boolean;
  confidence?: string;
  isSelected?: boolean;
  onToggleSelect?: () => void;
  selectable?: boolean;
}

export const ExecutiveCard: React.FC<ExecutiveCardProps> = ({
  id,
  isSpeaking,
  hasSpoken,
  confidence,
  isSelected = true,
  onToggleSelect,
  selectable = false
}) => {
  const info = EXECUTIVES[id] || EXECUTIVES.ceo;

  const getIcon = () => {
    switch (id) {
      case 'ceo': return <Shield className="w-5 h-5 text-indigo-400" />;
      case 'cfo': return <DollarSign className="w-5 h-5 text-emerald-400" />;
      case 'cmo': return <TrendingUp className="w-5 h-5 text-amber-400" />;
      case 'coo': return <Wrench className="w-5 h-5 text-blue-400" />;
      case 'cto': return <Cpu className="w-5 h-5 text-purple-400" />;
    }
  };

  return (
    <div
      onClick={selectable && onToggleSelect ? onToggleSelect : undefined}
      className={`relative rounded-xl border p-4 transition-all duration-300 ${
        selectable ? 'cursor-pointer' : ''
      } ${
        isSpeaking
          ? 'bg-slate-900 border-blue-500 shadow-lg shadow-blue-500/20 ring-2 ring-blue-500/50 scale-[1.02]'
          : hasSpoken
          ? 'bg-slate-900/90 border-slate-700/80 shadow'
          : isSelected
          ? 'bg-slate-950/80 border-slate-800 hover:border-slate-700'
          : 'bg-slate-950/40 border-slate-900 opacity-60'
      }`}
    >
      {/* Speaking Indicator Badge */}
      {isSpeaking && (
        <span className="absolute -top-2.5 right-3 flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-600 text-white shadow-md animate-pulse">
          <span className="w-2 h-2 rounded-full bg-white animate-ping" />
          Active Speaker
        </span>
      )}

      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-slate-800/90 border border-slate-700/60 flex items-center justify-center">
            {getIcon()}
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              {info.title}
              {hasSpoken && !isSpeaking && (
                <span title="Contributed">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                </span>
              )}
            </h4>
            <p className="text-xs text-slate-400 font-medium">{info.name}</p>
          </div>
        </div>

        {selectable && (
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => {}}
            className="w-4 h-4 rounded text-blue-600 focus:ring-0 bg-slate-800 border-slate-700 mt-1 pointer-events-none"
          />
        )}
      </div>

      {/* Focus & Confidence */}
      <div className="mt-3 pt-2.5 border-t border-slate-800/80">
        <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
          {info.focus}
        </p>

        {confidence && (
          <div className="mt-2 flex items-center gap-1.5 text-[10px] text-amber-300/90 bg-amber-950/40 border border-amber-800/40 px-2 py-1 rounded">
            <AlertTriangle className="w-3 h-3 shrink-0" />
            <span className="truncate">{confidence}</span>
          </div>
        )}
      </div>
    </div>
  );
};
