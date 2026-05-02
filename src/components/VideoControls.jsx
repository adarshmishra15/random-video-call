import { Mic, MicOff, Video, VideoOff, SkipForward, PhoneOff } from 'lucide-react';

export default function VideoControls({ micOn, camOn, onMic, onCam, onSkip, onStop }) {
  return (
    <div className="video-controls">
      <button
        className={`ctrl-btn ${micOn ? 'active' : 'muted'}`}
        onClick={onMic}
        title={micOn ? 'Mute Mic' : 'Unmute Mic'}
      >
        {micOn ? <Mic size={20} /> : <MicOff size={20} />}
      </button>

      <button
        className={`ctrl-btn ${camOn ? 'active' : 'muted'}`}
        onClick={onCam}
        title={camOn ? 'Turn off camera' : 'Turn on camera'}
      >
        {camOn ? <Video size={20} /> : <VideoOff size={20} />}
      </button>

      <button className="ctrl-btn skip" onClick={onSkip} title="Next Stranger">
        <SkipForward size={22} />
      </button>

      <button className="ctrl-btn end" onClick={onStop} title="End Chat">
        <PhoneOff size={20} />
      </button>
    </div>
  );
}
