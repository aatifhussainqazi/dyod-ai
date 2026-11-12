import React, { useState } from 'react';
import {
  Plus,
  MessageSquare,
  Trash2,
  BookOpen,
  Info,
  Shield,
  Layers,
  ChevronRight,
  Sparkles,
  Menu,
  X,
} from 'lucide-react';
import { ChatSession } from '../types/chat';

interface SidebarProps {
  sessions: ChatSession[];
  activeSessionId: string;
  onSelectSession: (id: string) => void;
  onNewChat: () => void;
  onDeleteSession: (id: string) => void;
  onClearAll: () => void;
  onOpenSources: () => void;
  onOpenAbout: () => void;
  onOpenPrivacy: () => void;
  isOpen: boolean;
  onClose: () => void;
}

const DYOD_BASKETS_QUICK = [
  { id: '1', name: 'Natural Sciences', color: '#10b981' },
  { id: '2', name: 'Mathematical Sciences', color: '#f59e0b' },
  { id: '3', name: 'Computing & Data Science', color: '#0ea5e9' },
  { id: '4', name: 'Humanities & Social Sciences', color: '#8b5cf6' },
  { id: '5', name: 'Engineering & Technology', color: '#f43f5e' },
  { id: '6', name: 'Earth & Sustainability', color: '#22c55e' },
  { id: '7', name: 'Design & Business', color: '#fb923c' },
  { id: '8', name: 'Wellness & Health', color: '#eab308' },
];

export const Sidebar: React.FC<SidebarProps> = ({
  sessions,
  activeSessionId,
  onSelectSession,
  onNewChat,
  onDeleteSession,
  onClearAll,
  onOpenSources,
  onOpenAbout,
  onOpenPrivacy,
  isOpen,
  onClose,
}) => {
  const [showBaskets, setShowBaskets] = useState(false);

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed lg:static top-0 bottom-0 left-0 z-50 w-72 sm:w-80 bg-[#080d1a] border-r border-slate-800 flex flex-col transition-transform duration-200 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Brand Header */}
        <div className="p-4 border-b border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-sky-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-sky-900/30 font-extrabold text-base border border-sky-400/20">
              DY
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-base tracking-tight text-white">
                  DYOD AI
                </span>
                <span className="text-[10px] font-bold text-sky-400 bg-sky-500/10 px-1.5 py-0.5 rounded border border-sky-500/20">
                  IUST
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium">Academic Companion</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 lg:hidden"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* New Chat Button */}
        <div className="p-3">
          <button
            onClick={() => {
              onNewChat();
              onClose();
            }}
            className="w-full py-2.5 px-3.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-sm transition-all hover:scale-[1.01] active:scale-[0.99]"
          >
            <Plus className="w-4 h-4" />
            <span>New Conversation</span>
          </button>
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-2 py-1">
            Recent Conversations
          </div>

          {sessions.length === 0 ? (
            <div className="text-xs text-slate-400 px-3 py-4 text-center">
              No recent conversations
            </div>
          ) : (
            sessions.map((s) => {
              const isActive = s.id === activeSessionId;
              return (
                <div
                  key={s.id}
                  className={`group relative flex items-center justify-between rounded-xl px-3 py-2 text-xs transition-colors cursor-pointer ${
                    isActive
                      ? 'bg-slate-800/90 text-white font-medium border border-slate-700/80 shadow-sm'
                      : 'text-slate-400 hover:bg-slate-800/40 hover:text-slate-200 border border-transparent'
                  }`}
                  onClick={() => {
                    onSelectSession(s.id);
                    onClose();
                  }}
                >
                  <div className="flex items-center gap-2.5 truncate flex-1 mr-2">
                    <MessageSquare
                      className={`w-3.5 h-3.5 shrink-0 ${
                        isActive ? 'text-sky-400' : 'text-slate-400'
                      }`}
                    />
                    <span className="truncate">{s.title || 'Conversation'}</span>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteSession(s.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-rose-400 transition-opacity"
                    title="Delete chat"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* 8 Baskets Drawer Toggle */}
        <div className="px-3 py-2 border-t border-slate-800/80">
          <button
            onClick={() => setShowBaskets(!showBaskets)}
            className="w-full flex items-center justify-between p-2 rounded-xl text-xs text-slate-300 hover:bg-slate-800/50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Layers className="w-3.5 h-3.5 text-sky-400" />
              <span className="font-medium">8 Academic Baskets</span>
            </div>
            <ChevronRight
              className={`w-3.5 h-3.5 transition-transform duration-200 text-slate-400 ${
                showBaskets ? 'rotate-90' : ''
              }`}
            />
          </button>

          {showBaskets && (
            <div className="mt-1.5 pl-3 pr-1 py-1 space-y-1.5 text-[11px] max-h-36 overflow-y-auto">
              {DYOD_BASKETS_QUICK.map((b) => (
                <div key={b.id} className="flex items-center gap-2 text-slate-400">
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: b.color }}
                  />
                  <span className="truncate">
                    {b.id}. {b.name}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Bottom Utility Actions */}
        <div className="p-3 border-t border-slate-800/80 space-y-1 text-xs">
          <button
            onClick={() => {
              onOpenSources();
              onClose();
            }}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-slate-300 hover:bg-slate-800/60 hover:text-white transition-colors"
          >
            <BookOpen className="w-3.5 h-3.5 text-sky-400" />
            <span>Approved Sources</span>
          </button>

          <button
            onClick={() => {
              onOpenAbout();
              onClose();
            }}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-slate-300 hover:bg-slate-800/60 hover:text-white transition-colors"
          >
            <Info className="w-3.5 h-3.5 text-indigo-400" />
            <span>About DYOD AI</span>
          </button>

          <button
            onClick={() => {
              onOpenPrivacy();
              onClose();
            }}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-slate-300 hover:bg-slate-800/60 hover:text-white transition-colors"
          >
            <Shield className="w-3.5 h-3.5 text-emerald-400" />
            <span>Privacy & Terms</span>
          </button>
        </div>
      </aside>
    </>
  );
};
