import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useOfflineSync } from '../context/OfflineSyncContext';
import { apiRequest } from '../services/apiClient';
import { queueOfflineAction } from '../db/indexedDb';
import { io } from 'socket.io-client';
import { MessageSquare, Send, Clock, User, CloudOff } from 'lucide-react';

export default function SocietyChat() {
  const { activeSociety, user } = useAuth();
  const { networkMode, refreshPendingCount } = useOfflineSync();
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef(null);
  const socketRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Socket.IO setup
  useEffect(() => {
    if (!activeSociety) return;

    const socket = io('http://localhost:5000', {
      transports: ['websocket', 'polling']
    });
    socketRef.current = socket;

    socket.emit('join_society', activeSociety.id);

    socket.on('new_message', (msg) => {
      if (msg.society_id === activeSociety.id) {
        setMessages((prev) => {
          // Avoid duplicate if sent optimistically
          if (prev.some((m) => m.id === msg.id)) {
            return prev.map((m) => (m.id === msg.id ? msg : m));
          }
          return [...prev, msg];
        });
        scrollToBottom();
      }
    });

    return () => {
      socket.emit('leave_society', activeSociety.id);
      socket.disconnect();
    };
  }, [activeSociety]);

  // Load chat history
  useEffect(() => {
    if (!activeSociety) return;
    let isMounted = true;

    async function loadChat() {
      try {
        setLoading(true);
        const res = await apiRequest(`/api/chat/${activeSociety.id}/messages`);
        if (isMounted) {
          setMessages(res.messages || []);
          scrollToBottom();
        }
      } catch (e) {
        console.warn('Could not load chat messages:', e.message);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadChat();
    return () => { isMounted = false; };
  }, [activeSociety, networkMode]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputText.trim() || !activeSociety || !user) return;

    const text = inputText.trim();
    setInputText('');

    const tempId = 'msg_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
    const optimisticMsg = {
      id: tempId,
      society_id: activeSociety.id,
      sender_id: user.id,
      sender_name: user.fullName,
      content: text,
      sequence_num: (messages[messages.length - 1]?.sequence_num || 0) + 1,
      created_at: new Date().toISOString(),
      isPendingOffline: networkMode === 'OFFLINE'
    };

    // Optimistic UI update
    setMessages((prev) => [...prev, optimisticMsg]);
    scrollToBottom();

    if (networkMode === 'OFFLINE') {
      // Enqueue to offline outbox
      await queueOfflineAction(
        'SEND_CHAT',
        `/api/chat/${activeSociety.id}/messages`,
        'POST',
        { id: tempId, content: text }
      );
      await refreshPendingCount();
    } else {
      try {
        await apiRequest(`/api/chat/${activeSociety.id}/messages`, {
          method: 'POST',
          body: JSON.stringify({ id: tempId, content: text })
        });
      } catch (err) {
        // Fallback to offline outbox if packet dropped
        await queueOfflineAction(
          'SEND_CHAT',
          `/api/chat/${activeSociety.id}/messages`,
          'POST',
          { id: tempId, content: text }
        );
        await refreshPendingCount();
      }
    }
  };

  return (
    <div className="card-glass flex flex-col h-[600px] border-slate-800 overflow-hidden">
      {/* Chat Room Header */}
      <div className="bg-slate-900/90 p-4 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageSquare size={18} className="text-blue-400" />
          <div>
            <h3 className="font-bold text-slate-100 text-sm">
              {activeSociety?.name} General Discussion
            </h3>
            <p className="text-[11px] text-slate-400">
              Low-bandwidth sequenced room with offline outbox queue (+5 pts per message)
            </p>
          </div>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 p-4 overflow-y-auto space-y-3">
        {loading && messages.length === 0 ? (
          <div className="text-center py-12 text-slate-500 text-xs">Loading messages...</div>
        ) : messages.length === 0 ? (
          <div className="text-center py-12 text-slate-400 text-xs">
            No messages yet. Say hello to your fellow society members!
          </div>
        ) : (
          messages.map((m) => {
            const isMe = m.sender_id === user?.id;
            return (
              <div
                key={m.id}
                className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
              >
                <div className="flex items-center gap-1.5 mb-1 text-[10px] text-slate-400 px-1">
                  <span className="font-bold text-slate-300">{m.sender_name}</span>
                  <span>•</span>
                  <span>{new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  {m.sequence_num && (
                    <span className="font-mono text-slate-500 text-[9px]">#{m.sequence_num}</span>
                  )}
                </div>

                <div
                  className={`max-w-[75%] rounded-2xl px-3.5 py-2 text-xs leading-relaxed shadow-sm ${
                    isMe
                      ? 'bg-blue-600 text-white rounded-br-none'
                      : 'bg-slate-800 text-slate-200 border border-slate-700/60 rounded-bl-none'
                  }`}
                >
                  {m.content}
                </div>

                {m.isPendingOffline && (
                  <span className="text-[10px] text-amber-400 mt-1 flex items-center gap-1">
                    <CloudOff size={10} /> Queued in Outbox
                  </span>
                )}
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Form */}
      <form
        onSubmit={handleSendMessage}
        className="p-3 bg-slate-900 border-t border-slate-800 flex items-center gap-2"
      >
        <input
          type="text"
          placeholder={
            networkMode === 'OFFLINE'
              ? 'Typing offline (will queue in IndexedDB outbox)...'
              : 'Write message to society...'
          }
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 outline-none focus:border-blue-500"
        />

        <button
          type="submit"
          disabled={!inputText.trim()}
          className="btn-primary !text-xs !py-2 !px-3 rounded-xl shrink-0"
        >
          <Send size={14} /> Send
        </button>
      </form>
    </div>
  );
}
