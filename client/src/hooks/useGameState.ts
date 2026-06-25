import { useEffect, useState } from 'react';
import { getSocket, subscribeSocketOverride } from './useSocket';
import type { Card, GameState } from '../types';

export function useGameState() {
  const [state, setState] = useState<GameState | null>(null);
  const [hand, setHand] = useState<Card[]>([]);
  const [fist, setFist] = useState<Card[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  // Bumps every time the active socket transport changes (e.g. when offline
  // mode installs a LocalGame override). The subscriber effect below rebinds
  // its listeners on each bump so we don't keep listening to a stale Socket.
  const [transportRev, setTransportRev] = useState(0);

  useEffect(() => {
    return subscribeSocketOverride(() => setTransportRev((n) => n + 1));
  }, []);

  useEffect(() => {
    const s = getSocket();
    const onState = (g: GameState) => setState(g);
    const onHand = (payload: { hand: Card[]; fist: Card[] }) => {
      setHand(payload.hand);
      setFist(payload.fist);
    };
    const onErr = (msg: string) => {
      setErrorMsg(msg);
      setTimeout(() => setErrorMsg(null), 4000);
    };
    s.on('game:stateUpdate', onState);
    s.on('game:yourHand', onHand);
    s.on('error', onErr);
    return () => {
      s.off('game:stateUpdate', onState);
      s.off('game:yourHand', onHand);
      s.off('error', onErr);
    };
  }, [transportRev]);

  return { state, hand, fist, errorMsg };
}
