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
