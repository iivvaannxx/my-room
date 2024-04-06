import {
  Box3,
  DoubleSide,
  type InstancedMesh,
  type Mesh,
  MeshBasicMaterial,
  type MeshBasicMaterialParameters,
  Scene,
  type Texture,
  Vector2,
  Vector3,
  type WebGLRenderer
} from "three";

import { loadModels, loadTextures, loadVideos } from "@app/assets/loaders";
import { SimpleCamera } from "@app/experience/camera";
import { DigitalClock } from "@app/props/digital-clock";
import { batchGLTFModel } from "@app/utils/batching";

import { type ModelBakedMaps, assetsManifest } from "@app/assets/manifest";
import { addControls } from "@app/experience/gui";
import { preprocessTextureForGLTF } from "@app/utils/textures";

import { GamingChair } from "@app/props/gaming-chair";
import { bakedBasicMaterial, resetMaterials } from "@app/utils/materials";

import leafInstances from "@app/data/plant-instances.json";
import { makeUVOffsetableBasicMaterial } from "@app/utils/instancing";

/**
 * Loads the assets asynchronously.
 * @returns A promise that resolves to an object containing the loaded models and textures.
 */
async function loadAssets(
  onJustLoaded?: (path: string, count: number, total: number) => void
) {
  const [models, textures, videos] = await Promise.all([
    loadModels(assetsManifest.models, (data) =>
      onJustLoaded?.(data.path, data.count, data.total)
    ),
    loadTextures(assetsManifest.textures, ({ asset, ...rest }) => {
      preprocessTextureForGLTF(asset);
      onJustLoaded?.(rest.path, rest.count, rest.total);
    }),
    loadVideos(assetsManifest.media.videos, ({ asset, ...rest }) => {
      preprocessTextureForGLTF(asset.texture, 0);
      onJustLoaded?.(rest.path, rest.count, rest.total);
    })
  ]);

  return { models, textures, videos };
}

// The types of the models, textures, and videos.
type SceneModels = Awaited<ReturnType<typeof loadAssets>>["models"];
type SceneVideos = Awaited<ReturnType<typeof loadAssets>>["videos"];
type SceneTextures = Awaited<ReturnType<typeof loadAssets>>["textures"];
type SceneMeshes = Record<keyof SceneModels, Mesh>;

export class MyRoomScene extends Scene {
  /** The instance of the renderer for this scene. */
  public readonly renderer: WebGLRenderer;

  // The camera and navigation controls.
  public readonly camera: SimpleCamera;

  /** The container of the renderer. */
  public readonly target: HTMLElement;

  // The resources used in the scene.
  private _models!: SceneModels;
  private _textures!: SceneTextures;
  private _videos!: SceneVideos;

  // The meshes used in the scene.
  private _meshes: SceneMeshes = {} as SceneMeshes;

  /** The digital clock over the shelf. */
  private _clock!: DigitalClock;

  /** The gaming chair in front of the desk. */
  private _chair!: GamingChair;

  /**
   * Represents the main scene of our app.
   *
   * @param renderer - The WebGL renderer to use. If not provided, a new WebGL renderer will be created.
   * @param target - The HTML element to append the renderer's DOM element to. Defaults to document.body.
   */
  constructor(renderer: WebGLRenderer, target: HTMLElement = document.body) {
    super();

    this.renderer = renderer;
    this.renderer.autoClear = false;
    this.target = target;

    // We'll use the full window size.
    const [width, height] = [window.innerWidth, window.innerHeight];
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 3));

    target.appendChild(this.renderer.domElement);

    this.camera = this.prepareCamera();
    this.setupCameraView();
  }

  /** Renders the scene using the current renderer and camera. */
  public update(delta: number, totalTime: number) {
    this.renderer.clear();

    this.camera.updateControls(delta);
    this._chair.update(totalTime);

    this.renderer.setViewport(0, 0, window.innerWidth, window.innerHeight);
    this.renderer.render(this, this.camera.perspective);
  }

  /** Loads all the resources and creates the GUI controls. */
  public async prepare(
    onJustLoaded?: (path: string, count: number, total: number) => void
  ) {
    const { models, textures, videos } = await loadAssets(onJustLoaded);

    this._models = models;
    this._textures = textures;
    this._videos = videos;

    this.setGUI();
  }

  /** Prepares the GUI options for the scene. */
  public setGUI() {
    addControls({
      onClockModeChange: (mode, setUIValues) => {
        if (mode === "current") {
          this._clock.syncWithUserTime();
        } else {
          // Update the UI values with the current clock time.
          setUIValues(this._clock.hours, this._clock.minutes);
          this._clock.stopUserTimeSync();
        }
      },

      onClockChange: (hours, minutes) => {
        if (this._clock.synced) {
          return;
        }

        this._clock.setTime(hours, minutes);
      },

      onNeutralChange: (isNeutral) => {
        const mode = isNeutral ? "neutral" : "color";
        this.setSceneMaterials(mode);
      },

      onReset: () => {
        this.resetCamera();
        this.camera.controls.distance = this.camera.controls.maxDistance;
      }
    });
  }

  /** Setups the entire scene. */
  public setup() {
    const { battery, coding, inspiration } = this._videos;
    const { bakes, misc } = this._textures;

    // Add all the batched models to the scene.
    this.addBatchedModel("room", bakes.room);
    this.addBatchedModel("furniture", bakes.furniture);

    const { keyboardLight } = this.addBatchedModel("tech", bakes.tech, [
      "Keyboard Light"
    ] as const);

    keyboardLight.material = new MeshBasicMaterial({ color: 0xccddbf });
    this.add(keyboardLight);

    const { phoneScreen } = this.addBatchedModel("bed", bakes.bed, [
      "Phone Screen"
    ] as const);
    const { dana, mainMonitorScreen, auxiliaryMonitorScreen } = this.addBatchedModel(
      "props1",
      bakes.props1,
      ["Dana", "Main Monitor Screen", "Auxiliary Monitor Screen"] as const
    );

    this.addTexturedMesh(phoneScreen, battery.texture);
    this.addTexturedMesh(mainMonitorScreen, coding.texture);
    this.addTexturedMesh(auxiliaryMonitorScreen, inspiration.texture);

    // The color is to slighly tint the texture and match the scene.
    this.addTexturedMesh(dana, misc.dana, { color: 0x9473b4 });
    misc.dana.channel = 0; // I forgot to make it on UV1.

    // Each digit is a separate object with a separate texture.
    this.addBatchedModel("props2", bakes.props2);

    //this._clock = new DigitalClock(misc.clock, clockObjects);
    this._chair = new GamingChair(this._models.chair, bakes.chair);
    this._clock = new DigitalClock(this._models.digits, this._textures.misc.digits);

    this.add(this._chair.mesh);
    this.add(this._clock.digits);

    // Add the plant instances.
    const plantInstanced = this._models.plant.scene.children[0] as InstancedMesh;
    const leafMaterial = makeUVOffsetableBasicMaterial({
      map: bakes.plant.color
    });

    plantInstanced.material = leafMaterial.material;
    leafMaterial.setUVOffsets(
      plantInstanced,
      leafInstances.map((instance) => instance.uvOffsets) as [number, number][]
    );

    this.add(plantInstanced);
  }

  /** Here we execute all the code that needs to run after user interaction. */
  public onAfterUserInteracted() {
    this._videos.battery.source.play();
    this._videos.coding.source.play();
    this._videos.inspiration.source.play();
  }

  /** Fakes a neutral-like aspect by using the lightmaps as the scene colors. */
  public setSceneMaterials(mode: "color" | "neutral") {
    const setMaterials = (meshName: keyof SceneMeshes) => {
      const mesh = this._meshes[meshName];
      resetMaterials(mesh);

      const bake = this._textures.bakes[meshName];
      const map = mode === "color" ? bake.color : bake.lightmap;
      mesh.material = new MeshBasicMaterial({ map, side: DoubleSide });
    };

    for (const meshName in this._meshes) {
      setMaterials(meshName as keyof SceneMeshes);
    }

    this._chair.setMaterial(mode);
  }

  /**
   * Adds a batched model to the scene.
   *
   * @param model - The GLTF model to add.
   * @param bakes - The baked maps for the model.
   * @param exclude - An array of names to exclude from the batch.
   */
  private addBatchedModel<TExclude extends string[]>(
    model: keyof SceneModels,
    bakes: ModelBakedMaps,
    exclude?: TExclude
  ) {
    const modelData = this._models[model];
    const { batched, excluded } = batchGLTFModel(modelData, exclude);
    batched.material = bakedBasicMaterial(bakes);

    this.add(batched);
    this._meshes[model] = batched;

    return excluded;
  }

  /**
   * Adds a texture to the given mesh, and then adds it to the scene.
   *
   * @param mesh - The mesh to add the texture to.
   * @param texture - The texture to apply to the mesh.
   * @param extraParams - Additional parameters for the material.
   */
  private addTexturedMesh(
    mesh: Mesh,
    texture: Texture,
    extraParams: MeshBasicMaterialParameters = {}
  ) {
    mesh.material = new MeshBasicMaterial({
      map: texture,
      side: DoubleSide,
      transparent: true,
      ...extraParams
    });

    this.add(mesh);
  }

  /**
   * Prepares the camera for the scene.
   * @returns The prepared camera.
   */
  private prepareCamera() {
    const { width, height } = this.renderer.getSize(new Vector2());
    const [aspect, near, far] = [width / height, 0.1, 1000];

    // We'll be using the two camera modes for this scene.
    const camera = new SimpleCamera({
      perspective: [60, aspect, near, far]
    });

    const handler = camera.getResizeHandler(this.renderer);
    const updateCameras = () => {
      const [width, height] = [window.innerWidth, window.innerHeight];
      handler(width, height);
    };

    window.addEventListener("resize", updateCameras);
    window.addEventListener("orientationchange", updateCameras);

    return camera;
  }

  /** Sets up the initial view of the scene.*/
  private setupCameraView() {
    const camera = this.camera;
    camera.initControls(this.target);

    const controls = camera.controls;
    const boxCenter = new Vector3(0, 1.25, 0);
    const boxSize = new Vector3(1.75, 2.5, 1.75);
    const box = new Box3();

    // The boundary box for the camera.
    box.setFromCenterAndSize(boxCenter, boxSize);
    controls.setBoundary(box);

    // Arbitrary settings adjusted to this specific scene.
    controls.minAzimuthAngle = -Math.PI / 2;
    controls.maxAzimuthAngle = 0;
    controls.maxPolarAngle = (Math.PI / 2) * 0.8;
    controls.dollyToCursor = true;
    controls.azimuthAngle = -Math.PI / 4;
    controls.smoothTime = 0.325;
    controls.draggingSmoothTime = 0.15;
    controls.truckSpeed = 1.6;
    controls.minDistance = 0.25;
    controls.maxDistance = 5;

    // Initial camera placement.
    controls.setLookAt(-5, 5, 5, 0, 0.75, 0);
    controls.distance = controls.maxDistance;
    controls.azimuthAngle = -Math.PI / 4;

    controls.saveState();
  }

  /** Resets the camera to its default position and controls. */
  private resetCamera() {
    this.camera.resetControls();

    // Initial camera placement.
    this.camera.controls.setLookAt(-5, 5, 5, 0, 0.75, 0);
    this.camera.controls.distance = this.camera.controls.maxDistance;
    this.camera.controls.azimuthAngle = -Math.PI / 4;
  }
}
