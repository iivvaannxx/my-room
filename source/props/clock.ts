import { type Mesh, MeshBasicMaterial, type Texture } from "three";

import type { RecursiveRecord, assetsManifest } from "@app/assets/manifest";
import { resetMaterials } from "@app/utils/meshes";

/** All the textures we use in our digital clock. */
type ClockTexturesPaths = typeof assetsManifest.textures.misc.clock;

/** Recursively type the texture record as Three.js textures. */
type ClockTextures<Paths extends RecursiveRecord<string> = ClockTexturesPaths> = {
  [K in keyof Paths]: Paths[K] extends object ? ClockTextures<Paths[K]> : Texture;
};

// We will be given the meshes in a named record with the following keys.
type ClockObjects = "colon" | "hourTens" | "hourUnits" | "minuteTens" | "minuteUnits";
type ClockObjectsRecord = Record<ClockObjects, Mesh>;

/** Defines the logic that handles the clock over the shelves. */
export class DigitalClock {
  // The textures and objects used in the clock.
  private _textures: ClockTextures;
  private _objects: ClockObjectsRecord;

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
   * @param textures - The textures used for rendering the clock digits and colon.
   * @param objects - The objects used for displaying the clock digits and colon.
   */
  public constructor(textures: ClockTextures, objects: ClockObjectsRecord) {
    this._textures = textures;
    this._objects = objects;
    this._interval = -1;

    for (const digitTexture of Object.values(this._textures.digits)) {
      digitTexture.flipY = false;
    }

    this._textures.colon.flipY = false;
    this._objects.colon.material = new MeshBasicMaterial({
      map: this._textures.colon,
      transparent: true
    });

    this._hours = 0;
    this._minutes = 0;
  }

  /**
   * Synchronizes the clock with the user's local time.
   * Starts an interval that updates the clock every second.
   */
  public syncWithUserTime(setNow = true) {
    if (this._interval !== -1) {
      window.clearInterval(this._interval);
    }

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

  /**
   * Sets the time on the clock.
   *
   * @param hours - The hours value.
   * @param minutes - The minutes value.
   */
  public setTime(hours: number, minutes: number) {
    const hoursDigit = Math.floor(hours / 10);
    const hoursUnit = hours % 10;
    const minutesDigit = Math.floor(minutes / 10);
    const minutesUnit = minutes % 10;

    this.setDigitMaterial(this._objects.hourTens, hoursDigit);
    this.setDigitMaterial(this._objects.hourUnits, hoursUnit);
    this.setDigitMaterial(this._objects.minuteTens, minutesDigit);
    this.setDigitMaterial(this._objects.minuteUnits, minutesUnit);

    this._hours = hours;
    this._minutes = minutes;
  }

  /** Stops the synchronization with the user's time. */
  public stopUserTimeSync() {
    if (this._interval) {
      window.clearInterval(this._interval);
      this._interval = -1;
    }
  }

  /**
   * Creates a digit material for the clock.
   *
   * @param digit - The digit value.
   * @returns The digit material.
   */
  private setDigitMaterial(mesh: Mesh, digit: number) {
    const { digits } = this._textures;
    resetMaterials(mesh);

    mesh.material = new MeshBasicMaterial({
      map: digits[digit as keyof typeof digits],
      transparent: true
    });
  }
}
