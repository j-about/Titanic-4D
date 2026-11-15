import { type BodyPoint, bodyToWorld, type Pose } from './pose.ts';

/**
 * Conversions between the frames of the simulation and the frame of the 3D scene.
 *
 * Scene frame: `x` forward along the ship's heading, `y` up, `z` to starboard; the sea surface
 * is the plane `y = 0`. Meshes are built in "local" coordinates, the body frame with its
 * longitudinal axis reversed: `X = −x`, `Y = z`, `Z = y`.
 */
export type SceneVector = readonly [number, number, number];

/** Scene position of a body point of a section in the given pose. */
export function bodyPointToScene(pose: Pose, point: BodyPoint): SceneVector {
  const world = bodyToWorld(pose, point);
  return [world.forward, world.up, world.starboard];
}

function subtract(a: SceneVector, b: SceneVector): SceneVector {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

/**
 * Column-major 4×4 matrix that places a mesh built in local coordinates according to a pose. Its
 * columns are the images of the local axes and of the local origin under `bodyPointToScene`.
 */
export function poseToMatrix(pose: Pose): number[] {
  const origin = bodyPointToScene(pose, { x: 0, y: 0, z: 0 });
  const forward = subtract(bodyPointToScene(pose, { x: -1, y: 0, z: 0 }), origin);
  const up = subtract(bodyPointToScene(pose, { x: 0, y: 0, z: 1 }), origin);
  const starboard = subtract(bodyPointToScene(pose, { x: 0, y: 1, z: 0 }), origin);
  return [
    forward[0],
    forward[1],
    forward[2],
    0,
    up[0],
    up[1],
    up[2],
    0,
    starboard[0],
    starboard[1],
    starboard[2],
    0,
    origin[0],
    origin[1],
    origin[2],
    1,
  ];
}
