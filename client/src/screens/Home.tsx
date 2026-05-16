import { useState } from 'react';
import { emit } from '../hooks/useSocket';

export function Home({
  onJoined,
}: {
  onJoined: (roomCode: string, playerId: string, name: string) => void;
}) {
  const [name, setName] = useState(localStorage.getItem('munchkin:name') ?? '');
  const [roomCode, setRoomCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function persistName() {
    localStorage.setItem('munchkin:name', name);
  }

  async function create() {
    setError(null);
    if (!name.trim()) return setError('Choose a name first.');
    persistName();
    setBusy(true);
    try {
      const res: any = await emit('room:create', { name });
      onJoined(res.roomCode, res.playerId, name);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function join() {
    setError(null);
    if (!name.trim()) return setError('Choose a name first.');
    if (!roomCode.trim()) return setError('Enter a room code.');
    persistName();
    setBusy(true);
    try {
      const res: any = await emit('room:join', { name, roomCode: roomCode.trim().toUpperCase() });
      onJoined(res.roomCode, res.playerId, name);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6">
      <div className="card-shell p-6 w-full max-w-sm">
        <h1 className="text-3xl font-bold text-amber-400 text-center mb-1">Munchkin</h1>
        <p className="text-center text-sm opacity-70 mb-6">Digital Multiplayer</p>
        <label className="block text-xs uppercase opacity-60 mb-1">Your name</label>
        <input
          className="w-full px-3 py-3 rounded-xl bg-slate-900 border border-slate-700 mb-4"
          value={name}
          maxLength={24}
          placeholder="Adventurer"
          onChange={(e) => setName(e.target.value)}
        />
        <button className="btn-primary w-full mb-4" disabled={busy} onClick={create}>
          Create room
        </button>
        <div className="text-center opacity-60 text-xs mb-2">— or —</div>
        <label className="block text-xs uppercase opacity-60 mb-1">Room code</label>
        <input
          className="w-full px-3 py-3 rounded-xl bg-slate-900 border border-slate-700 mb-3 uppercase tracking-widest"
          value={roomCode}
          placeholder="MNK-XXX"
          onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
        />
        <button className="btn w-full" disabled={busy} onClick={join}>
          Join room
        </button>
        {error && <div className="text-red-400 mt-3 text-sm text-center">{error}</div>}
      </div>
    </div>
  );
}
