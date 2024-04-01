import type { ModelBakedMaps } from "@app/assets/manifest";
import {
  DoubleSide,
  type Material,
  type Mesh,
  MeshBasicMaterial,
  type MeshBasicMaterialParameters
} from "three";

/**
 * Iterates over each material in a mesh object and invokes a callback function.
 *
 * @param obj - The mesh object.
 * @param callback - The callback function to be invoked for each material.
 */
export function forEachMaterial(obj: Mesh, callback: (mat: Material) => void) {
  if (!obj.material) {
    return;
  }

  const materials = Array.isArray(obj.material) ? obj.material : [obj.material];

  for (const mat of materials) {
    callback(mat);
  }
}

/**
 * Resets the materials of a given mesh object.
 * @remarks The materials will be disposed, ensure that they are not used elsewhere.
 *
 * @param obj - The mesh object whose materials need to be reset.
 */
export function resetMaterials(obj: Mesh) {
  forEachMaterial(obj, (mat) => mat.dispose());
  obj.material = [];
}

/**
 * Creates a baked basic material with the given maps and optional extra parameters.
 *
 * @param maps - The baked maps for the material.
 * @param extraParams - Additional parameters for the material.
 * @returns The created MeshBasicMaterial.
 */
export function bakedBasicMaterial(
  maps: ModelBakedMaps,
  extraParams?: MeshBasicMaterialParameters
) {
  return new MeshBasicMaterial({
    map: maps.color,
    side: DoubleSide,

    ...extraParams
  });
}
