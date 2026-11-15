import type { DeckId, ShipFile } from '../data/schema/ship.ts';
import { factValue } from './particulars.ts';

/**
 * Rise of a deck above its height amidships at body station `x`, in metres. The sheer is modelled
 * as two parabolic arcs meeting amidships, reaching the recorded rises at the two perpendiculars.
 */
export function sheerRise(ship: ShipFile, x: number): number {
  const length = factValue(ship.particulars, 'length-between-perpendiculars');
  const midship = length / 2;
  const ratio = (x - midship) / midship;
  const rise = ratio < 0 ? ship.sheer.rise_at_bow_m : ship.sheer.rise_at_stern_m;
  return rise * ratio * ratio;
}

/** Height above keel of a deck at body station `x`, in metres. */
export function deckHeightAt(ship: ShipFile, deckId: DeckId, x: number): number {
  const deck = ship.decks.find((candidate) => candidate.id === deckId);
  if (deck === undefined) {
    throw new RangeError(`The dataset has no deck "${deckId}".`);
  }
  return deck.height_amidships_m + (deckId === 'tank-top' ? 0 : sheerRise(ship, x));
}
