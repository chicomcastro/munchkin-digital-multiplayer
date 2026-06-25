import { useEffect, useState } from 'react';
import { Home } from './screens/Home';
import { Lobby } from './screens/Lobby';
import { PlayerView } from './screens/PlayerView';
import { BoardView } from './screens/BoardView';
import { ReplayScreen } from './replay/ReplayScreen';
import { useGameState } from './hooks/useGameState';
import { emit, useSocket } from './hooks/useSocket';
import { useSounds } from './hooks/useSounds';
import { useLocale } from './hooks/useLocale';
import { Onboarding, shouldShowOnboarding } from './components/Onboarding';
import { AppBar } from './components/AppBar';
import { t } from './i18n';
import { trackHomeViewed } from './analytics';
import { endOfflineGame, isOfflineActive, OFFLINE_ROOM_CODE } from './offline/manager';

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

function readDeepLinkCode(): string | null {
  try {
    const params = new URLSearchParams(window.location.search);
    const raw = params.get('code') ?? params.get('room');
    if (!raw) return null;
    const code = raw.toUpperCase().trim();
    return /^MNK-[A-Z0-9]{3}$/.test(code) ? code : null;
  } catch {
    return null;
  }
}

export default function App() {
  const { connected } = useSocket();
  const { state, hand, fist, errorMsg } = useGameState();
  const [session, setSession] = useState<Session | null>(() => loadSession());
  const [boardMode, setBoardMode] = useState(false);
  const [replayMode, setReplayMode] = useState(false);
  const [reconnecting, setReconnecting] = useState(false);
  const [deepLinkCode] = useState<string | null>(() => (loadSession() ? null : readDeepLinkCode()));
  const sound = useSounds();
  const [locale, setLocaleHook] = useLocale();
  const [showOnboarding, setShowOnboarding] = useState<boolean>(() => shouldShowOnboarding());

  useEffect(() => {
    if (!session) trackHomeViewed({ has_deep_link: deepLinkCode != null });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // Offline sessions don't survive a reload — the in-memory GameRoom is
    // gone, so persisting their session id would only force a doomed
    // room:join against the real server on the next page load.
    if (session && session.roomCode !== OFFLINE_ROOM_CODE) {
      localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    } else {
      localStorage.removeItem(SESSION_KEY);
    }
  }, [session]);

  useEffect(() => {
    if (!connected || !session || state) return;
    if (session.roomCode === OFFLINE_ROOM_CODE) return;
    setReconnecting(true);
    emit('room:join', { roomCode: session.roomCode, name: session.name, playerId: session.playerId })
      .catch(() => setSession(null))
      .finally(() => setReconnecting(false));
  }, [connected, session, state]);

  function onJoined(roomCode: string, playerId: string, name: string) {
    setSession({ roomCode, playerId, name });
  }

  function leave() {
    if (isOfflineActive()) endOfflineGame();
    setSession(null);
    setBoardMode(false);
    location.reload();
  }

  // Common chrome — the AppBar at the top + onboarding modal + connecting banner.
  const chrome = (
    <>
      {!connected && <ConnectingBanner />}
      <Onboarding open={showOnboarding} onClose={() => setShowOnboarding(false)} />
      <AppBar
        locale={locale}
        onLocale={setLocaleHook}
        soundEnabled={sound.enabled}
        onToggleSound={sound.toggle}
        onOpenHelp={() => setShowOnboarding(true)}
        onLeave={session ? leave : undefined}
        onToggleView={session && state && state.phase !== 'lobby' ? () => setBoardMode(!boardMode) : undefined}
        viewLabel={boardMode ? t.playerMode.toLowerCase() : t.boardMode.toLowerCase()}
      />
    </>
  );

  if (replayMode) {
    return (
      <>
        <ReplayScreen onLeave={() => setReplayMode(false)} />
        {chrome}
      </>
    );
  }

  if (!session) {
    return (
      <>
        <Home onJoined={onJoined} prefilledCode={deepLinkCode} onWatchBots={() => setReplayMode(true)} />
        {chrome}
      </>
    );
  }

  if (!state) {
    return (
      <>
        <div className="min-h-screen flex items-center justify-center pt-app">
          <div className="card-shell p-6 text-center anim-fade">
            <div className="text-amber-400 font-bold mb-2">{reconnecting ? t.reconnecting : t.connecting}</div>
            <div className="text-sm opacity-60 font-mono">{session.roomCode}</div>
            <button className="btn mt-4" onClick={leave}>{t.leave}</button>
          </div>
        </div>
        {chrome}
      </>
    );
  }

  let screen;
  if (state.phase === 'lobby') {
    screen = <Lobby state={state} myId={session.playerId} onBoardMode={() => setBoardMode(true)} />;
  } else if (boardMode) {
    screen = <BoardView state={state} />;
  } else {
    screen = <PlayerView state={state} hand={hand} fist={fist} myId={session.playerId} sound={sound} onLeave={leave} />;
  }

  return (
    <>
      {screen}
      {errorMsg && (
        <div
          role="alert"
          aria-live="polite"
          className="fixed bottom-20 left-1/2 -translate-x-1/2 bg-red-700/95 text-white px-4 py-2.5 rounded-xl shadow-lg z-50 anim-slide-in flex items-center gap-3 max-w-[90vw]"
          data-testid="app-error-banner"
        >
          <span className="text-sm">{errorMsg}</span>
          <button
            type="button"
            onClick={leave}
            className="text-xs bg-red-900 hover:bg-red-950 border border-red-300/40 rounded px-2 py-1 font-bold uppercase tracking-wide shrink-0"
            data-testid="app-error-leave"
          >
            {t.leave}
          </button>
        </div>
      )}
      {chrome}
    </>
  );
}

function ConnectingBanner() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed top-10 inset-x-0 bg-red-700/95 text-white text-center text-xs py-1 z-50"
    >
      {t.disconnectedBanner}
    </div>
  );
}
