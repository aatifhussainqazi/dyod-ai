import React from 'react';
import { X, BookOpen, FileCheck, Layers } from 'lucide-react';
import { Citation } from '../types/chat';

interface CitationModalProps {
  citation: Citation | null;
  onClose: () => void;
}

export const CitationModal: React.FC<CitationModalProps> = ({ citation, onClose }) => {
  if (!citation) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl bg-slate-900 border border-slate-700/80 rounded-2xl p-6 shadow-2xl relative animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-4 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <span className="p-2.5 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20">
              <BookOpen className="w-5 h-5" />
            </span>
            <div>
              <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 mb-1">
                <FileCheck className="w-3 h-3" /> Approved DYOD Source
              </span>
              <h3 className="font-bold text-base sm:text-lg text-white">
                {citation.documentTitle}
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Metadata pills */}
        <div className="flex flex-wrap items-center gap-2 mb-4 text-xs">
          {citation.page && (
            <span className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 border border-slate-700 font-mono">
              Page {citation.page}
            </span>
          )}
          {citation.section && (
            <span className="px-2.5 py-1 rounded-lg bg-slate-800 text-sky-300 border border-slate-700 truncate max-w-[280px]">
              Section: {citation.section}
            </span>
          )}
          {citation.category && (
            <span className="px-2.5 py-1 rounded-lg bg-slate-800 text-indigo-300 border border-slate-700">
              {citation.category}
            </span>
          )}
        </div>

        {/* Snippet Content */}
        <div className="bg-[#080d1a] border border-slate-800 rounded-xl p-4 text-sm text-slate-300 leading-relaxed font-sans mb-4 max-h-[40vh] overflow-y-auto">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5" /> Retrieved Academic Excerpt
          </div>
          <p className="whitespace-pre-wrap">{citation.snippet || 'No excerpt available.'}</p>
        </div>

        <p className="text-[11px] text-slate-500 italic mb-4">
          Note: This academic excerpt was retrieved from the approved DYOD curriculum repository at IUST.
        </p>

        <div className="flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors"
          >
            Close Excerpt
          </button>
        </div>
      </div>
    </div>
  );
};
