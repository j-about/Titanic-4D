import { describe, expect, it } from 'vitest';
import { buildOrRelease, createDisposalStack } from './disposalStack.ts';

describe('disposal stack', () => {
  it('returns what it is given and releases everything, the most recent first', () => {
    const released: string[] = [];
    const stack = createDisposalStack();
    const first = { dispose: () => released.push('first') };
    expect(stack.own(first)).toBe(first);
    stack.defer(() => released.push('second'));
    stack.own({ dispose: () => released.push('third') });
    expect(released).toEqual([]);
    stack.dispose();
    expect(released).toEqual(['third', 'second', 'first']);
  });

  it('releases each resource once, however often it is disposed', () => {
    let count = 0;
    const stack = createDisposalStack();
    stack.own({
      dispose: () => {
        count += 1;
      },
    });
    stack.dispose();
    stack.dispose();
    expect(count).toBe(1);
  });

  it('releases the others when one fails, then reports the first failure', () => {
    const released: string[] = [];
    const stack = createDisposalStack();
    stack.own({ dispose: () => released.push('first') });
    stack.own({
      dispose: () => {
        throw new Error('second failed');
      },
    });
    stack.own({ dispose: () => released.push('third') });
    expect(() => stack.dispose()).toThrow('second failed');
    expect(released).toEqual(['third', 'first']);
  });
});

describe('buildOrRelease', () => {
  it('returns what the build returns and releases nothing', () => {
    const stack = createDisposalStack();
    let released = 0;
    stack.defer(() => {
      released += 1;
    });
    expect(
      buildOrRelease(
        stack,
        () => 'view',
        () => undefined,
      ),
    ).toBe('view');
    expect(released).toBe(0);
  });

  it('releases what was created before the failure and throws the error of the build', () => {
    const stack = createDisposalStack();
    const released: string[] = [];
    const failure = new Error('the scene could not be built');
    stack.defer(() => released.push('renderer'));
    expect(() =>
      buildOrRelease(
        stack,
        () => {
          stack.own({ dispose: () => released.push('environment') });
          stack.own({ dispose: () => released.push('sky') });
          throw failure;
        },
        () => undefined,
      ),
    ).toThrow(failure);
    expect(released).toEqual(['sky', 'environment', 'renderer']);
  });

  it('reports a failed release without hiding the error of the build', () => {
    const stack = createDisposalStack();
    const failure = new Error('the scene could not be built');
    const refusal = new Error('the texture could not be released');
    const reported: unknown[] = [];
    stack.defer(() => {
      throw refusal;
    });
    expect(() =>
      buildOrRelease(
        stack,
        () => {
          throw failure;
        },
        (error) => reported.push(error),
      ),
    ).toThrow(failure);
    expect(reported).toEqual([refusal]);
  });
});
