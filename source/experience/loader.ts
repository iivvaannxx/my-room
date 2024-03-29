import gsap from "gsap";
import type { Camera, Scene, WebGLRenderer } from "three";

import { $ } from "@app/utils/misc";

// The DOM nodes that display the loading status.
const progressText = $("#loading-status-text") as HTMLSpanElement;
const progressPercentage = $("#loading-status-percentage") as HTMLSpanElement;

// I'd prefer to know this dynamically but it's not worth the effort.
const TOTAL_ASSETS = 43;
let count = 0;

// Tracks the progress of the loading bar.
const progressBar = {
  progress: 0
};

/**
 * Updates the progress bar with the loaded URL, count, and total.
 *
 * @param justLoadedUrl - The URL that was just loaded.
 * @param count - The current count of loaded items.
 * @param total - The total number of items to be loaded.
 */
export function onAssetLoaded(justLoadedUrl: string) {
  const progress = Math.min(++count / TOTAL_ASSETS, 1);

  progressText.textContent = `LOADED: ${justLoadedUrl}`;
  progressPercentage.textContent = `${Math.round(progress * 100)}%`;

  gsap.to(progressBar, {
    progress: progress,
    duration: 0.1,
    // Use an onUpdate callback to apply the interpolated progress value
    onUpdate: () => {
      document.documentElement.style.setProperty("--progress", `${progressBar.progress}`);
    }
  });

  if (count === TOTAL_ASSETS) {
    const startText = $("#start-text") as HTMLDivElement;
    startText.style.display = "block";
  }
}

/**
 * Preloads the scene and camera for rendering using a WebGLRenderer.
 *
 * @param renderer - The WebGLRenderer used for rendering.
 * @param scene - The scene to be rendered.
 * @param camera - The camera used for rendering.
 * @param onReady - A callback function to be called when the preloading is complete.
 */
export function preload(
  renderer: WebGLRenderer,
  scene: Scene,
  camera: Camera,
  onReady: () => void
) {
  // See: https://github.com/pmndrs/drei/blob/master/src/core/Preload.tsx
  renderer.compileAsync(scene, camera).then(() => {
    progressText.textContent = "SCENE LOADED | Click anywhere to start";

    // When clicked, it will be removed.
    prepareOverlayForRemoval(() => {
      // The timeout is to allow the spotlight to fade out.
      progressText.textContent = "Starting...";
      onReady();
    });
  });
}

/** Prepares the overlay for removal after getting clicked. */
function prepareOverlayForRemoval(onClick?: () => void) {
  const overlay = $("#loading-overlay") as HTMLDivElement;

  overlay.addEventListener(
    "click",
    () => {
      onClick?.();

      // Delete the DOM element after the transition ends.
      overlay.addEventListener("animationend", () => {
        overlay.remove();
      });

      setTimeout(() => overlay.classList.add("fade-out"), 250);
    },
    {
      once: true
    }
  );
}
