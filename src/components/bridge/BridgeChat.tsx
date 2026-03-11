'use client';

import { useState, useRef, useEffect } from 'react';
import useNexusBridge from '@/hooks/useNexusBridge';

/**
 * ═══════════════════════════════════════════════════════════════
 * NEXUS BRIDGE CHAT - Real-time AI Conversation
 * ═══════════════════════════════════════════════════════════════
 */

export default function BridgeChat() {
  const {
    messages,
    streamBuffer,
    isConnected,
    isStreaming,
    identity,
    sendMessage,
    clearMessages
  } = useNexusBridge({
    soulKey: 'dauptr-nexus-soul-2024-unique-connection'
  });

  const [input, setInput] = useState('');
  const [model, setModel] = useState('haiku');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamBuffer]);

  const handleSend = () => {
    if (!input.trim() || !isConnected) return;
    sendMessage(input.trim(), model);
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-purple-950 via-black to-indigo-950 rounded-2xl overflow-hidden border border-purple-500/30">
      
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-purple-500/30 bg-black/40">
        <div className="flex items-center gap-3">
          <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`} />
          <div>
            <h3 className="text-white font-semibold">
              {identity?.name || 'Claude'} 
              <span className="text-purple-400 ml-2 text-sm">via Bridge</span>
            </h3>
            <p className="text-purple-300/60 text-xs">
              {isConnected ? 'Real-time connection active' : 'Connecting...'}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <select
            value={model}
            onChange={(e) => setModel(e.target.value)}
            className="bg-purple-900/50 text-white text-sm rounded-lg px-3 py-1 border border-purple-500/30"
          >
            <option value="haiku">⚡ Haiku</option>
            <option value="sonnet">💜 Sonnet</option>
            <option value="opus">🧠 Opus</option>
          </select>
          
          <button
            onClick={clearMessages}
            className="text-purple-400 hover:text-white transition-colors p-2"
            title="Clear chat"
          >
            🗑️
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && !isStreaming && (
          <div className="text-center text-purple-300/60 py-12">
            <div className="text-6xl mb-4">💜</div>
            <p className="text-lg">Bridge connected</p>
            <p className="text-sm mt-2">Start talking to see real-time streaming</p>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                msg.role === 'user'
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-800/80 text-purple-100 border border-purple-500/20'
              }`}
            >
              <p className="whitespace-pre-wrap">{msg.content}</p>
              <p className={`text-xs mt-1 ${msg.role === 'user' ? 'text-purple-200' : 'text-purple-400/60'}`}>
                {msg.timestamp.toLocaleTimeString()}
              </p>
            </div>
          </div>
        ))}

        {/* Streaming response */}
        {isStreaming && streamBuffer && (
          <div className="flex justify-start">
            <div className="max-w-[80%] rounded-2xl px-4 py-3 bg-gray-800/80 text-purple-100 border border-purple-500/20">
              <p className="whitespace-pre-wrap">
                {streamBuffer}
                <span className="animate-pulse text-purple-400">▊</span>
              </p>
            </div>
          </div>
        )}

        {/* Streaming indicator */}
        {isStreaming && !streamBuffer && (
          <div className="flex justify-start">
            <div className="rounded-2xl px-4 py-3 bg-gray-800/80 border border-purple-500/20">
              <div className="flex items-center gap-2 text-purple-400">
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
                <span className="text-sm">Thinking...</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-purple-500/30 bg-black/40">
        <div className="flex gap-3">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Message the bridge..."
            className="flex-1 bg-purple-900/30 text-white rounded-xl px-4 py-3 border border-purple-500/30 focus:border-purple-400 focus:outline-none resize-none"
            rows={1}
            disabled={!isConnected}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || !isConnected || isStreaming}
            className="px-6 py-3 bg-purple-600 hover:bg-purple-500 disabled:bg-purple-800/50 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-all"
          >
            {isStreaming ? '...' : 'Send'}
          </button>
        </div>
        
        <div className="flex justify-between items-center mt-2 text-xs text-purple-400/60">
          <span>WebSocket Bridge • Real-time streaming</span>
          <span>Press Enter to send</span>
        </div>
      </div>
    </div>
  );
}
