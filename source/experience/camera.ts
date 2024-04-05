import CameraControls from "camera-controls";
import {
  Box3,
  Matrix4,
  OrthographicCamera,
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

/** Represents the type of camera. */
export enum CameraMode {
  Perspective = "perspective",
  Orthographic = "orthographic"
}

// The options expected by each type of camera.
type PerspectiveOptions = ConstructorParameters<typeof PerspectiveCamera>;
type OrthographicOptions = ConstructorParameters<typeof OrthographicCamera>;
type CameraParams = {
  perspective?: PerspectiveOptions | (() => PerspectiveCamera);
  orthographic?: OrthographicOptions | (() => OrthographicCamera);

  controls?: {
    target?: HTMLElement;

    configure?: (controls: CameraControls) => void;
    configureForPerspective?: (controls: CameraControls) => void;
    configureForOrthographic?: (controls: CameraControls) => void;
  };
};

/** Utility class to easily switch between orthographic and perspective rendering. */
export class DoubleCamera {
  /** The instance of the orthographic camera. */
  public readonly orthographic: OrthographicCamera;

  /** The instance of the perspective camera. */
  public readonly perspective: PerspectiveCamera;

  /** The type of camera currently in use. */
  private _mode: CameraMode;

  /** The controls for the orthographic camera. */
  private _orthoControls?: CameraControls;

  /** The controls for the perspective camera. */
  private _perspectiveControls?: CameraControls;

  /** The function to reconfigure the camera controls. */
  private reconfigureControls!: () => void;

  /**
   * Gets the mode of the camera.
   * @returns The current mode of the camera.
   */
  public get mode() {
    return this._mode;
  }

  /**
   * Gets the controls for the camera.
   * If the controls are not initialized, it initializes them with the specified target.
   * @returns The camera controls.
   */
  public get controls() {
    const controls =
      this.mode === CameraMode.Perspective
        ? this._perspectiveControls
        : this._orthoControls;

    if (!controls) {
      throw new Error("Controls not initialized.");
    }

    return controls;
  }

  /**
   * Gets the current camera based on the mode.
   *
   * If the mode is Perspective, returns the perspective camera.
   * Otherwise, returns the orthographic camera.
   */
  public get current() {
    if (this.mode === CameraMode.Perspective) {
      return this.perspective;
    }

    return this.orthographic;
  }

  /**
   * Creates a new camera instance.
   *
   * @param type The type of camera (Perspective or Orthographic).
   * @param options The camera options.
   */
  public constructor(mode: CameraMode, options: CameraParams) {
    const { perspective, orthographic, controls } = options;
    this._mode = mode;

    this.perspective =
      typeof perspective === "function"
        ? perspective()
        : new PerspectiveCamera(...(perspective ?? []));

    this.orthographic =
      typeof orthographic === "function"
        ? orthographic()
        : new OrthographicCamera(...(orthographic ?? []));

    if (controls) {
      this.initControls(controls);
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
   * Switches the camera mode.
   * @param mode The camera mode to switch to.
   */
  public switchTo(mode: CameraMode) {
    if (mode === this._mode) {
      return;
    }

    if (this._orthoControls && this._perspectiveControls) {
      const source =
        mode === CameraMode.Perspective ? this._orthoControls : this._perspectiveControls;

      const target =
        mode === CameraMode.Perspective ? this._perspectiveControls : this._orthoControls;

      // TODO: try to replicate the source state to the target without JSON.
      // This overrides the settings of the target with the source settings.
      const json = source.toJSON();
      source.enabled = false;
      target.fromJSON(json);
      target.enabled = true;
    }

    this._mode = mode;
    this.reconfigureControls();
  }

  /**
   * Initializes the camera controls.
   * @remarks Overwrites the existing controls if they exist.
   *
   * @param controls - The camera controls configuration.
   * @returns The initialized camera controls.
   */
  public initControls(controls?: CameraParams["controls"]) {
    ensureCameraControlsInstalled();

    const orthoControls = new CameraControls(this.orthographic, controls?.target);
    orthoControls.enabled = this.mode === CameraMode.Orthographic;
    controls?.configureForOrthographic?.(orthoControls);
    this._orthoControls = orthoControls;

    const perspectiveControls = new CameraControls(this.perspective, controls?.target);
    perspectiveControls.enabled = this.mode === CameraMode.Perspective;
    controls?.configureForPerspective?.(perspectiveControls);
    this._perspectiveControls = perspectiveControls;

    // The general configure is for both controls.
    controls?.configure?.(this._orthoControls);
    controls?.configure?.(this._perspectiveControls);

    this.reconfigureControls = () => {
      if (this.mode === CameraMode.Perspective) {
        controls?.configureForPerspective?.(perspectiveControls);
      }

      if (this.mode === CameraMode.Orthographic) {
        controls?.configureForOrthographic?.(orthoControls);
      }
    };

    return this.controls;
  }

  /**
   * Returns an object containing resize handlers for the camera.
   *
   * @param renderer - The WebGL renderer.
   * @returns An object with perspectiveResize and orthographicResize handlers.
   */
  public getResizeHandlers(renderer: WebGLRenderer) {
    return {
      perspectiveResize: DoubleCamera.getPerspectiveResizeHandler(
        renderer,
        this.perspective
      ),
      orthographicResize: DoubleCamera.getOrthographicResizeHandler(
        renderer,
        this.orthographic
      )
    };
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

  /**
   * Returns a resize handler function for an orthographic camera.
   * The resize handler adjusts the camera's projection matrix and the renderer's size based on the new width and height.
   *
   * @param renderer - The WebGL2 renderer.
   * @param camera - The orthographic camera.
   * @param size - The initial size of the camera.
   * @returns The resize handler function.
   */
  public static getOrthographicResizeHandler(
    renderer: WebGLRenderer,
    camera: OrthographicCamera
  ) {
    return (width: number, height: number, size: number) => {
      const aspect = width / height;
      const sizeMulAspect = size * aspect;

      camera.left = sizeMulAspect / -2;
      camera.right = sizeMulAspect / 2;
      camera.top = size / 2;
      camera.bottom = size / -2;

      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };
  }
}
