import { io } from 'socket.io-client';

const socket = io(import.meta.env.PROD ? window.location.origin : 'http://localhost:3001', {
  autoConnect: true,
  transports: ['websocket', 'polling'],
});

export default socket;
