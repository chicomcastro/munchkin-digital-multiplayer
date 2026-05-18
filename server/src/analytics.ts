// Server-side analytics wrapper. No-op until AMPLITUDE_KEY is set.
// See docs/adr/0007-amplitude-analytics.md.

type Props = Record<string, unknown>;

interface AmplitudeNode {
  init: (key: string, opts?: any) => any;
  track: (event: { event_type: string; user_id?: string; event_properties?: Props }) => any;
  flush: () => Promise<unknown>;
}

let amp: AmplitudeNode | null = null;
let initialised = false;

async function ensureInit(): Promise<void> {
  if (initialised) return;
  initialised = true;
  const key = process.env.AMPLITUDE_KEY;
  if (!key) return;
  try {
    const mod = await import('@amplitude/analytics-node');
    amp = mod as unknown as AmplitudeNode;
    amp.init(key);
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn('Amplitude Node SDK unavailable; analytics disabled.', (e as Error).message);
  }
}

ensureInit();

export function track(eventType: string, userId?: string, props?: Props) {
  if (!amp) return;
  try {
    amp.track({ event_type: eventType, user_id: userId, event_properties: props });
  } catch {}
}

export async function flush(): Promise<void> {
  if (!amp) return;
  try { await amp.flush(); } catch {}
}

// Typed helpers
export const trackGameStarted = (p: { variant: string; player_count: number }, userId?: string) =>
  track('game_started', userId, p);
export const trackKickDoor = (p: { result: 'monster' | 'curse' | 'hand' }, userId?: string) =>
  track('kick_door', userId, p);
export const trackCombatResolved = (p: { outcome: string; monster_level: number; player_power: number }, userId?: string) =>
  track('combat_resolved', userId, p);
export const trackLevelUp = (p: { new_level: number; reason: string }, userId?: string) =>
  track('level_up', userId, p);
export const trackGameEnded = (p: { outcome: string; duration_ms: number; winner_id?: string | null }, userId?: string) =>
  track('game_ended', userId, p);
