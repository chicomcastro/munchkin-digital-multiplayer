import { useEffect, useState } from 'react';
import { Home } from './screens/Home';
import { Lobby } from './screens/Lobby';
import { PlayerView } from './screens/PlayerView';
import { BoardView } from './screens/BoardView';
import { useGameState } from './hooks/useGameState';
import { emit, useSocket } from './hooks/useSocket';
import { t } from './i18n';

interface Session {
  roomCode: string;
  playerId: string;
  name: string;
}

const SESSION_KEY = 'munchkin:session';

function loadSession(): Session | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) as Session : null;
  } catch {
    return null;
  }
}

export default function App() {
  const { connected } = useSocket();
  const { state, hand, fist, errorMsg } = useGameState();
  const [session, setSession] = useState<Session | null>(() => loadSession());
  const [boardMode, setBoardMode] = useState(false);
  const [reconnecting, setReconnecting] = useState(false);

  // Persist session on changes
  useEffect(() => {
    if (session) localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    else localStorage.removeItem(SESSION_KEY);
  }, [session]);

  // Reconnect on socket reconnect
  useEffect(() => {
    if (!connected || !session || state) return;
    setReconnecting(true);
    emit('room:join', { roomCode: session.roomCode, name: session.name, playerId: session.playerId })
      .catch(() => setSession(null))
      .finally(() => setReconnecting(false));
  }, [connected, session, state]);

  function onJoined(roomCode: string, playerId: string, name: string) {
    setSession({ roomCode, playerId, name });
  }

  function leave() {
    setSession(null);
    setBoardMode(false);
    location.reload();
  }

  if (!session) {
    return (
      <>
        <Home onJoined={onJoined} />
        {!connected && <ConnectingBanner />}
      </>
    );
  }

  if (!state) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="card-shell p-6 text-center anim-fade">
          <div className="text-amber-400 font-bold mb-2">{reconnecting ? t.reconnecting : t.connecting}</div>
          <div className="text-sm opacity-60 font-mono">{session.roomCode}</div>
          <button className="btn mt-4" onClick={leave}>{t.leave}</button>
        </div>
      </div>
    );
  }

  let screen;
  if (state.phase === 'lobby') {
    screen = <Lobby state={state} myId={session.playerId} onBoardMode={() => setBoardMode(true)} />;
  } else if (boardMode) {
    screen = <BoardView state={state} onPlayerMode={() => setBoardMode(false)} />;
  } else {
    screen = <PlayerView state={state} hand={hand} fist={fist} myId={session.playerId} onBoardMode={() => setBoardMode(true)} />;
  }

  return (
    <>
      {screen}
      {errorMsg && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-red-700/90 text-white px-4 py-2 rounded-xl shadow-lg z-50 anim-slide-in">
          {errorMsg}
        </div>
      )}
      {!connected && <ConnectingBanner />}
      <button onClick={leave} className="fixed top-2 right-2 text-xs opacity-50 underline z-50">{t.leave}</button>
    </>
  );
}

function ConnectingBanner() {
  return (
    <div className="fixed top-0 inset-x-0 bg-red-700/90 text-white text-center text-xs py-1 z-50">
      {t.disconnectedBanner}
    </div>
  );
}
