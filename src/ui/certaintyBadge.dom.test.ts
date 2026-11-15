import { describe, expect, it } from 'vitest';
import type { Certainty } from '../data/schema/common.ts';
import { certaintyBadge, certaintyLegend } from './certaintyBadge.ts';
import { CERTAINTY_DESCRIPTIONS, CERTAINTY_LABELS } from './stateText.ts';

const LEVELS: readonly Certainty[] = ['established', 'estimated', 'debated'];

describe('certainty badge', () => {
  it('shows the level as a word after a symbol hidden from assistive technology', () => {
    for (const level of LEVELS) {
      const badge = certaintyBadge(level);
      expect(badge.textContent).toContain(CERTAINTY_LABELS[level]);
      expect(badge.querySelector('[aria-hidden="true"]')?.textContent).not.toBe('');
      expect(badge.classList.contains(`certainty--${level}`)).toBe(true);
    }
  });

  it('carries nothing that shows on hover only', () => {
    for (const level of LEVELS) {
      const badge = certaintyBadge(level);
      expect(badge.hasAttribute('title')).toBe(false);
      expect(badge.querySelector('[title]')).toBeNull();
    }
  });
});

describe('certainty legend', () => {
  it('lists the three levels with their meaning as text, under a summary', () => {
    const legend = certaintyLegend();
    expect(legend.tagName).toBe('DETAILS');
    expect(legend.querySelector('summary')?.textContent).toBe('What the levels of certainty mean');
    const terms = [...legend.querySelectorAll('dl > dt')];
    const definitions = [...legend.querySelectorAll('dl > dd')];
    expect(
      terms.map((term) => term.querySelector('.certainty span:last-child')?.textContent),
    ).toEqual(LEVELS.map((level) => CERTAINTY_LABELS[level]));
    expect(definitions.map((definition) => definition.textContent)).toEqual(
      LEVELS.map((level) => `${CERTAINTY_DESCRIPTIONS[level]}.`),
    );
    expect(legend.querySelector('[title]')).toBeNull();
  });
});
