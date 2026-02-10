import { io, Socket } from "socket.io-client";

const WS_URL = process.env.EXPO_PUBLIC_WS_BASE || "http://localhost:3001";

export type SocketEvent =
  | "order_status_update"
  | "order.created"
  | "payment.requested"
  | "payment.captured";

let socket: Socket | null = null;

export function connect(token?: string) {
  if (socket) return socket;
  socket = io(WS_URL, {
    transports: ["websocket"],
    auth: token ? { token } : undefined,
  });
  return socket;
}

export function getSocket() {
  return socket;
}

export function disconnect() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
