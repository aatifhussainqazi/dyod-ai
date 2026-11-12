import React from 'react';
import { X, Lock, AlertTriangle, EyeOff, Trash2 } from 'lucide-react';

interface PrivacyNoticeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onClearHistory?: () => void;
}

export const PrivacyNoticeModal: React.FC<PrivacyNoticeModalProps> = ({
  isOpen,
  onClose,
  onClearHistory,
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-slate-900 border border-slate-700/80 rounded-2xl p-6 shadow-2xl relative animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <span className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Lock className="w-5 h-5" />
            </span>
            <div>
              <h3 className="font-bold text-lg text-white">Privacy & Data Handling</h3>
              <p className="text-xs text-slate-400">Academic Transparency & Student Privacy</p>
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
          <div className="p-4 rounded-xl bg-amber-950/20 border border-amber-800/40 text-amber-200 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <p className="text-xs leading-relaxed">
              <strong>Notice:</strong> DYOD AI processes your question using an external AI provider (Google Gemini Free Tier).
              <strong> Do not enter passwords, personal identifiers, confidential records, or private student information.</strong>
            </p>
          </div>

          <div className="space-y-2">
            <h4 className="font-bold text-white text-xs uppercase tracking-wider text-slate-400">
              Data Principles:
            </h4>
            <ul className="space-y-2 text-xs">
              <li className="flex items-start gap-2">
                <EyeOff className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                <span>
                  <strong>Client-Side Local History:</strong> Your conversation history is stored strictly inside your browser's localStorage. No user accounts or personal profiles are created.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <Lock className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                <span>
                  <strong>Server-Side Secret Isolation:</strong> All provider keys remain securely housed in server-side environment variables. No credentials are ever exposed to the client.
                </span>
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
          {onClearHistory && (
            <button
              onClick={() => {
                if (window.confirm('Are you sure you want to delete all stored conversations?')) {
                  onClearHistory();
                  onClose();
                }
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 text-xs font-semibold transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Clear Local History
            </button>
          )}
          <button
            onClick={onClose}
            className="ml-auto px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors"
          >
            I Understand
          </button>
        </div>
      </div>
    </div>
  );
};
