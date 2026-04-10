import { io } from "socket.io-client";

export const SERVER_URL = process.env.REACT_APP_SERVER_URL || `${window.location.protocol}//${window.location.hostname}:5001`;

export const socket = io(SERVER_URL, {
  autoConnect: true,
  transports: ["websocket"],
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 500,
  reconnectionDelayMax: 3000,
  timeout: 10000,
});
