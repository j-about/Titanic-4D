import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createAddressWriter } from './addressWriter.ts';
import { DEFAULT_RATE } from './appState.ts';
import { formatUrlState } from './urlState.ts';

const INTERVAL_MS = 500;

/** A writer over a state that the test moves, recording every address written. */
function setUp(write?: (address: string) => void) {
  const state = { t: 0 };
  const written: string[] = [];
  const refused: unknown[] = [];
  const writer = createAddressWriter({
    intervalMs: INTERVAL_MS,
    format: () =>
      formatUrlState(
        { t: state.t, cameraMode: 'guided', rate: DEFAULT_RATE },
        { renderer: 'auto', quality: 'medium' },
      ),
    write:
      write ??
      ((address) => {
        written.push(address);
      }),
    onRefused: (error) => {
      refused.push(error);
    },
  });
  return { state, written, refused, writer };
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('address writer', () => {
  it('writes the first request at once', () => {
    const { state, written, writer } = setUp();
    state.t = 3600;
    writer.request();
    expect(written).toEqual(['?t=00:40:00&camera=guided&rate=60']);
  });

  it('writes a long run of seeks a few times only and ends on the last instant', () => {
    const { state, written, writer } = setUp();
    // A drag of the scrubber across the night: 664 steps of 15 s, one every 5 ms.
    for (let step = 1; step <= 664; step += 1) {
      state.t = step * 15;
      writer.request();
      vi.advanceTimersByTime(5);
    }
    vi.advanceTimersByTime(INTERVAL_MS);
    expect(written.length).toBeLessThanOrEqual(Math.ceil((664 * 5) / INTERVAL_MS) + 1);
    expect(written.at(-1)).toBe('?t=02:26:00&camera=guided&rate=60');
    vi.advanceTimersByTime(10 * INTERVAL_MS);
    expect(written.at(-1)).toBe('?t=02:26:00&camera=guided&rate=60');
  });

  it('never writes more often than once per interval', () => {
    const times: number[] = [];
    const { state, writer } = setUp(() => {
      times.push(Date.now());
    });
    for (let request = 0; request < 2000; request += 1) {
      state.t = request;
      writer.request();
      vi.advanceTimersByTime(3);
    }
    vi.advanceTimersByTime(INTERVAL_MS);
    expect(times.length).toBeGreaterThan(2);
    for (let index = 1; index < times.length; index += 1) {
      expect((times[index] ?? 0) - (times[index - 1] ?? 0)).toBeGreaterThanOrEqual(INTERVAL_MS);
    }
  });

  it('writes nothing more once the last state has been written', () => {
    const { written, writer } = setUp();
    writer.request();
    vi.advanceTimersByTime(10 * INTERVAL_MS);
    expect(written).toHaveLength(1);
  });

  it('survives a write that the browser refuses, and writes again afterwards', () => {
    const accepted: string[] = [];
    const refuse = (): void => {
      throw new DOMException('Too many calls to history.replaceState.', 'SecurityError');
    };
    const accept = (address: string): void => {
      accepted.push(address);
    };
    let browser: (address: string) => void = refuse;
    const { state, refused, writer } = setUp((address) => browser(address));
    for (let request = 1; request <= 250; request += 1) {
      state.t = request * 15;
      expect(() => writer.request()).not.toThrow();
      vi.advanceTimersByTime(5);
    }
    expect(() => vi.advanceTimersByTime(INTERVAL_MS)).not.toThrow();
    expect(refused.length).toBeGreaterThan(0);
    expect(refused.every((error) => error instanceof DOMException)).toBe(true);
    expect(accepted).toEqual([]);

    browser = accept;
    vi.advanceTimersByTime(INTERVAL_MS);
    state.t = 9600;
    writer.request();
    expect(accepted).toEqual(['?t=02:20:00&camera=guided&rate=60']);
  });

  it('drops the waiting write when disposed', () => {
    const { state, written, writer } = setUp();
    writer.request();
    state.t = 60;
    writer.request();
    writer.dispose();
    vi.advanceTimersByTime(10 * INTERVAL_MS);
    expect(written).toHaveLength(1);
  });

  it('makes the waiting write at once when flushed, and nothing when none is waiting', () => {
    const { state, written, writer } = setUp();
    writer.flush();
    expect(written).toHaveLength(0);
    writer.request();
    state.t = 60;
    writer.request();
    writer.flush();
    expect(written).toEqual([
      '?t=23:40:00&camera=guided&rate=60',
      '?t=23:41:00&camera=guided&rate=60',
    ]);
    vi.advanceTimersByTime(10 * INTERVAL_MS);
    expect(written).toHaveLength(2);
  });
});
