import { BatchedMesh, type Mesh } from "three";
import type { GLTF } from "three/addons/loaders/GLTFLoader.js";
import type { CamelCase } from "type-fest";

import { forEachMesh } from "@app/utils/meshes";
import { applyWorldMatrix } from "@app/utils/objects";
import camelcase from "camelcase";

/**
 * Three.js expects a known maximum vertex count and geometry count for batching.
 * These function iterates a model and calculates the total number of geometries and vertices.
 *
 * @param model - The GLTF model to calculate the batch size for.
 * @returns An object containing the number of geometries and vertices in the model.
 */
function calculateBatchSize(model: GLTF) {
  let vertices = 0;
  let geometries = 0;

  forEachMesh(model.scene, (child) => {
    vertices += child.geometry.getAttribute("position").count;
    geometries++;
  });

  vertices *= 2;
  return { geometries, vertices };
}

/**
 * Batches a mesh into a batched mesh.
 *
 * @param mesh - The mesh to be batched.
 * @param batchedMesh - The batched mesh to add the mesh to.
 * @returns The ID of the added geometry in the batched mesh.
 */
function batchMesh(mesh: Mesh, batchedMesh: BatchedMesh) {
  const id = batchedMesh.addGeometry(mesh.geometry);

  mesh.updateMatrixWorld();
  batchedMesh.setMatrixAt(id, mesh.matrixWorld);

  return id;
}

/**
 * Batches a GLTF model by combining its geometries and vertices into a single batched mesh.
 * @template TExcluded - The type of excluded mesh names.
 *
 * @param model - The GLTF model to batch.
 * @param exclude - An array of mesh names to exclude from batching.
 * @param sourceBatchedMesh - Optional source batched mesh to append the batched geometries and vertices to.
 * @returns An object containing the batched mesh, an array of batched mesh IDs, and a record of excluded meshes.
 */
export function batchGLTFModel<TExcluded extends string[]>(
  model: GLTF,
  exclude?: TExcluded,
  sourceBatchedMesh?: BatchedMesh
) {
  // Batching requires knowing in advance how many geometries and vertices we will have.
  const { geometries, vertices } = calculateBatchSize(model);
  const batchedMesh =
    sourceBatchedMesh ?? new BatchedMesh(geometries, vertices, vertices * 3);

  const ids: Map<string, number> = new Map();
  const excluded = {} as Record<CamelCase<TExcluded[number]>, Mesh>;

  forEachMesh(model.scene, (child) => {
    // Names from blender replace spaces with '_', but the originals are stored in userData.name.
    child.name = child.userData.name ?? child.name;

    if (exclude?.includes(child.name)) {
      // We are returning the mesh without it's possible parents, so make sure to apply the world matrix.
      applyWorldMatrix(child);

      const camelName = camelcase(child.name) as CamelCase<TExcluded[number]>;
      excluded[camelName] = child;

      return;
    }

    ids.set(child.name, batchMesh(child, batchedMesh));
  });

  return { batched: batchedMesh, ids, excluded };
}
