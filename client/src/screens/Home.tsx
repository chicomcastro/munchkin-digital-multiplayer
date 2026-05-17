import { useEffect, useState } from 'react';
import { emit } from '../hooks/useSocket';
import { t } from '../i18n';

type Field = 'name' | 'code' | null;

export function Home({
  onJoined,
  prefilledCode,
}: {
  onJoined: (roomCode: string, playerId: string, name: string) => void;
  prefilledCode?: string | null;
}) {
  const [name, setName] = useState(localStorage.getItem('munchkin:name') ?? '');
  const [roomCode, setRoomCode] = useState(prefilledCode ?? '');
  const [busy, setBusy] = useState(false);
  const [errorField, setErrorField] = useState<Field>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [pasted, setPasted] = useState(false);

  // If we arrived with a deep-link code, scroll the join input into view.
  useEffect(() => {
    if (prefilledCode) {
      const el = document.getElementById('munchkin-code-input');
      el?.focus();
    }
  }, [prefilledCode]);

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
    <div className="min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background glow — gives the otherwise blank dark canvas a subtle brand feel */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[300px] h-[300px] rounded-full bg-amber-500/10 blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-[200px] h-[200px] rounded-full bg-purple-500/10 blur-3xl" />
      </div>

      <div className="card-shell p-6 w-full max-w-sm anim-fade relative">
        <div className="text-center mb-6">
          <div className="text-5xl mb-1" aria-hidden="true">🎲⚔️🛡️</div>
          <h1 className="text-4xl font-bold text-amber-400 tracking-tight">Munchkin</h1>
          <p className="text-sm opacity-70">{t.homeSubtitle}</p>
          <p className="text-xs opacity-50 mt-1 italic">{t.brandTagline}</p>
        </div>

        <label className="block text-xs uppercase opacity-60 mb-1">{t.yourName}</label>
        <input
          className={[
            'w-full px-3 py-3 rounded-xl bg-slate-900 border mb-1',
            errorField === 'name' ? 'border-red-500' : 'border-slate-700',
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
              'flex-1 px-3 py-3 rounded-xl bg-slate-900 border uppercase tracking-widest font-mono',
              errorField === 'code' ? 'border-red-500' : 'border-slate-700',
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

        {errorField === null && errorMsg && (
          <div className="text-red-400 mt-3 text-sm text-center">{errorMsg}</div>
        )}
      </div>
    </div>
  );
}
