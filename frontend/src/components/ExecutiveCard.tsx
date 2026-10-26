import React from 'react';
import { Shield, IndianRupee, TrendingUp, Cpu, Wrench, CheckCircle, AlertTriangle } from 'lucide-react';

export interface ExecutiveInfo {
  id: 'ceo' | 'cfo' | 'cmo' | 'coo' | 'cto';
  title: string;
  name: string;
  domain: string;
  focus: string;
  bgColor: string;
}

export const EXECUTIVES: Record<string, ExecutiveInfo> = {
  ceo: {
    id: 'ceo',
    title: 'CEO & Chief of Staff',
    name: 'Elena Vance',
    domain: 'Executive Moderation',
    focus: 'Problem clarification, agenda setting, and synthesis',
    bgColor: 'bg-[#E9D5FF]' // Neo Purple
  },
  cfo: {
    id: 'cfo',
    title: 'Chief Financial Officer',
    name: 'Marcus Sterling',
    domain: 'Financial Intelligence',
    focus: 'Runway, unit margins, cash caveats in ₹ INR, and capital discipline',
    bgColor: 'bg-[#A7F3D0]' // Neo Mint
  },
  cmo: {
    id: 'cmo',
    title: 'Chief Marketing Officer',
    name: 'Sophia Chen',
    domain: 'Customer & Growth',
    focus: 'Positioning, CAC/LTV payback, demand generation, and branding',
    bgColor: 'bg-[#FEF08A]' // Neo Yellow
  },
  coo: {
    id: 'coo',
    title: 'Chief Operating Officer',
    name: 'David Keller',
    domain: 'Operations & Execution',
    focus: 'Capacity constraints, fulfillment, vendor SLAs, and efficiency',
    bgColor: 'bg-[#BAE6FD]' // Neo Blue
  },
  cto: {
    id: 'cto',
    title: 'Chief Technology Officer',
    name: 'Dr. Tariq Al-Mansoor',
    domain: 'Technology & Feasibility',
    focus: 'Architecture, off-the-shelf vs custom, APIs, and technical debt',
    bgColor: 'bg-[#FED7AA]' // Neo Orange
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
      case 'ceo': return <Shield className="w-5 h-5 text-black" />;
      case 'cfo': return <IndianRupee className="w-5 h-5 text-black" />;
      case 'cmo': return <TrendingUp className="w-5 h-5 text-black" />;
      case 'coo': return <Wrench className="w-5 h-5 text-black" />;
      case 'cto': return <Cpu className="w-5 h-5 text-black" />;
    }
  };

  return (
    <div
      onClick={selectable && onToggleSelect ? onToggleSelect : undefined}
      className={`relative rounded-xl border-[2.5px] border-black p-4 transition-all duration-200 ${
        selectable ? 'cursor-pointer hover:-translate-y-1' : ''
      } ${info.bgColor} ${
        isSpeaking
          ? 'shadow-[6px_6px_0px_0px_#000] scale-[1.03] ring-4 ring-black z-10'
          : hasSpoken
          ? 'shadow-[4px_4px_0px_0px_#000] opacity-100'
          : isSelected
          ? 'shadow-[4px_4px_0px_0px_#000]'
          : 'opacity-40 grayscale shadow-none border-dashed'
      }`}
    >
      {/* Speaking Indicator Badge */}
      {isSpeaking && (
        <span className="absolute -top-3 right-2 flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-black text-yellow-300 border-2 border-black shadow-[2px_2px_0px_0px_#000] animate-bounce">
          <span className="w-2 h-2 rounded-full bg-yellow-300 animate-ping" />
          Speaking Now
        </span>
      )}

      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-white border-2 border-black shadow-[2px_2px_0px_0px_#000] flex items-center justify-center">
            {getIcon()}
          </div>
          <div>
            <h4 className="text-xs font-black text-black tracking-tight flex items-center gap-1.5">
              {info.title}
              {hasSpoken && !isSpeaking && (
                <span title="Contributed">
                  <CheckCircle className="w-3.5 h-3.5 text-black fill-emerald-400" />
                </span>
              )}
            </h4>
            <p className="text-[11px] text-black/80 font-bold">{info.name}</p>
          </div>
        </div>

        {selectable && (
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => {}}
            className="w-4 h-4 rounded text-black focus:ring-0 bg-white border-2 border-black mt-1 pointer-events-none accent-black cursor-pointer"
          />
        )}
      </div>

      {/* Focus & Confidence */}
      <div className="mt-3 pt-2.5 border-t-2 border-black/80">
        <p className="text-[11px] text-black font-semibold line-clamp-2 leading-relaxed">
          {info.focus}
        </p>

        {confidence && (
          <div className="mt-2 flex items-center gap-1.5 text-[10px] font-bold text-black bg-white border-2 border-black px-2 py-1 rounded-md shadow-[2px_2px_0px_0px_#000]">
            <AlertTriangle className="w-3 h-3 shrink-0" />
            <span className="truncate">{confidence}</span>
          </div>
        )}
      </div>
    </div>
  );
};
