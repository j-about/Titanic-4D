import { afterEach, describe, expect, it, vi } from 'vitest';
import { BYTES_PER_STAR, encodeStarCatalogue } from '../sky/starCatalogue.ts';
import { SceneResourceError } from './sceneResourceError.ts';
import { loadStarCatalogue } from './starCatalogueLoader.ts';

const catalogue = Uint8Array.from(
  encodeStarCatalogue([
    { rightAscensionDeg: 101.29, declinationDeg: -16.72, magnitude: -1.46, colourIndex: 0 },
    { rightAscensionDeg: 37.95, declinationDeg: 89.26, magnitude: 2.02, colourIndex: 0.6 },
  ]),
);

const respondWith = (response: Response): void => {
  vi.stubGlobal(
    'fetch',
    vi.fn(() => Promise.resolve(response)),
  );
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('star catalogue loader', () => {
  it('decodes the catalogue that the server answers with', async () => {
    respondWith(new Response(catalogue));
    const stars = await loadStarCatalogue();
    expect(stars.count).toBe(2);
    expect(stars.magnitudes[0]).toBeCloseTo(-1.46, 2);
  });

  it('reports an error status as a missing resource of the scene', async () => {
    respondWith(new Response(null, { status: 503 }));
    await expect(loadStarCatalogue()).rejects.toBeInstanceOf(SceneResourceError);
    await expect(loadStarCatalogue()).rejects.toThrow('HTTP 503');
  });

  it('reports a request that fails as a missing resource of the scene, with its cause', async () => {
    const cause = new TypeError('Failed to fetch');
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.reject(cause)),
    );
    const error: unknown = await loadStarCatalogue().catch((reason: unknown) => reason);
    expect(error).toBeInstanceOf(SceneResourceError);
    expect((error as SceneResourceError).cause).toBe(cause);
  });

  it('reports a truncated catalogue as a missing resource of the scene', async () => {
    respondWith(new Response(catalogue.slice(0, BYTES_PER_STAR + 3)));
    await expect(loadStarCatalogue()).rejects.toBeInstanceOf(SceneResourceError);
  });

  it('names its errors, so that they can be told from the failure of a renderer', () => {
    const error = new SceneResourceError('message');
    expect(error.name).toBe('SceneResourceError');
    expect(error).toBeInstanceOf(Error);
    expect(new Error('message')).not.toBeInstanceOf(SceneResourceError);
  });
});
