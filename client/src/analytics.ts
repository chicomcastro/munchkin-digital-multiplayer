// Analytics wrapper. No-op until VITE_AMPLITUDE_KEY is set at build time.
// See docs/adr/0007-amplitude-analytics.md.

type Props = Record<string, unknown>;

interface AmplitudeBrowser {
  init: (key: string, opts?: any) => void;
  setUserId: (id: string | null) => void;
  identify: (id: any) => void;
  track: (event: string, props?: Props) => void;
  Identify: new () => { set: (key: string, value: any) => any };
}

let amp: AmplitudeBrowser | null = null;
let initialised = false;

async function ensureInit(): Promise<void> {
  if (initialised) return;
  initialised = true;
  const key = import.meta.env.VITE_AMPLITUDE_KEY;
  if (!key) return; // no-op mode
  try {
    // Lazy import — keeps the SDK out of the bundle unless we actually need it.
    const mod = await import('@amplitude/analytics-browser');
    amp = mod as unknown as AmplitudeBrowser;
    amp.init(key, { defaultTracking: { sessions: true, pageViews: false } });
  } catch (e) {
    // SDK missing or failed — stay no-op
    // eslint-disable-next-line no-console
    console.warn('Amplitude SDK unavailable; analytics disabled.', e);
  }
}

// Fire-and-forget init when the module loads (only if key is present)
if (typeof window !== 'undefined' && import.meta.env.VITE_AMPLITUDE_KEY) {
  ensureInit();
}

export function identify(userId: string, traits?: Props) {
  if (!amp) return;
  try {
    amp.setUserId(userId);
    if (traits) {
      const id = new amp.Identify();
      for (const [k, v] of Object.entries(traits)) id.set(k, v);
      amp.identify(id);
    }
  } catch {}
}

export function track(event: string, props?: Props) {
  if (!amp) return;
  try { amp.track(event, props); } catch {}
}

// Typed conveniences — keep call sites tidy and discoverable.
export const trackHomeViewed = (p?: { has_deep_link?: boolean }) => track('home_viewed', p);
export const trackRoomCreated = (p: { variant: string; player_count: number }) => track('room_created', p);
export const trackRoomJoined = (p: { via_deep_link: boolean }) => track('room_joined', p);
export const trackPresetApplied = (p: { preset_id: string }) => track('preset_applied', p);
export const trackShareClicked = (p: { method: 'share' | 'clipboard' }) => track('share_clicked', p);
export const trackLocaleChanged = (p: { locale: string }) => track('locale_changed', p);
