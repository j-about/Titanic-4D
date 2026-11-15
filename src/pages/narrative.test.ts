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

  it('anchors the table of the counts, to which the other pages link', () => {
    expect(page.markup).toContain('<h2 id="lives-lost">Lives lost</h2>');
  });

  it('says in text what the scene shows of the Californian, with the competing positions', () => {
    expect(page.markup).toContain('<h2 id="californian">The light on the horizon</h2>');
    for (const fact of dataset.site.californian) {
      expect(page.markup, fact.id).toContain(`id="fact-${fact.id}"`);
      expect(text, fact.id).toContain(`${fact.title}: ${fact.summary}`);
      for (const alternative of fact.alternatives ?? []) {
        expect(text, fact.id).toContain(`${alternative.holder}: ${alternative.position}`);
      }
    }
    expect(text).toContain('Captain Lord: 19 to 19½ miles.');
    expect(text).toContain('Samuel Halpern: 12 to at most about 14 nautical miles.');
  });

  it('keeps the chronology the only list of dated events', () => {
    expect(page.markup.match(/class="chronicle"/g)).toHaveLength(1);
  });

  it('gives a wireless message as debated, with the times the other clock offsets give', () => {
    const start = page.markup.indexOf('id="event-wireless-cqd-repeated"');
    const item = page.markup.slice(start, page.markup.indexOf('</details>', start));
    expect(item).toContain('Debated, give or take 3 min.');
    expect(item).toContain('this log entry falls at 12:18 a.m.');
  });

  it('contains no unresolved value', () => {
    expect(text).not.toMatch(/undefined|null|NaN/);
  });
});
