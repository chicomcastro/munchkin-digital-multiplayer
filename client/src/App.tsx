import { useEffect, useState } from 'react';
import { Home } from './screens/Home';
import { Lobby } from './screens/Lobby';
import { PlayerView } from './screens/PlayerView';
import { BoardView } from './screens/BoardView';
import { useGameState } from './hooks/useGameState';
import { emit, useSocket } from './hooks/useSocket';
import { useSounds } from './hooks/useSounds';
import { useLocale } from './hooks/useLocale';
import { Onboarding, shouldShowOnboarding } from './components/Onboarding';
import { t, LOCALES } from './i18n';
import { trackHomeViewed } from './analytics';

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
  const [reconnecting, setReconnecting] = useState(false);
  const [deepLinkCode] = useState<string | null>(() => (loadSession() ? null : readDeepLinkCode()));
  const sound = useSounds();
  const [locale, setLocaleHook] = useLocale();
  const [showOnboarding, setShowOnboarding] = useState<boolean>(() => shouldShowOnboarding());

  // Track home-viewed on first mount only (no-op without VITE_AMPLITUDE_KEY).
  useEffect(() => {
    if (!session) trackHomeViewed({ has_deep_link: deepLinkCode != null });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
        <Home onJoined={onJoined} prefilledCode={deepLinkCode} />
        {!connected && <ConnectingBanner />}
        <Onboarding open={showOnboarding} onClose={() => setShowOnboarding(false)} />
        <div className="fixed top-2 right-2 z-50 flex items-center gap-3 text-xs">
          <LocalePicker locale={locale} onChange={setLocaleHook} />
          <button
            onClick={() => setShowOnboarding(true)}
            className="opacity-60 hover:opacity-100"
            aria-label={t.onboardingHelp}
            title={t.onboardingHelp}
          >
            ❓
          </button>
        </div>
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
    screen = <PlayerView state={state} hand={hand} fist={fist} myId={session.playerId} onBoardMode={() => setBoardMode(true)} sound={sound} />;
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
      <Onboarding open={showOnboarding} onClose={() => setShowOnboarding(false)} />
      <div className="fixed top-2 right-2 z-50 flex items-center gap-3 text-xs">
        <LocalePicker locale={locale} onChange={setLocaleHook} />
        <button
          onClick={() => setShowOnboarding(true)}
          className="opacity-60 hover:opacity-100"
          aria-label={t.onboardingHelp}
          title={t.onboardingHelp}
        >
          ❓
        </button>
        <button
          onClick={sound.toggle}
          className="opacity-60 hover:opacity-100"
          aria-label={t.toggleSound}
          title={sound.enabled ? t.soundOn : t.soundOff}
        >
          {sound.enabled ? '🔊' : '🔇'}
        </button>
        <button onClick={leave} className="opacity-50 underline">{t.leave}</button>
      </div>
    </>
  );
}

function LocalePicker({ locale, onChange }: { locale: string; onChange: (l: any) => void }) {
  const current = LOCALES.find((l) => l.code === locale) ?? LOCALES[0]!;
  return (
    <select
      aria-label="Language"
      value={locale}
      onChange={(e) => onChange(e.target.value)}
      className="bg-transparent text-xs opacity-70 hover:opacity-100 cursor-pointer"
    >
      {LOCALES.map((l) => (
        <option key={l.code} value={l.code} className="bg-slate-900 text-white">
          {l.flag} {l.label}
        </option>
      ))}
      <option hidden value={current.code}>{current.flag}</option>
    </select>
  );
}

function ConnectingBanner() {
  return (
    <div className="fixed top-0 inset-x-0 bg-red-700/90 text-white text-center text-xs py-1 z-50">
      {t.disconnectedBanner}
    </div>
  );
}
