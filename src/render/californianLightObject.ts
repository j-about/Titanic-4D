import { color, smoothstep, uniform, uv, vec2 } from 'three/tsl';
import { AdditiveBlending, Group, Sprite, SpriteNodeMaterial } from 'three/webgpu';
import type { SiteFile } from '../data/schema/site.ts';
import type { SceneVector } from '../sim/sceneFrame.ts';
import type { ShipState } from '../sim/timelineModel.ts';
import { starAppearance } from '../sky/starAppearance.ts';
import {
  californianLightPosition,
  isCalifornianLightShown,
  MODELLED_MAGNITUDE,
} from './californianLight.ts';

const LIGHT_COLOUR = 0xffffff;

export interface CalifornianLightFrame {
  readonly state: ShipState;
  readonly cameraPosition: SceneVector;
  /** Height of the viewport in CSS pixels and vertical field of view, to size the light. */
  readonly viewportHeightPx: number;
  readonly fieldOfViewDeg: number;
}

export interface CalifornianLightObject {
  readonly root: Group;
  update(frame: CalifornianLightFrame): void;
  dispose(): void;
}

/**
 * Creates the light of the SS Californian: one white point of constant size on screen and of
 * constant brightness, drawn like a star of the modelled magnitude, without the tint of a star.
 * It stands at its place in the scene, so the ship and the iceberg hide it when they are in
 * front of it. Like the stars and the distress signals it is not dimmed by the fog, and like
 * the sky it is not drawn for a camera below the surface.
 */
export function createCalifornianLightObject(site: SiteFile): CalifornianLightObject {
  const appearance = starAppearance(MODELLED_MAGNITUDE, 0);
  const pixelScale = uniform(0.003);
  const material = new SpriteNodeMaterial({
    blending: AdditiveBlending,
    depthWrite: false,
    transparent: true,
    sizeAttenuation: false,
  });
  material.fog = false;
  const diameter = pixelScale.mul(appearance.radiusPx * 2);
  material.scaleNode = vec2(diameter, diameter);
  const distance = uv().sub(0.5).length().mul(2);
  const disc = smoothstep(1, 0, distance);
  material.colorNode = color(LIGHT_COLOUR).mul(appearance.intensity).mul(disc.mul(disc));

  const light = new Sprite(material);
  const [x, y, z] = californianLightPosition(site);
  light.position.set(x, y, z);
  light.frustumCulled = false;
  light.name = 'californian-light';
  const root = new Group();
  root.add(light);

  const update = (frame: CalifornianLightFrame): void => {
    root.visible = isCalifornianLightShown(frame.state.phase, frame.cameraPosition[1]);
    pixelScale.value =
      (2 * Math.tan((frame.fieldOfViewDeg * Math.PI) / 360)) / Math.max(frame.viewportHeightPx, 1);
  };

  const dispose = (): void => {
    material.dispose();
  };

  return { root, update, dispose };
}
