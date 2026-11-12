import React from 'react';
import { X, Sparkles, Shield, Cpu, Database, CheckCircle2 } from 'lucide-react';

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AboutModal: React.FC<AboutModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl bg-slate-900 border border-slate-700/80 rounded-2xl p-6 shadow-2xl relative max-h-[85vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <span className="p-2.5 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20">
              <Sparkles className="w-5 h-5" />
            </span>
            <div>
              <h3 className="font-bold text-lg text-white">About DYOD AI</h3>
              <p className="text-xs text-slate-400">Your Dedicated Academic Companion</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="py-4 space-y-4 text-xs sm:text-sm text-slate-300 leading-relaxed">
          <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-800">
            <h4 className="font-bold text-white mb-1.5 flex items-center gap-2">
              <Shield className="w-4 h-4 text-sky-400" />
              Academic Scope: DYOD Only
            </h4>
            <p>
              DYOD AI is exclusively designed for the <strong>Design Your Own Degree (DYOD)</strong> programme at the <strong>Islamic University of Science and Technology (IUST)</strong>. It is not an unrestricted general-purpose chatbot. It answers only questions supported by approved academic documents, and admits when it does not know something.
            </p>
          </div>

          <div className="space-y-2">
            <h4 className="font-bold text-white text-xs uppercase tracking-wider text-slate-400">
              Architecture & Guarantees:
            </h4>
            <ul className="space-y-2">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>
                  <strong>Retrieval-Augmented Generation (RAG):</strong> Every response is anchored in real document passages retrieved via local BM25 search.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>
                  <strong>₹0 Budget Target:</strong> Operates entirely on the Google Gemini Free Tier with zero paid dependencies and no automatic paid fallback.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>
                  <strong>Traceable Citations:</strong> Displays verifiable document titles, page numbers, and excerpts for academic trust.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>
                  <strong>Anti-Hallucination & Anti-Injection:</strong> Prohibits fabrication of rules, marks, or syllabus topics, resisting prompt injections.
                </span>
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-3 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
