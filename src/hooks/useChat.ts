import { useState, useEffect, useCallback, useRef } from 'react';
import { AnswerStyle, ChatMessage, ChatSession, Citation } from '../types/chat';
import { ChatService } from '../services/chatService';

const STORAGE_KEY_SESSIONS = 'dyod_ai_sessions_v1';
const STORAGE_KEY_ACTIVE = 'dyod_ai_active_session_v1';

function createNewSession(): ChatSession {
  const id = `session-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  return {
    id,
    title: 'New Conversation',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    messages: [],
    currentStyle: 'detailed',
  };
}

export function useChat() {
  const [sessions, setSessions] = useState<ChatSession[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_SESSIONS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch {}
    return [createNewSession()];
  });

  const [activeSessionId, setActiveSessionId] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_ACTIVE);
      if (saved && sessions.some((s) => s.id === saved)) {
        return saved;
      }
    } catch {}
    return sessions[0]?.id || createNewSession().id;
  });

  const [isLoading, setIsLoading] = useState(false);
  const [selectedCitation, setSelectedCitation] = useState<Citation | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Sync sessions to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_SESSIONS, JSON.stringify(sessions));
      localStorage.setItem(STORAGE_KEY_ACTIVE, activeSessionId);
    } catch {}
  }, [sessions, activeSessionId]);

  const activeSession = sessions.find((s) => s.id === activeSessionId) || sessions[0];

  const setAnswerStyle = useCallback(
    (style: AnswerStyle) => {
      setSessions((prev) =>
        prev.map((s) => (s.id === activeSessionId ? { ...s, currentStyle: style } : s))
      );
    },
    [activeSessionId]
  );

  const startNewChat = useCallback(() => {
    const newSession = createNewSession();
    setSessions((prev) => [newSession, ...prev]);
    setActiveSessionId(newSession.id);
  }, []);

  const switchSession = useCallback((sessionId: string) => {
    setActiveSessionId(sessionId);
  }, []);

  const deleteSession = useCallback((sessionId: string) => {
    setSessions((prev) => {
      const filtered = prev.filter((s) => s.id !== sessionId);
      if (filtered.length === 0) {
        const fresh = createNewSession();
        setActiveSessionId(fresh.id);
        return [fresh];
      }
      return filtered;
    });
  }, []);

  const clearCurrentChat = useCallback(() => {
    setSessions((prev) =>
      prev.map((s) =>
        s.id === activeSessionId
          ? {
              ...s,
              messages: [],
              title: 'New Conversation',
              updatedAt: new Date().toISOString(),
            }
          : s
      )
    );
  }, [activeSessionId]);

  const cancelCurrentRequest = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsLoading(false);
  }, []);

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || isLoading) return;

      // Abort any prior in-flight request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      const controller = new AbortController();
      abortControllerRef.current = controller;

      const userMsg: ChatMessage = {
        id: `msg-${Date.now()}-u`,
        sender: 'user',
        content: text.trim(),
        timestamp: new Date().toISOString(),
      };

      // Derive title from first message if new conversation
      const isFirstMessage = activeSession.messages.length === 0;
      const newTitle = isFirstMessage
        ? text.trim().slice(0, 36) + (text.length > 36 ? '...' : '')
        : activeSession.title;

      // Update session optimistically with user message
      setSessions((prev) =>
        prev.map((s) =>
          s.id === activeSessionId
            ? {
                ...s,
                title: newTitle,
                updatedAt: new Date().toISOString(),
                messages: [...s.messages, userMsg],
              }
            : s
        )
      );

      setIsLoading(true);

      // Prepare history for RAG (last 4 turns)
      const history = activeSession.messages.slice(-4).map((m) => ({
        sender: m.sender,
        content: m.content,
      }));

      try {
        const res = await ChatService.sendMessage(
          {
            message: text.trim(),
            conversationId: activeSessionId,
            history,
            answerStyle: activeSession.currentStyle,
          },
          controller.signal
        );

        const assistantMsg: ChatMessage = {
          id: `msg-${Date.now()}-a`,
          sender: 'assistant',
          content: res.answer,
          timestamp: new Date().toISOString(),
          status: res.status,
          scope: res.scope,
          citations: res.citations || [],
          grounded: res.grounded,
          provider: res.provider,
          answerStyle: activeSession.currentStyle,
        };

        setSessions((prev) =>
          prev.map((s) =>
            s.id === activeSessionId
              ? {
                  ...s,
                  updatedAt: new Date().toISOString(),
                  messages: [...s.messages, assistantMsg],
                }
              : s
          )
        );
      } finally {
        setIsLoading(false);
        abortControllerRef.current = null;
      }
    },
    [activeSession, activeSessionId, isLoading]
  );

  const retryLastMessage = useCallback(() => {
    if (isLoading || activeSession.messages.length === 0) return;

    // Find last user message
    const lastUserIdx = [...activeSession.messages]
      .reverse()
      .findIndex((m) => m.sender === 'user');

    if (lastUserIdx !== -1) {
      const realIdx = activeSession.messages.length - 1 - lastUserIdx;
      const lastUserMsg = activeSession.messages[realIdx];

      // Remove any subsequent messages after that user message
      setSessions((prev) =>
        prev.map((s) =>
          s.id === activeSessionId
            ? {
                ...s,
                messages: s.messages.slice(0, realIdx),
              }
            : s
        )
      );

      sendMessage(lastUserMsg.content);
    }
  }, [activeSession.messages, activeSessionId, isLoading, sendMessage]);

  return {
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
  };
}
