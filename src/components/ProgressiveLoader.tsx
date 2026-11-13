import React, { useState, useEffect } from 'react';
import { Bot, RefreshCw, XCircle } from 'lucide-react';

interface ProgressiveLoaderProps {
  onCancel?: () => void;
}

const STAGES = [
  { text: 'Understanding your question...', minTime: 0 },
  { text: 'Searching approved DYOD materials...', minTime: 1400 },
  { text: 'Checking relevant source passages...', minTime: 3200 },
  { text: 'Preparing your explanation...', minTime: 5200 },
];

export const ProgressiveLoader: React.FC<ProgressiveLoaderProps> = ({ onCancel }) => {
  const [stageIndex, setStageIndex] = useState(0);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const startTime = Date.now();
    const interval = setInterval(() => {
      const ms = Date.now() - startTime;
      setElapsed(Math.floor(ms / 1000));

      if (ms >= 5200) {
        setStageIndex(3);
      } else if (ms >= 3200) {
        setStageIndex(2);
      } else if (ms >= 1400) {
        setStageIndex(1);
      } else {
        setStageIndex(0);
      }
    }, 200);

    return () => clearInterval(interval);
  }, []);

  const currentStage = STAGES[stageIndex];
  const isTakingLong = elapsed >= 15;

  return (
    <div className="flex gap-3 sm:gap-4 my-4 animate-in fade-in duration-200">
      <div className="w-8 h-8 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0 mt-0.5 text-sky-400 shadow-sm">
        <Bot className="w-4 h-4" />
      </div>

      <div className="rounded-2xl rounded-tl-sm p-4 bg-slate-900/90 border border-slate-800 text-slate-300 text-xs sm:text-sm space-y-2 max-w-lg shadow-md">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 shrink-0">
            <span
              className={`w-2 h-2 rounded-full transition-all duration-300 ${
                stageIndex >= 0 ? 'bg-sky-400 animate-pulse' : 'bg-slate-600'
              }`}
            />
            <span
              className={`w-2 h-2 rounded-full transition-all duration-300 ${
                stageIndex >= 1 ? 'bg-sky-400 animate-pulse' : 'bg-slate-700'
              }`}
              style={{ animationDelay: '150ms' }}
            />
            <span
              className={`w-2 h-2 rounded-full transition-all duration-300 ${
                stageIndex >= 2 ? 'bg-sky-400 animate-pulse' : 'bg-slate-800'
              }`}
              style={{ animationDelay: '300ms' }}
            />
            <span
              className={`w-2 h-2 rounded-full transition-all duration-300 ${
                stageIndex >= 3 ? 'bg-indigo-400 animate-pulse' : 'bg-slate-800'
              }`}
              style={{ animationDelay: '450ms' }}
            />
          </div>

          <span className="font-medium text-slate-200 text-xs sm:text-sm transition-all duration-300">
            {currentStage.text}
          </span>
        </div>

        {/* Multi-step progress bar */}
        <div className="w-full bg-slate-800/80 rounded-full h-1 overflow-hidden">
          <div
            className="bg-gradient-to-r from-sky-500 to-indigo-500 h-1 transition-all duration-500 ease-out"
            style={{ width: `${Math.min(100, (stageIndex + 1) * 25)}%` }}
          />
        </div>

        {isTakingLong && (
          <div className="flex items-center justify-between pt-1 text-[11px] text-amber-400/90 border-t border-slate-800/60">
            <span>Formulating comprehensive grounded response ({elapsed}s)...</span>
            {onCancel && (
              <button
                onClick={onCancel}
                className="inline-flex items-center gap-1 text-slate-400 hover:text-rose-400 transition-colors ml-2 px-1.5 py-0.5 rounded hover:bg-slate-800"
              >
                <XCircle className="w-3 h-3" />
                <span>Cancel</span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
