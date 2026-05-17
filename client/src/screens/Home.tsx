import { useState } from 'react';
import { emit } from '../hooks/useSocket';
import { t } from '../i18n';

type Field = 'name' | 'code' | null;

export function Home({
  onJoined,
}: {
  onJoined: (roomCode: string, playerId: string, name: string) => void;
}) {
  const [name, setName] = useState(localStorage.getItem('munchkin:name') ?? '');
  const [roomCode, setRoomCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [errorField, setErrorField] = useState<Field>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

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

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6">
      <div className="card-shell p-6 w-full max-w-sm anim-fade">
        <h1 className="text-4xl font-bold text-amber-400 text-center mb-1 tracking-tight">Munchkin</h1>
        <p className="text-center text-sm opacity-70 mb-6">{t.homeSubtitle}</p>

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
        <input
          className={[
            'w-full px-3 py-3 rounded-xl bg-slate-900 border mb-1 uppercase tracking-widest font-mono',
            errorField === 'code' ? 'border-red-500' : 'border-slate-700',
          ].join(' ')}
          value={roomCode}
          placeholder={t.roomCodePlaceholder}
          onChange={(e) => {
            setRoomCode(e.target.value.toUpperCase());
            if (errorField === 'code') setError(null, null);
          }}
        />
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
