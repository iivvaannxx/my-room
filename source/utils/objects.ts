import { type Object3D, Quaternion, Vector3 } from "three";

/**
 * Applies the world matrix to the given Object3D.
 * This function copies the world matrix to the object's local matrix,
 * allowing you to bypass the parent's transformations.
 *
 * @param obj - The Object3D to apply the world matrix to.
 * @returns The Object3D with the applied world matrix.
 */
export function applyWorldMatrix(obj: Object3D) {
  const position = new Vector3();
  const quaternion = new Quaternion();
  const scale = new Vector3();

  obj.updateMatrixWorld();
  obj.matrixWorld.decompose(position, quaternion, scale);
  obj.position.copy(position);
  obj.quaternion.copy(quaternion);
  obj.scale.copy(scale);

  return obj;
}
