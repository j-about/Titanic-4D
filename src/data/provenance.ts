import type { Alternative, Certainty } from './schema/common.ts';

/** Provenance carried by every record of the dataset. */
export interface Provenance {
  readonly source_ids: readonly string[];
  readonly certainty: Certainty;
  readonly note: string;
  readonly alternatives?: readonly Alternative[] | undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isProvenance(
  value: Record<string, unknown>,
): value is Record<string, unknown> & Provenance {
  return (
    Array.isArray(value['source_ids']) &&
    typeof value['certainty'] === 'string' &&
    typeof value['note'] === 'string'
  );
}

export interface LocatedProvenance {
  /** Path of the record inside the dataset, for example `ship.funnels[0]`. */
  readonly path: string;
  readonly provenance: Provenance;
}

/** Walks any value of the dataset and yields every object that carries provenance fields. */
export function* collectProvenance(value: unknown, path: string): Generator<LocatedProvenance> {
  if (Array.isArray(value)) {
    for (const [index, item] of value.entries()) {
      yield* collectProvenance(item, `${path}[${index}]`);
    }
    return;
  }
  if (!isRecord(value)) {
    return;
  }
  if (isProvenance(value)) {
    yield { path, provenance: value };
  }
  for (const [key, child] of Object.entries(value)) {
    yield* collectProvenance(child, path === '' ? key : `${path}.${key}`);
  }
}

const CERTAINTY_WEAKNESS: Readonly<Record<Certainty, number>> = {
  established: 0,
  estimated: 1,
  debated: 2,
};

/** The least certain of several levels; `established` when the list is empty. */
export function weakestCertainty(levels: readonly Certainty[]): Certainty {
  return levels.reduce<Certainty>(
    (current, level) => (CERTAINTY_WEAKNESS[level] > CERTAINTY_WEAKNESS[current] ? level : current),
    'established',
  );
}

/** Provenance of a statement that rests on several records. */
export interface CombinedProvenance {
  /** The certainty of the least certain record. */
  readonly certainty: Certainty;
  /** Every source cited by the records, in order of first appearance. */
  readonly sourceIds: readonly string[];
  /** The distinct notes of the records, in order of first appearance. */
  readonly notes: readonly string[];
  /** The distinct alternatives of the records, in order of first appearance. */
  readonly alternatives: readonly Alternative[];
}

/**
 * Combines the provenance of the records behind one statement: the certainty is that of the
 * weakest record, the sources and the notes are the union of theirs, and the alternatives are
 * merged, two alternatives being the same when their holder and their position are the same.
 */
export function combineProvenance(records: readonly Provenance[]): CombinedProvenance {
  const alternatives = new Map<string, Alternative>();
  for (const alternative of records.flatMap((record) => record.alternatives ?? [])) {
    const key = `${alternative.holder}|${alternative.position}`;
    if (!alternatives.has(key)) {
      alternatives.set(key, alternative);
    }
  }
  return {
    certainty: weakestCertainty(records.map((record) => record.certainty)),
    sourceIds: [...new Set(records.flatMap((record) => record.source_ids))],
    notes: [...new Set(records.map((record) => record.note))],
    alternatives: [...alternatives.values()],
  };
}
