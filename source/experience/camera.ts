import CameraControls from "camera-controls";
import {
  Box3,
  Matrix4,
  PerspectiveCamera,
  Quaternion,
  Raycaster,
  Sphere,
  Spherical,
  Vector2,
  Vector3,
  Vector4,
  type WebGLRenderer
} from "three";

let cameraControlsInstalled = false;

// Ensures that the CameraControls library will work as expected.
function ensureCameraControlsInstalled() {
  if (cameraControlsInstalled) {
    return;
  }

  const cameraControlsDeps = {
    Vector2,
    Vector3,
    Vector4,
    Quaternion,
    Matrix4,
    Spherical,
    Box3,
    Sphere,
    Raycaster
  };

  CameraControls.install({ THREE: cameraControlsDeps });
  cameraControlsInstalled = true;
}

// The options expected by each type of camera.
type PerspectiveOptions = ConstructorParameters<typeof PerspectiveCamera>;
type CameraParams = {
  perspective?: PerspectiveOptions | (() => PerspectiveCamera);
  controls?: {
    target: HTMLElement;
  };
};

/** Utility class to easily manage a perspective camera. */
export class SimpleCamera {
  /** The instance of the perspective camera. */
  public readonly perspective: PerspectiveCamera;

  /** The controls for the cameras. */
  private _controls?: CameraControls;

  /**
   * Gets the controls for the camera.
   * If the controls are not initialized, it initializes them with the specified target.
   * @returns The camera controls.
   */
  public get controls() {
    if (!this._controls) {
      throw new Error("Controls not initialized.");
    }

    return this._controls;
  }

  /** Creates a new camera instance.
   * @param options The camera options.
   */
  public constructor(options: CameraParams) {
    const { perspective, controls } = options;

    this.perspective =
      typeof perspective === "function"
        ? perspective()
        : new PerspectiveCamera(...(perspective ?? []));

    if (controls) {
      this.initControls(controls.target);
    }
  }

  /**
   * Updates the camera controls.
   *
   * @param delta - The time delta since the last update.
   * @returns Whether the controls were updated or not.
   */
  public updateControls(delta: number) {
    return this.controls.update(delta);
  }

  /**
   * Initializes the camera controls.
   * @remarks Overwrites the existing controls if they exist.
   *
   * @param controls - The camera controls configuration.
   * @returns The initialized camera controls.
   */
  public initControls(target: HTMLElement) {
    ensureCameraControlsInstalled();

    const controls = new CameraControls(this.perspective, target);
    this._controls = controls;

    return this.controls;
  }

  /** Resets the camera controls. */
  public resetControls() {
    this.controls.reset();
  }

  /**
   * Returns the handler to resize the camera if the dimensions change.
   *
   * @param renderer - The WebGL renderer.
   * @returns The perspective resize handler function.
   */
  public getResizeHandler(renderer: WebGLRenderer) {
    return SimpleCamera.getPerspectiveResizeHandler(renderer, this.perspective);
  }

  /**
   * Returns a resize handler function for a perspective camera.
   * The resize handler updates the camera's aspect ratio, the projection matrix, and resizes the renderer accordingly.
   *
   * @param renderer - The WebGL renderer.
   * @param camera - The perspective camera.
   * @returns The resize handler function.
   */
  public static getPerspectiveResizeHandler(
    renderer: WebGLRenderer,
    camera: PerspectiveCamera
  ) {
    return (width: number, height: number) => {
      camera.aspect = width / height;
      camera.updateProjectionMatrix();

      renderer.setSize(width, height);
    };
  }
}
