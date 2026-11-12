import React from 'react';
import { Sparkles, FileText, GraduationCap, Zap, ListOrdered, Scale } from 'lucide-react';
import { AnswerStyle } from '../types/chat';

interface AnswerStyleSelectorProps {
  currentStyle: AnswerStyle;
  onSelectStyle: (style: AnswerStyle) => void;
  disabled?: boolean;
}

const STYLES: Array<{
  id: AnswerStyle;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  tooltip: string;
}> = [
  { id: 'detailed', label: 'Detailed Explanation', icon: FileText, tooltip: 'Full academic depth with comprehensive definitions' },
  { id: 'simple', label: 'Simple Language', icon: Sparkles, tooltip: 'Clear, everyday terms and accessible analogies' },
  { id: 'exam', label: 'Exam-Oriented', icon: GraduationCap, tooltip: 'Structured academic answer with headings and key points' },
  { id: 'quick', label: 'Quick Revision', icon: Zap, tooltip: 'High-yield summary bullet points and definitions' },
  { id: 'step-by-step', label: 'Step-by-Step', icon: ListOrdered, tooltip: 'Sequential breakdown without skipping steps' },
  { id: 'comparison', label: 'Comparison', icon: Scale, tooltip: 'Comparative contrast table based on source facts' },
];

export const AnswerStyleSelector: React.FC<AnswerStyleSelectorProps> = ({
  currentStyle,
  onSelectStyle,
  disabled = false,
}) => {
  return (
    <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 pt-1 text-xs no-scrollbar">
      <span className="text-[11px] font-semibold text-slate-400 shrink-0 mr-1 hidden sm:inline">
        Answer Style:
      </span>
      {STYLES.map((style) => {
        const Icon = style.icon;
        const isActive = currentStyle === style.id;
        return (
          <button
            key={style.id}
            onClick={() => onSelectStyle(style.id)}
            disabled={disabled}
            title={style.tooltip}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full whitespace-nowrap transition-all border font-medium text-xs ${
              isActive
                ? 'bg-sky-500/15 border-sky-500/50 text-sky-300 shadow-sm'
                : 'bg-slate-900/60 hover:bg-slate-800/80 border-slate-800 hover:border-slate-700 text-slate-400 hover:text-slate-200'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-sky-400' : 'text-slate-400'}`} />
            <span>{style.label}</span>
          </button>
        );
      })}
    </div>
  );
};
