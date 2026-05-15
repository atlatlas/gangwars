import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;

export function getTradingSocket(): Socket {
  if (!socket) {
    socket = io(window.location.origin, {
      transports: ["websocket", "polling"],
      autoConnect: true,
    });
  }
  return socket;
}

export function disconnectTradingSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
