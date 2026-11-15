import starCatalogueUrl from '../sky/bright-stars.bin?url';
import { decodeStarCatalogue, type StarField } from '../sky/starCatalogue.ts';
import { SceneResourceError } from './sceneResourceError.ts';

/**
 * Fetches and decodes the catalogue of bright stars. Rejects with a `SceneResourceError` when
 * the file cannot be fetched, is answered with an error status or cannot be decoded.
 */
export async function loadStarCatalogue(): Promise<StarField> {
  let response: Response;
  try {
    response = await fetch(starCatalogueUrl);
  } catch (cause) {
    throw new SceneResourceError('The star catalogue could not be fetched.', { cause });
  }
  if (!response.ok) {
    throw new SceneResourceError(
      `The star catalogue could not be loaded (HTTP ${response.status}).`,
    );
  }
  try {
    return decodeStarCatalogue(new Uint8Array(await response.arrayBuffer()));
  } catch (cause) {
    throw new SceneResourceError('The star catalogue could not be read.', { cause });
  }
}
