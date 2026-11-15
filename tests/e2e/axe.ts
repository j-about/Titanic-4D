import { AxeBuilder } from '@axe-core/playwright';
import type { Page } from '@playwright/test';

/** Rule sets covering WCAG 2.2 level AA plus axe-core best practices. */
const wcagTags = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'];

export interface AxeViolationSummary {
  readonly id: string;
  readonly impact: string | null | undefined;
  readonly help: string;
  readonly targets: readonly string[];
}

/** Runs axe-core against the current page and returns a compact list of violations. */
export async function findAccessibilityViolations(page: Page): Promise<AxeViolationSummary[]> {
  const results = await new AxeBuilder({ page }).withTags(wcagTags).analyze();
  return results.violations.map((violation) => ({
    id: violation.id,
    impact: violation.impact,
    help: violation.help,
    targets: violation.nodes.map((node) => node.target.join(' ')),
  }));
}
