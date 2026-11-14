import type { Fact } from '../data/schema/facts.ts';

/** Returns the numeric value of the fact with the given identifier. */
export function factValue(facts: readonly Fact[], id: string): number {
  const value = facts.find((fact) => fact.id === id)?.value;
  if (value === undefined) {
    throw new RangeError(`The dataset has no numeric fact "${id}".`);
  }
  return value;
}
