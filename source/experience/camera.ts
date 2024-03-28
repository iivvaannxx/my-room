import { OrthographicCamera, PerspectiveCamera, type WebGLRenderer } from "three";

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
};

/** Utility class to easily switch between orthographic and perspective rendering. */
export class Camera {
  /** The instance of the orthographic camera. */
  public readonly orthographic: OrthographicCamera;

  /** The instance of the perspective camera. */
  public readonly perspective: PerspectiveCamera;

  /** The type of camera currently in use. */
  private _mode: CameraMode;

  /**
   * Gets the mode of the camera.
   * @returns The current mode of the camera.
   */
  public get mode() {
    return this._mode;
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
    const { perspective, orthographic } = options;
    this._mode = mode;

    this.perspective =
      typeof perspective === "function"
        ? perspective()
        : new PerspectiveCamera(...(perspective ?? []));

    this.orthographic =
      typeof orthographic === "function"
        ? orthographic()
        : new OrthographicCamera(...(orthographic ?? []));
  }

  /**
   * Switches the camera mode.
   * @param mode The camera mode to switch to.
   */
  public switchTo(mode: CameraMode) {
    this._mode = mode;
  }

  /**
   * Returns an object containing resize handlers for the camera.
   *
   * @param renderer - The WebGL renderer.
   * @returns An object with perspectiveResize and orthographicResize handlers.
   */
  public getResizeHandlers(renderer: WebGLRenderer) {
    return {
      perspectiveResize: Camera.getPerspectiveResizeHandler(renderer, this.perspective),
      orthographicResize: Camera.getOrthographicResizeHandler(renderer, this.orthographic)
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
