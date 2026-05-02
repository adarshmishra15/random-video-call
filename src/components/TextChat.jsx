import { useRef, useEffect, useState, useCallback } from 'react';
import { Send } from 'lucide-react';

function formatTime(ts) {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function TextChat({ messages, isTyping, onSend, onTyping, connected, fullHeight }) {
  const [input, setInput] = useState('');
  const bottomRef = useRef(null);
  const typingRef = useRef(false);
  const timerRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleSend = () => {
    if (!input.trim() || !connected) return;
    onSend(input.trim());
    setInput('');
    // stop typing indicator
    if (typingRef.current) {
      onTyping(false);
      typingRef.current = false;
    }
  };

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInput = (e) => {
    setInput(e.target.value);
    // typing indicator
    if (!typingRef.current) {
      typingRef.current = true;
      onTyping(true);
    }
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      typingRef.current = false;
      onTyping(false);
    }, 1500);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, height: fullHeight ? '100%' : undefined, overflow: 'hidden' }}>
      {/* Message list */}
      <div className="messages" style={{ flex: 1 }}>
        {messages.length === 0 && (
          <div style={{ textAlign: 'center', color: 'var(--muted)', fontSize: 13, marginTop: 32 }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>💬</div>
            <p>Connected! Say hello to your stranger.</p>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`msg-row ${msg.from} fade-in`}>
            <div className="msg-bubble">
              {msg.text}
              {msg.from !== 'system' && (
                <div className="msg-time">{formatTime(msg.timestamp)}</div>
              )}
            </div>
          </div>
        ))}

        {isTyping && (
          <div className="msg-row stranger">
            <div className="typing-indicator">
              <span /><span /><span />
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input bar */}
      <div className="chat-input-bar">
        <textarea
          className="chat-input"
          placeholder={connected ? 'Type a message…' : 'Waiting for stranger…'}
          value={input}
          onChange={handleInput}
          onKeyDown={handleKey}
          disabled={!connected}
          rows={1}
        />
        <button
          className="btn btn-primary btn-icon"
          onClick={handleSend}
          disabled={!connected || !input.trim()}
          style={{ borderRadius: 12, height: 46, width: 46 }}
        >
          <Send size={16} />
        </button>
      </div>
    </div>
  );
}
