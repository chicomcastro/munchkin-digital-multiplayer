import { useEffect, useState } from 'react';

export function DiceRoll({ result, trigger }: { result?: number | null; trigger: number }) {
  const [face, setFace] = useState<number>(1);
  const [rolling, setRolling] = useState(false);
  useEffect(() => {
    if (!trigger) return;
    setRolling(true);
    const interval = setInterval(() => setFace(1 + Math.floor(Math.random() * 6)), 90);
    const stop = setTimeout(() => {
      clearInterval(interval);
      if (result != null) setFace(result);
      setRolling(false);
    }, 900);
    return () => {
      clearInterval(interval);
      clearTimeout(stop);
    };
  }, [trigger, result]);
  return (
    <div className={['inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-slate-800 text-3xl font-bold border-2 border-slate-600', rolling ? 'shake' : ''].join(' ')}>
      {face}
    </div>
  );
}
