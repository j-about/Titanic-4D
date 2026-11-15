import type { Dataset } from '../data/schema/dataset.ts';
import { createFloodingProfile } from '../sim/floodingProfile.ts';
import type { CompartmentStatus, ShipState } from '../sim/timelineModel.ts';
import { el, setAttribute, setText, svgEl } from './dom.ts';

export interface FloodingDiagram {
  readonly element: HTMLElement;
  update(state: ShipState): void;
}

const STATUS_LABELS: Readonly<Record<CompartmentStatus, string>> = {
  dry: 'Dry',
  flooding: 'Flooding',
  flooded: 'Flooded',
};

/** Margin around the hull in the drawing, in metres. */
const MARGIN_M = 3;
/** Depth of water below which a compartment is shown and described as holding none. */
const SHOWN_DEPTH_M = 0.05;

let diagramCount = 0;

/**
 * Creates a longitudinal section of the hull, seen from starboard with the bow on the right,
 * showing the water in each watertight compartment and the level of the sea outside. A table of
 * the same values follows it, so that nothing is conveyed by the drawing alone.
 */
export function createFloodingDiagram(dataset: Dataset): FloodingDiagram {
  const profile = createFloodingProfile(dataset);
  diagramCount += 1;
  const clipId = `flooding-hull-${diagramCount}`;
  const captionId = `flooding-caption-${diagramCount}`;

  const heights = profile.outline.map(([, z]) => z);
  const top = Math.max(...heights) + MARGIN_M;
  const width = profile.xAft - profile.xForward + 2 * MARGIN_M;
  const height = top + MARGIN_M;
  // The drawing has the bow on the right and the keel at the bottom.
  const sx = (x: number): number => profile.xAft + MARGIN_M - x;
  const sy = (z: number): number => top - z;
  const round = (value: number): string => value.toFixed(2);
  const outlinePoints = profile.outline
    .map(([x, z]) => `${round(sx(x))},${round(sy(z))}`)
    .join(' ');

  const waters = profile.compartments.map((compartment) =>
    svgEl('rect', {
      class: 'flooding__water',
      x: round(sx(compartment.xEnd)),
      width: round(compartment.xEnd - compartment.xStart),
      y: round(sy(compartment.floorZ)),
      height: 0,
    }),
  );
  const sea = svgEl('line', { class: 'flooding__sea', x1: 0, x2: round(width), y1: 0, y2: 0 });
  const svg = svgEl(
    'svg',
    {
      class: 'flooding__drawing',
      viewBox: `0 0 ${round(width)} ${round(height)}`,
      role: 'img',
      'aria-labelledby': captionId,
      focusable: 'false',
    },
    [
      svgEl('defs', {}, [
        svgEl('clipPath', { id: clipId }, [svgEl('polygon', { points: outlinePoints })]),
      ]),
      svgEl('polygon', { class: 'flooding__hull', points: outlinePoints }),
      svgEl('g', { 'clip-path': `url(#${clipId})` }, waters),
      svgEl(
        'g',
        {},
        profile.bulkheads.map((bulkhead) =>
          svgEl('line', {
            class: 'flooding__bulkhead',
            x1: round(sx(bulkhead.x)),
            x2: round(sx(bulkhead.x)),
            y1: round(sy(0)),
            y2: round(sy(bulkhead.topZ)),
          }),
        ),
      ),
      sea,
    ],
  );

  const rows = profile.compartments.map((compartment) => {
    const status = el('td');
    const depth = el('td', { class: 'flooding__number' });
    return {
      status,
      depth,
      row: el('tr', {}, [el('th', { scope: 'row', text: compartment.name }), status, depth]),
    };
  });
  const table = el('table', { class: 'flooding__table' }, [
    el('caption', { class: 'visually-hidden', text: 'Water in each watertight compartment' }),
    el('thead', {}, [
      el('tr', {}, [
        el('th', { scope: 'col', text: 'Compartment, from the bow' }),
        el('th', { scope: 'col', text: 'State' }),
        el('th', { scope: 'col', class: 'flooding__number', text: 'Depth of water' }),
      ]),
    ]),
    el(
      'tbody',
      {},
      rows.map((entry) => entry.row),
    ),
  ]);

  const element = el('figure', { class: 'flooding' }, [
    el('figcaption', {
      id: captionId,
      class: 'flooding__caption',
      text: 'Water in the hull, seen from starboard: bow on the right, stern on the left.',
    }),
    svg,
    el('p', {
      class: 'flooding__legend',
      text: 'Filled areas: water inside each compartment. Dashed line: the sea outside.',
    }),
    el('details', { class: 'flooding__details' }, [
      el('summary', { text: 'Water level by compartment' }),
      table,
    ]),
  ]);

  const update = (state: ShipState): void => {
    profile.water(state).forEach((water, index) => {
      const rect = waters[index];
      const row = rows[index];
      if (rect === undefined || row === undefined) {
        return;
      }
      const shown = water.depthM >= SHOWN_DEPTH_M ? water.depthM : 0;
      setAttribute(rect, 'y', round(sy(water.waterZ)));
      setAttribute(rect, 'height', round(shown));
      setText(row.status, STATUS_LABELS[water.status]);
      setText(row.depth, shown > 0 ? `${water.depthM.toFixed(1)} m` : 'None');
    });
    const line = profile.seaLine(state);
    setAttribute(sea, 'visibility', line === null ? 'hidden' : 'visible');
    if (line !== null) {
      setAttribute(sea, 'x1', round(sx(profile.xAft)));
      setAttribute(sea, 'y1', round(sy(line.aftZ)));
      setAttribute(sea, 'x2', round(sx(profile.xForward)));
      setAttribute(sea, 'y2', round(sy(line.forwardZ)));
    }
  };

  return { element, update };
}
