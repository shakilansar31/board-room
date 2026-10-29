import React from 'react';
import { Shield, IndianRupee, TrendingUp, Cpu, Wrench, CheckCircle, AlertTriangle } from 'lucide-react';

export interface ExecutiveInfo {
  id: 'ceo' | 'cfo' | 'cmo' | 'coo' | 'cto';
  title: string;
  name: string;
  domain: string;
  focus: string;
  avatarBg: string;
  iconColor: string;
}

export const EXECUTIVES: Record<string, ExecutiveInfo> = {
  ceo: {
    id: 'ceo',
    title: 'CEO & Moderator',
    name: 'Elena Vance',
    domain: 'Strategy & Synthesis',
    focus: 'Problem framing, executive agenda, and definitive decision synthesis',
    avatarBg: 'bg-purple-50 border-purple-200 text-purple-700',
    iconColor: 'text-purple-700'
  },
  cfo: {
    id: 'cfo',
    title: 'Chief Financial Officer',
    name: 'Marcus Sterling',
    domain: 'Financial Runway (₹)',
    focus: 'Cash burn, unit economics, payback periods, and capital risk',
    avatarBg: 'bg-emerald-50 border-emerald-200 text-emerald-700',
    iconColor: 'text-emerald-700'
  },
  cmo: {
    id: 'cmo',
    title: 'Chief Marketing Officer',
    name: 'Sophia Chen',
    domain: 'Customer & Growth',
    focus: 'CAC/LTV payback, target market positioning, and demand generation',
    avatarBg: 'bg-amber-50 border-amber-200 text-amber-700',
    iconColor: 'text-amber-700'
  },
  coo: {
    id: 'coo',
    title: 'Chief Operating Officer',
    name: 'David Keller',
    domain: 'Operations & Capacity',
    focus: 'Execution friction, supply chain logistics, and team bandwidth',
    avatarBg: 'bg-sky-50 border-sky-200 text-sky-700',
    iconColor: 'text-sky-700'
  },
  cto: {
    id: 'cto',
    title: 'Chief Technology Officer',
    name: 'Dr. Tariq Al-Mansoor',
    domain: 'Tech Architecture',
    focus: 'System feasibility, APIs, SaaS vs custom software, and tech debt',
    avatarBg: 'bg-orange-50 border-orange-200 text-orange-700',
    iconColor: 'text-orange-700'
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
      case 'ceo': return <Shield className={`w-4 h-4 ${info.iconColor} stroke-[2.2]`} />;
      case 'cfo': return <IndianRupee className={`w-4 h-4 ${info.iconColor} stroke-[2.2]`} />;
      case 'cmo': return <TrendingUp className={`w-4 h-4 ${info.iconColor} stroke-[2.2]`} />;
      case 'coo': return <Wrench className={`w-4 h-4 ${info.iconColor} stroke-[2.2]`} />;
      case 'cto': return <Cpu className={`w-4 h-4 ${info.iconColor} stroke-[2.2]`} />;
    }
  };

  return (
    <div
      onClick={selectable && onToggleSelect ? onToggleSelect : undefined}
      className={`relative rounded-xl border p-3.5 transition-all duration-200 flex flex-col justify-between h-full bg-white ${
        selectable ? 'cursor-pointer hover:border-slate-300' : ''
      } ${
        isSpeaking
          ? 'border-slate-900 shadow-md ring-2 ring-slate-900/10'
          : hasSpoken
          ? 'border-slate-200 shadow-sm opacity-100'
          : isSelected
          ? 'border-slate-200 shadow-sm'
          : 'opacity-40 border-dashed border-slate-300'
      }`}
    >
      {/* Speaking Indicator Badge */}
      {isSpeaking && (
        <span className="absolute -top-2.5 right-3 flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide bg-slate-900 text-white shadow-sm">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
          Speaking
        </span>
      )}

      {/* Header */}
      <div>
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className={`w-8 h-8 rounded-lg border flex items-center justify-center shrink-0 ${info.avatarBg}`}>
              {getIcon()}
            </div>
            <div className="min-w-0">
              <h4 className="text-xs font-semibold text-slate-900 truncate flex items-center gap-1">
                {info.title}
                {hasSpoken && !isSpeaking && (
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                )}
              </h4>
              <p className="text-[11px] text-slate-500 truncate">{info.name}</p>
            </div>
          </div>

          {selectable && (
            <input
              type="checkbox"
              checked={isSelected}
              onChange={() => {}}
              className="w-3.5 h-3.5 rounded text-slate-900 border-slate-300 mt-1 cursor-pointer accent-slate-900"
            />
          )}
        </div>

        {/* Focus description */}
        <p className="text-[11px] text-slate-600 mt-2.5 line-clamp-2 leading-relaxed">
          {info.focus}
        </p>
      </div>

      {confidence && (
        <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center gap-1.5 text-[10px] text-slate-500 font-medium">
          <AlertTriangle className="w-3 h-3 text-amber-500 shrink-0" />
          <span className="truncate">{confidence}</span>
        </div>
      )}
    </div>
  );
};
