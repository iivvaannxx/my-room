import { WebGLRenderer } from "three";

import { onAssetLoaded, preload } from "@app/experience/loader";
import { MyRoomScene } from "@app/experience/scene";

import { $ } from "@app/utils/misc";
import { setupMouseSpotlight } from "./experience/effects";

// Used to calculate the time between frames.
let previousTime = 0;

// The render loop.
function render(time: number) {
  const delta = time - previousTime;
  previousTime = time;

  scene.update(delta / 1000, time / 1000);
  requestAnimationFrame(render);
}

// Create the renderer.
const target = $("#app") as HTMLElement;
const renderer = new WebGLRenderer({ antialias: true });
const disposeSpotlight = setupMouseSpotlight();

// Then the scene and load it.
const scene = new MyRoomScene(renderer, target);
await scene.prepare(onAssetLoaded);
scene.setup();

preload(renderer, scene, scene.camera.perspective, () => {
  scene.onAfterUserInteracted();
  disposeSpotlight();

  // Give a little time for spotlight to fade out.
  setTimeout(() => {
    requestAnimationFrame(render);
  }, 250);
});
