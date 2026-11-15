import { describe, expect, it } from 'vitest';
import { dataset } from '../data/dataset.ts';
import { createTimelineModel } from '../sim/timelineModel.ts';
import { textOf } from './html.ts';
import { renderNarrative } from './narrative.ts';

const model = createTimelineModel(dataset);
const page = renderNarrative(dataset, model);
const text = textOf(page);

describe('text narrative', () => {
  it('tells every event of the night, in order', () => {
    expect(page.markup.match(/class="chronicle__item"/g)).toHaveLength(model.events.length);
    let position = -1;
    for (const event of model.events) {
      const next = page.markup.indexOf(`id="event-${event.id}"`);
      expect(next, event.id).toBeGreaterThan(position);
      position = next;
    }
  });

  it('gives the time, the description, the certainty and the sources of an event', () => {
    expect(text).toContain('11:40 p.m. Collision with the iceberg');
    const collision = model.events[0];
    expect(text).toContain(collision?.description ?? '');
    expect(page.markup).toContain('href="/?t=23:40:00"');
    expect(page.markup).toMatch(/<details><summary>Sources/);
  });

  it('gives the count of each source separately', () => {
    for (const entry of dataset.people.casualty_counts) {
      expect(text).toContain(entry.holder);
    }
    expect(text).toContain('1,490');
    expect(text).toContain('1,517');
    expect(text).toContain('none is preferred');
  });

  it('contains no unresolved value', () => {
    expect(text).not.toMatch(/undefined|null|NaN/);
  });
});
