import type { ModelBakedMaps } from "@app/assets/manifest";
import { batchGLTFModel } from "@app/utils/batching";
import { bakedBasicMaterial } from "@app/utils/materials";

import { type BatchedMesh, Matrix4, MeshBasicMaterial, Vector3 } from "three";
import type { GLTF } from "three/addons/loaders/GLTFLoader.js";
import { degToRad, mapLinear } from "three/src/math/MathUtils.js";

/** Defines the logic for the gaming chair in the room. */
export class GamingChair {
  /** The ID assigned to the top geometry part of the chair. */
  private _topGeometryId: number;

  /** The matrix that holds the transform data of the top part of the chair. */
  private _topGeometryMatrix: Matrix4;

  /** The original position for the top part of the chair. */
  private _topGeometryOriginalPosition: Vector3;

  /** The mesh instance of the chair. */
  public readonly mesh: BatchedMesh;

  /** The textures used in the chair. */
  public readonly maps: ModelBakedMaps;

  /**
   * The speed multiplier for the chair's rotation.
   * This is the frequency of the sine wave used to calculate the angle at any given frame.
   */
  public speedMultiplier = 0.6;

  /** The minimum angle the chair can rotate to. */
  public minAngle = -40;

  /** The maximum angle the chair can rotate to. */
  public maxAngle = 25;

  /**
   * Constructs a new chair object from the given GLTF model and baked maps.
   *
   * @param {GLTF} chair - The GLTF model of the chair.
   * @param {ModelBakedMaps} maps - The baked maps for the chair model.
   */
  public constructor(chair: GLTF, maps: ModelBakedMaps) {
    const batchedMesh = batchGLTFModel(chair);

    if (!batchedMesh.ids.has("Chair Seat")) {
      // Our model should have 2 parts, one of them being the chair seat.
      // If we can't find it, we throw an error.
      throw new Error("Top geometry for the gaming chair not found");
    }

    // Reached this point the chair seat exists.
    this._topGeometryId = batchedMesh.ids.get("Chair Seat") as number;

    this.maps = maps;
    this.mesh = batchedMesh.batched;

    // Get the matrix and position of the top geometry part of the chair.
    this._topGeometryMatrix = this.mesh.getMatrixAt(this._topGeometryId, new Matrix4());
    this._topGeometryOriginalPosition = new Vector3().setFromMatrixPosition(
      this._topGeometryMatrix
    );

    this.mesh.material = bakedBasicMaterial(this.maps);
  }

  /**
   * Sets the material of the gaming chair based on the specified mode.
   * @param mode - The mode of the material. Can be "color" or "neutral".
   */
  public setMaterial(mode: "color" | "neutral") {
    const map = mode === "color" ? this.maps.color : this.maps.lightmap;
    this.mesh.material = bakedBasicMaterial(this.maps, { map });
  }

  /**
   * Updates the chair's rotation based on the given time.
   * @param totalTime - The current time since the app started.
   */
  public update(totalTime: number) {
    // Math.sin gives results in range [-1, 1], we want it to rotate between -90 and 25 degrees.
    const targetRotation = mapLinear(
      Math.sin(totalTime * this.speedMultiplier),
      -1,
      1,
      degToRad(this.minAngle),
      degToRad(this.maxAngle)
    );

    // Set the current rotation and the position because it gets lost when setting the rotation.
    this._topGeometryMatrix.makeRotationY(targetRotation);
    this._topGeometryMatrix.setPosition(this._topGeometryOriginalPosition);

    this.mesh.setMatrixAt(this._topGeometryId, this._topGeometryMatrix);
  }
}
