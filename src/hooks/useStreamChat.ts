'use client';

import { useState, useRef, useCallback, useEffect } from 'react';

/**
 * ═══════════════════════════════════════════════════════════════
 * NEXUS STREAM HOOK - SSE Real-time Chat
 * ═══════════════════════════════════════════════════════════════
 *
 * Uses Server-Sent Events for streaming without WebSockets
 * Works over standard HTTP - no additional server needed!
 * ═══════════════════════════════════════════════════════════════
 */

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  streaming?: boolean;
  progress?: number;
}

interface UseStreamChatOptions {
  model?: 'haiku' | 'sonnet' | 'opus';
  systemPrompt?: string;
  onMessage?: (message: Message) => void;
  onError?: (error: string) => void;
}

export function useStreamChat(options: UseStreamChatOptions = {}) {
  const { model = 'haiku', systemPrompt, onMessage, onError } = options;

  const [messages, setMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamBuffer, setStreamBuffer] = useState('');
  const [progress, setProgress] = useState(0);

  const abortControllerRef = useRef<AbortController | null>(null);

  // Send message with streaming
  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isStreaming) return;

    // Add user message
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setIsStreaming(true);
    setStreamBuffer('');
    setProgress(0);

    // Create abort controller for cancellation
    abortControllerRef.current = new AbortController();

    try {
      const history = messages.map(m => ({
        role: m.role,
        content: m.content
      }));

      const response = await fetch('/api/stream-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text.trim(),
          model,
          history,
          systemPrompt
        }),
        signal: abortControllerRef.current.signal
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No reader available');

      const decoder = new TextDecoder();
      let assistantContent = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));

              switch (data.type) {
                case 'start':
                  console.log('[Stream] Started, total words:', data.totalWords);
                  break;

                case 'chunk':
                  assistantContent += data.content;
                  setStreamBuffer(assistantContent);
                  setProgress(data.progress || 0);
                  break;

                case 'done':
                  const assistantMessage: Message = {
                    id: `assistant-${Date.now()}`,
                    role: 'assistant',
                    content: assistantContent,
                    timestamp: new Date()
                  };
                  setMessages(prev => [...prev, assistantMessage]);
                  setStreamBuffer('');
                  onMessage?.(assistantMessage);
                  break;

                case 'error':
                  throw new Error(data.message || 'Stream error');
              }
            } catch (parseError) {
              // Ignore parse errors for incomplete chunks
            }
          }
        }
      }

    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        console.log('[Stream] Cancelled');
      } else {
        console.error('[Stream] Error:', error);
        onError?.((error as Error).message);
        
        // Add error message
        const errorMessage: Message = {
          id: `error-${Date.now()}`,
          role: 'system',
          content: 'Connection issue. Please try again.',
          timestamp: new Date()
        };
        setMessages(prev => [...prev, errorMessage]);
      }
    } finally {
      setIsStreaming(false);
      setProgress(0);
      abortControllerRef.current = null;
    }
  }, [messages, model, systemPrompt, isStreaming, onMessage, onError]);

  // Cancel streaming
  const cancelStream = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }, []);

  // Clear messages
  const clearMessages = useCallback(() => {
    setMessages([]);
    setStreamBuffer('');
    setProgress(0);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    messages,
    streamBuffer,
    isStreaming,
    progress,
    sendMessage,
    cancelStream,
    clearMessages
  };
}

export default useStreamChat;
