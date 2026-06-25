import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

const SERVER_URL =
  (import.meta.env.VITE_SERVER_URL as string | undefined) ?? `http://${window.location.hostname}:3001`;

type EmitFn = (event: string, payload?: any, ack?: (res: any) => void) => void;
export type SocketLike = {
  on: (event: string, handler: (...args: any[]) => void) => void;
  off: (event: string, handler: (...args: any[]) => void) => void;
  emit: EmitFn;
  connected: boolean;
};

let singleton: Socket | null = null;
let override: SocketLike | null = null;
const overrideListeners = new Set<() => void>();

/**
 * Replace the socket singleton with a SocketLike (used for offline mode).
 * Pass null to restore the real Socket.IO connection. Notifies any active
 * useSocket / useGameState hooks so they re-bind to the new transport.
 */
export function setSocketOverride(s: SocketLike | null) {
  override = s;
  for (const l of [...overrideListeners]) l();
}

/** Subscribe to setSocketOverride calls. Returns an unsubscribe. */
export function subscribeSocketOverride(cb: () => void): () => void {
  overrideListeners.add(cb);
  return () => { overrideListeners.delete(cb); };
}

export function getSocket(): SocketLike {
  if (override) return override;
  if (!singleton) {
    singleton = io(SERVER_URL, { autoConnect: true, transports: ['websocket', 'polling'] });
  }
  return singleton;
}

export function useSocket() {
  const [socket, setSocket] = useState<SocketLike>(() => getSocket());
  const [connected, setConnected] = useState<boolean>(() => getSocket().connected);

  useEffect(() => {
    return subscribeSocketOverride(() => {
      const next = getSocket();
      setSocket(next);
      setConnected(next.connected);
    });
  }, []);

  useEffect(() => {
    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);
    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    setConnected(socket.connected);
    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
    };
  }, [socket]);

  return { socket, connected };
}

export function emit<T = any>(event: string, payload?: any): Promise<T> {
  return new Promise((resolve, reject) => {
    getSocket().emit(event, payload, (res: any) => {
      if (res?.ok) resolve(res);
      else reject(new Error(res?.error ?? 'Unknown error'));
    });
  });
}
