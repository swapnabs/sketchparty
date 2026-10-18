const serverUrl =
  import.meta.env.VITE_SERVER_URL ||
  window.location.origin;

export const socket = io(serverUrl, {
  autoConnect: false,
  transports: ['websocket', 'polling']
});