import { SkipForward, PhoneOff } from 'lucide-react';

const messages = {
  waiting: {
    icon: null,
    spinner: true,
    title: 'Finding a stranger…',
    sub: 'Looking for someone to connect with',
  },
  disconnected: {
    icon: '👋',
    spinner: false,
    title: 'Stranger left the chat',
    sub: 'Click Next to find a new stranger',
  },
};

export default function StatusOverlay({ status, onSkip, onStop, textOnly }) {
  const info = messages[status] || messages.waiting;

  return (
    <div className="status-overlay fade-in">
      {info.spinner ? (
        <div style={{ position: 'relative' }}>
          <div className="stranger-avatar">🌐</div>
          <div className="pulse-ring" />
        </div>
      ) : (
        <div className="stranger-avatar">{info.icon}</div>
      )}

      <div style={{ textAlign: 'center' }}>
        <h2>{info.title}</h2>
        <p style={{ marginTop: 8 }}>{info.sub}</p>
      </div>

      {info.spinner && (
        <div className="spinner" />
      )}

      {!textOnly && (
        <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
          <button className="btn btn-primary" onClick={onSkip}>
            <SkipForward size={16} /> Next Stranger
          </button>
          <button className="btn btn-ghost" onClick={onStop}>
            <PhoneOff size={16} /> Stop
          </button>
        </div>
      )}
    </div>
  );
}
