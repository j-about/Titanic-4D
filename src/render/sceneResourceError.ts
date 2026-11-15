/**
 * Thrown when a file that the 3D scene cannot do without could not be loaded or read. The scene
 * session ends in the `failed` state on it, without starting another renderer.
 */
export class SceneResourceError extends Error {
  override readonly name = 'SceneResourceError';
}
