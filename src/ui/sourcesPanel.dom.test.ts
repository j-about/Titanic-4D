import { describe, expect, it } from 'vitest';
import { dataset } from '../data/dataset.ts';
import { createTimelineModel } from '../sim/timelineModel.ts';
import { createSourcesPanel } from './sourcesPanel.ts';
import { CERTAINTY_DESCRIPTIONS } from './stateText.ts';

const model = createTimelineModel(dataset);

describe('sources panel', () => {
  it('states what the levels of certainty mean, once, before the records', () => {
    const panel = createSourcesPanel(dataset, model);
    panel.update(model.evaluate(3600));
    const legends = panel.element.querySelectorAll('details.certainty-legend');
    expect(legends).toHaveLength(1);
    const legend = legends[0];
    for (const description of Object.values(CERTAINTY_DESCRIPTIONS)) {
      expect(legend?.textContent).toContain(description);
    }
    const list = panel.element.querySelector('.source-entries');
    expect(list?.children.length).toBeGreaterThan(0);
    expect(
      (legend?.compareDocumentPosition(list as Node) ?? 0) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it('shows the level of each record as a badge without a tooltip', () => {
    const panel = createSourcesPanel(dataset, model);
    panel.update(model.evaluate(3600));
    const badges = panel.element.querySelectorAll('.source-entry .certainty');
    expect(badges.length).toBeGreaterThan(0);
    expect(panel.element.querySelector('[title]')).toBeNull();
  });

  it('keeps the legend, and whether it is open, when the records change', () => {
    const panel = createSourcesPanel(dataset, model);
    panel.update(model.evaluate(0));
    const legend = panel.element.querySelector<HTMLDetailsElement>('details.certainty-legend');
    if (legend === null) {
      throw new Error('The panel has no legend.');
    }
    legend.open = true;
    panel.update(model.evaluate(9000));
    expect(panel.element.querySelector('details.certainty-legend')).toBe(legend);
    expect(legend.open).toBe(true);
  });
});
