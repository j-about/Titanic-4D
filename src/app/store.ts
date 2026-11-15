/** Minimal observable store: one immutable state object and synchronous listeners. */
export interface Store<State> {
  get(): State;
  /** Merges the given properties into the state and notifies listeners if anything changed. */
  update(changes: Partial<State>): void;
  /** Registers a listener called with the new and the previous state; returns its removal. */
  subscribe(listener: (state: State, previous: State) => void): () => void;
}

export function createStore<State extends object>(initial: State): Store<State> {
  let state = initial;
  const listeners = new Set<(state: State, previous: State) => void>();

  return {
    get: () => state,
    update(changes) {
      const keys = Object.keys(changes) as (keyof State)[];
      if (keys.every((key) => Object.is(state[key], changes[key]))) {
        return;
      }
      const previous = state;
      state = { ...state, ...changes };
      for (const listener of listeners) {
        listener(state, previous);
      }
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}
