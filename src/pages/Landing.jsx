import { useState } from 'react';
import { Video, MessageSquare, Globe, Users, Shield } from 'lucide-react';

export default function Landing({ stats, onStart }) {
  const [username, setUsername] = useState('');
  return (
    <div className="landing fade-in">
      {/* Logo */}
      <div className="landing-logo">
        <div className="logo-icon">🌐</div>
        <span className="logo-text">VisionBridge</span>
      </div>

      {/* Headline */}
      <div className="landing-tagline">
        <h1>Talk to Strangers.<br />Make Connections.</h1>
        <p>Instant random video and text chat with people from around the world. No sign-up required.</p>
      </div>

      {/* Mode Cards */}
      <div className="username-entry">
        <label htmlFor="username">Enter Your Name</label>
        <input 
          type="text" 
          id="username"
          placeholder="e.g. SpaceTraveler" 
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && onStart('text', username)}
        />
      </div>

      <div className="mode-cards">
        <div className="mode-card video" onClick={() => onStart('video', username)}>
          <div className="mode-icon">
            <Video size={28} color="#a78bfa" />
          </div>
          <h3>Video Chat</h3>
          <p>Face-to-face with a random stranger using live video and audio</p>
          <br />
          <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
            Start Video
          </button>
        </div>

        <div className="mode-card text" onClick={() => onStart('text', username)}>
          <div className="mode-icon">
            <MessageSquare size={28} color="#22d3ee" />
          </div>
          <h3>Text Chat</h3>
          <p>Anonymous text conversation with a random stranger instantly</p>
          <br />
          <button className="btn btn-cyan" style={{ width: '100%', justifyContent: 'center' }}>
            Start Text
          </button>
        </div>
      </div>

      {/* Live Stats */}
      <div className="stats-bar">
        <div className="stat">
          <div className="stat-value">{stats.online.toLocaleString()}</div>
          <div className="stat-label"><Globe size={10} style={{display:'inline',marginRight:4}}/>Online Now</div>
        </div>
        <div className="stat">
          <div className="stat-value">{stats.matched.toLocaleString()}</div>
          <div className="stat-label"><Users size={10} style={{display:'inline',marginRight:4}}/>Pairs Matched</div>
        </div>
        <div className="stat">
          <div className="stat-value">{stats.waiting}</div>
          <div className="stat-label">Waiting</div>
        </div>
      </div>

      {/* Features row */}
      <div style={{ display: 'flex', gap: 24, opacity: 0.7 }}>
        {[
          { icon: <Shield size={14} />, label: 'Anonymous' },
          { icon: <Globe size={14} />, label: 'Worldwide' },
          { icon: <Video size={14} />, label: 'HD Video' },
          { icon: <MessageSquare size={14} />, label: 'Instant Chat' },
        ].map(f => (
          <div key={f.label} style={{ display:'flex', alignItems:'center', gap:6, fontSize:13, color:'var(--muted)' }}>
            {f.icon} {f.label}
          </div>
        ))}
      </div>

      <p className="disclaimer">
        By using VisionBridge you agree to our terms. Please be respectful — inappropriate content will result in a ban.
      </p>
    </div>
  );
}
