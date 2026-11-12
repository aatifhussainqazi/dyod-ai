import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  Copy,
  Check,
  RotateCw,
  ShieldCheck,
  AlertCircle,
  HelpCircle,
  BookOpen,
  User,
  Bot,
} from 'lucide-react';
import { ChatMessage, Citation } from '../types/chat';
import { CitationCard } from './CitationCard';

interface MessageBubbleProps {
  message: ChatMessage;
  isLast: boolean;
  onRetry?: () => void;
  onCitationClick: (citation: Citation) => void;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  isLast,
  onRetry,
  onCitationClick,
}) => {
  const [copied, setCopied] = useState(false);
  const isUser = message.sender === 'user';

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  if (isUser) {
    return (
      <div className="flex justify-end my-4 animate-in fade-in duration-150">
        <div className="max-w-[85%] sm:max-w-[75%] rounded-2xl rounded-tr-sm bg-gradient-to-br from-sky-600 to-dyod-700 text-white px-4 py-3 shadow-md border border-sky-500/30">
          <p className="whitespace-pre-wrap text-sm sm:text-base leading-relaxed font-normal">
            {message.content}
          </p>
        </div>
      </div>
    );
  }

  // Assistant message
  const isGrounded = message.grounded && message.status === 'answered';
  const isOutOfScope = message.status === 'out_of_scope';
  const isInsufficient = message.status === 'insufficient_sources';
  const isError = message.status === 'error' || message.status === 'temporarily_unavailable';

  return (
    <div className="flex gap-3 sm:gap-4 my-4 animate-in fade-in duration-200">
      {/* Bot Avatar */}
      <div className="w-8 h-8 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0 mt-0.5 text-sky-400 shadow-sm">
        <Bot className="w-4 h-4" />
      </div>

      <div className="flex-1 max-w-[92%] sm:max-w-[85%]">
        {/* Status pill header */}
        <div className="flex items-center gap-2 mb-2">
          {isGrounded && (
            <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
              <ShieldCheck className="w-3 h-3" /> Grounded in DYOD Sources
            </span>
          )}
          {isOutOfScope && (
            <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
              <AlertCircle className="w-3 h-3" /> Out of Academic Scope
            </span>
          )}
          {isInsufficient && (
            <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded-full border border-sky-500/20">
              <HelpCircle className="w-3 h-3" /> Source Material Insufficient
            </span>
          )}
          {isError && (
            <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-full border border-rose-500/20">
              <AlertCircle className="w-3 h-3" /> Service Limitation
            </span>
          )}
        </div>

        {/* Message Content Container */}
        <div
          className={`rounded-2xl rounded-tl-sm p-4 sm:p-5 border shadow-sm transition-all ${
            isOutOfScope
              ? 'bg-amber-950/20 border-amber-800/40 text-amber-200'
              : isInsufficient
              ? 'bg-slate-900/80 border-slate-700/70 text-slate-200'
              : isError
              ? 'bg-rose-950/20 border-rose-800/40 text-rose-200'
              : 'bg-slate-900/90 border-slate-800 text-slate-100'
          }`}
        >
          <div className="prose-dyod">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>
          </div>

          {/* Citations section if any */}
          {message.citations && message.citations.length > 0 && (
            <div className="mt-5 pt-3.5 border-t border-slate-800/80">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-sky-400" />
                Approved Sources Used ({message.citations.length})
              </div>
              <div className="flex flex-wrap gap-2">
                {message.citations.map((c, idx) => (
                  <CitationCard key={idx} citation={c} onClick={onCitationClick} />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Action bar (Copy, Retry, timestamp) */}
        <div className="flex items-center gap-2 mt-2 px-1 text-slate-400 text-xs">
          <button
            onClick={handleCopy}
            className="inline-flex items-center gap-1 p-1 hover:text-slate-200 hover:bg-slate-800/60 rounded-md transition-colors"
            title="Copy response"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400 text-[11px]">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span className="text-[11px]">Copy</span>
              </>
            )}
          </button>

          {isLast && onRetry && (
            <button
              onClick={onRetry}
              className="inline-flex items-center gap-1 p-1 hover:text-slate-200 hover:bg-slate-800/60 rounded-md transition-colors"
              title="Regenerate response"
            >
              <RotateCw className="w-3.5 h-3.5" />
              <span className="text-[11px]">Retry</span>
            </button>
          )}

          <span className="text-[10px] text-slate-500 ml-auto">
            {new Date(message.timestamp).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
        </div>
      </div>
    </div>
  );
};
