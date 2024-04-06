import { normalize } from "@app/utils/math";
import CameraControls from "camera-controls";
import {
  Box3,
  CameraHelper,
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
    target: HTMLElement;
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

  /** The controls for the cameras. */
  private _controls?: CameraControls;

  /** The last zoom value of the perspective camera. */
  private _lastPerspectiveZoom = 1;

  /** The last zoom value of the orthographic camera. */
  private _lastOrthoZoom = 1;

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
    if (!this._controls) {
      throw new Error("Controls not initialized.");
    }

    return this._controls;
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
   * Switches the camera mode.
   * @param newMode The camera mode to switch to.
   */
  public switchTo(newMode: CameraMode) {
    if (newMode === this._mode) {
      return;
    }
    // Some controls are lost when switching between modes, so we save them before change.
    const prevControls = this.controls;
    const azimuth = prevControls.azimuthAngle;
    const polar = prevControls.polarAngle;
    const [x, y, z] = prevControls.getPosition(new Vector3()).toArray();

    if (newMode === CameraMode.Perspective) {
      this.switchToPerspective();
    } else {
      this.switchToOrthographic();
    }

    // And restore them after the change.
    this.controls.setPosition(x, y, z);
    this.controls.azimuthAngle = azimuth;
    this.controls.polarAngle = polar;
  }

  private switchToPerspective() {
    this.controls.mouseButtons.wheel = CameraControls.ACTION.DOLLY;
    this.controls.touches.two = CameraControls.ACTION.TOUCH_DOLLY_TRUCK;

    this._lastOrthoZoom = this.orthographic.zoom;
    this.controls.camera = this.perspective;
    this._mode = CameraMode.Perspective;

    this.controls.zoomTo(this._lastPerspectiveZoom);
  }

  private switchToOrthographic() {
    this.controls.mouseButtons.wheel = CameraControls.ACTION.ZOOM;
    this.controls.touches.two = CameraControls.ACTION.TOUCH_ZOOM_TRUCK;

    DoubleCamera.approximateOrthographicSizeFromPerspective(
      this.perspective,
      this.orthographic,
      this.perspective.position.distanceTo(this.controls.getTarget(new Vector3()))
    );

    this._lastPerspectiveZoom = this.perspective.zoom;
    this.controls.camera = this.orthographic;
    this._mode = CameraMode.Orthographic;

    this.controls.zoomTo(this._lastOrthoZoom);
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

    const controls = new CameraControls(this.current, target);
    this._controls = controls;

    return this.controls;
  }

  /** Resets the camera controls and reconfigures them. */
  public resetControls() {
    this.controls.reset();
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

  /**
   * Calculates the approximate orthographic size from a perspective camera.
   * @param perspective - The perspective camera to calculate the orthographic size from.
   */
  public static approximateOrthographicSizeFromPerspective(
    from: PerspectiveCamera,
    to: OrthographicCamera,
    distance = from.position.z,
    updateCamera = true
  ) {
    const fovInRadians = from.fov * (Math.PI / 180);
    const visibleHeight = 2 * Math.tan(fovInRadians / 2) * distance;
    const aspect = from.aspect;

    const planes = {
      top: visibleHeight / 2,
      bottom: -visibleHeight / 2,
      left: (-visibleHeight * aspect) / 2,
      right: (visibleHeight * aspect) / 2,

      zoom: 1
    };

    planes.zoom = Math.min(
      (planes.right - planes.left) / (visibleHeight * aspect),
      (planes.top - planes.bottom) / visibleHeight
    );

    if (updateCamera) {
      to.top = planes.top;
      to.bottom = planes.bottom;
      to.left = planes.left;
      to.right = planes.right;
      to.zoom = planes.zoom;

      to.updateProjectionMatrix();
    }

    return { size: visibleHeight, planes };
  }
}
