import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';

const SERVER_URL =
  (import.meta.env.VITE_SERVER_URL as string | undefined) ?? `http://${window.location.hostname}:3001`;

type EmitFn = (event: string, payload?: any, ack?: (res: any) => void) => void;
type SocketLike = {
  on: (event: string, handler: (...args: any[]) => void) => void;
  off: (event: string, handler: (...args: any[]) => void) => void;
  emit: EmitFn;
  connected: boolean;
};

let singleton: Socket | null = null;
let override: SocketLike | null = null;

/**
 * Replace the socket singleton with a SocketLike (used for offline mode).
 * Pass null to restore the real Socket.IO connection.
 */
export function setSocketOverride(s: SocketLike | null) {
  override = s;
}

export function getSocket(): SocketLike {
  if (override) return override;
  if (!singleton) {
    singleton = io(SERVER_URL, { autoConnect: true, transports: ['websocket', 'polling'] });
  }
  return singleton;
}

export function useSocket() {
  const [connected, setConnected] = useState(false);
  const socketRef = useRef<SocketLike>(getSocket());
  useEffect(() => {
    const s = socketRef.current;
    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);
    s.on('connect', onConnect);
    s.on('disconnect', onDisconnect);
    setConnected(s.connected);
    return () => {
      s.off('connect', onConnect);
      s.off('disconnect', onDisconnect);
    };
  }, []);
  return { socket: socketRef.current, connected };
}

export function emit<T = any>(event: string, payload?: any): Promise<T> {
  return new Promise((resolve, reject) => {
    getSocket().emit(event, payload, (res: any) => {
      if (res?.ok) resolve(res);
      else reject(new Error(res?.error ?? 'Unknown error'));
    });
  });
}
