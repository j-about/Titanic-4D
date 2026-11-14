import { describe, expect, it, vi } from 'vitest';
import { createStore } from './store.ts';

describe('store', () => {
  it('merges changes and notifies listeners with the new and previous state', () => {
    const store = createStore({ a: 1, b: 'x' });
    const listener = vi.fn();
    store.subscribe(listener);
    store.update({ a: 2 });
    expect(store.get()).toEqual({ a: 2, b: 'x' });
    expect(listener).toHaveBeenCalledWith({ a: 2, b: 'x' }, { a: 1, b: 'x' });
  });

  it('does not notify when nothing changes', () => {
    const store = createStore({ a: 1 });
    const listener = vi.fn();
    store.subscribe(listener);
    store.update({ a: 1 });
    expect(listener).not.toHaveBeenCalled();
  });

  it('stops notifying a removed listener', () => {
    const store = createStore({ a: 1 });
    const listener = vi.fn();
    const remove = store.subscribe(listener);
    remove();
    store.update({ a: 2 });
    expect(listener).not.toHaveBeenCalled();
  });
});
