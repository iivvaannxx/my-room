import type { InstancedMesh, Texture } from "three";
import type { GLTF } from "three/addons/loaders/GLTFLoader.js";

import {
  type UVOffsetableBasicMaterial,
  makeUVOffsetableBasicMaterial
} from "@app/utils/instancing";

import { isInstancedMesh } from "@app/utils/meshes";

/** Useful info about the texture atlas used for the clock textures. */
const CLOCK_ATLAS = {
  // We created an atlas where each texture has this size.
  WIDTH: 345,

  /** Gets the X offset between 0 and 1 for the given digit/colon. */
  getOffset(digit: number | "colon") {
    const { WIDTH } = this;

    // The colon comes the last in the atlas (index 10).
    // The .4 is to center the colon in the texture (arbitrary).
    const index = digit === "colon" ? 10.4 : digit;
    return (index * WIDTH) / (WIDTH * 11);
  }
};

/** Defines the logic that handles the clock over the shelves. */
export class DigitalClock {
  public readonly digits: InstancedMesh;

  /** The material that allows setting each placeholder instance a different digit from the atlas. */
  private _digitsMaterial: UVOffsetableBasicMaterial;

  // The interval used for syncing the clock with the user's time.
  private _interval: number;

  // The current hours and minutes of the clock.
  private _hours: number;
  private _minutes: number;

  /** The current hours displayed in the clock. */
  public get hours() {
    return this._hours;
  }

  /** The current minutes displayed in the clock. */
  public get minutes() {
    return this._minutes;
  }

  /** Is the clock synced with the user's time? */
  public get synced() {
    return this._interval !== -1;
  }

  /**
   * Constructs a new Clock instance.
   *
   * @param clockDigits - The GLTF model containing the clock digits placeholders.
   * @param digitsTexture - The texture atlas containing the clock digits.
   * @param sync - Should the clock be synced with the user's time?
   */

  public constructor(clockDigits: GLTF, digitsTexture: Texture, sync = true) {
    const digitPlaceholders = clockDigits.scene.children[0];

    if (!isInstancedMesh(digitPlaceholders)) {
      // Our clock digit placeholders are instanced meshes.
      throw new Error("The provided GLTF digits model is not an instanced mesh.");
    }

    // The uv's are on the 0.
    digitsTexture.channel = 0;

    this.digits = digitPlaceholders;
    this._digitsMaterial = makeUVOffsetableBasicMaterial({
      map: digitsTexture,
      transparent: true
    });

    this._hours = 0;
    this._minutes = 0;
    this._interval = -1;

    this.digits.material = this._digitsMaterial.material;

    if (sync) {
      this.syncWithUserTime();
    }
  }

  /**
   * Synchronizes the clock with the user's local time.
   * Starts an interval that updates the clock every second.
   *
   * @param setNow - Should the clock be set to the current time immediately?
   */
  public syncWithUserTime(setNow = true) {
    this.stopUserTimeSync();

    const callback = () => {
      const userTime = new Date();
      const hours = userTime.getHours();
      const minutes = userTime.getMinutes();

      this.setTime(hours, minutes);
    };

    this._interval = window.setInterval(callback, 1000);

    if (setNow) {
      callback();
    }
  }

  /** Stops the synchronization with the user's time. */
  public stopUserTimeSync() {
    if (this.synced) {
      window.clearInterval(this._interval);
      this._interval = -1;
    }
  }

  /**
   * Sets the time on the clock.
   *
   * @param hours - The hours value.
   * @param minutes - The minutes value.
   */
  public setTime(hours: number, minutes: number) {
    if (hours === this._hours && minutes === this._minutes) {
      return;
    }

    const hoursTens = Math.floor(hours / 10);
    const hoursOnes = hours % 10;
    const minutesTens = Math.floor(minutes / 10);
    const minutesOnes = minutes % 10;

    this._digitsMaterial.setUVOffsets(this.digits, [
      // The order is important, it comes from the hierarchy exported by blender.
      // Each pair is assigned to a specific geometry inside the instanced mesh.
      // We hardcode the order to avoid making the code more complex.
      [CLOCK_ATLAS.getOffset("colon"), 0],
      [CLOCK_ATLAS.getOffset(hoursTens), 0],
      [CLOCK_ATLAS.getOffset(hoursOnes), 0],
      [CLOCK_ATLAS.getOffset(minutesTens), 0],
      [CLOCK_ATLAS.getOffset(minutesOnes), 0]
    ]);

    this._hours = hours;
    this._minutes = minutes;
  }
}
