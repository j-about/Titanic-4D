import { describe, expect, it } from 'vitest';
import { dataset } from '../data/dataset.ts';
import { createTimelineModel } from '../sim/timelineModel.ts';
import { createFloodingDiagram } from './floodingDiagram.ts';

const model = createTimelineModel(dataset);

function waterHeights(element: HTMLElement): number[] {
  return [...element.querySelectorAll('.flooding__water')].map((rect) =>
    Number(rect.getAttribute('height')),
  );
}

describe('flooding diagram', () => {
  it('is an image named by its caption, followed by a table of the same values', () => {
    const { element } = createFloodingDiagram(dataset);
    const drawing = element.querySelector('svg');
    const captionId = drawing?.getAttribute('aria-labelledby') ?? '';
    expect(drawing?.getAttribute('role')).toBe('img');
    expect(element.querySelector(`#${captionId}`)?.textContent).toContain('bow on the right');
    expect(element.querySelectorAll('tbody tr')).toHaveLength(16);
    expect(element.querySelectorAll('thead th[scope="col"]')).toHaveLength(3);
    expect(element.querySelectorAll('tbody th[scope="row"]')).toHaveLength(16);
  });

  it('shows no water at the collision', () => {
    const diagram = createFloodingDiagram(dataset);
    diagram.update(model.evaluate(0));
    expect(waterHeights(diagram.element).every((height) => height === 0)).toBe(true);
    expect(diagram.element.querySelector('tbody tr td')?.textContent).toBe('Dry');
    expect(diagram.element.querySelector('.flooding__sea')?.getAttribute('visibility')).toBe(
      'visible',
    );
  });

  it('fills the forward compartments an hour later, in the drawing and in the table', () => {
    const diagram = createFloodingDiagram(dataset);
    diagram.update(model.evaluate(3600));
    const heights = waterHeights(diagram.element);
    expect(heights[1]).toBeGreaterThan(5);
    expect(heights[12]).toBe(0);
    const rows = [...diagram.element.querySelectorAll('tbody tr')];
    expect(rows[1]?.textContent).toMatch(/No\. 1 hold(Flooding|Flooded)\d+\.\d m/);
    expect(rows[12]?.textContent).toContain('DryNone');
  });

  it('tilts the sea line as the ship trims by the head, and hides it once the hull has parted', () => {
    const diagram = createFloodingDiagram(dataset);
    diagram.update(model.evaluate(8400));
    const sea = diagram.element.querySelector('.flooding__sea');
    // The bow is on the right; a higher sea there is a smaller y.
    expect(Number(sea?.getAttribute('y2'))).toBeLessThan(Number(sea?.getAttribute('y1')) - 15);
    diagram.update(model.evaluate(model.breakSeconds + 30));
    expect(sea?.getAttribute('visibility')).toBe('hidden');
  });

  it('gives each diagram its own identifiers', () => {
    const first = createFloodingDiagram(dataset).element.querySelector('clipPath')?.id;
    const second = createFloodingDiagram(dataset).element.querySelector('clipPath')?.id;
    expect(first).not.toBe(second);
  });
});
