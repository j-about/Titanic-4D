/**
 * Accumulates triangles in body coordinates (`x` aft of the forward perpendicular, `y` to
 * starboard, `z` above the keel) and returns them as typed arrays in scene coordinates, where
 * `X` points forward, `Y` up and `Z` to starboard. Faces are flat-shaded: every quad owns its
 * vertices and its normal.
 */

export type Rgb = readonly [number, number, number];

export interface BodyVertex {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

export interface MeshData {
  readonly positions: Float32Array;
  readonly normals: Float32Array;
  readonly colors: Float32Array;
  readonly indices: Uint32Array;
}

/** A closed outline in the horizontal plane, given as `[x, y]` pairs. */
export type PlanOutline = readonly (readonly [number, number])[];

export interface MeshBuilder {
  /** Adds a quad whose corners are listed counter-clockwise when seen from outside. */
  addQuad(a: BodyVertex, b: BodyVertex, c: BodyVertex, d: BodyVertex, color: Rgb): void;
  /**
   * Adds a quad with one normal per corner, for curved surfaces. Corners are listed
   * counter-clockwise when seen from outside; normals are in body coordinates.
   */
  addSmoothQuad(corners: readonly BodyVertex[], normals: readonly BodyVertex[], color: Rgb): void;
  /** Adds a triangle whose corners are listed counter-clockwise when seen from outside. */
  addTriangle(a: BodyVertex, b: BodyVertex, c: BodyVertex, color: Rgb): void;
  /** Adds an axis-aligned box. */
  addBox(x0: number, x1: number, y0: number, y1: number, z0: number, z1: number, color: Rgb): void;
  /**
   * Adds a prism following the sheer: its plan is the rectangle `[x0, x1] × [-halfWidth,
   * halfWidth]`, cut into slices whose base and top heights are given by functions of `x`.
   */
  addSheerBlock(options: SheerBlockOptions): void;
  /** Adds a tube of elliptical section between two centres, closed by a cap at its upper end. */
  addEllipticalTube(options: EllipticalTubeOptions): void;
  build(): MeshData;
}

export interface SheerBlockOptions {
  readonly x0: number;
  readonly x1: number;
  readonly halfWidth: number;
  baseHeight(x: number): number;
  topHeight(x: number): number;
  readonly sideColor: Rgb;
  readonly topColor: Rgb;
  /** Maximum length of a slice, in metres. */
  readonly sliceLength?: number;
}

export interface EllipticalTubeOptions {
  readonly base: BodyVertex;
  readonly top: BodyVertex;
  /** Semi-axis along the hull at the base and at the top. */
  readonly semiLengthBase: number;
  readonly semiLengthTop: number;
  /** Semi-axis across the hull at the base and at the top. */
  readonly semiBreadthBase: number;
  readonly semiBreadthTop: number;
  readonly segments: number;
  /** Bands of colour from the base upward, each ending at a fraction of the height. */
  readonly bands: readonly { readonly until: number; readonly color: Rgb }[];
  readonly capColor: Rgb;
}

const DEFAULT_SLICE_LENGTH_M = 8;

/** Maps body coordinates to scene coordinates. */
function toScene(vertex: BodyVertex): [number, number, number] {
  return [-vertex.x, vertex.z, vertex.y];
}

export function createMeshBuilder(): MeshBuilder {
  const positions: number[] = [];
  const normals: number[] = [];
  const colors: number[] = [];
  const indices: number[] = [];

  const pushFace = (corners: readonly BodyVertex[], color: Rgb): void => {
    const [a, b, c] = corners.map(toScene);
    if (a === undefined || b === undefined || c === undefined) {
      return;
    }
    // Body and scene frames are both right-handed, so the winding is preserved by the mapping.
    const ux = b[0] - a[0];
    const uy = b[1] - a[1];
    const uz = b[2] - a[2];
    const vx = c[0] - a[0];
    const vy = c[1] - a[1];
    const vz = c[2] - a[2];
    let nx = uy * vz - uz * vy;
    let ny = uz * vx - ux * vz;
    let nz = ux * vy - uy * vx;
    const length = Math.hypot(nx, ny, nz);
    if (length === 0) {
      return;
    }
    nx /= length;
    ny /= length;
    nz /= length;
    const first = positions.length / 3;
    for (const corner of corners) {
      positions.push(...toScene(corner));
      normals.push(nx, ny, nz);
      colors.push(color[0], color[1], color[2]);
    }
    for (let index = 1; index < corners.length - 1; index += 1) {
      indices.push(first, first + index, first + index + 1);
    }
  };

  const addSmoothQuad: MeshBuilder['addSmoothQuad'] = (corners, cornerNormals, color) => {
    const first = positions.length / 3;
    corners.forEach((corner, index) => {
      const normal = cornerNormals[index] ?? { x: 0, y: 0, z: 1 };
      const length = Math.hypot(normal.x, normal.y, normal.z) || 1;
      positions.push(...toScene(corner));
      normals.push(
        ...toScene({ x: normal.x / length, y: normal.y / length, z: normal.z / length }),
      );
      colors.push(color[0], color[1], color[2]);
    });
    for (let index = 1; index < corners.length - 1; index += 1) {
      indices.push(first, first + index, first + index + 1);
    }
  };

  const addQuad: MeshBuilder['addQuad'] = (a, b, c, d, color) => {
    pushFace([a, b, c, d], color);
  };

  const addTriangle: MeshBuilder['addTriangle'] = (a, b, c, color) => {
    pushFace([a, b, c], color);
  };

  const addBox: MeshBuilder['addBox'] = (x0, x1, y0, y1, z0, z1, color) => {
    const corner = (x: number, y: number, z: number): BodyVertex => ({ x, y, z });
    // Forward and after faces.
    addQuad(corner(x0, y0, z0), corner(x0, y0, z1), corner(x0, y1, z1), corner(x0, y1, z0), color);
    addQuad(corner(x1, y1, z0), corner(x1, y1, z1), corner(x1, y0, z1), corner(x1, y0, z0), color);
    // Port and starboard faces.
    addQuad(corner(x1, y0, z0), corner(x1, y0, z1), corner(x0, y0, z1), corner(x0, y0, z0), color);
    addQuad(corner(x0, y1, z0), corner(x0, y1, z1), corner(x1, y1, z1), corner(x1, y1, z0), color);
    // Top and bottom faces.
    addQuad(corner(x0, y0, z1), corner(x1, y0, z1), corner(x1, y1, z1), corner(x0, y1, z1), color);
    addQuad(corner(x0, y1, z0), corner(x1, y1, z0), corner(x1, y0, z0), corner(x0, y0, z0), color);
  };

  const addSheerBlock: MeshBuilder['addSheerBlock'] = (options) => {
    const { x0, x1, halfWidth, baseHeight, topHeight, sideColor, topColor } = options;
    const slices = Math.max(
      1,
      Math.ceil((x1 - x0) / (options.sliceLength ?? DEFAULT_SLICE_LENGTH_M)),
    );
    const corner = (x: number, y: number, z: number): BodyVertex => ({ x, y, z });
    for (let slice = 0; slice < slices; slice += 1) {
      const xa = x0 + ((x1 - x0) * slice) / slices;
      const xb = x0 + ((x1 - x0) * (slice + 1)) / slices;
      const za0 = baseHeight(xa);
      const za1 = topHeight(xa);
      const zb0 = baseHeight(xb);
      const zb1 = topHeight(xb);
      addQuad(
        corner(xb, -halfWidth, zb0),
        corner(xb, -halfWidth, zb1),
        corner(xa, -halfWidth, za1),
        corner(xa, -halfWidth, za0),
        sideColor,
      );
      addQuad(
        corner(xa, halfWidth, za0),
        corner(xa, halfWidth, za1),
        corner(xb, halfWidth, zb1),
        corner(xb, halfWidth, zb0),
        sideColor,
      );
      addQuad(
        corner(xa, -halfWidth, za1),
        corner(xb, -halfWidth, zb1),
        corner(xb, halfWidth, zb1),
        corner(xa, halfWidth, za1),
        topColor,
      );
    }
    const zStart0 = baseHeight(x0);
    const zStart1 = topHeight(x0);
    const zEnd0 = baseHeight(x1);
    const zEnd1 = topHeight(x1);
    addQuad(
      corner(x0, -halfWidth, zStart0),
      corner(x0, -halfWidth, zStart1),
      corner(x0, halfWidth, zStart1),
      corner(x0, halfWidth, zStart0),
      sideColor,
    );
    addQuad(
      corner(x1, halfWidth, zEnd0),
      corner(x1, halfWidth, zEnd1),
      corner(x1, -halfWidth, zEnd1),
      corner(x1, -halfWidth, zEnd0),
      sideColor,
    );
  };

  const addEllipticalTube: MeshBuilder['addEllipticalTube'] = (options) => {
    const { base, top, segments, bands, capColor } = options;
    const ring = (ratio: number): BodyVertex[] => {
      const semiLength =
        options.semiLengthBase + (options.semiLengthTop - options.semiLengthBase) * ratio;
      const semiBreadth =
        options.semiBreadthBase + (options.semiBreadthTop - options.semiBreadthBase) * ratio;
      const centre: BodyVertex = {
        x: base.x + (top.x - base.x) * ratio,
        y: base.y + (top.y - base.y) * ratio,
        z: base.z + (top.z - base.z) * ratio,
      };
      return Array.from({ length: segments }, (_unused, index) => {
        const angle = (2 * Math.PI * index) / segments;
        return {
          x: centre.x + semiLength * Math.cos(angle),
          y: centre.y + semiBreadth * Math.sin(angle),
          z: centre.z,
        };
      });
    };
    let from = 0;
    for (const band of bands) {
      const lower = ring(from);
      const upper = ring(band.until);
      for (let index = 0; index < segments; index += 1) {
        const next = (index + 1) % segments;
        const a = lower[index];
        const b = lower[next];
        const c = upper[next];
        const d = upper[index];
        if (a !== undefined && b !== undefined && c !== undefined && d !== undefined) {
          addQuad(a, b, c, d, band.color);
        }
      }
      from = band.until;
    }
    const rim = ring(1);
    const centre: BodyVertex = top;
    for (let index = 0; index < segments; index += 1) {
      const a = rim[index];
      const b = rim[(index + 1) % segments];
      if (a !== undefined && b !== undefined) {
        addTriangle(centre, a, b, capColor);
      }
    }
  };

  const build = (): MeshData => ({
    positions: new Float32Array(positions),
    normals: new Float32Array(normals),
    colors: new Float32Array(colors),
    indices: new Uint32Array(indices),
  });

  return { addQuad, addSmoothQuad, addTriangle, addBox, addSheerBlock, addEllipticalTube, build };
}
