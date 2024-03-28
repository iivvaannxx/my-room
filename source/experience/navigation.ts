import normalizeWheel from "normalize-wheel-es";
import {
  OrthographicCamera,
  type PerspectiveCamera,
  Spherical,
  Vector2,
  Vector3
} from "three";
import { clamp } from "three/src/math/MathUtils.js";

// The options that can be passed to the Navigation constructor.
export type NavigationOptions = {
  initialRadius?: number;
  target: HTMLElement;

  spherical?: {
    limits?: {
      radius?: { min?: number; max?: number };
      phi?: { min?: number; max?: number };
      theta?: { min?: number; max?: number };
    };
  };
};

/** Defines all the data we store to handle the navigation. */
type NavigationView = {
  // Spherical coordinates of the camera.
  spherical: {
    value: Spherical;
    smoothed: Spherical;
    smoothing: number;
    limits: {
      radius: { min: number; max: number };
      phi: { min: number; max: number };
      theta: { min: number; max: number };
    };
  };

  // Where the camera is looking at.
  target: {
    value: Vector3;
    smoothed: Vector3;
    smoothing: number;
    limits: {
      x: { min: number; max: number };
      y: { min: number; max: number };
      z: { min: number; max: number };
    };
  };

  // Information about the dragging.
  drag: {
    delta: Vector2;
    previous: Vector2;
    sensitivity: number;
    alternative: boolean;
  };

  // Information about the zooming (mouse wheel).
  zoom: {
    sensitivity: number;
    delta: number;
  };
};

// TODO: Parameterize the initial _view.

/**
 * This is a port of the Navigation implementation by Bruno Simon with TypeScript.
 * It also accepts either a PerspectiveCamera or an OrthographicCamera.
 *
 * @see https://github.com/brunosimon/my-room-in-3d/blob/5d00b3f870da81f103e901e0d12e20bbcc816834/src/Experience/Navigation.js
 */
export class Navigation<TCamera extends PerspectiveCamera | OrthographicCamera> {
  /** The target on which we add the event listeners. */
  private readonly target: HTMLElement;

  /** The camera we want to control. */
  public readonly camera: TCamera;

  /** The _view object containing all the data we need for navigation. */
  public view: NavigationView;

  /**
   * Constructs a new Navigation object.
   *
   * @param camera The camera to navigate with.
   * @param options The navigation options.
   */
  constructor(camera: TCamera, { target, ...initOptions }: NavigationOptions) {
    this.target = target;
    this.camera = camera;
    this.camera.rotation.reorder("YXZ");

    this.view = this.setInitialView(initOptions);

    // Ensure the correct context is used for the event handlers.
    this.onMouseDown = this.onMouseDown.bind(this);
    this.onMouseUp = this.onMouseUp.bind(this);
    this.onMouseMove = this.onMouseMove.bind(this);
    this.onTouchStart = this.onTouchStart.bind(this);
    this.onTouchEnd = this.onTouchEnd.bind(this);
    this.onTouchMove = this.onTouchMove.bind(this);
    this.onWheel = this.onWheel.bind(this);

    this.target.addEventListener("mousedown", this.onMouseDown);
    this.target.addEventListener("touchstart", this.onTouchStart);
    this.target.addEventListener("wheel", this.onWheel, { passive: false });
    this.target.addEventListener("contextmenu", (event) => event.preventDefault());
  }

  /** Updates the camera orbit. */
  public update(deltaMillis: number, smallestSide: number) {
    this.view.spherical.value.radius += this.view.zoom.delta * this.view.zoom.sensitivity;

    // Apply limits
    this.view.spherical.value.radius = clamp(
      this.view.spherical.value.radius,
      this.view.spherical.limits.radius.min,
      this.view.spherical.limits.radius.max
    );

    const zoomAdjustmentFactor =
      this.camera instanceof OrthographicCamera
        ? (1 / this.camera.zoom) * 0.5
        : this.view.spherical.value.radius * 0.1;

    // Drag
    if (this.view.drag.alternative) {
      const up = new Vector3(0, 1, 0);
      const right = new Vector3(-1, 0, 0);

      up.applyQuaternion(this.camera.quaternion);
      right.applyQuaternion(this.camera.quaternion);

      up.multiplyScalar(this.view.drag.delta.y * 0.01 * zoomAdjustmentFactor);
      right.multiplyScalar(this.view.drag.delta.x * 0.01 * zoomAdjustmentFactor);

      this.view.target.value.add(up);
      this.view.target.value.add(right);

      // Apply limits
      this.view.target.value.x = clamp(
        this.view.target.value.x,
        this.view.target.limits.x.min,
        this.view.target.limits.x.max
      );

      this.view.target.value.y = clamp(
        this.view.target.value.y,
        this.view.target.limits.y.min,
        this.view.target.limits.y.max
      );

      this.view.target.value.z = clamp(
        this.view.target.value.z,
        this.view.target.limits.z.min,
        this.view.target.limits.z.max
      );
    } else {
      this.view.spherical.value.theta -=
        (this.view.drag.delta.x * this.view.drag.sensitivity) / smallestSide;
      this.view.spherical.value.phi -=
        (this.view.drag.delta.y * this.view.drag.sensitivity) / smallestSide;

      // Apply limits
      this.view.spherical.value.theta = clamp(
        this.view.spherical.value.theta,
        this.view.spherical.limits.theta.min,
        this.view.spherical.limits.theta.max
      );

      this.view.spherical.value.phi = clamp(
        this.view.spherical.value.phi,
        this.view.spherical.limits.phi.min,
        this.view.spherical.limits.phi.max
      );
    }

    this.view.drag.delta.set(0, 0);
    this.view.zoom.delta = 0;

    // Smoothing
    this.view.spherical.smoothed.radius +=
      (this.view.spherical.value.radius - this.view.spherical.smoothed.radius) *
      this.view.spherical.smoothing *
      deltaMillis;
    this.view.spherical.smoothed.phi +=
      (this.view.spherical.value.phi - this.view.spherical.smoothed.phi) *
      this.view.spherical.smoothing *
      deltaMillis;
    this.view.spherical.smoothed.theta +=
      (this.view.spherical.value.theta - this.view.spherical.smoothed.theta) *
      this.view.spherical.smoothing *
      deltaMillis;

    this.view.target.smoothed.x +=
      (this.view.target.value.x - this.view.target.smoothed.x) *
      this.view.target.smoothing *
      deltaMillis;
    this.view.target.smoothed.y +=
      (this.view.target.value.y - this.view.target.smoothed.y) *
      this.view.target.smoothing *
      deltaMillis;
    this.view.target.smoothed.z +=
      (this.view.target.value.z - this.view.target.smoothed.z) *
      this.view.target.smoothing *
      deltaMillis;

    const viewPosition = new Vector3();
    viewPosition.setFromSpherical(this.view.spherical.smoothed);
    viewPosition.add(this.view.target.smoothed);

    this.camera.position.copy(viewPosition);

    if (this.camera instanceof OrthographicCamera) {
      this.camera.zoom = this.view.spherical.smoothed.radius;
      this.camera.updateProjectionMatrix();
    }

    this.camera.lookAt(this.view.target.smoothed);
  }

  /**
   * Sets the initial _view for navigation.
   *
   * @param radius - The radius of the _view.
   * @returns The Navigation_View object representing the _view.
   */
  private setInitialView(options: Omit<NavigationOptions, "target">): NavigationView {
    const { initialRadius = 5, spherical } = options;

    const sphericalCoords = new Spherical(initialRadius, Math.PI * 0.35, -Math.PI * 0.25);
    const target = new Vector3(0, 1.3, 0);

    return {
      spherical: {
        value: sphericalCoords,
        smoothed: sphericalCoords.clone(),
        smoothing: 0.01,

        limits: {
          radius: {
            min: spherical?.limits?.radius?.min ?? 1,
            max: spherical?.limits?.radius?.max ?? 5
          },
          phi: {
            min: spherical?.limits?.phi?.min ?? 0.01,
            max: spherical?.limits?.phi?.max ?? Math.PI * 0.5
          },
          theta: {
            min: spherical?.limits?.theta?.min ?? -Math.PI * 0.5,
            max: spherical?.limits?.theta?.max ?? 0
          }
        }
      },

      target: {
        value: target,
        smoothed: target.clone(),
        smoothing: 0.0025,

        limits: {
          x: { min: -1, max: 1 },
          y: { min: 0.5, max: 3 },
          z: { min: -1, max: 1 }
        }
      },

      drag: {
        delta: new Vector2(0, 0),
        previous: new Vector2(0, 0),
        sensitivity: 1,
        alternative: false
      },

      zoom: {
        sensitivity: 0.005,
        delta: 0
      }
    };
  }

  /** Updates the previous drag position */
  private down(x: number, y: number) {
    this.view.drag.previous.set(x, y);
  }

  /** Updates the current drag position. */
  private move(x: number, y: number) {
    this.view.drag.delta.add(
      new Vector2(x - this.view.drag.previous.x, y - this.view.drag.previous.y)
    );

    this.view.drag.previous.set(x, y);
  }

  /** Handles navigation when a mouse button is down. */
  private onMouseDown(event: MouseEvent) {
    event.preventDefault();
    this.view.drag.alternative =
      event.button === 1 || event.button === 2 || event.ctrlKey || event.shiftKey;

    this.down(event.clientX, event.clientY);
    window.addEventListener("mouseup", this.onMouseUp);
    window.addEventListener("mousemove", this.onMouseMove);
  }

  /** Handles navigation when a mouse button is up. */
  private onMouseUp(event: MouseEvent) {
    event.preventDefault();

    window.removeEventListener("mouseup", this.onMouseUp);
    window.removeEventListener("mousemove", this.onMouseMove);
  }

  /** Handles navigation when the mouse is moving. */
  private onMouseMove(event: MouseEvent) {
    event.preventDefault();
    this.move(event.clientX, event.clientY);
  }

  /** Handles navigation when one or more touches has been detected. */
  private onTouchStart(event: TouchEvent) {
    event.preventDefault();

    this.view.drag.alternative = event.touches.length > 1;
    this.down(event.touches[0].clientX, event.touches[0].clientY);

    window.addEventListener("touchend", this.onTouchEnd);
    window.addEventListener("touchmove", this.onTouchMove);
  }

  /** Handles navigation when one or more touches had ended. */
  private onTouchEnd(event: TouchEvent) {
    event.preventDefault();

    window.removeEventListener("touchend", this.onTouchEnd);
    window.removeEventListener("touchmove", this.onTouchMove);
  }

  /** Handles navigation when a touch is moving. */
  private onTouchMove(event: TouchEvent) {
    event.preventDefault();
    this.move(event.touches[0].clientX, event.touches[0].clientY);
  }

  /** Handles zooming when the mouse wheel is used. */
  private onWheel(event: WheelEvent) {
    event.preventDefault();
    const normalized = normalizeWheel(event);

    if (this.camera instanceof OrthographicCamera) {
      // For some reason cameras work with an inverted Y axis.
      normalized.pixelY *= -1;
    }

    this.zoomIn(normalized.pixelY);
  }

  /** Zooms in the by the given delta. */
  private zoomIn(delta: number) {
    this.view.zoom.delta += delta;
  }
}
