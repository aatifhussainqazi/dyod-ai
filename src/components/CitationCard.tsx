import React from 'react';
import { BookOpen, FileText } from 'lucide-react';
import { Citation } from '../types/chat';

interface CitationCardProps {
  citation: Citation;
  onClick: (citation: Citation) => void;
}

export const CitationCard: React.FC<CitationCardProps> = ({ citation, onClick }) => {
  return (
    <button
      onClick={() => onClick(citation)}
      className="inline-flex items-center gap-2 text-left bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/80 hover:border-sky-500/50 rounded-xl px-3 py-1.5 transition-all group text-xs text-slate-300 shadow-sm"
      title="Click to view source excerpt"
    >
      <span className="p-1 rounded-md bg-sky-500/10 text-sky-400 group-hover:bg-sky-500/20 transition-colors">
        <FileText className="w-3.5 h-3.5" />
      </span>
      <div className="flex flex-col truncate max-w-[220px] sm:max-w-[280px]">
        <span className="font-semibold text-slate-200 group-hover:text-sky-300 truncate transition-colors">
          {citation.documentTitle}
        </span>
        <span className="text-[11px] text-slate-400 flex items-center gap-1.5 truncate">
          {citation.page && <span>p. {citation.page}</span>}
          {citation.page && citation.section && <span>•</span>}
          {citation.section && <span className="truncate">{citation.section}</span>}
        </span>
      </div>
    </button>
  );
};
