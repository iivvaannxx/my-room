import type { InstancedMesh, Mesh, Object3D } from "three";

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
