import { useEffect, useState } from 'react';

interface Particle {
  id: string;
  left: number;
  delay: number;
  duration: number;
  rotate: number;
  emoji: string;
  size: number;
}

const EMOJIS = ['🎉', '⭐', '💰', '🪙', '✨', '🎊', '⚔️'];

function spawn(count = 24): Particle[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `c-${Date.now()}-${i}`,
    left: Math.random() * 100,
    delay: Math.random() * 200,
    duration: 1500 + Math.random() * 1500,
    rotate: Math.random() * 720 - 360,
    emoji: EMOJIS[Math.floor(Math.random() * EMOJIS.length)] ?? '🎉',
    size: 16 + Math.floor(Math.random() * 16),
  }));
}

/**
 * Triggers a one-shot burst of falling confetti emojis whenever `trigger`
 * increments. Auto-cleans up after the longest particle lifetime.
 */
export function Confetti({ trigger, count = 24 }: { trigger: number; count?: number }) {
  const [particles, setParticles] = useState<Particle[]>([]);
  useEffect(() => {
    if (!trigger) return;
    const p = spawn(count);
    setParticles(p);
    const longest = Math.max(...p.map((x) => x.delay + x.duration));
    const id = setTimeout(() => setParticles([]), longest + 200);
    return () => clearTimeout(id);
  }, [trigger, count]);

  if (particles.length === 0) return null;
  return (
    <div className="fixed inset-0 pointer-events-none z-40 overflow-hidden" aria-hidden="true">
      {particles.map((p) => (
        <span
          key={p.id}
          className="absolute -top-8 confetti-fall"
          style={{
            left: `${p.left}%`,
            animationDelay: `${p.delay}ms`,
            animationDuration: `${p.duration}ms`,
            fontSize: `${p.size}px`,
            transform: `rotate(${p.rotate}deg)`,
          }}
        >
          {p.emoji}
        </span>
      ))}
    </div>
  );
}
