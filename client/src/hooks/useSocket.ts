import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';

const SERVER_URL =
  (import.meta.env.VITE_SERVER_URL as string | undefined) ?? `http://${window.location.hostname}:3001`;

let singleton: Socket | null = null;

export function getSocket(): Socket {
  if (!singleton) {
    singleton = io(SERVER_URL, { autoConnect: true, transports: ['websocket', 'polling'] });
  }
  return singleton;
}

export function useSocket() {
  const [connected, setConnected] = useState(false);
  const socketRef = useRef<Socket>(getSocket());
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
