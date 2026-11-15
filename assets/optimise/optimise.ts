import { mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import { type Document, NodeIO, PropertyType, type Transform } from '@gltf-transform/core';
import { EXTMeshoptCompression, KHRMeshQuantization } from '@gltf-transform/extensions';
import { dedup, prune, reorder, weld } from '@gltf-transform/functions';
import { MeshoptEncoder } from 'meshoptimizer';

/**
 * Optimises a model exported by Blender: `node optimise.ts <input.glb> <output.glb>`.
 *
 * Positions are rounded to a grid and stay floating-point numbers: every node keeps the identity
 * transform. Normals are rounded to eight bits per component. Identical vertices are then merged,
 * triangles and vertices are reordered for compression, and the buffers are written with
 * EXT_meshopt_compression, normals through its octahedral filter.
 */

/** Number of grid steps per metre to which positions are rounded. */
const POSITION_STEPS_PER_METRE = 256;
/** Largest magnitude of a normal component stored on eight bits. */
const NORMAL_STEPS = 127;

/** Rounds every position to the grid. */
function snapPositions(): Transform {
  return (document: Document): void => {
    for (const accessor of attributeAccessors(document, 'POSITION')) {
      const array = accessor.getArray();
      if (array === null) {
        continue;
      }
      for (let index = 0; index < array.length; index += 1) {
        const value = array[index] ?? 0;
        array[index] = Math.round(value * POSITION_STEPS_PER_METRE) / POSITION_STEPS_PER_METRE;
      }
      accessor.setArray(array);
    }
  };
}

/** Rounds every normal to the values that eight bits per component can hold. */
function snapNormals(): Transform {
  return (document: Document): void => {
    for (const accessor of attributeAccessors(document, 'NORMAL')) {
      const array = accessor.getArray();
      if (array === null) {
        continue;
      }
      for (let index = 0; index < array.length; index += 1) {
        const value = array[index] ?? 0;
        array[index] = Math.round(value * NORMAL_STEPS) / NORMAL_STEPS;
      }
      accessor.setArray(array);
    }
  };
}

/** Lists the accessors used for one vertex attribute, each once. */
function attributeAccessors(document: Document, semantic: 'POSITION' | 'NORMAL') {
  const accessors = new Set(
    document
      .getRoot()
      .listMeshes()
      .flatMap((mesh) => mesh.listPrimitives())
      .map((primitive) => primitive.getAttribute(semantic))
      .filter((accessor) => accessor !== null),
  );
  return [...accessors];
}

const [inputPath, outputPath] = process.argv.slice(2);
if (inputPath === undefined || outputPath === undefined) {
  throw new Error('Usage: node optimise.ts <input.glb> <output.glb>');
}

await MeshoptEncoder.ready;
const io = new NodeIO()
  .registerExtensions([EXTMeshoptCompression, KHRMeshQuantization])
  .registerDependencies({ 'meshopt.encoder': MeshoptEncoder });

const document = await io.read(inputPath);
document.getLogger().info = () => undefined;
await document.transform(
  dedup({ propertyTypes: [PropertyType.MATERIAL, PropertyType.MESH, PropertyType.ACCESSOR] }),
  snapPositions(),
  snapNormals(),
  weld(),
  prune({ keepAttributes: true, keepLeaves: true }),
  reorder({ encoder: MeshoptEncoder, target: 'size' }),
);
document.createExtension(KHRMeshQuantization).setRequired(true);
document
  .createExtension(EXTMeshoptCompression)
  .setRequired(true)
  .setEncoderOptions({ method: EXTMeshoptCompression.EncoderMethod.FILTER });

await mkdir(dirname(outputPath), { recursive: true });
await io.write(outputPath, document);

const primitives = document
  .getRoot()
  .listMeshes()
  .flatMap((mesh) => mesh.listPrimitives());
const triangles = primitives.reduce(
  (sum, primitive) => sum + (primitive.getIndices()?.getCount() ?? 0) / 3,
  0,
);
const vertices = primitives.reduce(
  (sum, primitive) => sum + (primitive.getAttribute('POSITION')?.getCount() ?? 0),
  0,
);
console.info(
  `Wrote ${outputPath}: ${primitives.length} primitives, ${triangles} triangles, ${vertices} vertices`,
);
