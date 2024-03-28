import { WebGLRenderer } from "three";

import { onAssetLoaded, prepareOverlayForRemoval } from "@app/experience/loader";
import { MyRoomScene } from "@app/experience/scene";

import { setupMouseSpotlight } from "@app/experience/effects";
import { $ } from "@app/utils/misc";

// Used to calculate the time between frames.
let previousTime = 0;

// Create the renderer.
const target = $("#app") as HTMLElement;
const renderer = new WebGLRenderer({ antialias: true });
const { showSpotlight, disposeSpotlight } = setupMouseSpotlight();

// Then the scene and load it.
const scene = new MyRoomScene(renderer, target);
await scene.prepare(onAssetLoaded);
scene.setup();
showSpotlight();

// When clicked, it will be removed.
prepareOverlayForRemoval(() => {
  scene.onAfterUserInteracted();
  disposeSpotlight();
});

function render(time: number) {
  const deltaMillis = time - previousTime;
  const deltaSeconds = deltaMillis / 1000;
  previousTime = time;

  scene.update({ deltaMillis, deltaSeconds });
  requestAnimationFrame(render);
}

requestAnimationFrame(render);
