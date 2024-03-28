import type { InstancedMesh, Material, Mesh, Object3D } from "three";

/**
 * Checks if the given object is an instance of THREE.Mesh.
 *
 * @param obj - The object to check.
 * @returns True if the object is a THREE.Mesh, false otherwise.
 */
export function isMesh(obj: Object3D): obj is Mesh {
  return "isMesh" in obj && obj.isMesh === true;
}

/**
 * Checks if the given object is an instance of THREE.InstancedMesh.
 *
 * @param obj - The object to check.
 * @returns True if the object is a THREE.InstancedMesh, false otherwise.
 */
export function isInstancedMesh(obj: Object3D): obj is InstancedMesh {
  return "isInstancedMesh" in obj && obj.isInstancedMesh === true;
}

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
  materials.forEach(callback);
}

/**
 * Iterates over each mesh in the given Object3D and invokes the provided callback function.
 *
 * @param obj - The Object3D to traverse.
 * @param callback - The callback function to be called for each mesh.
 */
export function forEachMesh(obj: Object3D, callback: (mesh: Mesh) => void) {
  obj.traverse((child) => {
    if (isMesh(child)) {
      callback(child);
    }
  });
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
