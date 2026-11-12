import React, { useEffect, useState } from 'react';
import { X, BookOpen, FileCheck, Layers, ExternalLink } from 'lucide-react';
import { KnowledgeSourceItem, SourceService } from '../services/sourceService';

interface SourcesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SourcesModal: React.FC<SourcesModalProps> = ({ isOpen, onClose }) => {
  const [sources, setSources] = useState<KnowledgeSourceItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      setIsLoading(true);
      SourceService.getSources().then((res) => {
        if (res) {
          setSources(res.sources);
        }
        setIsLoading(false);
      });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-slate-900 border border-slate-700/80 rounded-2xl p-6 shadow-2xl relative max-h-[85vh] flex flex-col animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20">
              <BookOpen className="w-5 h-5" />
            </span>
            <div>
              <h3 className="font-bold text-lg text-white">Approved Knowledge Base</h3>
              <p className="text-xs text-slate-400">
                Official DYOD Academic Materials • Indexed for Grounded Retrieval
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* List of sources */}
        <div className="overflow-y-auto py-4 space-y-3 flex-1 pr-1">
          {isLoading ? (
            <div className="text-center py-8 text-slate-400 text-sm">
              Loading approved knowledge base sources...
            </div>
          ) : sources.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-sm">
              No approved documents currently indexed.
            </div>
          ) : (
            sources.map((src) => (
              <div
                key={src.id}
                className="p-4 rounded-xl bg-slate-800/60 border border-slate-800 hover:border-slate-700 transition-colors"
              >
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <h4 className="font-semibold text-sm text-slate-100 flex items-center gap-2">
                    <FileCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                    {src.title}
                  </h4>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
                    {src.verificationStatus}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-400 mb-2">
                  <span className="text-sky-300">{src.category}</span>
                  <span>•</span>
                  <span>{src.subject}</span>
                  <span>•</span>
                  <span>{src.pageCount} Pages</span>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed">
                  {src.summary}
                </p>
              </div>
            ))
          )}
        </div>

        {/* Footer info */}
        <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <span>{sources.length} approved documents in active BM25 index</span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
