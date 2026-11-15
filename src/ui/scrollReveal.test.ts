import { describe, expect, it } from 'vitest';
import { scrollDistanceToReveal } from './scrollReveal.ts';

describe('scrollDistanceToReveal', () => {
  it('leaves an item that is inside the frame where it is', () => {
    expect(scrollDistanceToReveal(120, 180, 100, 400)).toBe(0);
    expect(scrollDistanceToReveal(100, 400, 100, 400)).toBe(0);
  });

  it('scrolls back by what an item lies before the frame', () => {
    expect(scrollDistanceToReveal(60, 140, 100, 400)).toBe(-40);
  });

  it('scrolls on by what an item lies beyond the frame', () => {
    expect(scrollDistanceToReveal(350, 430, 100, 400)).toBe(30);
  });

  it('aligns an item longer than the frame on the start of the frame', () => {
    expect(scrollDistanceToReveal(150, 500, 100, 400)).toBe(50);
    expect(scrollDistanceToReveal(40, 390, 100, 400)).toBe(-60);
  });
});
