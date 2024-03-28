import {
  type Mesh,
  MeshBasicMaterial,
  type MeshBasicMaterialParameters,
  type OrthographicCamera,
  type PerspectiveCamera,
  Scene,
  type Texture,
  Vector2,
  Vector3,
  type WebGLRenderer
} from "three";

import { loadModels, loadTextures, loadVideos } from "@app/assets/loaders";
import { Camera, CameraMode } from "@app/experience/camera";
import { Navigation } from "@app/experience/navigation";

import { DigitalClock } from "@app/props/clock";
import { batchGLTFModel } from "@app/utils/batching";

import { type ModelBakedMaps, assetsManifest } from "@app/assets/manifest";
import { addControls } from "@app/experience/gui";
import { type VideoTextureSource, preprocessTextureForGLTF } from "@app/utils/textures";

import { resetMaterials } from "@app/utils/meshes";
import { Pane } from "tweakpane";

/**
 * Loads the assets asynchronously.
 * @returns A promise that resolves to an object containing the loaded models and textures.
 */
async function loadAssets(
  onJustLoaded?: (path: string, count: number, total: number) => void
) {
  const [models, textures, videos] = await Promise.all([
    loadModels(assetsManifest.models, onJustLoaded),
    loadTextures(assetsManifest.textures, onJustLoaded),
    loadVideos(assetsManifest.media.videos, onJustLoaded)
  ]);

  return { models, textures, videos };
}

// The types of the models, textures, and videos.
type SceneModels = Awaited<ReturnType<typeof loadAssets>>["models"];
type SceneMeshes = Record<keyof SceneModels, Mesh>;
type SceneTextures = Awaited<ReturnType<typeof loadAssets>>["textures"];
type SceneVideos = Awaited<ReturnType<typeof loadAssets>>["videos"];

export class MyRoomScene extends Scene {
  /** The instance of the renderer for this scene. */
  public readonly renderer: WebGLRenderer;

  // The camera and navigation controls.
  public readonly camera: Camera;
  private readonly _orthoNavigation: Navigation<OrthographicCamera>;
  private readonly _perspectiveNavigation: Navigation<PerspectiveCamera>;

  // The resources used in the scene.
  private _models!: SceneModels;
  private _textures!: SceneTextures;
  private _videos!: SceneVideos;

  // The meshes used in the scene.
  private _meshes: SceneMeshes = {} as SceneMeshes;

  /** The digital clock over the shelf. */
  private _clock!: DigitalClock;

  /**
   * Represents the main scene of our app.
   *
   * @param renderer - The WebGL renderer to use. If not provided, a new WebGL renderer will be created.
   * @param target - The HTML element to append the renderer's DOM element to. Defaults to document.body.
   */
  constructor(renderer: WebGLRenderer, target: HTMLElement = document.body) {
    super();

    this.renderer = renderer;

    // We'll use the full window size.
    const [width, height] = [window.innerWidth, window.innerHeight];
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(window.devicePixelRatio);

    target.appendChild(this.renderer.domElement);
    this.camera = this.prepareCamera();

    this._orthoNavigation = new Navigation(this.camera.orthographic, {
      initialRadius: 1.5,
      spherical: { limits: { radius: { min: 0.8, max: 4 } } },
      target
    });

    this._perspectiveNavigation = new Navigation(this.camera.perspective, {
      initialRadius: 5,
      target
    });
  }

  /** Renders the scene using the current renderer and camera. */
  public update({ deltaMillis }: { deltaSeconds: number; deltaMillis: number }) {
    const size = this.renderer.getSize(new Vector2());
    const smallestSide = Math.min(size.width, size.height);

    if (this.camera.mode === CameraMode.Perspective) {
      this._perspectiveNavigation.update(deltaMillis, smallestSide);
    }

    if (this.camera.mode === CameraMode.Orthographic) {
      this._orthoNavigation.update(deltaMillis, smallestSide);
    }

    this.renderer.render(this, this.camera.current);
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

  /** Setups the entire scene. */
  public setup() {
    const { battery, coding, inspiration } = this._videos;
    const { bakes, misc } = this._textures;

    // Add all the batched models to the scene.
    this.addBatchedModel("room", bakes.room.high);
    this.addBatchedModel("chair", bakes.chair.high);
    this.addBatchedModel("furniture", bakes.furniture.high);

    const { keyboardLight } = this.addBatchedModel("tech", bakes.tech.high, [
      "Keyboard Light"
    ] as const);

    keyboardLight.material = new MeshBasicMaterial({ color: 0xccddbf });
    this.add(keyboardLight);

    const { phoneScreen } = this.addBatchedModel("bed", bakes.bed.high, [
      "Phone Screen"
    ] as const);
    const { dana, mainMonitorScreen, auxiliaryMonitorScreen } = this.addBatchedModel(
      "props1",
      bakes.props1.high,
      ["Dana", "Main Monitor Screen", "Auxiliary Monitor Screen"] as const
    );

    this.addMeshWithVideoTexture(phoneScreen, battery);
    this.addMeshWithVideoTexture(mainMonitorScreen, coding);
    this.addMeshWithVideoTexture(auxiliaryMonitorScreen, inspiration);

    // The picture of Dana is not a video. The color is to slighly tint thet texture and match the scene.
    this.addTexturedMesh(dana, misc.dana, { color: 0x9473b4 });
    misc.dana.channel = 0; // I forgot to make it on UV1.

    // Each digit is a separate object with a separate texture.
    const clockObjects = this.addBatchedModel("props2", bakes.props2.high, [
      "Colon",
      "Hour Tens",
      "Hour Units",
      "Minute Tens",
      "Minute Units"
    ] as const);

    this._clock = new DigitalClock(misc.clock, clockObjects);
    this._clock.syncWithUserTime();

    this.add(...Object.values(clockObjects));
  }

  /** Prepares the GUI options for the scene. */
  public setGUI() {
    const guiPane = new Pane();
    addControls(guiPane, {
      onCameraModeChange: (mode) => {
        this.camera.switchTo(mode);
      },

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
        isNeutral ? this.setNeutralMaterials() : this.setColorMaterials();
      }
    });
  }

  /** Here we execute all the code that needs to run after user interaction. */
  public onAfterUserInteracted() {
    this._videos.battery.source.play();
    this._videos.coding.source.play();
    this._videos.inspiration.source.play();
  }

  /** Fakes a neutral-like aspect by using the lightmaps as the scene colors. */
  public setNeutralMaterials() {
    const setNeutral = (meshName: keyof SceneMeshes) => {
      const mesh = this._meshes[meshName];
      resetMaterials(mesh);

      console.log("Setting neutral for", meshName, mesh);

      const { high } = this._textures.bakes[meshName];
      preprocessTextureForGLTF(high.lightmap);

      mesh.material = new MeshBasicMaterial({ map: high.lightmap });
    };

    for (const meshName in this._meshes) {
      setNeutral(meshName as keyof SceneMeshes);
    }
  }

  /** Sets the color materials for the scene. */
  public setColorMaterials() {
    const setColors = (meshName: keyof SceneMeshes) => {
      const mesh = this._meshes[meshName];
      resetMaterials(mesh);

      const { high } = this._textures.bakes[meshName];
      preprocessTextureForGLTF(high.color);

      mesh.material = new MeshBasicMaterial({ map: high.color });
    };

    for (const meshName in this._meshes) {
      setColors(meshName as keyof SceneMeshes);
    }
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

    this._meshes[model] = batched;
    this.addTexturedMesh(batched, bakes.color);

    return excluded;
  }

  /**
   * Adds a texture to the given mesh, and then adds it to the scene.
   *
   * @param mesh - The mesh to add the texture to.
   * @param texture - The texture to apply to the mesh.
   * @param preprocessForGLTF - Optional function to preprocess the texture before applying it.
   */
  private addTexturedMesh(
    mesh: Mesh,
    texture: Texture,
    extraParams: MeshBasicMaterialParameters = {},
    preprocessForGLTF = true
  ) {
    if (preprocessForGLTF) {
      preprocessTextureForGLTF(texture);
    }

    mesh.material = new MeshBasicMaterial({ map: texture, ...extraParams });
    this.add(mesh);
  }

  /**
   * Adds a mesh with a video texture to the scene.
   *
   * @param mesh - The mesh to add.
   * @param texture - The video texture to apply to the mesh.
   * @param source - The video texture source.
   */
  private addMeshWithVideoTexture(mesh: Mesh, { texture }: VideoTextureSource) {
    this.addTexturedMesh(mesh, texture);

    // The models with video textures have their UVs set to UV0.
    texture.channel = 0;
  }

  /**
   * Prepares the camera for the scene.
   * @returns The prepared camera.
   */
  private prepareCamera() {
    const { width, height } = this.renderer.getSize(new Vector2());
    const [aspect, near, far] = [width / height, 0.1, 1000];
    const orthoSize = 6.5;

    // We'll be using the two camera modes for this scene.
    const camera = new Camera(CameraMode.Perspective, {
      perspective: [75, aspect, near, far],
      orthographic: [
        (orthoSize * aspect) / -2,
        (orthoSize * aspect) / 2,
        orthoSize / 2,
        orthoSize / -2,
        -300,
        300
      ]
    });

    const handlers = camera.getResizeHandlers(this.renderer);
    const updateCameras = () => {
      const [width, height] = [window.innerWidth, window.innerHeight];

      if (camera.mode === CameraMode.Perspective) {
        handlers.perspectiveResize(width, height);
      } else if (camera.mode === CameraMode.Orthographic) {
        handlers.orthographicResize(width, height, orthoSize);
      }
    };

    window.addEventListener("resize", updateCameras);
    window.addEventListener("orientationchange", updateCameras);

    camera.current.lookAt(new Vector3(0, 2, 0));
    camera.current.position.set(4, 4, 4);
    return camera;
  }
}
