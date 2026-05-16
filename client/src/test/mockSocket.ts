// A minimal fake socket.io-client + helpers for tests.
// Tests interact with `mockSocket` to push events as if they came from the server,
// and inspect `emittedEvents` to verify outgoing messages.

import { vi } from 'vitest';

type Handler = (...args: any[]) => void;

export interface EmittedEvent {
  event: string;
  payload: any;
  ack?: (res: any) => void;
}

export class FakeSocket {
  connected = true;
  id = 'fake-socket-id';
  emittedEvents: EmittedEvent[] = [];
  private handlers = new Map<string, Set<Handler>>();
  // What to respond with for ack-based emits
  private ackResponses = new Map<string, any>();

  on(event: string, fn: Handler) {
    if (!this.handlers.has(event)) this.handlers.set(event, new Set());
    this.handlers.get(event)!.add(fn);
    return this;
  }

  off(event: string, fn?: Handler) {
    if (!fn) {
      this.handlers.delete(event);
    } else {
      this.handlers.get(event)?.delete(fn);
    }
    return this;
  }

  once(event: string, fn: Handler) {
    const wrap = (...args: any[]) => {
      fn(...args);
      this.off(event, wrap);
    };
    return this.on(event, wrap);
  }

  emit(event: string, payload: any, ack?: (res: any) => void) {
    this.emittedEvents.push({ event, payload, ack });
    if (ack) {
      const queued = this.ackResponses.get(event);
      if (queued !== undefined) {
        this.ackResponses.delete(event);
        // Defer so the caller can attach further state
        Promise.resolve().then(() => ack(queued));
      }
    }
    return this;
  }

  disconnect() {
    this.connected = false;
    return this;
  }

  // ---- helpers for tests ----

  /** Trigger an event as if the server sent it. */
  serverEmit(event: string, ...args: any[]) {
    const hs = this.handlers.get(event);
    if (!hs) return;
    for (const h of hs) h(...args);
  }

  /** Queue the next ack response for a given emit event. */
  queueAck(event: string, response: any) {
    this.ackResponses.set(event, response);
  }

  /** Find the most recent emit matching the event name. */
  lastEmit(event: string): EmittedEvent | undefined {
    return [...this.emittedEvents].reverse().find((e) => e.event === event);
  }

  reset() {
    this.emittedEvents = [];
    this.handlers.clear();
    this.ackResponses.clear();
    this.connected = true;
  }
}

export const mockSocket = new FakeSocket();

// Mock socket.io-client so any import returns our fake.
vi.mock('socket.io-client', () => {
  return {
    io: vi.fn(() => mockSocket),
    Socket: class {},
  };
});

export function resetMockSocket() {
  mockSocket.reset();
}
