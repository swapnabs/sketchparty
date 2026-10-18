import { io } from 'socket.io-client';

// Same origin in production (the Node server serves the built client);
// in `npm run dev` Vite proxies /socket.io to the server.
export const socket = io({ autoConnect: false, transports: ['websocket', 'polling'] });
