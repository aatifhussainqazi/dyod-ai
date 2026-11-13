import React, { useState, useRef, useEffect } from 'react';
import { Menu, Plus, Trash2, Bot, Sparkles, BookOpen, ShieldCheck } from 'lucide-react';
import { useChat } from './hooks/useChat';
import { Sidebar } from './components/Sidebar';
import { WelcomeScreen } from './components/WelcomeScreen';
import { MessageBubble } from './components/MessageBubble';
import { MessageComposer } from './components/MessageComposer';
import { AnswerStyleSelector } from './components/AnswerStyleSelector';
import { ProgressiveLoader } from './components/ProgressiveLoader';
import { CitationModal } from './components/CitationModal';
import { SourcesModal } from './components/SourcesModal';
import { AboutModal } from './components/AboutModal';
import { PrivacyNoticeModal } from './components/PrivacyNoticeModal';

export const App: React.FC = () => {
  const {
    sessions,
    activeSession,
    isLoading,
    selectedCitation,
    setSelectedCitation,
    sendMessage,
    setAnswerStyle,
    startNewChat,
    switchSession,
    deleteSession,
    clearCurrentChat,
    retryLastMessage,
    cancelCurrentRequest,
  } = useChat();

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSourcesOpen, setIsSourcesOpen] = useState(false);
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const [isPrivacyOpen, setIsPrivacyOpen] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeSession.messages, isLoading]);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#0c1222] text-slate-100 font-sans">
      {/* Navigation Sidebar */}
      <Sidebar
        sessions={sessions}
        activeSessionId={activeSession.id}
        onSelectSession={switchSession}
        onNewChat={startNewChat}
        onDeleteSession={deleteSession}
        onClearAll={clearCurrentChat}
        onOpenSources={() => setIsSourcesOpen(true)}
        onOpenAbout={() => setIsAboutOpen(true)}
        onOpenPrivacy={() => setIsPrivacyOpen(true)}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      {/* Main Chat Workspace */}
      <main className="flex-1 flex flex-col h-full min-w-0 relative">
        {/* Top Header */}
        <header className="h-14 sm:h-16 border-b border-slate-800 bg-[#080d1a]/80 backdrop-blur-md px-3 sm:px-6 flex items-center justify-between shrink-0 z-10">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 lg:hidden"
              title="Open menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-sm sm:text-base text-white truncate max-w-[200px] sm:max-w-md">
                  {activeSession.title || 'DYOD Academic Companion'}
                </h2>
                <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                  <ShieldCheck className="w-3 h-3" /> Grounded RAG
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block">
                Design Your Own Degree • Islamic University of Science & Technology
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={startNewChat}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New</span>
            </button>

            {activeSession.messages.length > 0 && (
              <button
                onClick={() => {
                  if (window.confirm('Clear all messages in this conversation?')) {
                    clearCurrentChat();
                  }
                }}
                className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                title="Clear current conversation"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </header>

        {/* Scrollable Message Container */}
        <div className="flex-1 overflow-y-auto px-3 sm:px-6 py-4">
          <div className="max-w-4xl mx-auto h-full flex flex-col">
            {activeSession.messages.length === 0 ? (
              <WelcomeScreen onSelectQuestion={(q) => sendMessage(q)} />
            ) : (
              <div className="flex-1 space-y-4">
                {activeSession.messages.map((msg, index) => (
                  <MessageBubble
                    key={msg.id || index}
                    message={msg}
                    isLast={index === activeSession.messages.length - 1}
                    onRetry={retryLastMessage}
                    onCitationClick={(cit) => setSelectedCitation(cit)}
                  />
                ))}

                {/* Multi-stage progressive loading indicator */}
                {isLoading && (
                  <ProgressiveLoader onCancel={cancelCurrentRequest} />
                )}

                <div ref={messagesEndRef} />
              </div>
            )}
          </div>
        </div>

        {/* Composer Footer */}
        <footer className="p-3 sm:p-5 border-t border-slate-800/80 bg-[#080d1a]/95 backdrop-blur-md shrink-0">
          <div className="max-w-4xl mx-auto space-y-2">
            {/* Answer Style Selector */}
            <AnswerStyleSelector
              currentStyle={activeSession.currentStyle}
              onSelectStyle={setAnswerStyle}
              disabled={isLoading}
            />

            {/* Input composer */}
            <MessageComposer
              onSend={sendMessage}
              isLoading={isLoading}
              disabled={false}
            />

            <div className="flex items-center justify-between px-2 text-[11px] text-slate-400">
              <span className="truncate">
                DYOD AI answers exclusively from approved academic materials.
              </span>
              <button
                onClick={() => setIsPrivacyOpen(true)}
                className="underline hover:text-slate-200 transition-colors shrink-0 ml-2"
              >
                Privacy notice
              </button>
            </div>
          </div>
        </footer>
      </main>

      {/* Popups & Modals */}
      <CitationModal
        citation={selectedCitation}
        onClose={() => setSelectedCitation(null)}
      />

      <SourcesModal
        isOpen={isSourcesOpen}
        onClose={() => setIsSourcesOpen(false)}
      />

      <AboutModal
        isOpen={isAboutOpen}
        onClose={() => setIsAboutOpen(false)}
      />

      <PrivacyNoticeModal
        isOpen={isPrivacyOpen}
        onClose={() => setIsPrivacyOpen(false)}
        onClearHistory={clearCurrentChat}
      />
    </div>
  );
};
