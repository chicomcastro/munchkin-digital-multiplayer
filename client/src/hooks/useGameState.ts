import { useEffect, useState } from 'react';
import { getSocket } from './useSocket';
import type { Card, GameState } from '../types';

export function useGameState() {
  const [state, setState] = useState<GameState | null>(null);
  const [hand, setHand] = useState<Card[]>([]);
  const [fist, setFist] = useState<Card[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

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
  }, []);

  return { state, hand, fist, errorMsg };
}
