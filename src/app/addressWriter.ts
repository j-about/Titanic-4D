export interface AddressWriterOptions {
  /** Shortest time between two writes, in milliseconds. */
  readonly intervalMs: number;
  /** Returns the address for the state of the application at the time of the call. */
  format(): string;
  /** Writes the address, for example with `history.replaceState`. It may throw. */
  write(address: string): void;
  /** Called with what `write` threw. */
  onRefused(error: unknown): void;
}

export interface AddressWriter {
  /**
   * Asks for the address to be brought up to date. The first request is written at once; those
   * made within the interval that follows a write are served together by one write at the end
   * of that interval, with the state of that moment. It never throws.
   */
  request(): void;
  /** Makes the write that is waiting, if any, at once: for when the page is about to go. */
  flush(): void;
  /** Cancels the write that is waiting, if any. */
  dispose(): void;
}

/**
 * Writes the address of the page at most once per interval and always ends on the latest state.
 * A write that the browser refuses is reported and dropped.
 */
export function createAddressWriter(options: AddressWriterOptions): AddressWriter {
  let coolingDown: ReturnType<typeof setTimeout> | undefined;
  let pending = false;

  const write = (): void => {
    pending = false;
    try {
      options.write(options.format());
    } catch (error) {
      options.onRefused(error);
    }
    coolingDown = setTimeout(() => {
      coolingDown = undefined;
      if (pending) {
        write();
      }
    }, options.intervalMs);
  };

  return {
    request() {
      if (coolingDown === undefined) {
        write();
      } else {
        pending = true;
      }
    },
    flush() {
      if (pending) {
        clearTimeout(coolingDown);
        coolingDown = undefined;
        write();
      }
    },
    dispose() {
      clearTimeout(coolingDown);
      coolingDown = undefined;
      pending = false;
    },
  };
}
