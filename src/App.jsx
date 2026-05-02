import { useState, useEffect } from 'react';
import Landing from './pages/Landing.jsx';
import ChatRoom from './pages/ChatRoom.jsx';
import socket from './socket.js';

export default function App() {
  const [page, setPage] = useState('landing'); // 'landing' | 'chat'
  const [mode, setMode] = useState('video');   // 'video' | 'text'
  const [username, setUsername] = useState('');
  const [stats, setStats] = useState({ online: 0, matched: 0, waiting: 0 });

  useEffect(() => {
    socket.on('stats', setStats);
    return () => socket.off('stats', setStats);
  }, []);

  const handleStart = async (selectedMode, name) => {
    const finalName = name.trim() || `Stranger_${Math.floor(Math.random() * 10000)}`;
    setUsername(finalName);
    
    try {
      // Save to MongoDB
      const apiUrl = import.meta.env.PROD ? `${window.location.origin}/api/users` : 'http://localhost:3001/api/users';
      await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: finalName }),
      });

      // Notify socket server
      socket.emit('join', { username: finalName });
    } catch (err) {
      console.error('Failed to save user:', err);
    }

    setMode(selectedMode);
    setPage('chat');
  };

  const handleLeave = () => {
    socket.emit('stop');
    setPage('landing');
  };

  return (
    <>
      <div className="bg-grid" />
      <div className="bg-glow bg-glow-1" />
      <div className="bg-glow bg-glow-2" />

      {page === 'landing' && (
        <Landing stats={stats} onStart={handleStart} />
      )}
      {page === 'chat' && (
        <ChatRoom mode={mode} onLeave={handleLeave} />
      )}
    </>
  );
}
