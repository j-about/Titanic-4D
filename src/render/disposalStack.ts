export interface Disposable {
  dispose(): void;
}

/** Keeps what has been created so far, to release all of it at once. */
export interface DisposalStack {
  /** Registers a resource and returns it. */
  own<Resource extends Disposable>(resource: Resource): Resource;
  /** Registers an action to run when the stack is disposed. */
  defer(action: () => void): void;
  /**
   * Releases everything registered, the most recent first, and empties the stack. A resource
   * that fails to release does not keep the others from being released: the first error is
   * thrown once all have been tried.
   */
  dispose(): void;
}

export function createDisposalStack(): DisposalStack {
  const actions: (() => void)[] = [];

  const dispose = (): void => {
    const errors: unknown[] = [];
    for (let action = actions.pop(); action !== undefined; action = actions.pop()) {
      try {
        action();
      } catch (error) {
        errors.push(error);
      }
    }
    if (errors.length > 0) {
      throw errors[0];
    }
  };

  return {
    own(resource) {
      actions.push(() => resource.dispose());
      return resource;
    },
    defer(action) {
      actions.push(action);
    },
    dispose,
  };
}

/**
 * Runs `build` and returns its result. When `build` throws, everything registered in `stack` so
 * far is released and the error of `build` is thrown again; an error of the release itself is
 * handed to `onReleaseError` and does not replace it.
 */
export function buildOrRelease<Result>(
  stack: DisposalStack,
  build: () => Result,
  onReleaseError: (error: unknown) => void,
): Result {
  try {
    return build();
  } catch (error) {
    try {
      stack.dispose();
    } catch (releaseError) {
      onReleaseError(releaseError);
    }
    throw error;
  }
}
