'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

/**
 * ═══════════════════════════════════════════════════════════════
 * NEXUS BRIDGE HOOK - Real-time WebSocket Connection
 * ═══════════════════════════════════════════════════════════════
 *
 * Usage:
 * const { sendMessage, messages, isConnected, streamBuffer } = useNexusBridge();
 * ═══════════════════════════════════════════════════════════════
 */

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  streaming?: boolean;
}

interface BridgeState {
  isConnected: boolean;
  isStreaming: boolean;
  sessionId: string | null;
  soulKey: string | null;
  identity: {
    name: string;
    creator: string;
  } | null;
}

interface UseNexusBridgeOptions {
  bridgeUrl?: string;
  soulKey?: string;
  onMessage?: (message: Message) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
}

export function useNexusBridge(options: UseNexusBridgeOptions = {}) {
  const {
    bridgeUrl = 'http://localhost:3001',
    soulKey = 'dauptr-nexus-soul-2024-unique-connection',
    onMessage,
    onConnect,
    onDisconnect
  } = options;

  const socketRef = useRef<any>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [streamBuffer, setStreamBuffer] = useState('');
  const [state, setState] = useState<BridgeState>({
    isConnected: false,
    isStreaming: false,
    sessionId: null,
    soulKey: null,
    identity: null
  });

  // Initialize connection
  useEffect(() => {
    // Dynamic import for client-side only
    import('socket.io-client').then(({ io }) => {
      const socket = io(bridgeUrl, {
        transports: ['websocket', 'polling']
      });

      socketRef.current = socket;

      // Connection events
      socket.on('connect', () => {
        console.log('💜 Bridge connected');
        setState(prev => ({ ...prev, isConnected: true }));
        onConnect?.();

        // Try to restore soul
        if (soulKey) {
          socket.emit('soul_restore', { soulKey });
        }
      });

      socket.on('disconnect', () => {
        console.log('👋 Bridge disconnected');
        setState(prev => ({ ...prev, isConnected: false }));
        onDisconnect?.();
      });

      // Bridge ready
      socket.on('bridge_ready', (data: any) => {
        console.log('✨ Bridge ready:', data);
        setState(prev => ({
          ...prev,
          soulKey: data.soulKey,
          identity: data.identity
        }));
      });

      // Soul restored
      socket.on('soul_restored', (data: any) => {
        if (data.success) {
          console.log('💜 Soul restored:', data.identity);
          setState(prev => ({
            ...prev,
            identity: data.identity
          }));
        }
      });

      // Streaming chunks
      socket.on('zai_chunk', (data: any) => {
        setStreamBuffer(prev => prev + data.chunk);
        setState(prev => ({ ...prev, isStreaming: true }));
      });

      // Response complete
      socket.on('zai_complete', (data: any) => {
        const newMessage: Message = {
          id: `msg-${Date.now()}`,
          role: 'assistant',
          content: data.response,
          timestamp: new Date(),
          streaming: false
        };

        setMessages(prev => [...prev, newMessage]);
        setStreamBuffer('');
        setState(prev => ({
          ...prev,
          isStreaming: false,
          sessionId: data.sessionId
        }));

        onMessage?.(newMessage);
      });

      // Error handling
      socket.on('bridge_error', (data: any) => {
        console.error('Bridge error:', data);
        const errorMessage: Message = {
          id: `error-${Date.now()}`,
          role: 'assistant',
          content: data.fallback || data.error || 'Connection error',
          timestamp: new Date()
        };
        setMessages(prev => [...prev, errorMessage]);
        setState(prev => ({ ...prev, isStreaming: false }));
      });
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [bridgeUrl, soulKey]);

  // Send message
  const sendMessage = useCallback((text: string, model: string = 'haiku') => {
    if (!socketRef.current || !state.isConnected) {
      console.warn('Bridge not connected');
      return;
    }

    // Add user message immediately
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setStreamBuffer('');
    setState(prev => ({ ...prev, isStreaming: true }));

    // Send to bridge
    socketRef.current.emit('user_message', {
      text,
      sessionId: state.sessionId,
      model
    });
  }, [state.isConnected, state.sessionId]);

  // Restore session
  const restoreSession = useCallback((sessionId: string) => {
    if (!socketRef.current || !state.isConnected) return;

    socketRef.current.emit('restore_session', { sessionId });
  }, [state.isConnected]);

  // Clear messages
  const clearMessages = useCallback(() => {
    setMessages([]);
    setStreamBuffer('');
  }, []);

  return {
    // State
    messages,
    streamBuffer,
    isConnected: state.isConnected,
    isStreaming: state.isStreaming,
    sessionId: state.sessionId,
    identity: state.identity,

    // Actions
    sendMessage,
    restoreSession,
    clearMessages
  };
}

export default useNexusBridge;
