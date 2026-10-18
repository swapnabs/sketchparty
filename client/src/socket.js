import { io } from 'socket.io-client';

// Same origin in production (the Node server serves the built client);
// in `npm run dev` Vite proxies /socket.io to the server.
const SERVER_URL = import.meta.env.VITE_SERVER_URL || '';

export const socket = io(SERVER_URL, {
  autoConnect: false,
  transports: ['websocket', 'polling'],
});