import React, { useState, useRef, useEffect } from 'react';
import { Send, CornerDownLeft, Loader2 } from 'lucide-react';

interface MessageComposerProps {
  onSend: (message: string) => void;
  isLoading: boolean;
  disabled?: boolean;
}

const MAX_CHARS = 10000;

export const MessageComposer: React.FC<MessageComposerProps> = ({
  onSend,
  isLoading,
  disabled = false,
}) => {
  const [text, setText] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea height
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const scrollHeight = textareaRef.current.scrollHeight;
      textareaRef.current.style.height = `${Math.min(scrollHeight, 180)}px`;
    }
  }, [text]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleSubmit = () => {
    if (!text.trim() || isLoading || disabled) return;
    onSend(text);
    setText('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const charCount = text.length;
  const isNearLimit = charCount > MAX_CHARS * 0.9;

  return (
    <div className="relative bg-slate-900/90 border border-slate-800 rounded-2xl p-2 sm:p-2.5 shadow-lg focus-within:border-sky-500/60 focus-within:ring-1 focus-within:ring-sky-500/30 transition-all">
      <textarea
        ref={textareaRef}
        value={text}
        onChange={(e) => setText(e.target.value.slice(0, MAX_CHARS))}
        onKeyDown={handleKeyDown}
        placeholder="Ask about your DYOD curriculum, syllabus, practicals, project evaluation..."
        disabled={isLoading || disabled}
        rows={1}
        className="w-full bg-transparent text-slate-100 placeholder-slate-500 text-sm sm:text-base outline-none resize-none px-2 py-1 max-h-[180px] leading-relaxed disabled:opacity-50"
      />

      <div className="flex items-center justify-between pt-1 px-1 border-t border-slate-800/60 text-xs">
        <div className="flex items-center gap-2 text-slate-500">
          <span className="hidden sm:inline-flex items-center gap-1 text-[11px]">
            <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-400 font-mono text-[10px]">
              Enter
            </kbd>{' '}
            send,
            <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-400 font-mono text-[10px]">
              Shift+Enter
            </kbd>{' '}
            newline
          </span>
          {isNearLimit && (
            <span className="text-[10px] text-amber-400 font-mono">
              {charCount} / {MAX_CHARS}
            </span>
          )}
        </div>

        <button
          onClick={handleSubmit}
          disabled={!text.trim() || isLoading || disabled}
          className={`inline-flex items-center justify-center p-2 rounded-xl transition-all shadow-sm ${
            text.trim() && !isLoading && !disabled
              ? 'bg-sky-500 hover:bg-sky-400 text-white hover:scale-105 active:scale-95'
              : 'bg-slate-800 text-slate-500 cursor-not-allowed'
          }`}
          title="Send message"
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin text-sky-300" />
          ) : (
            <Send className="w-4 h-4" />
          )}
        </button>
      </div>
    </div>
  );
};
