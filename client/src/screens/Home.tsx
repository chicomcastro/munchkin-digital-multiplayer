import { useEffect, useState } from 'react';
import { emit } from '../hooks/useSocket';
import { t } from '../i18n';
import { CardTypeIcon } from '../components/CardTypeIcon';
import { TrophyIcon } from '../components/TrophyIcon';
import { startOfflineGame, OFFLINE_ROOM_CODE, hasSavedOfflineGame, resumeOfflineGame } from '../offline/manager';

type BotDifficulty = 'easy' | 'normal' | 'hard';

type Field = 'name' | 'code' | null;

export function Home({
  onJoined,
  prefilledCode,
  onWatchBots,
}: {
  onJoined: (roomCode: string, playerId: string, name: string) => void;
  prefilledCode?: string | null;
  onWatchBots?: () => void;
}) {
  const [name, setName] = useState(localStorage.getItem('munchkin:name') ?? '');
  const [roomCode, setRoomCode] = useState(prefilledCode ?? '');
  const [busy, setBusy] = useState(false);
  const [errorField, setErrorField] = useState<Field>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [pasted, setPasted] = useState(false);
  const [hasResume, setHasResume] = useState(false);

  // If we arrived with a deep-link code, scroll the join input into view.
  useEffect(() => {
    if (prefilledCode) {
      const el = document.getElementById('munchkin-code-input');
      el?.focus();
    }
  }, [prefilledCode]);

  useEffect(() => {
    let cancelled = false;
    hasSavedOfflineGame().then((has) => { if (!cancelled) setHasResume(has); });
    return () => { cancelled = true; };
  }, []);

  function persistName() {
    localStorage.setItem('munchkin:name', name);
  }

  function setError(field: Field, msg: string | null) {
    setErrorField(field);
    setErrorMsg(msg);
  }

  async function create() {
    setError(null, null);
    if (!name.trim()) return setError('name', t.errChooseName);
    persistName();
    setBusy(true);
    try {
      const res: any = await emit('room:create', { name });
      onJoined(res.roomCode, res.playerId, name);
    } catch (e) {
      setError(null, (e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function join() {
    setError(null, null);
    if (!name.trim()) return setError('name', t.errChooseName);
    if (!roomCode.trim()) return setError('code', t.errEnterRoomCode);
    persistName();
    setBusy(true);
    try {
      const res: any = await emit('room:join', { name, roomCode: roomCode.trim().toUpperCase() });
      onJoined(res.roomCode, res.playerId, name);
    } catch (e) {
      setError(null, (e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  function startOffline(difficulties: BotDifficulty[]) {
    setError(null, null);
    if (!name.trim()) return setError('name', t.errChooseName);
    persistName();
    try {
      const { playerId } = startOfflineGame({ name, difficulties });
      onJoined(OFFLINE_ROOM_CODE, playerId, name);
    } catch (e) {
      setError(null, (e as Error).message);
    }
  }

  async function resumeOffline() {
    setError(null, null);
    try {
      const res = await resumeOfflineGame();
      if (!res) {
        setHasResume(false);
        return;
      }
      onJoined(OFFLINE_ROOM_CODE, res.playerId, name || 'Aventureiro');
    } catch (e) {
      setError(null, (e as Error).message);
    }
  }

  async function pasteCode() {
    try {
      const txt = await navigator.clipboard.readText();
      const cleaned = (txt ?? '').trim().toUpperCase();
      // Either a bare code or a deep-link URL
      const match = cleaned.match(/MNK-[A-Z0-9]{3}/);
      if (match) {
        setRoomCode(match[0]);
        setPasted(true);
        setTimeout(() => setPasted(false), 1500);
        setError(null, null);
      }
    } catch {
      /* clipboard denied — silent */
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 pt-app relative overflow-hidden">
      {/* Background glow — gives the otherwise blank dark canvas a subtle brand feel */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[300px] h-[300px] rounded-full bg-amber-500/10 blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-[200px] h-[200px] rounded-full bg-purple-500/10 blur-3xl" />
      </div>

      <div className="card-shell p-6 w-full max-w-sm anim-fade relative">
        <div className="text-center mb-6">
          <div className="flex items-center justify-center gap-3 mb-2 text-amber-400" aria-hidden="true">
            <CardTypeIcon type="class" size={36} className="opacity-90" />
            <TrophyIcon size={44} />
            <CardTypeIcon type="item" size={36} className="opacity-90" />
          </div>
          <h1 className="text-4xl font-bold text-amber-400 tracking-tight font-display">Munchkin</h1>
          <p className="text-sm opacity-70">{t.homeSubtitle}</p>
          <p className="text-xs opacity-50 mt-1 italic">{t.brandTagline}</p>
        </div>

        <label className="block text-xs uppercase opacity-60 mb-1">{t.yourName}</label>
        <input
          className={[
            'w-full px-3 py-3 rounded-xl bg-[rgba(26,18,8,0.8)] border mb-1',
            errorField === 'name' ? 'border-red-500' : 'border-[rgba(139,90,43,0.4)]',
          ].join(' ')}
          value={name}
          maxLength={24}
          placeholder={t.namePlaceholder}
          onChange={(e) => {
            setName(e.target.value);
            if (errorField === 'name') setError(null, null);
          }}
        />
        {errorField === 'name' && <div className="text-red-400 text-xs mb-2">{errorMsg}</div>}
        {errorField !== 'name' && <div className="mb-3" />}

        <button className="btn-primary w-full mb-4" disabled={busy} onClick={create}>
          {t.createRoom}
        </button>

        <div className="text-center opacity-60 text-xs mb-2">— {t.or} —</div>

        <label className="block text-xs uppercase opacity-60 mb-1">{t.roomCode}</label>
        <div className="flex gap-2 mb-1">
          <input
            id="munchkin-code-input"
            className={[
              'flex-1 px-3 py-3 rounded-xl bg-[rgba(26,18,8,0.8)] border uppercase tracking-widest font-mono',
              errorField === 'code' ? 'border-red-500' : 'border-[rgba(139,90,43,0.4)]',
            ].join(' ')}
            value={roomCode}
            placeholder={t.roomCodePlaceholder}
            onChange={(e) => {
              setRoomCode(e.target.value.toUpperCase());
              if (errorField === 'code') setError(null, null);
            }}
          />
          <button
            type="button"
            className="btn text-sm py-2 px-3 shrink-0"
            onClick={pasteCode}
            aria-label={t.pasteCode}
          >
            📋 {pasted ? t.pasted : t.pasteCode}
          </button>
        </div>
        {errorField === 'code' && <div className="text-red-400 text-xs mb-2">{errorMsg}</div>}
        {errorField !== 'code' && <div className="mb-3" />}

        <button className="btn w-full" disabled={busy} onClick={join}>
          {t.joinRoom}
        </button>

        <div className="mt-5 border-t border-amber-800/30 pt-4">
          {hasResume && (
            <button
              type="button"
              className="btn-primary w-full mb-3 text-sm py-2.5"
              onClick={resumeOffline}
              data-testid="solo-resume"
            >
              ↻ {t.soloResume}
            </button>
          )}
          <div className="text-xs uppercase opacity-60 mb-2 text-center">{t.solo}</div>
          <div className="flex gap-2">
            <button
              type="button"
              className="btn flex-1 text-sm py-2"
              disabled={busy}
              onClick={() => startOffline(['easy'])}
              data-testid="solo-easy"
            >
              {t.soloEasy}
            </button>
            <button
              type="button"
              className="btn flex-1 text-sm py-2"
              disabled={busy}
              onClick={() => startOffline(['normal', 'normal'])}
              data-testid="solo-normal"
            >
              {t.soloNormal}
            </button>
            <button
              type="button"
              className="btn flex-1 text-sm py-2"
              disabled={busy}
              onClick={() => startOffline(['hard', 'hard', 'hard'])}
              data-testid="solo-hard"
            >
              {t.soloHard}
            </button>
          </div>
          <div className="text-[10px] opacity-50 mt-1.5 text-center italic">{t.soloHint}</div>
          {onWatchBots && (
            <button
              type="button"
              className="btn text-xs py-2 w-full mt-3 opacity-80 hover:opacity-100"
              onClick={onWatchBots}
              data-testid="watch-bots"
            >
              👁 {t.watchBots}
            </button>
          )}
        </div>

        {errorField === null && errorMsg && (
          <div className="text-red-400 mt-3 text-sm text-center">{errorMsg}</div>
        )}
      </div>
    </div>
  );
}
