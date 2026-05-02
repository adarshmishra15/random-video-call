import { useRef, useEffect, useState, useCallback } from 'react';
import SimplePeer from 'simple-peer';
import socket from '../socket.js';
import TextChat from '../components/TextChat.jsx';
import VideoControls from '../components/VideoControls.jsx';
import StatusOverlay from '../components/StatusOverlay.jsx';
import { LogOut, Globe } from 'lucide-react';

export default function ChatRoom({ mode, onLeave }) {
  const [status, setStatus] = useState('waiting'); // 'waiting' | 'connected' | 'disconnected'
  const [roomId, setRoomId] = useState(null);
  const [partnerId, setPartnerId] = useState(null);
  const [partnerName, setPartnerName] = useState('Stranger');
  const [partnerCountry, setPartnerCountry] = useState('');
  const [partnerAvatar, setPartnerAvatar] = useState(null);
  const [messages, setMessages] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [onlineCount, setOnlineCount] = useState(0);

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const localStreamRef = useRef(null);
  const peerRef = useRef(null);
  const typingTimerRef = useRef(null);

  // Cleanup peer connection
  const destroyPeer = useCallback(() => {
    if (peerRef.current) {
      peerRef.current.destroy();
      peerRef.current = null;
    }
  }, []);

  // Stop local media stream
  const stopStream = useCallback(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(t => t.stop());
      localStreamRef.current = null;
    }
  }, []);

  // Start local video/audio
  const startLocalStream = useCallback(async () => {
    if (mode !== 'video') return null;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      localStreamRef.current = stream;
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;
      return stream;
    } catch (err) {
      console.warn('Camera/mic denied:', err);
      return null;
    }
  }, [mode]);

  // Create WebRTC peer
  const createPeer = useCallback((isInitiator, stream, toId) => {
    destroyPeer();
    const peer = new SimplePeer({
      initiator: isInitiator,
      stream: stream || undefined,
      trickle: true,
      config: {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
        ],
      },
    });

    peer.on('signal', (signal) => {
      socket.emit('signal', { signal, to: toId });
    });

    peer.on('stream', (remoteStream) => {
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = remoteStream;
      }
    });

    peer.on('error', (err) => console.warn('Peer error:', err));
    peer.on('close', () => setStatus('disconnected'));

    peerRef.current = peer;
    return peer;
  }, [destroyPeer]);

  // Connect to signaling server on mount
  useEffect(() => {
    socket.emit('find_stranger', { mode });

    const handleMatched = async ({ roomId: rid, isInitiator, mode: m, partnerName: name, partnerCountry: country, partnerAvatar: avatar }) => {
      setRoomId(rid);
      setPartnerName(name || 'Stranger');
      setPartnerCountry(country || 'Earth');
      setPartnerAvatar(avatar);
      setStatus('connected');
      setMessages(msgs => [...msgs, { text: `${name || 'Stranger'} from ${country || 'Earth'} connected!`, from: 'system', timestamp: Date.now() }]);

      if (m === 'video') {
        const stream = localStreamRef.current || await startLocalStream();
        const toId = isInitiator ? rid.split('_')[2] : rid.split('_')[1];
        setPartnerId(toId);
        createPeer(isInitiator, stream, toId);
      }
    };

    const handleSignal = ({ signal, from }) => {
      setPartnerId(from);
      if (peerRef.current) {
        peerRef.current.signal(signal);
      } else if (mode === 'video') {
        startLocalStream().then(stream => {
          const peer = createPeer(false, stream, from);
          peer.signal(signal);
        });
      }
    };

    const handleMessage = (msg) => {
      setMessages(msgs => [...msgs, msg]);
    };

    const handleTyping = ({ isTyping: t }) => {
      setIsTyping(t);
    };

    const handleWaiting = () => {
      destroyPeer();
      if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
      setStatus('waiting');
      setRoomId(null);
      setPartnerId(null);
      setIsTyping(false);
    };

    const handleDisconnected = () => {
      destroyPeer();
      if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
      setStatus('disconnected');
      setMessages(msgs => [...msgs, { text: `${partnerName} disconnected.`, from: 'system', timestamp: Date.now() }]);
    };

    const handleStats = ({ online }) => setOnlineCount(online);

    socket.on('matched', handleMatched);
    socket.on('signal', handleSignal);
    socket.on('message', handleMessage);
    socket.on('typing', handleTyping);
    socket.on('waiting', handleWaiting);
    socket.on('stranger_disconnected', handleDisconnected);
    socket.on('stats', handleStats);

    if (mode === 'video') startLocalStream();

    return () => {
      socket.off('matched', handleMatched);
      socket.off('signal', handleSignal);
      socket.off('message', handleMessage);
      socket.off('typing', handleTyping);
      socket.off('waiting', handleWaiting);
      socket.off('stranger_disconnected', handleDisconnected);
      socket.off('stats', handleStats);
    };
  }, [mode, createPeer, destroyPeer, startLocalStream]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      destroyPeer();
      stopStream();
    };
  }, [destroyPeer, stopStream]);

  const handleSkip = () => {
    destroyPeer();
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
    setMessages([]);
    setIsTyping(false);
    socket.emit('skip');
  };

  const handleStop = () => {
    destroyPeer();
    stopStream();
    socket.emit('stop');
    onLeave();
  };

  const toggleMic = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach(t => { t.enabled = !micOn; });
    }
    setMicOn(v => !v);
  };

  const toggleCam = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getVideoTracks().forEach(t => { t.enabled = !camOn; });
    }
    setCamOn(v => !v);
  };

  const sendMessage = (text) => {
    if (!text.trim() || status !== 'connected') return;
    socket.emit('message', { text });
  };

  const sendTyping = (isTypingNow) => {
    socket.emit('typing', { isTyping: isTypingNow });
  };

  return (
    <div className="chat-page">
      {/* Header */}
      <header className="chat-header">
        <div className="header-logo">
          <div className="logo-icon">🌐</div>
          <span>VisionBridge</span>
        </div>
        
        {status === 'connected' && (
          <div className="partner-info-pill fade-in">
            {partnerAvatar ? (
              <img src={partnerAvatar} alt={partnerName} className="partner-avatar-small" />
            ) : (
              <div className="partner-avatar-placeholder">👤</div>
            )}
            <div className="partner-meta">
              <span className="partner-name">{partnerName}</span>
              <span className="partner-country">{partnerCountry}</span>
            </div>
          </div>
        )}

        <div className="header-actions">
          <div className="online-pill">
            <span className="online-dot" />
            {onlineCount} online
          </div>
          <button className="btn btn-ghost" onClick={handleStop}>
            <LogOut size={14} /> Leave
          </button>
        </div>
      </header>

      {/* Main content */}
      <div className="chat-content">
        {mode === 'video' ? (
          <>
            {/* Video area */}
            <div className="video-area">
              <div className="video-remote">
                <video ref={remoteVideoRef} autoPlay playsInline />
                {status !== 'connected' && (
                  <StatusOverlay status={status} onSkip={handleSkip} onStop={handleStop} />
                )}
              </div>

              {/* Local video PiP */}
              <div className="video-local">
                <video ref={localVideoRef} autoPlay playsInline muted />
              </div>

              {/* Video controls */}
              {status === 'connected' && (
                <VideoControls
                  micOn={micOn}
                  camOn={camOn}
                  onMic={toggleMic}
                  onCam={toggleCam}
                  onSkip={handleSkip}
                  onStop={handleStop}
                />
              )}
            </div>

            {/* Sidebar text chat */}
            <div className="sidebar">
              <TextChat
                messages={messages}
                isTyping={isTyping}
                onSend={sendMessage}
                onTyping={sendTyping}
                connected={status === 'connected'}
              />
            </div>
          </>
        ) : (
          /* Text-only full layout */
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative' }}>
            {status !== 'connected' && (
              <StatusOverlay status={status} onSkip={handleSkip} onStop={handleStop} textOnly />
            )}
            <div className="text-chat-full">
              <TextChat
                messages={messages}
                isTyping={isTyping}
                onSend={sendMessage}
                onTyping={sendTyping}
                connected={status === 'connected'}
                fullHeight
              />
              <div className="text-controls">
                <button className="btn btn-primary" onClick={handleSkip} disabled={status === 'waiting'}>
                  ⚡ Next Stranger
                </button>
                <button className="btn btn-danger" onClick={handleStop}>
                  Stop
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
